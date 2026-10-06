// api/calculate.js
const math = require('mathjs');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

module.exports = async (req, res) => {
  // CORS 处理（增加 DELETE 方法）
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // =========================================================
  // GET 请求：获取历史记录
  // =========================================================
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('calculations')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(30); // 最多返回 30 条

    if (error) {
      console.error('获取历史记录失败:', error);
      return res.status(500).json({ success: false, error: '获取历史记录失败' });
    }
    return res.status(200).json({ success: true, data });
  }

  // =========================================================
  // DELETE 请求：删除历史记录
  // =========================================================
  if (req.method === 'DELETE') {
    try {
      const { id, all } = req.query;

      // 1. 清空全部
      if (all === 'true') {
        const { error } = await supabase.from('calculations').delete().neq('id', 0);
        if (error) throw error;
        return res.status(200).json({ success: true, message: '全部记录已清空' });
      }

      // 2. 删除单条
      if (id) {
        const { error } = await supabase.from('calculations').delete().eq('id', id);
        if (error) throw error;
        return res.status(200).json({ success: true, message: '记录已删除' });
      }

      return res.status(400).json({ success: false, error: '缺少必要的参数 (id 或 all)' });
    } catch (err) {
      console.error('删除失败:', err);
      return res.status(500).json({ success: false, error: '删除失败: ' + err.message });
    }
  }

  // =========================================================
  // POST 请求：计算并存储
  // =========================================================
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

      // 1. 计算
      const result = math.evaluate(expression);

      // 2. 拦截 Infinity 和 NaN（除数为 0 的情况）
      if (typeof result === 'number' && !isFinite(result)) {
        return res.status(400).json({
          success: false,
          error: '计算结果无效：除数不能为零或结果无意义'
        });
      }

      // 3. 存入 Supabase
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
      // 返回明确的错误提示给前端
      return res.status(400).json({
        success: false,
        error: '表达式无效或计算错误: ' + (e.message || '请检查输入'),
      });
    }
  }

  return res.status(405).json({ success: false, error: '不支持的请求方法' });
};