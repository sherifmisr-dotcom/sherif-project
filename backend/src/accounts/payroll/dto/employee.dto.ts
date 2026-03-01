import { IsString, IsNotEmpty, IsOptional, IsNumber, IsEnum, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EmployeeStatus } from '@prisma/client';

export class CreateEmployeeDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty({ message: 'اسم الموظف مطلوب' })
    name: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    department?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsDateString()
    startDate?: string;

    @ApiProperty()
    @IsNumber()
    @IsNotEmpty({ message: 'الراتب الأساسي مطلوب' })
    baseSalary: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    allowances?: number;

    @ApiPropertyOptional({ enum: EmployeeStatus })
    @IsOptional()
    @IsEnum(EmployeeStatus)
    status?: EmployeeStatus;
}

export class UpdateEmployeeDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    name?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    department?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsDateString()
    startDate?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    baseSalary?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    allowances?: number;

    @ApiPropertyOptional({ enum: EmployeeStatus })
    @IsOptional()
    @IsEnum(EmployeeStatus)
    status?: EmployeeStatus;
}

export class QueryEmployeesDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    q?: string;

    @ApiPropertyOptional({ enum: EmployeeStatus })
    @IsOptional()
    @IsEnum(EmployeeStatus)
    status?: EmployeeStatus;

    @ApiPropertyOptional({ default: 1 })
    @IsOptional()
    @IsNumber()
    page?: number;

    @ApiPropertyOptional({ default: 20 })
    @IsOptional()
    @IsNumber()
    limit?: number;
}
