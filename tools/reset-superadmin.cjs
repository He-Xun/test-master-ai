#!/usr/bin/env node

console.log(`
🔧 超级管理员账户重置工具
==========================

请按以下步骤操作：

1. 🌐 打开浏览器，访问: http://localhost:5678

2. 🔧 打开浏览器开发者工具 (F12)

3. 📝 在控制台 (Console) 中执行以下命令：

   debugSuperAdmin()

4. 🔍 查看输出，检查超级管理员账户状态

5. ⚠️ 如果密码验证失败，执行：

   resetSuperAdminPassword()

6. 🔄 重新执行检查：

   debugSuperAdmin()

7. ✅ 确认密码验证成功后，刷新页面并尝试登录

📋 登录信息：
- 用户名: superadmin
- 密码: admin123

🚨 故障排除：

如果仍然无法登录，请执行以下操作：

1. 清除浏览器存储：
   localStorage.clear()
   
2. 清除IndexedDB：
   window.indexedDB.deleteDatabase('ApiTestToolDB')
   
3. 刷新页面，重新初始化

⚡ 快速重置（在控制台执行）：
localStorage.clear(); 
window.indexedDB.deleteDatabase('ApiTestToolDB'); 
location.reload();

==========================
`);

console.log('✅ 请按照上述步骤在浏览器中操作！'); 