import { IsEnum, IsOptional, IsString, IsNumber, Min, IsDateString, ValidateIf, IsBoolean } from 'class-validator';

export class CreateInternalTransferDto {
    @IsEnum(['TREASURY', 'BANK'], { message: 'نوع المصدر يجب أن يكون TREASURY أو BANK' })
    sourceType: string;

    @ValidateIf(o => o.sourceType === 'BANK')
    @IsString({ message: 'معرف حساب المصدر مطلوب عندما يكون المصدر بنك' })
    sourceAccountId?: string;

    @IsEnum(['TREASURY', 'BANK'], { message: 'نوع الوجهة يجب أن يكون TREASURY أو BANK' })
    destType: string;

    @ValidateIf(o => o.destType === 'BANK')
    @IsString({ message: 'معرف حساب الوجهة مطلوب عندما تكون الوجهة بنك' })
    destAccountId?: string;

    @IsNumber({}, { message: 'المبلغ يجب أن يكون رقماً' })
    @Min(0.01, { message: 'المبلغ يجب أن يكون أكبر من صفر' })
    amount: number;

    @IsDateString({}, { message: 'التاريخ غير صحيح' })
    date: string;

    @IsOptional()
    @IsString()
    note?: string;

    @IsOptional()
    @IsString()
    referenceNumber?: string;

    @IsOptional()
    @IsBoolean()
    hasBankFees?: boolean;

    @IsOptional()
    @IsNumber()
    actualAmountReceived?: number;
}
