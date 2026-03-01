import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Moon, Sun, HardDrive, Menu } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import NotificationBell from '../NotificationBell';

interface HeaderProps {
  onToggleSidebar: () => void;
}

export default function Header({ onToggleSidebar }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const today = new Date();

  const dayName = format(today, 'EEEE', { locale: ar });
  const dateStr = format(today, 'dd MMMM yyyy', { locale: ar });

  return (
    <header className="h-14 md:h-16 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700 px-3 md:px-6 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-2 md:gap-4">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
        >
          <Menu className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
      </div>

      <div className="text-center">
        <p className="text-sm md:text-lg font-semibold text-gray-800 dark:text-gray-100">
          {dayName}، {dateStr}
        </p>
      </div>

      <div className="flex items-center gap-1 md:gap-2">
        <NotificationBell />
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
          title={theme === 'dark' ? 'الوضع النهاري' : 'الوضع الليلي'}
        >
          {theme === 'dark' ? (
            <Sun className="w-5 h-5 text-orange-500" />
          ) : (
            <Moon className="w-5 h-5 text-primary-600" />
          )}
        </button>
        <button
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
          title="نسخ احتياطي"
        >
          <HardDrive className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
      </div>
    </header>
  );
}

