import { Injectable } from '@nestjs/common';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import * as Handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';
import { GenerateAgentStatementDto, GenerateCustomerStatementDto, GenerateCustomsReportDto } from './dto/generate-pdf.dto';

@Injectable()
export class PdfService {
    private async getBrowser() {
        // For development on Windows, use local Chrome
        const isProduction = process.env.NODE_ENV === 'production';

        if (isProduction) {
            return await puppeteer.launch({
                args: chromium.args,
                executablePath: await chromium.executablePath(),
                headless: true,
            });
        } else {
            // Local Chrome path for Windows
            return await puppeteer.launch({
                headless: true,
                executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
                args: ['--no-sandbox', '--disable-setuid-sandbox'],
            });
        }
    }

    private loadTemplate(templateName: string): HandlebarsTemplateDelegate {
        // Try dist path first (production), then src path (development)
        const distPath = path.join(__dirname, 'templates', `${templateName}.hbs`);
        const srcPath = path.join(__dirname, '..', 'src', 'pdf', 'templates', `${templateName}.hbs`);

        let templatePath = distPath;
        if (!fs.existsSync(distPath)) {
            templatePath = srcPath;
        }

        const templateContent = fs.readFileSync(templatePath, 'utf-8');
        return Handlebars.compile(templateContent);
    }

    private formatCurrency(amount: number): string {
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(amount);
    }

    private formatNumber(num: number): string {
        if (num === 0) return '-';
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(num);
    }

    private formatDate(date: any): string {
        // If already a formatted string (contains /), return as is
        if (typeof date === 'string' && date.includes('/')) {
            return date;
        }

        // Try to parse and format
        try {
            const dateObj = new Date(date);
            if (isNaN(dateObj.getTime())) {
                return String(date); // Return original if invalid
            }
            return new Intl.DateTimeFormat('en-GB', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
            }).format(dateObj);
        } catch (error) {
            return String(date); // Return original on error
        }
    }

    async generateAgentStatement(data: GenerateAgentStatementDto): Promise<Buffer> {
        const browser = await this.getBrowser();

        try {
            const template = this.loadTemplate('agent-statement');

            // Prepare data with formatting
            const formattedData = {
                ...data,
                balanceInWords: data.balanceInWords || 'فقط لا غير',
                transactions: data.transactions.map(tx => ({
                    ...tx,
                    date: this.formatDate(tx.date),
                    debit: this.formatNumber(tx.debit),
                    credit: this.formatNumber(tx.credit),
                    balance: this.formatNumber(tx.balance),
                })),
                summary: {
                    totalDebit: this.formatNumber(data.summary.totalDebit),
                    totalCredit: this.formatNumber(data.summary.totalCredit),
                    finalBalance: this.formatNumber(data.summary.finalBalance),
                },
                startDate: this.formatDate(new Date(data.startDate)),
                endDate: this.formatDate(new Date(data.endDate)),
            };

            const html = template(formattedData);

            const page = await browser.newPage();
            await page.setContent(html, { waitUntil: 'networkidle0' });

            const pdf = await page.pdf({
                format: 'A4',
                printBackground: true,
                margin: {
                    top: '10mm',
                    right: '10mm',
                    bottom: '10mm',
                    left: '10mm',
                },
            });

            await page.close();
            return Buffer.from(pdf);
        } finally {
            await browser.close();
        }
    }

    async generateCustomerStatement(data: GenerateCustomerStatementDto): Promise<Buffer> {
        const browser = await this.getBrowser();

        try {
            const template = this.loadTemplate('customer-statement');

            const formattedData = {
                ...data,
                transactions: data.transactions.map(tx => ({
                    ...tx,
                    date: this.formatDate(tx.date),
                    debit: this.formatCurrency(tx.debit),
                    credit: this.formatCurrency(tx.credit),
                    balance: this.formatCurrency(tx.balance),
                })),
                summary: {
                    totalDebit: this.formatCurrency(data.summary.totalDebit),
                    totalCredit: this.formatCurrency(data.summary.totalCredit),
                    finalBalance: this.formatCurrency(data.summary.finalBalance),
                },
                startDate: this.formatDate(new Date(data.startDate)),
                endDate: this.formatDate(new Date(data.endDate)),
            };

            const html = template(formattedData);

            const page = await browser.newPage();
            await page.setContent(html, { waitUntil: 'networkidle0' });

            const pdf = await page.pdf({
                format: 'A4',
                printBackground: true,
                margin: {
                    top: '10mm',
                    right: '10mm',
                    bottom: '10mm',
                    left: '10mm',
                },
            });

            await page.close();
            return Buffer.from(pdf);
        } finally {
            await browser.close();
        }
    }

    async generateCustomsReport(data: GenerateCustomsReportDto): Promise<Buffer> {
        const browser = await this.getBrowser();

        try {
            const template = this.loadTemplate('customs-report');

            const TYPE_LABELS = {
                IMPORT: 'وارد',
                EXPORT: 'صادر',
                TRANSIT: 'ترانزيت',
                FREE: 'حر',
            };

            const formattedData = {
                ...data,
                invoices: data.invoices.map(inv => ({
                    ...inv,
                    date: this.formatDate(inv.date),
                    total: this.formatCurrency(inv.total),
                    typeLabel: TYPE_LABELS[inv.type],
                })),
                totalAmount: this.formatCurrency(data.totalAmount),
                startDate: this.formatDate(new Date(data.startDate)),
                endDate: this.formatDate(new Date(data.endDate)),
                selectedTypesText: data.selectedTypes.map(t => TYPE_LABELS[t]).join(' - '),
            };

            const html = template(formattedData);

            const page = await browser.newPage();
            await page.setContent(html, { waitUntil: 'networkidle0' });

            const pdf = await page.pdf({
                format: 'A4',
                printBackground: true,
                margin: {
                    top: '10mm',
                    right: '10mm',
                    bottom: '10mm',
                    left: '10mm',
                },
            });

            await page.close();
            return Buffer.from(pdf);
        } finally {
            await browser.close();
        }
    }
}
