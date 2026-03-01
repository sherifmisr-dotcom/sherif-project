import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateExpenseCategoryDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty({ message: 'اسم التصنيف مطلوب' })
    name: string;
}

export class UpdateExpenseCategoryDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    name?: string;
}
