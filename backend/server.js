'use strict';

/**
 * BackendEngineer.com — Payment Server
 * Handles Razorpay (UPI, Cards, NetBanking, Wallets) and PayPal payments
 */

require('dotenv').config();
const fs       = require('fs');
const path     = require('path');
const express  = require('express');
const cors     = require('cors');
const crypto   = require('crypto');
const axios    = require('axios');
const Razorpay = require('razorpay');

const app  = express();
const PORT = process.env.PORT || 3000;

// Enable CORS & JSON parsing
app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json());

// Initialize Razorpay (Dummy test fallback if env vars missing)
const rzpKeyId     = process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder';
const rzpKeySecret = process.env.RAZORPAY_KEY_SECRET || 'placeholder_secret';

const razorpay = new Razorpay({
  key_id: rzpKeyId,
  key_secret: rzpKeySecret,
});

// PayPal Config
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || '';
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || '';
const PAYPAL_MODE = process.env.PAYPAL_MODE || 'sandbox';
const PAYPAL_BASE_URL = PAYPAL_MODE === 'live' 
  ? 'https://api-m.paypal.com' 
  : 'https://api-m.sandbox.paypal.com';

/**
 * Helper to get PayPal Access Token
 */
async function getPayPalAccessToken() {
  if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
    throw new Error('PayPal credentials not configured');
  }
  const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64');
  const response = await axios({
    url: `${PAYPAL_BASE_URL}/v1/oauth2/token`,
    method: 'post',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${auth}`
    },
    data: 'grant_type=client_credentials'
  });
  return response.data.access_token;
}

// Fallback jobs list if jobs.json is not found
const FALLBACK_JOBS = [
  {
    id: 1, featured: true,
    title: 'Senior .NET Core / C# Backend Architect',
    company: 'Microsoft', logo: 'https://logo.clearbit.com/microsoft.com',
    location: '🌍 Remote (US/EU)', salary: '$170k – $240k',
    tags: ['.NET 8','C#','Azure','SQL Server'], filter: ['dotnet','db','devops'], age: '2h ago',
    url: 'https://careers.microsoft.com'
  },
  {
    id: 2, featured: true,
    title: 'Senior Backend Engineer – API Platform',
    company: 'Stripe', logo: 'https://logo.clearbit.com/stripe.com',
    location: '🌍 Remote (Global)', salary: '$160k – $220k',
    tags: ['Go','PostgreSQL','gRPC','Kafka'], filter: ['go','db'], age: '3h ago',
    url: 'https://stripe.com/jobs'
  },
  {
    id: 3, featured: false,
    title: 'Senior Node.js Backend Engineer',
    company: 'Vercel', logo: 'https://logo.clearbit.com/vercel.com',
    location: '🌍 Remote (Worldwide)', salary: '$140k – $190k',
    tags: ['Node.js','TypeScript','PostgreSQL','Redis'], filter: ['node','db'], age: '4h ago',
    url: 'https://vercel.com/careers'
  }
];

// ── JOBS ENDPOINT ──
app.get('/api/jobs', (req, res) => {
  const jobsFile = path.join(__dirname, 'jobs.json');
  if (fs.existsSync(jobsFile)) {
    try {
      const data = JSON.parse(fs.readFileSync(jobsFile, 'utf8'));
      if (Array.isArray(data) && data.length > 0) {
        return res.json(data);
      }
    } catch (e) {
      console.error('Error reading jobs.json:', e);
    }
  }
  res.json(FALLBACK_JOBS);
});

app.post('/api/scrape', async (req, res) => {
  try {
    const { scrapeBackendJobs } = require('./scraper');
    const jobs = await scrapeBackendJobs();
    res.json({ success: true, count: jobs.length, jobs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── HEALTH CHECK ──
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    razorpayConfigured: rzpKeyId !== 'rzp_test_placeholder',
    paypalConfigured: Boolean(PAYPAL_CLIENT_ID)
  });
});

// ── RAZORPAY ENDPOINTS ──

/**
 * Create Razorpay Order
 * Amount in INR (converted to Paise: 1 INR = 100 Paise)
 */
app.post('/api/razorpay/create-order', async (req, res) => {
  try {
    const { amount, plan, currency = 'INR' } = req.body || {};
    const parsedAmount = Number(amount);
    
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    // If API keys are defaults, return simulated order response for frontend test mode
    if (rzpKeyId === 'rzp_test_placeholder') {
      return res.json({
        id: 'order_test_' + Date.now(),
        amount: Math.round(parsedAmount * 100),
        currency,
        receipt: `receipt_${Date.now()}`,
        isTestDemo: true,
        key_id: rzpKeyId
      });
    }

    const options = {
      amount: Math.round(parsedAmount * 100), // convert to paise
      currency,
      receipt: `receipt_${Date.now()}`,
      notes: { plan: plan || 'pro' }
    };

    const order = await razorpay.orders.create(options);
    res.json({
      ...order,
      key_id: rzpKeyId
    });

  } catch (error) {
    console.error('Razorpay Create Order Error:', error);
    res.status(500).json({ error: error.message || 'Failed to create Razorpay order' });
  }
});

/**
 * Verify Razorpay Signature
 */
app.post('/api/razorpay/verify-payment', (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, error: 'Missing signature verification parameters' });
    }

    // Demo bypass for placeholder test mode
    if (typeof razorpay_order_id === 'string' && razorpay_order_id.startsWith('order_test_')) {
      return res.json({ success: true, isTestDemo: true });
    }

    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', rzpKeySecret)
      .update(body)
      .digest('hex');

    const expectedBuf = Buffer.from(expectedSignature, 'utf8');
    const signatureBuf = Buffer.from(String(razorpay_signature), 'utf8');
    const isValid = expectedBuf.length === signatureBuf.length && crypto.timingSafeEqual(expectedBuf, signatureBuf);

    if (isValid) {
      res.json({ success: true });
    } else {
      res.status(400).json({ success: false, error: 'Invalid signature' });
    }
  } catch (error) {
    console.error('Razorpay Verify Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── PAYPAL ENDPOINTS ──

/**
 * Create PayPal Order
 */
app.post('/api/paypal/create-order', async (req, res) => {
  try {
    const { amount, plan, currency = 'USD' } = req.body || {};
    const parsedAmount = Number(amount);

    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    if (!PAYPAL_CLIENT_ID) {
      return res.json({
        id: 'PAYPAL-TEST-ORDER-' + Date.now(),
        status: 'CREATED',
        isTestDemo: true
      });
    }

    const accessToken = await getPayPalAccessToken();
    const response = await axios({
      url: `${PAYPAL_BASE_URL}/v2/checkout/orders`,
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      data: {
        intent: 'CAPTURE',
        purchase_units: [{
          reference_id: `plan_${plan}_${Date.now()}`,
          description: `BackendEngineer ${plan ? plan.toUpperCase() : 'PRO'} Subscription`,
          amount: {
            currency_code: currency,
            value: parsedAmount.toFixed(2)
          }
        }]
      }
    });

    res.json(response.data);
  } catch (error) {
    console.error('PayPal Create Order Error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to create PayPal order' });
  }
});

/**
 * Capture PayPal Order
 */
app.post('/api/paypal/capture-order', async (req, res) => {
  try {
    const { orderID } = req.body || {};

    if (!orderID) {
      return res.status(400).json({ success: false, error: 'Missing orderID' });
    }

    if (orderID.startsWith('PAYPAL-TEST-ORDER-')) {
      return res.json({ success: true, isTestDemo: true, status: 'COMPLETED' });
    }

    const accessToken = await getPayPalAccessToken();
    const response = await axios({
      url: `${PAYPAL_BASE_URL}/v2/checkout/orders/${orderID}/capture`,
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      }
    });

    res.json({ success: true, details: response.data });
  } catch (error) {
    console.error('PayPal Capture Error:', error.response?.data || error.message);
    res.status(500).json({ success: false, error: 'Failed to capture PayPal order' });
  }
});

// Start Server conditionally (only when executed directly, not imported in tests or serverless)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n=================================================`);
    console.log(`🚀 BackendEngineer Payment Server running on port ${PORT}`);
    console.log(`📍 Health Check: http://localhost:${PORT}/api/health`);
    console.log(`=================================================\n`);
  });
}

module.exports = app;

