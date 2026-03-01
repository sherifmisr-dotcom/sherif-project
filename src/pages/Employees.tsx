import { EmployeesTab } from '@/components/payroll/EmployeesTab';
import { motion } from 'framer-motion';

export default function Employees() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6 page-transition"
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <EmployeesTab />
      </div>
    </motion.div>
  );
}
