// 快速API代理诊断脚本
const http = require('http');

console.log('🔍 API代理诊断开始...\n');

// 测试1: 检查开发服务器
console.log('1️⃣ 检查开发服务器状态...');
const serverReq = http.get('http://localhost:5678', (res) => {
  console.log(`✅ 开发服务器状态: ${res.statusCode} ${res.statusMessage}`);
  
  // 测试2: 检查代理路径
  console.log('\n2️⃣ 检查API代理路径...');
  
  const proxyReq = http.get('http://localhost:5678/api-proxy/v1/models', {
    headers: {
      'Authorization': 'Bearer ',
      'Content-Type': 'application/json'
    }
  }, (proxyRes) => {
    console.log(`📡 代理响应状态: ${proxyRes.statusCode} ${proxyRes.statusMessage}`);
    
    let data = '';
    proxyRes.on('data', chunk => data += chunk);
    proxyRes.on('end', () => {
      try {
        const jsonData = JSON.parse(data);
        const modelCount = jsonData.data ? jsonData.data.length : 0;
        console.log(`✅ 成功获取 ${modelCount} 个模型`);
        console.log(`前3个模型: ${jsonData.data ? jsonData.data.slice(0, 3).map(m => m.id).join(', ') : '无'}`);
      } catch (e) {
        console.log(`❌ 解析响应失败:`, data.substring(0, 200));
      }
      
      // 测试3: 检查聊天API
      console.log('\n3️⃣ 检查聊天API...');
      testChatAPI();
    });
  });
  
  proxyReq.on('error', (err) => {
    console.log(`❌ 代理请求失败: ${err.message}`);
  });
});

serverReq.on('error', (err) => {
  console.log(`❌ 开发服务器连接失败: ${err.message}`);
});

function testChatAPI() {
  const postData = JSON.stringify({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: '你好' }],
    max_tokens: 10
  });

  const options = {
    hostname: 'localhost',
    port: 5678,
    path: '/api-proxy/v1/chat/completions',
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ',
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  const req = http.request(options, (res) => {
    console.log(`💬 聊天API状态: ${res.statusCode} ${res.statusMessage}`);
    
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try {
        const jsonData = JSON.parse(data);
        const content = jsonData.choices[0]?.message?.content || '无响应';
        console.log(`✅ 聊天测试成功: "${content}"`);
        console.log('\n🎉 API代理诊断完成！所有测试通过。');
      } catch (e) {
        console.log(`❌ 聊天API响应解析失败:`, data.substring(0, 200));
      }
    });
  });

  req.on('error', (err) => {
    console.log(`❌ 聊天API请求失败: ${err.message}`);
  });

  req.write(postData);
  req.end();
} 