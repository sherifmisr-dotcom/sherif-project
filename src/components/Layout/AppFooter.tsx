import { Heart, Code2, Calendar } from 'lucide-react';

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
        <footer className={`bg-gradient-to-r from-gray-50 to-gray-100 dark:from-slate-900 dark:to-slate-800 border-t border-gray-200 dark:border-slate-700 ${className}`}>
            <div className="max-w-full mx-auto px-3 py-4 md:px-6 md:py-6">
                {/* Main Content */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">

                    {/* System Info - Right */}
                    <div className="flex items-center gap-4 md:justify-start justify-center">
                        <div className="relative">
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                                <Code2 className="w-6 h-6 text-white" strokeWidth={2.5} />
                            </div>
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-slate-900 animate-pulse"></div>
                        </div>
                        <div className="text-right">
                            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-0.5">
                                {appInfo.name}
                            </h3>
                            <div className="flex items-center gap-2">
                                <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full font-medium">
                                    v{appInfo.version}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Prayer Message - Center */}
                    <div className="flex items-center justify-center">
                        <div className="relative group">
                            <div className="absolute inset-0 bg-gradient-to-r from-amber-400 to-orange-400 rounded-2xl blur opacity-20 group-hover:opacity-30 transition-opacity"></div>
                            <div className="relative px-6 py-3 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-2xl border-2 border-amber-200/50 dark:border-amber-700/30 shadow-sm">
                                <div className="flex items-center gap-2 mb-1">
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
                                                animation: heartbeat 1.5s infinite;
                                            }
                                        `}
                                    </style>
                                    <Heart className="w-5 h-5 text-red-500 dark:text-red-400 animate-heartbeat" fill="currentColor" />
                                    <span className="text-sm font-semibold text-amber-800 dark:text-amber-300">دعوة صادقة</span>
                                </div>
                                <p className="text-xs text-amber-900 dark:text-amber-200 text-center leading-relaxed font-medium">
                                    أرجو الدعاء لأبي وأمي بالرحمة والمغفرة
                                </p>
                                <p className="text-[10px] text-amber-700 dark:text-amber-400 text-center mt-1">
                                    وأن يجعل هذا العمل في ميزان حسناتهم
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Developer Info - Left */}
                    <div className="flex items-center md:justify-end justify-center gap-3">
                        <div className="text-left">
                            <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-0.5 uppercase tracking-wider">
                                تطوير وتصميم
                            </p>
                            <p className="text-sm font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
                                {appInfo.developer}
                            </p>
                        </div>
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 dark:from-purple-600 dark:to-pink-600 rounded-lg flex items-center justify-center shadow-lg shadow-purple-500/20">
                            <span className="text-white font-bold text-lg">ش</span>
                        </div>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="pt-4 border-t border-gray-200 dark:border-slate-700">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                        {/* Copyright */}
                        <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>© {getCurrentYear()} جميع الحقوق محفوظة</span>
                        </div>

                        {/* Status Badge */}
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 dark:bg-green-900/20 rounded-full border border-green-200 dark:border-green-800">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            <span className="text-xs font-medium text-green-700 dark:text-green-300">
                                النظام يعمل بكفاءة
                            </span>
                        </div>

                        {/* Tech Stack */}
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] text-gray-500 dark:text-gray-400">مبني بـ</span>
                            <div className="flex items-center gap-1">
                                <span className="px-2 py-0.5 text-[10px] font-semibold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">React</span>
                                <span className="px-2 py-0.5 text-[10px] font-semibold bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded">TypeScript</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}
