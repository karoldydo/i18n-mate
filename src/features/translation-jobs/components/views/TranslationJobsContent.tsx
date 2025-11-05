import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeftIcon, Loader2Icon, PlusIcon } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';

import type { TranslationJobResponse } from '@/shared/types';

import { useSupabase } from '@/app/providers/SupabaseProvider';
import { isActiveJob } from '@/shared/types';
import { Button } from '@/shared/ui/button';

import { useCancelTranslationJob } from '../../api/useCancelTranslationJob';
import { useCreateTranslationJob } from '../../api/useCreateTranslationJob';
import { useTranslationJobs } from '../../api/useTranslationJobs';
import { useTranslationJobPolling } from '../../hooks/useTranslationJobPolling';
import { CancelJobDialog } from '../dialogs/CancelJobDialog';
import { CreateTranslationJobDialog } from '../dialogs/CreateTranslationJobDialog';
import { JobProgressModal } from '../dialogs/JobProgressModal';
import { TranslationJobsTable } from '../tables/TranslationJobsTable';

interface TranslationJobsContentProps {
  projectId: string;
}

/**
 * TranslationJobsContent - Content component for translation jobs view
 *
 * Fetches and displays translation jobs with real-time status updates.
 * Uses useSuspenseQuery for automatic loading state handling via Suspense boundary.
 */
export function TranslationJobsContent({ projectId }: TranslationJobsContentProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [pageSize] = useState(20);
  const [progressModalOpen, setProgressModalOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [createJobDialogOpen, setCreateJobDialogOpen] = useState(false);
  const [jobTotalHints, setJobTotalHints] = useState<Record<string, null | number>>({});
  const [jobToCancel, setJobToCancel] = useState<null | TranslationJobResponse>(null);
  const [progressJob, setProgressJob] = useState<null | TranslationJobResponse>(null);
  const lastActiveJobIdRef = useRef<null | string>(null);
  const supabase = useSupabase();

  const {
    data: jobsResponse,
    isFetching,
    refetch,
  } = useTranslationJobs({
    limit: pageSize,
    offset: page * pageSize,
    project_id: projectId,
  });

  // poll for active job and manage progress modal
  const { activeJob, hasActiveJob, isJobRunning } = useTranslationJobPolling(projectId, true);

  const cancelJobMutation = useCancelTranslationJob();
  const createJobMutation = useCreateTranslationJob();

  const applyTotalHint = useCallback(
    (job: TranslationJobResponse) => {
      const hint = jobTotalHints[job.id];

      if (hint != null && job.total_keys == null) {
        return {
          ...job,
          total_keys: hint,
        };
      }

      return job;
    },
    [jobTotalHints]
  );

  useEffect(() => {
    if (hasActiveJob && activeJob) {
      lastActiveJobIdRef.current = activeJob.id;
      setProgressJob(applyTotalHint(activeJob));
      setProgressModalOpen(true);
    }
  }, [hasActiveJob, activeJob, applyTotalHint]);

  useEffect(() => {
    if (!hasActiveJob && lastActiveJobIdRef.current) {
      const jobId = lastActiveJobIdRef.current;

      refetch();

      (async () => {
        const { data, error } = await supabase.from('translation_jobs').select('*').eq('id', jobId).maybeSingle();
        if (!error && data) {
          const jobWithHint = applyTotalHint(data as TranslationJobResponse);
          setProgressJob(jobWithHint);
          const completedCount = jobWithHint.completed_keys ?? 0;
          const totalCount = jobWithHint.total_keys ?? 0;
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

      lastActiveJobIdRef.current = null;
    }
  }, [hasActiveJob, projectId, progressJob?.target_locale, refetch, supabase, applyTotalHint]);

  const handleBackToProject = useCallback(() => {
    navigate(`/projects/${projectId}`);
  }, [navigate, projectId]);

  const handleOpenCreateDialog = useCallback(() => {
    setCreateJobDialogOpen(true);
  }, []);

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const { data: jobs, metadata } = jobsResponse;

  const { displayJobs, totalPages } = useMemo(() => {
    const jobsWithHints = jobs.map(applyTotalHint);
    const activeJobWithHint = activeJob ? applyTotalHint(activeJob) : null;
    const displayJobs = activeJobWithHint
      ? jobsWithHints.map((job) => (job.id === activeJobWithHint.id ? activeJobWithHint : job))
      : jobsWithHints;
    const totalPages = Math.ceil(metadata.total / pageSize);

    return { displayJobs, totalPages };
  }, [jobs, metadata, activeJob, applyTotalHint, pageSize]);

  const handleJobClick = useCallback(
    (job: TranslationJobResponse) => {
      const jobWithHint = applyTotalHint(job);
      setProgressJob(jobWithHint);
      setProgressModalOpen(true);

      if (!isActiveJob(jobWithHint)) {
        void (async () => {
          const { data, error } = await supabase
            .from('translation_jobs')
            .select('*')
            .eq('id', jobWithHint.id)
            .maybeSingle();

          if (error) {
            toast.error('Failed to load translation job details', {
              description: error.message || 'Unable to load the latest job state.',
            });
            return;
          }

          if (data) {
            setProgressJob(applyTotalHint(data as TranslationJobResponse));
          }
        })();
      }
    },
    [applyTotalHint, supabase]
  );

  const handleCancelJobClick = useCallback((job: TranslationJobResponse) => {
    setJobToCancel(job);
    setCancelDialogOpen(true);
  }, []);

  const handleConfirmCancel = useCallback(() => {
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
  }, [jobToCancel, cancelJobMutation, refetch]);

  const handleCreateJob = useCallback(
    ({
      estimatedTotalKeys,
      key_ids,
      mode,
      target_locale,
    }: {
      estimatedTotalKeys: null | number;
      key_ids: string[];
      mode: string;
      target_locale: string;
    }) => {
      const translationMode = mode as 'all' | 'selected' | 'single';

      createJobMutation.mutate(
        {
          key_ids,
          mode: translationMode,
          project_id: projectId,
          target_locale,
        },
        {
          onError: (error) => {
            toast.error('Failed to create translation job', {
              description: error.error?.message || 'An unexpected error occurred',
            });
          },
          onSuccess: (response) => {
            toast.success('Translation job created', {
              description: `Job for ${target_locale} has been created and is now processing.`,
            });

            setCreateJobDialogOpen(false);

            if (estimatedTotalKeys !== null) {
              setJobTotalHints((prev) => ({
                ...prev,
                [response.job_id]: estimatedTotalKeys,
              }));
            }
            setProgressJob(null);

            void queryClient.invalidateQueries({
              queryKey: ['translation-jobs', 'active', projectId],
            });

            void (async () => {
              const { data, error: fetchError } = await supabase
                .from('translation_jobs')
                .select('*')
                .eq('id', response.job_id)
                .maybeSingle();

              if (fetchError || !data) {
                if (fetchError) {
                  toast.error('Failed to load translation job details', {
                    description: fetchError.message || 'Unable to load the latest job state.',
                  });
                }
                setProgressModalOpen(true);
                return;
              }

              const latestJob: TranslationJobResponse = {
                ...(data as TranslationJobResponse),
                total_keys: (data as TranslationJobResponse).total_keys ?? estimatedTotalKeys ?? null,
              };

              setProgressJob(applyTotalHint(latestJob));
              setProgressModalOpen(true);
            })();

            refetch();
          },
        }
      );
    },
    [createJobMutation, projectId, queryClient, supabase, applyTotalHint, refetch]
  );

  const handleProgressModalOpenChange = useCallback((open: boolean) => {
    setProgressModalOpen(open);
    if (!open) {
      setProgressJob(null);
    }
  }, []);

  return (
    <div className="animate-in fade-in container duration-500">
      <div className="space-y-6">
        {/* Back Button */}
        <Button aria-label="Back to project" className="gap-2" onClick={handleBackToProject} variant="ghost">
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
              onClick={handleOpenCreateDialog}
            >
              <PlusIcon className="mr-2 h-4 w-4" />
              Create Job
            </Button>
            <Button aria-label="Refresh job list" disabled={isFetching} onClick={handleRefresh} variant="outline">
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

        {hasActiveJob && activeJob && (
          <div aria-atomic="true" aria-live="polite" className="sr-only">
            Translation job in progress: {activeJob.completed_keys ?? 0} of {activeJob.total_keys ?? 0} keys translated
            for {activeJob.target_locale}
          </div>
        )}

        {jobs.length === 0 ? (
          <div className="border-border rounded-lg border p-8 text-center">
            <h3 className="text-lg font-semibold">No translation jobs found</h3>
            <p className="text-muted-foreground mt-2">
              Translation jobs will appear here after you create translations using the LLM translator.
            </p>
          </div>
        ) : (
          <>
            <TranslationJobsTable
              isLoading={false}
              jobs={displayJobs}
              onCancelJob={handleCancelJobClick}
              onJobClick={handleJobClick}
            />

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
        <JobProgressModal
          isOpen={progressModalOpen}
          job={progressJob}
          onCancelJob={handleCancelJobClick}
          onOpenChange={handleProgressModalOpenChange}
        />
        <CancelJobDialog
          isLoading={cancelJobMutation.isPending}
          isOpen={cancelDialogOpen}
          job={jobToCancel}
          onConfirmCancel={handleConfirmCancel}
          onOpenChange={setCancelDialogOpen}
        />
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
