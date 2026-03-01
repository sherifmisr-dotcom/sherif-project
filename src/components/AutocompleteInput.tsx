import { useState, useEffect, useRef } from 'react';
import { Search, Plus, X } from 'lucide-react';

interface AutocompleteInputProps {
    value: string;
    onChange: (value: string) => void;
    onSearch: (query: string) => Promise<string[]>;
    onAddNew?: () => void;
    placeholder?: string;
    className?: string;
    readOnly?: boolean;
}

export default function AutocompleteInput({
    value,
    onChange,
    onSearch,
    onAddNew,
    placeholder = 'ابحث أو اكتب...',
    className = '',
    readOnly = false,
}: AutocompleteInputProps) {
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [allSuggestions, setAllSuggestions] = useState<string[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [internalValue, setInternalValue] = useState(value);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Sync internal value with external value prop
    useEffect(() => {
        setInternalValue(value);
    }, [value]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
                setSearchQuery('');
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleInputClick = async () => {
        if (value.trim()) {
            // If there's already a value, don't open dropdown
            return;
        }

        // Load all templates when clicking empty field
        try {
            const results = await onSearch('');
            setAllSuggestions(results);
            setSuggestions(results);
            setSearchQuery('');
            setShowSuggestions(true); // Show AFTER data is loaded
        } catch (error) {
            console.error('Error loading templates:', error);
            setSuggestions([]);
            setAllSuggestions([]);
        }
    };

    const handleSelectSuggestion = (suggestion: string) => {
        onChange(suggestion);
        setShowSuggestions(false);
        setSuggestions([]);
        setAllSuggestions([]);
        setSearchQuery('');
    };

    const handleClearValue = () => {
        setInternalValue('');
        onChange('');
        if (!readOnly) {
            handleInputClick();
        }
    };

    const handleSearchChange = (query: string) => {
        setSearchQuery(query);
        if (!query.trim()) {
            setSuggestions(allSuggestions);
        } else {
            const filtered = allSuggestions.filter(item =>
                item.toLowerCase().includes(query.toLowerCase())
            );
            setSuggestions(filtered);
        }
    };

    return (
        <div ref={wrapperRef} className="relative">
            <div className="relative">
                <input
                    type="text"
                    value={internalValue}
                    onChange={(e) => {
                        const newValue = e.target.value;
                        setInternalValue(newValue);
                        onChange(newValue);
                    }}
                    onFocus={handleInputClick}
                    onClick={handleInputClick}
                    onKeyDown={(e) => readOnly && e.preventDefault()}
                    onPaste={(e) => readOnly && e.preventDefault()}
                    placeholder={placeholder}
                    className={`${className} pr-10 ${readOnly ? 'cursor-pointer' : ''}`}
                />
                {value ? (
                    <button
                        type="button"
                        onClick={handleClearValue}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                        <X className="w-4 h-4" />
                    </button>
                ) : (
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                )}
            </div>

            {showSuggestions && (
                <div
                    className="absolute z-50 w-full mt-1.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl shadow-xl shadow-black/10 dark:shadow-black/30 overflow-hidden flex flex-col"
                    style={{ animation: 'dropdownIn 0.15s ease-out' }}
                >
                    {/* Search Input */}
                    <div className="p-2 border-b border-gray-100 dark:border-gray-600">
                        <div className="relative">
                            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => handleSearchChange(e.target.value)}
                                placeholder="ابحث عن بند..."
                                className="w-full pr-9 pl-3 py-2 text-sm border border-gray-200 dark:border-gray-500 rounded-lg bg-gray-50 dark:bg-gray-600 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                            />
                        </div>
                    </div>

                    {/* Suggestions List - shows ~4 items, rest scrollable */}
                    <ul className="overflow-y-auto py-1 scrollbar-thin" style={{ maxHeight: '172px' }}>
                        {suggestions.length > 0 ? (
                            suggestions.map((suggestion, index) => (
                                <li key={index}>
                                    <button
                                        type="button"
                                        onClick={() => handleSelectSuggestion(suggestion)}
                                        className={`w-full text-right px-4 py-2.5 text-sm transition-colors duration-100
                                            ${suggestion === value
                                                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium'
                                                : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600/50'
                                            }`}
                                    >
                                        {suggestion}
                                    </button>
                                </li>
                            ))
                        ) : (
                            <li className="px-4 py-6 text-center text-sm text-gray-400 dark:text-gray-500">
                                {searchQuery ? 'لا توجد نتائج' : 'لا توجد بنود'}
                            </li>
                        )}
                    </ul>

                    {/* Footer: Add New + Count */}
                    <div className="border-t border-gray-100 dark:border-gray-600 bg-gray-50/50 dark:bg-gray-800/50 flex items-center justify-between px-3 py-2">
                        {onAddNew ? (
                            <button
                                type="button"
                                onClick={() => {
                                    setShowSuggestions(false);
                                    setSearchQuery('');
                                    onAddNew();
                                }}
                                className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors flex items-center gap-1.5"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                إضافة بند جديد
                            </button>
                        ) : (
                            <span />
                        )}
                        {suggestions.length > 0 && (
                            <span className="text-xs text-gray-400 dark:text-gray-500">
                                {suggestions.length} بند
                            </span>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
