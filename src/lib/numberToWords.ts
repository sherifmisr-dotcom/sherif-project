// دالة تحويل الأرقام إلى كلمات بالعربية (تفقيط)

const ones = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة'];
const tens = ['', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
const hundreds = ['', 'مائة', 'مائتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];
const teens = ['عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];

function convertHundreds(num: number): string {
    if (num === 0) return '';

    const hundred = Math.floor(num / 100);
    const remainder = num % 100;

    let result = hundreds[hundred];

    if (remainder === 0) {
        return result;
    }

    if (result) result += ' و';

    if (remainder >= 10 && remainder < 20) {
        result += teens[remainder - 10];
    } else {
        const ten = Math.floor(remainder / 10);
        const one = remainder % 10;

        // الترتيب الصحيح: الآحاد ثم العشرات (ثمانية وعشرون)
        if (one > 0) {
            result += ones[one];
            if (ten > 0) result += ' و';
        }

        if (ten > 0) {
            result += tens[ten];
        }
    }

    return result;
}

function convertThousands(num: number): string {
    if (num === 0) return '';

    const thousand = Math.floor(num / 1000);
    const remainder = num % 1000;

    let result = '';

    if (thousand === 1) {
        result = 'ألف';
    } else if (thousand === 2) {
        result = 'ألفان';
    } else if (thousand >= 3 && thousand <= 10) {
        result = convertHundreds(thousand) + ' آلاف';
    } else if (thousand > 10) {
        result = convertHundreds(thousand) + ' ألف';
    }

    if (remainder > 0) {
        if (result) result += ' و';
        result += convertHundreds(remainder);
    }

    return result;
}

function convertMillions(num: number): string {
    if (num === 0) return '';

    const million = Math.floor(num / 1000000);
    const remainder = num % 1000000;

    let result = '';

    if (million === 1) {
        result = 'مليون';
    } else if (million === 2) {
        result = 'مليونان';
    } else if (million >= 3 && million <= 10) {
        result = convertHundreds(million) + ' ملايين';
    } else if (million > 10) {
        result = convertHundreds(million) + ' مليون';
    }

    if (remainder > 0) {
        if (result) result += ' و';
        if (remainder >= 1000) {
            result += convertThousands(remainder);
        } else {
            result += convertHundreds(remainder);
        }
    }

    return result;
}

export function numberToArabicWords(num: number): string {
    if (num === 0) return 'صفر';

    // فصل الجزء الصحيح والكسري
    const integerPart = Math.floor(Math.abs(num));
    const decimalPart = Math.round((Math.abs(num) - integerPart) * 100);

    let result = '';

    // تحويل الجزء الصحيح
    if (integerPart >= 1000000) {
        result = convertMillions(integerPart);
    } else if (integerPart >= 1000) {
        result = convertThousands(integerPart);
    } else {
        result = convertHundreds(integerPart);
    }

    // إضافة العملة
    if (result) {
        result += ' ريال سعودي';
    }

    // إضافة الجزء الكسري (الهللات)
    if (decimalPart > 0) {
        if (result) result += ' و';
        result += convertHundreds(decimalPart);
        result += ' هللة';
    }

    // إضافة علامة السالب إذا كان الرقم سالباً
    if (num < 0) {
        result = 'سالب ' + result;
    }

    return result || 'صفر';
}

// دالة مساعدة لتنسيق المبلغ مع التفقيط
export function formatAmountWithWords(amount: number): {
    numeric: string;
    words: string;
} {
    return {
        numeric: new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(amount),
        words: numberToArabicWords(amount),
    };
}
