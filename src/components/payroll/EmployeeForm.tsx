import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import './datepicker-rtl.css';
import { apiClient } from '@/lib/api';
import { showError, showSuccess } from '@/lib/toast';
import ModalOverlay from '@/components/ui/ModalOverlay';

const employeeSchema = z.object({
    name: z.string().min(2, 'اسم الموظف يجب أن يكون على الأقل حرفين').max(100),
    department: z.string().max(100).optional().or(z.literal('')),
    startDate: z.string().min(1, 'تاريخ التعيين مطلوب'),
    baseSalary: z.number().min(0.01, 'يجب تعيين الراتب الاساسي'),
    allowances: z.number().min(0).optional(),
    status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

type EmployeeFormData = z.infer<typeof employeeSchema>;

interface Employee {
    id: string;
    name: string;
    department?: string;
    startDate?: string;
    baseSalary: number;
    allowances: number;
    status: 'ACTIVE' | 'INACTIVE';
}

interface EmployeeFormProps {
    isOpen: boolean;
    onClose: () => void;
    employee?: Employee | null;
}

export function EmployeeForm({ isOpen, onClose, employee }: EmployeeFormProps) {
    const queryClient = useQueryClient();
    const isEditMode = !!employee;

    const {
        register,
        handleSubmit,
        formState: { errors },
        reset,
        control,
    } = useForm<EmployeeFormData>({
        resolver: zodResolver(employeeSchema),
        defaultValues: {
            name: '',
            department: '',
            startDate: '',
            baseSalary: 0,
            allowances: 0,
            status: 'ACTIVE',
        },
    });

    useEffect(() => {
        if (isOpen && employee) {
            // Convert ISO date to YYYY-MM-DD format for date input
            const formatDateForInput = (dateString?: string) => {
                if (!dateString) return '';
                const date = new Date(dateString);
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            };

            reset({
                name: employee.name,
                department: employee.department || '',
                startDate: formatDateForInput(employee.startDate),
                baseSalary: Number(employee.baseSalary),
                allowances: Number(employee.allowances),
                status: employee.status,
            });
        } else if (isOpen && !employee) {
            reset({
                name: '',
                department: '',
                startDate: '',
                baseSalary: 0,
                allowances: 0,
                status: 'ACTIVE',
            });
        }
    }, [isOpen, employee, reset]);

    const createMutation = useMutation({
        mutationFn: (data: any) => apiClient.createEmployee(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['employees'] });
            showSuccess('تم إضافة الموظف بنجاح');
            onClose();
        },
        onError: (error: any) => {
            const message = error.response?.data?.message || 'حدث خطأ أثناء إضافة الموظف';
            showError(message);
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) =>
            apiClient.updateEmployee(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['employees'] });
            showSuccess('تم تعديل بيانات الموظف بنجاح');
            onClose();
        },
        onError: (error: any) => {
            const message = error.response?.data?.message || 'حدث خطأ أثناء تعديل الموظف';
            showError(message);
        },
    });

    const onSubmit = (data: EmployeeFormData) => {
        const employeeData = {
            name: data.name,
            department: data.department || undefined,
            startDate: data.startDate || undefined,
            baseSalary: data.baseSalary,
            allowances: data.allowances || 0,
            status: data.status || 'ACTIVE',
        };

        if (isEditMode && employee) {
            updateMutation.mutate({ id: employee.id, data: employeeData });
        } else {
            createMutation.mutate(employeeData);
        }
    };

    if (!isOpen) return null;

    return (
        <ModalOverlay>
            <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full p-6">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                            {isEditMode ? 'تعديل بيانات الموظف' : 'إضافة موظف جديد'}
                        </h2>
                        <button
                            type="button"
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Form Fields */}
                    <div className="space-y-4">
                        {/* Name */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                اسم الموظف <span className="text-red-500">*</span>
                            </label>
                            <input
                                {...register('name')}
                                type="text"
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            />
                            {errors.name && (
                                <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                            )}
                        </div>

                        {/* Department */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                القسم
                            </label>
                            <input
                                {...register('department')}
                                type="text"
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            />
                        </div>

                        {/* Start Date */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                تاريخ التعيين <span className="text-red-500">*</span>
                            </label>
                            <Controller
                                name="startDate"
                                control={control}
                                render={({ field }) => (
                                    <DatePicker
                                        selected={field.value ? new Date(field.value) : null}
                                        onChange={(date: Date | null) => {
                                            if (date) {
                                                const year = date.getFullYear();
                                                const month = String(date.getMonth() + 1).padStart(2, '0');
                                                const day = String(date.getDate()).padStart(2, '0');
                                                field.onChange(`${year}-${month}-${day}`);
                                            } else {
                                                field.onChange('');
                                            }
                                        }}
                                        dateFormat="dd/MM/yyyy"
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-right"
                                        wrapperClassName="w-full"
                                        calendarClassName="rtl-calendar"
                                        placeholderText="اختر التاريخ"
                                        showYearDropdown
                                        showMonthDropdown
                                        dropdownMode="select"
                                    />
                                )}
                            />
                            {errors.startDate && (
                                <p className="mt-1 text-sm text-red-600">{errors.startDate.message}</p>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {/* Base Salary */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    الراتب الأساسي <span className="text-red-500">*</span>
                                </label>
                                <input
                                    {...register('baseSalary', { valueAsNumber: true })}
                                    type="number"
                                    step="0.01"
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                                {errors.baseSalary && (
                                    <p className="mt-1 text-sm text-red-600">{errors.baseSalary.message}</p>
                                )}
                            </div>

                            {/* Allowances */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    البدلات
                                </label>
                                <input
                                    {...register('allowances', { valueAsNumber: true })}
                                    type="number"
                                    step="0.01"
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                            </div>
                        </div>

                        {/* Status */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                الحالة
                            </label>
                            <select
                                {...register('status')}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            >
                                <option value="ACTIVE">نشط</option>
                                <option value="INACTIVE">غير نشط</option>
                            </select>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                        >
                            إلغاء
                        </button>
                        <button
                            type="submit"
                            disabled={createMutation.isPending || updateMutation.isPending}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                        >
                            {createMutation.isPending || updateMutation.isPending
                                ? 'جاري الحفظ...'
                                : isEditMode
                                    ? 'حفظ التعديلات'
                                    : 'إضافة الموظف'}
                        </button>
                    </div>
                </form>
            </div>
        </ModalOverlay>
    );
}
