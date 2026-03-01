import { IsOptional, IsString, IsEnum } from 'class-validator';
import { PartyType, PaymentMethod } from '@prisma/client';

export class ExpensesReportDto {
    @IsOptional()
    @IsString()
    startDate?: string;

    @IsOptional()
    @IsString()
    endDate?: string;

    @IsOptional()
    @IsString()
    categoryId?: string;

    @IsOptional()
    @IsEnum(PartyType)
    partyType?: PartyType;

    @IsOptional()
    @IsEnum(PaymentMethod)
    method?: PaymentMethod;
}
