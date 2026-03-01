import { ReactNode, useEffect, useState } from 'react';
import { apiClient } from '@/lib/api';

interface PrintLayoutProps {
  children: ReactNode;
}

export default function PrintLayout({ children }: PrintLayoutProps) {
  const [companySettings, setCompanySettings] = useState<any>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await apiClient.getCompanySettings();
        setCompanySettings(response.data || response);
      } catch (error) {
        console.error('Error fetching company settings:', error);
      }
    };
    fetchSettings();
  }, []);

  return (
    <div className="print-layout">
      <style>{`
        @media print {
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          body * {
            visibility: hidden;
          }

          .print-layout,
          .print-layout * {
            visibility: visible;
          }

          .print-layout {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white;
            padding: 2rem;
          }

          .no-print {
            display: none !important;
          }
        }
        
        @media print {
           @page {
             size: A4;
             margin: 10mm;
           }
        }

        .print-header {
          display: flex;
          flex-direction: column-reverse;
          gap: 0.75rem;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 2px solid #1e3a8a;
          padding-bottom: 1.5rem;
          margin-bottom: 2rem;
        }
        @media (min-width: 768px) {
          .print-header {
            flex-direction: row;
          }
        }

        .company-info {
          display: flex;
          flex-direction: column;
        }

        .logo-container {
          width: 4rem;
          height: 4rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        @media (min-width: 768px) {
          .logo-container {
            width: 6rem;
            height: 6rem;
          }
        }

        .print-title {
          text-align: center;
          font-size: 1.5rem;
          font-weight: 700;
          margin: 2rem 0;
          color: #000;
        }

        .print-content {
          background: white;
          border-radius: 8px;
          padding: 1rem;
        }

        .print-table {
          width: 100%;
          border-collapse: collapse;
          margin: 1rem 0;
        }

        .print-table th,
        .print-table td {
          border: 1px solid #000;
          padding: 8px;
          text-align: right;
        }

        .print-table th {
          background: #0ea5e9;
          font-weight: 700;
          color: #fff;
        }

        .invoice-details {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2rem;
          margin: 2rem 0;
          padding: 1rem;
          border: 1px solid #ddd;
          border-radius: 8px;
        }

        .detail-group {
          line-height: 1.8;
        }

        .signature-section {
          display: flex;
          justify-content: space-between;
          margin-top: 3rem;
        }

        .signature-box {
          text-align: center;
          width: 200px;
        }
      `}</style>

      {companySettings && (
        <div className="print-header">
          <div className="flex flex-col">
            <h1 className="text-xl font-bold text-blue-900 mb-1">
              {companySettings.nameAr} {companySettings.activityAr}
            </h1>
            <h2 className="text-sm font-medium text-gray-500 mb-3">
              {companySettings.nameEn} {companySettings.activityEn}
            </h2>
            <div className="flex flex-wrap gap-2 md:gap-4 text-xs text-gray-600">
              <span><strong className="text-blue-900">جوال:</strong> {companySettings.phone || '---'}</span>
              <span className="text-gray-300">|</span>
              <span><strong className="text-blue-900">الرقم الضريبي:</strong> {companySettings.taxNumber}</span>
              <span className="text-gray-300">|</span>
              <span><strong className="text-blue-900">ترخيص رقم:</strong> {companySettings.licenseNo}</span>
            </div>
          </div>
          <div className="w-24 h-24 flex items-center justify-center">
            {companySettings.logoPath ? (
              <img
                src={`${API_BASE}${companySettings.logoPath}`}
                alt="Company Logo"
                className="max-w-full max-h-full object-contain"
              />
            ) : (
              <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center border border-slate-200">
                <span className="text-xs text-slate-400">شعار</span>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="print-content">
        {children}
      </div>
    </div>
  );
}
