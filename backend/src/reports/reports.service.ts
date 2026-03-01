import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class ReportsService {
    constructor(private prisma: PrismaService) { }

    /**
     * Treasury Report
     */
    async getTreasuryReport(from?: string, to?: string) {
        // Get the treasury's initial opening balance
        const treasury = await this.prisma.treasury.findUnique({
            where: { id: 'single_row' },
        });

        // Start from the treasury's initial opening balance
        let openingBalance = treasury?.openingBalance
            ? parseFloat(treasury.openingBalance.toString())
            : 0;
        let openingBalanceDescription = 'رصيد أول المدة';

        if (from) {
            const fromDate = new Date(from);

            // Get all transactions before the start date
            const transactionsBefore = await this.prisma.treasuryTransaction.findMany({
                where: { date: { lt: fromDate } },
                orderBy: { date: 'asc' },
            });

            // Calculate cumulative balance (starting from initial opening balance)
            transactionsBefore.forEach((tx) => {
                if (tx.type === 'IN') {
                    openingBalance += parseFloat(tx.amount.toString());
                } else {
                    openingBalance -= parseFloat(tx.amount.toString());
                }
            });

            // Generate description based on the period
            const month = fromDate.getMonth(); // 0-11
            const year = fromDate.getFullYear();

            if (month === 0) {
                // January - carried from previous year
                openingBalanceDescription = `رصيد مرحل من عام ${year - 1}`;
            } else {
                // Other months - carried from previous month
                const monthNames = [
                    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
                    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
                ];
                openingBalanceDescription = `رصيد مرحل من شهر ${monthNames[month - 1]}`;
            }
        }

        // Get transactions in the specified date range
        const where: Prisma.TreasuryTransactionWhereInput = {};

        if (from || to) {
            where.date = {};
            if (from) where.date.gte = new Date(from);
            if (to) {
                const endDate = new Date(to);
                endDate.setHours(23, 59, 59, 999);
                where.date.lte = endDate;
            }
        }

        const [transactions, totals] = await Promise.all([
            this.prisma.treasuryTransaction.findMany({
                where,
                include: {
                    voucher: {
                        select: {
                            code: true,
                            type: true,
                            partyName: true,
                            partyType: true,
                            partyId: true,
                            note: true,
                        },
                    },
                },
                orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
            }),
            this.prisma.treasuryTransaction.groupBy({
                by: ['type'],
                where,
                _sum: { amount: true },
            }),
        ]);

        const totalIn = totals.find((t) => t.type === 'IN')?._sum.amount || 0;
        const totalOut = totals.find((t) => t.type === 'OUT')?._sum.amount || 0;

        // Resolve party names for vouchers that don't have partyName stored
        const resolvedNames: { [key: string]: string } = {};
        for (const tx of transactions) {
            if (tx.voucher && !tx.voucher.partyName && tx.voucher.partyId) {
                const key = `${tx.voucher.partyType}:${tx.voucher.partyId}`;
                if (!resolvedNames[key]) {
                    if (tx.voucher.partyType === 'CUSTOMER') {
                        const customer = await this.prisma.customer.findUnique({ where: { id: tx.voucher.partyId } });
                        resolvedNames[key] = customer?.name || '';
                    } else if (tx.voucher.partyType === 'AGENT') {
                        const agent = await this.prisma.agent.findUnique({ where: { id: tx.voucher.partyId } });
                        resolvedNames[key] = agent?.name || '';
                    } else if (tx.voucher.partyType === 'EMPLOYEE') {
                        const employee = await this.prisma.employee.findUnique({ where: { id: tx.voucher.partyId } });
                        resolvedNames[key] = employee?.name || '';
                    }
                }
            }
        }

        // Calculate running balance for each transaction
        let runningBalance = openingBalance;
        const mappedTransactions = transactions.map(tx => {
            const amount = parseFloat(tx.amount.toString());
            if (tx.type === 'IN') {
                runningBalance += amount;
            } else {
                runningBalance -= amount;
            }

            // Resolve partyName
            let partyName = tx.voucher?.partyName || '';
            if (!partyName && tx.voucher?.partyId) {
                const key = `${tx.voucher.partyType}:${tx.voucher.partyId}`;
                partyName = resolvedNames[key] || '';
            }

            return {
                ...tx,
                balanceAfter: parseFloat(runningBalance.toFixed(2)),
                voucher: tx.voucher ? {
                    code: tx.voucher.code,
                    type: tx.voucher.type,
                    note: tx.voucher.note,
                    partyName: partyName,
                } : null,
            };
        });

        return {
            openingBalance,
            openingBalanceDescription,
            transactions: mappedTransactions,
            summary: {
                totalIn: parseFloat(totalIn.toString()),
                totalOut: parseFloat(totalOut.toString()),
                net: parseFloat(totalIn.toString()) - parseFloat(totalOut.toString()),
            },
        };
    }

    /**
     * Bank Transactions
     */
    async getBankTransactions(limit = 20, bankAccountId?: string) {
        const where: Prisma.BankTransactionWhereInput = {};

        if (bankAccountId) {
            where.bankAccountId = bankAccountId;
        }

        const transactions = await this.prisma.bankTransaction.findMany({
            where,
            include: {
                voucher: {
                    select: {
                        code: true,
                    },
                },
                bankAccount: {
                    include: {
                        bank: {
                            select: {
                                name: true,
                            },
                        },
                    },
                },
            },
            orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
            take: limit,
        });

        return {
            transactions: transactions.map(tx => ({
                id: tx.id,
                date: tx.date,
                description: tx.description,
                type: tx.type,
                bankName: tx.bankAccount.bank.name,
                accountNo: tx.bankAccount.accountNo,
                amount: parseFloat(tx.amount.toString()),
                balanceAfter: parseFloat(tx.balanceAfter.toString()),
                voucherCode: tx.voucher?.code || null,
            })),
        };
    }

    /**
     * Customer Statement
     */
    async getCustomerStatement(customerId: string, from?: string, to?: string) {
        const customer = await this.prisma.customer.findUnique({
            where: { id: customerId },
        });

        if (!customer) {
            throw new Error('العميل غير موجود');
        }

        // Calculate opening balance (accumulated balance before the start date)
        let openingBalance = 0;

        // Start with customer's initial opening balance
        if (customer.openingBalance) {
            const initialBalance = parseFloat(customer.openingBalance.toString());
            if (customer.openingSide === 'DEBIT') {
                openingBalance += initialBalance; // Customer owes us
            } else if (customer.openingSide === 'CREDIT') {
                openingBalance -= initialBalance; // We owe customer
            }
        }

        if (from) {
            const fromDate = new Date(from);

            // Get all invoices before the start date (debits - money owed by customer)
            const invoicesBefore = await this.prisma.invoice.findMany({
                where: {
                    customerId,
                    date: { lt: fromDate },
                },
            });

            invoicesBefore.forEach((inv) => {
                openingBalance += parseFloat(inv.total.toString());
            });

            // Get all vouchers/receipts before the start date (credits - money paid by customer)
            const vouchersBefore = await this.prisma.voucher.findMany({
                where: {
                    partyType: 'CUSTOMER',
                    partyId: customerId,
                    date: { lt: fromDate },
                },
            });

            vouchersBefore.forEach((v) => {
                openingBalance -= parseFloat(v.amount.toString());
            });
        }

        // Get invoices in the specified date range
        const invoiceWhere: Prisma.InvoiceWhereInput = {
            customerId,
        };

        if (from || to) {
            invoiceWhere.date = {};
            if (from) invoiceWhere.date.gte = new Date(from);
            if (to) invoiceWhere.date.lte = new Date(to);
        }

        const invoices = await this.prisma.invoice.findMany({
            where: invoiceWhere,
            orderBy: { date: 'asc' },
        });

        // Get vouchers (receipts from customer) in the specified date range
        const voucherWhere: Prisma.VoucherWhereInput = {
            partyType: 'CUSTOMER',
            partyId: customerId,
        };

        if (from || to) {
            voucherWhere.date = {};
            if (from) voucherWhere.date.gte = new Date(from);
            if (to) voucherWhere.date.lte = new Date(to);
        }

        const vouchers = await this.prisma.voucher.findMany({
            where: voucherWhere,
            orderBy: { date: 'asc' },
        });

        const totalInvoices = invoices.reduce(
            (sum, inv) => sum + parseFloat(inv.total.toString()),
            0,
        );
        const totalPayments = vouchers.reduce(
            (sum, v) => sum + parseFloat(v.amount.toString()),
            0,
        );

        return {
            customer,
            openingBalance,
            invoices,
            vouchers,
            summary: {
                totalInvoices,
                totalPayments,
                balance: totalInvoices - totalPayments,
            },
        };
    }

    /**
     * Income/Expense Report
     */
    async getIncomeExpenseReport(from?: string, to?: string) {
        const where: Prisma.LedgerEntryWhereInput = {};

        if (from || to) {
            where.createdAt = {};
            if (from) where.createdAt.gte = new Date(from);
            if (to) where.createdAt.lte = new Date(to);
        }

        const entries = await this.prisma.ledgerEntry.findMany({
            where,
            orderBy: { createdAt: 'asc' },
        });

        // Categorize by account type
        const income = entries
            .filter((e) => e.creditAccount.startsWith('revenue:'))
            .reduce((sum, e) => sum + parseFloat(e.amount.toString()), 0);

        const expenses = entries
            .filter((e) => e.debitAccount.startsWith('expense:'))
            .reduce((sum, e) => sum + parseFloat(e.amount.toString()), 0);

        return {
            entries,
            summary: {
                totalIncome: income,
                totalExpenses: expenses,
                netProfit: income - expenses,
            },
        };
    }

    /**
     * Agent Statement
     */
    async getAgentStatement(agentId: string, from?: string, to?: string) {
        const agent = await this.prisma.agent.findUnique({
            where: { id: agentId },
            include: { vessels: true },
        });

        if (!agent) {
            throw new Error('الوكيل غير موجود');
        }

        // ─── Calculate opening balance (accumulated balance before the start date) ───
        // Agent is a CREDITOR (دائن) by nature: trips/fees increase what we owe them,
        // payment vouchers decrease what we owe them.
        // Positive balance = we owe the agent (له), Negative = agent overpaid (عليه)
        let openingBalance = 0;

        // 1. Start with agent's initial opening balance
        if (agent.openingBalance) {
            const initialBalance = parseFloat(agent.openingBalance.toString());
            if (agent.openingSide === 'CREDIT') {
                openingBalance += initialBalance; // We owe agent
            } else if (agent.openingSide === 'DEBIT') {
                openingBalance -= initialBalance; // Agent owes us (overpaid)
            }
        }

        if (from) {
            const fromDate = new Date(from);

            // 2. Get all trips before the start date (CREDIT — increases what we owe)
            const tripsBefore = await this.prisma.trip.findMany({
                where: { agentId, date: { lt: fromDate } },
            });
            tripsBefore.forEach((t) => {
                openingBalance += parseFloat(t.totalAmount.toString());
            });

            // 3. Get all additional fees before the start date (CREDIT — increases what we owe)
            const feesBefore = await this.prisma.additionalFee.findMany({
                where: { agentId, date: { lt: fromDate } },
            });
            feesBefore.forEach((f) => {
                openingBalance += parseFloat(f.amount.toString());
            });

            // 4. Get all payment vouchers before the start date (DEBIT — decreases what we owe)
            const vouchersBefore = await this.prisma.voucher.findMany({
                where: {
                    partyType: 'AGENT',
                    partyId: agentId,
                    type: 'PAYMENT',
                    date: { lt: fromDate },
                },
            });
            vouchersBefore.forEach((v) => {
                openingBalance -= parseFloat(v.amount.toString());
            });
        }

        // ─── Get data within the date range ───
        const tripWhere: Prisma.TripWhereInput = { agentId };
        const feeWhere: Prisma.AdditionalFeeWhereInput = { agentId };

        if (from || to) {
            const dateFilter: any = {};
            if (from) dateFilter.gte = new Date(from);
            if (to) dateFilter.lte = new Date(to);
            tripWhere.date = dateFilter;
            feeWhere.date = dateFilter;
        }

        const [trips, fees, vouchers] = await Promise.all([
            this.prisma.trip.findMany({
                where: tripWhere,
                include: { vessel: true },
                orderBy: { date: 'asc' },
            }),
            this.prisma.additionalFee.findMany({
                where: feeWhere,
                include: { vessel: true },
                orderBy: { date: 'asc' },
            }),
            // Get payment vouchers for agent
            this.prisma.voucher.findMany({
                where: {
                    partyType: 'AGENT',
                    partyId: agentId,
                    type: 'PAYMENT',
                    ...(from || to ? {
                        date: {
                            ...(from ? { gte: new Date(from) } : {}),
                            ...(to ? { lte: new Date(to) } : {}),
                        }
                    } : {}),
                },
                orderBy: { date: 'asc' },
            }),
        ]);

        const totalTrips = trips.reduce(
            (sum, t) => sum + parseFloat(t.totalAmount.toString()),
            0,
        );
        const totalFees = fees.reduce(
            (sum, f) => sum + parseFloat(f.amount.toString()),
            0,
        );
        const totalVouchers = vouchers.reduce(
            (sum, v) => sum + parseFloat(v.amount.toString()),
            0,
        );

        return {
            agent,
            openingBalance,
            trips: trips.map(t => ({
                ...t,
                vesselName: t.vessel?.name || '-',
            })),
            fees: fees.map(f => ({
                ...f,
                vesselName: f.vessel?.name || '-',
            })),
            vouchers: vouchers.map(v => ({
                id: v.id,
                date: v.date,
                amount: parseFloat(v.amount.toString()),
                notes: v.note,
            })),
            summary: {
                totalTrips,
                totalFees,
                grandTotal: totalTrips + totalFees,
                totalVouchers,
                balance: (totalTrips + totalFees) - totalVouchers,
            },
        };
    }

    /**
     * Bank Account Report
     */
    async getBankReport(accountId: string, from?: string, to?: string) {
        const account = await this.prisma.bankAccount.findUnique({
            where: { id: accountId },
            include: { bank: true },
        });

        if (!account) {
            throw new Error('الحساب البنكي غير موجود');
        }

        // Calculate opening balance from bank transactions before the period
        let openingBalance = parseFloat(account.openingBalance.toString());

        if (from) {
            const fromDate = new Date(from);

            const transactionsBefore = await this.prisma.bankTransaction.findMany({
                where: {
                    bankAccountId: accountId,
                    date: { lt: fromDate },
                },
            });

            transactionsBefore.forEach((tx) => {
                const amount = parseFloat(tx.amount.toString());
                if (tx.type === 'IN') {
                    openingBalance += amount;
                } else {
                    openingBalance -= amount;
                }
            });
        }

        // Get bank transactions in the date range
        const where: Prisma.BankTransactionWhereInput = {
            bankAccountId: accountId,
        };

        if (from || to) {
            where.date = {};
            if (from) where.date.gte = new Date(from);
            if (to) {
                const endDate = new Date(to);
                endDate.setHours(23, 59, 59, 999);
                where.date.lte = endDate;
            }
        }

        const transactions = await this.prisma.bankTransaction.findMany({
            where,
            include: {
                voucher: {
                    select: {
                        code: true,
                        type: true,
                        note: true,
                        partyName: true,
                        partyType: true,
                        partyId: true,
                    },
                },
            },
            orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
        });

        // Resolve party names for vouchers that don't have partyName stored
        const resolvedNames: { [key: string]: string } = {};
        for (const tx of transactions) {
            if (tx.voucher && !tx.voucher.partyName && tx.voucher.partyId) {
                const key = `${tx.voucher.partyType}:${tx.voucher.partyId}`;
                if (!resolvedNames[key]) {
                    if (tx.voucher.partyType === 'CUSTOMER') {
                        const customer = await this.prisma.customer.findUnique({ where: { id: tx.voucher.partyId } });
                        resolvedNames[key] = customer?.name || '';
                    } else if (tx.voucher.partyType === 'AGENT') {
                        const agent = await this.prisma.agent.findUnique({ where: { id: tx.voucher.partyId } });
                        resolvedNames[key] = agent?.name || '';
                    } else if (tx.voucher.partyType === 'EMPLOYEE') {
                        const employee = await this.prisma.employee.findUnique({ where: { id: tx.voucher.partyId } });
                        resolvedNames[key] = employee?.name || '';
                    }
                }
            }
        }

        // Calculate running balance and map transactions
        let runningBalance = openingBalance;
        const mappedTransactions = transactions.map(tx => {
            const amount = parseFloat(tx.amount.toString());
            if (tx.type === 'IN') {
                runningBalance += amount;
            } else {
                runningBalance -= amount;
            }

            // Resolve partyName
            let partyName = tx.voucher?.partyName || '';
            if (!partyName && tx.voucher?.partyId) {
                const key = `${tx.voucher.partyType}:${tx.voucher.partyId}`;
                partyName = resolvedNames[key] || '';
            }

            return {
                id: tx.id,
                type: tx.type === 'IN' ? 'receipt' : 'payment',
                amount: amount,
                note: tx.voucher?.note || tx.description || '',
                date: tx.date,
                code: tx.voucher?.code || '-',
                partyName: partyName,
                voucherType: tx.voucher?.type || null,
                balanceAfter: parseFloat(runningBalance.toFixed(2)),
            };
        });

        return {
            account,
            openingBalance,
            transactions: mappedTransactions,
        };
    }

    /**
     * Income Statement - Customs Clearance Business
     */
    async getIncomeStatement(from?: string, to?: string) {
        // Default to current month if no dates provided
        const now = new Date();
        const startDate = from ? new Date(from) : new Date(now.getFullYear(), now.getMonth(), 1);
        const endDate = to ? new Date(to) : new Date(now.getFullYear(), now.getMonth() + 1, 0);

        // Calculate previous period (same length)
        const periodLength = endDate.getTime() - startDate.getTime();
        const prevStartDate = new Date(startDate.getTime() - periodLength);
        const prevEndDate = new Date(startDate.getTime() - 1);

        // Get current period data
        const currentData = await this.calculateIncomeStatementData(startDate, endDate);

        // Get previous period data for comparison
        const previousData = await this.calculateIncomeStatementData(prevStartDate, prevEndDate);

        return {
            period: {
                from: startDate,
                to: endDate,
            },
            current: currentData,
            previous: {
                revenue: previousData.revenue.total,
                grossProfit: previousData.grossProfit.amount,
                operatingProfit: previousData.operatingProfit.amount,
                netIncome: previousData.netIncome.amount,
            },
            comparison: {
                revenueChange: this.calculatePercentageChange(previousData.revenue.total, currentData.revenue.total),
                grossProfitChange: this.calculatePercentageChange(previousData.grossProfit.amount, currentData.grossProfit.amount),
                operatingProfitChange: this.calculatePercentageChange(previousData.operatingProfit.amount, currentData.operatingProfit.amount),
                netIncomeChange: this.calculatePercentageChange(previousData.netIncome.amount, currentData.netIncome.amount),
            },
        };
    }

    /**
     * Calculate Income Statement Data for a Period
     * For Customs Clearance Business
     */
    private async calculateIncomeStatementData(startDate: Date, endDate: Date) {
        // ========== 1. REVENUE (ALL COLLECTED FROM CUSTOMER) ==========
        // Get all invoices in the period
        const invoices = await this.prisma.invoice.findMany({
            where: {
                date: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            include: {
                items: true,
            },
        });

        // Revenue breakdown
        let clearanceFees = 0;
        let customsFeesCollected = 0;
        let freightCollected = 0;
        let portChargesCollected = 0;
        let loadingUnloadingCollected = 0;
        let vatCollected = 0;
        let otherRevenue = 0;

        // Keywords for revenue categorization
        // Exact match first (fastest), then keyword matching (fallback)
        const CLEARANCE_FEE_EXACT_NAME = 'أجور تخليص';
        const revenueKeywords = {
            clearance: ['تخليص', 'اجور تخليص', 'clearance'],
            customs: ['جمرك', 'رسوم جمركية', 'customs'],
            freight: ['نولون', 'freight', 'شحن بحري'],
            port: ['موانئ', 'port', 'أجور موانئ'],
            loading: ['تحميل', 'تنزيل', 'loading', 'unloading'],
        };

        invoices.forEach((invoice) => {
            // Add VAT amount to revenue
            if (invoice.vatAmount) {
                vatCollected += parseFloat(invoice.vatAmount.toString());
            }

            // Categorize each item
            invoice.items.forEach((item) => {
                const amount = parseFloat(item.amount.toString());

                // Fast path: exact match for clearance fees (most common)
                if (item.description === CLEARANCE_FEE_EXACT_NAME) {
                    clearanceFees += amount;
                } else {
                    // Slow path: keyword matching for other categories
                    const desc = item.description.toLowerCase();

                    if (revenueKeywords.clearance.some(k => desc.includes(k.toLowerCase()))) {
                        clearanceFees += amount;
                    } else if (revenueKeywords.customs.some(k => desc.includes(k.toLowerCase()))) {
                        customsFeesCollected += amount;
                    } else if (revenueKeywords.freight.some(k => desc.includes(k.toLowerCase()))) {
                        freightCollected += amount;
                    } else if (revenueKeywords.port.some(k => desc.includes(k.toLowerCase()))) {
                        portChargesCollected += amount;
                    } else if (revenueKeywords.loading.some(k => desc.includes(k.toLowerCase()))) {
                        loadingUnloadingCollected += amount;
                    } else {
                        otherRevenue += amount;
                    }
                }
            });
        });

        const totalRevenue = clearanceFees + customsFeesCollected + freightCollected +
            portChargesCollected + loadingUnloadingCollected +
            vatCollected + otherRevenue;

        // ========== 2. DIRECT COSTS (PAID TO THIRD PARTIES) ==========
        // Direct costs = All invoice items EXCEPT clearance fees
        // These represent amounts paid to third parties (customs, shipping agents, ports, etc.)
        const directCostsTotal = customsFeesCollected + freightCollected +
            portChargesCollected + loadingUnloadingCollected +
            otherRevenue;

        const directCostsArray = [
            { description: 'رسوم جمركية مدفوعة', amount: customsFeesCollected, percentage: directCostsTotal > 0 ? (customsFeesCollected / directCostsTotal) * 100 : 0 },
            { description: 'رسوم ملاحية مدفوعة للوكيل (نولون)', amount: freightCollected, percentage: directCostsTotal > 0 ? (freightCollected / directCostsTotal) * 100 : 0 },
            { description: 'أجور موانئ مدفوعة', amount: portChargesCollected, percentage: directCostsTotal > 0 ? (portChargesCollected / directCostsTotal) * 100 : 0 },
            { description: 'رسوم تحميل وتنزيل مدفوعة', amount: loadingUnloadingCollected, percentage: directCostsTotal > 0 ? (loadingUnloadingCollected / directCostsTotal) * 100 : 0 },
        ].filter(item => item.amount > 0);

        if (otherRevenue > 0) {
            directCostsArray.push({
                description: 'تكاليف مباشرة أخرى',
                amount: otherRevenue,
                percentage: directCostsTotal > 0 ? (otherRevenue / directCostsTotal) * 100 : 0,
            });
        }

        // ========== 3. GROSS PROFIT ==========
        const grossProfitAmount = totalRevenue - directCostsTotal;
        const grossProfitMargin = totalRevenue > 0 ? (grossProfitAmount / totalRevenue) * 100 : 0;

        // ========== 4. OPERATING EXPENSES ==========
        // Get all payment vouchers EXCEPT shipping agents (already in direct costs)
        const operatingExpenseVouchers = await this.prisma.voucher.findMany({
            where: {
                type: 'PAYMENT',
                date: {
                    gte: startDate,
                    lte: endDate,
                },
                // Exclude shipping agents - they're in direct costs
                NOT: {
                    partyType: 'AGENT',
                },
            },
            include: {
                category: true,
            },
        });

        const operatingExpensesByCategory: { [key: string]: number } = {};
        let operatingExpensesTotal = 0;

        operatingExpenseVouchers.forEach((v) => {
            const amount = parseFloat(v.amount.toString());
            const categoryName = v.category?.name || 'مصروفات عمومية';

            if (!operatingExpensesByCategory[categoryName]) {
                operatingExpensesByCategory[categoryName] = 0;
            }
            operatingExpensesByCategory[categoryName] += amount;
            operatingExpensesTotal += amount;
        });

        const operatingExpensesArray = Object.entries(operatingExpensesByCategory).map(([category, amount]) => ({
            category,
            amount,
            percentage: operatingExpensesTotal > 0 ? (amount / operatingExpensesTotal) * 100 : 0,
        }));

        // ========== 5. OPERATING PROFIT ==========
        const operatingProfitAmount = grossProfitAmount - operatingExpensesTotal;
        const operatingProfitMargin = totalRevenue > 0 ? (operatingProfitAmount / totalRevenue) * 100 : 0;

        // ========== 6. NET INCOME ==========
        // VAT is already included in revenue, so net income = operating profit
        const netIncomeAmount = operatingProfitAmount;
        const netIncomeMargin = totalRevenue > 0 ? (netIncomeAmount / totalRevenue) * 100 : 0;

        return {
            revenue: {
                clearanceFees,
                customsFeesCollected,
                freightCollected,
                portChargesCollected,
                loadingUnloadingCollected,
                vatCollected,
                otherRevenue,
                total: totalRevenue,
            },
            directCosts: {
                total: directCostsTotal,
                breakdown: directCostsArray,
            },
            grossProfit: {
                amount: grossProfitAmount,
                margin: grossProfitMargin,
            },
            operatingExpenses: {
                total: operatingExpensesTotal,
                breakdown: operatingExpensesArray,
            },
            operatingProfit: {
                amount: operatingProfitAmount,
                margin: operatingProfitMargin,
            },
            netIncome: {
                amount: netIncomeAmount,
                margin: netIncomeMargin,
            },
        };
    }
    private calculatePercentageChange(oldValue: number, newValue: number): number {
        if (oldValue === 0) return newValue > 0 ? 100 : 0;
        return ((newValue - oldValue) / oldValue) * 100;
    }

    /**
     * General Journal Report
     */
    async getGeneralJournal(from?: string, to?: string) {
        const where: Prisma.LedgerEntryWhereInput = {};

        if (from || to) {
            where.createdAt = {};
            if (from) where.createdAt.gte = new Date(from);
            if (to) where.createdAt.lte = new Date(to);
        }

        const entries = await this.prisma.ledgerEntry.findMany({
            where,
            orderBy: [
                { createdAt: 'asc' },
                { id: 'asc' }
            ],
        });

        const totalDebits = entries.reduce((sum, e) => sum + parseFloat(e.amount.toString()), 0);
        const totalCredits = totalDebits; // In double-entry, debits always equal credits

        // Translate account names asynchronously
        const translatedEntries = await Promise.all(
            entries.map(async (entry) => ({
                id: entry.id,
                date: entry.createdAt,
                description: entry.description || 'قيد محاسبي',
                debitAccount: await this.translateAccountName(entry.debitAccount),
                creditAccount: await this.translateAccountName(entry.creditAccount),
                amount: parseFloat(entry.amount.toString()),
                reference: entry.sourceId || '-',
                type: entry.sourceType || 'MANUAL',
            }))
        );

        return {
            period: {
                from: from ? new Date(from) : null,
                to: to ? new Date(to) : null,
            },
            entries: translatedEntries,
            summary: {
                totalDebits,
                totalCredits,
                entryCount: entries.length,
            },
        };
    }

    /**
     * Trial Balance Report
     */
    async getTrialBalance(asOf?: string) {
        const where: Prisma.LedgerEntryWhereInput = {};

        if (asOf) {
            where.createdAt = { lte: new Date(asOf) };
        }

        const entries = await this.prisma.ledgerEntry.findMany({
            where,
        });

        // Group by account
        const accountBalances: { [key: string]: { debit: number; credit: number } } = {};

        entries.forEach(entry => {
            const amount = parseFloat(entry.amount.toString());

            // Debit account
            if (!accountBalances[entry.debitAccount]) {
                accountBalances[entry.debitAccount] = { debit: 0, credit: 0 };
            }
            accountBalances[entry.debitAccount].debit += amount;

            // Credit account
            if (!accountBalances[entry.creditAccount]) {
                accountBalances[entry.creditAccount] = { debit: 0, credit: 0 };
            }
            accountBalances[entry.creditAccount].credit += amount;
        });

        // Convert to array and calculate balances with async translation
        const accounts = await Promise.all(
            Object.entries(accountBalances).map(async ([accountCode, balances]) => {
                const balance = balances.debit - balances.credit;
                return {
                    accountCode,
                    accountName: await this.translateAccountName(accountCode),
                    debit: balances.debit,
                    credit: balances.credit,
                    balance: Math.abs(balance),
                    balanceType: balance >= 0 ? 'debit' : 'credit',
                };
            })
        );

        // Sort by account code
        accounts.sort((a, b) => a.accountCode.localeCompare(b.accountCode));

        // Calculate totals
        const totalDebits = accounts.reduce((sum, acc) => sum + acc.debit, 0);
        const totalCredits = accounts.reduce((sum, acc) => sum + acc.credit, 0);
        const difference = Math.abs(totalDebits - totalCredits);

        return {
            asOfDate: asOf ? new Date(asOf) : new Date(),
            accounts,
            totals: {
                totalDebits,
                totalCredits,
                isBalanced: difference < 0.01, // Allow for floating point errors
                difference,
            },
        };
    }

    /**
     * Customs Report
     */
    async getCustomsReport(from?: string, to?: string, types?: string[]) {
        const where: Prisma.InvoiceWhereInput = {};

        // Date filter
        if (from || to) {
            where.date = {};
            if (from) where.date.gte = new Date(from);
            if (to) where.date.lte = new Date(to);
        }

        // Type filter
        if (types && types.length > 0) {
            where.type = { in: types as any };
        }

        const invoices = await this.prisma.invoice.findMany({
            where,
            include: {
                customer: {
                    select: { name: true },
                },
                items: true,
            },
            orderBy: { date: 'asc' },
        });

        // Keywords for clearance fees identification
        // Exact match first (fastest), then keyword matching (fallback)
        const CLEARANCE_FEE_EXACT_NAME = 'أجور تخليص';
        const clearanceKeywords = ['تخليص', 'اجور تخليص', 'clearance'];

        let totalAmount = 0;
        let totalClearanceFees = 0;

        const processedInvoices = invoices.map(invoice => {
            const invoiceTotal = parseFloat(invoice.total.toString());
            totalAmount += invoiceTotal;

            // Calculate clearance fees from items
            let clearanceFees = 0;
            invoice.items.forEach((item) => {
                // Fast path: exact match (O(1) - most common case)
                if (item.description === CLEARANCE_FEE_EXACT_NAME) {
                    clearanceFees += parseFloat(item.amount.toString());
                } else {
                    // Slow path: keyword matching (fallback for variations)
                    const desc = item.description.toLowerCase();
                    if (clearanceKeywords.some(k => desc.includes(k.toLowerCase()))) {
                        clearanceFees += parseFloat(item.amount.toString());
                    }
                }
            });

            totalClearanceFees += clearanceFees;

            return {
                id: invoice.id,
                date: invoice.date,
                customerName: invoice.customer.name,
                declarationNo: invoice.customsNo || '-',
                type: invoice.type,
                total: invoiceTotal,
                clearanceFees,
            };
        });

        return {
            period: {
                from: from ? new Date(from) : null,
                to: to ? new Date(to) : null,
            },
            filters: {
                types: types || ['IMPORT', 'EXPORT', 'TRANSIT', 'FREE'],
            },
            invoices: processedInvoices,
            summary: {
                totalCount: invoices.length,
                totalAmount,
                totalClearanceFees,
            },
        };
    }

    /**
     * VAT Report - ZATCA Compliant
     * Calculates output VAT (ضريبة المخرجات) from taxed invoices
     */
    async getVatReport(from?: string, to?: string, invoiceType?: string) {
        const where: Prisma.InvoiceWhereInput = {
            vatEnabled: true,
        };

        if (from || to) {
            where.date = {};
            if (from) where.date.gte = new Date(from);
            if (to) where.date.lte = new Date(to);
        }

        if (invoiceType) {
            where.type = invoiceType as any;
        }

        const invoices = await this.prisma.invoice.findMany({
            where,
            include: {
                customer: { select: { name: true } },
                items: true,
            },
            orderBy: { date: 'asc' },
        });

        // Calculate per-invoice details
        let totalTaxableAmount = 0;
        let totalVatAmount = 0;
        let totalWithVat = 0;

        // Group by VAT rate
        const byVatRate: { [rate: string]: { taxableBase: number; vatAmount: number; count: number } } = {};

        // Group by invoice type
        const byInvoiceType: { [type: string]: { taxableBase: number; vatAmount: number; totalWithVat: number; count: number } } = {};

        // Group by quarter
        const byQuarter: { [key: string]: { taxableBase: number; vatAmount: number; totalWithVat: number; count: number } } = {};

        const invoiceDetails = invoices.map(invoice => {
            const vatAmount = invoice.vatAmount ? parseFloat(invoice.vatAmount.toString()) : 0;
            const invoiceTotal = parseFloat(invoice.total.toString());

            // Calculate taxable base from items that actually have VAT (vatRate > 0)
            // Other items (customs fees, etc.) are paid on behalf of client and are NOT taxable
            let taxableBase = 0;
            let itemLevelVatRate = 0;
            if (invoice.items && invoice.items.length > 0) {
                for (const item of invoice.items) {
                    const itemVatRate = parseFloat(item.vatRate?.toString() || '0');
                    if (itemVatRate > 0) {
                        const itemAmount = parseFloat(item.unitPrice.toString()) * parseFloat(item.quantity.toString());
                        taxableBase += itemAmount;
                        // Track the actual VAT rate from items (use the highest one found)
                        if (itemVatRate > itemLevelVatRate) {
                            itemLevelVatRate = itemVatRate;
                        }
                    }
                }
            }
            // Fallback: if no items have VAT rate info, derive from vatAmount
            if (taxableBase === 0 && vatAmount > 0) {
                taxableBase = vatAmount / 0.15; // Reverse calculate from 15%
            }

            totalTaxableAmount += taxableBase;
            totalVatAmount += vatAmount;
            totalWithVat += invoiceTotal;

            // Use item-level vatRate (most accurate), falling back to 15% (Saudi standard)
            const effectiveRate = itemLevelVatRate > 0
                ? Math.round(itemLevelVatRate)
                : 15;

            // Group by VAT rate (rounded)
            const vatRateStr = effectiveRate.toString();
            if (!byVatRate[vatRateStr]) {
                byVatRate[vatRateStr] = { taxableBase: 0, vatAmount: 0, count: 0 };
            }
            byVatRate[vatRateStr].taxableBase += taxableBase;
            byVatRate[vatRateStr].vatAmount += vatAmount;
            byVatRate[vatRateStr].count += 1;

            // Group by invoice type
            const typeKey = invoice.type;
            if (!byInvoiceType[typeKey]) {
                byInvoiceType[typeKey] = { taxableBase: 0, vatAmount: 0, totalWithVat: 0, count: 0 };
            }
            byInvoiceType[typeKey].taxableBase += taxableBase;
            byInvoiceType[typeKey].vatAmount += vatAmount;
            byInvoiceType[typeKey].totalWithVat += invoiceTotal;
            byInvoiceType[typeKey].count += 1;

            // Group by quarter
            const invoiceDate = new Date(invoice.date);
            const month = invoiceDate.getMonth(); // 0-11
            const quarter = Math.floor(month / 3) + 1; // 1-4
            const year = invoiceDate.getFullYear();
            const quarterKey = `${year}-Q${quarter}`;

            if (!byQuarter[quarterKey]) {
                byQuarter[quarterKey] = { taxableBase: 0, vatAmount: 0, totalWithVat: 0, count: 0 };
            }
            byQuarter[quarterKey].taxableBase += taxableBase;
            byQuarter[quarterKey].vatAmount += vatAmount;
            byQuarter[quarterKey].totalWithVat += invoiceTotal;
            byQuarter[quarterKey].count += 1;

            return {
                id: invoice.id,
                code: invoice.code,
                date: invoice.date,
                customerName: invoice.customer?.name || '-',
                type: invoice.type,
                subtotal: taxableBase,
                vatRate: effectiveRate,
                vatAmount,
                total: invoiceTotal,
            };
        });

        // Convert rate groups to array
        const vatByRate = Object.entries(byVatRate)
            .map(([rate, data]) => ({
                rate: parseFloat(rate),
                taxableBase: data.taxableBase,
                vatAmount: data.vatAmount,
                count: data.count,
            }))
            .sort((a, b) => b.rate - a.rate);

        // Convert type groups to array with Arabic labels
        const typeLabels: { [key: string]: string } = {
            IMPORT: 'استيراد',
            EXPORT: 'تصدير',
            TRANSIT: 'ترانزيت',
            FREE: 'حرة',
        };

        const vatByType = Object.entries(byInvoiceType)
            .map(([type, data]) => ({
                type,
                label: typeLabels[type] || type,
                taxableBase: data.taxableBase,
                vatAmount: data.vatAmount,
                totalWithVat: data.totalWithVat,
                count: data.count,
            }))
            .sort((a, b) => b.vatAmount - a.vatAmount);

        // Convert quarter groups to array with Arabic labels
        const quarterLabels: { [key: string]: string } = {
            'Q1': 'الربع الأول (يناير - مارس)',
            'Q2': 'الربع الثاني (أبريل - يونيو)',
            'Q3': 'الربع الثالث (يوليو - سبتمبر)',
            'Q4': 'الربع الرابع (أكتوبر - ديسمبر)',
        };

        const vatByQuarter = Object.entries(byQuarter)
            .map(([key, data]) => {
                const [year, q] = key.split('-');
                return {
                    key,
                    year: parseInt(year),
                    quarter: q,
                    label: `${quarterLabels[q]} ${year}`,
                    taxableBase: data.taxableBase,
                    vatAmount: data.vatAmount,
                    totalWithVat: data.totalWithVat,
                    count: data.count,
                };
            })
            .sort((a, b) => a.key.localeCompare(b.key));

        return {
            period: {
                from: from ? new Date(from) : null,
                to: to ? new Date(to) : null,
            },
            summary: {
                totalTaxableAmount,
                totalVatAmount,
                totalWithVat,
                invoiceCount: invoices.length,
            },
            vatByRate,
            vatByType,
            vatByQuarter,
            invoices: invoiceDetails,
        };
    }


    /**
     * Translate account codes to Arabic names
     */
    private async translateAccountName(accountCode: string): Promise<string> {
        // Handle static translations first
        const staticTranslations: { [key: string]: string } = {
            'cash': 'النقدية',
            'treasury': 'الخزنة',
            'bank': 'البنك',
            'accounts_receivable': 'العملاء (المدينون)',
            'accounts_payable': 'الموردون (الدائنون)',
            'revenue': 'الإيرادات',
            'revenue:customs': 'إيرادات التخليص الجمركي',
            'revenue:services': 'إيرادات الخدمات',
            'revenue:import': 'إيرادات الاستيراد',
            'revenue:export': 'إيرادات التصدير',
            'revenue:transit': 'إيرادات الترانزيت',
            'revenue:free': 'إيرادات حرة',
            'expense': 'المصروفات',
            'expense:salaries': 'مصروف الرواتب',
            'expense:rent': 'مصروف الإيجار',
            'expense:utilities': 'مصروف المرافق',
            'expense:maintenance': 'مصروف الصيانة',
            'expense:shipping': 'مصروف الشحن',
            'expense:agent_fees': 'عمولات الوكلاء',
            'assets': 'الأصول',
            'liabilities': 'الخصوم',
            'equity': 'حقوق الملكية',
        };

        if (staticTranslations[accountCode]) {
            return staticTranslations[accountCode];
        }

        // Handle dynamic account codes with IDs
        if (accountCode.startsWith('customer:')) {
            const customerId = accountCode.split(':')[1];
            const customer = await this.prisma.customer.findUnique({
                where: { id: customerId },
                select: { name: true },
            });
            return customer ? `العميل: ${customer.name}` : 'عميل';
        }

        if (accountCode.startsWith('bank:')) {
            const bankAccountId = accountCode.split(':')[1];
            const bankAccount = await this.prisma.bankAccount.findUnique({
                where: { id: bankAccountId },
                select: { accountNo: true, bank: { select: { name: true } } },
            });
            return bankAccount ? `بنك: ${bankAccount.bank.name} - ${bankAccount.accountNo}` : 'بنك';
        }

        if (accountCode.startsWith('agent:')) {
            const agentId = accountCode.split(':')[1];
            const agent = await this.prisma.agent.findUnique({
                where: { id: agentId },
                select: { name: true },
            });
            return agent ? `الوكيل: ${agent.name}` : 'وكيل';
        }

        if (accountCode.startsWith('expense:') && accountCode.includes('-')) {
            // This is an expense category ID (UUID format)
            const categoryId = accountCode.split(':')[1];
            const category = await this.prisma.expenseCategory.findUnique({
                where: { id: categoryId },
                select: { name: true },
            });
            return category ? `مصروف: ${category.name}` : 'مصروف';
        }

        // Return as-is if no translation found
        return accountCode;
    }

    /**
     * Customer Group Statement
     * Aggregates individual customer statements for all customers in a group.
     */
    async getCustomerGroupStatement(groupId: string, from?: string, to?: string) {
        const group = await this.prisma.customerGroup.findUnique({
            where: { id: groupId },
            include: {
                customers: {
                    where: { deletedAt: null },
                    select: { id: true, name: true },
                },
            },
        });

        if (!group) {
            throw new Error('المجموعة غير موجودة');
        }

        // Get individual statements for each customer
        const customerStatements = await Promise.all(
            group.customers.map(async (customer) => {
                const statement = await this.getCustomerStatement(customer.id, from, to);
                return {
                    customerId: customer.id,
                    customerName: customer.name,
                    ...statement,
                };
            }),
        );

        // Calculate group-level summary
        const groupSummary = {
            totalInvoices: customerStatements.reduce((sum, s) => sum + s.summary.totalInvoices, 0),
            totalPayments: customerStatements.reduce((sum, s) => sum + s.summary.totalPayments, 0),
            totalOpeningBalance: customerStatements.reduce((sum, s) => sum + s.openingBalance, 0),
            totalBalance: customerStatements.reduce(
                (sum, s) => sum + s.openingBalance + s.summary.totalInvoices - s.summary.totalPayments,
                0,
            ),
        };

        return {
            group: {
                id: group.id,
                name: group.name,
                notes: group.notes,
            },
            customerStatements,
            summary: groupSummary,
        };
    }
}
