const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// 1. Get Token Route - to test if keys work
app.get('/token', async (req, res) => {
  try {
    const auth = Buffer.from(`${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`).toString('base64');
    const resp = await axios.get('https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials', {
      headers: { Authorization: `Basic ${auth}` }
    });
    res.json(resp.data);
  } catch (e) {
    res.status(500).json({ error: e.response?.data || e.message });
  }
});

// 2. STK Push Route
app.post('/stk', async (req, res) => {
  try {
    const { phone, amount } = req.body;
    // get token
    const auth = Buffer.from(`${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`).toString('base64');
    const tokenResp = await axios.get('https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials', {
      headers: { Authorization: `Basic ${auth}` }
    });
    const token = tokenResp.data.access_token;

    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0,14);
    const password = Buffer.from(`${process.env.MPESA_SHORTCODE}${process.env.MPESA_PASSKEY}${timestamp}`).toString('base64');

    const stkResp = await axios.post('https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest', {
      BusinessShortCode: process.env.MPESA_SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: amount || 1,
      PartyA: phone,
      PartyB: process.env.MPESA_SHORTCODE,
      PhoneNumber: phone,
      CallBackURL: process.env.MPESA_CALLBACK_URL,
      AccountReference: "Test",
      TransactionDesc: "Test"
    }, { headers: { Authorization: `Bearer ${token}` } });

    res.json(stkResp.data);
  } catch (e) {
    res.status(500).json({ error: e.response?.data || e.message });
  }
});

// 3. Callback
app.post('/api/callback', (req, res) => {
  console.log('CALLBACK:', JSON.stringify(req.body, null, 2));
  res.json({ ResultCode: 0, ResultDesc: "Accepted" });
});

app.get('/', (req, res) => res.send('MPESA backend running. Use /token and /stk'));

app.listen(PORT, () => console.log(`Running on ${PORT}`));
