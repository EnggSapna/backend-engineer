'use strict';

const request = require('supertest');
const crypto  = require('crypto');
const app     = require('../server');

describe('BackendEngineer API Test Suite', () => {

  // ── 1. HEALTH CHECK ──
  describe('GET /api/health', () => {
    it('should return 200 OK and configuration status', async () => {
      const res = await request(app).get('/api/health');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('status', 'ok');
      expect(res.body).toHaveProperty('timestamp');
      expect(res.body).toHaveProperty('razorpayConfigured');
      expect(res.body).toHaveProperty('paypalConfigured');
      expect(typeof res.body.razorpayConfigured).toBe('boolean');
      expect(typeof res.body.paypalConfigured).toBe('boolean');
    });
  });

  // ── 2. JOBS ENDPOINT ──
  describe('GET /api/jobs', () => {
    it('should return a list of backend jobs with correct schema', async () => {
      const res = await request(app).get('/api/jobs');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);

      const job = res.body[0];
      expect(job).toHaveProperty('id');
      expect(job).toHaveProperty('title');
      expect(job).toHaveProperty('company');
      expect(job).toHaveProperty('salary');
      expect(job).toHaveProperty('tags');
      expect(job).toHaveProperty('filter');
      expect(Array.isArray(job.tags)).toBe(true);
      expect(Array.isArray(job.filter)).toBe(true);
    });
  });

  // ── 3. RAZORPAY CREATE ORDER ──
  describe('POST /api/razorpay/create-order', () => {
    it('should reject missing amount with status 400', async () => {
      const res = await request(app)
        .post('/api/razorpay/create-order')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error', 'Invalid amount');
    });

    it('should reject non-numeric or negative amount with status 400', async () => {
      const res1 = await request(app)
        .post('/api/razorpay/create-order')
        .send({ amount: -100 });
      expect(res1.status).toBe(400);

      const res2 = await request(app)
        .post('/api/razorpay/create-order')
        .send({ amount: 'abc' });
      expect(res2.status).toBe(400);

      const res3 = await request(app)
        .post('/api/razorpay/create-order')
        .send({ amount: 0 });
      expect(res3.status).toBe(400);
    });

    it('should return simulated test order when using placeholder credentials', async () => {
      const res = await request(app)
        .post('/api/razorpay/create-order')
        .send({ amount: 49, plan: 'pro', currency: 'INR' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('id');
      expect(res.body.id).toMatch(/^order_test_/);
      expect(res.body).toHaveProperty('amount', 4900); // 49 INR = 4900 paise
      expect(res.body).toHaveProperty('currency', 'INR');
      expect(res.body).toHaveProperty('isTestDemo', true);
    });
  });

  // ── 4. RAZORPAY VERIFY PAYMENT ──
  describe('POST /api/razorpay/verify-payment', () => {
    it('should reject missing verification parameters with status 400', async () => {
      const res = await request(app)
        .post('/api/razorpay/verify-payment')
        .send({ razorpay_order_id: 'order_123' });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body.error).toMatch(/Missing signature/i);
    });

    it('should pass test demo orders starting with order_test_', async () => {
      const res = await request(app)
        .post('/api/razorpay/verify-payment')
        .send({
          razorpay_order_id: 'order_test_1720000000',
          razorpay_payment_id: 'pay_test_1720000000',
          razorpay_signature: 'dummy_signature'
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('isTestDemo', true);
    });

    it('should reject tampered or invalid signature on live orders with 400', async () => {
      const res = await request(app)
        .post('/api/razorpay/verify-payment')
        .send({
          razorpay_order_id: 'order_real_12345678',
          razorpay_payment_id: 'pay_real_87654321',
          razorpay_signature: 'invalid_forged_signature_hex'
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body.error).toMatch(/Invalid signature/i);
    });

    it('should validate correctly signed HMAC-SHA256 payload', async () => {
      const secret = process.env.RAZORPAY_KEY_SECRET || 'placeholder_secret';
      const orderId = 'order_live_998877';
      const paymentId = 'pay_live_112233';
      const signature = crypto
        .createHmac('sha256', secret)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');

      const res = await request(app)
        .post('/api/razorpay/verify-payment')
        .send({
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: signature
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
    });
  });

  // ── 5. PAYPAL CREATE & CAPTURE ──
  describe('POST /api/paypal/create-order & /capture-order', () => {
    it('should reject invalid amount for PayPal order with status 400', async () => {
      const res = await request(app)
        .post('/api/paypal/create-order')
        .send({ amount: -10 });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error', 'Invalid amount');
    });

    it('should return simulated order when PayPal credentials are not configured', async () => {
      const res = await request(app)
        .post('/api/paypal/create-order')
        .send({ amount: 29, plan: 'starter' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('id');
      expect(res.body.id).toMatch(/^PAYPAL-TEST-ORDER-/);
      expect(res.body).toHaveProperty('isTestDemo', true);
      expect(res.body).toHaveProperty('status', 'CREATED');
    });

    it('should reject missing orderID on PayPal capture with status 400', async () => {
      const res = await request(app)
        .post('/api/paypal/capture-order')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body.error).toMatch(/Missing orderID/i);
    });

    it('should capture simulated test order successfully', async () => {
      const res = await request(app)
        .post('/api/paypal/capture-order')
        .send({ orderID: 'PAYPAL-TEST-ORDER-123456789' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('isTestDemo', true);
      expect(res.body).toHaveProperty('status', 'COMPLETED');
    });
  });

});
