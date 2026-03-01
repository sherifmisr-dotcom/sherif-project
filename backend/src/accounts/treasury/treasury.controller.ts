import {
    Controller,
    Get,
    Post,
    Patch,
    Body,
    Query,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TreasuryService } from './treasury.service';
import { SetOpeningBalanceDto, QueryTransactionsDto, UpdateTreasurySettingsDto } from './dto/treasury.dto';
import { UpdateTreasurySettingsDto as UpdateTreasurySettingsDtoNew } from './dto/treasury-settings.dto';
import { CarryForwardDto } from '../bank-accounts/dto/carry-forward.dto';
import { UpdateCarryForwardSettingsDto } from '../dto/carry-forward-settings.dto';
import { GetCarryForwardLogsQueryDto } from '../dto/carry-forward-log.dto';
import { CarryForwardSchedulerService } from '../services/carry-forward-scheduler.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
// UserRole no longer needed - using isAdmin flag

@ApiTags('Treasury')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('treasury')
export class TreasuryController {
    constructor(
        private readonly treasuryService: TreasuryService,
        private readonly carryForwardScheduler: CarryForwardSchedulerService,
    ) { }

    @Post('opening-balance')
    @Roles('ADMIN')
    @ApiOperation({ summary: 'Set opening balance (once only)' })
    setOpeningBalance(
        @Body() dto: SetOpeningBalanceDto,
        @CurrentUser() user: any,
    ) {
        return this.treasuryService.setOpeningBalance(dto, user.id);
    }

    @Get('balance')
    @ApiOperation({ summary: 'Get current treasury balance' })
    getBalance() {
        return this.treasuryService.getBalance();
    }

    @Get('transactions')
    @ApiOperation({ summary: 'Get treasury transactions' })
    getTransactions(@Query() query: QueryTransactionsDto) {
        return this.treasuryService.getTransactions(query);
    }

    @Get('report')
    @ApiOperation({ summary: 'Get treasury report' })
    getReport(@Query('from') from?: string, @Query('to') to?: string) {
        return this.treasuryService.getReport(from, to);
    }

    @Patch('settings')
    @Roles('ADMIN')
    @ApiOperation({ summary: 'Update treasury settings' })
    updateSettings(@Body() dto: UpdateTreasurySettingsDto) {
        return this.treasuryService.updateSettings(dto.preventNegativeTreasury ?? false);
    }

    @Get('settings/opening-balance')
    @ApiOperation({ summary: 'Get treasury opening balance settings' })
    getTreasurySettings() {
        return this.treasuryService.getTreasurySettings();
    }

    @Patch('settings/opening-balance')
    @Roles('ADMIN')
    @ApiOperation({ summary: 'Update treasury opening balance settings' })
    updateTreasurySettings(@Body() dto: UpdateTreasurySettingsDtoNew) {
        return this.treasuryService.updateTreasurySettings(dto);
    }

    @Post('carry-forward')
    @Roles('ADMIN')
    @ApiOperation({ summary: 'Carry forward treasury balance to new period' })
    carryForward(@Body() dto: CarryForwardDto, @CurrentUser() user: any) {
        return this.treasuryService.carryForwardBalance(dto, user?.id);
    }

    // Carry-Forward Settings Endpoints
    @Get('carry-forward/settings')
    @ApiOperation({ summary: 'Get carry-forward settings' })
    getCarryForwardSettings() {
        return this.carryForwardScheduler.getSettings();
    }

    @Patch('carry-forward/settings')
    @Roles('ADMIN')
    @ApiOperation({ summary: 'Update carry-forward settings' })
    updateCarryForwardSettings(@Body() dto: UpdateCarryForwardSettingsDto) {
        return this.carryForwardScheduler.updateSettings(dto);
    }

    @Get('carry-forward/logs')
    @ApiOperation({ summary: 'Get carry-forward logs' })
    getCarryForwardLogs(@Query() query: GetCarryForwardLogsQueryDto) {
        return this.carryForwardScheduler.getLogs(query);
    }
}
