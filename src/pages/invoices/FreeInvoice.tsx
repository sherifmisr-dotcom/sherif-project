import { useState, useEffect, useRef } from 'react';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiClient } from '@/lib/api';
import { Plus, Trash2, Save, Search, Eye, Printer, Edit, FileText, X, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import InvoicePreview from '@/components/InvoicePreview';
import Pagination from '@/components/ui/Pagination';
import AutocompleteInput from '@/components/AutocompleteInput';
import InvoiceSuccessModal from '@/components/modals/InvoiceSuccessModal';
import AddInvoiceItemModal from '@/components/modals/AddInvoiceItemModal';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { useScrollLock } from '@/hooks/useScrollLock';
import { showSuccess, showError, showConfirm, showWarning } from '@/lib/toast';
import { usePermissions } from '@/hooks/usePermissions';
import ModalOverlay from '@/components/ui/ModalOverlay';
import ViewInvoiceModal from '@/components/modals/ViewInvoiceModal';
import { motion } from 'framer-motion';

const invoiceSchema = z.object({
  customer_id: z.string().min(1, 'يجب اختيار العميل'),
  date: z.string().min(1, 'التاريخ مطلوب'),
  vat_enabled: z.boolean(),
  vat_rate: z.number().min(0).max(100),
  notes: z.string().optional(),
});

type InvoiceFormData = z.infer<typeof invoiceSchema>;

interface InvoiceItem {
  id: string;
  description: string;
  unitPrice: number;
  quantity: number;
  vatRate: number;
  amount: number;
  categoryId?: string;
}

interface Customer {
  id: string;
  name: string;
}

interface Invoice {
  id: string;
  code: string;
  date: string;
  total: number;
  customerId: string;
  customer?: { name: string };
}

export default function FreeInvoice() {

  const { canCreate, canEdit, canDelete, canPrint } = usePermissions();
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPeriod, setFilterPeriod] = useState<'year' | 'month' | 'all'>('month');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState({
    totalInvoices: 0,
    totalAmount: 0,
    totalFees: 0,
  });
  const [viewingInvoice, setViewingInvoice] = useState<any>(null);
  const [previewInvoice, setPreviewInvoice] = useState<any>(null);
  const [editingInvoice, setEditingInvoice] = useState<any>(null);
  const [applyVAT, setApplyVAT] = useState(false); // Control VAT visibility and application
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdInvoice, setCreatedInvoice] = useState<{ id: string; code: string } | null>(null);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [currentItemId, setCurrentItemId] = useState<string | null>(null);

  const [items, setItems] = useState<InvoiceItem[]>([
    { id: crypto.randomUUID(), description: '', unitPrice: 0, quantity: 1, vatRate: 0, amount: 0 },
  ]);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      date: format(new Date(), 'yyyy-MM-dd'),
      vat_enabled: false,
      vat_rate: 14,
    },
  });

  // Searchable customer dropdown state
  const [customerSearch, setCustomerSearch] = useState('');
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const customerDropdownRef = useRef<HTMLDivElement>(null);
  const customerSearchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(event.target as Node)) {
        setIsCustomerDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-focus search input when dropdown opens
  useEffect(() => {
    if (isCustomerDropdownOpen && customerSearchInputRef.current) {
      customerSearchInputRef.current.focus();
    }
  }, [isCustomerDropdownOpen]);

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(customerSearch.toLowerCase())
  );

  const selectedCustomerId = watch('customer_id');
  const selectedCustomerName = customers.find(c => c.id === selectedCustomerId)?.name || '';

  const handleSelectCustomer = (customerId: string) => {
    setValue('customer_id', customerId, { shouldValidate: true });
    setIsCustomerDropdownOpen(false);
    setCustomerSearch('');
  };



  useEffect(() => {
    loadCustomers();
    loadInvoices();
  }, [currentPage, filterPeriod, searchTerm]);

  useScrollLock(showModal);

  const loadCustomers = async () => {
    try {
      const response = await apiClient.getCustomers({ type: 'FREE', limit: 0 });
      if (response.data) {
        setCustomers(response.data.map((c: any) => ({ id: c.id, name: c.name })));
      }
    } catch (error) {
      console.error('Error loading customers:', error);
    }
  };

  const loadInvoices = async () => {
    try {
      setLoading(true);

      const params: any = {
        type: 'FREE',
        page: currentPage,
        limit: 10,
      };

      if (searchTerm) {
        params.q = searchTerm;
      }

      const now = new Date();
      if (filterPeriod === 'year') {
        params.from = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
      } else if (filterPeriod === 'month') {
        params.from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      }

      const response = await apiClient.getInvoices(params);
      setInvoices(response.data || []);
      setTotalPages(response.meta?.totalPages || 1);

      // Get stats based on selected filter period
      let statsFrom: string | undefined;
      let statsTo: string | undefined;

      if (filterPeriod === 'year') {
        const yearStart = new Date(now.getFullYear(), 0, 1);
        statsFrom = `${yearStart.getFullYear()}-01-01`;
      } else if (filterPeriod === 'month') {
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        statsFrom = `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, '0')}-01`;
        statsTo = `${monthEnd.getFullYear()}-${String(monthEnd.getMonth() + 1).padStart(2, '0')}-${String(monthEnd.getDate()).padStart(2, '0')}`;
      }

      const statsResponse = await apiClient.getInvoiceStats({
        type: 'FREE',
        ...(statsFrom && { from: statsFrom }),
        ...(statsTo && { to: statsTo })
      });

      setStats({
        totalInvoices: statsResponse.totalInvoices || 0,
        totalAmount: statsResponse.totalAmount || 0,
        totalFees: statsResponse.totalFees || 0,
      });
    } catch (error) {
      console.error('Error loading invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const addItem = () => {
    setItems([...items, { id: crypto.randomUUID(), description: '', unitPrice: 0, quantity: 1, vatRate: 0, amount: 0 }]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter((item) => item.id !== id));
    } else {
      // If it's the last item, reset it instead of removing
      setItems([{ id: crypto.randomUUID(), description: '', unitPrice: 0, quantity: 1, vatRate: 0, amount: 0 }]);
    }
  };

  const updateItem = (id: string, field: keyof InvoiceItem, value: string | number) => {
    setItems((prevItems) =>
      prevItems.map((item) => {
        if (item.id === id) {
          const updated = { ...item, [field]: value };

          // Prevent duplicate item descriptions
          if (field === 'description' && value && value !== '') {
            const isDuplicate = prevItems.some(i => i.id !== id && i.description === value);
            if (isDuplicate) return item;
          }

          // Reset fields when description is cleared
          if (field === 'description' && (!value || value === '')) {
            updated.unitPrice = 0;
            updated.quantity = 1;
            updated.vatRate = 0;
            updated.amount = 0;
          }

          // Auto-calculate amount when unitPrice, quantity, or vatRate changes
          if (field === 'unitPrice' || field === 'quantity' || field === 'vatRate') {
            const unitPrice = field === 'unitPrice' ? Number(value) : item.unitPrice;
            const quantity = field === 'quantity' ? Number(value) : item.quantity;
            const vatRate = field === 'vatRate' ? Number(value) : item.vatRate;
            const subtotal = unitPrice * quantity;
            const vatAmount = subtotal * (vatRate / 100);
            updated.amount = subtotal + vatAmount;
          }
          return updated;
        }
        return item;
      })
    );
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => {
      const itemSubtotal = item.unitPrice * item.quantity;
      return sum + itemSubtotal;
    }, 0);

    const vatAmount = items.reduce((sum, item) => {
      const itemSubtotal = item.unitPrice * item.quantity;
      const itemVat = itemSubtotal * (item.vatRate / 100);
      return sum + itemVat;
    }, 0);

    const total = subtotal + vatAmount;
    return { subtotal, vatAmount, total };
  };

  const onSubmit = async (data: InvoiceFormData) => {
    try {
      setLoading(true);

      const { subtotal } = calculateTotals();

      if (subtotal === 0) {
        showWarning('لا يمكن حفظ فاتورة بقيمة صفر');
        setLoading(false);
        return;
      }

      const invoiceData: any = {
        customsNo: `FREE-${Math.floor(100 + Math.random() * 900)}`,
        date: data.date,
        vatEnabled: applyVAT,
        vatRate: data.vat_rate,
        notes: data.notes || undefined,
        items: items
          .filter((item) => item.description && (item.unitPrice > 0 || item.amount > 0))
          .map((item, index) => ({
            description: item.description,
            unitPrice: item.unitPrice,
            quantity: item.quantity,
            vatRate: item.vatRate,
            amount: item.amount,
            categoryId: item.categoryId,
            sortOrder: index,
          })),
      };

      if (editingInvoice) {
        // Update existing invoice
        delete invoiceData.customsNo; // Don't update customsNo
        await apiClient.updateInvoice(editingInvoice.id, invoiceData);
        showSuccess('تم تحديث الفاتورة بنجاح');
      } else {
        // Create new invoice
        invoiceData.type = 'FREE';
        invoiceData.customerId = data.customer_id;
        const response = await apiClient.createInvoice(invoiceData);

        // Show success modal for new invoices
        setCreatedInvoice({ id: response.id, code: response.code });
        setShowSuccessModal(true);
      }

      setShowModal(false);
      setEditingInvoice(null);
      reset();
      setItems([{ id: crypto.randomUUID(), description: '', unitPrice: 0, quantity: 1, vatRate: 0, amount: 0 }]);
      setApplyVAT(false);
      loadInvoices();
    } catch (error: any) {
      console.error('Error saving invoice:', error);
      const message = error.response?.data?.message || 'حدث خطأ أثناء حفظ الفاتورة';
      showError(message);
    } finally {
      setLoading(false);
    }
  };

  const deleteInvoice = async (id: string) => {
    showConfirm(
      'هل أنت متأكد من حذف هذه الفاتورة؟',
      async () => {
        try {
          await apiClient.deleteInvoice(id);
          showSuccess('تم حذف الفاتورة بنجاح');
          loadInvoices();
        } catch (error: any) {
          const message = error.response?.data?.message || 'حدث خطأ أثناء حذف الفاتورة';
          showError(message);
        }
      }
    );
  };

  const handleView = async (id: string) => {
    try {
      const invoice = await apiClient.getInvoice(id);
      if (invoice) {
        setViewingInvoice(invoice);
      }
    } catch (error) {
      console.error('Error loading invoice:', error);
    }
  };

  const handlePrintPreview = async (id: string) => {
    try {
      const invoice = await apiClient.getInvoice(id);
      if (invoice) {
        setPreviewInvoice(invoice);
      }
    } catch (error) {
      console.error('Error loading invoice:', error);
    }
  };

  const handleEdit = async (id: string) => {
    try {
      const invoice = await apiClient.getInvoice(id);
      if (invoice) {
        setEditingInvoice(invoice);
        reset({
          customer_id: invoice.customerId,
          date: invoice.date.split('T')[0],
          vat_enabled: invoice.vatEnabled,
          vat_rate: invoice.vatRate ? parseFloat(invoice.vatRate.toString()) : 14,
          notes: invoice.notes || '',
        });
        setItems(
          invoice.items?.map((item: any) => {
            // Check if item has new structure
            if (item.unitPrice !== undefined && item.quantity !== undefined && item.vatRate !== undefined) {
              // New structure
              return {
                id: item.id,
                description: item.description,
                unitPrice: parseFloat(item.unitPrice),
                quantity: parseFloat(item.quantity),
                vatRate: parseFloat(item.vatRate),
                amount: parseFloat(item.amount),
                categoryId: item.categoryId,
              };
            } else {
              // Old structure - convert
              return {
                id: item.id,
                description: item.description,
                unitPrice: parseFloat(item.amount),
                quantity: 1,
                vatRate: 0,
                amount: parseFloat(item.amount),
                categoryId: item.categoryId,
              };
            }
          }) || [{ id: crypto.randomUUID(), description: '', unitPrice: 0, quantity: 1, vatRate: 0, amount: 0 }]
        );

        // Check if any item has VAT rate > 0, then enable VAT toggle
        const hasVAT = invoice.items?.some((item: any) => {
          const vatRate = item.vatRate !== undefined ? parseFloat(item.vatRate) : 0;
          return vatRate > 0;
        });
        if (hasVAT) {
          setApplyVAT(true);
        }

        setShowModal(true);
      }
    } catch (error) {
      console.error('Error loading invoice:', error);
    }
  };



  const handleAddNewItem = (itemId: string) => {
    setCurrentItemId(itemId);
    setShowAddItemModal(true);
  };

  const handleItemAdded = (description: string, vatRate: number) => {
    if (currentItemId) {
      updateItem(currentItemId, 'description', description);
      updateItem(currentItemId, 'vatRate', vatRate);
      setCurrentItemId(null);
    }
  };

  const { subtotal, vatAmount, total } = calculateTotals();

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 px-3 py-2 md:px-6 md:py-3 flex flex-col md:flex-row items-start md:items-center justify-between gap-2">
        <Breadcrumb
          items={[
            { label: 'الفواتير', path: '/invoices' },
            { label: 'الفواتير الحرة' }
          ]}
        />
        {canCreate('invoices.type4') && (
          <button
            onClick={() => {
              setEditingInvoice(null);
              reset();
              setItems([{ id: crypto.randomUUID(), description: '', unitPrice: 0, quantity: 1, vatRate: 0, amount: 0 }]);
              setApplyVAT(false);
              setCustomerSearch('');
              setIsCustomerDropdownOpen(false);
              setShowModal(true);
            }}
            className="flex items-center gap-1.5 md:gap-2 px-3 py-1.5 md:px-6 md:py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm md:text-base w-full md:w-auto justify-center"
          >
            <Plus className="w-4 h-4 md:w-5 md:h-5" />
            إنشاء فاتورة جديدة
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                إجمالي الفواتير {filterPeriod === 'year' ? 'للسنة الحالية' : filterPeriod === 'month' ? 'للشهر الحالي' : 'الإجمالية'}
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {stats.totalInvoices}
              </p>
            </div>
            <div className="p-3 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
              <FileText className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                إجمالي مبالغ الفواتير {filterPeriod === 'year' ? 'للسنة الحالية' : filterPeriod === 'month' ? 'للشهر الحالي' : 'الإجمالية'}
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {stats.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ريال
              </p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                إجمالي أجور التخليص {filterPeriod === 'year' ? 'للسنة الحالية' : filterPeriod === 'month' ? 'للشهر الحالي' : 'الإجمالية'}
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {stats.totalFees.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ريال
              </p>
            </div>
            <div className="p-3 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
              <FileText className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
        </motion.div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="بحث بالعميل أو رقم الفاتورة..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pr-10 pl-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setFilterPeriod('month')}
              className={`px-4 py-2 rounded-lg transition-colors ${filterPeriod === 'month'
                ? 'bg-orange-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
            >
              الشهر الحالي
            </button>
            <button
              onClick={() => setFilterPeriod('year')}
              className={`px-4 py-2 rounded-lg transition-colors ${filterPeriod === 'year'
                ? 'bg-orange-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
            >
              السنة الحالية
            </button>
            <button
              onClick={() => setFilterPeriod('all')}
              className={`px-4 py-2 rounded-lg transition-colors ${filterPeriod === 'all'
                ? 'bg-orange-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
            >
              الإجمالية
            </button>
          </div>
        </div>

        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                  رقم الفاتورة
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                  العميل
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                  التاريخ
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                  الإجمالي
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                  الإجراءات
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {invoices.map((invoice, index) => (
                <motion.tr
                  key={invoice.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3, delay: Math.min(index * 0.05, 0.3) }}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                >
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                    {invoice.code}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                    {invoice.customer?.name}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                    {format(new Date(invoice.date), 'dd/MM/yyyy')}
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white">
                    {parseFloat(invoice.total.toString()).toFixed(2)} ريال
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleView(invoice.id)}
                        className="btn-icon"
                        title="معاينة"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {canPrint('invoices.type4') && (
                        <button
                          onClick={() => handlePrintPreview(invoice.id)}
                          className="btn-icon"
                          title="معاينة الطباعة"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                      )}
                      {canEdit('invoices.type4') && (
                        <button
                          onClick={() => handleEdit(invoice.id)}
                          className="btn-icon"
                          title="تعديل"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      )}
                      {canDelete('invoices.type4') && (
                        <button
                          onClick={() => deleteInvoice(invoice.id)}
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

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={10}
          onPageChange={setCurrentPage}
        />
      </div>

      {showModal && (
        <ModalOverlay>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex-shrink-0">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  {editingInvoice ? 'تعديل بيانات فاتورة حرة' : 'إنشاء فاتورة حرة جديدة'}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent [scrollbar-gutter:stable] hover:scrollbar-thumb-gray-400 dark:scrollbar-thumb-gray-600">
              <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    بيانات الفاتورة
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div ref={customerDropdownRef} className="relative">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        العميل
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsCustomerDropdownOpen(!isCustomerDropdownOpen)}
                        className={`w-full flex items-center justify-between px-4 py-2 border rounded-lg text-right transition-all duration-200
                          ${isCustomerDropdownOpen
                            ? 'border-blue-500 ring-2 ring-blue-500/20 dark:border-blue-400 dark:ring-blue-400/20'
                            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                          }
                          bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
                      >
                        <span className={`truncate ${!selectedCustomerId ? 'text-gray-400 dark:text-gray-500' : ''}`}>
                          {selectedCustomerName || 'اختر العميل'}
                        </span>
                        <div className="flex items-center gap-1 mr-2 flex-shrink-0">
                          {selectedCustomerId && (
                            <span
                              role="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setValue('customer_id', '', { shouldValidate: true });
                                setCustomerSearch('');
                              }}
                              className="p-0.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                            >
                              <X className="w-3.5 h-3.5 text-gray-400" />
                            </span>
                          )}
                          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isCustomerDropdownOpen ? 'rotate-180' : ''}`} />
                        </div>
                      </button>

                      {isCustomerDropdownOpen && (
                        <div className="absolute z-50 mt-1.5 w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl shadow-xl shadow-black/10 dark:shadow-black/30 overflow-hidden"
                          style={{ animation: 'dropdownIn 0.15s ease-out' }}
                        >
                          <div className="p-2 border-b border-gray-100 dark:border-gray-600">
                            <div className="relative">
                              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                              <input
                                ref={customerSearchInputRef}
                                type="text"
                                value={customerSearch}
                                onChange={(e) => setCustomerSearch(e.target.value)}
                                placeholder="ابحث عن عميل..."
                                className="w-full pr-9 pl-3 py-2 text-sm border border-gray-200 dark:border-gray-500 rounded-lg bg-gray-50 dark:bg-gray-600 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                              />
                            </div>
                          </div>

                          <ul
                            className="overflow-y-auto py-1 scrollbar-thin"
                            style={{ maxHeight: '280px' }}
                          >
                            {filteredCustomers.length > 0 ? (
                              filteredCustomers.map((customer) => (
                                <li key={customer.id}>
                                  <button
                                    type="button"
                                    onClick={() => handleSelectCustomer(customer.id)}
                                    className={`w-full text-right px-4 py-2.5 text-sm transition-colors duration-100
                                      ${customer.id === selectedCustomerId
                                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium'
                                        : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600/50'
                                      }`}
                                  >
                                    {customer.name}
                                  </button>
                                </li>
                              ))
                            ) : (
                              <li className="px-4 py-6 text-center text-sm text-gray-400 dark:text-gray-500">
                                لا توجد نتائج
                              </li>
                            )}
                          </ul>

                          {filteredCustomers.length > 0 && (
                            <div className="px-3 py-2 border-t border-gray-100 dark:border-gray-600 bg-gray-50/50 dark:bg-gray-800/50">
                              <span className="text-xs text-gray-400 dark:text-gray-500">
                                {filteredCustomers.length} عميل
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                      {errors.customer_id && (
                        <p className="text-red-500 text-sm mt-1">{errors.customer_id.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        التاريخ
                      </label>
                      <input
                        type="date"
                        {...register('date')}
                        max={`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      />
                      {errors.date && (
                        <p className="text-red-500 text-sm mt-1">{errors.date.message}</p>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  {/* VAT Toggle - Professional Design (Orange Theme) */}
                  <div className="mb-6 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 border-2 border-orange-200 dark:border-orange-700 rounded-xl p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-600 rounded-lg">
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div>
                          <label className="flex items-center gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={applyVAT}
                              onChange={async (e) => {
                                const checked = e.target.checked;
                                setApplyVAT(checked);
                                if (!checked) {
                                  setItems(items.map(item => ({
                                    ...item,
                                    vatRate: 0,
                                    amount: item.unitPrice * item.quantity
                                  })));
                                } else {
                                  const updatedItems = await Promise.all(
                                    items.map(async (item) => {
                                      if (item.description) {
                                        try {
                                          const results = await apiClient.searchInvoiceItemTemplates(item.description);
                                          const template = results.find((r: any) => r.description === item.description);
                                          if (template && template.vatRate !== undefined) {
                                            const subtotal = item.unitPrice * item.quantity;
                                            const vatAmount = subtotal * (template.vatRate / 100);
                                            return {
                                              ...item,
                                              vatRate: template.vatRate,
                                              amount: subtotal + vatAmount
                                            };
                                          }
                                        } catch (error) {
                                          console.error('Error fetching template:', error);
                                        }
                                      }
                                      return item;
                                    })
                                  );
                                  setItems(updatedItems);
                                }
                              }}
                              className="w-5 h-5 text-orange-600 border-gray-300 rounded focus:ring-2 focus:ring-orange-500 cursor-pointer"
                            />
                            <div>
                              <span className="text-base font-bold text-gray-900 dark:text-white block">
                                تطبيق ضريبة القيمة المضافة
                              </span>
                              <span className="text-xs text-gray-600 dark:text-gray-400">
                                {applyVAT ? 'سيتم احتساب الضريبة على البنود الخاضعة' : 'لن يتم احتساب أي ضريبة'}
                              </span>
                            </div>
                          </label>
                        </div>
                      </div>
                      <div className={`px-4 py-2 rounded-lg font-semibold text-sm ${applyVAT ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}>
                        {applyVAT ? 'مُفعّل' : 'مُعطّل'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      بنود الفاتورة
                    </h3>
                    <button
                      type="button"
                      onClick={addItem}
                      className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      إضافة بند
                    </button>
                  </div>

                  {/* Column Headers - Hidden on mobile */}
                  <div className="hidden md:grid grid-cols-12 gap-2 mb-2 px-1">
                    <div className="col-span-3 text-xs font-medium text-gray-600 dark:text-gray-400 text-center">تفاصيل الخدمة</div>
                    <div className="col-span-2 text-xs font-medium text-gray-600 dark:text-gray-400 text-center">سعر الوحدة</div>
                    <div className="col-span-2 text-xs font-medium text-gray-600 dark:text-gray-400 text-center">الكمية</div>
                    <div className="col-span-2 text-xs font-medium text-gray-600 dark:text-gray-400 text-center">نسبة الضريبة %</div>
                    <div className="col-span-2 text-xs font-medium text-gray-600 dark:text-gray-400 text-center">الإجمالي شامل الضريبة</div>
                    <div className="col-span-1"></div>
                  </div>

                  <div className="space-y-3">
                    {items.map((item) => (
                      <div key={item.id}>
                        {/* Desktop: Grid layout */}
                        <div className="hidden md:grid grid-cols-12 gap-2">
                          <div className="col-span-3">
                            <AutocompleteInput
                              value={item.description}
                              onChange={(value) => {
                                updateItem(item.id, 'description', value);
                                if (!value) {
                                  updateItem(item.id, 'vatRate', 0);
                                } else {
                                  apiClient.searchInvoiceItemTemplates(value).then((results) => {
                                    const template = results.find((r: any) => r.description === value);
                                    if (template && template.vatRate !== undefined && applyVAT) {
                                      updateItem(item.id, 'vatRate', template.vatRate);
                                    }
                                  });
                                }
                              }}
                              onSearch={async (query) => {
                                const results = await apiClient.searchInvoiceItemTemplates(query);
                                const usedDescriptions = items.filter(i => i.id !== item.id && i.description).map(i => i.description);
                                return results.map((r: any) => r.description).filter((d: string) => !usedDescriptions.includes(d));
                              }}
                              onAddNew={() => handleAddNewItem(item.id)}
                              placeholder="تفاصيل الخدمة"
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                              readOnly={true}
                            />
                          </div>
                          <div className="col-span-2">
                            <input type="number" placeholder="0" value={item.unitPrice || ''} onChange={(e) => updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)} min="0" step="0.01" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm" />
                          </div>
                          <div className="col-span-2">
                            <input type="number" placeholder="1" value={item.quantity || ''} onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)} min="0" step="0.01" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm" />
                          </div>
                          <div className="col-span-2">
                            <input type="number" placeholder="0" value={applyVAT ? (item.vatRate || '') : 0} readOnly min="0" max="100" step="0.01" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium cursor-not-allowed" />
                          </div>
                          <div className="col-span-2">
                            <input type="number" value={item.amount.toFixed(2)} readOnly className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm" />
                          </div>
                          <div className="col-span-1 flex items-center justify-center">
                            <button type="button" onClick={() => removeItem(item.id)} disabled={items.length === 1} className="btn-icon-danger disabled:opacity-50 disabled:cursor-not-allowed">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Mobile: Stacked card layout */}
                        <div className="md:hidden bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 border border-gray-200 dark:border-gray-600 space-y-2">
                          <AutocompleteInput
                            value={item.description}
                            onChange={(value) => {
                              updateItem(item.id, 'description', value);
                              if (!value) { updateItem(item.id, 'vatRate', 0); } else {
                                apiClient.searchInvoiceItemTemplates(value).then((results) => {
                                  const template = results.find((r: any) => r.description === value);
                                  if (template && template.vatRate !== undefined && applyVAT) { updateItem(item.id, 'vatRate', template.vatRate); }
                                });
                              }
                            }}
                            onSearch={async (query) => { const results = await apiClient.searchInvoiceItemTemplates(query); const usedDescriptions = items.filter(i => i.id !== item.id && i.description).map(i => i.description); return results.map((r: any) => r.description).filter((d: string) => !usedDescriptions.includes(d)); }}
                            onAddNew={() => handleAddNewItem(item.id)}
                            placeholder="تفاصيل الخدمة"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                            readOnly={true}
                          />
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <label className="text-[10px] text-gray-500 dark:text-gray-400 mb-0.5 block">سعر الوحدة</label>
                              <input type="number" placeholder="سعر" value={item.unitPrice || ''} onChange={(e) => updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)} min="0" step="0.01" className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-xs" />
                            </div>
                            <div>
                              <label className="text-[10px] text-gray-500 dark:text-gray-400 mb-0.5 block">الكمية</label>
                              <input type="number" placeholder="1" value={item.quantity || ''} onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)} min="0" step="0.01" className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-xs" />
                            </div>
                            <div>
                              <label className="text-[10px] text-gray-500 dark:text-gray-400 mb-0.5 block">الضريبة %</label>
                              <input type="number" placeholder="0" value={applyVAT ? (item.vatRate || '') : 0} readOnly className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 text-xs cursor-not-allowed" />
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-gray-500 dark:text-gray-400">الإجمالي:</span>
                              <span className="text-sm font-bold text-gray-900 dark:text-white">{item.amount.toFixed(2)}</span>
                            </div>
                            <button type="button" onClick={() => removeItem(item.id)} disabled={items.length === 1} className="btn-icon-danger disabled:opacity-50 disabled:cursor-not-allowed">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
                      <div className="space-y-3">
                        <div className="flex justify-between text-gray-700 dark:text-gray-300">
                          <span>الإجمالي قبل الضريبة:</span>
                          <span className="font-semibold">{subtotal.toFixed(2)} ريال</span>
                        </div>
                        <div className="flex justify-between text-gray-700 dark:text-gray-300">
                          <span>مبلغ الضريبة:</span>
                          <span className="font-semibold">{vatAmount.toFixed(2)} ريال</span>
                        </div>
                        <div className="flex justify-between text-lg font-bold text-gray-900 dark:text-white pt-2 border-t border-gray-200 dark:border-gray-700">
                          <span>الإجمالي شامل الضريبة:</span>
                          <span>{total.toFixed(2)} ريال</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingInvoice(null);
                      reset();
                      setItems([{ id: crypto.randomUUID(), description: '', unitPrice: 0, quantity: 1, vatRate: 0, amount: 0 }]);
                      setApplyVAT(false);
                    }}
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
                    {loading ? (editingInvoice ? 'جاري التحديث...' : 'جاري الحفظ...') : (editingInvoice ? 'تحديث الفاتورة' : 'حفظ الفاتورة')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalOverlay>
      )}

      {viewingInvoice && (
        <ViewInvoiceModal
          isOpen={true}
          invoice={viewingInvoice}
          onClose={() => setViewingInvoice(null)}
          onPrint={(id) => {
            setViewingInvoice(null);
            handlePrintPreview(id);
          }}
        />
      )}

      {previewInvoice && (
        <InvoicePreview
          invoice={previewInvoice}
          onClose={() => setPreviewInvoice(null)}
        />
      )}

      <AddInvoiceItemModal
        isOpen={showAddItemModal}
        onClose={() => setShowAddItemModal(false)}
        onItemAdded={handleItemAdded}
      />

      <InvoiceSuccessModal
        isOpen={showSuccessModal}
        invoiceCode={createdInvoice?.code || ''}
        invoiceId={createdInvoice?.id || ''}
        onClose={() => {
          setShowSuccessModal(false);
          setCreatedInvoice(null);
        }}
        onPreview={handleView}
        onPrint={handlePrintPreview}
      />
    </div>
  );
}