const https = require('https');
https.get('https://ai.google.dev/pricing', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const text = data.replace(/<[^>]*>?/gm, ' ');
    const idx = text.indexOf('Gemini 3 Pro Image Preview');
    console.log(text.substring(idx, idx + 1000));
  });
});
