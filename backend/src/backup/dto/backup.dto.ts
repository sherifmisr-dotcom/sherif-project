import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsInt, Min, IsIn } from 'class-validator';

export class CreateBackupDto {
    @ApiPropertyOptional({ description: 'Optional description for the backup' })
    @IsOptional()
    @IsString()
    description?: string;
}

export class RestoreBackupDto {
    @ApiProperty({ description: 'Backup ID to restore from' })
    @IsString()
    backupId: string;
}

export class UpdateBackupSettingsDto {
    @ApiPropertyOptional({ description: 'Enable automatic backups' })
    @IsOptional()
    @IsBoolean()
    autoBackupEnabled?: boolean;

    @ApiPropertyOptional({ description: 'Backup frequency: DAILY, WEEKLY, MONTHLY' })
    @IsOptional()
    @IsIn(['DAILY', 'WEEKLY', 'MONTHLY'])
    autoBackupFrequency?: string;

    @ApiPropertyOptional({ description: 'Backup time in HH:mm format' })
    @IsOptional()
    @IsString()
    autoBackupTime?: string;

    @ApiPropertyOptional({ description: 'Number of days to retain backups' })
    @IsOptional()
    @IsInt()
    @Min(1)
    backupRetentionDays?: number;
}

export class BackupResponseDto {
    @ApiProperty()
    id: string;

    @ApiProperty()
    filename: string;

    @ApiProperty()
    size: bigint;

    @ApiProperty()
    type: string;

    @ApiProperty()
    status: string;

    @ApiPropertyOptional()
    description?: string;

    @ApiPropertyOptional()
    createdBy?: string;

    @ApiProperty()
    createdAt: Date;
}
