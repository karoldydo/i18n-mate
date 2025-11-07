import { type ReactNode, useCallback } from 'react';

import type { PaginationMetadata, PaginationParams } from '@/shared/types';

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/shared/ui/pagination';
import { cn } from '@/shared/utils';

interface CardListProps {
  actionButton?: ReactNode;
  children: ReactNode;
  className?: string;
  'data-testid'?: string;
  description?: string;
  emptyState?: ReactNode;
  pagination?: {
    metadata: PaginationMetadata;
    onPageChange: (params: PaginationParams) => void;
    params: PaginationParams;
  };
  title?: string;
}

/**
 * CardList – Versatile container for rendering and paginating lists of cards.
 *
 * Features:
 * - Optional header section including a title, description, and an action button.
 * - Flexible content projection for card items (such as <CardItem> or any card-like child).
 * - Built-in pagination UI with shadcn/ui components for navigating multiple pages.
 * - Smart pagination with ellipsis for large page ranges.
 * - Displays an optional empty state when no children are provided.
 * - Responsive design with appropriate spacing and layout for modern UIs.
 *
 * @param {object} props - CardListProps
 * @param {string} [props.title] - Optional title shown in the header.
 * @param {string} [props.description] - Optional short description below the title.
 * @param {ReactNode} [props.actionButton] - Optional button or element for primary actions (e.g. "Create").
 * @param {ReactNode} props.children - List content; typically a set of <CardItem> or similar.
 * @param {string} [props.className] - Custom className for container layout extension.
 * @param {ReactNode} [props.emptyState] - Shown instead of children if none are provided.
 * @param {object} [props.pagination] - Optional pagination configuration.
 * @param {PaginationMetadata} props.pagination.metadata - Supabase-style metadata with total count.
 * @param {PaginationParams} props.pagination.params - Pagination offset & limit data.
 * @param {(params: PaginationParams) => void} props.pagination.onPageChange - Called when pagination is changed.
 *
 * @example
 * <CardList
 *   title="Projects"
 *   description="Manage your translation projects"
 *   actionButton={<Button>Create Project</Button>}
 *   pagination={{ metadata, params, onPageChange }}
 * >
 *   {projects.map(project => (
 *     <ProjectCard key={project.id} project={project} />
 *   ))}
 * </CardList>
 */
export function CardList({
  actionButton,
  children,
  className,
  'data-testid': dataTestId,
  description,
  emptyState,
  pagination,
  title,
}: CardListProps) {
  const hasChildren = Boolean(children);
  const showPagination = pagination && pagination.metadata.total > (pagination.params.limit ?? 0);

  // calculate key pagination values
  const currentPage = pagination ? Math.floor((pagination.params.offset ?? 0) / (pagination.params.limit ?? 1)) + 1 : 1;
  const totalPages = pagination ? Math.ceil(pagination.metadata.total / (pagination.params.limit ?? 1)) : 1;
  const isFirstPage = currentPage === 1;
  const isLastPage = currentPage >= totalPages;

  const handlePreviousPage = useCallback(() => {
    if (!pagination || isFirstPage) return;
    const newOffset = Math.max(0, (pagination.params.offset ?? 0) - (pagination.params.limit ?? 0));
    pagination.onPageChange({ ...pagination.params, offset: newOffset });
  }, [pagination, isFirstPage]);

  const handleNextPage = useCallback(() => {
    if (!pagination || isLastPage) return;
    const newOffset = (pagination.params.offset ?? 0) + (pagination.params.limit ?? 0);
    pagination.onPageChange({ ...pagination.params, offset: newOffset });
  }, [pagination, isLastPage]);

  const handlePageClick = useCallback(
    (page: number) => {
      if (!pagination) return;
      const newOffset = (page - 1) * (pagination.params.limit ?? 0);
      pagination.onPageChange({ ...pagination.params, offset: newOffset });
    },
    [pagination]
  );

  /**
   * Returns an array of page numbers and 'ellipsis' strings to create
   * paginated navigation with compact ellipsis as appropriate.
   */
  const generatePageNumbers = useCallback(() => {
    const pages: ('ellipsis' | number)[] = [];
    const maxVisiblePages = 7;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      const startPage = Math.max(2, currentPage - 1);
      const endPage = Math.min(totalPages - 1, currentPage + 1);

      if (startPage > 2) {
        pages.push('ellipsis');
      }

      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }

      if (endPage < totalPages - 1) {
        pages.push('ellipsis');
      }

      pages.push(totalPages);
    }

    return pages;
  }, [totalPages, currentPage]);

  return (
    <div className={cn('space-y-4', className)} data-testid={dataTestId}>
      {/* optional header section */}
      {(title || description || actionButton) && (
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            {title && <h1 className="text-3xl font-bold tracking-tight">{title}</h1>}
            {description && <p className="text-muted-foreground mt-2">{description}</p>}
          </div>
          {actionButton && <div className="flex-shrink-0">{actionButton}</div>}
        </div>
      )}

      {/* card list content */}
      {hasChildren ? (
        <div className="space-y-3">{children}</div>
      ) : (
        emptyState && <div className="py-8">{emptyState}</div>
      )}

      {/* pagination */}
      {showPagination && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                aria-disabled={isFirstPage}
                className={cn(isFirstPage && 'pointer-events-none opacity-50')}
                onClick={handlePreviousPage}
              />
            </PaginationItem>

            {generatePageNumbers().map((page, index) =>
              page === 'ellipsis' ? (
                <PaginationItem key={`ellipsis-${index}`}>
                  <PaginationEllipsis />
                </PaginationItem>
              ) : (
                <PaginationItem key={page}>
                  <button
                    aria-current={page === currentPage ? 'page' : undefined}
                    className={cn(
                      'flex size-9 items-center justify-center rounded-md text-sm transition-colors',
                      page === currentPage
                        ? 'border-input bg-background hover:bg-accent hover:text-accent-foreground border shadow-sm'
                        : 'hover:bg-accent hover:text-accent-foreground'
                    )}
                    onClick={() => handlePageClick(page)}
                  >
                    {page}
                  </button>
                </PaginationItem>
              )
            )}

            <PaginationItem>
              <PaginationNext
                aria-disabled={isLastPage}
                className={cn(isLastPage && 'pointer-events-none opacity-50')}
                onClick={handleNextPage}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}
