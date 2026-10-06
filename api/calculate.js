// api/calculate.js
const math = require('mathjs');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

/**
 * 预处理表达式：将三角函数中没有单位的参数自动加上 deg（角度制）
 * 例如：sin(30) → sin(30 deg)
 *      sin(30 rad) → 保持不变
 */
function processExpression(expr) {
  const trigFuncs = ['sin', 'cos', 'tan'];
  let processed = expr;

  trigFuncs.forEach(func => {
    // 匹配 func(参数)
    const regex = new RegExp(`${func}\\(([^)]+)\\)`, 'g');
    processed = processed.replace(regex, (match, p1) => {
      // 如果参数中已经包含 deg 或 rad，直接跳过
      if (/deg|rad/.test(p1)) return match;
      // 否则，默认补充 deg
      return `${func}(${p1} deg)`;
    });
  });

  return processed;
}

module.exports = async (req, res) => {
  // CORS 处理
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
      .limit(30);

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

      if (all === 'true') {
        const { error } = await supabase.from('calculations').delete().neq('id', 0);
        if (error) throw error;
        return res.status(200).json({ success: true, message: '全部记录已清空' });
      }

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

      // 1. 预处理表达式（自动将三角函数参数转为角度制）
      const processedExpr = processExpression(expression);

      // 2. 计算
      const result = math.evaluate(processedExpr);

      // 3. 拦截 Infinity 和 NaN
      if (typeof result === 'number' && !isFinite(result)) {
        return res.status(400).json({
          success: false,
          error: '计算结果无效：除数不能为零或结果无意义'
        });
      }

      // 4. 存入 Supabase（存入用户输入的原始表达式）
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
      return res.status(400).json({
        success: false,
        error: '表达式无效或计算错误: ' + (e.message || '请检查输入'),
      });
    }
  }

  return res.status(405).json({ success: false, error: '不支持的请求方法' });
};