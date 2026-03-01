import { useState, useEffect, useRef } from 'react';
import { Plus, Search, Edit2, Loader2, X, Power, ChevronDown, Trash2, Users } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiClient } from '@/lib/api';
import { showSuccess, showError, showConfirm } from '@/lib/toast';
import { useScrollLock } from '@/hooks/useScrollLock';
import { Protected } from '@/components/permissions/Protected';
import Pagination from '@/components/ui/Pagination';
import ModalOverlay from '@/components/ui/ModalOverlay';
import CustomerGroupsTab from '@/components/CustomerGroupsTab';
import { motion } from 'framer-motion';

const customerSchema = z.object({
  name: z.string().min(1, 'اسم العميل مطلوب'),
  phone: z.string().optional(),
  email: z.string().email('البريد الإلكتروني غير صحيح').optional().or(z.literal('')),
  address: z.string().optional(),
  type: z.enum(['EXPORT', 'IMPORT', 'TRANSIT', 'FREE']).nullable().optional(),
  openingBalance: z.any().transform((val) => Number(val) || 0).optional(),
  openingSide: z.enum(['DEBIT', 'CREDIT']).nullable().optional(),
});

type CustomerForm = z.infer<typeof customerSchema>;

interface Customer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  type: 'EXPORT' | 'IMPORT' | 'TRANSIT' | 'FREE' | null;
  openingBalance: number;
  openingSide: 'DEBIT' | 'CREDIT' | null;
  isActive: boolean;
}

const customerTypes = [
  { value: 'EXPORT', label: 'صادر' },
  { value: 'IMPORT', label: 'استيراد' },
  { value: 'TRANSIT', label: 'ترانزيت' },
  { value: 'FREE', label: 'حر' },
];

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState({
    total: 0,
    export: 0,
    import: 0,
    transit: 0,
    free: 0,
  });
  const [filterType, setFilterType] = useState<string>('ALL');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'customers' | 'groups'>('customers');
  const itemsPerPage = 10;

  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
  const [isOpeningSideDropdownOpen, setIsOpeningSideDropdownOpen] = useState(false);
  const typeDropdownRef = useRef<HTMLDivElement>(null);
  const openingSideDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (typeDropdownRef.current && !typeDropdownRef.current.contains(event.target as Node)) {
        setIsTypeDropdownOpen(false);
      }
      if (openingSideDropdownRef.current && !openingSideDropdownRef.current.contains(event.target as Node)) {
        setIsOpeningSideDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);


  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CustomerForm>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      openingBalance: 0,
      openingSide: 'DEBIT',
    },
  });

  useEffect(() => {
    fetchCustomers();
    fetchStats();
  }, [currentPage, searchQuery, filterType]);

  // Lock body scroll when form is open
  useScrollLock(showForm);

  const fetchCustomers = async () => {
    try {
      setLoading(true);

      // Determine query parameters based on filter
      let activeStatus: 'active' | 'inactive' | 'all' | undefined = undefined;
      let type = undefined;

      if (filterType === 'ACTIVE') {
        activeStatus = 'active';
      } else if (filterType === 'INACTIVE') {
        activeStatus = 'inactive';
      } else if (filterType === 'ALL') {
        activeStatus = 'all';
      } else if (['EXPORT', 'IMPORT', 'TRANSIT', 'FREE'].includes(filterType)) {
        type = filterType;
        activeStatus = 'all';
      }

      const response = await apiClient.getCustomers({
        page: currentPage,
        limit: itemsPerPage,
        q: searchQuery || undefined,
        type,
        activeStatus,
      });

      setCustomers(response.data);
      setTotalPages(response.meta.totalPages);
    } catch (error: any) {
      console.error('Error fetching customers:', error);
      showError(error.response?.data?.message || 'حدث خطأ في تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const data = await apiClient.getCustomerStats();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const onSubmit = async (data: CustomerForm) => {
    try {
      setSubmitting(true);

      if (editingId) {
        // For update, exclude opening balance and type fields
        const updateData = {
          name: data.name,
          phone: data.phone || null,
          email: data.email || null,
          address: data.address || null,
        };
        await apiClient.updateCustomer(editingId, updateData);
        showSuccess('تم تحديث بيانات العميل بنجاح');
      } else {
        // For create, include all fields
        const createData = {
          name: data.name,
          phone: data.phone || undefined,
          email: data.email || undefined,
          address: data.address || undefined,
          type: data.type || undefined,
          openingBalance: data.openingBalance || undefined,
          openingSide: data.openingBalance ? (data.openingSide || 'DEBIT') : undefined,
        };
        await apiClient.createCustomer(createData);
        showSuccess('تم إضافة العميل بنجاح');
      }

      setShowForm(false);
      setEditingId(null);
      reset();
      fetchCustomers();
      fetchStats();
    } catch (error: any) {
      console.error('Error saving customer:', error);
      const message = error.response?.data?.message || 'حدث خطأ أثناء حفظ البيانات';
      showError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (customer: Customer) => {
    setEditingId(customer.id);
    setValue('name', customer.name);
    setValue('phone', customer.phone || '');
    setValue('email', customer.email || '');
    setValue('address', customer.address || '');
    setValue('type', customer.type);
    setValue('openingBalance', customer.openingBalance);
    setValue('openingSide', customer.openingSide);
    setIsTypeDropdownOpen(false);
    setIsOpeningSideDropdownOpen(false);
    setShowForm(true);
  };

  const handleToggleStatus = async (customer: Customer) => {
    const action = customer.isActive ? 'تعطيل' : 'تفعيل';
    const message = customer.isActive
      ? 'هل أنت متأكد من تعطيل هذا العميل؟\nلن تتمكن من إنشاء فواتير جديدة له ولكن ستبقى الفواتير القديمة.'
      : 'هل أنت متأكد من تفعيل هذا العميل؟';

    showConfirm(
      message,
      async () => {
        try {
          await apiClient.toggleCustomerStatus(customer.id);
          showSuccess(`تم ${action} العميل بنجاح`);
          fetchCustomers();
          fetchStats();
        } catch (error: any) {
          console.error('Error toggling customer status:', error);
          const errorMessage = error.response?.data?.message || `حدث خطأ أثناء ${action} العميل`;
          showError(errorMessage);
        }
      }
    );
  };

  const handleDelete = (customer: Customer) => {
    showConfirm(
      `هل أنت متأكد من حذف العميل "${customer.name}"؟\nسيتم حذف العميل بشكل نهائي.`,
      async () => {
        try {
          await apiClient.deleteCustomer(customer.id);
          showSuccess('تم حذف العميل بنجاح');
          fetchCustomers();
          fetchStats();
        } catch (error: any) {
          console.error('Error deleting customer:', error);
          const errorMessage = error.response?.data?.message || 'حدث خطأ أثناء حذف العميل';
          showError(errorMessage);
        }
      }
    );
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingId(null);
    reset();
    setIsTypeDropdownOpen(false);
    setIsOpeningSideDropdownOpen(false);
  };

  const statsDisplay = [
    { label: 'إجمالي العملاء', value: stats.total, color: 'bg-blue-500' },
    { label: 'عملاء صادر', value: stats.export, color: 'bg-green-500' },
    { label: 'عملاء استيراد', value: stats.import, color: 'bg-purple-500' },
    { label: 'عملاء ترانزيت', value: stats.transit, color: 'bg-yellow-500' },
    { label: 'عملاء حر', value: stats.free, color: 'bg-orange-500' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">العملاء</h1>
          <p className="text-gray-600 dark:text-gray-400">إدارة بيانات العملاء والمجموعات</p>
        </div>
        {activeTab === 'customers' && (
          <Protected permission="customers.create">
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span>إضافة عميل جديد</span>
            </button>
          </Protected>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('customers')}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'customers'
            ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
        >
          العملاء
        </button>
        <button
          onClick={() => setActiveTab('groups')}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${activeTab === 'groups'
            ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
        >
          <Users className="w-4 h-4" />
          المجموعات
        </button>
      </div>

      {activeTab === 'groups' ? (
        <CustomerGroupsTab />
      ) : (
        <>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {statsDisplay.map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4"
              >
                <div className={`w-10 h-10 ${stat.color} rounded-lg flex items-center justify-center mb-3`}>
                  <span className="text-white font-bold text-lg">{stat.value}</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">{stat.label}</p>
              </motion.div>
            ))}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex gap-3">
                {/* Search Bar */}
                <div className="relative flex-1">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="البحث عن عميل..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full pr-10 pl-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:text-white transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  />
                </div>


                {/* Custom Filter Dropdown */}
                <div className="relative min-w-[140px]">
                  <button
                    type="button"
                    onClick={() => setIsFilterOpen(!isFilterOpen)}
                    className="w-full px-4 py-2.5 pr-10 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-gray-900 dark:text-white cursor-pointer text-right transition-all"
                  >
                    {filterType === 'ALL' ? 'كل العملاء' :
                      filterType === 'ACTIVE' ? 'مفعل' :
                        filterType === 'INACTIVE' ? 'معطل' :
                          filterType === 'EXPORT' ? 'صادر' :
                            filterType === 'IMPORT' ? 'استيراد' :
                              filterType === 'TRANSIT' ? 'ترانزيت' : 'حر'}
                  </button>
                  <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />

                  {isFilterOpen && (
                    <>
                      {/* Backdrop to close on click outside */}
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsFilterOpen(false)}
                      />

                      {/* Dropdown Menu */}
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-20 overflow-hidden">
                        <div className="max-h-[160px] overflow-y-auto scrollbar-thin">
                          {[
                            { value: 'ALL', label: 'كل العملاء' },
                            { value: 'ACTIVE', label: 'مفعل' },
                            { value: 'INACTIVE', label: 'معطل' },
                            { value: 'EXPORT', label: 'صادر' },
                            { value: 'IMPORT', label: 'استيراد' },
                            { value: 'TRANSIT', label: 'ترانزيت' },
                            { value: 'FREE', label: 'حر' },
                          ].map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => {
                                setFilterType(option.value);
                                setCurrentPage(1);
                                setIsFilterOpen(false);
                              }}
                              className={`w-full px-4 py-2 text-right hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors ${filterType === option.value ? 'bg-gray-100 dark:bg-gray-600 font-medium' : ''
                                }`}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>



            <div className="overflow-x-auto">
              {loading ? (
                <div className="p-8 text-center">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary-600" />
                </div>
              ) : customers.length === 0 ? (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                  لا توجد بيانات
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        الاسم
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        الجوال
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        البريد
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        النوع
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        الرصيد الافتتاحي
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        الإجراءات
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {customers.map((customer, index) => (
                      <motion.tr
                        key={customer.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.3, delay: Math.min(index * 0.05, 0.3) }}
                        className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${!customer.isActive ? 'bg-gray-50 dark:bg-gray-800/50' : ''
                          }`}
                      >
                        <td className={`px-6 py-4 text-sm text-gray-900 dark:text-white ${!customer.isActive ? 'opacity-50' : ''
                          }`}>
                          {customer.name}
                        </td>
                        <td className={`px-6 py-4 text-sm text-gray-600 dark:text-gray-400 ${!customer.isActive ? 'opacity-50' : ''
                          }`}>
                          {customer.phone || '-'}
                        </td>
                        <td className={`px-6 py-4 text-sm text-gray-600 dark:text-gray-400 ${!customer.isActive ? 'opacity-50' : ''
                          }`}>
                          {customer.email || '-'}
                        </td>
                        <td className={`px-6 py-4 text-sm ${!customer.isActive ? 'opacity-50' : ''
                          }`}>
                          {customer.type ? (
                            <span className={`px-2 py-1 text-xs rounded-full ${customer.type === 'EXPORT' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                              customer.type === 'IMPORT' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300' :
                                customer.type === 'TRANSIT' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' :
                                  'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300'
                              }`}>
                              {customerTypes.find((t) => t.value === customer.type)?.label}
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className={`px-6 py-4 text-sm text-gray-600 dark:text-gray-400 ${!customer.isActive ? 'opacity-50' : ''
                          }`}>
                          {customer.openingBalance && parseFloat(String(customer.openingBalance)) > 0
                            ? `${parseFloat(String(customer.openingBalance)).toFixed(2)} ${customer.openingSide === 'DEBIT' ? 'مدين' : 'دائن'
                            }`
                            : '-'}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div className="flex items-center gap-2">
                            {/* Requirement 2.5: Edit permission */}
                            <Protected permission="customers.edit">
                              <button
                                onClick={() => handleEdit(customer)}
                                className="p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                                title="تعديل العميل"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                            </Protected>
                            {/* Requirement 2.7: Activate/Deactivate permission */}
                            <Protected permission="customers.activate_deactivate">
                              <button
                                onClick={() => handleToggleStatus(customer)}
                                className={`p-1 rounded transition-colors ${customer.isActive
                                  ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20'
                                  : 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'
                                  }`}
                                title={customer.isActive ? 'تعطيل العميل' : 'تفعيل العميل'}
                              >
                                <Power className="w-4 h-4" />
                              </button>
                            </Protected>
                            {/* Delete permission */}
                            <Protected permission="customers.delete">
                              <button
                                onClick={() => handleDelete(customer)}
                                className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                title="حذف العميل"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </Protected>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              pageSize={itemsPerPage}
              onPageChange={setCurrentPage}
            />
          </div>

          {
            showForm && (
              <ModalOverlay>
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto scrollbar-thin">
                  <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                      {editingId ? 'تعديل عميل' : 'إضافة عميل جديد'}
                    </h2>
                    <button
                      onClick={handleCloseForm}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
                    {/* First Row: Name and Type */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                          اسم العميل <span className="text-red-500">*</span>
                        </label>
                        <input
                          {...register('name')}
                          type="text"
                          className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:text-white transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500"
                          placeholder="أدخل اسم العميل"
                        />
                        {errors.name && (
                          <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
                        )}
                      </div>

                      <div ref={typeDropdownRef} className="relative">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                          النوع <span className="text-red-500">*</span>
                        </label>
                        <button
                          type="button"
                          disabled={!!editingId}
                          onClick={() => !editingId && setIsTypeDropdownOpen(!isTypeDropdownOpen)}
                          className={`w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border rounded-xl text-right transition-all duration-200
                      ${isTypeDropdownOpen
                              ? 'border-blue-500 ring-2 ring-blue-500/20'
                              : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                            }
                      ${!!editingId ? 'opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-800' : ''}
                      text-gray-900 dark:text-white`}
                        >
                          <span className={!watch('type') ? 'text-gray-400' : ''}>
                            {customerTypes.find(t => t.value === watch('type'))?.label || 'اختر النوع'}
                          </span>
                          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isTypeDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {/* Hidden Select for Form Data */}
                        <select {...register('type')} className="hidden">
                          <option value="">اختر النوع</option>
                          {customerTypes.map((type) => (
                            <option key={type.value} value={type.value}>{type.label}</option>
                          ))}
                        </select>

                        {isTypeDropdownOpen && !editingId && (
                          <div className="absolute z-50 mt-1.5 w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl shadow-xl shadow-black/10 dark:shadow-black/30 overflow-hidden"
                            style={{ animation: 'dropdownIn 0.15s ease-out' }}
                          >
                            <ul className="py-1">
                              {customerTypes.map((type) => (
                                <li key={type.value}>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setValue('type', type.value as any);
                                      setIsTypeDropdownOpen(false);
                                    }}
                                    className="w-full text-right px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600/50 transition-colors flex items-center justify-between group"
                                  >
                                    <span>{type.label}</span>
                                    {/* Optional: Checkmark if selected */}
                                  </button>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Second Row: Phone and Email */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                          الجوال
                        </label>
                        <input
                          {...register('phone')}
                          type="text"
                          className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:text-white transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500"
                          placeholder="رقم الجوال"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                          البريد الإلكتروني
                        </label>
                        <input
                          {...register('email')}
                          type="email"
                          className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:text-white transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500"
                          placeholder="example@email.com"
                        />
                        {errors.email && (
                          <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
                        )}
                      </div>
                    </div>

                    {/* Address */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        العنوان
                      </label>
                      <textarea
                        {...register('address')}
                        rows={2}
                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:text-white transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500 resize-none"
                        placeholder="عنوان العميل"
                      />
                    </div>

                    {/* Opening Balance */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                          الرصيد الافتتاحي
                        </label>
                        <input
                          {...register('openingBalance', { valueAsNumber: true })}
                          type="number"
                          step="0.01"
                          disabled={!!editingId}
                          className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:text-white transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-100 dark:disabled:bg-gray-800"
                          placeholder="0.00"
                        />
                      </div>

                      <div ref={openingSideDropdownRef} className="relative">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                          نوع الرصيد
                        </label>
                        <button
                          type="button"
                          disabled={!!editingId}
                          onClick={() => !editingId && setIsOpeningSideDropdownOpen(!isOpeningSideDropdownOpen)}
                          className={`w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border rounded-xl text-right transition-all duration-200
                      ${isOpeningSideDropdownOpen
                              ? 'border-blue-500 ring-2 ring-blue-500/20'
                              : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                            }
                      ${!!editingId ? 'opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-800' : ''}
                      text-gray-900 dark:text-white`}
                        >
                          <span>
                            {watch('openingSide') === 'CREDIT' ? 'دائن' : 'مدين'}
                          </span>
                          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpeningSideDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {/* Hidden Select for Form Data */}
                        <select {...register('openingSide')} className="hidden">
                          <option value="DEBIT">مدين</option>
                          <option value="CREDIT">دائن</option>
                        </select>

                        {isOpeningSideDropdownOpen && !editingId && (
                          <div className="absolute z-50 mt-1.5 w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl shadow-xl shadow-black/10 dark:shadow-black/30 overflow-hidden"
                            style={{ animation: 'dropdownIn 0.15s ease-out' }}
                          >
                            <ul className="py-1">
                              {[
                                { value: 'DEBIT', label: 'مدين' },
                                { value: 'CREDIT', label: 'دائن' }
                              ].map((option) => (
                                <li key={option.value}>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setValue('openingSide', option.value as any);
                                      setIsOpeningSideDropdownOpen(false);
                                    }}
                                    className="w-full text-right px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600/50 transition-colors"
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

                    <div className="flex gap-3 pt-4">
                      <button
                        type="submit"
                        disabled={submitting}
                        className="flex-1 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                      >
                        {submitting ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span>جاري الحفظ...</span>
                          </>
                        ) : (
                          <span>{editingId ? 'تحديث' : 'حفظ'}</span>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={handleCloseForm}
                        className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        إلغاء
                      </button>
                    </div>
                  </form>
                </div>
              </ModalOverlay>
            )}
        </>
      )}
    </div>
  );
}