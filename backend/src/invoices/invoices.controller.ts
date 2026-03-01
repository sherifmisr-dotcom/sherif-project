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
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto, UpdateInvoiceDto, QueryInvoicesDto } from './dto/invoice.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { InvoiceType } from '@prisma/client';

@ApiTags('Invoices')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('invoices')
export class InvoicesController {
    constructor(private readonly invoicesService: InvoicesService) { }

    @Post()
    @ApiOperation({ summary: 'Create a new invoice' })
    create(@Body() createInvoiceDto: CreateInvoiceDto) {
        return this.invoicesService.create(createInvoiceDto);
    }

    @Get()
    @ApiOperation({ summary: 'Get all invoices' })
    findAll(@Query() query: QueryInvoicesDto) {
        return this.invoicesService.findAll(query);
    }

    @Get('stats')
    @ApiOperation({ summary: 'Get invoice statistics' })
    getStats(
        @Query('type') type?: InvoiceType,
        @Query('from') from?: string,
        @Query('to') to?: string,
    ) {
        return this.invoicesService.getStats(type, from, to);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get an invoice by ID' })
    findOne(@Param('id') id: string) {
        return this.invoicesService.findOne(id);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update an invoice' })
    update(@Param('id') id: string, @Body() updateInvoiceDto: UpdateInvoiceDto) {
        return this.invoicesService.update(id, updateInvoiceDto);
    }

    @Delete(':id')
    @UseGuards(RolesGuard)
    @Roles('ADMIN')
    @ApiOperation({ summary: 'Delete an invoice' })
    remove(@Param('id') id: string) {
        return this.invoicesService.remove(id);
    }
}
