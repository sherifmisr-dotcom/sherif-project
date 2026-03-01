import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { apiClient } from '@/lib/api';

const payrollRunSchema = z.object({
    month: z.string().min(1, 'الشهر مطلوب'),
    items: z.array(z.object({
        employeeId: z.string(),
        base: z.number(),
        allowances: z.number(),
        deductions: z.number(),
    })).min(1, 'يجب إضافة موظف واحد على الأقل'),
});

type PayrollRunFormData = z.infer<typeof payrollRunSchema>;

interface Employee {
    id: string;
    name: string;
    department?: string;
    baseSalary: number;
    allowances: number;
    status: 'ACTIVE' | 'INACTIVE';
}

interface PayrollRun {
    id: string;
    month: string;
    items: Array<{
        employeeId: string;
        base: number;
        allowances: number;
        deductions: number;
    }>;
}

interface PayrollRunFormProps {
    isOpen: boolean;
    onClose: () => void;
    payrollRun?: PayrollRun | null;
}

export function PayrollRunForm({ isOpen, onClose, payrollRun }: PayrollRunFormProps) {
    const queryClient = useQueryClient();
    const isEditMode = !!payrollRun;
    const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(new Set());
    const [deductions, setDeductions] = useState<Record<string, number>>({});

    const {
        register,
        handleSubmit,
        formState: { errors },
        reset,
    } = useForm<PayrollRunFormData>({
        resolver: zodResolver(payrollRunSchema),
        defaultValues: {
            month: '',
            items: [],
        },
    });

    // Fetch active employees
    const { data: employeesData } = useQuery({
        queryKey: ['employees', 'ACTIVE'],
        queryFn: async () => {
            const response = await apiClient.getEmployees({ status: 'ACTIVE' });
            return response?.data || [];
        },
        enabled: isOpen,
    });

    const employees = employeesData || [];

    useEffect(() => {
        if (isOpen && payrollRun) {
            const month = new Date(payrollRun.month).toISOString().slice(0, 7);
            reset({ month, items: payrollRun.items });

            const selected = new Set(payrollRun.items.map(item => item.employeeId));
            setSelectedEmployees(selected);

            const deductionsMap: Record<string, number> = {};
            payrollRun.items.forEach(item => {
                deductionsMap[item.employeeId] = item.deductions;
            });
            setDeductions(deductionsMap);
        } else if (isOpen) {
            reset({ month: '', items: [] });
            setSelectedEmployees(new Set());
            setDeductions({});
        }
    }, [isOpen, payrollRun, reset]);

    const createMutation = useMutation({
        mutationFn: (data: any) => apiClient.createPayrollRun(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['payrollRuns'] });
            onClose();
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) =>
            apiClient.updatePayrollRun(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['payrollRuns'] });
            onClose();
        },
    });

    const toggleEmployee = (employeeId: string) => {
        const newSelected = new Set(selectedEmployees);
        if (newSelected.has(employeeId)) {
            newSelected.delete(employeeId);
            const newDeductions = { ...deductions };
            delete newDeductions[employeeId];
            setDeductions(newDeductions);
        } else {
            newSelected.add(employeeId);
            setDeductions({ ...deductions, [employeeId]: 0 });
        }
        setSelectedEmployees(newSelected);
    };

    const updateDeduction = (employeeId: string, value: number) => {
        setDeductions({ ...deductions, [employeeId]: value });
    };

    const onSubmit = (data: PayrollRunFormData) => {
        const items = Array.from(selectedEmployees).map(employeeId => {
            const employee = employees.find((e: Employee) => e.id === employeeId);
            if (!employee) return null;

            return {
                employeeId,
                base: Number(employee.baseSalary),
                allowances: Number(employee.allowances),
                deductions: deductions[employeeId] || 0,
            };
        }).filter(Boolean);

        const payrollData = {
            month: data.month,
            items,
        };

        if (isEditMode && payrollRun) {
            updateMutation.mutate({ id: payrollRun.id, data: payrollData });
        } else {
            createMutation.mutate(payrollData);
        }
    };

    const calculateTotal = () => {
        let total = 0;
        selectedEmployees.forEach(employeeId => {
            const employee = employees.find((e: Employee) => e.id === employeeId);
            if (employee) {
                const net = Number(employee.baseSalary) + Number(employee.allowances) - (deductions[employeeId] || 0);
                total += net;
            }
        });
        return total;
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center p-4">
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
                    onClick={onClose}
                />

                <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        {/* Header */}
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                                {isEditMode ? 'تعديل كشف الرواتب' : 'إنشاء كشف رواتب جديد'}
                            </h2>
                            <button
                                type="button"
                                onClick={onClose}
                                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Month Selection */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                الشهر <span className="text-red-500">*</span>
                            </label>
                            <input
                                {...register('month')}
                                type="month"
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            />
                            {errors.month && (
                                <p className="mt-1 text-sm text-red-600">{errors.month.message}</p>
                            )}
                        </div>

                        {/* Employee Selection */}
                        <div>
                            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                اختيار الموظفين <span className="text-red-500">*</span>
                            </h3>
                            <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
                                <table className="w-full">
                                    <thead className="bg-gray-50 dark:bg-gray-900">
                                        <tr>
                                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">
                                                اختيار
                                            </th>
                                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">
                                                الموظف
                                            </th>
                                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">
                                                الأساسي
                                            </th>
                                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">
                                                البدلات
                                            </th>
                                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">
                                                الخصومات
                                            </th>
                                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">
                                                الصافي
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                        {employees.map((employee: Employee) => {
                                            const isSelected = selectedEmployees.has(employee.id);
                                            const deduction = deductions[employee.id] || 0;
                                            const net = Number(employee.baseSalary) + Number(employee.allowances) - deduction;

                                            return (
                                                <tr key={employee.id} className={isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''}>
                                                    <td className="px-4 py-2">
                                                        <input
                                                            type="checkbox"
                                                            checked={isSelected}
                                                            onChange={() => toggleEmployee(employee.id)}
                                                            className="w-4 h-4 text-blue-600 rounded"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                                                        {employee.name}
                                                    </td>
                                                    <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                                                        {Number(employee.baseSalary).toLocaleString('en-US')}
                                                    </td>
                                                    <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                                                        {Number(employee.allowances).toLocaleString('en-US')}
                                                    </td>
                                                    <td className="px-4 py-2">
                                                        <input
                                                            type="number"
                                                            value={deduction}
                                                            onChange={(e) => updateDeduction(employee.id, Number(e.target.value))}
                                                            disabled={!isSelected}
                                                            className="w-24 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-2 text-sm font-medium text-gray-900 dark:text-white">
                                                        {isSelected ? net.toLocaleString('en-US') : '-'}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            {errors.items && (
                                <p className="mt-1 text-sm text-red-600">{errors.items.message}</p>
                            )}
                        </div>

                        {/* Summary */}
                        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    عدد الموظفين المختارين:
                                </span>
                                <span className="text-lg font-semibold text-gray-900 dark:text-white">
                                    {selectedEmployees.size}
                                </span>
                            </div>
                            <div className="flex justify-between items-center mt-2">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    إجمالي الصافي:
                                </span>
                                <span className="text-lg font-semibold text-gray-900 dark:text-white">
                                    {calculateTotal().toLocaleString('en-US')} ر.س
                                </span>
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
                                        : 'إنشاء كشف الرواتب'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
