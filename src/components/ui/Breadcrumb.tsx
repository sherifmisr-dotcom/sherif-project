import { ChevronLeft, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface BreadcrumbItem {
    label: string;
    path?: string;
    onClick?: () => void;
}

interface BreadcrumbProps {
    items: BreadcrumbItem[];
}

export function Breadcrumb({ items }: BreadcrumbProps) {
    const navigate = useNavigate();

    return (
        <nav className="flex items-center gap-1" aria-label="Breadcrumb">
            {items.map((item, index) => {
                const isLast = index === items.length - 1;
                const isClickable = !isLast && (item.path || item.onClick);

                const handleClick = () => {
                    if (item.onClick) {
                        item.onClick();
                    } else if (item.path) {
                        navigate(item.path);
                    }
                };

                return (
                    <div key={index} className="flex items-center gap-1">
                        {index > 0 && (
                            <ChevronLeft className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 flex-shrink-0 mx-0.5" />
                        )}
                        {isClickable ? (
                            <button
                                onClick={handleClick}
                                className="group flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-200"
                            >
                                {index === 0 && (
                                    <Home className="w-3.5 h-3.5 flex-shrink-0 opacity-70 group-hover:opacity-100 transition-opacity" />
                                )}
                                <span>{item.label}</span>
                            </button>
                        ) : (
                            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-sm font-semibold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700/60">
                                {item.label}
                            </span>
                        )}
                    </div>
                );
            })}
        </nav>
    );
}
