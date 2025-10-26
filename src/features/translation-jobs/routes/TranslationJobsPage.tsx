import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeftIcon, Loader2Icon, PlusIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';

import type { TranslationJobResponse } from '@/shared/types';

import { useSupabase } from '@/app/providers/SupabaseProvider';
import { isActiveJob } from '@/shared/types';
import { Button } from '@/shared/ui/button';
import { Skeleton } from '@/shared/ui/skeleton';

import { UUID_SCHEMA } from '../../projects/api/projects.schemas';
import { useCancelTranslationJob, useCreateTranslationJob, useTranslationJobs } from '../api';
import { TRANSLATION_JOBS_KEY_FACTORY } from '../api/translation-jobs.key-factory';
import { CancelJobDialog } from '../components/CancelJobDialog';
import { CreateTranslationJobDialog } from '../components/CreateTranslationJobDialog';
import { JobProgressModal } from '../components/JobProgressModal';
import { TranslationJobsTable } from '../components/TranslationJobsTable';
import { useTranslationJobPolling } from '../hooks';

interface RouteParams {
  id: string;
}

/**
 * TranslationJobsPage - Main page component for translation jobs view
 *
 * Displays paginated list of translation jobs with real-time status updates,
 * progress indicators, and job management capabilities (cancel running jobs).
 * Supports monitoring active translation processes initiated from other parts of the application.
 */
export function TranslationJobsPage() {
  const { id } = useParams<keyof RouteParams>();
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [pageSize] = useState(20);
  const [progressModalOpen, setProgressModalOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [createJobDialogOpen, setCreateJobDialogOpen] = useState(false);
  const [jobToCancel, setJobToCancel] = useState<null | TranslationJobResponse>(null);
  const [progressJob, setProgressJob] = useState<null | TranslationJobResponse>(null);
  const lastActiveJobIdRef = useRef<null | string>(null);
  const queryClient = useQueryClient();
  const supabase = useSupabase();

  // validate UUID format
  const validation = UUID_SCHEMA.safeParse(id);
  const projectId = validation.data ?? '';

  const {
    data: jobsResponse,
    error,
    isError,
    isFetching,
    isLoading,
    refetch,
  } = useTranslationJobs({
    limit: pageSize,
    offset: page * pageSize,
    project_id: projectId,
  });

  // poll for active job and manage progress modal
  const { activeJob, hasActiveJob, isJobRunning } = useTranslationJobPolling(projectId, validation.success);

  // cancel job mutation
  const cancelJobMutation = useCancelTranslationJob();

  // create job mutation
  const createJobMutation = useCreateTranslationJob();

  // auto-open and keep progress modal; persist latest job snapshot
  useEffect(() => {
    if (hasActiveJob && activeJob) {
      lastActiveJobIdRef.current = activeJob.id;
      setProgressJob(activeJob);
      setProgressModalOpen(true);
    }
  }, [hasActiveJob, activeJob]);

  // when an active job disappears (finished/cancelled), refresh job list and keys, and load final state
  useEffect(() => {
    if (!hasActiveJob && lastActiveJobIdRef.current) {
      const jobId = lastActiveJobIdRef.current;

      // refresh jobs list
      queryClient.invalidateQueries({ queryKey: TRANSLATION_JOBS_KEY_FACTORY.lists() });
      refetch();

      // fetch final job snapshot for modal and toasts
      (async () => {
        const { data, error } = await supabase.from('translation_jobs').select('*').eq('id', jobId).maybeSingle();
        if (!error && data) {
          setProgressJob(data as TranslationJobResponse);
          // Update any cached job lists containing this job so UI reflects final status immediately
          queryClient.setQueriesData({ queryKey: TRANSLATION_JOBS_KEY_FACTORY.lists() }, (old: unknown) => {
            const value = old as
              | undefined
              | { data: TranslationJobResponse[]; metadata: { end: number; start: number; total: number } };
            if (!value) return old;
            const next = value.data.map((j) => (j.id === data.id ? (data as TranslationJobResponse) : j));
            return { ...value, data: next };
          });
          const completedCount = data.completed_keys ?? 0;
          const totalCount = data.total_keys ?? 0;
          if (data.status === 'completed') {
            toast.success('Translation job completed', {
              description: `Successfully translated ${completedCount} of ${totalCount} keys for ${data.target_locale}.`,
            });
          } else if (data.status === 'failed') {
            toast.error('Translation job failed', {
              description: `Job for ${data.target_locale} failed. ${completedCount} keys were translated before failure.`,
            });
          } else if (data.status === 'cancelled') {
            toast.message('Translation job cancelled', {
              description: `Job for ${data.target_locale} has been cancelled.`,
            });
          }
        }
      })();

      // clear so we run this only once per finish
      lastActiveJobIdRef.current = null;
    }
  }, [hasActiveJob, projectId, progressJob?.target_locale, queryClient, refetch, supabase]);

  // invalid project ID
  if (!validation.success) {
    return (
      <div className="container mx-auto py-8">
        <div className="border-destructive bg-destructive/10 rounded-lg border p-4">
          <h2 className="text-destructive text-lg font-semibold">Invalid Project ID</h2>
          <p className="text-muted-foreground text-sm">The project ID in the URL is not valid.</p>
          <Button className="mt-4" onClick={() => navigate('/projects')} variant="outline">
            Back to Projects
          </Button>
        </div>
      </div>
    );
  }

  // loading state
  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="space-y-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-96" />
            </div>
            <Skeleton className="h-10 w-24" />
          </div>
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  // error state
  if (isError || !jobsResponse) {
    return (
      <div className="container mx-auto py-8">
        <div className="border-destructive bg-destructive/10 rounded-lg border p-4">
          <h2 className="text-destructive text-lg font-semibold">Error Loading Translation Jobs</h2>
          <p className="text-muted-foreground text-sm">{error?.error?.message || 'Failed to load translation jobs.'}</p>
          <div className="mt-4 flex gap-2">
            <Button onClick={() => refetch()} variant="outline">
              Retry
            </Button>
            <Button onClick={() => navigate(`/projects/${projectId}`)} variant="outline">
              Back to Project
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const { data: jobs, metadata } = jobsResponse;
  const totalPages = Math.ceil(metadata.total / pageSize);

  // handler for opening progress modal for specific job
  const handleJobClick = (job: (typeof jobs)[0]) => {
    if (isActiveJob(job)) {
      // persist clicked job so modal has data immediately
      setProgressJob(job);
      setProgressModalOpen(true);
    }
  };

  // handler for initiating job cancellation
  const handleCancelJobClick = (job: TranslationJobResponse) => {
    setJobToCancel(job);
    setCancelDialogOpen(true);
  };

  // handler for confirming job cancellation
  const handleConfirmCancel = () => {
    if (!jobToCancel) return;

    cancelJobMutation.mutate(
      { jobId: jobToCancel.id },
      {
        onError: (error) => {
          toast.error('Failed to cancel job', {
            description: error.error?.message || 'An unexpected error occurred',
          });
        },
        onSuccess: () => {
          toast.success('Translation job cancelled', {
            description: `Job for ${jobToCancel.target_locale} has been cancelled successfully.`,
          });
          setCancelDialogOpen(false);
          setJobToCancel(null);
          setProgressModalOpen(false);
          refetch();
        },
      }
    );
  };

  // handler for creating new translation job
  const handleCreateJob = ({
    key_ids,
    mode,
    target_locale,
  }: {
    key_ids: string[];
    mode: string;
    target_locale: string;
  }) => {
    createJobMutation.mutate(
      {
        key_ids,
        mode: mode as 'all' | 'selected' | 'single',
        project_id: projectId,
        target_locale,
      },
      {
        onError: (error) => {
          toast.error('Failed to create translation job', {
            description: error.error?.message || 'An unexpected error occurred',
          });
        },
        onSuccess: () => {
          toast.success('Translation job created', {
            description: `Job for ${target_locale} has been created and is now processing.`,
          });
          setCreateJobDialogOpen(false);
          setProgressModalOpen(true); // auto-open progress modal
          refetch();
        },
      }
    );
  };

  return (
    <div className="container mx-auto py-8">
      <div className="space-y-6">
        {/* Back Button */}
        <Button
          aria-label="Back to project"
          className="gap-2"
          onClick={() => navigate(`/projects/${projectId}`)}
          variant="ghost"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back to Project
        </Button>

        {/* Page Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">Translation Jobs</h1>
              {hasActiveJob && isJobRunning && (
                <span className="bg-primary/10 text-primary flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium">
                  <span className="bg-primary h-1.5 w-1.5 animate-pulse rounded-full" />
                  Active Job
                </span>
              )}
            </div>
            <p className="text-muted-foreground">Monitor and manage LLM-powered translation jobs for this project.</p>
          </div>
          <div className="flex gap-2">
            <Button
              aria-label="Create new translation job"
              disabled={hasActiveJob && isJobRunning}
              onClick={() => setCreateJobDialogOpen(true)}
            >
              <PlusIcon className="mr-2 h-4 w-4" />
              Create Job
            </Button>
            <Button aria-label="Refresh job list" disabled={isFetching} onClick={() => refetch()} variant="outline">
              {isFetching ? (
                <>
                  <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                  Refreshing...
                </>
              ) : (
                'Refresh'
              )}
            </Button>
          </div>
        </div>

        {/* Live region for screen readers */}
        {hasActiveJob && activeJob && (
          <div aria-atomic="true" aria-live="polite" className="sr-only">
            Translation job in progress: {activeJob.completed_keys ?? 0} of {activeJob.total_keys ?? 0} keys translated
            for {activeJob.target_locale}
          </div>
        )}

        {/* Job List Table */}
        {jobs.length === 0 ? (
          <div className="border-border rounded-lg border p-8 text-center">
            <h3 className="text-lg font-semibold">No translation jobs found</h3>
            <p className="text-muted-foreground mt-2">
              Translation jobs will appear here after you create translations using the LLM translator.
            </p>
          </div>
        ) : (
          <>
            {/* Job List Table */}
            <TranslationJobsTable
              isLoading={isLoading}
              jobs={jobs}
              onCancelJob={handleCancelJobClick}
              onJobClick={handleJobClick}
            />

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-muted-foreground text-center text-sm sm:text-left">
                  Showing {metadata.start + 1} to {metadata.end} of {metadata.total} jobs
                </p>
                <div className="flex gap-2">
                  <Button
                    aria-label="Go to previous page"
                    className="flex-1 sm:flex-none"
                    disabled={page === 0}
                    onClick={() => setPage(page - 1)}
                    variant="outline"
                  >
                    Previous
                  </Button>
                  <Button
                    aria-label="Go to next page"
                    className="flex-1 sm:flex-none"
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage(page + 1)}
                    variant="outline"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Job Progress Modal */}
        <JobProgressModal
          isOpen={progressModalOpen}
          job={progressJob}
          onCancelJob={handleCancelJobClick}
          onOpenChange={(open) => {
            setProgressModalOpen(open);
            if (!open) {
              // keep lastActiveJobIdRef to detect completion even if user closes modal
              setProgressJob(null);
            }
          }}
        />

        {/* Cancel Job Dialog */}
        <CancelJobDialog
          isLoading={cancelJobMutation.isPending}
          isOpen={cancelDialogOpen}
          job={jobToCancel}
          onConfirmCancel={handleConfirmCancel}
          onOpenChange={setCancelDialogOpen}
        />

        {/* Create Translation Job Dialog */}
        <CreateTranslationJobDialog
          isLoading={createJobMutation.isPending}
          isOpen={createJobDialogOpen}
          onCreateJob={handleCreateJob}
          onOpenChange={setCreateJobDialogOpen}
          projectId={projectId}
        />
      </div>
    </div>
  );
}
