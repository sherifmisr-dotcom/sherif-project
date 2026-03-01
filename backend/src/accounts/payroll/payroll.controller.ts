import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Put,
    Param,
    Delete,
    Query,
    UseGuards,
    Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PayrollService } from './payroll.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import {
    CreateEmployeeDto,
    UpdateEmployeeDto,
    QueryEmployeesDto,
} from './dto/employee.dto';
import {
    CreatePayrollRunDto,
    UpdatePayrollRunDto,
    ApprovePayrollRunDto,
    QueryPayrollRunsDto,
} from './dto/payroll-run.dto';

@ApiTags('payroll')
@Controller('payroll')
@UseGuards(JwtAuthGuard)
export class PayrollController {
    constructor(private readonly payrollService: PayrollService) { }

    // ============ EMPLOYEES ============

    @Post('employees')
    @ApiOperation({ summary: 'Create employee' })
    createEmployee(@Body() dto: CreateEmployeeDto) {
        return this.payrollService.createEmployee(dto);
    }

    @Get('employees')
    @ApiOperation({ summary: 'Get all employees' })
    findAllEmployees(@Query() query: QueryEmployeesDto) {
        return this.payrollService.findAllEmployees(query);
    }

    @Get('employees/:id')
    @ApiOperation({ summary: 'Get one employee' })
    findOneEmployee(@Param('id') id: string) {
        return this.payrollService.findOneEmployee(id);
    }

    @Patch('employees/:id')
    @ApiOperation({ summary: 'Update employee' })
    updateEmployee(@Param('id') id: string, @Body() dto: UpdateEmployeeDto) {
        return this.payrollService.updateEmployee(id, dto);
    }

    @Delete('employees/:id')
    @UseGuards(RolesGuard)
    @Roles('ADMIN')
    @ApiOperation({ summary: 'Delete employee (soft delete)' })
    removeEmployee(@Param('id') id: string) {
        return this.payrollService.removeEmployee(id);
    }

    // ============ PAYROLL RUNS ============

    @Post('runs')
    @ApiOperation({ summary: 'Create payroll run' })
    createPayrollRun(@Body() dto: CreatePayrollRunDto) {
        return this.payrollService.createPayrollRun(dto);
    }

    @Get('runs')
    @ApiOperation({ summary: 'Get all payroll runs' })
    findAllPayrollRuns(@Query() query: QueryPayrollRunsDto) {
        return this.payrollService.findAllPayrollRuns(query);
    }

    @Get('runs/:id')
    @ApiOperation({ summary: 'Get one payroll run' })
    findOnePayrollRun(@Param('id') id: string) {
        return this.payrollService.findOnePayrollRun(id);
    }

    @Patch('runs/:id')
    @ApiOperation({ summary: 'Update payroll run (draft only)' })
    updatePayrollRun(@Param('id') id: string, @Body() dto: UpdatePayrollRunDto) {
        return this.payrollService.updatePayrollRun(id, dto);
    }

    @Delete('runs/:id')
    @UseGuards(RolesGuard)
    @Roles('ADMIN')
    @ApiOperation({ summary: 'Delete payroll run (draft only)' })
    removePayrollRun(@Param('id') id: string) {
        return this.payrollService.removePayrollRun(id);
    }

    @Post('runs/approve')
    @ApiOperation({ summary: 'Approve payroll run' })
    approvePayrollRun(@Body() dto: ApprovePayrollRunDto, @Request() req) {
        return this.payrollService.approvePayrollRun(dto.runId, dto, req.user.id);
    }

    @Put('runs/:id/unapprove')
    @UseGuards(RolesGuard)
    @Roles('ADMIN')
    @ApiOperation({ summary: 'Unapprove payroll run' })
    unapprovePayrollRun(@Param('id') id: string) {
        return this.payrollService.unapprovePayrollRun(id);
    }
}
