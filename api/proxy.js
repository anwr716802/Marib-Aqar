// api/proxy.js
export default async function handler(req, res) {
  // السماح فقط بطلبات GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // الرابط الأصلي لـ Google Apps Script (استبدله برابط النشر الفعلي)
  const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzyjvZ5jUKs8ysbkIOql8Aexpki2HXDgD6zkQ1MurmnQRmVodij8Tx9kwwEtPJaGM1s/exec';

  // بناء query string من الطلب الوارد
  const queryString = new URLSearchParams(req.query).toString();
  const targetUrl = GOOGLE_SCRIPT_URL + (queryString ? '?' + queryString : '');

  console.log('Proxying to:', targetUrl);

  try {
    const response = await fetch(targetUrl);
    const text = await response.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      data = { error: 'Invalid JSON from Google Script' };
    }

    // إعادة رؤوس CORS للسماح للواجهة بقراءة الرد
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).json(data);
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ error: 'Proxy failed: ' + error.message });
  }
}
