import { Code, Database, Globe, Layout, Server, Shield, Smartphone, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

const TypewriterText = ({ text, delay = 0, speed = 30, className = "" }: { text: string, delay?: number, speed?: number, className?: string }) => {
    const [displayedText, setDisplayedText] = useState("");
    const [started, setStarted] = useState(false);
    const [completed, setCompleted] = useState(false);

    useEffect(() => {
        const timeout = setTimeout(() => setStarted(true), delay);
        return () => clearTimeout(timeout);
    }, [delay]);

    useEffect(() => {
        if (!started) return;

        let currentIndex = 0;
        const interval = setInterval(() => {
            if (currentIndex <= text.length) {
                setDisplayedText(text.slice(0, currentIndex));
                currentIndex++;
            } else {
                setCompleted(true);
                clearInterval(interval);
            }
        }, speed);

        return () => clearInterval(interval);
    }, [text, speed, started]);

    return (
        <span className={className}>
            {displayedText}
            {(!completed && started) && <span className="animate-pulse border-r-2 border-blue-500 ml-1 inline-block h-[1em] translate-y-1/4"></span>}
        </span>
    );
};

export default function AboutDeveloper() {
    const technologies = [
        { name: 'React', icon: Globe, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
        { name: 'TypeScript', icon: Code, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
        { name: 'Tailwind CSS', icon: Layout, color: 'text-cyan-500', bg: 'bg-cyan-50 dark:bg-cyan-900/20' },
        { name: 'Node.js', icon: Server, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' },
        { name: 'Prisma ORM', icon: Database, color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
        { name: 'Vite', icon: Zap, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20' },
        { name: 'Authentication', icon: Shield, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20' },
        { name: 'Responsive', icon: Smartphone, color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/20' },
    ];

    return (
        <div className="space-y-6">
            {/* App Info Card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 px-4 sm:px-8 py-6 sm:py-10 text-white relative overflow-hidden">
                    {/* Decorative elements */}
                    <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
                    <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-48 h-48 bg-indigo-400/20 rounded-full blur-3xl pointer-events-none"></div>
                    <div className="absolute top-1/2 left-1/4 w-24 h-24 bg-blue-400/20 rounded-full blur-2xl pointer-events-none transform -translate-y-1/2"></div>

                    <div className="flex flex-col md:flex-row items-center md:items-start justify-center md:justify-start gap-5 relative z-10">
                        {/* Logo */}
                        <motion.div
                            initial={{ scale: 0, opacity: 0, rotate: 0 }}
                            animate={{
                                scale: 1,
                                opacity: 1,
                                rotate: [-10, 0, 0, 15]
                            }}
                            transition={{
                                duration: 2.2,
                                times: [0, 0.3, 0.8, 1],
                                ease: "easeInOut"
                            }}
                            whileHover={{
                                rotate: 0,
                                scale: 1.05,
                                transition: { duration: 0.15, ease: "easeOut" }
                            }}
                            className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-2xl flex items-center justify-center shrink-0 cursor-pointer"
                        >
                            <span className="text-3xl font-black bg-gradient-to-br from-white to-blue-200 bg-clip-text text-transparent">A</span>
                        </motion.div>

                        {/* Title & Version */}
                        <div className="text-center md:text-right pt-1">
                            <motion.h2
                                initial={{ width: 0, opacity: 0 }}
                                animate={{ width: "100%", opacity: 1 }}
                                transition={{ duration: 1.5, ease: "easeOut" }}
                                className="text-lg sm:text-xl md:text-2xl font-extrabold mb-3 tracking-tight text-white drop-shadow-md overflow-hidden whitespace-nowrap border-l-2 border-white/50 pr-1 pl-1"
                                style={{ display: 'inline-block' }}
                            >
                                نظام إدارة العمليات الجمركية
                            </motion.h2>
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 1.5, duration: 0.5 }}
                                className="flex flex-wrap items-center justify-center md:justify-start gap-3"
                            >
                                <span className="bg-white/20 text-white text-xs font-semibold px-3 py-1 rounded-full backdrop-blur-sm border border-white/20 shadow-sm flex items-center gap-2 hover:bg-white/30 transition-colors cursor-default">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
                                    الإصدار 1.0.0
                                </span>
                                <span className="bg-black/20 text-blue-100 text-xs font-medium px-3 py-1 rounded-full backdrop-blur-sm border border-black/10 shadow-sm flex items-center gap-2">
                                    <Shield className="w-3.5 h-3.5 text-blue-300" />
                                    نظام آمن وموثوق
                                </span>
                            </motion.div>
                        </div>
                    </div>
                </div>

                <div className="p-4 sm:p-8">
                    <div className="max-w-3xl mx-auto text-center">
                        <p className="text-slate-600 dark:text-slate-300 font-medium leading-relaxed text-sm sm:text-lg">
                            نظام متكامل لإدارة العمليات الجمركية والمحاسبية، مصمم خصيصاً لتلبية احتياجات شركات التخليص الجمركي.
                            يوفر النظام حلولاً ذكية لإدارة الفواتير، المصروفات، والتقارير المالية بدقة وكفاءة عالية.
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
                {/* Developer Info */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-8 flex flex-col h-full">
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-8 flex items-center gap-2">
                        <Code className="w-6 h-6 text-blue-600" />
                        معلومات المطور
                    </h3>

                    <div className="space-y-6 flex-grow flex flex-col justify-center">
                        <div className="flex items-center gap-5 p-5 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-600/50">
                            <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-2xl shrink-0">
                                S
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">تصميم وتطوير بواسطة</p>
                                <h4 className="font-semibold text-gray-900 dark:text-white text-lg">شريف عيد سليم</h4>
                            </div>
                        </div>

                        <div className="space-y-2 pt-2 bg-gray-50 dark:bg-gray-700/30 rounded-xl p-2 border border-gray-100 dark:border-gray-700/50">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border-b border-gray-100 dark:border-gray-700 gap-2">
                                <span className="text-gray-500 dark:text-gray-400 font-medium">البريد الإلكتروني</span>
                                <span className="font-semibold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-lg" dir="ltr">sherif.misr@gmail.com</span>
                            </div>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 gap-2">
                                <span className="text-gray-500 dark:text-gray-400 font-medium">رقم الجوال</span>
                                <span className="font-semibold text-gray-900 dark:text-white" dir="ltr">+20 111 193 9009 / 0543367925</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tech Stack */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-8 flex flex-col h-full">
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-8 flex items-center gap-2">
                        <Zap className="w-6 h-6 text-yellow-500" />
                        التقنيات المستخدمة
                    </h3>

                    <div className="grid grid-cols-2 gap-2 sm:gap-4 flex-grow content-center">
                        {technologies.map((tech, index) => {
                            const Icon = tech.icon;
                            return (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                    className={`flex items-center gap-2 sm:gap-3 p-3 sm:p-4 rounded-xl border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all hover:-translate-y-1 cursor-default ${tech.bg}`}
                                >
                                    <Icon className={`w-5 h-5 ${tech.color} shrink-0`} />
                                    <span className="font-semibold text-gray-700 dark:text-gray-200 text-sm">{tech.name}</span>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>

                {/* Developer Note */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.8 }}
                    className="lg:col-span-2 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl shadow-sm border border-blue-100 dark:border-blue-800 p-4 sm:p-6"
                >
                    <motion.h3
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5, delay: 1 }}
                        className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2"
                    >
                        <span className="text-2xl">💡</span>
                        تنويه
                    </motion.h3>

                    <div className="space-y-4 text-gray-700 dark:text-gray-300 leading-relaxed text-base pt-2">
                        <p className="min-h-[48px]">
                            <TypewriterText
                                text="إن هذا العمل هو ثمرة مجهود شاق وعمل دؤوب استمر لأكثر من سبعة أشهر، ولا يزال قيد التطوير والتحسين المستمر. وسيتم – بمشيئة الله – إصدار نسخ قادمة تحمل المزيد من المميزات والحلول المتقدمة، بهدف تقديم تجربة استخدام أفضل، تلبي احتياجات المستخدم، وتساعده على توفير الوقت والجهد ......... شريف عيد في 27/02/2026."
                                delay={200}
                                speed={25}
                            />
                        </p>

                        <p className="font-medium text-blue-800 dark:text-blue-300 pt-3 border-t border-blue-100 dark:border-blue-800/50 mt-4 text-sm min-h-[40px]">
                            <TypewriterText
                                text="وأسأل الله العظيم أن يتغمد والديّ بواسع رحمته، وأن يغفر لهما، ويجعل قبورهما روضةً من رياض الجنة، وأن يجزيهما عني خير الجزاء."
                                delay={7500}
                                speed={35}
                            />
                        </p>
                    </div>
                </motion.div>
            </div>

            <div className="text-center text-gray-400 text-sm py-4">
                &copy; {new Date().getFullYear()} جميع الحقوق محفوظة
            </div>
        </div>
    );
}
