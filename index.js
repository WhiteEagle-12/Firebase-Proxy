const express = require('express');
const { GoogleAuth } = require('google-auth-library');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(express.json());

async function getAccessToken() {
  const auth = new GoogleAuth({
    credentials: JSON.parse(process.env.SERVICE_ACCOUNT_JSON),
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  });

  const client = await auth.getClient();
  const token = await client.getAccessToken();
  return token.token;
}

// Example route: Write Firestore document
app.post('/firestore/:collection/:docId', async (req, res) => {
  try {
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
    console.error(err.response?.data || err.message);
    res.status(err.response?.status || 500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Firebase proxy running on port ${PORT}`);
});
