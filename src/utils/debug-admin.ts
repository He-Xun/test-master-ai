import { storageAdapter } from './storage-adapter';
import { sqliteStorage } from './sqlite-storage';

export class AdminDebugger {
  // 检查超级管理员状态
  static async checkSuperAdminStatus(): Promise<void> {
    console.log('=== 超级管理员状态检查 ===');
    
    try {
      // 检查存储适配器状态
      const storageInfo = storageAdapter.getStorageInfo();
      console.log('🏗️ 存储适配器状态:', storageInfo);
      
      // 检查当前会话
      const currentSession = storageAdapter.getCurrentSession();
      console.log('🔐 当前会话:', currentSession);
      
      // 检查localStorage中的超级管理员
      console.log('\n📦 localStorage存储检查:');
      const localUsers = JSON.parse(localStorage.getItem('allUsers') || '[]');
      console.log('👥 localStorage用户列表:', localUsers);
      
      const localSuperAdmin = localUsers.find((u: any) => u.username === 'superadmin');
      console.log('👤 localStorage超级管理员:', localSuperAdmin);
        
      if (localSuperAdmin) {
        const localPassword = localStorage.getItem(`pwd_${localSuperAdmin.id}`);
        console.log('🔑 localStorage超级管理员密码已设置:', !!localPassword);
      }
      
      // 检查SQLite中的超级管理员（如果可用）
      if (storageInfo.sqliteEnabled) {
        console.log('\n🗄️ SQLite存储检查:');
        const sqliteUsers = sqliteStorage.getAllUsers();
        console.log('👥 SQLite用户列表:', sqliteUsers);
        
        const sqliteSuperAdmin = sqliteUsers.find(u => u.username === 'superadmin');
        console.log('👤 SQLite超级管理员:', sqliteSuperAdmin);
              
        if (sqliteSuperAdmin) {
          const passwordValid = sqliteStorage.validateUser('superadmin', 'admin123');
          console.log('🔑 SQLite超级管理员密码验证:', !!passwordValid);
        }
      }
      
      // 测试登录功能
      console.log('\n🧪 登录功能测试:');
      const loginResult = storageAdapter.login('superadmin', 'admin123');
      console.log('✅ 超级管理员登录测试结果:', !!loginResult);
      
      console.log('=== 检查完成 ===');
      
        } catch (error) {
      console.error('❌ 超级管理员状态检查失败:', error);
        }
  }

  // 重置超级管理员密码
  static async resetSuperAdminPassword(newPassword: string = 'admin123'): Promise<void> {
    console.log('=== 重置超级管理员密码 ===');
    
    try {
      const storageInfo = storageAdapter.getStorageInfo();
      console.log('🏗️ 当前存储模式:', storageInfo.sqliteEnabled ? 'SQLite' : 'localStorage');
      
      // 查找超级管理员
      const superAdmin = await storageAdapter.getUserByUsername('superadmin');
      
      if (!superAdmin) {
        console.log('👤 超级管理员不存在，正在创建...');
        const newSuperAdmin = await storageAdapter.createUser({
            username: 'superadmin',
            email: 'admin@testmaster.ai',
            role: 'superadmin',
          avatar: undefined
        });
        
        await storageAdapter.storeUserPassword(newSuperAdmin.id, newPassword);
        console.log('✅ 超级管理员创建成功，密码已设置为:', newPassword);
      } else {
        console.log('👤 找到超级管理员:', superAdmin);
        
        // 重置密码
        await storageAdapter.storeUserPassword(superAdmin.id, newPassword);
        console.log('✅ 超级管理员密码已重置为:', newPassword);
          
        // 验证密码设置
        const isValid = await storageAdapter.validateUser('superadmin', newPassword);
        console.log('🔑 密码验证结果:', !!isValid);
      }
      
      console.log('=== 重置完成 ===');
      console.log('💡 请使用用户名: superadmin, 密码:', newPassword, '登录');
      
    } catch (error) {
      console.error('❌ 重置超级管理员密码失败:', error);
    }
  }

  // 强制数据迁移
  static async forceMigrateData(): Promise<void> {
    console.log('=== 强制数据迁移 ===');
    
    try {
      const storageInfo = storageAdapter.getStorageInfo();
      
      if (!storageInfo.sqliteEnabled) {
        console.log('❌ SQLite未启用，无法执行迁移');
        return;
            }
      
      console.log('🔄 开始强制数据迁移...');
      
      // 使用私有方法进行迁移（通过类型断言）
      await (storageAdapter as any).migrateToSQLite();
      
      console.log('✅ 数据迁移完成');
      
      // 重新检查超级管理员状态
      await this.checkSuperAdminStatus();
      
    } catch (error) {
      console.error('❌ 强制数据迁移失败:', error);
    }
  }

  // 清除所有数据（谨慎使用）
  static async clearAllData(): Promise<void> {
    console.log('=== 清除所有数据 ===');
    
    const confirmed = window.confirm('⚠️ 警告：这将清除所有用户数据！确定要继续吗？');
    if (!confirmed) {
      console.log('❌ 操作已取消');
      return;
    }
    
    try {
      // 清除localStorage
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.includes('allUsers') || key.includes('userSession') || key.startsWith('pwd_')) {
          localStorage.removeItem(key);
        }
      });
      
      console.log('✅ localStorage数据已清除');
        
      // 如果SQLite可用，也清除SQLite数据
      const storageInfo = storageAdapter.getStorageInfo();
      if (storageInfo.sqliteEnabled) {
        // 这里需要重新初始化SQLite数据库
        console.log('🗄️ SQLite数据将在下次初始化时重建');
      }
      
      console.log('✅ 所有数据已清除');
      console.log('💡 刷新页面以重新初始化系统');
      
    } catch (error) {
      console.error('❌ 清除数据失败:', error);
    }
  }
}

// 暴露到全局
if (typeof window !== 'undefined') {
  (window as any).AdminDebugger = AdminDebugger;
  
  // 简化调用
(window as any).debugSuperAdmin = AdminDebugger.checkSuperAdminStatus;
(window as any).resetSuperAdminPassword = AdminDebugger.resetSuperAdminPassword; 
  (window as any).forceMigrateData = AdminDebugger.forceMigrateData;
  (window as any).clearAllData = AdminDebugger.clearAllData;
} 