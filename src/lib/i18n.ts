// Internationalization (i18n) support
// Supports Arabic (ar) and English (en)

export type Locale = 'en' | 'ar';

export const defaultLocale: Locale = 'en';
export const locales: Locale[] = ['en', 'ar'];

export const rtlLocales: Locale[] = ['ar'];

export function isRTL(locale: Locale): boolean {
  return rtlLocales.includes(locale);
}

export function getDirection(locale: Locale): 'ltr' | 'rtl' {
  return isRTL(locale) ? 'rtl' : 'ltr';
}

// Translation dictionaries
const translations: Record<Locale, Record<string, string>> = {
  en: {
    // Common
    'common.loading': 'Loading...',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.add': 'Add',
    'common.search': 'Search',
    'common.filter': 'Filter',
    'common.submit': 'Submit',
    'common.back': 'Back',
    'common.next': 'Next',
    'common.previous': 'Previous',
    'common.close': 'Close',
    'common.confirm': 'Confirm',
    'common.yes': 'Yes',
    'common.no': 'No',
    'common.all': 'All',
    'common.none': 'None',
    'common.select': 'Select',
    'common.upload': 'Upload',
    'common.download': 'Download',
    'common.view': 'View',
    'common.share': 'Share',
    'common.copy': 'Copy',
    'common.copied': 'Copied!',
    'common.error': 'Error',
    'common.success': 'Success',
    'common.warning': 'Warning',
    'common.info': 'Info',

    // Navigation
    'nav.home': 'Home',
    'nav.about': 'About',
    'nav.familyTree': 'Family Tree',
    'nav.gallery': 'Gallery',
    'nav.news': 'News',
    'nav.events': 'Events',
    'nav.members': 'Members',
    'nav.services': 'Services',
    'nav.profile': 'Profile',
    'nav.settings': 'Settings',
    'nav.admin': 'Admin',
    'nav.login': 'Login',
    'nav.register': 'Register',
    'nav.logout': 'Logout',

    // Auth
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.confirmPassword': 'Confirm Password',
    'auth.firstName': 'First Name',
    'auth.lastName': 'Last Name',
    'auth.forgotPassword': 'Forgot Password?',
    'auth.resetPassword': 'Reset Password',
    'auth.loginTitle': 'Welcome Back',
    'auth.loginSubtitle': 'Sign in to your account',
    'auth.registerTitle': 'Create Account',
    'auth.registerSubtitle': 'Join your family community',
    'auth.noAccount': "Don't have an account?",
    'auth.haveAccount': 'Already have an account?',
    'auth.signIn': 'Sign In',
    'auth.signUp': 'Sign Up',
    'auth.orContinueWith': 'Or continue with',

    // Family
    'family.title': 'Family',
    'family.members': 'Family Members',
    'family.tree': 'Family Tree',
    'family.addMember': 'Add Member',
    'family.editMember': 'Edit Member',
    'family.deleteMember': 'Delete Member',
    'family.relationship': 'Relationship',
    'family.parent': 'Parent',
    'family.child': 'Child',
    'family.spouse': 'Spouse',
    'family.sibling': 'Sibling',
    'family.generation': 'Generation',

    // Gallery
    'gallery.title': 'Photo Gallery',
    'gallery.uploadPhoto': 'Upload Photo',
    'gallery.createAlbum': 'Create Album',
    'gallery.noPhotos': 'No photos yet',
    'gallery.deletePhoto': 'Delete Photo',

    // News
    'news.title': 'News & Updates',
    'news.createPost': 'Create Post',
    'news.readMore': 'Read More',
    'news.noNews': 'No news yet',

    // Events
    'events.title': 'Events',
    'events.createEvent': 'Create Event',
    'events.upcoming': 'Upcoming Events',
    'events.past': 'Past Events',
    'events.noEvents': 'No events scheduled',

    // Services
    'services.title': 'Services',
    'services.description': 'Family services and support',
    'services.requestService': 'Request Service',

    // Profile
    'profile.title': 'Profile',
    'profile.editProfile': 'Edit Profile',
    'profile.changePassword': 'Change Password',
    'profile.personalInfo': 'Personal Information',
    'profile.contactInfo': 'Contact Information',

    // Settings
    'settings.title': 'Settings',
    'settings.general': 'General',
    'settings.notifications': 'Notifications',
    'settings.privacy': 'Privacy',
    'settings.language': 'Language',
    'settings.theme': 'Theme',

    // Admin
    'admin.title': 'Admin Dashboard',
    'admin.users': 'Users',
    'admin.families': 'Families',
    'admin.approvals': 'Pending Approvals',
    'admin.content': 'Content Management',

    // Submissions
    'submissions.title': 'Submissions',
    'submissions.new': 'New Submission',
    'submissions.pending': 'Pending',
    'submissions.approved': 'Approved',
    'submissions.rejected': 'Rejected',

    // Errors
    'error.notFound': 'Page not found',
    'error.unauthorized': 'Unauthorized access',
    'error.serverError': 'Server error occurred',
    'error.networkError': 'Network error. Please try again.',
  },
  ar: {
    // Common
    'common.loading': 'جاري التحميل...',
    'common.save': 'حفظ',
    'common.cancel': 'إلغاء',
    'common.delete': 'حذف',
    'common.edit': 'تعديل',
    'common.add': 'إضافة',
    'common.search': 'بحث',
    'common.filter': 'تصفية',
    'common.submit': 'إرسال',
    'common.back': 'رجوع',
    'common.next': 'التالي',
    'common.previous': 'السابق',
    'common.close': 'إغلاق',
    'common.confirm': 'تأكيد',
    'common.yes': 'نعم',
    'common.no': 'لا',
    'common.all': 'الكل',
    'common.none': 'لا شيء',
    'common.select': 'اختيار',
    'common.upload': 'رفع',
    'common.download': 'تحميل',
    'common.view': 'عرض',
    'common.share': 'مشاركة',
    'common.copy': 'نسخ',
    'common.copied': 'تم النسخ!',
    'common.error': 'خطأ',
    'common.success': 'نجاح',
    'common.warning': 'تحذير',
    'common.info': 'معلومة',

    // Navigation
    'nav.home': 'الرئيسية',
    'nav.about': 'عن العائلة',
    'nav.familyTree': 'شجرة العائلة',
    'nav.gallery': 'معرض الصور',
    'nav.news': 'الأخبار',
    'nav.events': 'المناسبات',
    'nav.members': 'الأعضاء',
    'nav.services': 'الخدمات',
    'nav.profile': 'الملف الشخصي',
    'nav.settings': 'الإعدادات',
    'nav.admin': 'لوحة التحكم',
    'nav.login': 'تسجيل الدخول',
    'nav.register': 'إنشاء حساب',
    'nav.logout': 'تسجيل الخروج',

    // Auth
    'auth.email': 'البريد الإلكتروني',
    'auth.password': 'كلمة المرور',
    'auth.confirmPassword': 'تأكيد كلمة المرور',
    'auth.firstName': 'الاسم الأول',
    'auth.lastName': 'اسم العائلة',
    'auth.forgotPassword': 'نسيت كلمة المرور؟',
    'auth.resetPassword': 'إعادة تعيين كلمة المرور',
    'auth.loginTitle': 'مرحباً بعودتك',
    'auth.loginSubtitle': 'سجل دخولك للمتابعة',
    'auth.registerTitle': 'إنشاء حساب',
    'auth.registerSubtitle': 'انضم إلى مجتمع عائلتك',
    'auth.noAccount': 'ليس لديك حساب؟',
    'auth.haveAccount': 'لديك حساب بالفعل؟',
    'auth.signIn': 'دخول',
    'auth.signUp': 'تسجيل',
    'auth.orContinueWith': 'أو المتابعة بواسطة',

    // Family
    'family.title': 'العائلة',
    'family.members': 'أفراد العائلة',
    'family.tree': 'شجرة العائلة',
    'family.addMember': 'إضافة فرد',
    'family.editMember': 'تعديل الفرد',
    'family.deleteMember': 'حذف الفرد',
    'family.relationship': 'العلاقة',
    'family.parent': 'الوالد',
    'family.child': 'الابن/الابنة',
    'family.spouse': 'الزوج/الزوجة',
    'family.sibling': 'الأخ/الأخت',
    'family.generation': 'الجيل',

    // Gallery
    'gallery.title': 'معرض الصور',
    'gallery.uploadPhoto': 'رفع صورة',
    'gallery.createAlbum': 'إنشاء ألبوم',
    'gallery.noPhotos': 'لا توجد صور بعد',
    'gallery.deletePhoto': 'حذف الصورة',

    // News
    'news.title': 'الأخبار والتحديثات',
    'news.createPost': 'إنشاء منشور',
    'news.readMore': 'قراءة المزيد',
    'news.noNews': 'لا توجد أخبار بعد',

    // Events
    'events.title': 'المناسبات',
    'events.createEvent': 'إنشاء مناسبة',
    'events.upcoming': 'المناسبات القادمة',
    'events.past': 'المناسبات السابقة',
    'events.noEvents': 'لا توجد مناسبات مجدولة',

    // Services
    'services.title': 'الخدمات',
    'services.description': 'خدمات ودعم العائلة',
    'services.requestService': 'طلب خدمة',

    // Profile
    'profile.title': 'الملف الشخصي',
    'profile.editProfile': 'تعديل الملف',
    'profile.changePassword': 'تغيير كلمة المرور',
    'profile.personalInfo': 'المعلومات الشخصية',
    'profile.contactInfo': 'معلومات الاتصال',

    // Settings
    'settings.title': 'الإعدادات',
    'settings.general': 'عام',
    'settings.notifications': 'الإشعارات',
    'settings.privacy': 'الخصوصية',
    'settings.language': 'اللغة',
    'settings.theme': 'المظهر',

    // Admin
    'admin.title': 'لوحة التحكم',
    'admin.users': 'المستخدمون',
    'admin.families': 'العائلات',
    'admin.approvals': 'الموافقات المعلقة',
    'admin.content': 'إدارة المحتوى',

    // Submissions
    'submissions.title': 'الطلبات',
    'submissions.new': 'طلب جديد',
    'submissions.pending': 'قيد الانتظار',
    'submissions.approved': 'موافق عليه',
    'submissions.rejected': 'مرفوض',

    // Errors
    'error.notFound': 'الصفحة غير موجودة',
    'error.unauthorized': 'غير مصرح بالوصول',
    'error.serverError': 'حدث خطأ في الخادم',
    'error.networkError': 'خطأ في الشبكة. يرجى المحاولة مرة أخرى.',
  },
};

export function t(key: string, locale: Locale = defaultLocale): string {
  return translations[locale][key] || translations[defaultLocale][key] || key;
}

export function getTranslations(locale: Locale): Record<string, string> {
  return translations[locale] || translations[defaultLocale];
}

// Hook for use in React components
export function useTranslation(locale: Locale) {
  return {
    t: (key: string) => t(key, locale),
    locale,
    dir: getDirection(locale),
    isRTL: isRTL(locale),
  };
}
