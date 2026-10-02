// api/calculate.js
const math = require('mathjs');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

module.exports = async (req, res) => {
  // CORS 处理
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // ---------- GET 请求：获取历史记录 ----------
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('calculations')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('获取历史记录失败:', error);
      return res.status(500).json({ success: false, error: '获取历史记录失败' });
    }
    return res.status(200).json({ success: true, data });
  }

  // ---------- POST 请求：计算并存储 ----------
  if (req.method === 'POST') {
    try {
      // 解析请求体
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

      // 计算
      const result = math.evaluate(expression);

      // 存入 Supabase
      const { data, error: dbError } = await supabase
        .from('calculations')
        .insert([{ expression, result: String(result) }])
        .select()
        .single();

      if (dbError) {
        console.error('存储记录失败:', dbError);
        // 即使存储失败，也返回计算结果，保证前端能显示
        return res.status(200).json({ success: true, result, recordId: null });
      }

      return res.status(200).json({
        success: true,
        result,
        recordId: data.id, // 返回数据库的真实ID
      });

    } catch (e) {
      console.error('计算发生错误:', e);
      return res.status(500).json({
        success: false,
        error: '服务器计算错误: ' + (e.message || '未知错误'),
      });
    }
  }

  return res.status(405).json({ success: false, error: '不支持的请求方法' });
};