import { sqliteStorage } from './sqlite-storage';

export class AdminDebugger {
  
  static async checkSuperAdminStatus() {
    console.log('=== 超级管理员账户调试信息 ===');
    
    try {
      // 确保数据库已初始化
      await sqliteStorage.initialize();
      console.log('✅ 数据库已初始化');
      
      // 检查用户表
      const allUsers = sqliteStorage.getAllUsers();
      console.log(`📊 总用户数: ${allUsers.length}`);
      allUsers.forEach(user => {
        console.log(`- ${user.username} (${user.role}) - ID: ${user.id}`);
      });
      
      // 查找 superadmin 用户
      const superAdmin = sqliteStorage.getUserByUsername('superadmin');
      if (superAdmin) {
        console.log('✅ 找到超级管理员用户:', superAdmin);
        
        // 检查密码
        try {
          const db = (sqliteStorage as any).db;
          if (db) {
            const result = db.exec('SELECT password_hash FROM user_passwords WHERE user_id = ?', [superAdmin.id]);
            if (result.length > 0 && result[0].values.length > 0) {
              const storedPassword = result[0].values[0][0];
              console.log(`🔑 存储的密码: "${storedPassword}"`);
              console.log(`🔑 期望的密码: "admin123"`);
              console.log(`✅ 密码匹配: ${storedPassword === 'admin123'}`);
              
              // 测试密码验证
              const validateResult = sqliteStorage.validateUser('superadmin', 'admin123');
              console.log('🔐 密码验证结果:', validateResult ? '成功' : '失败');
              
            } else {
              console.log('❌ 未找到密码记录');
              console.log('🔧 尝试重新设置密码...');
              sqliteStorage.storeUserPassword(superAdmin.id, 'admin123');
              console.log('✅ 密码已重新设置');
            }
          } else {
            console.log('❌ 数据库连接失败');
          }
        } catch (error) {
          console.error('❌ 检查密码时出错:', error);
        }
      } else {
        console.log('❌ 未找到超级管理员用户');
        console.log('🔧 尝试创建超级管理员...');
        try {
          const newSuperAdmin = sqliteStorage.createUser({
            username: 'superadmin',
            email: 'admin@testmaster.ai',
            role: 'superadmin',
            avatar: '/avatar/admin.png'
          });
          console.log('✅ 超级管理员用户已创建:', newSuperAdmin);
          
          sqliteStorage.storeUserPassword(newSuperAdmin.id, 'admin123');
          console.log('✅ 超级管理员密码已设置');
        } catch (error) {
          console.error('❌ 创建超级管理员失败:', error);
        }
      }
      
      // 检查数据库表结构
      try {
        const db = (sqliteStorage as any).db;
        if (db) {
          console.log('\n📋 数据库表结构检查:');
          
          // 检查 users 表
          const usersTable = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='users'");
          console.log('users 表存在:', usersTable.length > 0);
          
          // 检查 user_passwords 表
          const passwordsTable = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='user_passwords'");
          console.log('user_passwords 表存在:', passwordsTable.length > 0);
          
          if (passwordsTable.length > 0) {
            // 检查密码表中的所有记录
            const allPasswords = db.exec('SELECT user_id, password_hash FROM user_passwords');
            console.log('密码表记录数:', allPasswords.length > 0 ? allPasswords[0].values.length : 0);
            if (allPasswords.length > 0) {
              allPasswords[0].values.forEach((row: any[]) => {
                console.log(`- 用户ID ${row[0]}: 密码 "${row[1]}"`);
              });
            }
          }
        }
      } catch (error) {
        console.error('❌ 检查数据库表结构失败:', error);
      }
      
    } catch (error) {
      console.error('❌ 调试失败:', error);
    }
    
    console.log('=== 调试完成 ===');
  }
  
  static async resetSuperAdminPassword() {
    console.log('🔧 重置超级管理员密码...');
    
    try {
      await sqliteStorage.initialize();
      
      const superAdmin = sqliteStorage.getUserByUsername('superadmin');
      if (superAdmin) {
        sqliteStorage.storeUserPassword(superAdmin.id, 'admin123');
        console.log('✅ 超级管理员密码已重置为: admin123');
        
        // 验证重置结果
        const validateResult = sqliteStorage.validateUser('superadmin', 'admin123');
        console.log('🔐 重置后验证结果:', validateResult ? '成功' : '失败');
      } else {
        console.log('❌ 未找到超级管理员用户');
      }
    } catch (error) {
      console.error('❌ 重置密码失败:', error);
    }
  }
}

// 导出调试函数给浏览器控制台使用
(window as any).debugSuperAdmin = AdminDebugger.checkSuperAdminStatus;
(window as any).resetSuperAdminPassword = AdminDebugger.resetSuperAdminPassword; 