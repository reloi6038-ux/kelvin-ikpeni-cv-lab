'use strict';

const request = require('supertest');
const { hasMongo } = require('./helpers');

const describeIf = hasMongo() ? describe : describe.skip;

describeIf('GET /api/templates', () => {
  let app;
  let db;

  beforeAll(async () => {
    db = require('../../config/db');
    await db.connect(3, 1000);
    app = require('../../server').app;
  });

  afterAll(async () => {
    await db.disconnect();
  });

  test('lists 30 templates', async () => {
    const res = await request(app).get('/api/templates');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.templates)).toBe(true);
    expect(res.body.templates).toHaveLength(30);
  });

  test('each template has required metadata', async () => {
    const res = await request(app).get('/api/templates');
    for (const t of res.body.templates) {
      expect(typeof t.id).toBe('string');
      expect(typeof t.name).toBe('string');
      expect(typeof t.category).toBe('string');
      expect(typeof t.atsCompatible).toBe('boolean');
      expect(typeof t.premium).toBe('boolean');
    }
  });

  test('returns single template by id', async () => {
    const res = await request(app).get('/api/templates/ats-plain');
    expect(res.status).toBe(200);
    expect(res.body.template.id).toBe('ats-plain');
  });

  test('404 for unknown template id', async () => {
    const res = await request(app).get('/api/templates/nonexistent');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});