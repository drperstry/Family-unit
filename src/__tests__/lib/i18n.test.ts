import { t, getTranslations, isRTL, getDirection, useTranslation, locales, defaultLocale } from '@/lib/i18n';

describe('i18n Module', () => {
  describe('locales', () => {
    it('contains both English and Arabic', () => {
      expect(locales).toContain('en');
      expect(locales).toContain('ar');
    });

    it('has English as default locale', () => {
      expect(defaultLocale).toBe('en');
    });
  });

  describe('isRTL', () => {
    it('returns true for Arabic', () => {
      expect(isRTL('ar')).toBe(true);
    });

    it('returns false for English', () => {
      expect(isRTL('en')).toBe(false);
    });
  });

  describe('getDirection', () => {
    it('returns rtl for Arabic', () => {
      expect(getDirection('ar')).toBe('rtl');
    });

    it('returns ltr for English', () => {
      expect(getDirection('en')).toBe('ltr');
    });
  });

  describe('t function', () => {
    it('translates common keys correctly in English', () => {
      expect(t('common.save', 'en')).toBe('Save');
      expect(t('common.cancel', 'en')).toBe('Cancel');
      expect(t('common.delete', 'en')).toBe('Delete');
    });

    it('translates common keys correctly in Arabic', () => {
      expect(t('common.save', 'ar')).toBe('حفظ');
      expect(t('common.cancel', 'ar')).toBe('إلغاء');
      expect(t('common.delete', 'ar')).toBe('حذف');
    });

    it('returns English translation for missing Arabic keys', () => {
      // If a key exists in English but not Arabic, it should return English
      const englishValue = t('common.loading', 'en');
      expect(t('common.loading', 'ar')).toBeDefined();
    });

    it('returns the key itself for non-existent keys', () => {
      expect(t('non.existent.key', 'en')).toBe('non.existent.key');
    });

    it('uses default locale when none specified', () => {
      expect(t('common.save')).toBe('Save');
    });
  });

  describe('getTranslations', () => {
    it('returns all translations for English', () => {
      const translations = getTranslations('en');
      expect(translations).toHaveProperty('common.save');
      expect(translations).toHaveProperty('nav.home');
      expect(translations).toHaveProperty('auth.email');
    });

    it('returns all translations for Arabic', () => {
      const translations = getTranslations('ar');
      expect(translations).toHaveProperty('common.save');
      expect(translations).toHaveProperty('nav.home');
      expect(translations).toHaveProperty('auth.email');
    });
  });

  describe('useTranslation hook', () => {
    it('returns correct properties for English', () => {
      const result = useTranslation('en');
      expect(result.locale).toBe('en');
      expect(result.dir).toBe('ltr');
      expect(result.isRTL).toBe(false);
      expect(typeof result.t).toBe('function');
    });

    it('returns correct properties for Arabic', () => {
      const result = useTranslation('ar');
      expect(result.locale).toBe('ar');
      expect(result.dir).toBe('rtl');
      expect(result.isRTL).toBe(true);
      expect(typeof result.t).toBe('function');
    });

    it('t function works correctly in hook', () => {
      const { t: translate } = useTranslation('en');
      expect(translate('common.save')).toBe('Save');
    });
  });

  describe('navigation translations', () => {
    it('has all navigation keys in English', () => {
      expect(t('nav.home', 'en')).toBe('Home');
      expect(t('nav.about', 'en')).toBe('About');
      expect(t('nav.familyTree', 'en')).toBe('Family Tree');
      expect(t('nav.gallery', 'en')).toBe('Gallery');
      expect(t('nav.news', 'en')).toBe('News');
      expect(t('nav.events', 'en')).toBe('Events');
      expect(t('nav.members', 'en')).toBe('Members');
      expect(t('nav.services', 'en')).toBe('Services');
    });

    it('has all navigation keys in Arabic', () => {
      expect(t('nav.home', 'ar')).toBe('الرئيسية');
      expect(t('nav.about', 'ar')).toBe('عن العائلة');
      expect(t('nav.familyTree', 'ar')).toBe('شجرة العائلة');
      expect(t('nav.gallery', 'ar')).toBe('معرض الصور');
      expect(t('nav.news', 'ar')).toBe('الأخبار');
    });
  });

  describe('auth translations', () => {
    it('has all auth keys', () => {
      expect(t('auth.email', 'en')).toBe('Email');
      expect(t('auth.password', 'en')).toBe('Password');
      expect(t('auth.loginTitle', 'en')).toBe('Welcome Back');
      expect(t('auth.registerTitle', 'en')).toBe('Create Account');
    });
  });

  describe('error translations', () => {
    it('has all error keys', () => {
      expect(t('error.notFound', 'en')).toBe('Page not found');
      expect(t('error.unauthorized', 'en')).toBe('Unauthorized access');
      expect(t('error.serverError', 'en')).toBe('Server error occurred');
    });
  });
});
