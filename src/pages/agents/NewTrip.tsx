import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiClient } from '@/lib/api';
import { Plus, Eye, Edit, Trash2, Save, X, Ship, Search, ChevronDown, Pencil, Calendar, DollarSign, FileText } from 'lucide-react';
import { format, startOfMonth } from 'date-fns';
import { ar } from 'date-fns/locale';
import { usePermissions } from '@/hooks/usePermissions';
import { showSuccess, showError, showConfirm } from '@/lib/toast';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import Pagination from '@/components/ui/Pagination';
import ModalOverlay from '@/components/ui/ModalOverlay';
import { motion } from 'framer-motion';

const tripSchema = z.object({
  agent_id: z.string().min(1, 'يجب اختيار الوكيل'),
  vessel_id: z.string().min(1, 'يجب اختيار العبارة'),
  trip_number: z.string().optional(),
  date: z.string().min(1, 'التاريخ مطلوب'),
  cost_type: z.enum(['DETAILED', 'TOTAL']),
  // Detailed cost fields
  trucks_with_freight: z.number().min(0).optional(),
  trucks_without_freight: z.number().min(0).optional(),
  transit_trucks_with_freight: z.number().min(0).optional(),
  transit_trucks_without_freight: z.number().min(0).optional(),
  freight_per_truck: z.number().min(0).optional(),
  port_fees_per_truck: z.number().min(0).optional(),
  transit_port_fees_per_truck: z.number().min(0).optional(),
  // Total cost fields
  shipment_count: z.number().min(0).optional(),
  total_cost: z.number().min(0).optional(),
  notes: z.string().optional(),
});

type TripFormData = z.infer<typeof tripSchema>;

interface Agent {
  id: string;
  name: string;
}

interface Vessel {
  id: string;
  name: string;
}

interface Trip {
  id: string;
  agentId: string;
  vesselId?: string;
  tripNumber?: string;
  date: string;
  costType: string;
  trucksWithFreight: number;
  trucksWithoutFreight: number;
  transitTrucksWithFreight: number;
  transitTrucksWithoutFreight: number;
  freightPerTruck: number;
  portFeesPerTruck: number;
  transitPortFeesPerTruck: number;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  notes?: string;
  agent?: { name: string };
  vessel?: { name: string };
  createdAt?: string;
}

export default function NewTrip() {
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [vessels, setVessels] = useState<Vessel[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
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
  const [viewTrip, setViewTrip] = useState<Trip | null>(null);
  const [defaultFreight, setDefaultFreight] = useState(0);
  const [defaultPortFees, setDefaultPortFees] = useState(0);
  const [defaultTransitPortFees, setDefaultTransitPortFees] = useState(0);
  const [isFreightEditable, setIsFreightEditable] = useState(false);
  const [isPortFeesEditable, setIsPortFeesEditable] = useState(false);
  const [isTransitPortFeesEditable, setIsTransitPortFeesEditable] = useState(false);
  const { canCreate, canEdit, canDelete, requirePermission } = usePermissions();
  const SCREEN = 'shipping_agents.trips';

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
  } = useForm<TripFormData>({
    resolver: zodResolver(tripSchema),
    defaultValues: {
      date: format(new Date(), 'yyyy-MM-dd'),
      cost_type: 'DETAILED',
      trucks_with_freight: 0,
      trucks_without_freight: 0,
      transit_trucks_with_freight: 0,
      transit_trucks_without_freight: 0,
      freight_per_truck: 0,
      port_fees_per_truck: 0,
      transit_port_fees_per_truck: 0,
      shipment_count: 0,
      total_cost: 0,
    },
  });

  const selectedAgentId = watch('agent_id');
  const costType = watch('cost_type');
  const trucksWithFreight = watch('trucks_with_freight') || 0;
  const trucksWithoutFreight = watch('trucks_without_freight') || 0;
  const transitTrucksWithFreight = watch('transit_trucks_with_freight') || 0;
  const transitTrucksWithoutFreight = watch('transit_trucks_without_freight') || 0;
  const freightPerTruck = watch('freight_per_truck') || 0;
  const portFeesPerTruck = watch('port_fees_per_truck') || 0;
  const transitPortFeesPerTruck = watch('transit_port_fees_per_truck') || 0;
  const totalCost = watch('total_cost') || 0;

  const calculatedTotal = costType === 'DETAILED'
    ? (trucksWithFreight * (freightPerTruck + portFeesPerTruck)) + (trucksWithoutFreight * portFeesPerTruck)
    + (transitTrucksWithFreight * (freightPerTruck + transitPortFeesPerTruck)) + (transitTrucksWithoutFreight * transitPortFeesPerTruck)
    : totalCost;

  useEffect(() => {
    loadAgents();
    loadTrips();
    loadDefaults();
  }, []);

  useEffect(() => {
    if (selectedAgentId) {
      loadVessels(selectedAgentId);
    } else {
      setVessels([]);
      setValue('vessel_id', '');
    }
  }, [selectedAgentId]);

  const loadDefaults = async () => {
    try {
      const settings = await apiClient.getAgentSettings();
      setDefaultFreight(settings.defaultFreightPerTruck || 0);
      setDefaultPortFees(settings.defaultPortFeesPerTruck || 0);
      setDefaultTransitPortFees(settings.defaultTransitPortFees || 0);
    } catch (error) {
      console.error('Error loading agent defaults:', error);
    }
  };

  const loadAgents = async () => {
    try {
      const response = await apiClient.getAgents();
      if (response.data) {
        setAgents(response.data);
      } else if (Array.isArray(response)) {
        setAgents(response);
      }
    } catch (error) {
      console.error('Error loading agents:', error);
    }
  };

  const loadVessels = async (agentId: string) => {
    try {
      const agentData = await apiClient.getAgent(agentId);
      if (agentData.vessels && Array.isArray(agentData.vessels)) {
        setVessels(agentData.vessels);
      } else {
        setVessels([]);
      }
    } catch (error) {
      console.error('Error loading vessels:', error);
      setVessels([]);
    }
  };

  const loadTrips = async () => {
    try {
      const response = await apiClient.getTrips();
      if (response.data) {
        setTrips(response.data);
      } else if (Array.isArray(response)) {
        setTrips(response);
      } else {
        setTrips([]);
      }
    } catch (error: any) {
      console.error('Error loading trips:', error);
      if (error.response?.status === 404) {
        setTrips([]);
      }
    }
  };

  const onSubmit = async (data: TripFormData) => {
    try {
      setLoading(true);

      let tripData: any;

      if (data.cost_type === 'DETAILED') {
        tripData = {
          agentId: data.agent_id,
          vesselId: data.vessel_id,
          tripNumber: data.trip_number || undefined,
          date: data.date,
          costType: 'DETAILED',
          trucksWithFreight: data.trucks_with_freight || 0,
          trucksWithoutFreight: data.trucks_without_freight || 0,
          transitTrucksWithFreight: data.transit_trucks_with_freight || 0,
          transitTrucksWithoutFreight: data.transit_trucks_without_freight || 0,
          freightPerTruck: data.freight_per_truck || 0,
          portFeesPerTruck: data.port_fees_per_truck || 0,
          transitPortFeesPerTruck: data.transit_port_fees_per_truck || 0,
          notes: data.notes || undefined,
        };
      } else {
        tripData = {
          agentId: data.agent_id,
          vesselId: data.vessel_id,
          tripNumber: data.trip_number || undefined,
          date: data.date,
          costType: 'TOTAL',
          quantity: data.shipment_count || 0,
          totalAmount: data.total_cost || 0,
          notes: data.notes || undefined,
        };
      }

      if (editingTrip) {
        const { agentId, ...updateData } = tripData;
        await apiClient.updateTrip(editingTrip.id, updateData);
        showSuccess('تم تحديث الرحلة بنجاح');
      } else {
        await apiClient.createTrip(tripData);
        showSuccess('تم تسجيل الرحلة بنجاح');
      }

      setShowModal(false);
      setEditingTrip(null);
      reset();
      setAgentSearch('');
      setVesselSearch('');
      loadTrips();
    } catch (error: any) {
      console.error('Error saving trip:', error);
      const errorMsg = error.response?.data?.message;
      const displayMsg = Array.isArray(errorMsg) ? errorMsg.join(', ') : errorMsg || error.message;
      showError(`حدث خطأ أثناء حفظ الرحلة: ${displayMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (trip: Trip) => {
    if (!requirePermission('shipping_agents.trips.edit')) return;
    setEditingTrip(trip);

    if (trip.agentId) {
      await loadVessels(trip.agentId);
    }

    const ct = trip.costType || 'DETAILED';
    reset({
      agent_id: trip.agentId || '',
      vessel_id: trip.vesselId || '',
      trip_number: trip.tripNumber || '',
      date: trip.date,
      cost_type: ct as 'DETAILED' | 'TOTAL',
      trucks_with_freight: trip.trucksWithFreight || 0,
      trucks_without_freight: trip.trucksWithoutFreight || 0,
      transit_trucks_with_freight: trip.transitTrucksWithFreight || 0,
      transit_trucks_without_freight: trip.transitTrucksWithoutFreight || 0,
      freight_per_truck: parseFloat(String(trip.freightPerTruck || 0)),
      port_fees_per_truck: parseFloat(String(trip.portFeesPerTruck || 0)),
      transit_port_fees_per_truck: parseFloat(String(trip.transitPortFeesPerTruck || 0)),
      shipment_count: trip.quantity || 0,
      total_cost: parseFloat(String(trip.totalAmount || 0)),
      notes: trip.notes || '',
    });

    setIsFreightEditable(true);
    setIsPortFeesEditable(true);
    setIsTransitPortFeesEditable(true);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!requirePermission('shipping_agents.trips.delete')) return;

    showConfirm(
      'هل أنت متأكد من حذف هذه الرحلة؟',
      async () => {
        try {
          await apiClient.deleteTrip(id);
          showSuccess('تم حذف الرحلة بنجاح');
          loadTrips();
        } catch (error) {
          showError('حدث خطأ أثناء حذف الرحلة');
        }
      }
    );
  };

  const openNewTripModal = () => {
    setEditingTrip(null);
    reset({
      date: format(new Date(), 'yyyy-MM-dd'),
      cost_type: 'DETAILED',
      trucks_with_freight: 0,
      trucks_without_freight: 0,
      transit_trucks_with_freight: 0,
      transit_trucks_without_freight: 0,
      freight_per_truck: defaultFreight,
      port_fees_per_truck: defaultPortFees,
      transit_port_fees_per_truck: defaultTransitPortFees,
      shipment_count: 0,
      total_cost: 0,
    });
    setAgentSearch('');
    setVesselSearch('');
    setIsFreightEditable(false);
    setIsPortFeesEditable(false);
    setIsTransitPortFeesEditable(false);
    setShowModal(true);
  };

  const filteredTrips = trips.filter(trip => {
    const searchString = searchTerm.toLowerCase();
    const matchSearch = searchTerm === '' ||
      (trip.agent?.name?.toLowerCase() || '').includes(searchString) ||
      (trip.tripNumber?.toLowerCase() || '').includes(searchString);

    if (!matchSearch) return false;

    if (dateRange.start && dateRange.end) {
      const tripDate = new Date(trip.date);
      tripDate.setHours(0, 0, 0, 0);
      const start = new Date(dateRange.start);
      start.setHours(0, 0, 0, 0);
      const end = new Date(dateRange.end);
      end.setHours(23, 59, 59, 999);

      if (tripDate < start || tripDate > end) {
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
            { label: 'رحلة جديدة' }
          ]}
        />
        {canCreate(SCREEN) && (
          <button
            onClick={openNewTripModal}
            className="flex items-center gap-1.5 md:gap-2 px-3 py-1.5 md:px-6 md:py-2 md:h-10 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm md:text-base w-full md:w-auto justify-center"
          >
            <Plus className="w-4 h-4 md:w-5 md:h-5" />
            تسجيل رحلة جديدة
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col md:flex-row gap-3 md:gap-4 items-stretch md:items-center">
          <div className="flex-1 relative w-full">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-gray-400" />
            <input
              type="text"
              placeholder="بحث باسم الوكيل أو رقم الرحلة..."
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
                  عدد الشاحنات
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                  المبلغ الإجمالي
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                  الإجراءات
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredTrips.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((trip, index) => (
                <motion.tr
                  key={trip.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3, delay: Math.min(index * 0.05, 0.3) }}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                >
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                    {trip.agent?.name}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                    {format(new Date(trip.date), 'dd/MM/yyyy')}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex items-center gap-2">
                      <Ship className="w-4 h-4" />
                      {trip.vessel?.name || 'غير محدد'}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                    {trip.tripNumber || '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                    {trip.quantity || ((trip.trucksWithFreight || 0) + (trip.trucksWithoutFreight || 0))}
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white">
                    {parseFloat(String(trip.totalAmount || 0)).toFixed(2)} ريال
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setViewTrip(trip)}
                        className="btn-icon"
                        title="عرض التفاصيل"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {canEdit(SCREEN) && (
                        <button
                          onClick={() => handleEdit(trip)}
                          className="btn-icon"
                          title="تعديل"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      )}
                      {canDelete(SCREEN) && (
                        <button
                          onClick={() => handleDelete(trip.id)}
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
          totalItems={filteredTrips.length}
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
                {editingTrip ? 'تعديل رحلة' : 'تسجيل رحلة جديدة'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto scrollbar-thin p-6 space-y-6">
              {/* Row 1: Agent + Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    التاريخ <span className="text-red-500">*</span>
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

              {/* Row 2: Vessel + Trip Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div ref={vesselDropdownRef} className="relative">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    اسم العبارة <span className="text-red-500">*</span>
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

              {/* Cost Type Toggle */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  طريقة حساب التكلفة
                </label>
                <div className="flex bg-gray-100 dark:bg-gray-700 rounded-xl p-1">
                  <button
                    type="button"
                    onClick={() => setValue('cost_type', 'DETAILED')}
                    className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${costType === 'DETAILED'
                      ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-300 shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                      }`}
                  >
                    التكلفة التفصيلية
                  </button>
                  <button
                    type="button"
                    onClick={() => setValue('cost_type', 'TOTAL')}
                    className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${costType === 'TOTAL'
                      ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-300 shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                      }`}
                  >
                    التكلفة الإجمالية
                  </button>
                </div>
              </div>

              {/* Detailed Cost Fields */}
              {costType === 'DETAILED' && (
                <div className="space-y-4 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-xl p-4">
                  {/* شاحنات الدخول */}
                  <h4 className="text-sm font-semibold text-blue-700 dark:text-blue-300">شاحنات الدخول</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        دخول بنولون
                      </label>
                      <input
                        type="number"
                        min="0"
                        {...register('trucks_with_freight', { valueAsNumber: true })}
                        className="w-full px-4 py-2.5 bg-white dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:text-white transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        دخول بدون نولون
                      </label>
                      <input
                        type="number"
                        min="0"
                        {...register('trucks_without_freight', { valueAsNumber: true })}
                        className="w-full px-4 py-2.5 bg-white dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:text-white transition-all"
                      />
                    </div>
                  </div>

                  {/* شاحنات الترانزيت */}
                  <h4 className="text-sm font-semibold text-purple-700 dark:text-purple-300 mt-2">شاحنات الترانزيت</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        ترانزيت بنولون
                      </label>
                      <input
                        type="number"
                        min="0"
                        {...register('transit_trucks_with_freight', { valueAsNumber: true })}
                        className="w-full px-4 py-2.5 bg-white dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:text-white transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        ترانزيت بدون نولون
                      </label>
                      <input
                        type="number"
                        min="0"
                        {...register('transit_trucks_without_freight', { valueAsNumber: true })}
                        className="w-full px-4 py-2.5 bg-white dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:text-white transition-all"
                      />
                    </div>
                  </div>

                  {/* الأسعار */}
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mt-2">الأسعار</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        النولون (للشاحنة)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          readOnly={!isFreightEditable}
                          {...register('freight_per_truck', { valueAsNumber: true })}
                          className={`w-full pl-10 pr-4 py-2.5 border rounded-xl focus:outline-none transition-all dark:text-white ${isFreightEditable
                            ? 'bg-white dark:bg-gray-700/50 border-blue-400 dark:border-blue-500 ring-2 ring-blue-500/20'
                            : 'bg-gray-50 dark:bg-gray-700/30 border-gray-200 dark:border-gray-600 cursor-default'
                            }`}
                        />
                        <button
                          type="button"
                          onClick={() => setIsFreightEditable(!isFreightEditable)}
                          className={`absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-all duration-200 ${isFreightEditable
                            ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/60'
                            : 'bg-gray-100 dark:bg-gray-600/50 text-gray-400 dark:text-gray-500 hover:bg-amber-100 dark:hover:bg-amber-900/30 hover:text-amber-600 dark:hover:text-amber-400'
                            }`}
                          title="تعديل يدوي"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        أجور الدخول (للشاحنة)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          readOnly={!isPortFeesEditable}
                          {...register('port_fees_per_truck', { valueAsNumber: true })}
                          className={`w-full pl-10 pr-4 py-2.5 border rounded-xl focus:outline-none transition-all dark:text-white ${isPortFeesEditable
                            ? 'bg-white dark:bg-gray-700/50 border-blue-400 dark:border-blue-500 ring-2 ring-blue-500/20'
                            : 'bg-gray-50 dark:bg-gray-700/30 border-gray-200 dark:border-gray-600 cursor-default'
                            }`}
                        />
                        <button
                          type="button"
                          onClick={() => setIsPortFeesEditable(!isPortFeesEditable)}
                          className={`absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-all duration-200 ${isPortFeesEditable
                            ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/60'
                            : 'bg-gray-100 dark:bg-gray-600/50 text-gray-400 dark:text-gray-500 hover:bg-amber-100 dark:hover:bg-amber-900/30 hover:text-amber-600 dark:hover:text-amber-400'
                            }`}
                          title="تعديل يدوي"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        أجور الترانزيت (للشاحنة)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          readOnly={!isTransitPortFeesEditable}
                          {...register('transit_port_fees_per_truck', { valueAsNumber: true })}
                          className={`w-full pl-10 pr-4 py-2.5 border rounded-xl focus:outline-none transition-all dark:text-white ${isTransitPortFeesEditable
                            ? 'bg-white dark:bg-gray-700/50 border-blue-400 dark:border-blue-500 ring-2 ring-blue-500/20'
                            : 'bg-gray-50 dark:bg-gray-700/30 border-gray-200 dark:border-gray-600 cursor-default'
                            }`}
                        />
                        <button
                          type="button"
                          onClick={() => setIsTransitPortFeesEditable(!isTransitPortFeesEditable)}
                          className={`absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-all duration-200 ${isTransitPortFeesEditable
                            ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/60'
                            : 'bg-gray-100 dark:bg-gray-600/50 text-gray-400 dark:text-gray-500 hover:bg-amber-100 dark:hover:bg-amber-900/30 hover:text-amber-600 dark:hover:text-amber-400'
                            }`}
                          title="تعديل يدوي"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Total Cost Fields */}
              {costType === 'TOTAL' && (
                <div className="space-y-4 bg-green-50/50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/30 rounded-xl p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        عدد الشحنات
                      </label>
                      <input
                        type="number"
                        min="0"
                        {...register('shipment_count', { valueAsNumber: true })}
                        className="w-full px-4 py-2.5 bg-white dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:text-white transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        التكلفة الإجمالية للرحلة
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        {...register('total_cost', { valueAsNumber: true })}
                        className="w-full px-4 py-2.5 bg-white dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:text-white transition-all"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Calculated Total */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  المبلغ الإجمالي
                </label>
                <div className="px-4 py-3 bg-gray-100 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-lg font-bold text-gray-900 dark:text-white">
                  {calculatedTotal.toFixed(2)} ريال
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  ملاحظات
                </label>
                <textarea
                  {...register('notes')}
                  rows={3}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:text-white transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500 resize-none"
                  placeholder="مثال: رحلة العبارة بوسيدون رقم 10"
                />
              </div>

              {/* Buttons */}
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
                  className="flex items-center gap-2 px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="w-4 h-4" />
                  {loading ? 'جاري الحفظ...' : editingTrip ? 'تحديث' : 'حفظ'}
                </button>
              </div>
            </form>
          </div>
        </ModalOverlay>
      )}

      {/* View Trip Modal */}
      {viewTrip && (
        <ModalOverlay>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                تفاصيل الرحلة
              </h2>
              <button
                onClick={() => setViewTrip(null)}
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
                      {format(new Date(viewTrip.date), 'dd MMMM yyyy', { locale: ar })}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">المبلغ الإجمالي</p>
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-green-600" />
                    <p className="font-bold text-green-600">
                      {Number(viewTrip.totalAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} ريال
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">الوكيل / العبارة</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {viewTrip.agent?.name} {viewTrip.vessel?.name && `- ${viewTrip.vessel.name}`}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">رقم الرحلة</p>
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <p className="font-medium text-blue-600">{viewTrip.tripNumber || '-'}</p>
                  </div>
                </div>
              </div>

              {viewTrip.notes && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">التفاصيل</p>
                  <p className="text-gray-900 dark:text-white">{viewTrip.notes}</p>
                </div>
              )}

              {/* Trip Details */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  بيانات التكلفة ({viewTrip.costType === 'DETAILED' ? 'تفصيلية' : 'إجمالية'})
                </h3>
                <div className="border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">
                          البيان
                        </th>
                        <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">
                          القيمة
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                      {viewTrip.costType === 'DETAILED' ? (
                        <>
                          <tr className="bg-white dark:bg-gray-800">
                            <td className="px-4 py-3 text-gray-900 dark:text-white">شاحنات دخول بنولون</td>
                            <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{viewTrip.trucksWithFreight}</td>
                          </tr>
                          <tr className="bg-white dark:bg-gray-800">
                            <td className="px-4 py-3 text-gray-900 dark:text-white">شاحنات دخول بدون نولون</td>
                            <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{viewTrip.trucksWithoutFreight}</td>
                          </tr>
                          <tr className="bg-white dark:bg-gray-800">
                            <td className="px-4 py-3 text-gray-900 dark:text-white">شاحنات ترانزيت بنولون</td>
                            <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{viewTrip.transitTrucksWithFreight || 0}</td>
                          </tr>
                          <tr className="bg-white dark:bg-gray-800">
                            <td className="px-4 py-3 text-gray-900 dark:text-white">شاحنات ترانزيت بدون نولون</td>
                            <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{viewTrip.transitTrucksWithoutFreight || 0}</td>
                          </tr>
                          <tr className="bg-white dark:bg-gray-800">
                            <td className="px-4 py-3 text-gray-900 dark:text-white">النولون (للشاحنة)</td>
                            <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                              {Number(viewTrip.freightPerTruck || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} ريال
                            </td>
                          </tr>
                          <tr className="bg-white dark:bg-gray-800">
                            <td className="px-4 py-3 text-gray-900 dark:text-white">أجور الدخول (للشاحنة)</td>
                            <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                              {Number(viewTrip.portFeesPerTruck || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} ريال
                            </td>
                          </tr>
                          <tr className="bg-white dark:bg-gray-800">
                            <td className="px-4 py-3 text-gray-900 dark:text-white">أجور الترانزيت (للشاحنة)</td>
                            <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                              {Number(viewTrip.transitPortFeesPerTruck || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} ريال
                            </td>
                          </tr>
                        </>
                      ) : (
                        <tr className="bg-white dark:bg-gray-800">
                          <td className="px-4 py-3 text-gray-900 dark:text-white">عدد الشحنات</td>
                          <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{viewTrip.quantity}</td>
                        </tr>
                      )}
                      <tr className="bg-gray-50 dark:bg-gray-700/50 font-bold">
                        <td className="px-4 py-3 text-gray-900 dark:text-white">الإجمالي</td>
                        <td className="px-4 py-3 text-green-600">
                          {Number(viewTrip.totalAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} ريال
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Created By Footer */}
              {viewTrip.createdAt && (
                <div className="text-sm text-gray-500 dark:text-gray-400 text-center">
                  تم الإنشاء في {format(new Date(viewTrip.createdAt), 'dd/MM/yyyy HH:mm', { locale: ar })}
                </div>
              )}
            </div>
          </div>
        </ModalOverlay>
      )}
    </div>
  );
}