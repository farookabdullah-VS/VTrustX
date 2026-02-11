import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

/**
 * Reusable pagination component.
 *
 * Usage:
 *   const [page, setPage] = useState(1);
 *   const PAGE_SIZE = 10;
 *   const paginatedData = data.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
 *
 *   <Pagination
 *     currentPage={page}
 *     totalItems={data.length}
 *     pageSize={PAGE_SIZE}
 *     onPageChange={setPage}
 *   />
 */
export function Pagination({
  currentPage = 1,
  totalItems = 0,
  pageSize = 10,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50],
  showPageSize = true,
  showInfo = true,
  maxButtons = 5,
  style = {},
}) {
  const { t } = useTranslation();
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  // Calculate page numbers to show
  const pageNumbers = useMemo(() => {
    const pages = [];
    let start = Math.max(1, currentPage - Math.floor(maxButtons / 2));
    let end = Math.min(totalPages, start + maxButtons - 1);

    // Adjust start if we're near the end
    if (end - start + 1 < maxButtons) {
      start = Math.max(1, end - maxButtons + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }, [currentPage, totalPages, maxButtons]);

  const btnBase = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '36px',
    height: '36px',
    padding: '0 8px',
    border: '1px solid var(--input-border)',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: '500',
    transition: 'all 0.15s',
    backgroundImage: 'none',
    textTransform: 'none',
    letterSpacing: 'normal',
    boxShadow: 'none',
  };

  const btnDefault = {
    ...btnBase,
    background: 'var(--input-bg)',
    color: 'var(--text-color)',
  };

  const btnActive = {
    ...btnBase,
    background: 'var(--primary-color)',
    color: 'var(--button-text, #fff)',
    border: '1px solid var(--primary-color)',
    fontWeight: '700',
  };

  const btnDisabled = {
    ...btnBase,
    background: 'var(--input-bg)',
    color: 'var(--text-muted)',
    opacity: 0.5,
    cursor: 'not-allowed',
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        padding: '16px 0',
        fontSize: '0.85rem',
        ...style,
      }}
    >
      {/* Left: Info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', color: 'var(--text-muted)' }}>
        {showInfo && totalItems > 0 && (
          <span>
            {t('pagination.showing') !== 'pagination.showing'
              ? t('pagination.showing')
              : 'Showing'}{' '}
            <strong style={{ color: 'var(--text-color)' }}>{startItem}-{endItem}</strong>{' '}
            {t('pagination.of') !== 'pagination.of' ? t('pagination.of') : 'of'}{' '}
            <strong style={{ color: 'var(--text-color)' }}>{totalItems}</strong>
          </span>
        )}

        {showPageSize && onPageSizeChange && (
          <select
            value={pageSize}
            onChange={(e) => {
              onPageSizeChange(Number(e.target.value));
              onPageChange(1); // reset to page 1
            }}
            style={{
              padding: '6px 10px',
              borderRadius: '8px',
              border: '1px solid var(--input-border)',
              background: 'var(--input-bg)',
              color: 'var(--text-color)',
              fontSize: '0.85rem',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size} / {t('pagination.page') !== 'pagination.page' ? t('pagination.page') : 'page'}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Right: Page buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        {/* First page */}
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage <= 1}
          style={currentPage <= 1 ? btnDisabled : btnDefault}
          aria-label="Go to first page"
          title="First page"
        >
          <ChevronsLeft size={16} />
        </button>

        {/* Previous */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          style={currentPage <= 1 ? btnDisabled : btnDefault}
          aria-label="Go to previous page"
          title="Previous page"
        >
          <ChevronLeft size={16} />
        </button>

        {/* Page numbers */}
        {pageNumbers[0] > 1 && (
          <span style={{ padding: '0 4px', color: 'var(--text-muted)' }}>...</span>
        )}

        {pageNumbers.map((page) => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            style={page === currentPage ? btnActive : btnDefault}
            aria-label={`Go to page ${page}`}
            aria-current={page === currentPage ? "page" : undefined}
          >
            {page}
          </button>
        ))}

        {pageNumbers[pageNumbers.length - 1] < totalPages && (
          <span style={{ padding: '0 4px', color: 'var(--text-muted)' }}>...</span>
        )}

        {/* Next */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          style={currentPage >= totalPages ? btnDisabled : btnDefault}
          aria-label="Go to next page"
          title="Next page"
        >
          <ChevronRight size={16} />
        </button>

        {/* Last page */}
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage >= totalPages}
          style={currentPage >= totalPages ? btnDisabled : btnDefault}
          aria-label="Go to last page"
          title="Last page"
        >
          <ChevronsRight size={16} />
        </button>
      </div>
    </div>
  );
}

/**
 * Hook for client-side pagination of data arrays.
 *
 * Usage:
 *   const { paginatedData, paginationProps } = usePagination(allData, { pageSize: 10 });
 *   return (
 *     <>
 *       {paginatedData.map(item => <Row key={item.id} {...item} />)}
 *       <Pagination {...paginationProps} />
 *     </>
 *   );
 */
export function usePagination(data = [], options = {}) {
  const { pageSize: initialPageSize = 10 } = options;
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(initialPageSize);

  // Reset to page 1 when data changes significantly
  const totalItems = data.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  // Clamp current page
  const safePage = Math.min(currentPage, totalPages);
  if (safePage !== currentPage) {
    setCurrentPage(safePage);
  }

  const paginatedData = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return data.slice(start, start + pageSize);
  }, [data, safePage, pageSize]);

  const paginationProps = {
    currentPage: safePage,
    totalItems,
    pageSize,
    onPageChange: setCurrentPage,
    onPageSizeChange: setPageSize,
  };

  return { paginatedData, paginationProps, currentPage: safePage, pageSize, setCurrentPage, setPageSize };
}
