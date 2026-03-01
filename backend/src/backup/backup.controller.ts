import {
    Controller,
    Get,
    Post,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    UseInterceptors,
    UploadedFile,
    Req,
    Res,
    StreamableFile,
    BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { createReadStream } from 'fs';
import { BackupService } from './backup.service';
import { CreateBackupDto, UpdateBackupSettingsDto } from './dto/backup.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Backup')
@Controller('backup')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class BackupController {
    constructor(private readonly backupService: BackupService) { }

    @Post('create')
    @Roles('ADMIN')
    @ApiOperation({ summary: 'Create manual backup' })
    async createBackup(@Body() dto: CreateBackupDto, @Req() req: any) {
        const userId = req.user?.userId;
        return this.backupService.createManualBackup(dto, userId);
    }

    @Post('upload')
    @Roles('ADMIN')
    @ApiOperation({ summary: 'Upload a backup file' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                file: { type: 'string', format: 'binary' },
                description: { type: 'string' },
            },
        },
    })
    @UseInterceptors(FileInterceptor('file', {
        limits: { fileSize: 100 * 1024 * 1024 }, // 100MB max
        fileFilter: (req, file, cb) => {
            if (!file.originalname.endsWith('.sql')) {
                return cb(new BadRequestException('يُسمح فقط بملفات .sql'), false);
            }
            cb(null, true);
        },
    }))
    async uploadBackup(
        @UploadedFile() file: Express.Multer.File,
        @Body('description') description: string,
        @Req() req: any,
    ) {
        if (!file) {
            throw new BadRequestException('يرجى اختيار ملف النسخة الاحتياطية');
        }
        const userId = req.user?.userId;
        return this.backupService.uploadBackup(file, description, userId);
    }

    @Get('history')
    @Roles('ADMIN')
    @ApiOperation({ summary: 'Get backup history' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    async getBackupHistory(
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        const pageNum = page ? parseInt(page, 10) : 1;
        const limitNum = limit ? parseInt(limit, 10) : 20;
        return this.backupService.getBackupHistory(pageNum, limitNum);
    }

    @Get('download/:id')
    @Roles('ADMIN')
    @ApiOperation({ summary: 'Download backup file' })
    async downloadBackup(@Param('id') id: string, @Res({ passthrough: true }) res: Response) {
        const { filepath, filename } = await this.backupService.downloadBackup(id);

        const file = createReadStream(filepath);

        res.set({
            'Content-Type': 'application/sql',
            'Content-Disposition': `attachment; filename="${filename}"`,
        });

        return new StreamableFile(file);
    }

    @Post('restore/:id')
    @Roles('ADMIN')
    @ApiOperation({ summary: 'Restore from backup' })
    async restoreBackup(@Param('id') id: string) {
        return this.backupService.restoreBackup(id);
    }

    @Delete(':id')
    @Roles('ADMIN')
    @ApiOperation({ summary: 'Delete backup' })
    async deleteBackup(@Param('id') id: string) {
        return this.backupService.deleteBackup(id);
    }

    @Get('settings')
    @Roles('ADMIN')
    @ApiOperation({ summary: 'Get backup settings' })
    async getBackupSettings() {
        return this.backupService.getBackupSettings();
    }

    @Post('settings')
    @Roles('ADMIN')
    @ApiOperation({ summary: 'Update backup settings' })
    async updateBackupSettings(@Body() dto: UpdateBackupSettingsDto) {
        return this.backupService.updateBackupSettings(dto);
    }
}
