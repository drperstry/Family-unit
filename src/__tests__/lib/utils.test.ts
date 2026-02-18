import {
  cn,
  formatDate,
  formatRelativeTime,
  isValidObjectId,
  generateSlug,
  sanitizeHtml,
  truncateText,
  parsePaginationQuery,
  buildPaginationInfo,
} from '@/lib/utils';

describe('Utils Module', () => {
  describe('cn (className merger)', () => {
    it('merges class names', () => {
      expect(cn('class1', 'class2')).toBe('class1 class2');
    });

    it('handles conditional classes', () => {
      expect(cn('base', true && 'active', false && 'inactive')).toBe('base active');
    });

    it('handles undefined and null values', () => {
      expect(cn('base', undefined, null, 'end')).toBe('base end');
    });

    it('handles conflicting Tailwind classes', () => {
      expect(cn('p-4', 'p-2')).toBe('p-2');
    });

    it('handles object syntax', () => {
      expect(cn({ active: true, disabled: false })).toBe('active');
    });

    it('handles array syntax', () => {
      expect(cn(['class1', 'class2'])).toBe('class1 class2');
    });
  });

  describe('formatDate', () => {
    it('formats date with default options', () => {
      const date = new Date('2024-01-15T12:00:00Z');
      const formatted = formatDate(date);
      expect(formatted).toBeTruthy();
      expect(typeof formatted).toBe('string');
    });

    it('handles string input', () => {
      const formatted = formatDate('2024-01-15');
      expect(formatted).toBeTruthy();
    });

    it('returns empty string for invalid date', () => {
      expect(formatDate(null as any)).toBe('');
      expect(formatDate(undefined as any)).toBe('');
    });
  });

  describe('formatRelativeTime', () => {
    it('formats recent times as "just now"', () => {
      const now = new Date();
      expect(formatRelativeTime(now)).toContain('just now');
    });

    it('formats minutes ago', () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const result = formatRelativeTime(fiveMinutesAgo);
      expect(result).toContain('minute');
    });

    it('formats hours ago', () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      const result = formatRelativeTime(twoHoursAgo);
      expect(result).toContain('hour');
    });

    it('formats days ago', () => {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      const result = formatRelativeTime(threeDaysAgo);
      expect(result).toContain('day');
    });
  });

  describe('isValidObjectId', () => {
    it('returns true for valid ObjectIds', () => {
      expect(isValidObjectId('507f1f77bcf86cd799439011')).toBe(true);
      expect(isValidObjectId('507f191e810c19729de860ea')).toBe(true);
    });

    it('returns false for invalid ObjectIds', () => {
      expect(isValidObjectId('invalid')).toBe(false);
      expect(isValidObjectId('123')).toBe(false);
      expect(isValidObjectId('')).toBe(false);
      expect(isValidObjectId(null as any)).toBe(false);
      expect(isValidObjectId(undefined as any)).toBe(false);
    });

    it('returns false for wrong length strings', () => {
      expect(isValidObjectId('507f1f77bcf86cd7994390')).toBe(false);
      expect(isValidObjectId('507f1f77bcf86cd7994390111')).toBe(false);
    });
  });

  describe('generateSlug', () => {
    it('converts text to slug', () => {
      expect(generateSlug('Hello World')).toBe('hello-world');
    });

    it('removes special characters', () => {
      expect(generateSlug('Hello @World! #Test')).toBe('hello-world-test');
    });

    it('handles multiple spaces', () => {
      expect(generateSlug('Hello    World')).toBe('hello-world');
    });

    it('removes leading and trailing dashes', () => {
      expect(generateSlug('  Hello World  ')).toBe('hello-world');
    });

    it('handles empty string', () => {
      expect(generateSlug('')).toBe('');
    });

    it('handles numbers', () => {
      expect(generateSlug('Test 123 Page')).toBe('test-123-page');
    });
  });

  describe('sanitizeHtml', () => {
    it('removes script tags', () => {
      expect(sanitizeHtml('<script>alert("xss")</script>')).not.toContain('<script>');
    });

    it('removes onclick handlers', () => {
      expect(sanitizeHtml('<div onclick="alert()">Test</div>')).not.toContain('onclick');
    });

    it('preserves safe HTML', () => {
      const safeHtml = '<p>Hello <strong>World</strong></p>';
      expect(sanitizeHtml(safeHtml)).toContain('<p>');
      expect(sanitizeHtml(safeHtml)).toContain('<strong>');
    });

    it('handles empty string', () => {
      expect(sanitizeHtml('')).toBe('');
    });
  });

  describe('truncateText', () => {
    it('truncates long text', () => {
      const text = 'This is a very long text that needs to be truncated';
      expect(truncateText(text, 20)).toBe('This is a very long...');
    });

    it('does not truncate short text', () => {
      const text = 'Short';
      expect(truncateText(text, 20)).toBe('Short');
    });

    it('uses custom suffix', () => {
      const text = 'This is a long text';
      expect(truncateText(text, 10, ' [more]')).toBe('This is a [more]');
    });

    it('handles empty string', () => {
      expect(truncateText('', 20)).toBe('');
    });

    it('handles exact length', () => {
      const text = 'Exact';
      expect(truncateText(text, 5)).toBe('Exact');
    });
  });

  describe('parsePaginationQuery', () => {
    it('parses page and limit from search params', () => {
      const params = new URLSearchParams('page=2&limit=20');
      const result = parsePaginationQuery(params);
      expect(result.page).toBe(2);
      expect(result.limit).toBe(20);
    });

    it('uses default values', () => {
      const params = new URLSearchParams();
      const result = parsePaginationQuery(params);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it('handles invalid values', () => {
      const params = new URLSearchParams('page=abc&limit=xyz');
      const result = parsePaginationQuery(params);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it('enforces max limit', () => {
      const params = new URLSearchParams('limit=1000');
      const result = parsePaginationQuery(params);
      expect(result.limit).toBeLessThanOrEqual(100);
    });
  });

  describe('buildPaginationInfo', () => {
    it('calculates pagination info correctly', () => {
      const result = buildPaginationInfo(2, 10, 45);
      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
      expect(result.total).toBe(45);
      expect(result.totalPages).toBe(5);
      expect(result.hasMore).toBe(true);
    });

    it('handles last page', () => {
      const result = buildPaginationInfo(5, 10, 45);
      expect(result.hasMore).toBe(false);
    });

    it('handles empty results', () => {
      const result = buildPaginationInfo(1, 10, 0);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
      expect(result.hasMore).toBe(false);
    });

    it('handles single page', () => {
      const result = buildPaginationInfo(1, 10, 5);
      expect(result.totalPages).toBe(1);
      expect(result.hasMore).toBe(false);
    });
  });
});
