import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiClient } from '@/lib/api';
import { Plus, Trash2, Save, X, Edit, Ship, ChevronDown, Eye, Calendar, DollarSign, Wallet } from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';
import { showSuccess, showError, showConfirm, showWarning } from '@/lib/toast';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useScrollLock } from '@/hooks/useScrollLock';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import ModalOverlay from '@/components/ui/ModalOverlay';
import { motion } from 'framer-motion';

const agentSchema = z.object({
  name: z.string().min(1, 'اسم الوكيل مطلوب'),
  date: z.string().optional(),
  opening_balance: z.number().min(0, 'الرصيد الافتتاحي يجب أن يكون أكبر من أو يساوي صفر'),
  opening_side: z.enum(['debit', 'credit'], { message: 'يجب تحديد نوع الرصيد' }),
});

type AgentFormData = z.infer<typeof agentSchema>;

interface Vessel {
  id: string;
  name: string;
}

interface Agent {
  id: string;
  name: string;
  openingBalance: number;
  openingSide: string;
  currentBalance: number;
  vessel_count?: number;
  vessels?: string[];
  createdAt?: string;
}

export default function AddAgent() {
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [vessels, setVessels] = useState<Vessel[]>([{ id: crypto.randomUUID(), name: '' }]);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [viewAgent, setViewAgent] = useState<Agent | null>(null);
  const { canCreate, canEdit, canDelete, requirePermission } = usePermissions();
  const SCREEN = 'shipping_agents.agents';

  const [isOpeningSideDropdownOpen, setIsOpeningSideDropdownOpen] = useState(false);
  const openingSideDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
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
    watch,
    setValue,
    formState: { errors },
  } = useForm<AgentFormData>({
    resolver: zodResolver(agentSchema),
    defaultValues: {
      opening_balance: 0,
      opening_side: 'debit',
      date: format(new Date(), 'yyyy-MM-dd'),
    },
  });

  useEffect(() => {
    loadAgents();
  }, []);

  useScrollLock(showModal);

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

  const addVessel = () => {
    setVessels([...vessels, { id: crypto.randomUUID(), name: '' }]);
  };

  const removeVessel = (id: string) => {
    if (vessels.length > 1) {
      setVessels(vessels.filter((v) => v.id !== id));
    }
  };

  const updateVessel = (id: string, name: string) => {
    setVessels(vessels.map((v) => (v.id === id ? { ...v, name } : v)));
  };

  const onSubmit = async (data: AgentFormData) => {
    try {
      setLoading(true);

      const validVessels = vessels
        .map((v) => v.name.trim())
        .filter((name) => name !== '');

      // Validate that at least one vessel is provided
      if (validVessels.length === 0) {
        showWarning('يجب إضافة عبارة واحدة على الأقل');
        setLoading(false);
        return;
      }

      // Check for duplicate vessels
      const uniqueVessels = new Set(validVessels);
      if (uniqueVessels.size !== validVessels.length) {
        showWarning('لا يمكن إضافة نفس اسم العبارة أكثر من مرة');
        setLoading(false);
        return;
      }

      const agentData = {
        name: data.name,
        openingBalance: data.opening_balance,
        openingSide: data.opening_side.toUpperCase(),
        vessels: validVessels,
      };



      if (editingAgent) {
        await apiClient.updateAgent(editingAgent.id, agentData);
        showSuccess('تم تحديث الوكيل بنجاح');
      } else {
        await apiClient.createAgent(agentData);
        showSuccess('تم إضافة الوكيل بنجاح');
      }

      setShowModal(false);
      setIsOpeningSideDropdownOpen(false);
      setEditingAgent(null);
      reset();
      setVessels([{ id: crypto.randomUUID(), name: '' }]);
      loadAgents();
    } catch (error: any) {
      console.error('Error saving agent:', error);
      console.error('Error response:', error.response?.data);
      const errorMsg = error.response?.data?.message;
      const displayMsg = Array.isArray(errorMsg) ? errorMsg.join(', ') : errorMsg || error.message;
      showError(`حدث خطأ أثناء حفظ الوكيل: ${displayMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (agent: Agent) => {
    if (!requirePermission('shipping_agents.agents.edit')) return;
    try {
      const agentData = await apiClient.getAgent(agent.id);

      setEditingAgent(agent);
      reset({
        name: agent.name,
        opening_balance: agent.openingBalance,
        opening_side: (agent.openingSide?.toLowerCase() || 'debit') as 'debit' | 'credit',
        date: format(new Date(), 'yyyy-MM-dd'),
      });

      if (agentData.vessels && agentData.vessels.length > 0) {
        // Convert vessel objects to the format expected by the form
        setVessels(agentData.vessels.map((vessel: any) => ({
          id: vessel.id || crypto.randomUUID(),
          name: vessel.name || vessel
        })));
      } else {
        setVessels([{ id: crypto.randomUUID(), name: '' }]);
      }

      setShowModal(true);
      setIsOpeningSideDropdownOpen(false);
    } catch (error) {
      console.error('Error loading agent:', error);
      showError('حدث خطأ أثناء تحميل بيانات الوكيل');
    }
  };

  const handleDelete = async (id: string) => {
    if (!requirePermission('shipping_agents.agents.delete')) return;

    showConfirm(
      'هل أنت متأكد من حذف هذا الوكيل؟',
      async () => {
        try {
          await apiClient.deleteAgent(id);
          showSuccess('تم حذف الوكيل بنجاح');
          loadAgents();
        } catch (error: any) {
          const message = error.response?.data?.message || 'حدث خطأ أثناء حذف الوكيل';
          showError(message);
        }
      }
    );
  };

  const openNewAgentModal = () => {
    setEditingAgent(null);
    reset({
      opening_balance: 0,
      opening_side: 'debit',
      date: format(new Date(), 'yyyy-MM-dd'),
    });
    setVessels([{ id: crypto.randomUUID(), name: '' }]);
    setShowModal(true);
    setIsOpeningSideDropdownOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 px-3 py-2 md:px-6 md:py-3 flex flex-col md:flex-row items-start md:items-center justify-between gap-2">
        <Breadcrumb
          items={[
            { label: 'الوكلاء الملاحيين', path: '/agents' },
            { label: 'إضافة وكيل' }
          ]}
        />
        {canCreate(SCREEN) && (
          <button
            onClick={openNewAgentModal}
            className="btn-primary px-3 py-1.5 md:px-6 md:py-2 md:h-10 text-sm md:text-base w-full md:w-auto justify-center"
          >
            <Plus className="w-4 h-4 md:w-5 md:h-5" />
            إضافة وكيل جديد
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                  اسم الوكيل
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                  عدد العبارات
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                  الرصيد الافتتاحي
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                  نوع الرصيد
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                  الإجراءات
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {agents.map((agent, index) => (
                <motion.tr
                  key={agent.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3, delay: Math.min(index * 0.05, 0.3) }}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                >
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                    {agent.name}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex items-center gap-2">
                      <Ship className="w-4 h-4" />
                      {agent.vessels?.length || 0}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white">
                    {parseFloat(String(agent.openingBalance || 0)).toFixed(2)} ريال
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${agent.openingSide === 'DEBIT'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                        : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                        }`}
                    >
                      {agent.openingSide === 'DEBIT' ? 'مدين' : 'دائن'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={async () => {
                          try {
                            const agentData = await apiClient.getAgent(agent.id);
                            setViewAgent(agentData);
                          } catch (error) {
                            console.error('Error loading agent details:', error);
                          }
                        }}
                        className="btn-icon"
                        title="عرض التفاصيل"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {canEdit(SCREEN) && (
                        <button
                          onClick={() => handleEdit(agent)}
                          className="btn-icon"
                          title="تعديل"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      )}
                      {canDelete(SCREEN) && (
                        <button
                          onClick={() => handleDelete(agent.id)}
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
      </div>

      {showModal && (
        <ModalOverlay>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex-none bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {editingAgent ? 'تعديل وكيل ملاحي' : 'إضافة وكيل ملاحي جديد'}
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    اسم الوكيل <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    {...register('name')}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:text-white transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500"
                    placeholder="أدخل اسم الوكيل"
                  />
                  {errors.name && (
                    <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    تاريخ الإضافة
                  </label>
                  <input
                    type="date"
                    {...register('date')}
                    max={`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:text-white transition-all"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    أسماء العبارات <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={addVessel}
                    className="flex items-center gap-2 px-3 py-1 text-sm btn-primary"
                  >
                    <Plus className="w-4 h-4" />
                    إضافة عبارة
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 overflow-hidden">
                  {vessels.map((vessel) => (
                    <div key={vessel.id} className="flex gap-1.5 min-w-0">
                      <input
                        type="text"
                        value={vessel.name}
                        onChange={(e) => updateVessel(vessel.id, e.target.value)}
                        placeholder="اسم العبارة"
                        className="min-w-0 flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:text-white transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => removeVessel(vessel.id)}
                        disabled={vessels.length === 1}
                        className="flex-shrink-0 p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-gray-200 dark:border-gray-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    الرصيد الافتتاحي
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    {...register('opening_balance', { valueAsNumber: true })}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:text-white transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500"
                    placeholder="0.00"
                  />
                  {errors.opening_balance && (
                    <p className="text-red-500 text-sm mt-1">{errors.opening_balance.message}</p>
                  )}
                </div>

                <div ref={openingSideDropdownRef} className="relative">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    نوع الرصيد
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsOpeningSideDropdownOpen(!isOpeningSideDropdownOpen)}
                    className={`w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border rounded-xl text-right transition-all duration-200
                      ${isOpeningSideDropdownOpen
                        ? 'border-blue-500 ring-2 ring-blue-500/20'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                      }
                      text-gray-900 dark:text-white`}
                  >
                    <span>
                      {watch('opening_side') === 'credit' ? 'دائن' : 'مدين'}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpeningSideDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  <select {...register('opening_side')} className="hidden">
                    <option value="debit">مدين</option>
                    <option value="credit">دائن</option>
                  </select>

                  {isOpeningSideDropdownOpen && (
                    <div className="absolute z-50 mt-1.5 w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl shadow-xl shadow-black/10 dark:shadow-black/30 overflow-hidden"
                      style={{ animation: 'dropdownIn 0.15s ease-out' }}
                    >
                      <ul className="py-1">
                        {[
                          { value: 'debit', label: 'مدين' },
                          { value: 'credit', label: 'دائن' }
                        ].map((option) => (
                          <li key={option.value}>
                            <button
                              type="button"
                              onClick={() => {
                                setValue('opening_side', option.value as any);
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

                  {errors.opening_side && (
                    <p className="text-red-500 text-sm mt-1">{errors.opening_side.message}</p>
                  )}
                </div>
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
                  {loading ? 'جاري الحفظ...' : editingAgent ? 'تحديث' : 'حفظ'}
                </button>
              </div>
            </form>
          </div>
        </ModalOverlay>
      )}

      {/* View Agent Modal */}
      {viewAgent && (
        <ModalOverlay>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                تفاصيل الوكيل الملاحي
              </h2>
              <button
                onClick={() => setViewAgent(null)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto max-h-[calc(90vh-80px)] p-6 space-y-6 scrollbar-thin">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">تاريخ الإضافة</p>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <p className="font-medium text-gray-900 dark:text-white">
                      {viewAgent.createdAt ? format(new Date(viewAgent.createdAt), 'dd MMMM yyyy', { locale: ar }) : '-'}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">الرصيد الافتتاحي</p>
                  <div className="flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-blue-600" />
                    <div className="font-bold text-blue-600 flex items-center gap-2">
                      <span>{Number(viewAgent.openingBalance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} ريال</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${viewAgent.openingSide === 'DEBIT' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {viewAgent.openingSide === 'DEBIT' ? 'مدين' : 'دائن'}
                      </span>
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">عدد العبارات</p>
                  <div className="flex items-center gap-2">
                    <Ship className="w-4 h-4 text-gray-400" />
                    <p className="font-medium text-gray-900 dark:text-white">
                      {viewAgent.vessels?.length || 0}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">الرصيد الحالي</p>
                  <div className="flex items-center gap-2">
                    <DollarSign className={`w-4 h-4 ${(viewAgent.currentBalance || 0) > 0 ? 'text-red-600' : 'text-green-600'}`} />
                    <div className={`font-bold flex items-center gap-2 ${(viewAgent.currentBalance || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      <span>{Math.abs(Number(viewAgent.currentBalance || 0)).toLocaleString('en-US', { minimumFractionDigits: 2 })} ريال</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${(viewAgent.currentBalance || 0) > 0 ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'}`}>
                        {(viewAgent.currentBalance || 0) > 0 ? 'دائن (مستحق للوكيل)' : (viewAgent.currentBalance || 0) < 0 ? 'مدين (مستحق على الوكيل)' : 'مسدد'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Vessels List */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  العبارات المسجلة
                </h3>
                <div className="border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">
                          #
                        </th>
                        <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">
                          اسم العبارة
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                      {viewAgent.vessels?.map((vessel: any, index: number) => (
                        <tr key={index} className="bg-white dark:bg-gray-800">
                          <td className="px-4 py-3 text-gray-900 dark:text-white w-16">
                            {(index + 1).toLocaleString('en-US')}
                          </td>
                          <td className="px-4 py-3 text-gray-900 dark:text-white">
                            {typeof vessel === 'string' ? vessel : vessel.name}
                          </td>
                        </tr>
                      )) || (
                          <tr className="bg-white dark:bg-gray-800">
                            <td colSpan={2} className="px-4 py-3 text-center text-gray-500 dark:text-gray-400">
                              لا توجد عبارات مسجلة
                            </td>
                          </tr>
                        )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Created By Footer */}
              {viewAgent.createdAt && (
                <div className="text-sm text-gray-500 dark:text-gray-400 text-center">
                  تم الإنشاء في {format(new Date(viewAgent.createdAt), 'dd/MM/yyyy HH:mm', { locale: ar })}
                </div>
              )}
            </div>
          </div>
        </ModalOverlay>
      )}
    </div>
  );
}