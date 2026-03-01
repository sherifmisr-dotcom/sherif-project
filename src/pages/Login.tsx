import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Lock, User, Loader2, Clock, LogIn } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { showSuccess, showError } from '@/lib/toast';
import ForgotPasswordModal from '@/pages/modals/ForgotPasswordModal';
import ModalOverlay from '@/components/ui/ModalOverlay';

const loginSchema = z.object({
  username: z.string().min(1, 'اسم المستخدم مطلوب'),
  password: z.string().min(1, 'كلمة المرور مطلوبة'),
  remember: z.boolean().optional(),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Check if user was redirected due to session expiry (via router state or localStorage flag)
  const [showSessionExpired, setShowSessionExpired] = useState(() => {
    const fromRouterState = !!(location.state as any)?.sessionExpired;
    const fromLocalStorage = localStorage.getItem('sessionExpired') === 'true';
    // Clear the localStorage flag immediately so it doesn't persist
    if (fromLocalStorage) {
      localStorage.removeItem('sessionExpired');
    }
    return fromRouterState || fromLocalStorage;
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    try {
      setIsLoading(true);
      await login(data.username, data.password, data.remember || false);
      showSuccess('مرحباً بك!', data.username);

      // Delay navigation to allow toast to show
      setTimeout(() => {
        navigate('/dashboard');
      }, 500);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'حدث خطأ أثناء تسجيل الدخول';

      if (errorMessage.includes('غير صحيحة') || errorMessage.includes('incorrect')) {
        showError('اسم المستخدم أو كلمة المرور غير صحيحة');
      } else if (errorMessage.includes('غير نشط') || errorMessage.includes('not active')) {
        showError('هذا الحساب غير نشط. يرجى التواصل مع مدير النظام');
      } else {
        showError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 px-4 py-8">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 dark:bg-primary-900 rounded-full mb-4">
              <Lock className="w-8 h-8 text-primary-600 dark:text-primary-400" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              تسجيل الدخول
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              نظام إدارة العمليات الجمركية
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                اسم المستخدم
              </label>
              <div className="relative">
                <User className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  {...register('username')}
                  type="text"
                  className="w-full pr-10 pl-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 transition-colors"
                  placeholder="أدخل اسم المستخدم"
                  disabled={isLoading}
                />
              </div>
              {errors.username && (
                <p className="text-red-500 text-sm">{errors.username.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                كلمة المرور
              </label>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  className="w-full pr-10 pl-12 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 transition-colors"
                  placeholder="أدخل كلمة المرور"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-500 text-sm">{errors.password.message}</p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  {...register('remember')}
                  type="checkbox"
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  disabled={isLoading}
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  تذكرني
                </span>
              </label>
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
              >
                نسيت كلمة المرور؟
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full btn-primary justify-center py-3"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>جاري تسجيل الدخول...</span>
                </>
              ) : (
                <span>دخول</span>
              )}
            </button>
          </form>
        </div>

        {showForgotPassword && (
          <ForgotPasswordModal onClose={() => setShowForgotPassword(false)} />
        )}

        <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-6">
          للحصول على حساب يرجى التواصل مع مدير النظام
        </p>
      </div>

      {/* Session Expired Modal */}
      {showSessionExpired && (
        <ModalOverlay>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden animate-scale-in" dir="rtl">
            <div className="p-8 text-center">
              {/* Icon */}
              <div className="flex justify-center mb-5">
                <div className="relative">
                  <div className="absolute inset-0 bg-amber-400 rounded-full blur-xl opacity-40 animate-pulse"></div>
                  <div className="relative bg-gradient-to-br from-amber-400 to-amber-600 rounded-full p-4">
                    <Clock className="w-12 h-12 text-white" strokeWidth={2.5} />
                  </div>
                </div>
              </div>

              {/* Title */}
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                انتهت الجلسة
              </h2>

              {/* Message */}
              <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed mb-6">
                تم تسجيل الخروج تلقائياً بسبب عدم النشاط لفترة طويلة.
                <br />
                يرجى تسجيل الدخول مرة أخرى للمتابعة.
              </p>

              {/* Button */}
              <button
                onClick={() => {
                  setShowSessionExpired(false);
                  // Clear the location state so it doesn't persist on refresh
                  window.history.replaceState({}, document.title);
                }}
                autoFocus
                className="w-full btn-primary justify-center py-3 gap-2"
              >
                <LogIn className="w-5 h-5" />
                تسجيل الدخول
              </button>
            </div>
          </div>

          <style>{`
            @keyframes scale-in {
              from {
                opacity: 0;
                transform: scale(0.9);
              }
              to {
                opacity: 1;
                transform: scale(1);
              }
            }
            .animate-scale-in {
              animation: scale-in 0.25s ease-out;
            }
          `}</style>
        </ModalOverlay>
      )}
    </div>
  );
}
