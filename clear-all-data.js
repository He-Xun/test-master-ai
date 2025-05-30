// =====================================================
// 清理所有用户数据的浏览器脚本
// 请复制以下代码到浏览器控制台中运行
// =====================================================

(function() {
  console.log('🧹 开始清理所有用户数据...');
  
  let clearedCount = 0;
  const keysToRemove = [];
  
  // 收集所有要删除的键
  Object.keys(localStorage).forEach(key => {
    // 应用相关的所有数据
    if (
      // 基础数据
      key === 'prompts' || key === 'apiConfigs' || key === 'defaultTestInputs' || 
      key === 'models' || key === 'test_session_history' ||
      
      // 配置和状态
      key === 'configNotificationDismissed' || key === 'autoSaveConfig' || 
      key === 'configDraft' || key === 'current_test_session' || 
      key === 'temp_session_detail' ||
      
      // 用户ID前缀的数据
      key.includes('_prompts') || key.includes('_apiConfigs') || 
      key.includes('_test_session_history') || key.includes('_current_test_session') ||
      key.includes('_defaultTestInputs') || key.includes('_models') ||
      key.includes('_config_drafts') || key.includes('_user_sessions')
    ) {
      keysToRemove.push(key);
    }
  });
  
  // 删除收集到的键
  keysToRemove.forEach(key => {
    localStorage.removeItem(key);
    clearedCount++;
  });
  
  console.log(`✅ 数据清理完成！`);
  console.log(`📊 共清理了 ${clearedCount} 个存储项`);
  console.log(`🔄 请刷新页面以确保所有数据都已清除`);
  
  if (clearedCount === 0) {
    console.log('ℹ️ 没有找到需要清理的数据');
  } else {
    console.log('🗑️ 已清理的数据项:', keysToRemove);
  }
})(); 