import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CustomerGroupsService } from './customer-groups.service';
import {
    CreateCustomerGroupDto,
    UpdateCustomerGroupDto,
    QueryCustomerGroupsDto,
} from './dto/customer-groups.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Customer Groups')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('customer-groups')
export class CustomerGroupsController {
    constructor(private readonly service: CustomerGroupsService) { }

    @Post()
    @ApiOperation({ summary: 'Create a customer group' })
    create(@Body() dto: CreateCustomerGroupDto) {
        return this.service.create(dto);
    }

    @Get()
    @ApiOperation({ summary: 'List all customer groups' })
    findAll(@Query() query: QueryCustomerGroupsDto) {
        return this.service.findAll(query);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get a customer group by ID' })
    findOne(@Param('id') id: string) {
        return this.service.findOne(id);
    }

    @Put(':id')
    @ApiOperation({ summary: 'Update a customer group' })
    update(@Param('id') id: string, @Body() dto: UpdateCustomerGroupDto) {
        return this.service.update(id, dto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete a customer group' })
    remove(@Param('id') id: string) {
        return this.service.remove(id);
    }
}
