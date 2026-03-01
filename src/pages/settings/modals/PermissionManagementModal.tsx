import { useState, useEffect, useMemo } from 'react';
import { apiClient } from '@/lib/api';
import { usePermission } from '@/contexts/PermissionContext';
import ModalOverlay from '@/components/ui/ModalOverlay';
import {
    X,
    Search,
    Shield,
    CheckCircle2,
    Circle,
    Users,
    FileText,
    Ship,
    Wallet,
    UserCog,
    BarChart3,
    Settings as SettingsIcon,
    Eye,
    Plus,
    Edit,
    Trash2,
    Printer,
    Power,
    Lock,
    Unlock,
    AlertCircle,
    Loader2
} from 'lucide-react';
import { showSuccess, showError, showConfirm } from '@/lib/toast';

interface User {
    id: string;
    username: string;
    fullName?: string;
    isAdmin: boolean;
}

interface Permission {
    id: string;
    code: string;
    screen: string;
    subScreen?: string;
    action: string;
    nameAr: string;
    nameEn: string;
    description?: string;
    category: string;
    isViewPermission: boolean;
}

interface PermissionManagementModalProps {
    user: User;
    onClose: () => void;
}

// Screen categories with icons and colors
const screenCategories = [
    { key: 'customers', nameAr: 'العملاء', icon: Users, color: 'blue' },
    { key: 'invoices', nameAr: 'الفواتير', icon: FileText, color: 'green' },
    { key: 'shipping_agents', nameAr: 'الوكلاء', icon: Ship, color: 'cyan' },
    { key: 'accounts', nameAr: 'الحسابات', icon: Wallet, color: 'purple' },
    { key: 'employees', nameAr: 'الموظفين', icon: UserCog, color: 'orange' },
    { key: 'reports', nameAr: 'التقارير', icon: BarChart3, color: 'pink' },
    { key: 'settings', nameAr: 'الإعدادات', icon: SettingsIcon, color: 'gray' },
    { key: 'users', nameAr: 'المستخدمين', icon: Users, color: 'red' },
];

// Action icons mapping
const actionIcons: Record<string, any> = {
    view: Eye,
    create: Plus,
    edit: Edit,
    delete: Trash2,
    print: Printer,
    preview: Eye,
    activate_deactivate: Power,
    access: Eye,
    manage_permissions: Lock,
    carry_forward: Unlock,
    carry_forward_all: Unlock,
    create_batch: Plus,
    view_details: Eye,
    approve: CheckCircle2,
};

export default function PermissionManagementModal({ user, onClose }: PermissionManagementModalProps) {
    const { isSuperAdmin: currentUserIsSuperAdmin } = usePermission();
    const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
    const [userPermissions, setUserPermissions] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('customers');
    const [searchQuery, setSearchQuery] = useState('');
    const [pendingChanges, setPendingChanges] = useState<Set<string>>(new Set());

    // Super admin can edit anyone's permissions, otherwise admin users are read-only
    const isReadOnly = user.isAdmin && !currentUserIsSuperAdmin;

    // Hide 'users' tab for non-admin target users (users permissions = admin level)
    const availableScreens = user.isAdmin
        ? screenCategories
        : screenCategories.filter(s => s.key !== 'users');

    useEffect(() => {
        loadData();
    }, [user.id]);

    const loadData = async () => {
        try {
            setLoading(true);
            const [permissionsData, userPermsData] = await Promise.all([
                apiClient.getAllPermissionDefinitions(),
                apiClient.getUserPermissions(user.id),
            ]);

            setAllPermissions(permissionsData);

            const userPermCodes = userPermsData.permissions.map((p: any) => {
                if (typeof p === 'string') return p;
                if (p && p.code) return p.code;
                if (p && p.permission && p.permission.code) return p.permission.code;
                return null;
            }).filter(Boolean);

            setUserPermissions(userPermCodes);
        } catch (error: any) {
            console.error('[PermissionModal] Error loading permissions:', error);
            showError('حدث خطأ أثناء تحميل الصلاحيات');
        } finally {
            setLoading(false);
        }
    };

    // Group permissions by screen and subScreen
    const groupedPermissions = useMemo(() => {
        const filtered = allPermissions.filter(p => {
            if (searchQuery) {
                return p.nameAr.includes(searchQuery) ||
                    p.nameEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    p.code.includes(searchQuery);
            }
            return true;
        });

        const grouped: Record<string, Record<string, Permission[]>> = {};

        filtered.forEach(permission => {
            if (!grouped[permission.screen]) {
                grouped[permission.screen] = {};
            }

            const subKey = permission.subScreen || 'main';
            if (!grouped[permission.screen][subKey]) {
                grouped[permission.screen][subKey] = [];
            }

            grouped[permission.screen][subKey].push(permission);
        });

        return grouped;
    }, [allPermissions, searchQuery]);

    // Calculate statistics
    const stats = useMemo(() => {
        const screenPerms = groupedPermissions[activeTab] || {};
        const allPermsInScreen = Object.values(screenPerms).flat();
        const grantedInScreen = allPermsInScreen.filter(p => userPermissions.includes(p.code)).length;

        return {
            total: allPermissions.length,
            granted: userPermissions.length,
            screenTotal: allPermsInScreen.length,
            screenGranted: grantedInScreen,
        };
    }, [allPermissions, userPermissions, activeTab, groupedPermissions]);

    const handleTogglePermission = async (permissionCode: string) => {
        if (isReadOnly) {
            showError('لا يمكن تعديل صلاحيات مدير النظام');
            return;
        }

        const isGranted = userPermissions.includes(permissionCode);

        try {
            setSaving(true);

            if (isGranted) {
                await apiClient.revokePermission(user.id, permissionCode);
                setUserPermissions(prev => prev.filter(p => p !== permissionCode));
                showSuccess('تم إلغاء الصلاحية');
            } else {
                await apiClient.grantPermission(user.id, permissionCode);
                // Auto-grant view permission logic
                const permission = allPermissions.find(p => p.code === permissionCode);
                if (permission && !permission.isViewPermission) {
                    const viewPermCode = `${permission.screen}${permission.subScreen ? '.' + permission.subScreen : ''}.view`;
                    if (!userPermissions.includes(viewPermCode)) {
                        setUserPermissions(prev => [...prev, permissionCode, viewPermCode]);
                    } else {
                        setUserPermissions(prev => [...prev, permissionCode]);
                    }
                } else {
                    setUserPermissions(prev => [...prev, permissionCode]);
                }
                showSuccess('تم منح الصلاحية');
            }

            setPendingChanges(prev => {
                const newSet = new Set(prev);
                newSet.add(permissionCode);
                return newSet;
            });

            // Fire a single notification
            try { await apiClient.notifyPermissionChange(user.id); } catch (e) { /* ignore */ }
        } catch (error: any) {
            const message = error.response?.data?.message || 'حدث خطأ';
            showError(message);
        } finally {
            setSaving(false);
        }
    };

    const handleSelectAll = async (screen: string) => {
        if (isReadOnly) return;

        const screenPerms = groupedPermissions[screen] || {};
        const allPermsInScreen = Object.values(screenPerms).flat();
        const allCodes = allPermsInScreen.map(p => p.code);
        const allGranted = allCodes.every(code => userPermissions.includes(code));

        showConfirm(
            allGranted
                ? `إلغاء جميع صلاحيات ${screenCategories.find(s => s.key === screen)?.nameAr}؟`
                : `منح جميع صلاحيات ${screenCategories.find(s => s.key === screen)?.nameAr}؟`,
            async () => {
                try {
                    setSaving(true);

                    if (allGranted) {
                        for (const code of allCodes) {
                            if (userPermissions.includes(code)) await apiClient.revokePermission(user.id, code);
                        }
                        setUserPermissions(prev => prev.filter(p => !allCodes.includes(p)));
                        showSuccess('تم إلغاء الكل');
                    } else {
                        for (const code of allCodes) {
                            if (!userPermissions.includes(code)) await apiClient.grantPermission(user.id, code);
                        }
                        setUserPermissions(prev => {
                            const newPerms = new Set([...prev, ...allCodes]);
                            return Array.from(newPerms);
                        });
                        showSuccess('تم منح الكل');
                    }

                    // Fire a single notification
                    try { await apiClient.notifyPermissionChange(user.id); } catch (e) { /* ignore */ }
                } catch (error: any) {
                    showError('حدث خطأ');
                } finally {
                    setSaving(false);
                }
            }
        );
    };

    const handleQuickPreset = async (preset: 'view_only' | 'full_access' | 'remove_all') => {
        if (isReadOnly) return;

        const message = preset === 'view_only'
            ? 'منح صلاحيات العرض فقط للكل؟'
            : preset === 'full_access'
                ? 'منح صلاحيات كاملة للكل؟'
                : 'إلغاء جميع الصلاحيات؟ سيتم إزالة كل الصلاحيات الممنوحة.';

        showConfirm(message, async () => {
            try {
                setSaving(true);
                const shouldExcludeUsers = !user.isAdmin; // Non-admin users should not get users.* permissions
                const targetPermissions = preset === 'view_only'
                    ? allPermissions.filter(p => p.isViewPermission && (!shouldExcludeUsers || p.screen !== 'users'))
                    : preset === 'full_access'
                        ? allPermissions.filter(p => !shouldExcludeUsers || p.screen !== 'users')
                        : []; // remove_all = empty

                // Revoke all first
                for (const code of userPermissions) {
                    await apiClient.revokePermission(user.id, code);
                }

                // Grant target permissions (empty for remove_all)
                for (const perm of targetPermissions) {
                    await apiClient.grantPermission(user.id, perm.code);
                }

                setUserPermissions(targetPermissions.map(p => p.code));
                showSuccess(preset === 'remove_all' ? 'تم إلغاء جميع الصلاحيات' : 'تم تطبيق الإعداد');

                // Fire a single notification
                try { await apiClient.notifyPermissionChange(user.id); } catch (e) { /* ignore */ }
            } catch (error: any) {
                showError('حدث خطأ');
            } finally {
                setSaving(false);
            }
        });
    };

    const renderPermissionToggle = (permission: Permission) => {
        const isGranted = userPermissions.includes(permission.code);
        const ActionIcon = actionIcons[permission.action] || Circle;
        const isPending = pendingChanges.has(permission.code);

        return (
            <div
                key={permission.code}
                className={`
                    group relative p-3 rounded-xl border cursor-pointer select-none
                    ${isGranted
                        ? 'border-green-500 bg-green-50/50 dark:bg-green-900/10'
                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
                    }
                    ${isReadOnly ? 'opacity-60 cursor-not-allowed' : ''}
                    ${isPending ? 'ring-1 ring-blue-500' : ''}
                `}
                onClick={() => !isReadOnly && handleTogglePermission(permission.code)}
            >
                <div className="flex items-center gap-3">
                    <div className={`
                        p-1.5 rounded-lg shrink-0
                        ${isGranted
                            ? 'bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                        }
                    `}>
                        <ActionIcon className="w-4 h-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                            <div className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
                                {permission.nameAr}
                            </div>
                            {isGranted ? (
                                <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" />
                            ) : (
                                <Circle className="w-4 h-4 text-gray-300 dark:text-gray-600 shrink-0" />
                            )}
                        </div>
                        {permission.description && (
                            <div className="text-[10px] text-gray-500 dark:text-gray-400 truncate mt-0.5">
                                {permission.description}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <ModalOverlay>
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-6xl w-full overflow-hidden scale-100 h-[85vh] flex flex-col">

                {/* Header - Compact & Right Aligned */}
                <div className="relative bg-purple-50 dark:bg-purple-950/30 p-4 border-b border-purple-100 dark:border-purple-900/50 shrink-0 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center shadow-sm">
                            <Shield className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        </div>

                        <div className="flex items-baseline gap-3">
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                                إدارة صلاحيات المستخدم
                            </h2>
                            <span className="text-gray-400">|</span>
                            <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                صلاحيات المستخدم: <span className="text-purple-700 dark:text-purple-300 font-bold">{user.fullName || user.username}</span>
                            </div>
                            {user.isAdmin && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
                                    <Shield className="w-3 h-3" />
                                    مدير النظام
                                </span>
                            )}
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-200 transition-colors bg-white/50 dark:bg-black/20 p-2 rounded-full hover:bg-white dark:hover:bg-gray-700"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {isReadOnly && (
                    <div className="mx-6 mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl flex items-center gap-3 text-sm shrink-0">
                        <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
                        <span className="text-yellow-800 dark:text-yellow-200">
                            هذا المستخدم مدير نظام ولديه صلاحيات كاملة. لا يمكن التعديل.
                        </span>
                    </div>
                )}

                {/* Tabs & Actions Bar */}
                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700/50 flex flex-col gap-4 shrink-0 bg-gray-50/50 dark:bg-gray-900/20">
                    {/* Top Actions: Search & Presets */}
                    <div className="flex items-center justify-between gap-4">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="بحث سريع..."
                                className="w-full pr-9 pl-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 dark:bg-gray-800/50"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => handleQuickPreset('remove_all')}
                                disabled={saving || isReadOnly}
                                className="px-3 py-1.5 text-xs font-medium bg-red-50 text-red-700 rounded-lg hover:bg-red-100 border border-red-100 transition-colors disabled:opacity-50"
                            >
                                إلغاء الكل
                            </button>
                            <button
                                onClick={() => handleQuickPreset('view_only')}
                                disabled={saving || isReadOnly}
                                className="px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 border border-blue-100 transition-colors disabled:opacity-50"
                            >
                                عرض فقط
                            </button>
                            <button
                                onClick={() => handleQuickPreset('full_access')}
                                disabled={saving || isReadOnly}
                                className="px-3 py-1.5 text-xs font-medium bg-green-50 text-green-700 rounded-lg hover:bg-green-100 border border-green-100 transition-colors disabled:opacity-50"
                            >
                                كاملة
                            </button>
                        </div>
                    </div>

                    {/* Scrollable Tabs */}
                    <div className="flex gap-2 overflow-x-auto p-1 scrollbar-hide">
                        {availableScreens.map((screen) => {
                            const Icon = screen.icon;
                            const isActive = activeTab === screen.key;
                            const screenPerms = groupedPermissions[screen.key] || {};
                            const allPermsInScreen = Object.values(screenPerms).flat();
                            const grantedCount = allPermsInScreen.filter(p => userPermissions.includes(p.code)).length;

                            return (
                                <button
                                    key={screen.key}
                                    onClick={() => setActiveTab(screen.key)}
                                    className={`
                                        flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap
                                        ${isActive
                                            ? `bg-${screen.color}-100 dark:bg-${screen.color}-900/30 text-${screen.color}-700 dark:text-${screen.color}-300 ring-1 ring-${screen.color}-500/20`
                                            : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 border border-gray-100 dark:border-gray-700'
                                        }
                                    `}
                                >
                                    <Icon className="w-4 h-4" />
                                    <span>{screen.nameAr}</span>
                                    <span className={`
                                        text-[10px] px-1.5 py-0.5 rounded-full ml-1
                                        ${isActive
                                            ? `bg-${screen.color}-200 dark:bg-${screen.color}-800`
                                            : 'bg-gray-100 dark:bg-gray-700'
                                        }
                                    `}>
                                        {grantedCount}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Main Content Areas */}
                <div className="p-6 overflow-y-auto flex-1 bg-gray-50/30 dark:bg-gray-900/10">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                            <Loader2 className="w-8 h-8 animate-spin mb-2" />
                            <span className="text-sm">جاري التحميل...</span>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {Object.entries(groupedPermissions[activeTab] || {}).length === 0 ? (
                                <div className="text-center py-12 text-gray-400 text-sm">
                                    لا توجد صلاحيات لعرضها
                                </div>
                            ) : (
                                Object.entries(groupedPermissions[activeTab] || {}).map(([subKey, permissions]) => (
                                    <div key={subKey} className="space-y-3">
                                        {subKey !== 'main' && (
                                            <div className="flex items-center gap-2">
                                                <div className="h-4 w-1 bg-purple-500 rounded-full"></div>
                                                <h4 className="font-semibold text-gray-800 dark:text-gray-200 text-sm">
                                                    {permissions[0]?.subScreen || subKey}
                                                </h4>
                                            </div>
                                        )}
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                            {permissions.map(renderPermissionToggle)}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shrink-0 flex items-center justify-between">
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                        {saving ? (
                            <span className="flex items-center gap-2 text-purple-600">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                جاري الحفظ...
                            </span>
                        ) : (
                            <span>
                                تم منح {stats.granted} من أصل {stats.total} صلاحية
                            </span>
                        )}
                    </div>

                    <div className="flex gap-2">
                        {!isReadOnly && (
                            <button
                                onClick={() => handleSelectAll(activeTab)}
                                disabled={saving}
                                className="px-4 py-2 text-xs font-medium text-purple-700 hover:bg-purple-50 rounded-xl transition-colors disabled:opacity-50"
                            >
                                تحديد الكل لهذا القسم
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="px-6 py-2 bg-gray-900 dark:bg-gray-700 text-white text-xs font-medium rounded-xl hover:bg-gray-800 transition-colors shadow-lg shadow-gray-200 dark:shadow-none"
                        >
                            إغلاق
                        </button>
                    </div>
                </div>
            </div>
        </ModalOverlay>
    );
}
