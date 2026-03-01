import { Controller, Get, Query, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
    constructor(private readonly reportsService: ReportsService) { }

    @Get('treasury')
    @ApiOperation({ summary: 'Treasury report' })
    getTreasuryReport(@Query('from') from?: string, @Query('to') to?: string) {
        return this.reportsService.getTreasuryReport(from, to);
    }

    @Get('bank-transactions')
    @ApiOperation({ summary: 'Get all bank transactions' })
    getBankTransactions(
        @Query('limit') limit?: string,
        @Query('bankAccountId') bankAccountId?: string,
    ) {
        return this.reportsService.getBankTransactions(
            limit ? parseInt(limit) : undefined,
            bankAccountId
        );
    }

    @Get('customer/:id')
    @ApiOperation({ summary: 'Customer statement' })
    getCustomerStatement(
        @Param('id') id: string,
        @Query('from') from?: string,
        @Query('to') to?: string,
    ) {
        return this.reportsService.getCustomerStatement(id, from, to);
    }

    @Get('income-expense')
    @ApiOperation({ summary: 'Income/Expense report' })
    getIncomeExpenseReport(@Query('from') from?: string, @Query('to') to?: string) {
        return this.reportsService.getIncomeExpenseReport(from, to);
    }

    @Get('agent/:id')
    @ApiOperation({ summary: 'Agent statement' })
    getAgentStatement(
        @Param('id') id: string,
        @Query('from') from?: string,
        @Query('to') to?: string,
    ) {
        return this.reportsService.getAgentStatement(id, from, to);
    }

    @Get('bank/:id')
    @ApiOperation({ summary: 'Bank account report' })
    getBankReport(
        @Param('id') id: string,
        @Query('from') from?: string,
        @Query('to') to?: string,
    ) {
        return this.reportsService.getBankReport(id, from, to);
    }

    @Get('income-statement')
    @ApiOperation({ summary: 'Income statement report' })
    getIncomeStatement(
        @Query('from') from?: string,
        @Query('to') to?: string,
    ) {
        return this.reportsService.getIncomeStatement(from, to);
    }

    @Get('general-journal')
    @ApiOperation({ summary: 'General journal report' })
    getGeneralJournal(
        @Query('from') from?: string,
        @Query('to') to?: string,
    ) {
        return this.reportsService.getGeneralJournal(from, to);
    }

    @Get('trial-balance')
    @ApiOperation({ summary: 'Trial balance report' })
    getTrialBalance(@Query('asOf') asOf?: string) {
        return this.reportsService.getTrialBalance(asOf);
    }

    @Get('customs')
    @ApiOperation({ summary: 'Customs report' })
    getCustomsReport(
        @Query('from') from?: string,
        @Query('to') to?: string,
        @Query('types') types?: string,
    ) {
        const typeArray = types ? types.split(',') : undefined;
        return this.reportsService.getCustomsReport(from, to, typeArray);
    }

    @Get('vat')
    @ApiOperation({ summary: 'VAT report (ZATCA compliant)' })
    getVatReport(
        @Query('from') from?: string,
        @Query('to') to?: string,
        @Query('type') type?: string,
    ) {
        return this.reportsService.getVatReport(from, to, type);
    }

    @Get('customer-group/:id')
    @ApiOperation({ summary: 'Customer group statement' })
    getCustomerGroupStatement(
        @Param('id') id: string,
        @Query('from') from?: string,
        @Query('to') to?: string,
    ) {
        return this.reportsService.getCustomerGroupStatement(id, from, to);
    }
}
