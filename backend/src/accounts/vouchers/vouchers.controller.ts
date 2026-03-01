import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    Delete,
    Patch,
    Query,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { VouchersService } from './vouchers.service';
import { CreateVoucherDto, UpdateVoucherDto, QueryVouchersDto } from './dto/voucher.dto';
import { CreateInternalTransferDto } from './dto/create-internal-transfer.dto';
import { ExpensesReportDto } from './dto/expenses-report.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
// UserRole no longer needed - using isAdmin flag

@ApiTags('Vouchers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('vouchers')
export class VouchersController {
    constructor(private readonly vouchersService: VouchersService) { }

    @Post()
    @ApiOperation({ summary: 'Create voucher (receipt or payment)' })
    create(@Body() createVoucherDto: CreateVoucherDto, @CurrentUser() user: any) {
        return this.vouchersService.create(createVoucherDto, user.id);
    }

    @Get()
    @ApiOperation({ summary: 'Get all vouchers' })
    findAll(@Query() query: QueryVouchersDto) {
        return this.vouchersService.findAll(query);
    }

    @Get('monthly-collections')
    @ApiOperation({ summary: 'Get total collections from customers for current month' })
    getMonthlyCollections() {
        return this.vouchersService.getMonthlyCollections();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get one voucher' })
    findOne(@Param('id') id: string) {
        return this.vouchersService.findOne(id);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update voucher' })
    update(@Param('id') id: string, @Body() updateVoucherDto: UpdateVoucherDto) {
        return this.vouchersService.update(id, updateVoucherDto);
    }

    @Delete(':id')
    @UseGuards(RolesGuard)
    @Roles('ADMIN')
    @ApiOperation({ summary: 'Delete voucher' })
    remove(@Param('id') id: string) {
        return this.vouchersService.remove(id);
    }

    @Get('reports/expenses')
    @ApiOperation({ summary: 'Get expenses report with filters and statistics' })
    getExpensesReport(@Query() filters: ExpensesReportDto) {
        return this.vouchersService.getExpensesReport(filters);
    }

    @Get('reports/revenue')
    @ApiOperation({ summary: 'Get revenue report with filters and statistics' })
    getRevenueReport(@Query() filters: ExpensesReportDto) {
        return this.vouchersService.getRevenueReport(filters);
    }

    @Post('internal-transfer')
    @ApiOperation({ summary: 'Create internal transfer between treasury and bank accounts' })
    createInternalTransfer(@Body() dto: CreateInternalTransferDto, @CurrentUser() user: any) {
        return this.vouchersService.createInternalTransfer(dto, user.id);
    }
}
