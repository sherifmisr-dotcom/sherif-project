import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import { Users, Plus, Edit, Key, Trash2, Power, Shield, Settings } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { showSuccess, showError, showConfirm } from '@/lib/toast';
import { Protected } from '@/components/permissions/Protected';
import AddUserModal from './modals/AddUserModal';
import EditUserModal from './modals/EditUserModal';
import ChangePasswordModal from './modals/ChangePasswordModal';
import PermissionManagementModal from './modals/PermissionManagementModal';
import { format } from 'date-fns';

interface User {
    id: string;
    username: string;
    fullName?: string;
    email?: string;
    isActive: boolean;
    isAdmin: boolean;
    isSuperAdmin?: boolean;
    createdAt: Date;
}

export default function UserManagement() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [showPermissionsModal, setShowPermissionsModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const { user: currentUser } = useAuth();
    const isAdmin = currentUser?.isAdmin || false;

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        try {
            setLoading(true);
            const data = await apiClient.getUsers();
            setUsers(data);
        } catch (error: any) {
            console.error('Error loading users:', error);
            if (error.response?.status === 403) {
                showError('ليس لديك صلاحية لعرض المستخدمين');
            } else {
                showError('حدث خطأ أثناء تحميل المستخدمين');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleToggleActive = async (user: User) => {
        showConfirm(
            `هل تريد ${user.isActive ? 'تعطيل' : 'تفعيل'} المستخدم ${user.username}؟`,
            async () => {
                try {
                    await apiClient.toggleUserActive(user.id, !user.isActive);
                    showSuccess(`تم ${user.isActive ? 'تعطيل' : 'تفعيل'} المستخدم بنجاح`);
                    loadUsers();
                } catch (error: any) {
                    const message = error.response?.data?.message || 'حدث خطأ';
                    if (message.includes('own account')) {
                        showError('لا يمكنك تعطيل حسابك الخاص');
                    } else {
                        showError(message);
                    }
                }
            }
        );
    };

    const handleDelete = async (user: User) => {
        if (!isAdmin) return;
        showConfirm(
            `هل أنت متأكد من حذف المستخدم ${user.username}؟ هذا الإجراء لا يمكن التراجع عنه.`,
            async () => {
                try {
                    await apiClient.deleteUser(user.id);
                    showSuccess('تم حذف المستخدم بنجاح');
                    loadUsers();
                } catch (error: any) {
                    const message = error.response?.data?.message || 'حدث خطأ';
                    if (message.includes('own account')) {
                        showError('لا يمكنك حذف حسابك الخاص');
                    } else if (message.includes('last admin')) {
                        showError('لا يمكن حذف آخر مستخدم مدير');
                    } else {
                        showError(message);
                    }
                }
            }
        );
    };

    const handleEdit = (user: User) => {
        if (!isAdmin) return;
        setSelectedUser(user);
        setShowEditModal(true);
    };

    const handleChangePassword = (user: User) => {
        setSelectedUser(user);
        setShowPasswordModal(true);
    };

    const handleManagePermissions = (user: User) => {
        setSelectedUser(user);
        setShowPermissionsModal(true);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Users className="w-6 h-6 text-blue-600" />
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                        إدارة المستخدمين
                    </h2>
                </div>
                {/* Requirement 8.3: Create User permission */}
                <Protected permission="users.create">
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="btn-primary"
                    >
                        <Plus className="w-5 h-5" />
                        إضافة مستخدم
                    </button>
                </Protected>
            </div>

            {/* Users Table */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">
                                    اسم المستخدم
                                </th>
                                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">
                                    الاسم الكامل
                                </th>
                                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">
                                    البريد الإلكتروني
                                </th>
                                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">
                                    الصلاحية
                                </th>
                                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">
                                    الحالة
                                </th>
                                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">
                                    تاريخ الإنشاء
                                </th>
                                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">
                                    الإجراءات
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                                        جاري التحميل...
                                    </td>
                                </tr>
                            ) : users.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                                        لا يوجد مستخدمين
                                    </td>
                                </tr>
                            ) : (
                                users.map((user) => (
                                    <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                        <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                                            {user.username}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                                            {user.fullName || '-'}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400" dir="ltr">
                                            {user.email || '-'}
                                        </td>
                                        <td className="px-4 py-3 text-sm">
                                            {user.isSuperAdmin ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                                                    <Shield className="w-3 h-3" />
                                                    المسؤول الرئيسي
                                                </span>
                                            ) : user.isAdmin ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
                                                    <Shield className="w-3 h-3" />
                                                    مدير النظام
                                                </span>
                                            ) : (
                                                <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                                                    مستخدم
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-sm">
                                            {user.isActive ? (
                                                <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                                                    نشط
                                                </span>
                                            ) : (
                                                <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300">
                                                    معطل
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                                            {format(new Date(user.createdAt), 'dd/MM/yyyy')}
                                        </td>
                                        <td className="px-4 py-3 text-sm">
                                            <div className="flex items-center gap-2">
                                                {/* Show message for Super Admin instead of action buttons */}
                                                {user.isSuperAdmin ? (
                                                    <span className="text-xs text-gray-500 dark:text-gray-400 italic">
                                                        لا يمكن تعديل المسؤول الرئيسي
                                                    </span>
                                                ) : (
                                                    <>
                                                        {/* Requirement 8.9: Manage User Permissions - only for non-admin users */}
                                                        {!user.isAdmin ? (
                                                            <Protected permission="users.manage_permissions">
                                                                <button
                                                                    onClick={() => handleManagePermissions(user)}
                                                                    className="p-1 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded"
                                                                    title="إدارة الصلاحيات"
                                                                >
                                                                    <Settings className="w-4 h-4" />
                                                                </button>
                                                            </Protected>
                                                        ) : (
                                                            <span className="text-[10px] text-green-600 dark:text-green-400 px-1" title="مدير النظام - صلاحيات كاملة تلقائياً">
                                                                ✓ كامل
                                                            </span>
                                                        )}
                                                        {/* Requirement 8.5: Edit User permission */}
                                                        <Protected permission="users.edit">
                                                            <button
                                                                onClick={() => handleEdit(user)}
                                                                className="p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                                                                title="تعديل"
                                                            >
                                                                <Edit className="w-4 h-4" />
                                                            </button>
                                                        </Protected>
                                                        <button
                                                            onClick={() => handleChangePassword(user)}
                                                            className="p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded"
                                                            title="تغيير كلمة المرور"
                                                        >
                                                            <Key className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleToggleActive(user)}
                                                            className={`p-1 ${user.isActive ? 'text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20' : 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'} rounded`}
                                                            title={user.isActive ? 'تعطيل' : 'تفعيل'}
                                                        >
                                                            <Power className="w-4 h-4" />
                                                        </button>
                                                        {/* Requirement 8.7: Delete User permission */}
                                                        <Protected permission="users.delete">
                                                            <button
                                                                onClick={() => handleDelete(user)}
                                                                className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                                                                title="حذف"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </Protected>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modals */}
            {showAddModal && (
                <AddUserModal
                    onClose={() => setShowAddModal(false)}
                    onSuccess={() => {
                        setShowAddModal(false);
                        loadUsers();
                    }}
                />
            )}

            {showEditModal && selectedUser && (
                <EditUserModal
                    user={selectedUser}
                    onClose={() => {
                        setShowEditModal(false);
                        setSelectedUser(null);
                    }}
                    onSuccess={() => {
                        setShowEditModal(false);
                        setSelectedUser(null);
                        loadUsers();
                    }}
                />
            )}

            {showPasswordModal && selectedUser && (
                <ChangePasswordModal
                    user={selectedUser}
                    onClose={() => {
                        setShowPasswordModal(false);
                        setSelectedUser(null);
                    }}
                    onSuccess={() => {
                        setShowPasswordModal(false);
                        setSelectedUser(null);
                    }}
                />
            )}

            {showPermissionsModal && selectedUser && (
                <PermissionManagementModal
                    user={selectedUser}
                    onClose={() => {
                        setShowPermissionsModal(false);
                        setSelectedUser(null);
                    }}
                />
            )}
        </div>
    );
}

