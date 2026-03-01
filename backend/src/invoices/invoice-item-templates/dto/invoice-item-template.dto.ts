import { IsString, IsNotEmpty, IsNumber, IsOptional, Min, Max } from 'class-validator';

export class CreateInvoiceItemTemplateDto {
    @IsString()
    @IsNotEmpty()
    description: string;

    @IsNumber()
    @IsOptional()
    @Min(0)
    @Max(100)
    vatRate?: number; // نسبة الضريبة الافتراضية
}

export class UpdateInvoiceItemTemplateDto {
    @IsString()
    @IsOptional()
    description?: string;

    @IsNumber()
    @IsOptional()
    @Min(0)
    @Max(100)
    vatRate?: number;
}
