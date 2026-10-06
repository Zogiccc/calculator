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
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,DELETE');
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
      .limit(30); // 获取最近 30 条

    if (error) {
      console.error('获取历史记录失败:', error);
      return res.status(500).json({ success: false, error: '获取历史记录失败' });
    }
    return res.status(200).json({ success: true, data });
  }

  // ---------- DELETE 请求：删除历史记录 ----------
  if (req.method === 'DELETE') {
    try {
      const { id, all } = req.query;

      if (all === 'true') {
        // 清空全部记录
        const { error } = await supabase.from('calculations').delete().neq('id', 0);
        if (error) throw error;
        return res.status(200).json({ success: true, message: '全部记录已清空' });
      } 
      
      if (id) {
        // 删除单条记录
        const { error } = await supabase.from('calculations').delete().eq('id', id);
        if (error) throw error;
        return res.status(200).json({ success: true, message: '记录已删除' });
      }

      return res.status(400).json({ success: false, error: '缺少必要的参数' });
    } catch (err) {
      console.error('删除失败:', err);
      return res.status(500).json({ success: false, error: '删除失败: ' + err.message });
    }
  }

  // ---------- POST 请求：计算并存储 ----------
  if (req.method === 'POST') {
    try {
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

      // 计算：使用 mathjs 安全解析表达式（支持科学计算函数如 sin, cos, sqrt 等）
      const result = math.evaluate(expression);

      // 存入 Supabase
      const { data, error: dbError } = await supabase
        .from('calculations')
        .insert([{ expression, result: String(result) }])
        .select()
        .single();

      if (dbError) {
        console.error('存储记录失败:', dbError);
        return res.status(200).json({ success: true, result, recordId: null });
      }

      return res.status(200).json({
        success: true,
        result,
        recordId: data.id,
      });

    } catch (e) {
      console.error('计算发生错误:', e);
      // 返回友好的错误提示给前端
      return res.status(400).json({
        success: false,
        error: '表达式无效或计算错误: ' + (e.message || '请检查输入'),
      });
    }
  }

  return res.status(405).json({ success: false, error: '不支持的请求方法' });
};