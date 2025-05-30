// 自动修复TestingPanel数据选择问题的脚本
// 在浏览器控制台中运行此脚本

(function() {
    console.log('🔧 开始自动修复TestingPanel数据选择问题...');
    
    let fixCount = 0;
    const issues = [];
    
    function log(message, type = 'info') {
        const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : type === 'warning' ? '⚠️' : 'ℹ️';
        console.log(`${prefix} ${message}`);
    }
    
    function addIssue(issue) {
        issues.push(issue);
        log(issue, 'warning');
    }
    
    // 1. 检查localStorage基本功能
    function checkLocalStorage() {
        log('检查localStorage基本功能...');
        try {
            const testKey = 'fix_test_' + Date.now();
            const testValue = { test: true };
            localStorage.setItem(testKey, JSON.stringify(testValue));
            const retrieved = JSON.parse(localStorage.getItem(testKey));
            localStorage.removeItem(testKey);
            
            if (JSON.stringify(retrieved) === JSON.stringify(testValue)) {
                log('localStorage基本功能正常', 'success');
                return true;
            } else {
                addIssue('localStorage基本功能异常');
                return false;
            }
        } catch (error) {
            addIssue(`localStorage测试失败: ${error.message}`);
            return false;
        }
    }
    
    // 2. 修复数据结构问题
    function fixDataStructure() {
        log('修复数据结构问题...');
        const keys = ['prompts', 'apiConfigs', 'models', 'defaultTestInputs'];
        
        keys.forEach(key => {
            try {
                const data = localStorage.getItem(key);
                if (data === null) {
                    localStorage.setItem(key, '[]');
                    log(`修复 ${key} 空数据问题`, 'success');
                    fixCount++;
                } else {
                    // 验证JSON格式
                    const parsed = JSON.parse(data);
                    if (!Array.isArray(parsed)) {
                        localStorage.setItem(key, '[]');
                        log(`修复 ${key} 数据格式问题`, 'success');
                        fixCount++;
                    }
                }
            } catch (error) {
                localStorage.setItem(key, '[]');
                log(`修复 ${key} 损坏数据问题`, 'success');
                fixCount++;
            }
        });
    }
    
    // 3. 创建测试数据（如果没有数据）
    function createTestDataIfNeeded() {
        log('检查是否需要创建测试数据...');
        
        const prompts = JSON.parse(localStorage.getItem('prompts') || '[]');
        const apiConfigs = JSON.parse(localStorage.getItem('apiConfigs') || '[]');
        
        if (prompts.length === 0) {
            const testPrompt = {
                id: 'fix-prompt-' + Date.now(),
                name: '修复测试提示词',
                content: '你是一个有用的AI助手，请简洁明了地回答用户的问题。',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            
            prompts.push(testPrompt);
            localStorage.setItem('prompts', JSON.stringify(prompts));
            log('创建测试提示词', 'success');
            fixCount++;
        }
        
        if (apiConfigs.length === 0) {
            const testApiConfig = {
                id: 'fix-config-' + Date.now(),
                name: '修复测试API配置',
                requestMode: 'url',
                directUrl: 'http://127.0.0.1:8008/req',
                models: [
                    {
                        id: 'model-1',
                        name: 'gpt-4o',
                        displayName: 'GPT-4o',
                        enabled: true
                    },
                    {
                        id: 'model-2',
                        name: 'claude-3-5-sonnet-20241022',
                        displayName: 'Claude 3.5 Sonnet',
                        enabled: true
                    }
                ],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            
            apiConfigs.push(testApiConfig);
            localStorage.setItem('apiConfigs', JSON.stringify(apiConfigs));
            log('创建测试API配置', 'success');
            fixCount++;
        }
        
        // 确保默认测试输入存在
        const defaultInputs = JSON.parse(localStorage.getItem('defaultTestInputs') || '[]');
        if (defaultInputs.length === 0) {
            const testInputs = [
                {
                    id: 'fix-input-1',
                    name: '简单问候',
                    content: '你好，请介绍一下你自己。',
                    category: '基础测试',
                    createdAt: new Date().toISOString(),
                },
                {
                    id: 'fix-input-2',
                    name: '逻辑推理',
                    content: '如果所有的猫都是动物，而小花是一只猫，那么小花是什么？',
                    category: '逻辑测试',
                    createdAt: new Date().toISOString(),
                }
            ];
            
            localStorage.setItem('defaultTestInputs', JSON.stringify(testInputs));
            log('创建默认测试输入', 'success');
            fixCount++;
        }
    }
    
    // 4. 验证修复结果
    function verifyFix() {
        log('验证修复结果...');
        
        try {
            const prompts = JSON.parse(localStorage.getItem('prompts') || '[]');
            const apiConfigs = JSON.parse(localStorage.getItem('apiConfigs') || '[]');
            const defaultInputs = JSON.parse(localStorage.getItem('defaultTestInputs') || '[]');
            
            // 计算可用模型
            let modelCount = 0;
            apiConfigs.forEach(config => {
                if (config.models && Array.isArray(config.models)) {
                    modelCount += config.models.filter(m => m.enabled).length;
                }
            });
            
            log(`验证结果: ${prompts.length} 个提示词, ${modelCount} 个可用模型, ${defaultInputs.length} 个默认输入`);
            
            if (prompts.length > 0 && modelCount > 0) {
                log('修复成功！TestingPanel现在应该能正常工作了', 'success');
                return true;
            } else {
                addIssue('修复后仍然缺少必要数据');
                return false;
            }
        } catch (error) {
            addIssue(`验证失败: ${error.message}`);
            return false;
        }
    }
    
    // 5. 触发React组件重新渲染（如果可能）
    function triggerRerender() {
        log('尝试触发组件重新渲染...');
        
        // 触发storage事件
        window.dispatchEvent(new StorageEvent('storage', {
            key: 'prompts',
            newValue: localStorage.getItem('prompts'),
            url: window.location.href
        }));
        
        // 如果页面有刷新数据的按钮，尝试点击
        const refreshButton = document.querySelector('button[title*="刷新"], button:contains("刷新数据")');
        if (refreshButton) {
            refreshButton.click();
            log('已点击刷新按钮', 'success');
        }
        
        log('建议手动刷新页面或点击"刷新数据"按钮', 'warning');
    }
    
    // 执行修复流程
    function runFix() {
        log('=== 开始自动修复流程 ===');
        
        if (!checkLocalStorage()) {
            log('localStorage功能异常，无法继续修复', 'error');
            return;
        }
        
        fixDataStructure();
        createTestDataIfNeeded();
        
        const success = verifyFix();
        
        if (success) {
            triggerRerender();
            log(`=== 修复完成！共修复 ${fixCount} 个问题 ===`, 'success');
            log('如果问题仍然存在，请刷新页面或重启应用', 'warning');
        } else {
            log('=== 修复失败，请手动检查以下问题 ===', 'error');
            issues.forEach(issue => log(`• ${issue}`, 'error'));
        }
        
        // 显示详细数据供调试
        log('=== 当前数据状态 ===');
        const currentData = {
            prompts: JSON.parse(localStorage.getItem('prompts') || '[]').map(p => ({ id: p.id, name: p.name })),
            apiConfigs: JSON.parse(localStorage.getItem('apiConfigs') || '[]').map(c => ({ 
                id: c.id, 
                name: c.name, 
                modelCount: c.models ? c.models.length : 0 
            })),
            defaultInputs: JSON.parse(localStorage.getItem('defaultTestInputs') || '[]').map(d => ({ id: d.id, name: d.name }))
        };
        console.table(currentData.prompts);
        console.table(currentData.apiConfigs);
        console.table(currentData.defaultInputs);
    }
    
    // 开始执行
    runFix();
    
    // 返回修复函数供手动调用
    window.fixTestingPanel = runFix;
    log('修复函数已绑定到 window.fixTestingPanel，可随时调用', 'info');
    
})(); 