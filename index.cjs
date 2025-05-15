const express = require('express');
const { GoogleAuth } = require('google-auth-library');
const fetch = require('node-fetch'); // ✅ native-style fetch
require('dotenv').config();

const app = express();
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

// ✅ POST to Firestore using fetch
app.post('/firestore/:collection/:docId', async (req, res) => {
  try {
    const { collection, docId } = req.params;
    if (!req.body?.fields) {
      return res.status(400).json({ error: 'Missing or malformed fields in request body' });
    }

    const token = await getAccessToken();

    // 🔧 Construct full Firestore document
    const firestoreDoc = {
      name: `projects/will-s-storage/databases/(default)/documents/${collection}/${docId}`,
      fields: req.body.fields,
    };

    const url = `https://firestore.googleapis.com/v1/projects/will-s-storage/databases/(default)/documents/${collection}/${docId}`;

    const rawBody = JSON.stringify(firestoreDoc, null, 2);
    console.log('📦 Final body to Firestore:\n', rawBody);

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: rawBody,
    });

    const responseBody = await response.text();

    if (!response.ok) {
      console.error('❌ Firestore error response:', responseBody);
      return res.status(response.status).json({ error: responseBody });
    }

    console.log('✅ Firestore success:', responseBody);
    res.status(200).send(responseBody);
  } catch (err) {
    console.error('❌ Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ✅ GET from Firestore (still using Axios-style fetch)
app.get('/firestore/:collection/:docId', async (req, res) => {
  try {
    const { collection, docId } = req.params;
    const token = await getAccessToken();

    const url = `https://firestore.googleapis.com/v1/projects/will-s-storage/databases/(default)/documents/${collection}/${docId}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const responseBody = await response.text();

    if (!response.ok) {
      console.error('❌ Firestore GET error:', responseBody);
      return res.status(response.status).json({ error: responseBody });
    }

    res.status(200).send(responseBody);
  } catch (err) {
    console.error('❌ GET /firestore error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/', (req, res) => {
  res.send('✅ Firebase proxy with fetch is running.');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
