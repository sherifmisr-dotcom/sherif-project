import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
    UpdateCompanySettingsDto,
    UpdateAppSettingsDto,
    UpdatePrintSettingsDto,
} from './dto/settings.dto';

@Injectable()
export class SettingsService {
    constructor(private prisma: PrismaService) { }

    // ============ COMPANY SETTINGS ============

    async getCompanySettings() {
        return this.prisma.companySetting.findUnique({
            where: { id: 'single_row' },
        });
    }

    async updateCompanySettings(dto: UpdateCompanySettingsDto) {
        return this.prisma.companySetting.update({
            where: { id: 'single_row' },
            data: dto,
        });
    }

    // ============ APP SETTINGS ============

    async getAppSettings() {
        return this.prisma.appSetting.findUnique({
            where: { id: 'single_row' },
        });
    }

    async updateAppSettings(dto: UpdateAppSettingsDto) {
        return this.prisma.appSetting.update({
            where: { id: 'single_row' },
            data: dto,
        });
    }

    // ============ PRINT SETTINGS ============

    async getPrintSettings() {
        return this.prisma.printSetting.findUnique({
            where: { id: 'single_row' },
        });
    }

    async updatePrintSettings(dto: UpdatePrintSettingsDto) {
        return this.prisma.printSetting.update({
            where: { id: 'single_row' },
            data: dto,
        });
    }

    // ============ INCOME STATEMENT SETTINGS ============

    async getIncomeStatementSettings() {
        let settings = await this.prisma.incomeStatementSettings.findUnique({
            where: { id: 'single_row' },
        });

        // If no settings exist, create default (all templates and categories)
        if (!settings) {
            const templates = await this.prisma.invoiceItemTemplate.findMany({
                where: { isActive: true },
                select: { id: true },
            });
            const categories = await this.prisma.expenseCategory.findMany({
                select: { id: true },
            });

            settings = await this.prisma.incomeStatementSettings.create({
                data: {
                    id: 'single_row',
                    revenueItemTemplateIds: templates.map(t => t.id),
                    expenseCategoryIds: categories.map(c => c.id),
                },
            });
        }

        return settings;
    }

    async updateIncomeStatementSettings(data: { revenueItemTemplateIds: string[]; expenseCategoryIds: string[] }) {
        return this.prisma.incomeStatementSettings.upsert({
            where: { id: 'single_row' },
            create: {
                id: 'single_row',
                ...data,
            },
            update: data,
        });
    }

    // ============ ALL SETTINGS ============

    async getAllSettings() {
        const [company, app, print] = await Promise.all([
            this.getCompanySettings(),
            this.getAppSettings(),
            this.getPrintSettings(),
        ]);

        return {
            company,
            app,
            print,
        };
    }
}
