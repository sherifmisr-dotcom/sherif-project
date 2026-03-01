import toast, { Toaster } from 'react-hot-toast';
import { CheckCircle, XCircle, AlertTriangle, Info, Loader, X } from 'lucide-react';

// Single ID ensures each new toast replaces the previous one — no stacking, no race conditions
const TOAST_ID = 'app-toast';

// Inline animation styles since animate-enter/leave CSS classes don't exist
const getStyle = (visible: boolean): React.CSSProperties => ({
    opacity: visible ? 1 : 0,
    transform: visible ? 'translateY(0)' : 'translateY(-8px)',
    transition: 'all 0.2s ease',
});

// Success toast
export const showSuccess = (message: string, username?: string) => {
    const fullMessage = username ? `${message} ${username}` : message;

    toast.custom(
        (t) => (
            <div style={getStyle(t.visible)} className="max-w-md w-full bg-white dark:bg-gray-800 shadow-xl rounded-lg pointer-events-auto flex items-center gap-3 px-4 py-3 border-r-4 border-green-500 ring-1 ring-black/5 dark:ring-white/10">
                <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                <p className="flex-1 text-sm font-medium text-gray-900 dark:text-white">{fullMessage}</p>
                <button onClick={() => toast.dismiss(t.id)} className="flex-shrink-0 p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                    <X className="w-4 h-4" />
                </button>
            </div>
        ),
        { id: TOAST_ID, duration: 2500 }
    );
};

// Error toast
export const showError = (message: string) => {
    toast.custom(
        (t) => (
            <div style={getStyle(t.visible)} className="max-w-md w-full bg-white dark:bg-gray-800 shadow-xl rounded-lg pointer-events-auto flex items-center gap-3 px-4 py-3 border-r-4 border-red-500 ring-1 ring-black/5 dark:ring-white/10">
                <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                <p className="flex-1 text-sm font-medium text-gray-900 dark:text-white">{message}</p>
                <button onClick={() => toast.dismiss(t.id)} className="flex-shrink-0 p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                    <X className="w-4 h-4" />
                </button>
            </div>
        ),
        { id: TOAST_ID, duration: 3500 }
    );
};

// Warning toast
export const showWarning = (message: string) => {
    toast.custom(
        (t) => (
            <div style={getStyle(t.visible)} className="max-w-md w-full bg-white dark:bg-gray-800 shadow-xl rounded-lg pointer-events-auto flex items-center gap-3 px-4 py-3 border-r-4 border-orange-500 ring-1 ring-black/5 dark:ring-white/10">
                <AlertTriangle className="h-5 w-5 text-orange-500 flex-shrink-0" />
                <p className="flex-1 text-sm font-medium text-gray-900 dark:text-white">{message}</p>
                <button onClick={() => toast.dismiss(t.id)} className="flex-shrink-0 p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                    <X className="w-4 h-4" />
                </button>
            </div>
        ),
        { id: TOAST_ID, duration: 3000 }
    );
};

// Info toast
export const showInfo = (message: string) => {
    toast.custom(
        (t) => (
            <div style={getStyle(t.visible)} className="max-w-md w-full bg-white dark:bg-gray-800 shadow-xl rounded-lg pointer-events-auto flex items-center gap-3 px-4 py-3 border-r-4 border-blue-500 ring-1 ring-black/5 dark:ring-white/10">
                <Info className="h-5 w-5 text-blue-500 flex-shrink-0" />
                <p className="flex-1 text-sm font-medium text-gray-900 dark:text-white">{message}</p>
                <button onClick={() => toast.dismiss(t.id)} className="flex-shrink-0 p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                    <X className="w-4 h-4" />
                </button>
            </div>
        ),
        { id: TOAST_ID, duration: 2500 }
    );
};

// Loading toast — uses a separate ID so it doesn't conflict
const LOADING_TOAST_ID = 'app-loading-toast';

export const showLoading = (message: string) => {
    return toast.custom(
        (t) => (
            <div style={getStyle(t.visible)} className="max-w-md w-full bg-white dark:bg-gray-800 shadow-xl rounded-lg pointer-events-auto flex items-center gap-3 px-4 py-3 border-r-4 border-indigo-500 ring-1 ring-black/5 dark:ring-white/10">
                <Loader className="h-5 w-5 text-indigo-500 animate-spin flex-shrink-0" />
                <p className="flex-1 text-sm font-medium text-gray-900 dark:text-white">{message}</p>
            </div>
        ),
        { id: LOADING_TOAST_ID, duration: Infinity }
    );
};

// Promise toast (for async operations)
export const showPromise = <T,>(
    promise: Promise<T>,
    messages: {
        loading: string;
        success: string;
        error: string;
    }
) => {
    showLoading(messages.loading);

    promise
        .then(() => {
            toast.dismiss(LOADING_TOAST_ID);
            showSuccess(messages.success);
        })
        .catch(() => {
            toast.dismiss(LOADING_TOAST_ID);
            showError(messages.error);
        });

    return promise;
};

// Confirmation dialog using toast — uses a separate ID
const CONFIRM_TOAST_ID = 'app-confirm-toast';

export const showConfirm = (
    message: string,
    onConfirm: () => void,
    onCancel?: () => void
) => {
    toast.custom(
        (t) => (
            <div
                style={{ ...getStyle(t.visible), maxWidth: '26rem' }}
                className="w-full bg-white dark:bg-gray-800 shadow-2xl rounded-xl pointer-events-auto p-5 border-b-4 border-orange-500 ring-1 ring-black/5 dark:ring-white/5"
            >
                <div className="flex items-start gap-3 mb-5">
                    <AlertTriangle className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm font-medium text-gray-900 dark:text-white whitespace-pre-line">{message}</p>
                </div>
                <div className="flex gap-2 justify-end">
                    <button
                        onClick={() => {
                            toast.dismiss(t.id);
                            onCancel?.();
                        }}
                        className="px-4 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                        إلغاء
                    </button>
                    <button
                        onClick={() => {
                            toast.dismiss(t.id);
                            onConfirm();
                        }}
                        className="px-4 py-2 text-xs font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors shadow-lg shadow-red-500/30"
                    >
                        تأكيد
                    </button>
                </div>
            </div>
        ),
        {
            id: CONFIRM_TOAST_ID,
            duration: Infinity,
            position: 'top-center',
        }
    );
};

// Export Toaster component
export { Toaster };
