import axios, { AxiosInstance, AxiosError } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

class ApiClient {
    private client: AxiosInstance;

    constructor() {
        this.client = axios.create({
            baseURL: API_BASE_URL,
            headers: {
                'Content-Type': 'application/json',
            },
        });

        // Request interceptor to add auth token (check sessionStorage first, then localStorage)
        this.client.interceptors.request.use(
            (config) => {
                const token = sessionStorage.getItem('accessToken') || localStorage.getItem('accessToken');
                if (token) {
                    config.headers.Authorization = `Bearer ${token}`;
                }
                return config;
            },
            (error) => Promise.reject(error)
        );

        // Response interceptor to handle errors
        this.client.interceptors.response.use(
            (response) => response,
            async (error: AxiosError) => {
                const originalRequest = error.config as any;

                // Log error for debugging (without exposing sensitive info)
                if (process.env.NODE_ENV === 'development') {
                    console.error('[API Error]:', {
                        url: originalRequest?.url,
                        method: originalRequest?.method,
                        status: error.response?.status,
                        message: error.response?.data,
                    });
                }

                // Suppress console errors for expected 400 errors (e.g., duplicate carry forward)
                if (error.response?.status === 400) {
                    const url = originalRequest?.url || '';
                    // Check if it's a carry forward endpoint
                    if (url.includes('carry-forward')) {
                        // Silently reject without logging to console
                        return Promise.reject(error);
                    }
                }

                // If 401 and not already retried, try to refresh token
                if (error.response?.status === 401 && !originalRequest._retry) {
                    originalRequest._retry = true;

                    // Don't redirect if already on a public page (login, reset-password, etc.)
                    const publicPaths = ['/login', '/reset-password', '/forgot-password'];
                    const isPublicPage = publicPaths.some(p => window.location.pathname.startsWith(p));

                    try {
                        const refreshToken = sessionStorage.getItem('refreshToken') || localStorage.getItem('refreshToken');
                        if (refreshToken) {
                            const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
                                refreshToken,
                            });

                            const { accessToken } = response.data;
                            // Save refreshed token to the same storage the user chose
                            const useLocalStorage = !!localStorage.getItem('rememberMe');
                            if (useLocalStorage) {
                                localStorage.setItem('accessToken', accessToken);
                            } else {
                                sessionStorage.setItem('accessToken', accessToken);
                            }

                            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                            return this.client(originalRequest);
                        }
                    } catch (refreshError) {
                        // Refresh failed, logout user — clear both storages
                        sessionStorage.removeItem('accessToken');
                        sessionStorage.removeItem('refreshToken');
                        sessionStorage.removeItem('user');
                        localStorage.removeItem('accessToken');
                        localStorage.removeItem('refreshToken');
                        localStorage.removeItem('user');
                        if (!isPublicPage) {
                            window.location.href = '/login';
                        }
                        return Promise.reject(refreshError);
                    }
                }

                return Promise.reject(error);
            }
        );
    }

    // Auth
    async login(username: string, password: string) {
        const response = await this.client.post('/auth/login', { username, password });
        return response.data;
    }

    async refreshToken(refreshToken: string) {
        const response = await this.client.post('/auth/refresh', { refreshToken });
        return response.data;
    }

    async forgotPassword(username: string) {
        const response = await this.client.post('/auth/forgot-password', { username });
        return response.data;
    }

    async resetPassword(data: { token: string; newPassword: string; confirmPassword: string }) {
        const response = await this.client.post('/auth/reset-password', data);
        return response.data;
    }

    // Customers
    async getCustomers(params?: any) {
        const response = await this.client.get('/customers', { params });
        return response.data;
    }

    async getCustomer(id: string) {
        const response = await this.client.get(`/customers/${id}`);
        return response.data;
    }

    async createCustomer(data: any) {
        const response = await this.client.post('/customers', data);
        return response.data;
    }

    async updateCustomer(id: string, data: any) {
        const response = await this.client.patch(`/customers/${id}`, data);
        return response.data;
    }

    async deleteCustomer(id: string) {
        const response = await this.client.delete(`/customers/${id}`);
        return response.data;
    }

    async getCustomerStats() {
        const response = await this.client.get('/customers/stats');
        return response.data;
    }

    async toggleCustomerStatus(id: string) {
        const response = await this.client.patch(`/customers/${id}/toggle-status`);
        return response.data;
    }

    async getCustomersBalance() {
        const response = await this.client.get('/customers/total-balance');
        return response.data;
    }

    // Customer Groups
    async getCustomerGroups(params?: any) {
        const response = await this.client.get('/customer-groups', { params });
        return response.data;
    }

    async getCustomerGroup(id: string) {
        const response = await this.client.get(`/customer-groups/${id}`);
        return response.data;
    }

    async createCustomerGroup(data: any) {
        const response = await this.client.post('/customer-groups', data);
        return response.data;
    }

    async updateCustomerGroup(id: string, data: any) {
        const response = await this.client.put(`/customer-groups/${id}`, data);
        return response.data;
    }

    async deleteCustomerGroup(id: string) {
        const response = await this.client.delete(`/customer-groups/${id}`);
        return response.data;
    }

    async getCustomerGroupStatement(groupId: string, params?: any) {
        const response = await this.client.get(`/reports/customer-group/${groupId}`, { params });
        return response.data;
    }

    // Invoices
    async getInvoices(params?: any) {
        const response = await this.client.get('/invoices', { params });
        return response.data;
    }

    async getInvoice(id: string) {
        const response = await this.client.get(`/invoices/${id}`);
        return response.data;
    }

    async createInvoice(data: any) {
        const response = await this.client.post('/invoices', data);
        return response.data;
    }

    async updateInvoice(id: string, data: any) {
        const response = await this.client.patch(`/invoices/${id}`, data);
        return response.data;
    }

    async deleteInvoice(id: string) {
        const response = await this.client.delete(`/invoices/${id}`);
        return response.data;
    }

    async getInvoiceStats(params?: any) {
        const response = await this.client.get('/invoices/stats', { params });
        return response.data;
    }

    // Agents
    async getAgents(params?: any) {
        const response = await this.client.get('/agents', { params });
        return response.data;
    }

    async getAgent(id: string) {
        const response = await this.client.get(`/agents/${id}`);
        return response.data;
    }

    async createAgent(data: any) {
        const response = await this.client.post('/agents', data);
        return response.data;
    }

    async updateAgent(id: string, data: any) {
        const response = await this.client.patch(`/agents/${id}`, data);
        return response.data;
    }

    async deleteAgent(id: string) {
        const response = await this.client.delete(`/agents/${id}`);
        return response.data;
    }

    async getAgentsBalance() {
        const response = await this.client.get('/agents/total-balance');
        return response.data;
    }

    async getBankBalance() {
        const response = await this.client.get('/banks/accounts/total-balance');
        return response.data;
    }

    async getMonthlyCollections() {
        const response = await this.client.get('/vouchers/monthly-collections');
        return response.data;
    }

    // Trips
    async getTrips(params?: any) {
        const response = await this.client.get('/agents/trips', { params });
        return response.data;
    }

    async createTrip(data: any) {
        const response = await this.client.post('/agents/trips', data);
        return response.data;
    }

    async updateTrip(id: string, data: any) {
        const response = await this.client.patch(`/agents/trips/${id}`, data);
        return response.data;
    }

    async deleteTrip(id: string) {
        const response = await this.client.delete(`/agents/trips/${id}`);
        return response.data;
    }

    // Agent Settings
    async getAgentSettings() {
        const response = await this.client.get('/agents/settings');
        return response.data;
    }

    async updateAgentSettings(data: { defaultFreightPerTruck: number; defaultPortFeesPerTruck: number; defaultTransitPortFees: number }) {
        const response = await this.client.patch('/agents/settings', data);
        return response.data;
    }

    async getAgentSettingsLogs() {
        const response = await this.client.get('/agents/settings/logs');
        return response.data;
    }

    async deleteAgentSettingLog(id: string) {
        const response = await this.client.delete(`/agents/settings/logs/${id}`);
        return response.data;
    }

    // Additional Fees
    async getFees(params?: any) {
        const response = await this.client.get('/agents/fees', { params });
        return response.data;
    }

    async createFee(data: any) {
        const response = await this.client.post('/agents/fees', data);
        return response.data;
    }

    async updateFee(id: string, data: any) {
        const response = await this.client.patch(`/agents/fees/${id}`, data);
        return response.data;
    }

    async deleteFee(id: string) {
        const response = await this.client.delete(`/agents/fees/${id}`);
        return response.data;
    }

    // Agent Statement
    async getAgentStatement(agentId: string, params?: any) {
        const response = await this.client.get(`/agents/${agentId}/statement`, { params });
        return response.data;
    }

    // Vouchers
    async getVouchers(params?: any) {
        const response = await this.client.get('/vouchers', { params });
        return response.data;
    }

    async getVoucher(id: string) {
        const response = await this.client.get(`/vouchers/${id}`);
        return response.data;
    }

    async createVoucher(data: any) {
        const response = await this.client.post('/vouchers', data);
        return response.data;
    }

    async updateVoucher(id: string, data: any) {
        const response = await this.client.patch(`/vouchers/${id}`, data);
        return response.data;
    }

    async deleteVoucher(id: string) {
        const response = await this.client.delete(`/vouchers/${id}`);
        return response.data;
    }

    async createInternalTransfer(data: any) {
        const response = await this.client.post('/vouchers/internal-transfer', data);
        return response.data;
    }

    // Treasury
    async getTreasuryBalance() {
        const response = await this.client.get('/treasury/balance');
        return response.data;
    }

    async getTreasuryTransactions(params?: any) {
        const response = await this.client.get('/treasury/transactions', { params });
        return response.data;
    }

    async getTreasuryReport(params?: any) {
        const response = await this.client.get('/reports/treasury', { params });
        return response.data;
    }

    async getBankTransactions(params?: { limit?: number; bankAccountId?: string }) {
        const response = await this.client.get('/reports/bank-transactions', { params });
        return response.data;
    }

    async setTreasuryOpeningBalance(data: any) {
        const response = await this.client.post('/treasury/opening-balance', data);
        return response.data;
    }

    async updateTreasurySettings(data: any) {
        const response = await this.client.patch('/treasury/settings', data);
        return response.data;
    }

    async getTreasuryOpeningBalanceSettings() {
        const response = await this.client.get('/treasury/settings/opening-balance');
        return response.data;
    }

    async updateTreasuryOpeningBalanceSettings(data: any) {
        const response = await this.client.patch('/treasury/settings/opening-balance', data);
        return response.data;
    }

    async carryForwardTreasury(data: { periodType: 'MONTH' | 'YEAR'; newPeriodStartDate: string }) {
        const response = await this.client.post('/treasury/carry-forward', data);
        return response.data;
    }

    async getCarryForwardSettings() {
        const response = await this.client.get('/treasury/carry-forward/settings');
        return response.data;
    }

    async updateCarryForwardSettings(data: any) {
        const response = await this.client.patch('/treasury/carry-forward/settings', data);
        return response.data;
    }

    async getCarryForwardLogs(params?: any) {
        const response = await this.client.get('/treasury/carry-forward/logs', { params });
        return response.data;
    }

    // Notifications
    async getNotifications(params?: any) {
        const response = await this.client.get('/notifications', { params });
        return response.data;
    }

    async getUnreadNotificationCount() {
        const response = await this.client.get('/notifications/unread-count');
        return response.data;
    }

    async markNotificationAsRead(id: string) {
        const response = await this.client.patch(`/notifications/${id}/read`);
        return response.data;
    }

    async markAllNotificationsAsRead() {
        const response = await this.client.patch('/notifications/read-all');
        return response.data;
    }


    // Dashboard
    async getRecentActivities() {
        const response = await this.client.get('/dashboard/recent-activities');
        return response.data;
    }

    // Banks
    async getBanks(params?: any) {
        const response = await this.client.get('/banks', { params });
        return response.data;
    }

    async getBank(id: string) {
        const response = await this.client.get(`/banks/${id}`);
        return response.data;
    }

    async createBank(data: any) {
        const response = await this.client.post('/banks', data);
        return response.data;
    }

    async updateBank(id: string, data: any) {
        const response = await this.client.patch(`/banks/${id}`, data);
        return response.data;
    }

    async deleteBank(id: string) {
        const response = await this.client.delete(`/banks/${id}`);
        return response.data;
    }

    // Bank Accounts
    async getBankAccounts(params?: any) {
        const response = await this.client.get('/banks/accounts', { params });
        return response.data;
    }

    async getBankAccount(id: string) {
        const response = await this.client.get(`/banks/accounts/${id}`);
        return response.data;
    }

    async createBankAccount(data: any) {
        const response = await this.client.post('/banks/accounts', data);
        return response.data;
    }

    async updateBankAccount(id: string, data: any) {
        const response = await this.client.patch(`/banks/accounts/${id}`, data);
        return response.data;
    }

    async deleteBankAccount(id: string) {
        const response = await this.client.delete(`/banks/accounts/${id}`);
        return response.data;
    }

    async getBankAccountTransactions(id: string, params?: any) {
        const response = await this.client.get(`/banks/accounts/${id}/transactions`, { params });
        return response.data;
    }

    async carryForwardBankAccount(id: string, data: { periodType: 'MONTH' | 'YEAR'; newPeriodStartDate: string }) {
        const response = await this.client.post(`/banks/accounts/${id}/carry-forward`, data);
        return response.data;
    }

    async carryForwardAllBankAccounts(data: { periodType: 'MONTH' | 'YEAR'; newPeriodStartDate: string }) {
        const response = await this.client.post('/banks/accounts/carry-forward/all', data);
        return response.data;
    }

    // Employees
    async getEmployees(params?: any) {
        const response = await this.client.get('/payroll/employees', { params });
        return response.data;
    }

    async getEmployee(id: string) {
        const response = await this.client.get(`/payroll/employees/${id}`);
        return response.data;
    }

    async createEmployee(data: any) {
        const response = await this.client.post('/payroll/employees', data);
        return response.data;
    }

    async updateEmployee(id: string, data: any) {
        const response = await this.client.patch(`/payroll/employees/${id}`, data);
        return response.data;
    }

    async deleteEmployee(id: string) {
        const response = await this.client.delete(`/payroll/employees/${id}`);
        return response.data;
    }

    // Payroll
    async getPayrollRuns(params?: any) {
        const response = await this.client.get('/payroll/runs', { params });
        return response.data;
    }

    async getPayrollRun(id: string) {
        const response = await this.client.get(`/payroll/runs/${id}`);
        return response.data;
    }

    async createPayrollRun(data: any) {
        const response = await this.client.post('/payroll/runs', data);
        return response.data;
    }

    async updatePayrollRun(id: string, data: any) {
        const response = await this.client.patch(`/payroll/runs/${id}`, data);
        return response.data;
    }

    async approvePayrollRun(data: any) {
        const response = await this.client.post('/payroll/runs/approve', data);
        return response.data;
    }

    async deletePayrollRun(id: string) {
        const response = await this.client.delete(`/payroll/runs/${id}`);
        return response.data;
    }

    // Reports
    async getTreasuryReportData(params?: any) {
        const response = await this.client.get('/reports/treasury', { params });
        return response.data;
    }

    async getBankReportData(accountId: string, params?: any) {
        const response = await this.client.get(`/reports/bank/${accountId}`, { params });
        return response.data;
    }

    async getCustomerStatement(id: string, params?: any) {
        const response = await this.client.get(`/reports/customer/${id}`, { params });
        return response.data;
    }

    async getAgentStatementReport(id: string, params?: any) {
        const response = await this.client.get(`/reports/agent/${id}`, { params });
        return response.data;
    }

    async getIncomeStatement(params?: any) {
        const response = await this.client.get('/reports/income-statement', { params });
        return response.data;
    }

    async getGeneralJournal(params?: any) {
        const response = await this.client.get('/reports/general-journal', { params });
        return response.data;
    }

    async getTrialBalance(params?: any) {
        const response = await this.client.get('/reports/trial-balance', { params });
        return response.data;
    }

    async getCustomsReport(params?: any) {
        const response = await this.client.get('/reports/customs', { params });
        return response.data;
    }

    async getVatReport(params?: any) {
        const response = await this.client.get('/reports/vat', { params });
        return response.data;
    }

    // Expense Categories
    async getExpenseCategories() {
        const response = await this.client.get('/expense-categories');
        return response.data;
    }

    async createExpenseCategory(data: { name: string }) {
        const response = await this.client.post('/expense-categories', data);
        return response.data;
    }

    async deleteExpenseCategory(id: string) {
        const response = await this.client.delete(`/expense-categories/${id}`);
        return response.data;
    }

    // Expenses Report
    async getExpensesReport(filters: any) {
        const response = await this.client.get('/vouchers/reports/expenses', {
            params: filters
        });
        return response.data;
    }

    // Revenue Report
    async getRevenueReport(filters: any) {
        const response = await this.client.get('/vouchers/reports/revenue', {
            params: filters
        });
        return response.data;
    }

    // Invoice Item Templates
    async getInvoiceItemTemplates() {
        const response = await this.client.get('/invoice-item-templates');
        return response.data;
    }

    async searchInvoiceItemTemplates(query: string) {
        const response = await this.client.get('/invoice-item-templates/search', { params: { q: query } });
        return response.data;
    }

    async createInvoiceItemTemplate(data: { description: string; vatRate?: number }) {
        const response = await this.client.post('/invoice-item-templates', data);
        return response.data;
    }

    async updateInvoiceItemTemplate(id: string, data: { vatRate?: number }) {
        const response = await this.client.patch(`/invoice-item-templates/${id}`, data);
        return response.data;
    }

    async deleteInvoiceItemTemplate(id: string) {
        const response = await this.client.delete(`/invoice-item-templates/${id}`);
        return response.data;
    }

    // Invoice Item Categories
    async getInvoiceItemCategories() {
        const response = await this.client.get('/invoice-item-categories');
        return response.data;
    }

    async createInvoiceItemCategory(data: { name: string }) {
        const response = await this.client.post('/invoice-item-categories', data);
        return response.data;
    }

    async deleteInvoiceItemCategory(id: string) {
        const response = await this.client.delete(`/invoice-item-categories/${id}`);
        return response.data;
    }

    // Income Statement Settings
    async getIncomeStatementSettings() {
        const response = await this.client.get('/settings/income-statement');
        return response.data;
    }

    async updateIncomeStatementSettings(data: {
        revenueItemTemplateIds: string[];
        expenseCategoryIds: string[];
    }) {
        const response = await this.client.put('/settings/income-statement', data);
        return response.data;
    }

    // Settings
    async getSettings() {
        const response = await this.client.get('/settings');
        return response.data;
    }

    async getCompanySettings() {
        const response = await this.client.get('/settings/company');
        return response.data;
    }

    async updateCompanySettings(data: any) {
        const response = await this.client.put('/settings/company', data);
        return response.data;
    }

    async uploadCompanyLogo(formData: FormData) {
        const response = await this.client.post('/settings/company/logo', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    }

    async getAppSettings() {
        const response = await this.client.get('/settings/app');
        return response.data;
    }

    async updateAppSettings(data: any) {
        const response = await this.client.put('/settings/app', data);
        return response.data;
    }

    async getPrintSettings() {
        const response = await this.client.get('/settings/print');
        return response.data;
    }

    async updatePrintSettings(data: any) {
        const response = await this.client.put('/settings/print', data);
        return response.data;
    }

    // Users Management
    async getUsers() {
        const response = await this.client.get('/users');
        return response.data;
    }

    async getUser(id: string) {
        const response = await this.client.get(`/users/${id}`);
        return response.data;
    }

    async getCurrentUser() {
        const response = await this.client.get('/users/me');
        return response.data;
    }

    async createUser(data: any) {
        const response = await this.client.post('/users', data);
        return response.data;
    }

    async updateUser(id: string, data: any) {
        const response = await this.client.patch(`/users/${id}`, data);
        return response.data;
    }

    async deleteUser(id: string) {
        const response = await this.client.delete(`/users/${id}`);
        return response.data;
    }

    async changeUserPassword(id: string, data: any) {
        const response = await this.client.patch(`/users/${id}/password`, data);
        return response.data;
    }

    async toggleUserActive(id: string, isActive: boolean) {
        const response = await this.client.patch(`/users/${id}/toggle-active`, { isActive });
        return response.data;
    }

    async unapprovePayrollRun(id: string) {
        const response = await this.client.put(`/payroll/runs/${id}/unapprove`, {});
        return response.data;
    }

    // Backup
    async createBackup(description?: string) {
        const response = await this.client.post('/backup/create', { description });
        return response.data;
    }

    async getBackupHistory(params?: any) {
        const response = await this.client.get('/backup/history', { params });
        return response.data;
    }

    async restoreBackup(id: string) {
        const response = await this.client.post(`/backup/restore/${id}`);
        return response.data;
    }

    async downloadBackup(id: string) {
        const response = await this.client.get(`/backup/download/${id}`, {
            responseType: 'blob',
        });
        return response.data;
    }

    async deleteBackup(id: string) {
        const response = await this.client.delete(`/backup/${id}`);
        return response.data;
    }

    async getBackupSettings() {
        const response = await this.client.get('/backup/settings');
        return response.data;
    }

    async updateBackupSettings(data: any) {
        const response = await this.client.post('/backup/settings', data);
        return response.data;
    }

    async uploadBackup(file: File, description?: string) {
        const formData = new FormData();
        formData.append('file', file);
        if (description) {
            formData.append('description', description);
        }
        const response = await this.client.post('/backup/upload', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    }

    // PDF Generation
    async generateAgentStatementPDF(data: any): Promise<Blob> {
        const response = await this.client.post('/pdf/agent-statement', data, {
            responseType: 'blob',
        });
        return response.data;
    }

    async generateCustomerStatementPDF(data: any): Promise<Blob> {
        const response = await this.client.post('/pdf/customer-statement', data, {
            responseType: 'blob',
        });
        return response.data;
    }

    async generateCustomsReportPDF(data: any): Promise<Blob> {
        const response = await this.client.post('/pdf/customs-report', data, {
            responseType: 'blob',
        });
        return response.data;
    }

    // Customs Fee Batches
    async getCustomsFeeBatches(params?: any) {
        const response = await this.client.get('/customs-fees/batches', { params });
        return response.data;
    }

    async getCustomsFeeBatch(id: string) {
        const response = await this.client.get(`/customs-fees/batches/${id}`);
        return response.data;
    }

    async createCustomsFeeBatch(data: any) {
        const response = await this.client.post('/customs-fees/batches', data);
        return response.data;
    }

    async updateCustomsFeeBatch(id: string, data: any) {
        const response = await this.client.patch(`/customs-fees/batches/${id}`, data);
        return response.data;
    }

    async deleteCustomsFeeBatch(id: string) {
        const response = await this.client.delete(`/customs-fees/batches/${id}`);
        return response.data;
    }

    async getAvailableCustomsNumbers() {
        const response = await this.client.get('/customs-fees/available-customs-numbers');
        return response.data;
    }

    async getCustomsFeeByDeclarationNo(customsNo: string) {
        const response = await this.client.get(`/customs-fees/by-customs-no/${customsNo}`);
        return response.data;
    }

    // System - Reset
    async resetSystem(): Promise<{ message: string }> {
        const response = await this.client.post('/system/reset');
        return response.data;
    }

    // Permissions
    async getMyPermissions() {
        const response = await this.client.get('/permissions/me/permissions');
        return response.data;
    }

    async getAllPermissionDefinitions() {
        const response = await this.client.get('/permissions/definitions');
        return response.data;
    }

    async getUserPermissions(userId: string) {
        const response = await this.client.get(`/permissions/user/${userId}`);
        return response.data;
    }

    async grantPermission(userId: string, permissionCode: string) {
        const response = await this.client.post('/permissions/grant', { userId, permissionCode });
        return response.data;
    }

    async revokePermission(userId: string, permissionCode: string) {
        const response = await this.client.post('/permissions/revoke', { userId, permissionCode });
        return response.data;
    }

    async notifyPermissionChange(userId: string) {
        const response = await this.client.post('/permissions/notify-change', { userId });
        return response.data;
    }
}

export const apiClient = new ApiClient();
export default apiClient;
