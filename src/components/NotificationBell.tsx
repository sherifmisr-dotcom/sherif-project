import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import api from '../lib/api';
import NotificationDropdown from './NotificationDropdown.tsx';

export default function NotificationBell() {
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        loadUnreadCount();

        // Auto-refresh every 30 seconds
        const interval = setInterval(loadUnreadCount, 30000);
        return () => clearInterval(interval);
    }, []);

    const loadUnreadCount = async () => {
        try {
            const data = await api.getUnreadNotificationCount();
            setUnreadCount(data.count || 0);
        } catch (error) {
            console.error('Failed to load unread count:', error);
        }
    };

    const handleNotificationRead = () => {
        loadUnreadCount();
    };

    const handleBellClick = () => {
        setIsOpen(!isOpen);
    };

    return (
        <div className="relative">
            <button
                onClick={handleBellClick}
                className="relative p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                aria-label="Notifications"
            >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 flex items-center justify-center min-w-[20px] h-5 px-1 text-xs font-bold text-white bg-red-500 rounded-full transform translate-x-1 -translate-y-1">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <NotificationDropdown
                    onClose={() => setIsOpen(false)}
                    onNotificationRead={handleNotificationRead}
                />
            )}
        </div>
    );
}
