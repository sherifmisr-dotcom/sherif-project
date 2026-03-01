import { useState, useEffect, useRef } from 'react';
import { X, CheckCheck, Bell } from 'lucide-react';
import api from '../lib/api';
import NotificationItem from './NotificationItem.tsx';

interface NotificationDropdownProps {
    onClose: () => void;
    onNotificationRead: () => void;
}

interface Notification {
    id: string;
    type: string;
    title: string;
    message: string;
    data: any;
    isRead: boolean;
    createdAt: string;
}

export default function NotificationDropdown({ onClose, onNotificationRead }: NotificationDropdownProps) {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        loadNotifications();

        // Close on click outside
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    const loadNotifications = async () => {
        try {
            const data = await api.getNotifications({ limit: 10 });
            setNotifications(data.data || []);
        } catch (error) {
            console.error('Failed to load notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleMarkAsRead = async (id: string) => {
        try {
            await api.markNotificationAsRead(id);
            setNotifications(prev =>
                prev.map(n => n.id === id ? { ...n, isRead: true } : n)
            );
            onNotificationRead();
        } catch (error) {
            console.error('Failed to mark as read:', error);
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            await api.markAllNotificationsAsRead();
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            onNotificationRead();
        } catch (error) {
            console.error('Failed to mark all as read:', error);
        }
    };

    return (
        <div
            ref={dropdownRef}
            className="absolute left-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-[9999] max-h-96 flex flex-col"
        >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">الإشعارات</h3>
                <div className="flex items-center gap-2">
                    {notifications.some(n => !n.isRead) && (
                        <button
                            onClick={handleMarkAllAsRead}
                            className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                        >
                            <CheckCheck className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">تعليم الكل كمقروء</span>
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                    >
                        <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    </button>
                </div>
            </div>

            {/* Notifications List */}
            <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent [scrollbar-gutter:stable] hover:scrollbar-thumb-gray-400 dark:scrollbar-thumb-gray-600">
                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-gray-500 dark:text-gray-400">
                        <Bell className="w-10 h-10 mb-2 opacity-50" />
                        <p className="text-sm">لا توجد إشعارات</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100 dark:divide-gray-700">
                        {notifications.map((notification) => (
                            <NotificationItem
                                key={notification.id}
                                notification={notification}
                                onMarkAsRead={handleMarkAsRead}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
