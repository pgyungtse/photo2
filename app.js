console.log('DEBUG: API_KEY from .env =', process.env.API_KEY);

require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const fetch = require('node-fetch');   // npm install node-fetch@2
const FormData = require('form-data'); // npm install form-data

const app = express();

// 靜態檔案（index.html、照片）
app.use(express.static('.'));
app.use('/photos', express.static('photos'));

// 照片儲存設定（檔名：2025-11-19-12-34-56.jpg）
const storage = multer.diskStorage({
  destination: 'photos/',
  filename: (req, file, cb) => {
    const now = new Date();
    const date = now.toISOString().slice(0, 10);                // YYYY-MM-DD
    const time = now.toTimeString().slice(0, 8).replace(/:/g, '-'); // HH-MM-SS
    cb(null, `${date}-${time}.jpg`);
  }
});

const upload = multer({ storage });

// ==================== 上傳 + 轉發 OCR API ====================
app.post('/upload', upload.single('photo'), async (req, res) => {
  try {
    const form = new FormData();
    form.append('receipt', fs.createReadStream(req.file.path));

    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      return res.status(500).json({ code: 500, error: 'API_KEY not set in environment' });
    }

    // Merge form-data headers with custom headers
    const headers = Object.assign({
      'x-api-key': apiKey,
      'Accept': 'application/json'
    }, form.getHeaders());

    const ocrResponse = await fetch(
      'https://receipts-detect-ea-dnbxeze5egcyh6fp.eastasia-01.azurewebsites.net/v1/receipts/extract',
      {
        method: 'POST',
        headers,
        body: form
      }
    );

    const ocrJson = await ocrResponse.json();

    if (ocrResponse.ok) {
      // === 轉換成指定格式 (products as top-level array) ===
      // Support both shapes: { products: { products: [...] } } and { products: [...] }
      const srcProducts = Array.isArray(ocrJson.products)
        ? ocrJson.products
        : Array.isArray(ocrJson.products?.products)
        ? ocrJson.products.products
        : [];

      const products = srcProducts.map(p => ({
        product_name: p.product_name || p.name || '',
        quantity: typeof p.quantity === 'number' ? p.quantity : (p.qty || 0),
        unit_price: typeof p.unit_price === 'number' ? p.unit_price : (p.price || 0),
        product_company_name: p.product_company_name || p.manufacturer || null,
        valid_id: p.valid_id === undefined ? null : p.valid_id
      }));

      const mapped = {
        retail_outlet_name: ocrJson.retail_outlet_name || '',
        retail_outlet_address: ocrJson.retail_outlet_address || '',
        purchase_date: ocrJson.purchase_date || '',
        phone_number: ocrJson.phone_number || '',
        total_transaction_amount: ocrJson.total_transaction_amount || 0,
        products,
        barcode: ocrJson.barcode || '',
        invoice_number: ocrJson.invoice_number || '',
        server_timestamp: ocrJson.server_timestamp || '',
        request_id: ocrJson.request_id || ''
      };

      res.status(200).json(mapped);
    } else {
      // Log full error details for debugging
      console.error('OCR API error:', {
        status: ocrResponse.status,
        statusText: ocrResponse.statusText,
        body: ocrJson
      });
      res.status(ocrResponse.status).json({
        code: ocrResponse.status,
        error: 'OCR API error',
        statusText: ocrResponse.statusText,
        details: ocrJson
      });
    }
  } catch (err) {
    console.error('後端錯誤:', err.message);
    res.status(503).json({
      code: 503,
      error: '服務暫時不可用（後端錯誤）',
      details: err.message
    });
  }
});

// ==================== 啟動伺服器（3003 埠） ====================
const PORT = 3003;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n手機拍照 OCR App 已在運行！`);
  console.log(`本地： http://localhost:${PORT}`);
  console.log(`手機請打： http://你電腦IP:${PORT}   （例如 http://192.168.1.123:3003）\n`);
});