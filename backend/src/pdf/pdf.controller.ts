import { Controller, Post, Body, Res, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { PdfService } from './pdf.service';
import { GenerateAgentStatementDto, GenerateCustomerStatementDto, GenerateCustomsReportDto } from './dto/generate-pdf.dto';

@Controller('pdf')
export class PdfController {
    constructor(private readonly pdfService: PdfService) { }

    @Post('agent-statement')
    async generateAgentStatement(
        @Body() data: GenerateAgentStatementDto,
        @Res() res: Response,
    ) {
        try {
            const pdf = await this.pdfService.generateAgentStatement(data);

            const date = new Date().toISOString().split('T')[0];
            const safeFilename = `Agent_Statement_${date}.pdf`;
            const encodedFilename = encodeURIComponent(`كشف_حساب_وكيل_${data.agentName}_${date}.pdf`);

            res.set({
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${safeFilename}"; filename*=UTF-8''${encodedFilename}`,
                'Content-Length': pdf.length,
            });

            res.send(pdf);
        } catch (error) {
            console.error('Error generating agent statement PDF:', error);
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                message: 'Failed to generate PDF',
                error: error.message,
            });
        }
    }

    @Post('customer-statement')
    async generateCustomerStatement(
        @Body() data: GenerateCustomerStatementDto,
        @Res() res: Response,
    ) {
        try {
            const pdf = await this.pdfService.generateCustomerStatement(data);

            const date = new Date().toISOString().split('T')[0];
            const safeFilename = `Customer_Statement_${date}.pdf`;
            const encodedFilename = encodeURIComponent(`كشف_حساب_عميل_${data.customerName}_${date}.pdf`);

            res.set({
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${safeFilename}"; filename*=UTF-8''${encodedFilename}`,
                'Content-Length': pdf.length,
            });

            res.send(pdf);
        } catch (error) {
            console.error('Error generating customer statement PDF:', error);
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                message: 'Failed to generate PDF',
                error: error.message,
            });
        }
    }

    @Post('customs-report')
    async generateCustomsReport(
        @Body() data: GenerateCustomsReportDto,
        @Res() res: Response,
    ) {
        try {
            const pdf = await this.pdfService.generateCustomsReport(data);

            const date = new Date().toISOString().split('T')[0];
            const safeFilename = `Customs_Report_${date}.pdf`;
            const encodedFilename = encodeURIComponent(`التقرير_الجمركي_${date}.pdf`);

            res.set({
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${safeFilename}"; filename*=UTF-8''${encodedFilename}`,
                'Content-Length': pdf.length,
            });

            res.send(pdf);
        } catch (error) {
            console.error('Error generating customs report PDF:', error);
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                message: 'Failed to generate PDF',
                error: error.message,
            });
        }
    }
}
