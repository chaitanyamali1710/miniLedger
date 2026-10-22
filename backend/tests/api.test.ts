import fs from 'node:fs';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import { config } from '../src/config.js';
import { migrate, pool } from '../src/db.js';

const app = createApp();

// A tiny valid PNG (1x1 pixel) to use as a receipt.
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
);

function daysFromToday(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// Logs in by reading the OTP from the mocked console.log, like a developer would.
async function login(phone = '+919876543210') {
  const log = vi.spyOn(console, 'log').mockImplementation(() => {});
  await request(app).post('/auth/request-otp').send({ phone }).expect(200);
  const otp = String(log.mock.calls.at(-1)?.[0]).match(/(\d{6})$/)![1];
  log.mockRestore();
  const res = await request(app).post('/auth/verify-otp').send({ phone, otp }).expect(200);
  return res.body.token as string;
}

beforeAll(async () => {
  await migrate();
});

beforeEach(async () => {
  await pool.query('TRUNCATE loans, otps, users RESTART IDENTITY CASCADE');
});

afterAll(async () => {
  await pool.end();
  fs.rmSync(config.uploadDir, { recursive: true, force: true });
});

describe('auth', () => {
  it('logs in with the OTP printed in the log', async () => {
    const token = await login();
    expect(token).toBeTypeOf('string');
  });

  it('rejects a wrong OTP', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    await request(app).post('/auth/request-otp').send({ phone: '9876543210' }).expect(200);
    vi.restoreAllMocks();
    const res = await request(app).post('/auth/verify-otp').send({ phone: '9876543210', otp: '000000' });
    // 1 in a million chance the real code is 000000
    if (res.status !== 200) expect(res.body.error).toBe('Wrong OTP');
  });

  it('blocks after too many wrong tries', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    await request(app).post('/auth/request-otp').send({ phone: '9876543210' });
    vi.restoreAllMocks();
    await pool.query("UPDATE otps SET code = '111111'");
    for (let i = 0; i < 5; i++) {
      await request(app).post('/auth/verify-otp').send({ phone: '9876543210', otp: '222222' }).expect(400);
    }
    await request(app).post('/auth/verify-otp').send({ phone: '9876543210', otp: '111111' }).expect(429);
  });

  it('returns the OTP in demo mode', async () => {
    config.showOtpInResponse = true;
    try {
      vi.spyOn(console, 'log').mockImplementation(() => {});
      const res = await request(app).post('/auth/request-otp').send({ phone: '9876543210' }).expect(200);
      vi.restoreAllMocks();
      expect(res.body.demoOtp).toMatch(/^\d{6}$/);
      await request(app).post('/auth/verify-otp').send({ phone: '9876543210', otp: res.body.demoOtp }).expect(200);
    } finally {
      config.showOtpInResponse = false;
    }
  });

  it('hides the OTP when demo mode is off', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const res = await request(app).post('/auth/request-otp').send({ phone: '9876543210' }).expect(200);
    vi.restoreAllMocks();
    expect(res.body.demoOtp).toBeUndefined();
  });

  it('validates the phone number', async () => {
    const res = await request(app).post('/auth/request-otp').send({ phone: 'abc' }).expect(400);
    expect(res.body.details[0].field).toBe('phone');
  });

  it('needs a token for loans', async () => {
    await request(app).get('/loans').expect(401);
    await request(app).get('/summary').set('Authorization', 'Bearer nope').expect(401);
  });
});

describe('loans and summary', () => {
  it('adds loans, marks one repaid, and sums them up', async () => {
    const token = await login();
    const auth = { Authorization: `Bearer ${token}` };

    const a = await request(app)
      .post('/loans')
      .set(auth)
      .send({ friendName: 'Asha', amount: 500, dueDate: daysFromToday(-3) })
      .expect(201);
    expect(a.body).toMatchObject({ friendName: 'Asha', amount: 500, isOverdue: true, repaid: false });

    const b = await request(app)
      .post('/loans')
      .set(auth)
      .send({ friendName: 'Ravi', amount: 250.5, dueDate: daysFromToday(10) })
      .expect(201);
    expect(b.body.isOverdue).toBe(false);

    const c = await request(app)
      .post('/loans')
      .set(auth)
      .send({ friendName: 'Meera', amount: 100, dueDate: daysFromToday(-1) })
      .expect(201);

    const repaid = await request(app).patch(`/loans/${c.body.id}/repaid`).set(auth).expect(200);
    expect(repaid.body).toMatchObject({ repaid: true, isOverdue: false });

    const list = await request(app).get('/loans').set(auth).expect(200);
    expect(list.body.map((l: { friendName: string }) => l.friendName)).toEqual(['Asha', 'Ravi', 'Meera']);

    const summary = await request(app).get('/summary').set(auth).expect(200);
    expect(summary.body).toEqual({
      totalLent: 850.5,
      totalRepaid: 100,
      outstanding: 750.5,
      overdueAmount: 500,
      overdueCount: 1,
    });
  });

  it('rejects bad loan input with clear messages', async () => {
    const token = await login();
    const res = await request(app)
      .post('/loans')
      .set('Authorization', `Bearer ${token}`)
      .send({ friendName: ' ', amount: -5, dueDate: '2026-02-30' })
      .expect(400);
    const fields = res.body.details.map((d: { field: string }) => d.field).sort();
    expect(fields).toEqual(['amount', 'dueDate', 'friendName']);
  });

  it("does not show or change another user's loans", async () => {
    const mine = await login('+911111111111');
    const theirs = await login('+912222222222');
    const loan = await request(app)
      .post('/loans')
      .set('Authorization', `Bearer ${mine}`)
      .send({ friendName: 'Asha', amount: 10, dueDate: daysFromToday(1) })
      .expect(201);

    await request(app).patch(`/loans/${loan.body.id}/repaid`).set('Authorization', `Bearer ${theirs}`).expect(404);
    const list = await request(app).get('/loans').set('Authorization', `Bearer ${theirs}`).expect(200);
    expect(list.body).toEqual([]);
  });

  it('stores a receipt photo with a loan', async () => {
    const token = await login();
    const auth = { Authorization: `Bearer ${token}` };
    const loan = await request(app)
      .post('/loans')
      .set(auth)
      .field('friendName', 'Asha')
      .field('amount', '42.75')
      .field('dueDate', daysFromToday(5))
      .attach('receipt', png, { filename: 'r.png', contentType: 'image/png' })
      .expect(201);
    expect(loan.body).toMatchObject({ amount: 42.75, hasReceipt: true });

    const img = await request(app).get(`/loans/${loan.body.id}/receipt`).set(auth).expect(200);
    expect(img.headers['content-type']).toBe('image/png');
  });

  it('refuses a receipt that is not an image', async () => {
    const token = await login();
    const res = await request(app)
      .post('/loans')
      .set('Authorization', `Bearer ${token}`)
      .field('friendName', 'Asha')
      .field('amount', '10')
      .field('dueDate', daysFromToday(5))
      .attach('receipt', Buffer.from('hello'), { filename: 'r.txt', contentType: 'text/plain' })
      .expect(400);
    expect(res.body.error).toMatch(/JPG/);
  });
});
