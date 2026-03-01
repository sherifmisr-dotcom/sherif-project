import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiClient } from '@/lib/api';
import { Plus, Trash2, Save, X, Edit, Ship, Search, ChevronDown, Eye, Calendar, DollarSign, FileText } from 'lucide-react';
import { format, startOfMonth } from 'date-fns';
import { ar } from 'date-fns/locale';
import { usePermissions } from '@/hooks/usePermissions';
import { showSuccess, showError, showConfirm } from '@/lib/toast';
import { useScrollLock } from '@/hooks/useScrollLock';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import ModalOverlay from '@/components/ui/ModalOverlay';
import Pagination from '@/components/ui/Pagination';
import { motion } from 'framer-motion';

const feeSchema = z.object({
  agent_id: z.string().min(1, 'يجب اختيار الوكيل'),
  vessel_id: z.string().min(1, 'يجب اختيار العبارة'),
  trip_number: z.string().optional(),
  date: z.string().min(1, 'التاريخ مطلوب'),
  fee_type: z.string().min(1, 'نوع الرسوم مطلوب'),
  quantity: z.number().min(1, 'عدد الشاحنات يجب أن يكون أكبر من صفر').optional(),
  amount: z.number().min(0.01, 'المبلغ يجب أن يكون أكبر من صفر'),
  bill_number: z.string().optional(),
  details: z.string().optional(),
});

type FeeFormData = z.infer<typeof feeSchema>;

interface Agent {
  id: string;
  name: string;
}

interface Vessel {
  id: string;
  name: string;
}

interface AdditionalFee {
  id: string;
  agentId: string;
  vesselId?: string;
  date: string;
  feeType: string;
  quantity: number;
  amount: number;
  policyNo?: string;
  tripNumber?: string;
  details?: string;
  agent?: { name: string };
  vessel?: { name: string };
  createdAt?: string; // Added createdAt
}

export default function AdditionalFees() {
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [vessels, setVessels] = useState<Vessel[]>([]);
  const [fees, setFees] = useState<AdditionalFee[]>([]);
  const [editingFee, setEditingFee] = useState<AdditionalFee | null>(null);
  const [viewFee, setViewFee] = useState<AdditionalFee | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState({
    start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  });

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };
  const { canCreate, canEdit, canDelete, requirePermission } = usePermissions();
  const SCREEN = 'shipping_agents.fees';

  // Dropdown states
  const [isAgentDropdownOpen, setIsAgentDropdownOpen] = useState(false);
  const [agentSearch, setAgentSearch] = useState('');
  const [isVesselDropdownOpen, setIsVesselDropdownOpen] = useState(false);
  const [vesselSearch, setVesselSearch] = useState('');

  const agentDropdownRef = useRef<HTMLDivElement>(null);
  const vesselDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (agentDropdownRef.current && !agentDropdownRef.current.contains(event.target as Node)) {
        setIsAgentDropdownOpen(false);
      }
      if (vesselDropdownRef.current && !vesselDropdownRef.current.contains(event.target as Node)) {
        setIsVesselDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredAgents = agents.filter(agent =>
    agent.name.toLowerCase().includes(agentSearch.toLowerCase())
  );

  const filteredVessels = vessels.filter(vessel =>
    vessel.name.toLowerCase().includes(vesselSearch.toLowerCase())
  );

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors },
  } = useForm<FeeFormData>({
    resolver: zodResolver(feeSchema),
    defaultValues: {
      date: format(new Date(), 'yyyy-MM-dd'),
      quantity: 1,
      amount: 0,
    },
  });

  const selectedAgentId = watch('agent_id');

  useEffect(() => {
    loadAgents();
    loadFees();
  }, []);

  useScrollLock(showModal);

  useEffect(() => {
    if (selectedAgentId) {
      loadVessels(selectedAgentId);
    } else {
      setVessels([]);
      setValue('vessel_id', '');
    }
  }, [selectedAgentId]);

  const loadAgents = async () => {
    try {
      const response = await apiClient.getAgents();
      if (response.data) {
        setAgents(response.data);
      }
    } catch (error) {
      console.error('Error loading agents:', error);
    }
  };

  const loadVessels = async (agentId: string) => {
    try {
      const agentData = await apiClient.getAgent(agentId);
      if (agentData.vessels && Array.isArray(agentData.vessels)) {
        // Vessels come as objects with {id, agentId, name, createdAt}
        setVessels(agentData.vessels);
      } else {
        setVessels([]);
      }
    } catch (error) {
      console.error('Error loading vessels:', error);
      setVessels([]);
    }
  };

  const loadFees = async () => {
    try {
      const response = await apiClient.getFees();
      if (response.data) {
        setFees(response.data);
      }
    } catch (error) {
      console.error('Error loading fees:', error);
    }
  };

  const onSubmit = async (data: FeeFormData) => {
    try {
      setLoading(true);

      const feeData = {
        agentId: data.agent_id,
        vesselId: data.vessel_id,
        tripNumber: data.trip_number || undefined,
        date: data.date,
        feeType: data.fee_type,
        quantity: data.quantity,
        amount: data.amount,
        policyNo: data.bill_number || undefined,
        details: data.details || undefined,
      };



      if (editingFee) {
        const { agentId, ...updateData } = feeData;
        await apiClient.updateFee(editingFee.id, updateData);
        showSuccess('تم تحديث الرسوم بنجاح');
      } else {
        await apiClient.createFee(feeData);
        showSuccess('تم تسجيل الرسوم بنجاح');
      }

      setShowModal(false);
      setEditingFee(null);
      reset();
      setAgentSearch('');
      setVesselSearch('');
      loadFees();
    } catch (error: any) {
      console.error('Error saving fee:', error);
      console.error('Error response:', error.response?.data);
      const errorMsg = error.response?.data?.message;
      const displayMsg = Array.isArray(errorMsg) ? errorMsg.join(', ') : errorMsg || error.message;
      showError(`حدث خطأ أثناء حفظ الرسوم: ${displayMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (fee: AdditionalFee) => {
    if (!requirePermission('shipping_agents.fees.edit')) return;
    setEditingFee(fee);

    // Load vessels for the agent
    if (fee.agentId) {
      await loadVessels(fee.agentId);
    }

    reset({
      agent_id: fee.agentId || '',
      vessel_id: fee.vesselId || '',
      trip_number: '',
      date: fee.date,
      fee_type: fee.feeType,
      quantity: fee.quantity || 1,
      amount: parseFloat(String(fee.amount)),
      bill_number: fee.policyNo || '',
      details: fee.details || '',
    });

    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!requirePermission('shipping_agents.fees.delete')) return;

    showConfirm(
      'هل أنت متأكد من حذف هذه الرسوم؟',
      async () => {
        try {
          await apiClient.deleteFee(id);
          showSuccess('تم حذف الرسوم بنجاح');
          loadFees();
        } catch (error) {
          showError('حدث خطأ أثناء حذف الرسوم');
        }
      }
    );
  };

  const openNewFeeModal = () => {
    setEditingFee(null);
    reset({
      date: format(new Date(), 'yyyy-MM-dd'),
      quantity: 1,
      amount: 0,
    });
    setAgentSearch('');
    setVesselSearch('');
    setShowModal(true);
  };

  const filteredFees = fees.filter(fee => {
    const searchString = searchTerm.toLowerCase();
    const matchSearch = searchTerm === '' ||
      (fee.agent?.name?.toLowerCase() || '').includes(searchString) ||
      (fee.tripNumber?.toLowerCase() || '').includes(searchString) ||
      (fee.feeType?.toLowerCase() || '').includes(searchString);

    if (!matchSearch) return false;

    if (dateRange.start && dateRange.end) {
      const feeDate = new Date(fee.date);
      feeDate.setHours(0, 0, 0, 0);
      const start = new Date(dateRange.start);
      start.setHours(0, 0, 0, 0);
      const end = new Date(dateRange.end);
      end.setHours(23, 59, 59, 999);

      if (feeDate < start || feeDate > end) {
        return false;
      }
    }

    return true;
  });

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 px-3 py-2 md:px-6 md:py-3 flex flex-col md:flex-row items-start md:items-center justify-between gap-2">
        <Breadcrumb
          items={[
            { label: 'الوكلاء الملاحيين', path: '/agents' },
            { label: 'رسوم إضافية' }
          ]}
        />
        {canCreate(SCREEN) && (
          <button
            onClick={openNewFeeModal}
            className="flex items-center gap-1.5 md:gap-2 px-3 py-1.5 md:px-6 md:py-2 md:h-10 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm md:text-base w-full md:w-auto justify-center"
          >
            <Plus className="w-4 h-4 md:w-5 md:h-5" />
            تسجيل رسوم جديدة
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col md:flex-row gap-3 md:gap-4 items-stretch md:items-center">
          <div className="flex-1 relative w-full">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-gray-400" />
            <input
              type="text"
              placeholder="بحث باسم الوكيل، رقم الرحلة، أو نوع الرسوم..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-4 pr-10 py-1.5 md:py-2 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-teal-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-sm"
            />
          </div>
          <div className="flex items-center gap-1.5 md:gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:flex-none">
              <Calendar className="absolute right-2 md:right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 md:w-4 md:h-4 text-gray-400" />
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="w-full md:w-auto pl-2 md:pl-4 pr-7 md:pr-9 py-1.5 md:py-2 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-teal-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-xs md:text-sm"
              />
            </div>
            <span className="text-gray-500 dark:text-gray-400 text-xs md:text-sm flex-shrink-0">إلى</span>
            <div className="relative flex-1 md:flex-none">
              <Calendar className="absolute right-2 md:right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 md:w-4 md:h-4 text-gray-400" />
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="w-full md:w-auto pl-2 md:pl-4 pr-7 md:pr-9 py-1.5 md:py-2 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-teal-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-xs md:text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                  الوكيل
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                  التاريخ
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                  العبارة
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                  رقم الرحلة
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                  نوع الرسوم
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                  عدد الشاحنات
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                  المبلغ
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                  الإجراءات
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredFees.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((fee, index) => (
                <motion.tr
                  key={fee.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3, delay: Math.min(index * 0.05, 0.3) }}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                >
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                    {fee.agent?.name}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                    {format(new Date(fee.date), 'dd/MM/yyyy')}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex items-center gap-2">
                      <Ship className="w-4 h-4" />
                      {fee.vessel?.name || 'غير محدد'}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                    {fee.tripNumber || '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                    {fee.feeType}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                    {fee.quantity || 1}
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white">
                    {parseFloat(String(fee.amount || 0)).toFixed(2)} ريال
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setViewFee(fee)}
                        className="btn-icon"
                        title="عرض التفاصيل"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {canEdit(SCREEN) && (
                        <button
                          onClick={() => handleEdit(fee)}
                          className="btn-icon"
                          title="تعديل"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      )}
                      {canDelete(SCREEN) && (
                        <button
                          onClick={() => handleDelete(fee.id)}
                          className="btn-icon-danger"
                          title="حذف"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <Pagination
          currentPage={currentPage}
          totalItems={filteredFees.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={handlePageSizeChange}
        />
      </div>

      {showModal && (
        <ModalOverlay>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex-none bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {editingFee ? 'تعديل رسوم إضافية' : 'تسجيل رسوم إضافية جديدة'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto scrollbar-thin p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div ref={agentDropdownRef} className="relative">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    الوكيل <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsAgentDropdownOpen(!isAgentDropdownOpen)}
                    className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-right text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:text-white transition-all"
                  >
                    <span className={!selectedAgentId ? 'text-gray-400' : ''}>
                      {agents.find(a => a.id === selectedAgentId)?.name || 'اختر الوكيل'}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isAgentDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  <select {...register('agent_id')} className="hidden">
                    <option value="">اختر الوكيل</option>
                    {agents.map(agent => <option key={agent.id} value={agent.id}>{agent.name}</option>)}
                  </select>

                  {isAgentDropdownOpen && (
                    <div className="absolute z-50 mt-1.5 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl overflow-hidden max-h-60 flex flex-col"
                      style={{ animation: 'dropdownIn 0.15s ease-out' }}
                    >
                      <div className="p-2 border-b border-gray-100 dark:border-gray-700">
                        <div className="relative">
                          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            type="text"
                            value={agentSearch}
                            onChange={(e) => setAgentSearch(e.target.value)}
                            placeholder="بحث..."
                            className="w-full pr-9 pl-3 py-1.5 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:border-blue-500 transition-colors dark:text-white"
                            autoFocus
                          />
                        </div>
                      </div>
                      <div className="overflow-y-auto flex-1 p-1">
                        {filteredAgents.length > 0 ? (
                          filteredAgents.map((agent) => (
                            <button
                              key={agent.id}
                              type="button"
                              onClick={() => {
                                setValue('agent_id', agent.id);
                                setIsAgentDropdownOpen(false);
                                setAgentSearch('');
                              }}
                              className={`w-full text-right px-3 py-2 text-sm rounded-lg transition-colors ${selectedAgentId === agent.id
                                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                                : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                                }`}
                            >
                              {agent.name}
                            </button>
                          ))
                        ) : (
                          <div className="px-3 py-4 text-center text-sm text-gray-400">
                            لا توجد نتائج
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {errors.agent_id && (
                    <p className="text-red-500 text-sm mt-1">{errors.agent_id.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    التاريخ
                  </label>
                  <input
                    type="date"
                    {...register('date')}
                    max={`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:text-white transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  />
                  {errors.date && (
                    <p className="text-red-500 text-sm mt-1">{errors.date.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div ref={vesselDropdownRef} className="relative">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    اسم العبارة
                  </label>
                  <button
                    type="button"
                    disabled={!selectedAgentId}
                    onClick={() => selectedAgentId && setIsVesselDropdownOpen(!isVesselDropdownOpen)}
                    className={`w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-right text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:text-white transition-all ${!selectedAgentId ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                  >
                    <span className={!watch('vessel_id') ? 'text-gray-400' : ''}>
                      {vessels.find(v => v.id === watch('vessel_id'))?.name || 'اختر العبارة'}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isVesselDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  <select {...register('vessel_id')} className="hidden">
                    <option value="">اختر العبارة</option>
                    {vessels.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>

                  {isVesselDropdownOpen && selectedAgentId && (
                    <div className="absolute z-50 mt-1.5 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl overflow-hidden max-h-60 flex flex-col"
                      style={{ animation: 'dropdownIn 0.15s ease-out' }}
                    >
                      <div className="p-2 border-b border-gray-100 dark:border-gray-700">
                        <div className="relative">
                          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            type="text"
                            value={vesselSearch}
                            onChange={(e) => setVesselSearch(e.target.value)}
                            placeholder="بحث..."
                            className="w-full pr-9 pl-3 py-1.5 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:border-blue-500 transition-colors dark:text-white"
                            autoFocus
                          />
                        </div>
                      </div>
                      <div className="overflow-y-auto flex-1 p-1">
                        {filteredVessels.length > 0 ? (
                          filteredVessels.map((vessel) => (
                            <button
                              key={vessel.id}
                              type="button"
                              onClick={() => {
                                setValue('vessel_id', vessel.id);
                                setIsVesselDropdownOpen(false);
                                setVesselSearch('');
                              }}
                              className={`w-full text-right px-3 py-2 text-sm rounded-lg transition-colors ${watch('vessel_id') === vessel.id
                                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                                : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                                }`}
                            >
                              {vessel.name}
                            </button>
                          ))
                        ) : (
                          <div className="px-3 py-4 text-center text-sm text-gray-400">
                            لا توجد نتائج
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {errors.vessel_id && (
                    <p className="text-red-500 text-sm mt-1">{errors.vessel_id.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    رقم الرحلة
                  </label>
                  <input
                    type="text"
                    {...register('trip_number')}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:text-white transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500"
                    placeholder="رقم الرحلة (اختياري)"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    نوع الرسوم <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    {...register('fee_type')}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:text-white transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500"
                    placeholder="مثال: رسوم تحميل وتنزيل"
                  />
                  {errors.fee_type && (
                    <p className="text-red-500 text-sm mt-1">{errors.fee_type.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    عدد الشاحنات <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    {...register('quantity', { valueAsNumber: true })}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:text-white transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  />
                  {errors.quantity && (
                    <p className="text-red-500 text-sm mt-1">{errors.quantity.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    المبلغ <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    {...register('amount', { valueAsNumber: true })}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:text-white transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  />
                  {errors.amount && (
                    <p className="text-red-500 text-sm mt-1">{errors.amount.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    رقم البوليصة
                  </label>
                  <input
                    type="text"
                    {...register('bill_number')}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:text-white transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500"
                    placeholder="رقم البوليصة (اختياري)"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  التفاصيل
                </label>
                <textarea
                  {...register('details')}
                  rows={3}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:text-white transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500 resize-none"
                  placeholder="مثال: رسوم اضافية رحلة العبارة بوسيدون رقم 10"
                />
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary px-6 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="w-4 h-4" />
                  {loading ? 'جاري الحفظ...' : editingFee ? 'تحديث' : 'حفظ'}
                </button>
              </div>
            </form>
          </div>
        </ModalOverlay>
      )}

      {/* View Fee Modal */}
      {viewFee && (
        <ModalOverlay>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                تفاصيل الرسوم الإضافية
              </h2>
              <button
                onClick={() => setViewFee(null)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto max-h-[calc(90vh-80px)] p-6 space-y-6 scrollbar-thin">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">التاريخ</p>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <p className="font-medium text-gray-900 dark:text-white">
                      {format(new Date(viewFee.date), 'dd MMMM yyyy', { locale: ar })}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">المبلغ الإجمالي</p>
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-green-600" />
                    <p className="font-bold text-green-600">
                      {Number(viewFee.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} ريال
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">الوكيل / العبارة</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {viewFee.agent?.name} {viewFee.vessel?.name && `- ${viewFee.vessel.name}`}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">رقم الرحلة</p>
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <p className="font-medium text-blue-600">{viewFee.tripNumber || '-'}</p>
                  </div>
                </div>
              </div>

              {viewFee.details && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">ملاحظات</p>
                  <p className="text-gray-900 dark:text-white">{viewFee.details}</p>
                </div>
              )}

              {/* Fee Details Table (Single Item) */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  بيانات الرسوم
                </h3>
                <div className="border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">
                          نوع الرسوم
                        </th>
                        <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">
                          الكمية
                        </th>
                        <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">
                          المبلغ
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                      <tr className="bg-white dark:bg-gray-800">
                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                          {viewFee.feeType}
                        </td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                          {viewFee.quantity}
                        </td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                          {Number(viewFee.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} ريال
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Created By Footer */}
              {viewFee.createdAt && (
                <div className="text-sm text-gray-500 dark:text-gray-400 text-center">
                  تم الإنشاء في {format(new Date(viewFee.createdAt), 'dd/MM/yyyy HH:mm', { locale: ar })}
                </div>
              )}
            </div>
          </div>
        </ModalOverlay>
      )}
    </div>
  );
}