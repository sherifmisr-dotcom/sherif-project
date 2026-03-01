import { IsArray, IsString } from 'class-validator';

export class UpdateIncomeStatementSettingsDto {
    @IsArray()
    @IsString({ each: true })
    revenueItemTemplateIds: string[];

    @IsArray()
    @IsString({ each: true })
    expenseCategoryIds: string[];
}
