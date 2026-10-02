// api/calculate.js
const math = require('mathjs');

module.exports = async (req, res) => {
  // 允许跨域请求
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: '只接受 POST 请求' });
  }

  try {
    // 手动解析请求体（Vercel 原生环境不会自动解析 JSON）
    let body = req.body;
    if (typeof body === 'string') {
      body = JSON.parse(body);
    } else if (Buffer.isBuffer(body)) {
      body = JSON.parse(body.toString('utf-8'));
    }

    const { expression } = body || {};

    if (!expression || typeof expression !== 'string') {
      return res.status(400).json({ success: false, error: '缺少表达式' });
    }

    // 安全计算
    const result = math.evaluate(expression);
    const recordId = Date.now();

    return res.status(200).json({
      success: true,
      result,
      recordId
    });

  } catch (e) {
    // 把详细错误打印到 Vercel 日志中，方便排查
    console.error('计算发生错误:', e);
    return res.status(500).json({ 
      success: false, 
      error: '服务器计算错误: ' + (e.message || '未知错误') 
    });
  }
};