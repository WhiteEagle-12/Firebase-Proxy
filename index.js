const express = require('express');
const { GoogleAuth } = require('google-auth-library');
const axios = require('axios');
require('dotenv').config();

const app = express();

// ✅ Required middleware to parse incoming JSON
app.use(express.json());

async function getAccessToken() {
  const credentials = JSON.parse(process.env.SERVICE_ACCOUNT_JSON);
  const auth = new GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  });

  const client = await auth.getClient();
  const token = await client.getAccessToken();
  return token.token;
}

// ✅ Write to Firestore (with debug logging)
app.post('/firestore/:collection/:docId', async (req, res) => {
  try {
    console.log('🔥 Incoming request body:', JSON.stringify(req.body, null, 2));

    if (!req.body || !req.body.fields) {
      return res.status(400).json({ error: 'Missing or malformed fields in request body' });
    }

    const token = await getAccessToken();
    const { collection, docId } = req.params;

    const result = await axios.patch(
      `https://firestore.googleapis.com/v1/projects/will-s-storage/databases/(default)/documents/${collection}/${docId}`,
      req.body,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    res.json(result.data);
  } catch (err) {
    console.error('❌ Error in POST /firestore:', err.response?.data || err.message);
    res.status(err.response?.status || 500).json({ error: err.message });
  }
});

// ✅ Read from Firestore
app.get('/firestore/:collection/:docId', async (req, res) => {
  try {
    const token = await getAccessToken();
    const { collection, docId } = req.params;

    const result = await axios.get(
      `https://firestore.googleapis.com/v1/projects/will-s-storage/databases/(default)/documents/${collection}/${docId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    res.json(result.data);
  } catch (err) {
    console.error('❌ Error in GET /firestore:', err.response?.data || err.message);
    res.status(err.response?.status || 500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🔥 Firebase proxy running on port ${PORT}`);
});
