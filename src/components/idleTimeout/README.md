# IdleTimeoutModal Component

مكون React لعرض نافذة تحذير قبل انتهاء جلسة المستخدم بسبب الخمول.

## الميزات

- ✅ عرض تحذير باللغة العربية مع عداد تنازلي
- ✅ زر "استمرار" لإعادة ضبط المؤقت
- ✅ زر "إنهاء الجلسة" لتسجيل الخروج يدويًا
- ✅ دعم RTL للغة العربية
- ✅ إمكانية الوصول الكاملة (ARIA attributes)
- ✅ دعم لوحة المفاتيح (Escape للإغلاق)
- ✅ تركيز تلقائي على زر "استمرار"
- ✅ رسوم متحركة سلسة

## الاستخدام

```tsx
import { IdleTimeoutModal } from './components/idleTimeout';

function App() {
  const [showModal, setShowModal] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(60);

  const handleContinue = () => {
    setShowModal(false);
    // إعادة ضبط المؤقت
  };

  const handleLogout = () => {
    // تسجيل الخروج
  };

  return (
    <>
      {/* محتوى التطبيق */}
      
      <IdleTimeoutModal
        isOpen={showModal}
        remainingSeconds={remainingSeconds}
        onContinue={handleContinue}
        onLogout={handleLogout}
      />
    </>
  );
}
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `isOpen` | `boolean` | ✅ | ما إذا كان المودال مفتوحًا |
| `remainingSeconds` | `number` | ✅ | الثواني المتبقية في العداد التنازلي |
| `onContinue` | `() => void` | ✅ | دالة يتم استدعاؤها عند النقر على "استمرار" |
| `onLogout` | `() => void` | ✅ | دالة يتم استدعاؤها عند النقر على "إنهاء الجلسة" |

## المتطلبات المحققة

- **3.2**: عرض نص تحذير بالعربية مع العداد التنازلي
- **3.3**: زر "استمرار" مع تركيز تلقائي
- **3.4**: زر "إنهاء الجلسة"
- **15.1**: عدم العرض عندما `isOpen` يساوي `false`
- **15.2**: العرض عندما `isOpen` يساوي `true`

## إمكانية الوصول

- `role="dialog"` و `aria-modal="true"` للمودال
- `aria-labelledby` و `aria-describedby` للوصف
- `aria-live="polite"` للعداد التنازلي
- دعم مفتاح Escape للإغلاق
- تركيز تلقائي على زر "استمرار"
- دعم RTL للغة العربية

## الاختبارات

جميع الاختبارات موجودة في `src/__tests__/idleTimeout/IdleTimeoutModal.test.tsx`:

- ✅ 15 اختبار وحدة
- ✅ اختبارات العرض
- ✅ اختبارات إمكانية الوصول
- ✅ اختبارات التفاعل
- ✅ اختبارات التنظيف

لتشغيل الاختبارات:

```bash
npm test IdleTimeoutModal.test.tsx
```
