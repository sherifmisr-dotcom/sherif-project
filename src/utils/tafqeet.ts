// src/utils/tafqeet.ts

export function tafqeet(amount: number, currency: string = 'ريال سعودي'): string {
  if (amount === 0) return "صفر";

  const ones = ["", "واحد", "اثنان", "ثلاثة", "أربعة", "خمسة", "ستة", "سبعة", "ثمانية", "تسعة"];
  const tens = ["", "عشرة", "عشرون", "ثلاثون", "أربعون", "خمسون", "ستون", "سبعون", "ثمانون", "تسعون"];
  const teens = ["عشرة", "أحد عشر", "اثنا عشر", "ثلاثة عشر", "أربعة عشر", "خمسة عشر", "ستة عشر", "سبعة عشر", "ثمانية عشر", "تسعة عشر"];
  const hundreds = ["", "مائة", "مائتان", "ثلاثمائة", "أربعمائة", "خمسمائة", "ستمائة", "سبعمائة", "ثمانمائة", "تسعمائة"];
  const thousands = ["", "ألف", "ألفان", "ثلاثة آلاف", "أربعة آلاف", "خمسة آلاف", "ستة آلاف", "سبعة آلاف", "ثمانية آلاف", "تسعة آلاف"];

  // فصل الريالات عن الهللات
  const parts = amount.toString().split(".");
  const riyal = parseInt(parts[0]);
  const halala = parts.length > 1 ? parseInt(parts[1].substring(0, 2).padEnd(2, '0')) : 0;

  let text = "";

  // معالجة الآلاف (حتى 9999) - يمكن توسيعها للملايين إذا لزم الأمر
  if (riyal >= 1000) {
    const th = Math.floor(riyal / 1000);
    const rem = riyal % 1000;
    
    if (th === 1) text += "ألف";
    else if (th === 2) text += "ألفان";
    else if (th >= 3 && th <= 10) text += thousands[th];
    else text += convertSegment(th) + " ألف";
    
    if (rem > 0) text += " و";
    text += convertSegment(rem);
  } else {
    text += convertSegment(riyal);
  }

  text += " " + currency;

  if (halala > 0) {
    text += " و " + convertSegment(halala) + " هللة";
  }

  return text + " لا غير";

  // دالة مساعدة للأرقام تحت 1000
  function convertSegment(num: number): string {
    if (num === 0) return "";
    
    let segmentText = "";
    
    // المئات
    if (num >= 100) {
      segmentText += hundreds[Math.floor(num / 100)];
      num %= 100;
      if (num > 0) segmentText += " و";
    }

    // العشرات والآحاد
    if (num > 0) {
      if (num < 10) {
        segmentText += ones[num];
      } else if (num < 20) {
        segmentText += teens[num - 10];
      } else {
        const one = num % 10;
        const ten = Math.floor(num / 10);
        if (one > 0) {
          segmentText += ones[one] + " و" + tens[ten];
        } else {
          segmentText += tens[ten];
        }
      }
    }
    return segmentText;
  }
}