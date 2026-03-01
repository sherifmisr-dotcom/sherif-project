import { IsString, IsNotEmpty, IsArray, IsNumber, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PayrollStatus, PaymentMethod } from '@prisma/client';
import { Type } from 'class-transformer';

export class PayrollItemDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    employeeId: string;

    @ApiProperty()
    @IsNumber()
    base: number;

    @ApiProperty()
    @IsNumber()
    allowances: number;

    @ApiProperty()
    @IsNumber()
    deductions: number;
}

export class CreatePayrollRunDto {
    @ApiProperty()
    @IsDateString()
    @IsNotEmpty({ message: 'الشهر مطلوب' })
    month: string;

    @ApiPropertyOptional({ type: [PayrollItemDto] })
    @IsOptional()
    @IsArray()
    @Type(() => PayrollItemDto)
    items?: PayrollItemDto[];
}

export class UpdatePayrollRunDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsDateString()
    month?: string;

    @ApiPropertyOptional({ type: [PayrollItemDto] })
    @IsOptional()
    @IsArray()
    @Type(() => PayrollItemDto)
    items?: PayrollItemDto[];
}

export class ApprovePayrollRunDto {
    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    runId: string;

    @ApiPropertyOptional({ enum: PaymentMethod })
    @IsOptional()
    @IsEnum(PaymentMethod)
    paymentMethod?: PaymentMethod;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    bankAccountId?: string;
}

export class QueryPayrollRunsDto {
    @ApiPropertyOptional({ enum: PayrollStatus })
    @IsOptional()
    @IsEnum(PayrollStatus)
    status?: PayrollStatus;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    month?: string;

    @ApiPropertyOptional({ default: 1 })
    @IsOptional()
    @IsNumber()
    page?: number;

    @ApiPropertyOptional({ default: 20 })
    @IsOptional()
    @IsNumber()
    limit?: number;
}
