import { cn, formatRelativeTime, truncate, slugify } from './utils';

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('handles conditional classes', () => {
    expect(cn('base', false && 'skipped', 'included')).toBe('base included');
  });

  it('deduplicates conflicting Tailwind classes (last wins)', () => {
    // tailwind-merge keeps the latter of conflicting utilities
    expect(cn('p-2', 'p-4')).toBe('p-4');
    expect(cn('text-sm', 'text-lg')).toBe('text-lg');
  });

  it('handles undefined and null gracefully', () => {
    expect(cn(undefined, null as any, 'valid')).toBe('valid');
  });
});

describe('truncate', () => {
  it('returns the original string when within limit', () => {
    expect(truncate('hello', 10)).toBe('hello');
  });

  it('truncates and appends ellipsis when over limit', () => {
    const result = truncate('hello world', 5);
    expect(result).toHaveLength(6); // 5 chars + '…'
    expect(result.endsWith('…')).toBe(true);
    expect(result.startsWith('hello')).toBe(true);
  });

  it('handles exact boundary', () => {
    expect(truncate('exact', 5)).toBe('exact');
  });
});

describe('slugify', () => {
  it('converts to lowercase', () => {
    expect(slugify('Hello World')).toBe('hello-world');
  });

  it('replaces spaces with hyphens', () => {
    expect(slugify('foo bar baz')).toBe('foo-bar-baz');
  });

  it('removes special characters', () => {
    expect(slugify('Hello, World!')).toBe('hello-world');
  });

  it('handles multiple spaces and hyphens', () => {
    expect(slugify('  multiple   spaces  ')).toBe('multiple-spaces');
  });
});

describe('formatRelativeTime', () => {
  it('returns "just now" for very recent times', () => {
    expect(formatRelativeTime(new Date())).toBe('just now');
  });

  it('returns minutes ago for recent times', () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60_000);
    expect(formatRelativeTime(fiveMinutesAgo)).toBe('5m ago');
  });

  it('returns hours ago for older times', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60_000);
    expect(formatRelativeTime(twoHoursAgo)).toBe('2h ago');
  });

  it('returns days ago for times within a week', () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60_000);
    expect(formatRelativeTime(threeDaysAgo)).toBe('3d ago');
  });

  it('returns a formatted date for times older than a week', () => {
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60_000);
    const result = formatRelativeTime(tenDaysAgo);
    // Should be a formatted date string, not relative
    expect(result).toMatch(/\w+ \d+, \d{4}/);
  });

  it('accepts an ISO string input', () => {
    const iso = new Date(Date.now() - 30 * 60_000).toISOString();
    expect(formatRelativeTime(iso)).toBe('30m ago');
  });
});
