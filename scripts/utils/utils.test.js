import { formatCardDate, getSection, getSectionFromPath } from './utils.js';

describe('getSection', () => {
  it('resolves a slug or authored name to label and path', () => {
    expect(getSection('Research')).toEqual({
      slug: 'research',
      label: 'Research',
      path: '/research',
    });
    expect(getSection('workflows')).toEqual({
      slug: 'workflows',
      label: 'Workflows',
      path: '/workflows',
    });
  });

  it('returns null for unknown names', () => {
    expect(getSection('')).toBeNull();
    expect(getSection('policy')).toBeNull();
  });
});

describe('getSectionFromPath', () => {
  it('uses the first path segment', () => {
    expect(getSectionFromPath('/sneaks/clip')).toEqual({
      slug: 'sneaks',
      label: 'Sneaks',
      path: '/sneaks',
    });
  });

  it('returns null for unknown folders', () => {
    expect(getSectionFromPath('/policy/terms')).toBeNull();
  });
});

describe('formatCardDate', () => {
  const now = new Date(2026, 7, 25);

  it('formats a current-year date as Month Day', () => {
    expect(formatCardDate('2026-10-21', now)).toBe('Oct 21');
  });

  it('includes the year when the date is not this year', () => {
    expect(formatCardDate('2027-10-21', now)).toBe('Oct 21, 2027');
  });

  it('includes the year for past years', () => {
    expect(formatCardDate('2025-10-21', now)).toBe('Oct 21, 2025');
  });

  it('parses authored month-name dates', () => {
    expect(formatCardDate('August 3, 2026', now)).toBe('Aug 3');
  });

  it('returns an empty string for invalid dates', () => {
    expect(formatCardDate('not a date', now)).toBe('');
    expect(formatCardDate('', now)).toBe('');
  });
});
