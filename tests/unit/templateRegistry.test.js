'use strict';

const registry = require('../../services/templateRegistry');

describe('templateRegistry', () => {
  test('exposes exactly 30 templates', () => {
    expect(registry.list()).toHaveLength(30);
  });

  test('every template has required fields', () => {
    for (const t of registry.list()) {
      expect(typeof t.id).toBe('string');
      expect(t.id.length).toBeGreaterThan(0);
      expect(typeof t.name).toBe('string');
      expect(typeof t.category).toBe('string');
      expect(typeof t.description).toBe('string');
      expect(typeof t.atsCompatible).toBe('boolean');
      expect(typeof t.premium).toBe('boolean');
      expect(Array.isArray(t.supportedSections)).toBe(true);
    }
  });

  test('ids are unique', () => {
    const ids = registry.list().map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('isValidTemplateId returns true for each', () => {
    for (const t of registry.list()) {
      expect(registry.isValidTemplateId(t.id)).toBe(true);
    }
  });

  test('isValidTemplateId returns false for unknown', () => {
    expect(registry.isValidTemplateId('not-a-template')).toBe(false);
    expect(registry.isValidTemplateId('')).toBe(false);
    expect(registry.isValidTemplateId(null)).toBe(false);
  });

  test('get returns a template by id', () => {
    expect(registry.get('ats-plain').id).toBe('ats-plain');
    expect(registry.get('modern-professional').name).toBe('Modern Professional');
  });

  test('get returns null for unknown id', () => {
    expect(registry.get('nope')).toBeNull();
  });
});