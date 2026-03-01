// Helper function to generate complete invoice HTML for printing
export const generateCompleteInvoiceHTML = (invoice: any, settings: any, qrCodeDataUrl?: string): string => {
  const customerName = invoice.customer?.name || invoice.customers?.name || 'غير محدد';
  const customsNo = invoice.customsNo || invoice.customs_no || 'غير محدد';
  const driverName = invoice.driverName || invoice.driver_name || 'غير محدد';
  const shipperName = invoice.shipperName || invoice.shipper_name || 'غير محدد';
  const vehicleNo = invoice.vehicleNo || invoice.vehicle_no || 'غير محدد';
  const cargoType = invoice.cargoType || invoice.cargo_type || 'غير محدد';
  const invoiceItems = invoice.items || invoice.invoice_items || [];
  const vatAmount = invoice.vatAmount || invoice.vat_amount || 0;

  // Check if VAT is enabled by looking at items or vatAmount
  const hasVAT = invoiceItems.some((item: any) => {
    const vatRate = item.vatRate !== undefined ? parseFloat(item.vatRate) : 0;
    return vatRate > 0;
  }) || vatAmount > 0;
  const vatEnabled = invoice.vatEnabled ?? invoice.vat_enabled ?? hasVAT;

  // Calculate subtotal
  const subtotal = invoiceItems.reduce((sum: number, item: any) => {
    if (item.unitPrice !== undefined && item.quantity !== undefined) {
      return sum + (Number(item.unitPrice) * Number(item.quantity));
    }
    return sum + Number(item.amount || 0);
  }, 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
  };

  const typeLabels: Record<string, string> = {
    EXPORT: 'فاتورة صادر',
    export: 'فاتورة صادر',
    IMPORT: 'فاتورة استيراد',
    import: 'فاتورة استيراد',
    TRANSIT: 'فاتورة ترانزيت',
    transit: 'فاتورة ترانزيت',
    FREE: 'فاتورة حرة',
    free: 'فاتورة حرة',
  };

  const itemsHTML = invoiceItems.map((item: any, index: number) => {
    const hasDetailedColumns = item.unitPrice !== undefined;
    return `
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 8px; color: #6b7280;">${index + 1}</td>
        <td style="padding: 8px; color: #1f2937; font-weight: 500;">${item.description}</td>
        ${hasDetailedColumns ? `
          <td style="padding: 8px; text-align: center;">${formatCurrency(parseFloat(item.unitPrice?.toString() || '0'))}</td>
          <td style="padding: 8px; text-align: center;">${item.quantity || 1}</td>
          <td style="padding: 8px; text-align: center;">${item.vatRate || 0}%</td>
        ` : ''}
        <td style="padding: 8px; text-align: left; font-weight: bold;">${formatCurrency(parseFloat(item.amount?.toString() || '0'))}</td>
      </tr>
    `;
  }).join('');

  const hasDetailedColumns = invoiceItems.length > 0 && invoiceItems[0].unitPrice !== undefined;

  return `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <title>فاتورة - ${invoice.code}</title>
      <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap" rel="stylesheet">
      <style>
        * { 
          font-family: 'Tajawal', sans-serif; 
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body { 
          background: white; 
          padding: 20px;
        }
        .container {
          max-width: 800px;
          margin: 0 auto;
        }
        @media print {
          @page { size: A4; margin: 15mm; }
          * { 
            -webkit-print-color-adjust: exact !important; 
            print-color-adjust: exact !important; 
          }
          body { padding: 0; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- Header -->
        <header style="display: flex; justify-content: space-between; align-items: start; border-bottom: 2px solid #1e3a8a; padding-bottom: 16px; margin-bottom: 24px;">
          <div style="flex: 1;">
            <h1 style="font-size: 20px; font-weight: bold; color: #1e3a8a; margin-bottom: 4px;">${settings?.nameAr || 'مؤسسة الصقر الشمالي للتخليص الجمركي'}</h1>
            <h2 style="font-size: 16px; font-weight: 500; color: #6b7280; margin-bottom: 8px;">${settings?.nameEn || 'Sahil Al-shamal For Customs Clearance'}</h2>
            <div style="display: flex; gap: 16px; font-size: 12px; color: #4b5563;">
              <span><strong style="color: #1e3a8a;">جوال:</strong> ${settings?.phone || '---'}</span>
              <span style="color: #d1d5db;">|</span>
              <span><strong style="color: #1e3a8a;">الرقم الضريبي:</strong> ${settings?.taxNumber || '---'}</span>
              <span style="color: #d1d5db;">|</span>
              <span><strong style="color: #1e3a8a;">ترخيص رقم:</strong> ${settings?.licenseNo || '---'}</span>
            </div>
          </div>

          <!-- Logo -->
          <div style="width: 80px; height: 80px; display: flex; align-items: center; justify-content: center;">
            ${settings?.logoPath ? `
              <img src="http://localhost:3000${settings.logoPath}" alt="Company Logo" style="max-width: 100%; max-height: 100%; object-fit: contain;" />
            ` : `
              <div style="width: 80px; height: 80px; background: #f8fafc; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 1px solid #e2e8f0;">
                <span style="font-size: 14px; color: #cbd5e1;">شعار</span>
              </div>
            `}
          </div>
        </header>

        <!-- Badge -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <span style="background: #1e3a8a; color: white; padding: 6px 16px; border-radius: 4px; font-size: 16px; font-weight: bold; display: inline-block;">
            ${typeLabels[invoice.type] || 'فاتورة'}${vatEnabled ? ' - فاتورة ضريبية' : ''}
          </span>
        </div>

        <!-- Info Grid -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px;">
          <!-- Client Info -->
          <div style="background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0; border-right: 4px solid #2563eb;">
            <h3 style="color: #1e3a8a; font-weight: bold; font-size: 12px; margin-bottom: 8px; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px;">بيانات العميل (Client Info)</h3>
            <div style="margin-bottom: 6px;"><span style="color: #64748b; font-size: 12px;">العميل:</span> <strong style="color: #0f172a; font-size: 12px;">${customerName}</strong></div>
            <div style="margin-bottom: 6px;"><span style="color: #64748b; font-size: 12px;">الشاحن:</span> <strong style="color: #0f172a; font-size: 12px;">${shipperName}</strong></div>
            <div><span style="color: #64748b; font-size: 12px;">نوع البضاعة:</span> <strong style="color: #0f172a; font-size: 12px;">${cargoType}</strong></div>
          </div>

          <!-- Invoice Details -->
          <div style="background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0; border-right: 4px solid #2563eb;">
            <h3 style="color: #1e3a8a; font-weight: bold; font-size: 12px; margin-bottom: 8px; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px;">تفاصيل الفاتورة (Invoice Details)</h3>
            <div style="margin-bottom: 6px;"><span style="color: #64748b; font-size: 12px;">رقم الفاتورة:</span> <strong style="color: #0f172a; font-size: 12px;">${invoice.code}</strong></div>
            <div style="margin-bottom: 6px;"><span style="color: #64748b; font-size: 12px;">التاريخ:</span> <strong style="color: #0f172a; font-size: 12px;">${formatDate(invoice.date)}</strong></div>
            <div><span style="color: #64748b; font-size: 12px;">الرقم الجمركي:</span> <strong style="color: #0f172a; font-size: 12px;">${customsNo}</strong></div>
          </div>
        </div>

        <!-- Logistics Strip -->
        <div style="display: flex; justify-content: space-around; background: #f0f9ff; padding: 12px; border-radius: 8px; border: 1px solid #bae6fd; margin-bottom: 20px;">
          <div style="text-align: center;">
            <div style="font-size: 12px; color: #64748b; margin-bottom: 2px;">اسم السائق</div>
            <div style="font-weight: bold; color: #1e3a8a; font-size: 14px;">${driverName}</div>
          </div>
          <div style="text-align: center;">
            <div style="font-size: 12px; color: #64748b; margin-bottom: 2px;">رقم اللوحة</div>
            <div style="font-weight: bold; color: #1e3a8a; font-size: 14px;">${vehicleNo}</div>
          </div>
          <div style="text-align: center;">
            <div style="font-size: 12px; color: #64748b; margin-bottom: 2px;">نظام العمليات</div>
            <div style="font-weight: bold; color: #1e3a8a; font-size: 14px;">نظام إدارة الجمارك</div>
          </div>
        </div>

        <!-- Table -->
        <div style="overflow: hidden; border-radius: 8px; border: 1px solid #e5e7eb; margin-bottom: 20px;">
          <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
            <thead style="background: #1e3a8a; color: white;">
              <tr>
                <th style="padding: 8px; font-weight: 500; width: 48px;">#</th>
                <th style="padding: 8px; font-weight: 500; text-align: right;">البيان (Description)</th>
                ${hasDetailedColumns ? `
                  <th style="padding: 8px; font-weight: 500; text-align: center; width: 96px;">سعر الوحدة</th>
                  <th style="padding: 8px; font-weight: 500; text-align: center; width: 80px;">الكمية</th>
                  <th style="padding: 8px; font-weight: 500; text-align: center; width: 80px;">الضريبة %</th>
                ` : ''}
                <th style="padding: 8px; font-weight: 500; text-align: left; width: 112px;">الإجمالي (SAR)</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHTML}
            </tbody>
          </table>
        </div>

        <!-- Total Section + QR Code -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px;">
          ${vatEnabled && qrCodeDataUrl ? `
            <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
              <img src="${qrCodeDataUrl}" alt="ZATCA QR Code" style="width: 112px; height: 112px; object-fit: contain;" />
              <span style="font-size: 10px; color: #9ca3af;">رمز الفاتورة الضريبية</span>
            </div>
          ` : '<div></div>'}
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 16px 24px; border-radius: 8px; min-width: 300px;">
            <div style="margin-bottom: 8px; display: flex; justify-content: space-between; color: #374151;">
              <span style="font-size: 14px;">الإجمالي قبل الضريبة:</span>
              <span style="font-weight: 600;">${formatCurrency(subtotal)} ريال</span>
            </div>
            <div style="margin-bottom: 8px; display: flex; justify-content: space-between; color: #374151;">
              <span style="font-size: 14px;">مبلغ الضريبة:</span>
              <span style="font-weight: 600;">${formatCurrency(vatAmount)} ريال</span>
            </div>
            <div style="padding-top: 8px; border-top: 1px solid #cbd5e1; display: flex; justify-content: space-between; color: #1e3a8a;">
              <span style="font-size: 16px; font-weight: bold;">الإجمالي شامل الضريبة:</span>
              <span style="font-size: 18px; font-weight: bold;">${formatCurrency(invoice.total)} ريال</span>
            </div>
          </div>
        </div>

        ${invoice.notes ? `
        <!-- Notes -->
        <div style="margin-bottom: 20px; padding: 12px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px;">
          <h4 style="font-weight: bold; color: #78350f; margin-bottom: 6px; font-size: 14px;">ملاحظات:</h4>
          <p style="color: #374151; white-space: pre-wrap; font-size: 12px;">${invoice.notes}</p>
        </div>
        ` : ''}

        <!-- Footer -->
        <footer style="display: flex; justify-content: space-between; align-items: end; border-top: 1px solid #e5e7eb; padding-top: 24px; margin-top: auto;">
          <div style="text-align: center; width: 192px;">
            <p style="font-weight: bold; color: #4b5563; margin-bottom: 32px; font-size: 14px;">المحاسب</p>
            <div style="border-bottom: 1px dashed #9ca3af; width: 100%;"></div>
          </div>
          <div style="text-align: center; width: 192px;">
            <p style="font-weight: bold; color: #4b5563; margin-bottom: 32px; font-size: 14px;">المسؤول / الختم</p>
            <div style="border-bottom: 1px dashed #9ca3af; width: 100%;"></div>
          </div>
        </footer>

        <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #9ca3af;">
          نظام إدارة العمليات الجمركية - تم إصدار هذه الفاتورة إلكترونياً
        </div>
      </div>
    </body>
    </html>
  `;
};
