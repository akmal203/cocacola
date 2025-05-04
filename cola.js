const fs = require('fs');
const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');

// Config
const TELEGRAM_BOT_TOKEN = 'ISI TOKEN BOT TELE';
const TELEGRAM_CHAT_ID = 'ISI CHATID TELE';
const TOKEN = fs.readFileSync('./token.txt', 'utf-8').trim();
const PROXY = 'ISI PROXY'; // proxy wajib rotating
const httpsAgent = new HttpsProxyAgent(PROXY);

// Load semua kode dari file
let allCodes = fs.readFileSync('./codes.txt', 'utf-8')
  .split('\n').map(x => x.trim()).filter(Boolean);

// Kirim ke Telegram
async function sendTelegram(msg) {
  try {
    await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      chat_id: TELEGRAM_CHAT_ID,
      text: msg
    });
  } catch (err) {
    console.error('❌ Gagal kirim Telegram:', err.message);
  }
}

// Fungsi redeem
async function redeemCode(code) {
  try {
    const response = await axios.post(
      'https://us-central1-grivy-barcode.cloudfunctions.net/grabMainRedeem',
      {
        data: { 
        publicCode: 'tccc-coke-utc-2025-main',
        packagingCode: code,
        terms_conditions_01: true,
        terms_conditions_02: false,
        terms_conditions_03: false,
        domain: 'ayo_coca_cola'
      }},
      {
        headers: {
          'authority': 'us-central1-grivy-barcode.cloudfunctions.net',
          'method': 'POST',
          'scheme': 'https',
          'accept': '*/*',
          'accept-language': 'en-US,en;q=0.9',
          'accept-encoding': 'gzip, deflate, br, zstd', 
          'path': '/grabMainRedeem',
          'Authorization': `Bearer ${TOKEN}`,
          'Content-Type': 'application/json',
          'Origin': 'https://ayo.coca-cola.co.id',
          'Referer': 'https://ayo.coca-cola.co.id/',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36 Edg/136.0.0.0',
        },
        httpsAgent,
        validateStatus: () => true
    }
);

const { status, data } = response;

if (status === 200 && data?.result?.status === 'grabbed') {
  console.log(`✅ [${code}] Berhasil`);
  await sendTelegram(`🎉 Berhasil redeem: ${code}`);
  return true;
}

if (data?.error?.message === 'packaging_code_not_found') {
  console.warn(`❌ [${code}] Gagal: Kode tidak Valid`);
} else {
  console.warn(`❌ [${code}] Gagal: ${data?.error?.message || 'packaging_code_used'}`);
}

return false;

} catch (err) {
const status = err.response?.status;
const message = err.response?.data?.error?.message || err.message;

if (status === 429) {
  console.warn(`⚠️ [${code}] Rate limited (429). Menunggu sebelum lanjut...`);
  await new Promise(r => setTimeout(r, 5000));
} else {
  console.error(`❌ [${code}] Error tidak diketahui: ${message}`);
}

return false;
}
}

// Loop redeem per 5 menit
(async () => {
  while (allCodes.length > 0) {
    console.log(`🚀 Mulai batch redeem baru (5 menit)`);
    const batchStart = Date.now();

    while (Date.now() - batchStart < 5 * 60 * 1000 && allCodes.length > 0) {
      const code = allCodes.shift(); // Ambil satu kode
      await redeemCode(code);
      await new Promise(r => setTimeout(r, 1000)); // Delay 1 detik antar kode
    }

    console.log('⏱️ Batch 5 menit selesai. Lanjut batch baru...');
  }

  console.log('✅ Semua kode sudah dicoba.');
})();
