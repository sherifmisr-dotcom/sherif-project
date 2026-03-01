import { useState, useEffect, useRef } from 'react';
import { Database, Download, RefreshCw, Trash2, Clock, Calendar, HardDrive, CheckCircle, XCircle, Loader2, Save, Upload, FileUp, X, ChevronDown } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { showSuccess, showError, showConfirm } from '@/lib/toast';

interface Backup {
    id: string;
    filename: string;
    size: string;
    type: 'MANUAL' | 'AUTOMATIC' | 'UPLOADED';
    status: 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
    description?: string;
    createdBy?: string;
    createdAt: string;
}

interface BackupSettingsData {
    autoBackupEnabled: boolean;
    autoBackupFrequency: string;
    autoBackupTime: string;
    backupRetentionDays: number;
}

const frequencyOptions = [
    { value: 'DAILY', label: 'يومي' },
    { value: 'WEEKLY', label: 'أسبوعي' },
    { value: 'MONTHLY', label: 'شهري' },
];

export default function BackupSettings() {
    const [backups, setBackups] = useState<Backup[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [settings, setSettings] = useState<BackupSettingsData>({
        autoBackupEnabled: false,
        autoBackupFrequency: 'DAILY',
        autoBackupTime: '02:00',
        backupRetentionDays: 30,
    });
    const [savingSettings, setSavingSettings] = useState(false);
    const [description, setDescription] = useState('');
    const [uploadDescription, setUploadDescription] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Custom dropdown state for frequency
    const [isFrequencyDropdownOpen, setIsFrequencyDropdownOpen] = useState(false);
    const frequencyDropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        loadBackups();
        loadSettings();
    }, [page]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (frequencyDropdownRef.current && !frequencyDropdownRef.current.contains(event.target as Node)) {
                setIsFrequencyDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const loadBackups = async () => {
        try {
            setLoading(true);
            const response = await apiClient.getBackupHistory({ page, limit: 10 });
            setBackups(response.data);
            setTotalPages(response.pagination.totalPages);
        } catch (error) {
            console.error('Error loading backups:', error);
            showError('فشل تحميل سجل النسخ الاحتياطية');
        } finally {
            setLoading(false);
        }
    };

    const loadSettings = async () => {
        try {
            const response = await apiClient.getBackupSettings();
            if (response) {
                setSettings(response);
            }
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    };

    const handleCreateBackup = async () => {
        try {
            setCreating(true);
            await apiClient.createBackup(description || undefined);
            showSuccess('تم إنشاء النسخة الاحتياطية بنجاح');
            setDescription('');
            loadBackups();
        } catch (error) {
            console.error('Error creating backup:', error);
            showError('فشل إنشاء النسخة الاحتياطية');
        } finally {
            setCreating(false);
        }
    };

    const handleUploadBackup = async () => {
        if (!selectedFile) {
            showError('يرجى اختيار ملف النسخة الاحتياطية');
            return;
        }
        try {
            setUploading(true);
            await apiClient.uploadBackup(selectedFile, uploadDescription || undefined);
            showSuccess('تم رفع النسخة الاحتياطية بنجاح');
            setSelectedFile(null);
            setUploadDescription('');
            if (fileInputRef.current) fileInputRef.current.value = '';
            loadBackups();
        } catch (error) {
            console.error('Error uploading backup:', error);
            showError('فشل رفع النسخة الاحتياطية');
        } finally {
            setUploading(false);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (!file.name.endsWith('.sql')) {
                showError('يُسمح فقط بملفات .sql');
                e.target.value = '';
                return;
            }
            setSelectedFile(file);
        }
    };

    const handleDownload = async (backup: Backup) => {
        try {
            const blob = await apiClient.downloadBackup(backup.id);
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = backup.filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error downloading backup:', error);
            showError('فشل تحميل النسخة الاحتياطية');
        }
    };

    const handleRestore = async (backup: Backup) => {
        showConfirm(
            'هل أنت متأكد من استعادة هذه النسخة الاحتياطية؟\n\nسيتم استبدال جميع البيانات الحالية.',
            async () => {
                try {
                    await apiClient.restoreBackup(backup.id);
                    showSuccess('تم استعادة النسخة الاحتياطية بنجاح');
                    setTimeout(() => {
                        window.location.reload();
                    }, 2000);
                } catch (error) {
                    console.error('Error restoring backup:', error);
                    showError('فشل استعادة النسخة الاحتياطية');
                }
            }
        );
    };

    const handleDelete = async (backup: Backup) => {
        showConfirm(
            'هل أنت متأكد من حذف هذه النسخة الاحتياطية؟',
            async () => {
                try {
                    await apiClient.deleteBackup(backup.id);
                    showSuccess('تم حذف النسخة الاحتياطية بنجاح');
                    loadBackups();
                } catch (error) {
                    console.error('Error deleting backup:', error);
                    showError('فشل حذف النسخة الاحتياطية');
                }
            }
        );
    };

    const handleSaveSettings = async () => {
        try {
            setSavingSettings(true);
            await apiClient.updateBackupSettings(settings);
            showSuccess('تم حفظ الإعدادات بنجاح');
        } catch (error) {
            console.error('Error saving settings:', error);
            showError('فشل حفظ الإعدادات');
        } finally {
            setSavingSettings(false);
        }
    };

    const formatFileSize = (bytes: string): string => {
        const size = Number(bytes);
        if (size < 1024) return size + ' B';
        if (size < 1024 * 1024) return (size / 1024).toFixed(2) + ' KB';
        return (size / (1024 * 1024)).toFixed(2) + ' MB';
    };

    const formatDate = (dateString: string): string => {
        const date = new Date(dateString);
        return date.toLocaleString('ar-SA', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getTypeBadge = (type: string) => {
        switch (type) {
            case 'MANUAL':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                        <HardDrive className="w-3 h-3" />
                        يدوي
                    </span>
                );
            case 'AUTOMATIC':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        <Clock className="w-3 h-3" />
                        تلقائي
                    </span>
                );
            case 'UPLOADED':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400">
                        <Upload className="w-3 h-3" />
                        مرفوعة
                    </span>
                );
            default:
                return null;
        }
    };

    const selectedFrequencyLabel = frequencyOptions.find(o => o.value === settings.autoBackupFrequency)?.label || 'يومي';

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg shadow-indigo-500/20">
                    <Database className="w-6 h-6 text-white" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">النسخ الاحتياطي</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">إنشاء ورفع واستعادة النسخ الاحتياطية لقاعدة البيانات</p>
                </div>
            </div>

            {/* Row 1: Manual Backup + Upload Backup — Side by Side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Manual Backup Card */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="px-5 py-4 bg-gradient-to-l from-blue-50 to-white dark:from-blue-900/10 dark:to-gray-800 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                <HardDrive className="w-4.5 h-4.5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-gray-900 dark:text-white">إنشاء نسخة احتياطية</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400">إنشاء نسخة فورية من قاعدة البيانات</p>
                            </div>
                        </div>
                    </div>
                    <div className="p-5 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                وصف النسخة <span className="text-gray-400 font-normal">(اختياري)</span>
                            </label>
                            <input
                                type="text"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="مثال: نسخة قبل التحديث"
                                className="w-full px-3.5 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-colors"
                            />
                        </div>
                        <button
                            onClick={handleCreateBackup}
                            disabled={creating}
                            className="w-full flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-l from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg font-medium text-sm shadow-sm hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {creating ? (
                                <>
                                    <Loader2 className="w-4.5 h-4.5 animate-spin" />
                                    <span>جاري الإنشاء...</span>
                                </>
                            ) : (
                                <>
                                    <Database className="w-4.5 h-4.5" />
                                    <span>إنشاء نسخة احتياطية الآن</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Upload Backup Card — Teal/Cyan Theme */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="px-5 py-4 bg-gradient-to-l from-teal-50 to-white dark:from-teal-900/10 dark:to-gray-800 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 bg-teal-100 dark:bg-teal-900/30 rounded-lg">
                                <FileUp className="w-4.5 h-4.5 text-teal-600 dark:text-teal-400" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-gray-900 dark:text-white">رفع نسخة احتياطية</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400">رفع ملف نسخة احتياطية (.sql) من جهازك</p>
                            </div>
                        </div>
                    </div>
                    <div className="p-5 space-y-4">
                        {/* File Drop Zone */}
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className="relative cursor-pointer border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 text-center hover:border-teal-400 dark:hover:border-teal-500 transition-colors group"
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".sql"
                                onChange={handleFileSelect}
                                className="hidden"
                            />
                            {selectedFile ? (
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-2 text-right min-w-0">
                                        <div className="p-1.5 bg-teal-100 dark:bg-teal-900/30 rounded-md flex-shrink-0">
                                            <Database className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{selectedFile.name}</p>
                                            <p className="text-xs text-gray-500">{formatFileSize(selectedFile.size.toString())}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedFile(null);
                                            if (fileInputRef.current) fileInputRef.current.value = '';
                                        }}
                                        className="p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md text-red-500 flex-shrink-0"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ) : (
                                <div className="py-1">
                                    <Upload className="w-7 h-7 text-gray-400 group-hover:text-teal-500 mx-auto mb-1.5 transition-colors" />
                                    <p className="text-sm text-gray-600 dark:text-gray-400 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                                        اضغط لاختيار ملف <span className="font-semibold">.sql</span>
                                    </p>
                                    <p className="text-xs text-gray-400 mt-0.5">الحد الأقصى: 100 ميجابايت</p>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={handleUploadBackup}
                            disabled={!selectedFile || uploading}
                            className="w-full flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-l from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white rounded-lg font-medium text-sm shadow-sm hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {uploading ? (
                                <>
                                    <Loader2 className="w-4.5 h-4.5 animate-spin" />
                                    <span>جاري الرفع...</span>
                                </>
                            ) : (
                                <>
                                    <FileUp className="w-4.5 h-4.5" />
                                    <span>رفع النسخة الاحتياطية</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Row 2: Automatic Backup Settings — Compact Layout */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="px-5 py-4 bg-gradient-to-l from-green-50 to-white dark:from-green-900/10 dark:to-gray-800 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                                <Clock className="w-4.5 h-4.5 text-green-600 dark:text-green-400" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-gray-900 dark:text-white">النسخ الاحتياطي التلقائي</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400">إنشاء نسخ احتياطية تلقائية حسب الجدول المحدد</p>
                            </div>
                        </div>
                        {/* Toggle Switch */}
                        <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                            <input
                                type="checkbox"
                                checked={settings.autoBackupEnabled}
                                onChange={(e) =>
                                    setSettings({ ...settings, autoBackupEnabled: e.target.checked })
                                }
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 dark:peer-focus:ring-green-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-500"></div>
                        </label>
                    </div>
                </div>

                <div className="p-5">
                    {settings.autoBackupEnabled && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
                            {/* Frequency — Custom Dropdown */}
                            <div ref={frequencyDropdownRef} className="relative">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                    التكرار
                                </label>
                                <button
                                    type="button"
                                    onClick={() => setIsFrequencyDropdownOpen(!isFrequencyDropdownOpen)}
                                    className={`w-full flex items-center justify-between px-4 py-2.5 border rounded-lg text-right transition-all duration-200
                                    ${isFrequencyDropdownOpen
                                            ? 'border-blue-500 ring-2 ring-blue-500/20 dark:border-blue-400 dark:ring-blue-400/20'
                                            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                                        }
                                    bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm`}
                                >
                                    <span>{selectedFrequencyLabel}</span>
                                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isFrequencyDropdownOpen ? 'rotate-180' : ''}`} />
                                </button>
                                {isFrequencyDropdownOpen && (
                                    <div className="absolute z-50 mt-1.5 w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl shadow-xl shadow-black/10 dark:shadow-black/30 overflow-hidden"
                                        style={{ animation: 'dropdownIn 0.15s ease-out' }}
                                    >
                                        <ul className="py-1">
                                            {frequencyOptions.map((opt) => (
                                                <li key={opt.value}>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setSettings({ ...settings, autoBackupFrequency: opt.value });
                                                            setIsFrequencyDropdownOpen(false);
                                                        }}
                                                        className={`w-full text-right px-4 py-2.5 text-sm transition-colors duration-100
                                                        ${settings.autoBackupFrequency === opt.value
                                                                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium'
                                                                : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600/50'
                                                            }`}
                                                    >
                                                        {opt.label}
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>

                            {/* Time */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                    وقت النسخ
                                </label>
                                <input
                                    type="time"
                                    value={settings.autoBackupTime}
                                    onChange={(e) =>
                                        setSettings({ ...settings, autoBackupTime: e.target.value })
                                    }
                                    className="w-full px-3.5 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:text-white transition-colors"
                                />
                            </div>

                            {/* Retention */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                    الاحتفاظ (أيام)
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    value={settings.backupRetentionDays}
                                    onChange={(e) =>
                                        setSettings({
                                            ...settings,
                                            backupRetentionDays: parseInt(e.target.value) || 30,
                                        })
                                    }
                                    className="w-full px-3.5 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:text-white transition-colors"
                                />
                            </div>
                        </div>
                    )}

                    <div className="flex items-center justify-between">
                        {settings.autoBackupEnabled && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                سيتم حذف النسخ التلقائية الأقدم من <span className="font-semibold text-gray-700 dark:text-gray-300">{settings.backupRetentionDays}</span> يوم تلقائياً
                            </p>
                        )}
                        <button
                            onClick={handleSaveSettings}
                            disabled={savingSettings}
                            className={`flex items-center gap-2 px-5 py-2.5 bg-gradient-to-l from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-lg font-medium text-sm shadow-sm hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed ${!settings.autoBackupEnabled ? 'mr-auto' : ''}`}
                        >
                            {savingSettings ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>جاري الحفظ...</span>
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4" />
                                    <span>حفظ الإعدادات</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Row 3: Backup History */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="px-5 py-4 bg-gradient-to-l from-amber-50 to-white dark:from-amber-900/10 dark:to-gray-800 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                            <Calendar className="w-4.5 h-4.5 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-gray-900 dark:text-white">سجل النسخ الاحتياطية</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">جميع النسخ الاحتياطية المنشأة والمرفوعة</p>
                        </div>
                    </div>
                </div>

                <div className="p-5">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                        </div>
                    ) : backups.length === 0 ? (
                        <div className="text-center py-12">
                            <Database className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                            <p className="text-gray-500 dark:text-gray-400 font-medium">لا توجد نسخ احتياطية</p>
                            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">قم بإنشاء أو رفع نسخة احتياطية للبدء</p>
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-gray-200 dark:border-gray-700">
                                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                اسم الملف
                                            </th>
                                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                النوع
                                            </th>
                                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                الحجم
                                            </th>
                                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                التاريخ
                                            </th>
                                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                الحالة
                                            </th>
                                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                الإجراءات
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                                        {backups.map((backup) => (
                                            <tr key={backup.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors">
                                                <td className="px-4 py-3.5 text-sm text-gray-900 dark:text-white">
                                                    <div>
                                                        <div className="font-medium text-sm">{backup.filename}</div>
                                                        {backup.description && (
                                                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                                                {backup.description}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3.5 text-sm">
                                                    {getTypeBadge(backup.type)}
                                                </td>
                                                <td className="px-4 py-3.5 text-sm font-medium text-gray-700 dark:text-gray-300 tabular-nums">
                                                    {formatFileSize(backup.size)}
                                                </td>
                                                <td className="px-4 py-3.5 text-sm text-gray-600 dark:text-gray-400 tabular-nums">
                                                    {formatDate(backup.createdAt)}
                                                </td>
                                                <td className="px-4 py-3.5 text-sm">
                                                    {backup.status === 'COMPLETED' ? (
                                                        <span className="inline-flex items-center gap-1.5 text-green-600 dark:text-green-400 font-medium">
                                                            <CheckCircle className="w-4 h-4" />
                                                            مكتمل
                                                        </span>
                                                    ) : backup.status === 'FAILED' ? (
                                                        <span className="inline-flex items-center gap-1.5 text-red-600 dark:text-red-400 font-medium">
                                                            <XCircle className="w-4 h-4" />
                                                            فشل
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1.5 text-yellow-600 dark:text-yellow-400 font-medium">
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                            جاري...
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3.5 text-sm">
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            onClick={() => handleDownload(backup)}
                                                            disabled={backup.status !== 'COMPLETED'}
                                                            className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                                            title="تحميل"
                                                        >
                                                            <Download className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleRestore(backup)}
                                                            disabled={backup.status !== 'COMPLETED'}
                                                            className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                                            title="استعادة"
                                                        >
                                                            <RefreshCw className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(backup)}
                                                            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                            title="حذف"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-center gap-3 mt-5 pt-4 border-t border-gray-200 dark:border-gray-700">
                                    <button
                                        onClick={() => setPage(page - 1)}
                                        disabled={page === 1}
                                        className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        السابق
                                    </button>
                                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                        صفحة {page} من {totalPages}
                                    </span>
                                    <button
                                        onClick={() => setPage(page + 1)}
                                        disabled={page === totalPages}
                                        className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        التالي
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
