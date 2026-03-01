import { Controller, Get, Put, Body, UseGuards, Post, UploadedFile, UseInterceptors, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { SettingsService } from './settings.service';
import {
    UpdateCompanySettingsDto,
    UpdateAppSettingsDto,
    UpdatePrintSettingsDto,
} from './dto/settings.dto';
import { UpdateIncomeStatementSettingsDto } from './dto/income-statement-settings.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
// UserRole no longer needed - using isAdmin flag

@ApiTags('Settings')
@Controller('settings')
export class SettingsController {
    constructor(private readonly settingsService: SettingsService) { }

    @Get()
    @ApiOperation({ summary: 'Get all settings' })
    getAllSettings() {
        return this.settingsService.getAllSettings();
    }

    @Get('company')
    @ApiOperation({ summary: 'Get company settings' })
    getCompanySettings() {
        return this.settingsService.getCompanySettings();
    }

    @Put('company')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update company settings' })
    updateCompanySettings(@Body() dto: UpdateCompanySettingsDto) {
        return this.settingsService.updateCompanySettings(dto);
    }

    @Post('company/logo')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Upload company logo' })
    @ApiConsumes('multipart/form-data')
    @UseInterceptors(
        FileInterceptor('logo', {
            storage: diskStorage({
                destination: './uploads/logos',
                filename: (req, file, cb) => {
                    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
                    const ext = extname(file.originalname);
                    cb(null, `logo-${uniqueSuffix}${ext}`);
                },
            }),
            fileFilter: (req, file, cb) => {
                if (file.mimetype.match(/\/(jpg|jpeg|png|gif)$/)) {
                    cb(null, true);
                } else {
                    cb(new BadRequestException('Only image files (jpg, jpeg, png, gif) are allowed!'), false);
                }
            },
            limits: {
                fileSize: 2 * 1024 * 1024, // 2MB
            },
        }),
    )
    async uploadLogo(@UploadedFile() file: Express.Multer.File) {
        if (!file) {
            throw new BadRequestException('No file uploaded');
        }

        const logoPath = `/uploads/logos/${file.filename}`;

        // Update company settings with new logo path
        await this.settingsService.updateCompanySettings({ logoPath });

        return {
            message: 'Logo uploaded successfully',
            logoPath,
        };
    }

    @Get('app')
    @ApiOperation({ summary: 'Get app settings' })
    getAppSettings() {
        return this.settingsService.getAppSettings();
    }

    @Put('app')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update app settings' })
    updateAppSettings(@Body() dto: UpdateAppSettingsDto) {
        return this.settingsService.updateAppSettings(dto);
    }

    @Get('print')
    @ApiOperation({ summary: 'Get print settings' })
    getPrintSettings() {
        return this.settingsService.getPrintSettings();
    }

    @Put('print')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update print settings' })
    updatePrintSettings(@Body() dto: UpdatePrintSettingsDto) {
        return this.settingsService.updatePrintSettings(dto);
    }

    @Get('income-statement')
    @ApiOperation({ summary: 'Get income statement settings' })
    async getIncomeStatementSettings() {
        return this.settingsService.getIncomeStatementSettings();
    }

    @Put('income-statement')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update income statement settings' })
    updateIncomeStatementSettings(@Body() dto: UpdateIncomeStatementSettingsDto) {
        return this.settingsService.updateIncomeStatementSettings(dto);
    }
}
