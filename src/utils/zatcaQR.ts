import QRCode from 'qrcode';
import { generateZatcaQR } from './zatca';

export interface ZatcaQRInput {
    sellerName: string;
    taxNumber: string;
    date: string;
    total: number;
    vatAmount: number;
}

/**
 * Generate a ZATCA-compliant QR code as a Data URL (base64 PNG image).
 * Encodes seller name, tax number, date, total, and VAT amount per Saudi ZATCA Phase 1 TLV spec.
 */
export async function generateZatcaQRDataUrl(input: ZatcaQRInput): Promise<string> {
    try {
        // Format date as ISO string
        const dateStr = new Date(input.date).toISOString();

        // Generate TLV Base64 string
        const tlvBase64 = generateZatcaQR(
            input.sellerName,
            input.taxNumber,
            dateStr,
            input.total,
            input.vatAmount
        );

        if (!tlvBase64) return '';

        // Generate QR code as data URL
        const dataUrl = await QRCode.toDataURL(tlvBase64, {
            errorCorrectionLevel: 'M',
            width: 200,
            margin: 1,
            color: {
                dark: '#1e3a8a',
                light: '#ffffff',
            },
        });

        return dataUrl;
    } catch (error) {
        console.error('Error generating ZATCA QR code image:', error);
        return '';
    }
}
