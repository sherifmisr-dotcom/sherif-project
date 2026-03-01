import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, Search, ChevronDown } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { EmployeeForm } from './EmployeeForm';
import { Protected } from '@/components/permissions/Protected';
import { showConfirm, showSuccess, showError } from '@/lib/toast';
import Pagination from '@/components/ui/Pagination';

interface Employee {
    id: string;
    name: string;
    department?: string;
    startDate?: string;
    baseSalary: number;
    allowances: number;
    status: 'ACTIVE' | 'INACTIVE';
    createdAt: string;
    updatedAt: string;
}

export function EmployeesTab() {
    const queryClient = useQueryClient();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'ACTIVE' | 'INACTIVE'>('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const STATUS_OPTIONS = [
        { value: 'all', label: 'الكل' },
        { value: 'ACTIVE', label: 'نشط' },
        { value: 'INACTIVE', label: 'غير نشط' }
    ];

    const selectedStatusLabel = STATUS_OPTIONS.find(opt => opt.value === statusFilter)?.label || 'الكل';

    // Fetch employees
    const { data, isLoading } = useQuery({
        queryKey: ['employees', searchQuery, statusFilter],
        queryFn: async () => {
            const params: any = {};
            if (searchQuery) params.q = searchQuery;
            if (statusFilter !== 'all') params.status = statusFilter;
            const response = await apiClient.getEmployees(params);
            return response?.data || [];
        },
    });

    const employees = data || [];

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, statusFilter]);

    const paginatedEmployees = employees.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    const handlePageSizeChange = (newSize: number) => {
        setPageSize(newSize);
        setCurrentPage(1);
    };

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: (id: string) => apiClient.deleteEmployee(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['employees'] });
            showSuccess('تم حذف الموظف بنجاح');
        },
        onError: () => {
            showError('حدث خطأ أثناء حذف الموظف');
        },
    });

    const handleAddEmployee = () => {
        setSelectedEmployee(null);
        setIsFormOpen(true);
    };

    const handleEditEmployee = (employee: Employee) => {
        setSelectedEmployee(employee);
        setIsFormOpen(true);
    };

    const handleDeleteEmployee = async (employee: Employee) => {
        showConfirm(
            `هل أنت متأكد من حذف الموظف "${employee.name}"؟`,
            () => {
                deleteMutation.mutate(employee.id);
            }
        );
    };

    const calculateNetSalary = (employee: Employee) => {
        const base = Number(employee.baseSalary) || 0;
        const allowances = Number(employee.allowances) || 0;
        return base + allowances;
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                        قائمة الموظفين
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        إدارة بيانات الموظفين ورواتبهم
                    </p>
                </div>
                {/* Requirement 6.3: Create permission */}
                <Protected permission="employees.create">
                    <button
                        onClick={handleAddEmployee}
                        className="btn-primary"
                    >
                        <Plus className="w-4 h-4" />
                        إضافة موظف
                    </button>
                </Protected>
            </div>

            {/* Filters */}
            <div className="flex gap-3">
                <div className="relative flex-1">
                    <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="البحث عن موظف..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pr-10 pl-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                </div>
                <div ref={dropdownRef} className="relative z-10 w-28 md:w-48 shrink-0">
                    <button
                        type="button"
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className={`w-full flex items-center justify-between px-4 py-2.5 border rounded-lg text-right transition-all duration-200
                        ${isDropdownOpen
                                ? 'border-blue-500 ring-2 ring-blue-500/20 dark:border-blue-400 dark:ring-blue-400/20'
                                : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                            }
                        bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-medium`}
                    >
                        <span>{selectedStatusLabel}</span>
                        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isDropdownOpen && (
                        <div className="absolute z-50 mt-1.5 w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl shadow-xl shadow-black/10 dark:shadow-black/30 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150"
                            style={{ animation: 'dropdownIn 0.15s ease-out' }}
                        >
                            <ul className="py-1">
                                {STATUS_OPTIONS.map((option) => (
                                    <li key={option.value}>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setStatusFilter(option.value as any);
                                                setIsDropdownOpen(false);
                                            }}
                                            className={`w-full text-right px-4 py-2.5 text-sm transition-colors duration-100 flex justify-between items-center
                                                ${option.value === statusFilter
                                                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium'
                                                    : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600/50'
                                                }`}
                                        >
                                            {option.label}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </div>

            {/* Table */}
            {isLoading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
                </div>
            ) : employees.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    لا توجد بيانات موظفين
                </div>
            ) : (
                <>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-800">
                                <tr>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                        الاسم
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                        القسم
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                        تاريخ التعيين
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                        الراتب الأساسي
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                        البدلات
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                        إجمالي الراتب
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                        الحالة
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                        الإجراءات
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                                {paginatedEmployees.map((employee: Employee) => (
                                    <tr key={employee.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                            {employee.name}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            {employee.department || '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            {employee.startDate ? new Date(employee.startDate).toLocaleDateString('en-GB') : '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                            {Number(employee.baseSalary).toLocaleString('en-US')} ر.س
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                            {Number(employee.allowances).toLocaleString('en-US')} ر.س
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                            {calculateNetSalary(employee).toLocaleString('en-US')} ر.س
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span
                                                className={`px-2 py-1 text-xs rounded-full ${employee.status === 'ACTIVE'
                                                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                                                    }`}
                                            >
                                                {employee.status === 'ACTIVE' ? 'نشط' : 'غير نشط'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            <div className="flex items-center gap-2">
                                                {/* Requirement 6.5: Edit permission */}
                                                <Protected permission="employees.edit">
                                                    <button
                                                        onClick={() => handleEditEmployee(employee)}
                                                        className="p-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                </Protected>
                                                {/* Requirement 6.7: Delete permission */}
                                                <Protected permission="employees.delete">
                                                    <button
                                                        onClick={() => handleDeleteEmployee(employee)}
                                                        className="p-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </Protected>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <Pagination
                        currentPage={currentPage}
                        totalItems={employees.length}
                        pageSize={pageSize}
                        onPageChange={setCurrentPage}
                        onPageSizeChange={handlePageSizeChange}
                    />
                </>
            )}

            {/* Employee Form Modal */}
            <EmployeeForm
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                employee={selectedEmployee}
            />
        </div>
    );
}
