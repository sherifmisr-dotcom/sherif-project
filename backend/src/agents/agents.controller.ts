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
import { AgentsService } from './agents.service';
import {
    CreateAgentDto,
    UpdateAgentDto,
    CreateTripDto,
    UpdateTripDto,
    CreateAdditionalFeeDto,
    UpdateAdditionalFeeDto,
    UpdateAgentSettingsDto,
    QueryDto,
} from './dto/agent.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Agents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('agents')
export class AgentsController {
    constructor(private readonly agentsService: AgentsService) { }

    // ============ AGENTS ============

    @Post()
    @ApiOperation({ summary: 'Create agent' })
    createAgent(@Body() dto: CreateAgentDto) {
        return this.agentsService.createAgent(dto);
    }

    @Get()
    @ApiOperation({ summary: 'Get all agents' })
    findAllAgents(@Query() query: QueryDto) {
        return this.agentsService.findAllAgents(query);
    }

    @Get('total-balance')
    @ApiOperation({ summary: 'Get total creditors balance' })
    getTotalBalance() {
        return this.agentsService.getTotalBalance();
    }

    // ============ AGENT SETTINGS ============

    @Get('settings')
    @ApiOperation({ summary: 'Get agent default settings' })
    getAgentSettings() {
        return this.agentsService.getAgentSettings();
    }

    @Patch('settings')
    @ApiOperation({ summary: 'Update agent default settings' })
    updateAgentSettings(@Body() dto: UpdateAgentSettingsDto) {
        return this.agentsService.updateAgentSettings(dto);
    }

    @Get('settings/logs')
    @ApiOperation({ summary: 'Get agent settings change logs' })
    getAgentSettingsLogs() {
        return this.agentsService.getAgentSettingsLogs();
    }

    @Delete('settings/logs/:id')
    @UseGuards(RolesGuard)
    @Roles('ADMIN')
    @ApiOperation({ summary: 'Delete agent setting log' })
    deleteAgentSettingLog(@Param('id') id: string) {
        return this.agentsService.deleteAgentSettingLog(id);
    }

    // ============ TRIPS ============

    @Post('trips')
    @ApiOperation({ summary: 'Create trip' })
    createTrip(@Body() dto: CreateTripDto) {
        return this.agentsService.createTrip(dto);
    }

    @Get('trips')
    @ApiOperation({ summary: 'Get all trips' })
    findAllTrips(@Query() query: QueryDto) {
        return this.agentsService.findAllTrips(query);
    }

    @Patch('trips/:id')
    @ApiOperation({ summary: 'Update trip' })
    updateTrip(@Param('id') id: string, @Body() dto: UpdateTripDto) {
        return this.agentsService.updateTrip(id, dto);
    }

    @Delete('trips/:id')
    @UseGuards(RolesGuard)
    @Roles('ADMIN')
    @ApiOperation({ summary: 'Delete trip' })
    removeTrip(@Param('id') id: string) {
        return this.agentsService.removeTrip(id);
    }

    // ============ ADDITIONAL FEES ============

    @Post('fees')
    @ApiOperation({ summary: 'Create additional fee' })
    createFee(@Body() dto: CreateAdditionalFeeDto) {
        return this.agentsService.createAdditionalFee(dto);
    }

    @Get('fees')
    @ApiOperation({ summary: 'Get all additional fees' })
    findAllFees(@Query() query: QueryDto) {
        return this.agentsService.findAllFees(query);
    }

    @Patch('fees/:id')
    @ApiOperation({ summary: 'Update additional fee' })
    updateFee(@Param('id') id: string, @Body() dto: UpdateAdditionalFeeDto) {
        return this.agentsService.updateFee(id, dto);
    }

    @Delete('fees/:id')
    @UseGuards(RolesGuard)
    @Roles('ADMIN')
    @ApiOperation({ summary: 'Delete additional fee' })
    removeFee(@Param('id') id: string) {
        return this.agentsService.removeFee(id);
    }

    // ============ AGENTS (specific routes must come AFTER) ============

    @Get(':id/statement')
    @ApiOperation({ summary: 'Get agent statement' })
    getAgentStatement(
        @Param('id') id: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
    ) {
        return this.agentsService.getAgentStatement(id, startDate, endDate);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get one agent' })
    findOneAgent(@Param('id') id: string) {
        return this.agentsService.findOneAgent(id);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update agent' })
    updateAgent(@Param('id') id: string, @Body() dto: UpdateAgentDto) {
        return this.agentsService.updateAgent(id, dto);
    }

    @Delete(':id')
    @UseGuards(RolesGuard)
    @Roles('ADMIN')
    @ApiOperation({ summary: 'Delete agent' })
    removeAgent(@Param('id') id: string) {
        return this.agentsService.removeAgent(id);
    }
}
