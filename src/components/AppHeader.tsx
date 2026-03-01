import { Code2, Info, User, Calendar } from 'lucide-react';

interface AppHeaderProps {
    className?: string;
}

export default function AppHeader({ className = '' }: AppHeaderProps) {
    const appInfo = {
        name: 'نظام إدارة العمليات الجمركية',
        version: '1.0.0',
        developer: 'Sherif Elsherbiny',
        releaseDate: '2026',
        description: 'نظام متكامل لإدارة العمليات الجمركية والفواتير والحسابات'
    };

    return (
        <div className={`bg-gradient-to-r from-primary-600 to-primary-700 dark:from-primary-800 dark:to-primary-900 rounded-xl shadow-lg border border-primary-500/20 overflow-hidden ${className}`}>
            {/* Main Content */}
            <div className="p-6">
                <div className="flex items-start justify-between gap-6">
                    {/* App Info */}
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm">
                                <Code2 className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-white">
                                    {appInfo.name}
                                </h1>
                                <p className="text-primary-100 text-sm mt-1">
                                    {appInfo.description}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Version Badge */}
                    <div className="flex-shrink-0">
                        <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/20">
                            <div className="text-xs text-primary-100 mb-1">الإصدار</div>
                            <div className="text-lg font-bold text-white">v{appInfo.version}</div>
                        </div>
                    </div>
                </div>

                {/* Footer Info */}
                <div className="mt-4 pt-4 border-t border-white/10">
                    <div className="flex items-center justify-between gap-4 text-sm">
                        {/* Developer Info */}
                        <div className="flex items-center gap-2 text-primary-100">
                            <User className="w-4 h-4" />
                            <span>تطوير:</span>
                            <span className="font-semibold text-white">{appInfo.developer}</span>
                        </div>

                        {/* Release Date */}
                        <div className="flex items-center gap-2 text-primary-100">
                            <Calendar className="w-4 h-4" />
                            <span>{appInfo.releaseDate}</span>
                        </div>

                        {/* Info Icon */}
                        <div className="flex items-center gap-2 text-primary-100">
                            <Info className="w-4 h-4" />
                            <span>جميع الحقوق محفوظة</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Decorative Bottom Border */}
            <div className="h-1 bg-gradient-to-r from-primary-400 via-primary-300 to-primary-400"></div>
        </div>
    );
}
