import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString, IsArray, ValidateNested, IsNumber, Min, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMethod } from '@prisma/client';

export class CustomsFeeBatchItemDto {
  @IsString()
  @IsNotEmpty({ message: 'رقم البيان مطلوب' })
  customsNo: string;

  @IsNumber()
  @Min(0.01, { message: 'المبلغ يجب أن يكون أكبر من صفر' })
  amount: number;
}

export class CreateCustomsFeeBatchDto {
  @IsDateString()
  @IsNotEmpty({ message: 'التاريخ مطلوب' })
  date: string;

  @IsEnum(PaymentMethod, { message: 'طريقة الدفع غير صحيحة' })
  method: PaymentMethod;

  @IsOptional()
  @IsString()
  bankAccountId?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'يجب إضافة بيان جمركي واحد على الأقل' })
  @ValidateNested({ each: true })
  @Type(() => CustomsFeeBatchItemDto)
  items: CustomsFeeBatchItemDto[];
}

export class UpdateCustomsFeeBatchDto {
  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsEnum(PaymentMethod)
  method?: PaymentMethod;

  @IsOptional()
  @IsString()
  bankAccountId?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomsFeeBatchItemDto)
  items?: CustomsFeeBatchItemDto[];
}
