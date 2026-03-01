import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    Query,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BanksService } from './banks.service';
import {
    CreateBankDto,
    UpdateBankDto,
    CreateBankAccountDto,
    UpdateBankAccountDto,
    QueryDto,
} from './dto/bank.dto';
import { CarryForwardDto } from './dto/carry-forward.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
// UserRole no longer needed - using isAdmin flag

@ApiTags('Banks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('banks')
export class BanksController {
    constructor(private readonly banksService: BanksService) { }

    // ============ BANKS ============

    @Get()
    @ApiOperation({ summary: 'Get all banks' })
    findAllBanks(@Query() query: QueryDto) {
        return this.banksService.findAllBanks(query);
    }

    // ============ BANK ACCOUNTS ============

    @Post('accounts')
    @Roles('ACCOUNTANT', 'ADMIN')
    @ApiOperation({ summary: 'Create bank account' })
    createBankAccount(@Body() dto: CreateBankAccountDto) {
        return this.banksService.createBankAccount(dto);
    }

    @Get('accounts')
    @ApiOperation({ summary: 'Get all bank accounts' })
    findAllBankAccounts(@Query() query: QueryDto) {
        return this.banksService.findAllBankAccounts(query);
    }

    @Get('accounts/total-balance')
    @ApiOperation({ summary: 'Get total balance across all bank accounts' })
    getTotalBankBalance() {
        return this.banksService.getTotalBankBalance();
    }

    @Get('accounts/:id')
    @ApiOperation({ summary: 'Get one bank account' })
    findOneBankAccount(@Param('id') id: string) {
        return this.banksService.findOneBankAccount(id);
    }

    @Patch('accounts/:id')
    @Roles('ACCOUNTANT', 'ADMIN')
    @ApiOperation({ summary: 'Update bank account' })
    updateBankAccount(@Param('id') id: string, @Body() dto: UpdateBankAccountDto) {
        return this.banksService.updateBankAccount(id, dto);
    }

    @Delete('accounts/:id')
    @Roles('ADMIN')
    @ApiOperation({ summary: 'Delete bank account' })
    removeBankAccount(@Param('id') id: string) {
        return this.banksService.removeBankAccount(id);
    }

    @Get('accounts/:id/transactions')
    @ApiOperation({ summary: 'Get bank account transactions' })
    getAccountTransactions(@Param('id') id: string, @Query() query: QueryDto) {
        return this.banksService.getAccountTransactions(id, query);
    }

    @Post('accounts/:id/carry-forward')
    @Roles('ADMIN')
    @ApiOperation({ summary: 'Carry forward balance for a single bank account' })
    carryForwardBalance(@Param('id') id: string, @Body() dto: CarryForwardDto, @CurrentUser() user: any) {
        return this.banksService.carryForwardBalance(id, dto, user?.id);
    }

    @Post('accounts/carry-forward/all')
    @Roles('ADMIN')
    @ApiOperation({ summary: 'Carry forward balances for all bank accounts' })
    carryForwardAllBalances(@Body() dto: CarryForwardDto, @CurrentUser() user: any) {
        return this.banksService.carryForwardAllBalances(dto, user?.id);
    }

    // ============ BANKS (specific routes must come AFTER accounts) ============

    @Post()
    @Roles('ACCOUNTANT', 'ADMIN')
    @ApiOperation({ summary: 'Create bank' })
    createBank(@Body() dto: CreateBankDto) {
        return this.banksService.createBank(dto);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get one bank' })
    findOneBank(@Param('id') id: string) {
        return this.banksService.findOneBank(id);
    }

    @Patch(':id')
    @Roles('ACCOUNTANT', 'ADMIN')
    @ApiOperation({ summary: 'Update bank' })
    updateBank(@Param('id') id: string, @Body() dto: UpdateBankDto) {
        return this.banksService.updateBank(id, dto);
    }

    @Delete(':id')
    @Roles('ADMIN')
    @ApiOperation({ summary: 'Delete bank' })
    removeBank(@Param('id') id: string) {
        return this.banksService.removeBank(id);
    }
}
