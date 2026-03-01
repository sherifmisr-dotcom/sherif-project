import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { InvoiceItemTemplatesService } from './invoice-item-templates.service';
import { CreateInvoiceItemTemplateDto, UpdateInvoiceItemTemplateDto } from './dto/invoice-item-template.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
// UserRole no longer needed - using isAdmin flag

@ApiTags('Invoice Item Templates')
@Controller('invoice-item-templates')
export class InvoiceItemTemplatesController {
    constructor(private readonly service: InvoiceItemTemplatesService) { }

    @Get()
    @ApiOperation({ summary: 'Get all invoice item templates' })
    findAll() {
        return this.service.findAll();
    }

    @Get('search')
    @ApiOperation({ summary: 'Search invoice item templates' })
    search(@Query('q') query: string) {
        return this.service.search(query || '');
    }

    @Post()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Create invoice item template' })
    create(@Body() createDto: CreateInvoiceItemTemplateDto) {
        return this.service.create(createDto);
    }

    @Patch(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update invoice item template' })
    update(@Param('id') id: string, @Body() updateDto: UpdateInvoiceItemTemplateDto) {
        return this.service.update(id, updateDto);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Delete invoice item template' })
    remove(@Param('id') id: string) {
        return this.service.remove(id);
    }
}
