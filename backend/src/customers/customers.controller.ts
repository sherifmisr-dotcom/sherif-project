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
import { CustomersService } from './customers.service';
import { CreateCustomerDto, UpdateCustomerDto, QueryCustomersDto } from './dto/customer.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../permissions/guards/permission.guard';
import { RequirePermission } from '../permissions/decorators/require-permission.decorator';

@ApiTags('Customers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('customers')
export class CustomersController {
    constructor(private readonly customersService: CustomersService) { }

    @Post()
    @ApiOperation({ summary: 'Create a new customer' })
    create(@Body() createCustomerDto: CreateCustomerDto) {
        return this.customersService.create(createCustomerDto);
    }

    @Get()
    @ApiOperation({ summary: 'Get all customers' })
    findAll(@Query() query: QueryCustomersDto) {
        return this.customersService.findAll(query);
    }

    @Get('stats')
    @ApiOperation({ summary: 'Get customer statistics' })
    getStats() {
        return this.customersService.getStats();
    }

    @Get('total-balance')
    @ApiOperation({ summary: 'Get total debtors balance (customers with positive balance)' })
    getTotalBalance() {
        return this.customersService.getTotalBalance();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get a customer by ID' })
    findOne(@Param('id') id: string) {
        return this.customersService.findOne(id);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update a customer' })
    update(@Param('id') id: string, @Body() updateCustomerDto: UpdateCustomerDto) {
        return this.customersService.update(id, updateCustomerDto);
    }

    @Delete(':id')
    @RequirePermission('customers.delete')
    @ApiOperation({ summary: 'Delete a customer (soft delete)' })
    remove(@Param('id') id: string) {
        return this.customersService.remove(id);
    }

    @Post(':id/restore')
    @RequirePermission('customers.delete')
    @ApiOperation({ summary: 'Restore a deleted customer' })
    restore(@Param('id') id: string) {
        return this.customersService.restore(id);
    }

    @Patch(':id/toggle-status')
    @ApiOperation({ summary: 'Toggle customer active status' })
    toggleStatus(@Param('id') id: string) {
        return this.customersService.toggleStatus(id);
    }
}
