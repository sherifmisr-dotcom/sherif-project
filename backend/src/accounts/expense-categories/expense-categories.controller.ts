import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ExpenseCategoriesService } from './expense-categories.service';
import { CreateExpenseCategoryDto, UpdateExpenseCategoryDto } from './dto/expense-category.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
// UserRole no longer needed - using isAdmin flag

@ApiTags('Expense Categories')
@Controller('expense-categories')
export class ExpenseCategoriesController {
    constructor(private readonly service: ExpenseCategoriesService) { }

    @Get()
    @ApiOperation({ summary: 'Get all expense categories' })
    findAll() {
        return this.service.findAll();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get expense category by ID' })
    findOne(@Param('id') id: string) {
        return this.service.findOne(id);
    }

    @Post()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Create expense category' })
    create(@Body() createDto: CreateExpenseCategoryDto) {
        return this.service.create(createDto);
    }

    @Patch(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update expense category' })
    update(@Param('id') id: string, @Body() updateDto: UpdateExpenseCategoryDto) {
        return this.service.update(id, updateDto);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Delete expense category' })
    remove(@Param('id') id: string) {
        return this.service.remove(id);
    }
}
