const express = require('express');
const multer = require('multer');
const fetch = require('node-fetch');   // keep using node-fetch v2 (or adjust for native fetch)
require('dotenv').config();
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const app = express();

app.use(express.static('.'));
app.use('/photos', express.static('photos'));

// Ensure photos folder exists
const photosDir = path.join(__dirname, 'photos');
if (!fs.existsSync(photosDir)) {
  fs.mkdirSync(photosDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: photosDir,
  filename: (req, file, cb) => {
    const now = new Date();
    const timestamp = now.toISOString().slice(0,19).replace(/[:T]/g, '-');
    cb(null, `${timestamp}.jpg`);
  }
});
const upload = multer({ storage });

// === 原本上傳 ===
app.post('/upload', upload.single('photo'), async (req, res) => {
  try {
    // Validate upload
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    // Read API key from environment (set in .env or environment)
    const API_KEY = process.env.X_API_KEY || process.env['x-api-key'] || process.env.API_KEY;
    if (!API_KEY) {
      return res.status(500).json({ error: 'Server misconfigured: API key missing' });
    }

    // Forward the file to the Azure OCR API
    const form = new FormData();
    form.append('receipt', fs.createReadStream(req.file.path));

    const ocrRes = await fetch('https://receipts-detect-ea-dnbxeze5egcyh6fp.eastasia-01.azurewebsites.net/v1/receipts/extract', {
      method: 'POST',
      headers: {
        'x-api-key': API_KEY,
        'Accept': 'application/json',
        ...form.getHeaders()
      },
      body: form
    });

    if (!ocrRes.ok) {
      const body = await ocrRes.text();
      return res.status(502).json({ error: 'Upstream OCR service error', status: ocrRes.status, body });
    }

    const json = await ocrRes.json();

    // Return OCR result to client
    res.json(json);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 3003;
const server = app.listen(PORT, () => console.log(`已啟動 OCR 手機打 http://你電腦IP:${PORT}`));

server.on('error', (err) => {
  if (err && err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} already in use. Stop the process using it or set a different PORT.`);
    process.exit(1);
  }
  console.error(err);
});