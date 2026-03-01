import { AVAILABLE_SCREENS } from '@/config/screens';

// Get screen name by ID
export function getScreenName(screenId: string): string {
    const screen = Object.values(AVAILABLE_SCREENS).find(s => s.id === screenId);
    return screen?.name || 'صفحة غير معروفة';
}

// Get screen category name
export function getScreenCategory(screenId: string): string {
    const screen = Object.values(AVAILABLE_SCREENS).find(s => s.id === screenId);
    return screen?.categoryName || '';
}

// Map route path to screen ID
export function mapRouteToScreen(path: string): string | null {
    const routeMap: Record<string, string> = {
        '/customers': 'customers',
        '/invoices/import': 'invoices_import',
        '/invoices/export': 'invoices_export',
        '/invoices/transit': 'invoices_transit',
        '/invoices/free': 'invoices_free',
        '/agents': 'agents',
        '/agents/add': 'agents',
        '/agents/trips': 'trips',
        '/agents/fees': 'fees',
        '/accounts': 'treasury', // Default to treasury for accounts page
        '/employees': 'employees',
        '/reports': 'reports_financial', // Default to financial reports
        '/settings': 'settings',
    };

    return routeMap[path] || null;
}

// Get route path for screen ID
export function getScreenRoute(screenId: string): string {
    const screenRouteMap: Record<string, string> = {
        'customers': '/customers',
        'invoices_import': '/invoices/import',
        'invoices_export': '/invoices/export',
        'invoices_transit': '/invoices/transit',
        'invoices_free': '/invoices/free',
        'agents': '/agents',
        'trips': '/agents/trips',
        'fees': '/agents/fees',
        'vouchers_receipt': '/accounts',
        'vouchers_payment': '/accounts',
        'treasury': '/accounts',
        'banks': '/accounts',
        'bank_accounts': '/accounts',
        'employees': '/employees',
        'payroll': '/employees',
        'reports_financial': '/reports',
        'reports_customs': '/reports',
        'reports_agents': '/reports',
        'settings': '/settings',
    };

    return screenRouteMap[screenId] || '/dashboard';
}
