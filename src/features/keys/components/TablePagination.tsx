import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCallback, useMemo } from 'react';

import { Button } from '@/shared/ui/button';

interface TablePaginationProps {
  currentPage: number;
  onPageChange: (page: number) => void;
  totalPages: number;
}

/**
 * TablePagination - Pagination controls for navigating through key pages
 *
 * Provides previous/next navigation buttons and page number display.
 * Handles page bounds checking and disabled states.
 */
export function TablePagination({ currentPage, onPageChange, totalPages }: TablePaginationProps) {
  const { isFirstPage, isLastPage } = useMemo(
    () => ({
      isFirstPage: currentPage === 1,
      isLastPage: currentPage === totalPages,
    }),
    [currentPage, totalPages]
  );

  const handlePreviousPage = useCallback(() => {
    onPageChange(currentPage - 1);
  }, [currentPage, onPageChange]);

  const handleNextPage = useCallback(() => {
    onPageChange(currentPage + 1);
  }, [currentPage, onPageChange]);

  return (
    <div className="flex items-center justify-between">
      <div className="text-muted-foreground text-sm">
        Page {currentPage} of {totalPages}
      </div>
      <div className="flex items-center gap-2">
        <Button disabled={isFirstPage} onClick={handlePreviousPage} size="sm" variant="outline">
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>
        <Button disabled={isLastPage} onClick={handleNextPage} size="sm" variant="outline">
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
