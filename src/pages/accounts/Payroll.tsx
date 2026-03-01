import MonthlyPayroll from './payroll/MonthlyPayroll';
import PageTransition from '@/components/ui/PageTransition';

export default function Payroll() {
  return (
    <PageTransition>
      <div className="space-y-6">
        <MonthlyPayroll />
      </div>
    </PageTransition>
  );
}
