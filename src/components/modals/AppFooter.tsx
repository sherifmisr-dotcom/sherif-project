import { Code2, Info, User } from 'lucide-react';

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

    return (
        <footer className={`bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-sm ${className}`}>
            <div className="max-w-7xl mx-auto px-4 py-3">
                <div className="flex flex-col md:flex-row items-center justify-between gap-3 mb-2">

                    {/* Right Side - System Info */}
                    <div className="flex items-center gap-3 w-full md:w-1/3 justify-center md:justify-start">
                        <div className="p-1.5 bg-primary-50 dark:bg-primary-900/30 rounded-lg border border-primary-100 dark:border-primary-800">
                            <Code2 className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                        </div>
                        <div className="text-right">
                            <h3 className="font-bold text-sm text-gray-800 dark:text-gray-100 tracking-wide">
                                {appInfo.name}
                            </h3>
                            <p className="text-[10px] text-gray-500 dark:text-gray-400">
                                الإصدار {appInfo.version}
                            </p>
                        </div>
                    </div>

                    {/* Center - Developer Info */}
                    <div className="flex flex-col items-center justify-center w-full md:w-1/3">
                        <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 px-3 py-1 rounded-full border border-gray-200 dark:border-gray-600">
                            <span className="text-[10px] text-gray-500 dark:text-gray-400">تطوير:</span>
                            <span className="font-semibold text-primary-700 dark:text-primary-300">{appInfo.developer}</span>
                            <User className="w-3 h-3 text-primary-600 dark:text-primary-400" />
                        </div>
                    </div>

                    {/* Left Side - Prayer/Dedication */}
                    <div className="w-full md:w-1/3 flex justify-center md:justify-end">
                        <div className="bg-gray-50 dark:bg-gray-700/50 px-3 py-1 rounded-lg border border-gray-200 dark:border-gray-600 text-center md:text-left">
                            <p className="text-[10px] font-medium text-gray-600 dark:text-gray-300 leading-relaxed italic">
                                "أرجو الدعاء لابي وامي بالرحمة وأن يجعل هذا العمل في ميزان حسناتهم"
                            </p>
                        </div>
                    </div>
                </div>

                {/* Bottom - Copyrights */}
                <div className="border-t border-gray-100 dark:border-gray-700 pt-2 flex items-center justify-center gap-2 text-[10px] text-gray-400 dark:text-gray-500">
                    <Info className="w-3 h-3" />
                    <span>جميع الحقوق محفوظة © {appInfo.releaseDate}</span>
                </div>
            </div>
        </footer>
    );
}
