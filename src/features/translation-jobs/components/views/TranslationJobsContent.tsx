import { useQueryClient } from '@tanstack/react-query';
import { Loader2Icon, PlusIcon, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import type { PaginationParams, TranslationJobResponse } from '@/shared/types';

import { useSupabase } from '@/app/providers/SupabaseProvider';
import { BackButton, CardList, EmptyState, PageHeader } from '@/shared/components';
import { isActiveJob } from '@/shared/types';
import { Button } from '@/shared/ui/button';

import { useCancelTranslationJob } from '../../api/useCancelTranslationJob';
import { useCreateTranslationJob } from '../../api/useCreateTranslationJob';
import { useTranslationJobs } from '../../api/useTranslationJobs';
import { useTranslationJobPolling } from '../../hooks/useTranslationJobPolling';
import { TranslationJobCard } from '../cards/TranslationJobCard';
import { CancelJobDialog } from '../dialogs/CancelJobDialog';
import { CreateTranslationJobDialog } from '../dialogs/CreateTranslationJobDialog';
import { JobProgressModal } from '../dialogs/JobProgressModal';

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
  const queryClient = useQueryClient();
  const pageSize = 20;
  const [paginationParams, setPaginationParams] = useState<PaginationParams>({
    limit: pageSize,
    offset: 0,
  });
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
    limit: paginationParams.limit ?? pageSize,
    offset: paginationParams.offset ?? 0,
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

  const handleOpenCreateDialog = useCallback(() => {
    setCreateJobDialogOpen(true);
  }, []);

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const { data: jobs, metadata } = jobsResponse;

  const displayJobs = useMemo(() => {
    const jobsWithHints = jobs.map(applyTotalHint);
    const activeJobWithHint = activeJob ? applyTotalHint(activeJob) : null;
    return activeJobWithHint
      ? jobsWithHints.map((job) => (job.id === activeJobWithHint.id ? activeJobWithHint : job))
      : jobsWithHints;
  }, [jobs, activeJob, applyTotalHint]);

  const hasJobs = useMemo(() => Boolean(displayJobs.length), [displayJobs.length]);

  const handlePageChange = useCallback((params: PaginationParams) => {
    setPaginationParams(params);
  }, []);

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
        <BackButton ariaLabel="Back to project" buttonLabel="Back to project" to={`/projects/${projectId}`} />
        <PageHeader header="Translation Jobs">
          <p className="text-muted-foreground text-sm sm:text-base">
            Create and manage AI-powered translation jobs to automatically translate your keys across multiple
            languages. Monitor progress, track completion status, and streamline your localization workflow.
          </p>
        </PageHeader>
        <CardList
          actions={
            <div className="flex gap-2">
              {hasJobs && (
                <Button aria-label="Refresh job list" disabled={isFetching} onClick={handleRefresh} variant="outline">
                  {isFetching ? (
                    <>
                      <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                      Refreshing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4" />
                      Refresh
                    </>
                  )}
                </Button>
              )}
              <Button
                aria-label="Create new translation job"
                disabled={hasActiveJob && isJobRunning}
                onClick={handleOpenCreateDialog}
              >
                <PlusIcon className="h-4 w-4" />
                Create Job
              </Button>
            </div>
          }
          data-testid="translation-jobs-list"
          emptyState={
            <EmptyState
              description="Create your first translation job to automatically translate keys using AI-powered translation. Monitor progress and manage all translation tasks from this dashboard."
              header="No translation jobs yet"
            />
          }
          pagination={{
            metadata,
            onPageChange: handlePageChange,
            params: paginationParams,
          }}
        >
          {displayJobs.map((job) => (
            <TranslationJobCard job={job} key={job.id} onCancelJob={handleCancelJobClick} onJobClick={handleJobClick} />
          ))}
        </CardList>
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
