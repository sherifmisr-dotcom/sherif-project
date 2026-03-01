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
    Request,
} from '@nestjs/common';
import { CustomsFeesService } from './customs-fees.service';
import { CreateCustomsFeeBatchDto, UpdateCustomsFeeBatchDto } from './dto/customs-fee-batch.dto';
import { QueryCustomsFeeBatchDto } from './dto/query-customs-fee-batch.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('customs-fees')
@UseGuards(JwtAuthGuard)
export class CustomsFeesController {
    constructor(private readonly customsFeesService: CustomsFeesService) { }

    @Post('batches')
    create(@Body() createDto: CreateCustomsFeeBatchDto, @Request() req) {
        return this.customsFeesService.create(createDto, req.user.userId);
    }

    @Get('batches')
    findAll(@Query() query: QueryCustomsFeeBatchDto) {
        return this.customsFeesService.findAll(query);
    }

    @Get('batches/:id')
    findOne(@Param('id') id: string) {
        return this.customsFeesService.findOne(id);
    }

    @Patch('batches/:id')
    update(@Param('id') id: string, @Body() updateDto: UpdateCustomsFeeBatchDto) {
        return this.customsFeesService.update(id, updateDto);
    }

    @Delete('batches/:id')
    remove(@Param('id') id: string) {
        return this.customsFeesService.remove(id);
    }

    @Get('available-customs-numbers')
    getAvailableCustomsNumbers() {
        return this.customsFeesService.getAvailableCustomsNumbers();
    }

    @Get('by-customs-no/:customsNo')
    getByCustomsNo(@Param('customsNo') customsNo: string) {
        return this.customsFeesService.findByCustomsNo(customsNo);
    }
}
