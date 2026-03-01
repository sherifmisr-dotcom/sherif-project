import {
    IsString,
    IsNotEmpty,
    IsOptional,
    IsArray,
    IsNumber,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCustomerGroupDto {
    @ApiProperty({ example: 'مجموعة شركات أحمد' })
    @IsString({ message: 'اسم المجموعة مطلوب' })
    @IsNotEmpty({ message: 'اسم المجموعة مطلوب' })
    name: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    notes?: string;

    @ApiPropertyOptional({ type: [String] })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    customerIds?: string[];
}

export class UpdateCustomerGroupDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    name?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    notes?: string;

    @ApiPropertyOptional({ type: [String] })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    customerIds?: string[];
}

export class QueryCustomerGroupsDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    q?: string;

    @ApiPropertyOptional({ default: 1 })
    @IsOptional()
    @IsNumber()
    page?: number;

    @ApiPropertyOptional({ default: 20 })
    @IsOptional()
    @IsNumber()
    limit?: number;
}
