# 故障排除指南

## 数据丢失问题

### 问题描述
用户反馈：每次保存了API配置和模型设置后，下次打开应用时数据都丢失了。

### 可能原因

1. **浏览器隐私模式**
   - 在隐私/无痕模式下，localStorage数据在关闭浏览器后会被清除
   - 解决方案：使用正常模式打开应用

2. **浏览器设置**
   - 浏览器设置为关闭时清除所有数据
   - 浏览器禁用了localStorage
   - 解决方案：检查浏览器设置，允许网站存储数据

3. **Electron应用问题**
   - 开发模式下的数据存储路径可能不稳定
   - 应用重新构建时可能清除数据
   - 解决方案：使用生产模式构建的应用

4. **存储空间限制**
   - localStorage有大小限制（通常5-10MB）
   - 解决方案：定期清理不必要的数据

### 诊断步骤

#### 1. 检查浏览器支持
打开浏览器控制台，运行：
```javascript
console.log('localStorage支持:', typeof(Storage) !== "undefined");
console.log('当前存储大小:', JSON.stringify(localStorage).length);
```

#### 2. 手动测试存储
```javascript
// 写入测试数据
localStorage.setItem('test', 'hello');
// 读取测试数据
console.log('测试数据:', localStorage.getItem('test'));
// 清理测试数据
localStorage.removeItem('test');
```

#### 3. 检查应用数据
```javascript
// 检查应用数据
console.log('提示词:', localStorage.getItem('prompts'));
console.log('API配置:', localStorage.getItem('apiConfigs'));
console.log('模型:', localStorage.getItem('models'));
console.log('默认输入:', localStorage.getItem('defaultTestInputs'));
```

#### 4. 使用调试工具
1. 打开 `debug-storage.html` 文件
2. 点击"创建示例数据"
3. 刷新页面，检查数据是否还在
4. 关闭浏览器重新打开，再次检查

### 解决方案

#### 方案1：数据导出/导入
1. 在应用中配置好所有数据
2. 使用调试工具导出数据到JSON文件
3. 下次使用时导入数据

#### 方案2：手动备份
定期复制localStorage内容：
```javascript
// 导出所有数据
const backup = {
  prompts: localStorage.getItem('prompts'),
  apiConfigs: localStorage.getItem('apiConfigs'),
  models: localStorage.getItem('models'),
  defaultTestInputs: localStorage.getItem('defaultTestInputs'),
  timestamp: new Date().toISOString()
};
console.log('备份数据:', JSON.stringify(backup, null, 2));
```

#### 方案3：使用生产版本
```bash
# 构建生产版本
npm run build

# 启动生产版本
npm run electron-pack
```

### 预防措施

1. **定期备份**
   - 使用应用内的导出功能
   - 保存配置文件到安全位置

2. **检查浏览器设置**
   - 确保允许网站存储数据
   - 不要使用隐私模式

3. **使用稳定环境**
   - 使用生产构建版本
   - 避免频繁重新构建开发版本

### 调试工具使用

#### debug-storage.html 功能
- **创建示例数据**：快速创建测试用的API配置和提示词
- **显示所有数据**：查看当前存储的所有数据
- **测试数据持久化**：验证localStorage读写功能
- **导出数据**：将数据保存为JSON文件
- **导入数据**：从JSON文件恢复数据
- **清空所有数据**：重置所有存储数据

#### 使用步骤
1. 打开 `debug-storage.html`
2. 点击"创建示例数据"创建测试数据
3. 点击"显示所有数据"查看数据状态
4. 点击"测试数据持久化"验证存储功能
5. 如果测试通过，数据应该能正常保存

### 常见错误信息

#### "QuotaExceededError"
- 原因：localStorage空间不足
- 解决：清理旧数据或减少存储内容

#### "SecurityError"
- 原因：浏览器安全策略阻止
- 解决：检查浏览器设置，允许本地文件访问

#### "TypeError: Cannot read property"
- 原因：数据格式损坏
- 解决：清空localStorage重新配置

### 联系支持

如果以上方法都无法解决问题，请提供以下信息：
1. 操作系统版本
2. 浏览器类型和版本
3. 应用运行模式（开发/生产）
4. 控制台错误信息
5. debug-storage.html的测试结果

### 技术细节

#### 数据存储结构
```javascript
// localStorage键值对
{
  "prompts": "[{id, name, content, createdAt, updatedAt}]",
  "apiConfigs": "[{id, name, requestMode, models, createdAt, updatedAt}]", 
  "models": "[{id, name, displayName, apiConfigId, enabled}]",
  "defaultTestInputs": "[{id, name, content, category, createdAt}]"
}
```

#### 数据验证
应用启动时会验证数据格式，如果发现损坏会重置为默认值。

#### 自动恢复
应用包含默认的测试输入数据，即使其他数据丢失，基本功能仍可使用。 