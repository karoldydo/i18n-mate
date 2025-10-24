import { ChevronLeft, ChevronRight } from 'lucide-react';

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
  const isFirstPage = currentPage === 1;
  const isLastPage = currentPage === totalPages;

  return (
    <div className="flex items-center justify-between">
      <div className="text-muted-foreground text-sm">
        Page {currentPage} of {totalPages}
      </div>
      <div className="flex items-center gap-2">
        <Button disabled={isFirstPage} onClick={() => onPageChange(currentPage - 1)} size="sm" variant="outline">
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>
        <Button disabled={isLastPage} onClick={() => onPageChange(currentPage + 1)} size="sm" variant="outline">
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
