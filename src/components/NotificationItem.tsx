import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import {
    XCircle, Bell, AlertCircle,
    HardDrive, RefreshCw, Landmark, Vault,
    CalendarClock, UserCheck, UserX, UserPlus, Shield, LogIn
} from 'lucide-react';

interface NotificationItemProps {
    notification: {
        id: string;
        type: string;
        title: string;
        message: string;
        data: any;
        isRead: boolean;
        createdAt: string;
    };
    onMarkAsRead: (id: string) => void;
}

export default function NotificationItem({ notification, onMarkAsRead }: NotificationItemProps) {
    const getIcon = () => {
        switch (notification.type) {
            // Carry-forward notifications
            case 'CARRY_FORWARD_SUCCESS':
            case 'CARRY_FORWARD_MANUAL':
                return <RefreshCw className="w-4 h-4 text-green-500" />;
            case 'CARRY_FORWARD_FAILED':
                return <XCircle className="w-4 h-4 text-red-500" />;
            case 'CARRY_FORWARD_REMINDER':
                return <AlertCircle className="w-4 h-4 text-yellow-500" />;

            // Backup notifications
            case 'BACKUP_SUCCESS':
                return <HardDrive className="w-4 h-4 text-green-500" />;
            case 'BACKUP_FAILED':
                return <HardDrive className="w-4 h-4 text-red-500" />;
            case 'AUTO_BACKUP_ENABLED':
                return <HardDrive className="w-4 h-4 text-green-500" />;
            case 'AUTO_BACKUP_DISABLED':
                return <HardDrive className="w-4 h-4 text-yellow-500" />;
            case 'MANUAL_BACKUP_CREATED':
                return <HardDrive className="w-4 h-4 text-blue-500" />;
            case 'BACKUP_RESTORED':
                return <HardDrive className="w-4 h-4 text-purple-500" />;
            case 'BACKUP_RESTORE_FAILED':
                return <HardDrive className="w-4 h-4 text-red-500" />;

            // Bank account notifications
            case 'BANK_ACCOUNT_CREATED':
                return <Landmark className="w-4 h-4 text-blue-500" />;
            case 'BANK_ACCOUNT_DELETED':
                return <Landmark className="w-4 h-4 text-red-500" />;

            // Treasury notifications
            case 'TREASURY_OPENING_SET':
                return <Vault className="w-4 h-4 text-purple-500" />;

            // Time-based reminders
            case 'MONTH_END_REMINDER':
                return <CalendarClock className="w-4 h-4 text-amber-500" />;
            case 'AUTO_CF_SCHEDULE':
                return <CalendarClock className="w-4 h-4 text-blue-500" />;

            // Customer notifications
            case 'CUSTOMER_ACTIVATED':
                return <UserCheck className="w-4 h-4 text-green-500" />;
            case 'CUSTOMER_DEACTIVATED':
                return <UserX className="w-4 h-4 text-red-500" />;

            // User management notifications
            case 'USER_CREATED':
                return <UserPlus className="w-4 h-4 text-green-500" />;
            case 'USER_ACTIVATED':
                return <UserCheck className="w-4 h-4 text-green-500" />;
            case 'USER_DEACTIVATED':
                return <UserX className="w-4 h-4 text-red-500" />;
            case 'PERMISSIONS_CHANGED':
                return <Shield className="w-4 h-4 text-amber-500" />;
            case 'USER_LOGIN':
                return <LogIn className="w-4 h-4 text-blue-500" />;

            default:
                return <Bell className="w-4 h-4 text-blue-500" />;
        }
    };

    const getBgColor = () => {
        if (!notification.isRead) {
            return 'bg-blue-50 dark:bg-blue-900/10';
        }
        return 'hover:bg-gray-50 dark:hover:bg-gray-700/50';
    };

    const handleClick = () => {
        if (!notification.isRead) {
            onMarkAsRead(notification.id);
        }
    };

    return (
        <div
            onClick={handleClick}
            className={`px-3 py-2.5 cursor-pointer transition-colors ${getBgColor()}`}
        >
            <div className="flex gap-2.5">
                {/* Icon */}
                <div className="flex-shrink-0 mt-0.5">
                    {getIcon()}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-0.5">
                        <h4 className={`text-sm font-semibold leading-tight ${notification.isRead ? 'text-gray-700 dark:text-gray-300' : 'text-gray-900 dark:text-white'
                            }`}>
                            {notification.title}
                        </h4>
                        {!notification.isRead && (
                            <span className="flex-shrink-0 w-1.5 h-1.5 bg-blue-600 rounded-full mt-1.5"></span>
                        )}
                    </div>

                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1.5 line-clamp-2 leading-relaxed">
                        {notification.message}
                    </p>

                    <span className="text-xs text-gray-500 dark:text-gray-500">
                        {formatDistanceToNow(new Date(notification.createdAt), {
                            addSuffix: true,
                            locale: ar,
                        })}
                    </span>
                </div>
            </div>
        </div>
    );
}
