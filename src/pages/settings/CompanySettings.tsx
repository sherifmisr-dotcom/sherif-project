import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiClient } from '@/lib/api';
import { Building2, Upload, Save, Loader2 } from 'lucide-react';

const companySettingsSchema = z.object({
    nameAr: z.string().min(1, 'اسم الشركة بالعربي مطلوب'),
    nameEn: z.string().min(1, 'اسم الشركة بالإنجليزي مطلوب'),
    activityAr: z.string().optional(),
    activityEn: z.string().optional(),
    taxNumber: z.string().min(1, 'الرقم الضريبي مطلوب'),
    licenseNo: z.string().min(1, 'رقم الرخصة مطلوب'),
    addressAr: z.string().optional(),
    addressEn: z.string().optional(),
    phone: z.string().min(1, 'رقم الجوال مطلوب'),
    email: z.string().email('البريد الإلكتروني غير صحيح').min(1, 'البريد الإلكتروني مطلوب'),
});

type CompanySettingsForm = z.infer<typeof companySettingsSchema>;

export default function CompanySettings() {
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [currentLogo, setCurrentLogo] = useState<string | null>(null);
    const [uploadingLogo, setUploadingLogo] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
        reset,
    } = useForm<CompanySettingsForm>({
        resolver: zodResolver(companySettingsSchema),
    });

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            setLoading(true);
            const response = await apiClient.getCompanySettings();
            const data = response.data || response;

            if (data) {
                reset({
                    nameAr: data.nameAr || '',
                    nameEn: data.nameEn || '',
                    activityAr: data.activityAr || '',
                    activityEn: data.activityEn || '',
                    taxNumber: data.taxNumber || '',
                    licenseNo: data.licenseNo || '',
                    addressAr: data.addressAr || '',
                    addressEn: data.addressEn || '',
                    phone: data.phone || '',
                    email: data.email || '',
                });

                if (data.logoPath) {
                    setCurrentLogo(`http://localhost:3000${data.logoPath}`);
                }
            }
        } catch (error) {
            console.error('Error loading settings:', error);
            setMessage({ type: 'error', text: 'فشل تحميل البيانات' });
        } finally {
            setLoading(false);
        }
    };

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Validate file type
            if (!file.type.match(/image\/(jpg|jpeg|png|gif)/)) {
                setMessage({ type: 'error', text: 'يجب أن تكون الصورة بصيغة JPG, PNG أو GIF' });
                return;
            }

            // Validate file size (2MB)
            if (file.size > 2 * 1024 * 1024) {
                setMessage({ type: 'error', text: 'حجم الصورة يجب أن لا يتجاوز 2 ميجابايت' });
                return;
            }

            setLogoFile(file);

            // Create preview
            const reader = new FileReader();
            reader.onloadend = () => {
                setLogoPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const uploadLogo = async () => {
        if (!logoFile) return null;

        try {
            setUploadingLogo(true);
            const formData = new FormData();
            formData.append('logo', logoFile);

            const response = await apiClient.uploadCompanyLogo(formData);
            const data = response.data || response;

            setCurrentLogo(`http://localhost:3000${data.logoPath}`);
            setLogoFile(null);
            setLogoPreview(null);

            return data.logoPath;
        } catch (error) {
            console.error('Error uploading logo:', error);
            throw error;
        } finally {
            setUploadingLogo(false);
        }
    };

    const onSubmit = async (data: CompanySettingsForm) => {
        try {
            setSaving(true);
            setMessage(null);

            // Upload logo first if there's a new one
            if (logoFile) {
                await uploadLogo();
            }

            // Save company settings
            await apiClient.updateCompanySettings(data);

            setMessage({ type: 'success', text: 'تم حفظ البيانات بنجاح' });

            // Reload to get updated data
            setTimeout(() => {
                loadSettings();
            }, 1000);
        } catch (error) {
            console.error('Error saving settings:', error);
            setMessage({ type: 'error', text: 'فشل حفظ البيانات' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-500 rounded-lg">
                    <Building2 className="w-6 h-6 text-white" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">بيانات الشركة</h2>
                    <p className="text-gray-600 dark:text-gray-400">إدارة معلومات الشركة والإعدادات</p>
                </div>
            </div>

            {message && (
                <div
                    className={`p-4 rounded-lg flex items-center gap-3 ${message.type === 'success'
                        ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200'
                        : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200'
                        }`}
                >
                    {message.text}
                </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* Logo Upload Section */}
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">شعار الشركة</h3>

                    <div className="flex items-start gap-6">
                        {/* Current/Preview Logo */}
                        <div className="flex-shrink-0">
                            {logoPreview || currentLogo ? (
                                <img
                                    src={logoPreview || currentLogo || ''}
                                    alt="Company Logo"
                                    className="w-32 h-32 object-contain border border-gray-200 dark:border-gray-600 rounded-lg p-2 bg-white"
                                />
                            ) : (
                                <div className="w-32 h-32 bg-gray-50 dark:bg-gray-700 rounded-lg flex items-center justify-center border border-gray-200 dark:border-gray-600">
                                    <Building2 className="w-12 h-12 text-gray-400" />
                                </div>
                            )}
                        </div>

                        {/* Upload Controls */}
                        <div className="flex-1">
                            <label className="block">
                                <div className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors w-fit shadow-sm">
                                    <Upload className="w-5 h-5" />
                                    <span>{logoFile ? 'تغيير الصورة' : 'رفع شعار'}</span>
                                </div>
                                <input
                                    type="file"
                                    accept="image/jpeg,image/jpg,image/png,image/gif"
                                    onChange={handleLogoChange}
                                    className="hidden"
                                />
                            </label>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                                JPG, PNG أو GIF (حد أقصى 2MB)
                            </p>
                            {logoFile && (
                                <p className="text-sm text-green-600 dark:text-green-500 mt-1">
                                    تم اختيار: {logoFile.name}
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Information Grid */}
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">معلومات الشركة</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">اسم الشركة (عربي) <span className="text-red-500">*</span></label>
                            <input
                                {...register('nameAr')}
                                type="text"
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                            />
                            {errors.nameAr && <p className="text-red-500 text-sm mt-1">{errors.nameAr.message}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">اسم الشركة (إنجليزي) <span className="text-red-500">*</span></label>
                            <input
                                {...register('nameEn')}
                                type="text"
                                dir="ltr"
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                            />
                            {errors.nameEn && <p className="text-red-500 text-sm mt-1">{errors.nameEn.message}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">النشاط (عربي)</label>
                            <input
                                {...register('activityAr')}
                                type="text"
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">النشاط (إنجليزي)</label>
                            <input
                                {...register('activityEn')}
                                type="text"
                                dir="ltr"
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">الرقم الضريبي <span className="text-red-500">*</span></label>
                            <input
                                {...register('taxNumber')}
                                type="text"
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                            />
                            {errors.taxNumber && <p className="text-red-500 text-sm mt-1">{errors.taxNumber.message}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">رقم الرخصة <span className="text-red-500">*</span></label>
                            <input
                                {...register('licenseNo')}
                                type="text"
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                            />
                            {errors.licenseNo && <p className="text-red-500 text-sm mt-1">{errors.licenseNo.message}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">رقم الجوال <span className="text-red-500">*</span></label>
                            <input
                                {...register('phone')}
                                type="tel"
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                            />
                            {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone.message}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">البريد الإلكتروني <span className="text-red-500">*</span></label>
                            <input
                                {...register('email')}
                                type="email"
                                dir="ltr"
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                            />
                            {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">العنوان (عربي)</label>
                            <textarea
                                {...register('addressAr')}
                                rows={3}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">العنوان (إنجليزي)</label>
                            <textarea
                                {...register('addressEn')}
                                rows={3}
                                dir="ltr"
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                            />
                        </div>
                    </div>
                </div>

                {/* Submit Button */}
                <div className="flex justify-end pt-4">
                    <button
                        type="submit"
                        disabled={saving || uploadingLogo}
                        className="btn-primary px-8 py-2.5 flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {saving || uploadingLogo ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>جاري الحفظ...</span>
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4" />
                                <span>حفظ التغييرات</span>
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
