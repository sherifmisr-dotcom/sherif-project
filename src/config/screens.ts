// Available screens/modules for permission management
export const AVAILABLE_SCREENS = {
    // Invoices
    INVOICES_IMPORT: {
        id: 'invoices_import',
        name: 'فواتير الاستيراد',
        category: 'invoices',
        categoryName: 'الفواتير',
    },
    INVOICES_EXPORT: {
        id: 'invoices_export',
        name: 'فواتير التصدير',
        category: 'invoices',
        categoryName: 'الفواتير',
    },
    INVOICES_TRANSIT: {
        id: 'invoices_transit',
        name: 'فواتير الترانزيت',
        category: 'invoices',
        categoryName: 'الفواتير',
    },
    INVOICES_FREE: {
        id: 'invoices_free',
        name: 'فواتير حرة',
        category: 'invoices',
        categoryName: 'الفواتير',
    },

    // Customers
    CUSTOMERS: {
        id: 'customers',
        name: 'العملاء',
        category: 'accounts',
        categoryName: 'الحسابات',
    },

    // Agents & Vessels
    AGENTS: {
        id: 'agents',
        name: 'الوكلاء',
        category: 'agents',
        categoryName: 'الوكلاء والسفن',
    },
    VESSELS: {
        id: 'vessels',
        name: 'السفن',
        category: 'agents',
        categoryName: 'الوكلاء والسفن',
    },
    TRIPS: {
        id: 'trips',
        name: 'الرحلات',
        category: 'agents',
        categoryName: 'الوكلاء والسفن',
    },
    FEES: {
        id: 'fees',
        name: 'الرسوم الإضافية',
        category: 'agents',
        categoryName: 'الوكلاء والسفن',
    },

    // Vouchers
    VOUCHERS_RECEIPT: {
        id: 'vouchers_receipt',
        name: 'سندات القبض',
        category: 'vouchers',
        categoryName: 'السندات',
    },
    VOUCHERS_PAYMENT: {
        id: 'vouchers_payment',
        name: 'سندات الصرف',
        category: 'vouchers',
        categoryName: 'السندات',
    },
    VOUCHERS_INTERNAL_TRANSFER: {
        id: 'vouchers_internal_transfer',
        name: 'التحويلات الداخلية',
        category: 'vouchers',
        categoryName: 'السندات',
    },
    VOUCHERS_SEARCH: {
        id: 'vouchers_search',
        name: 'البحث في السندات',
        category: 'vouchers',
        categoryName: 'السندات',
    },

    // Treasury & Banks
    TREASURY: {
        id: 'treasury',
        name: 'الخزنة',
        category: 'finance',
        categoryName: 'المالية',
    },
    BANKS: {
        id: 'banks',
        name: 'البنوك',
        category: 'finance',
        categoryName: 'المالية',
    },
    BANK_ACCOUNTS: {
        id: 'bank_accounts',
        name: 'الحسابات البنكية',
        category: 'finance',
        categoryName: 'المالية',
    },

    // Payroll
    EMPLOYEES: {
        id: 'employees',
        name: 'الموظفين',
        category: 'payroll',
        categoryName: 'الرواتب',
    },
    PAYROLL: {
        id: 'payroll',
        name: 'الرواتب',
        category: 'payroll',
        categoryName: 'الرواتب',
    },

    // Reports
    REPORTS_FINANCIAL: {
        id: 'reports_financial',
        name: 'التقارير المالية',
        category: 'reports',
        categoryName: 'التقارير',
    },
    REPORTS_CUSTOMS: {
        id: 'reports_customs',
        name: 'التقارير الجمركية',
        category: 'reports',
        categoryName: 'التقارير',
    },
    REPORTS_AGENTS: {
        id: 'reports_agents',
        name: 'تقارير الوكلاء',
        category: 'reports',
        categoryName: 'التقارير',
    },

    // Settings
    SETTINGS_EXPENSE_CATEGORIES: {
        id: 'settings_expense_categories',
        name: 'تصنيفات المصروفات',
        category: 'settings',
        categoryName: 'الإعدادات',
    },
    SETTINGS_INVOICE_TEMPLATES: {
        id: 'settings_invoice_templates',
        name: 'بنود الفواتير المحفوظة',
        category: 'settings',
        categoryName: 'الإعدادات',
    },
    SETTINGS_INCOME_STATEMENT: {
        id: 'settings_income_statement',
        name: 'إعدادات قائمة الدخل',
        category: 'settings',
        categoryName: 'الإعدادات',
    },
    SETTINGS_COMPANY: {
        id: 'settings_company',
        name: 'بيانات الشركة',
        category: 'settings',
        categoryName: 'الإعدادات',
    },
    SETTINGS_BACKUP: {
        id: 'settings_backup',
        name: 'النسخ الاحتياطي',
        category: 'settings',
        categoryName: 'الإعدادات',
    },
    SETTINGS_PRINT: {
        id: 'settings_print',
        name: 'إعدادات الطباعة',
        category: 'settings',
        categoryName: 'الإعدادات',
    },
    SETTINGS_USERS: {
        id: 'settings_users',
        name: 'المستخدمين والصلاحيات',
        category: 'settings',
        categoryName: 'الإعدادات',
    },
};

// Group screens by category
export const SCREENS_BY_CATEGORY = Object.values(AVAILABLE_SCREENS).reduce((acc, screen) => {
    if (!acc[screen.category]) {
        acc[screen.category] = {
            name: screen.categoryName,
            screens: [],
        };
    }
    acc[screen.category].screens.push(screen);
    return acc;
}, {} as Record<string, { name: string; screens: typeof AVAILABLE_SCREENS[keyof typeof AVAILABLE_SCREENS][] }>);
