import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SystemService {
    constructor(private prisma: PrismaService) { }

    async resetSystem() {
        // Delete all data in correct order (respecting foreign key constraints)

        // 1. Delete invoice-related data
        await this.prisma.invoiceItem.deleteMany();

        // 2. Delete customs fee batch items (references invoices) then batches (references vouchers)
        await this.prisma.customsFeeBatchItem.deleteMany();
        await this.prisma.customsFeeBatch.deleteMany();

        // 3. Delete invoices (after invoice items and customs fee batch items)
        await this.prisma.invoice.deleteMany();

        // 4. Delete payroll data (payrollItem references voucher, must be before vouchers)
        await this.prisma.payrollItem.deleteMany();
        await this.prisma.payrollRun.deleteMany();
        await this.prisma.employee.deleteMany();

        // 5. Delete treasury and bank transactions (reference vouchers)
        await this.prisma.treasuryTransaction.deleteMany();
        await this.prisma.bankTransaction.deleteMany();

        // 6. Delete ledger entries (reference vouchers/invoices)
        await this.prisma.ledgerEntry.deleteMany();

        // 7. Delete vouchers (after all references are cleared)
        await this.prisma.voucher.deleteMany();

        // 8. Delete agent-related data (must be before agents)
        await this.prisma.trip.deleteMany();
        await this.prisma.additionalFee.deleteMany();
        await this.prisma.vessel.deleteMany();

        // 9. Delete bank accounts (after bank transactions and vouchers)
        await this.prisma.bankAccount.deleteMany();

        // 10. Delete customers, customer groups, and agents
        await this.prisma.customer.deleteMany();
        await this.prisma.customerGroup.deleteMany();
        await this.prisma.agent.deleteMany();

        // 11. Delete backup history records
        await this.prisma.backup.deleteMany();

        // 12. Delete invoice item templates and recreate defaults
        await this.prisma.invoiceItemTemplate.deleteMany();

        const invoiceItemTemplates = [
            { description: 'أجور تخليص', vatRate: 15.00, isProtected: true, sortOrder: 1, isActive: true },
            { description: 'رسوم جمركية', vatRate: 0, isProtected: true, sortOrder: 2, isActive: true },
        ];

        for (const template of invoiceItemTemplates) {
            await this.prisma.invoiceItemTemplate.create({
                data: template,
            });
        }

        // 13. Delete expense categories and recreate defaults
        await this.prisma.expenseCategory.deleteMany();

        const expenseCategories = [
            // Protected categories (cannot be deleted)
            { name: 'رسوم جمركية', isProtected: true, sortOrder: 1 },
            { name: 'الوكلاء الملاحيين', isProtected: true, sortOrder: 2 },
            { name: 'رواتب وسلف', isProtected: true, sortOrder: 3 },
            // Non-protected default categories (can be deleted)
            { name: 'إيجار', isProtected: false, sortOrder: 10 },
            { name: 'كهرباء وماء', isProtected: false, sortOrder: 11 },
            { name: 'صيانة', isProtected: false, sortOrder: 12 },
            { name: 'مصاريف إدارية', isProtected: false, sortOrder: 13 },
            { name: 'مصاريف أخرى', isProtected: false, sortOrder: 14 },
        ];

        for (const category of expenseCategories) {
            await this.prisma.expenseCategory.create({
                data: category,
            });
        }

        // 14. Delete banks
        await this.prisma.bank.deleteMany();

        // 15. Delete treasury settings and carry-forward data
        await this.prisma.carryForwardLog.deleteMany();
        await this.prisma.carryForwardSettings.deleteMany();
        await this.prisma.treasurySettings.deleteMany();

        // 16. Delete notifications
        await this.prisma.notification.deleteMany();

        // 17. Delete agent setting logs
        await this.prisma.agentSettingLog.deleteMany();

        // 18. Reset treasury to zero balance
        await this.prisma.treasury.update({
            where: { id: 'single_row' },
            data: {
                currentBalance: 0,
                openingBalance: null,
                openingSetAt: null,
                openingSetBy: null,
            },
        });

        // 19. Delete audit logs and permission audit logs
        await this.prisma.auditLog.deleteMany();
        await this.prisma.permissionAuditLog.deleteMany();

        // 20. Delete all users except Super Admin
        await this.prisma.user.deleteMany({
            where: {
                isSuperAdmin: { not: true },
            },
        });

        // 21. Reset app settings to defaults (all fields)
        try {
            await this.prisma.appSetting.update({
                where: { id: 'single_row' },
                data: {
                    autoBackupEnabled: true,
                    autoBackupFrequency: 'DAILY',
                    autoBackupTime: '02:00',
                    backupRetentionDays: 30,
                    preventNegativeTreasury: true,
                    preventNegativeBank: true,
                    defaultFreightPerTruck: 0,
                    defaultPortFeesPerTruck: 0,
                    defaultTransitPortFees: 0,
                },
            });
        } catch (e) {
            // If appSetting doesn't exist yet, ignore
        }

        // 22. Reset income statement settings to defaults
        try {
            await this.prisma.incomeStatementSettings.deleteMany();
        } catch (e) {
            // If table doesn't exist, ignore
        }

        // 23. Reset company settings to defaults
        try {
            await this.prisma.companySetting.update({
                where: { id: 'single_row' },
                data: {
                    nameAr: 'نظام إدارة العمليات الجمركية',
                    nameEn: 'Customs Operations Management System',
                    activityAr: null,
                    activityEn: null,
                    taxNumber: null,
                    licenseNo: null,
                    email: null,
                    phone: null,
                    addressAr: null,
                    addressEn: null,
                    logoPath: null,
                },
            });
        } catch (e) {
            // If companySetting doesn't exist yet, ignore
        }

        // 24. Reset print settings to defaults
        try {
            await this.prisma.printSetting.update({
                where: { id: 'single_row' },
                data: {
                    headerRightAr: null,
                    headerLeftEn: null,
                    numberingFormat: '{TYPE}-{YY}-{0001}',
                },
            });
        } catch (e) {
            // If printSetting doesn't exist yet, ignore
        }

        return { message: 'تم إعادة تعيين النظام بنجاح' };
    }
}
