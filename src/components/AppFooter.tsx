import { Heart, Code2 } from 'lucide-react';

interface AppFooterProps {
    className?: string;
}

export default function AppFooter({ className = '' }: AppFooterProps) {
    const appInfo = {
        name: 'نظام إدارة العمليات الجمركية',
        version: '1.0.0',
        developer: 'شريف عيد',
        releaseDate: '2026',
    };

    const getCurrentYear = () => new Date().getFullYear();

    return (
        <footer className={`bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 border-t border-slate-200 dark:border-slate-700 ${className}`}>
            <div className="max-w-full mx-auto px-6 py-2">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4 py-2">

                    {/* Right - System Info */}
                    <div className="flex items-center gap-3">
                        <div className="relative group">
                            <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 rounded-lg flex items-center justify-center shadow-md group-hover:shadow-blue-500/25 transition-all duration-300">
                                <Code2 className="w-4.5 h-4.5 text-white" strokeWidth={2.5} />
                            </div>
                            <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full border-2 border-white dark:border-slate-900 animate-pulse"></div>
                        </div>
                        <div className="text-right">
                            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-tight">
                                {appInfo.name}
                            </h3>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] font-medium px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded">v{appInfo.version}</span>
                                <span className="text-[10px] text-slate-400">| {appInfo.releaseDate}</span>
                            </div>
                        </div>
                    </div>

                    {/* Center - Developer (Clear Text) */}
                    <div className="flex items-center justify-center">
                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                            <span className="text-xs font-semibold">تصميم وتطوير</span>
                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-lg border border-slate-200/80 dark:border-slate-700/80 hover:border-blue-400 dark:hover:border-blue-600 hover:bg-blue-50/50 dark:hover:bg-blue-900/30 transition-all duration-300 shadow-sm">
                                <Code2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                <span className="text-sm font-extrabold text-slate-800 dark:text-slate-100 tracking-wide">
                                    {appInfo.developer}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Left - Prayer */}
                    <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-700/50 hover:border-slate-200 dark:hover:border-slate-600 transition-colors">
                        <div className="p-1 bg-red-50 dark:bg-red-900/20 rounded-full flex justify-center items-center">
                            <style>
                                {`
                                    @keyframes heartbeat {
                                        0%, 100% { transform: scale(1); }
                                        15% { transform: scale(1.3); }
                                        30% { transform: scale(1); }
                                        45% { transform: scale(1.3); }
                                        60% { transform: scale(1); }
                                    }
                                    .animate-heartbeat {
                                        animation: heartbeat 1.5s ease-in-out infinite;
                                    }
                                `}
                            </style>
                            <Heart className="w-4 h-4 text-red-500 animate-heartbeat" fill="currentColor" />
                        </div>
                        <p className="text-xs text-slate-800 dark:text-slate-100 font-semibold tracking-wide">
                            أرجو الدعاء لأبي وأمي بالرحمة والمغفرة
                        </p>
                    </div>
                </div>

                {/* Separator & Copyright */}
                <div className="border-t border-slate-200 dark:border-slate-700 pt-2 mt-1">
                    <p className="text-center text-[10px] text-slate-500 dark:text-slate-400">
                        جميع الحقوق محفوظة &copy; {getCurrentYear()}
                    </p>
                </div>
            </div>
        </footer>
    );
}
