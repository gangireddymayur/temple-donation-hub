const router = require('express').Router();
const db = require('../lib/db');
const { v4: uuid } = require('uuid');
const https = require('https');

// Helper to call Razorpay API using native Node.js https
function callRazorpay(method, path, body, keyId, keySecret) {
  return new Promise((resolve, reject) => {
    const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
    const data = JSON.stringify(body);
    
    const req = https.request(
      {
        hostname: 'api.razorpay.com',
        port: 443,
        path: `/v1${path}`,
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
          'Authorization': `Basic ${auth}`
        }
      },
      (res) => {
        let responseBody = '';
        res.on('data', (chunk) => { responseBody += chunk; });
        res.on('end', () => {
          try {
            const json = JSON.parse(responseBody);
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve(json);
            } else {
              reject(new Error(json?.error?.description || `Razorpay API error: ${res.statusCode}`));
            }
          } catch (e) {
            reject(new Error(`Failed to parse Razorpay response: ${responseBody}`));
          }
        });
      }
    );
    req.on('error', (err) => reject(err));
    req.write(data);
    req.end();
  });
}

// ---------------- PUBLIC API ENDPOINTS ----------------

// Initiate a donation and generate payment string/order
router.post('/public/initiate', async (req, res) => {
  try {
    const {
      deviceId,
      companyId,
      amount,
      purpose,
      donorName,
      donorPhone,
      donorEmail,
      donorAddress,
      donorCity,
      donorState,
      donorPincode,
      donorGotra,
      donorNakshatra,
      specialPrayer,
      kioskName
    } = req.body;
    
    let resolvedCompanyId = companyId;
    let resolvedKioskName = kioskName;
    const db = require('../lib/db');

    if (deviceId) {
      const [devices] = await db.query(
        'SELECT name, company_id FROM devices WHERE id = :id LIMIT 1',
        { id: deviceId }
      );
      const device = devices[0];
      if (device) {
        if (!resolvedCompanyId) resolvedCompanyId = device.company_id;
        if (!resolvedKioskName) resolvedKioskName = device.name;
      }
    }

    if (!resolvedCompanyId) {
      return res.status(400).json({ error: 'Company ID or Device ID is required' });
    }

    const [companies] = await db.query(
      'SELECT name, upi_id, razorpay_key_id, razorpay_key_secret, preferred_gateway FROM companies WHERE id = :id LIMIT 1',
      { id: resolvedCompanyId }
    );
    const company = companies[0];
    if (!company) {
      return res.status(404).json({ error: 'Temple company not found' });
    }

    const donationId = uuid();
    const finalAmount = Number(amount);
    
    if (Number.isNaN(finalAmount) || finalAmount <= 0) {
      return res.status(400).json({ error: 'Invalid donation amount' });
    }

    await db.query(
      `INSERT INTO donations (
        id, company_id, device_id, donor_name, donor_phone, donor_email,
        donor_address, donor_city, donor_state, donor_pincode, donor_gotra, donor_nakshatra,
        special_prayer, kiosk_name, amount, purpose, payment_status
      ) VALUES (
        :id, :company_id, :device_id, :donor_name, :donor_phone, :donor_email,
        :donor_address, :donor_city, :donor_state, :donor_pincode, :donor_gotra, :donor_nakshatra,
        :special_prayer, :kiosk_name, :amount, :purpose, 'pending'
      )`,
      {
        id: donationId,
        company_id: resolvedCompanyId,
        device_id: deviceId || null,
        donor_name: donorName || 'Devotee',
        donor_phone: donorPhone || null,
        donor_email: donorEmail || null,
        donor_address: donorAddress || null,
        donor_city: donorCity || null,
        donor_state: donorState || null,
        donor_pincode: donorPincode || null,
        donor_gotra: donorGotra || null,
        donor_nakshatra: donorNakshatra || null,
        special_prayer: specialPrayer || null,
        kiosk_name: resolvedKioskName || 'Kiosk Player',
        amount: finalAmount,
        purpose: purpose || 'General Daan'
      }
    );

    // 1. Check if Razorpay is selected as preferred gateway and keys are configured
    if (company.preferred_gateway === 'razorpay' && company.razorpay_key_id && company.razorpay_key_secret) {
      try {
        const order = await callRazorpay(
          'POST',
          '/orders',
          {
            amount: Math.round(finalAmount * 100), // in paise
            currency: 'INR',
            receipt: donationId,
            notes: { donationId }
          },
          company.razorpay_key_id,
          company.razorpay_key_secret
        );

        await db.query(
          'UPDATE donations SET razorpay_order_id = :order_id WHERE id = :id',
          { order_id: order.id, id: donationId }
        );

        return res.json({
          donationId,
          amount: finalAmount,
          purpose: purpose || 'General Daan',
          orderId: order.id,
          upiString: null,
          useRazorpay: true,
          razorpayKeyId: company.razorpay_key_id
        });
      } catch (err) {
        console.error('Razorpay order creation failed:', err.message);
        // Fallback to UPI if keys failed but UPI is present
      }
    }

    // 2. Fallback or use direct UPI ID if set
    if (company.upi_id) {
      const upiString = `upi://pay?pa=${company.upi_id}&pn=${encodeURIComponent(company.name)}&am=${finalAmount}&tr=${donationId}&cu=INR&tn=${encodeURIComponent(purpose || 'General Daan')}`;
      return res.json({
        donationId,
        amount: finalAmount,
        purpose: purpose || 'General Daan',
        orderId: null,
        upiString,
        useRazorpay: false
      });
    }

    return res.status(400).json({ error: 'No active payment gateways configured for this temple' });
  } catch (err) {
    console.error('INITIATE_DONATION_ERROR:', err);
    res.status(500).json({ error: err.message || 'Failed to initiate donation' });
  }
});

// Check donation status (used by player overlay)
router.get('/public/status/:id', async (req, res) => {
  try {
    const [donations] = await db.query(
      'SELECT payment_status FROM donations WHERE id = :id LIMIT 1',
      { id: req.params.id }
    );
    if (!donations[0]) return res.status(404).json({ error: 'Donation not found' });
    res.json({ id: req.params.id, status: donations[0].payment_status });
  } catch (err) {
    console.error('DONATION_STATUS_ERROR:', err);
    res.status(500).json({ error: err.message || 'Failed to check status' });
  }
});

// Razorpay Webhook receiver
router.post('/public/razorpay-webhook', async (req, res) => {
  try {
    const payload = req.body;
    const event = payload.event;
    
    // We are interested in payment.captured or order.paid events
    if (event === 'payment.captured' || event === 'order.paid') {
      const paymentEntity = payload.payload.payment?.entity;
      const orderId = paymentEntity?.order_id;
      const paymentId = paymentEntity?.id;

      if (orderId && paymentId) {
        // Fetch the donation using orderId
        const [donations] = await db.query(
          'SELECT * FROM donations WHERE razorpay_order_id = :order_id LIMIT 1',
          { order_id: orderId }
        );
        const donation = donations[0];

        if (donation && donation.payment_status === 'pending') {
          // Fetch company keys to double-check verify payment status directly with Razorpay
          const [companies] = await db.query(
            'SELECT razorpay_key_id, razorpay_key_secret FROM companies WHERE id = :id LIMIT 1',
            { id: donation.company_id }
          );
          const company = companies[0];

          if (company && company.razorpay_key_id && company.razorpay_key_secret) {
            try {
              // Retrieve payment status directly from Razorpay
              const payment = await callRazorpay(
                'GET',
                `/payments/${paymentId}`,
                {},
                company.razorpay_key_id,
                company.razorpay_key_secret
              );

              if (payment && (payment.status === 'captured' || payment.status === 'confirmed')) {
                // Verify amount (Razorpay works in paise)
                const expectedPaise = Math.round(Number(donation.amount) * 100);
                if (payment.amount >= expectedPaise) {
                  await db.query(
                    'UPDATE donations SET payment_status = \'success\', razorpay_payment_id = :payment_id WHERE id = :id',
                    { payment_id: paymentId, id: donation.id }
                  );
                  console.log(`[payment] Donation ${donation.id} marked success via verified Razorpay API fetch.`);
                }
              }
            } catch (err) {
              console.error('Direct verification with Razorpay API failed:', err.message);
            }
          }
        }
      }
    }
    
    // Always return 200 OK to Razorpay
    res.json({ status: 'ok' });
  } catch (err) {
    console.error('RAZORPAY_WEBHOOK_ERROR:', err);
    res.status(200).json({ error: err.message }); // webhook receiver should not error out status
  }
});

// Admin-triggered simulation endpoint (helpful for local/testing without actual payment)
router.post('/public/simulate-success', async (req, res) => {
  try {
    const { donationId } = req.body;
    const db = require('../lib/db');
    await db.query(
      'UPDATE donations SET payment_status = \'success\' WHERE id = :id',
      { id: donationId }
    );
    res.json({ ok: true, status: 'success' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Test connection endpoint to generate a test QR code for ₹1 using typed credentials
router.post('/public/test-connection', async (req, res) => {
  try {
    const { companyId, upiId, razorpayKeyId, razorpayKeySecret } = req.body;
    const db = require('../lib/db');
    
    const donationId = `test-${Date.now()}`;
    const amount = 1.00;
    const purpose = "Connection Test (₹1)";
    
    // Insert pending test donation row
    await db.query(
      `INSERT INTO donations (
        id, company_id, donor_name, donor_phone, amount, purpose, payment_status, kiosk_name
      ) VALUES (
        :id, :company_id, 'Test Admin', '9999999999', :amount, :purpose, 'pending', 'Admin Settings Panel'
      )`,
      {
        id: donationId,
        company_id: companyId || '00000000-0000-0000-0000-000000000000',
        amount,
        purpose
      }
    );

    // If Razorpay credentials are typed, use them to verify integration
    if (razorpayKeyId && razorpayKeySecret) {
      try {
        const order = await callRazorpay(
          'POST',
          '/orders',
          {
            amount: 100, // 100 paise = 1 INR
            currency: 'INR',
            receipt: donationId,
            notes: { donationId }
          },
          razorpayKeyId,
          razorpayKeySecret
        );

        await db.query(
          'UPDATE donations SET razorpay_order_id = :order_id WHERE id = :id',
          { order_id: order.id, id: donationId }
        );

        return res.json({
          donationId,
          amount,
          orderId: order.id,
          upiString: null,
          useRazorpay: true,
          razorpayKeyId
        });
      } catch (err) {
        return res.status(400).json({ error: `Razorpay Order Error: ${err.message}` });
      }
    }

    // Otherwise fallback to direct UPI if provided
    if (upiId) {
      const upiString = `upi://pay?pa=${upiId}&pn=Test%20Merchant&am=1.00&tr=${donationId}&cu=INR&tn=${encodeURIComponent(purpose)}`;
      return res.json({
        donationId,
        amount,
        orderId: null,
        upiString,
        useRazorpay: false
      });
    }

    return res.status(400).json({ error: 'Please configure at least a Merchant UPI ID or Razorpay keys to test' });
  } catch (err) {
    console.error('TEST_CONNECTION_ERROR:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
