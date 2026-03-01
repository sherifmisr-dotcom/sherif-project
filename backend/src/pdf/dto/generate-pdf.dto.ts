import { IsString, IsArray, IsObject, IsDateString, IsNumber, IsOptional } from 'class-validator';

export class GenerateAgentStatementDto {
    @IsString()
    agentName: string;

    @IsString()
    startDate: string;

    @IsString()
    endDate: string;

    @IsArray()
    transactions: any[];

    @IsOptional()
    @IsString()
    balanceInWords?: string;

    @IsObject()
    summary: {
        totalDebit: number;
        totalCredit: number;
        finalBalance: number;
    };
}


export class GenerateCustomerStatementDto {
    @IsString()
    customerName: string;

    @IsString()
    startDate: string;

    @IsString()
    endDate: string;

    @IsArray()
    transactions: any[];

    @IsObject()
    summary: {
        totalDebit: number;
        totalCredit: number;
        finalBalance: number;
    };
}


export class GenerateCustomsReportDto {
    @IsString()
    startDate: string;

    @IsString()
    endDate: string;

    @IsArray()
    selectedTypes: string[];

    @IsArray()
    invoices: any[];

    @IsNumber()
    totalCount: number;

    @IsNumber()
    totalAmount: number;
}
