import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import { Plus, Edit, Trash2, X, Save, UserCircle, Search } from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';
import { showSuccess, showError, showConfirm, showWarning } from '@/lib/toast';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import ModalOverlay from '@/components/ui/ModalOverlay';

const employeeSchema = z.object({
  name: z.string().min(1, 'الاسم مطلوب'),
  department: z.string().optional(),
  start_date: z.string().optional(),
  base_salary: z.number().min(0, 'الراتب الأساسي يجب أن يكون أكبر من أو يساوي صفر'),
  allowances: z.number().min(0, 'البدلات يجب أن تكون أكبر من أو يساوي صفر'),
  status: z.enum(['active', 'inactive']),
});

type EmployeeFormData = z.infer<typeof employeeSchema>;


interface Employee {
  id: string;
  name: string;
  department: string;
  startDate: string;
  baseSalary: number;
  allowances: number;
  status: string;
}

export default function EmployeeManagement() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(false);
  const { canCreate, canEdit, canDelete, requirePermission } = usePermissions();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      base_salary: 0,
      allowances: 0,
      status: 'active',
    },
  });

  useEffect(() => {
    loadEmployees();
  }, []);

  // Filter employees based on search term
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredEmployees(employees);
    } else {
      const filtered = employees.filter((emp) =>
        emp.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredEmployees(filtered);
    }
  }, [searchTerm, employees]);

  const loadEmployees = async () => {
    try {
      const response = await apiClient.getEmployees();

      // API returns { data: [], meta: {} } format
      const employeesData = response.data || response;
      setEmployees(Array.isArray(employeesData) ? employeesData : []);
    } catch (error) {
      console.error('Error loading employees:', error);
      setEmployees([]);
    }
  };

  const onSubmit = async (data: EmployeeFormData) => {
    try {
      setLoading(true);

      // Check for duplicate employee name (only when creating new)
      if (!editingEmployee) {
        const duplicate = employees.find(
          (emp) => emp.name.toLowerCase() === data.name.toLowerCase()
        );
        if (duplicate) {
          showWarning('موظف بهذا الاسم موجود مسبقاً');
          setLoading(false);
          return;
        }
      }

      if (editingEmployee) {
        await apiClient.updateEmployee(editingEmployee.id, {
          name: data.name,
          department: data.department || null,
          startDate: data.start_date,
          baseSalary: data.base_salary,
          allowances: data.allowances,
          status: data.status.toUpperCase(), // Convert to ACTIVE/INACTIVE
        });
        showSuccess('تم تحديث الموظف بنجاح');
      } else {
        await apiClient.createEmployee({
          name: data.name,
          department: data.department || null,
          startDate: data.start_date,
          baseSalary: data.base_salary,
          allowances: data.allowances,
          status: data.status.toUpperCase(), // Convert to ACTIVE/INACTIVE
        });
        showSuccess('تم إضافة الموظف بنجاح');
      }

      setShowModal(false);
      setEditingEmployee(null);
      reset();
      loadEmployees();
    } catch (error: any) {
      console.error('Error saving employee:', error);
      console.error('Error response:', error.response?.data);
      console.error('Validation errors:', JSON.stringify(error.response?.data?.message, null, 2));
      showError('حدث خطأ أثناء حفظ الموظف');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (employee: Employee) => {
    if (!requirePermission('employees.edit')) return;
    setEditingEmployee(employee);
    reset({
      name: employee.name,
      department: employee.department || '',
      start_date: employee.startDate ? employee.startDate.split('T')[0] : '',
      base_salary: parseFloat(String(employee.baseSalary)),
      allowances: parseFloat(String(employee.allowances)),
      status: employee.status.toLowerCase() as 'active' | 'inactive',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!requirePermission('employees.delete')) return;
    showConfirm(
      'هل أنت متأكد من حذف هذا الموظف؟',
      async () => {
        try {
          await apiClient.deleteEmployee(id);
          showSuccess('تم حذف الموظف بنجاح');
          loadEmployees();
        } catch (error) {
          console.error('Error deleting employee:', error);
          showError('حدث خطأ أثناء حذف الموظف');
        }
      }
    );
  };

  const openNewEmployeeModal = () => {
    setEditingEmployee(null);
    reset({
      base_salary: 0,
      allowances: 0,
      status: 'active',
    });
    setShowModal(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          إدارة الموظفين
        </h3>
        {canCreate('employees') && (
          <button
            onClick={openNewEmployeeModal}
            className="btn-primary"
          >
            <Plus className="w-5 h-5" />
            إضافة موظف
          </button>
        )}
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="البحث عن موظف بالاسم..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pr-10 pl-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
        />
      </div>


      {employees.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12">
          <div className="text-center">
            <UserCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400">لا يوجد موظفين</p>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                    اسم الموظف
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                    القسم
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                    تاريخ بدء العمل
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                    الراتب الأساسي
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                    البدلات
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                    إجمالي الراتب
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                    الحالة
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                    الإجراءات
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredEmployees.map((employee) => {
                  const totalSalary =
                    parseFloat(String(employee.baseSalary)) +
                    parseFloat(String(employee.allowances));

                  return (
                    <tr key={employee.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white font-medium">
                        {employee.name}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {employee.department || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {employee.startDate ? new Date(employee.startDate).toLocaleDateString('en-GB') : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                        SAR {parseFloat(String(employee.baseSalary)).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-sm text-green-600 dark:text-green-400">
                        SAR {parseFloat(String(employee.allowances)).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-blue-600 dark:text-blue-400">
                        SAR {totalSalary.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span
                          className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${employee.status === 'ACTIVE' || employee.status === 'active'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                            }`}
                        >
                          {employee.status === 'ACTIVE' || employee.status === 'active' ? 'نشط' : 'غير نشط'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {canEdit('employees') && (
                            <button
                              onClick={() => handleEdit(employee)}
                              className="btn-icon"
                              title="تعديل"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          )}
                          {canDelete('employees') && (
                            <button
                              onClick={() => handleDelete(employee.id)}
                              className="btn-icon-danger"
                              title="حذف"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <ModalOverlay>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {editingEmployee ? 'تعديل موظف' : 'إضافة موظف جديد'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
              {/* Row 1: Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  الاسم <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  {...register('name')}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
                {errors.name && (
                  <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
                )}
              </div>

              {/* Row 2: Department + Start Date */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    القسم
                  </label>
                  <input
                    type="text"
                    {...register('department')}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    تاريخ بدء العمل
                  </label>
                  <input
                    type="date"
                    {...register('start_date')}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                  {errors.start_date && (
                    <p className="text-red-500 text-sm mt-1">{errors.start_date.message}</p>
                  )}
                </div>
              </div>

              {/* Row 3: Base Salary + Allowances */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    الراتب الأساسي <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    {...register('base_salary', { valueAsNumber: true })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                  {errors.base_salary && (
                    <p className="text-red-500 text-sm mt-1">{errors.base_salary.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    البدلات
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    {...register('allowances', { valueAsNumber: true })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>

              {/* Row 4: Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  الحالة <span className="text-red-500">*</span>
                </label>
                <select
                  {...register('status')}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="active">نشط</option>
                  <option value="inactive">غير نشط</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="w-4 h-4" />
                  {loading ? 'جاري الحفظ...' : editingEmployee ? 'تحديث' : 'حفظ'}
                </button>
              </div>
            </form>
          </div>
        </ModalOverlay>
      )}
    </div>
  );
}