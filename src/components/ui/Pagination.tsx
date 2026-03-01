import { useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface PaginationProps {
    currentPage: number;
    totalItems?: number;
    totalPages?: number;
    pageSize: number;
    onPageChange: (page: number) => void;
    onPageSizeChange?: (size: number) => void;
    pageSizeOptions?: number[];
}

export default function Pagination({
    currentPage,
    totalItems,
    totalPages: totalPagesProp,
    pageSize,
    onPageChange,
    onPageSizeChange,
    pageSizeOptions = [10, 20, 50, 100],
}: PaginationProps) {
    const [jumpValue, setJumpValue] = useState('');
    const totalPages = totalPagesProp ?? Math.max(1, Math.ceil((totalItems || 0) / pageSize));

    // Generate page numbers with ellipsis
    const getPageNumbers = (): (number | '...')[] => {
        const pages: (number | '...')[] = [];
        const maxVisible = 5; // max page buttons to show (excluding first/last)

        if (totalPages <= maxVisible + 2) {
            // Show all pages if total is small
            for (let i = 1; i <= totalPages; i++) pages.push(i);
            return pages;
        }

        // Always show first page
        pages.push(1);

        const start = Math.max(2, currentPage - 1);
        const end = Math.min(totalPages - 1, currentPage + 1);

        if (start > 2) pages.push('...');

        for (let i = start; i <= end; i++) {
            pages.push(i);
        }

        if (end < totalPages - 1) pages.push('...');

        // Always show last page
        pages.push(totalPages);

        return pages;
    };

    const handleJump = () => {
        const page = parseInt(jumpValue);
        if (page >= 1 && page <= totalPages) {
            onPageChange(page);
            setJumpValue('');
        }
    };

    if (totalPages <= 0) return null;

    const hasItemInfo = totalItems != null && totalItems > 0;
    const startItem = hasItemInfo ? ((currentPage - 1) * pageSize) + 1 : 0;
    const endItem = hasItemInfo ? Math.min(currentPage * pageSize, totalItems) : 0;

    return (
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50" dir="rtl">
            {/* Right side: Info + Page Size */}
            <div className="flex items-center gap-4">
                {hasItemInfo && (
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                        عرض {startItem}-{endItem} من {totalItems}
                    </span>
                )}
                {!hasItemInfo && (
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                        صفحة {currentPage} من {totalPages}
                    </span>
                )}
                {onPageSizeChange && (
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500 dark:text-gray-400">عدد:</span>
                        <select
                            value={pageSize}
                            onChange={(e) => onPageSizeChange(Number(e.target.value))}
                            className="py-1 px-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
                        >
                            {pageSizeOptions.map(size => (
                                <option key={size} value={size}>{size}</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {/* Left side: Navigation */}
            {totalPages > 1 && (
                <div className="flex items-center gap-1">
                    {/* First */}
                    <button
                        onClick={() => onPageChange(1)}
                        disabled={currentPage === 1}
                        className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title="الأولى"
                    >
                        <ChevronsRight className="w-4 h-4" />
                    </button>
                    {/* Prev */}
                    <button
                        onClick={() => onPageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title="السابقة"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>

                    {/* Page Numbers */}
                    {getPageNumbers().map((page, idx) =>
                        page === '...' ? (
                            <span key={`ellipsis-${idx}`} className="px-1 text-gray-400 dark:text-gray-500 text-sm select-none">
                                ···
                            </span>
                        ) : (
                            <button
                                key={page}
                                onClick={() => onPageChange(page)}
                                className={`min-w-[32px] h-8 rounded-lg text-sm font-medium transition-colors ${currentPage === page
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                                    }`}
                            >
                                {page}
                            </button>
                        )
                    )}

                    {/* Next */}
                    <button
                        onClick={() => onPageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title="التالية"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    {/* Last */}
                    <button
                        onClick={() => onPageChange(totalPages)}
                        disabled={currentPage === totalPages}
                        className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title="الأخيرة"
                    >
                        <ChevronsLeft className="w-4 h-4" />
                    </button>

                    {/* Jump to page */}
                    {totalPages > 5 && (
                        <div className="flex items-center gap-1 mr-2 pr-2 border-r border-gray-300 dark:border-gray-600">
                            <input
                                type="number"
                                min={1}
                                max={totalPages}
                                value={jumpValue}
                                onChange={(e) => setJumpValue(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleJump()}
                                placeholder={`${currentPage}`}
                                className="w-14 h-8 px-2 text-sm text-center border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                            <button
                                onClick={handleJump}
                                className="h-8 px-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                            >
                                انتقل
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
