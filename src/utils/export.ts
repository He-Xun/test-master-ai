// import * as XLSX from 'xlsx';
import { TestResult } from '../types';

// 导出测试结果到Excel
export const exportToExcel = async (results: TestResult[], filename?: string): Promise<void> => {
  const XLSX = await import('xlsx');
  // 准备数据
  const data = results.map((result, index) => ({
    '序号': index + 1,
    '用户输入': result.userInput,
    '提示词名称': result.promptName,
    '模型名称': result.modelName,
    '第几次': result.repetitionIndex,
    '输出结果': result.output,
    '状态': result.status === 'success' ? '成功' : result.status === 'error' ? '失败' : '等待中',
    '错误信息': result.errorMessage || '',
    '时间戳': new Date(result.timestamp).toLocaleString('zh-CN'),
    '耗时(毫秒)': result.duration || '',
  }));

  // 创建工作簿
  const wb = XLSX.utils.book_new();
  
  // 创建工作表
  const ws = XLSX.utils.json_to_sheet(data);
  
  // 设置列宽
  const colWidths = [
    { wch: 8 },  // 序号
    { wch: 30 }, // 用户输入
    { wch: 20 }, // 提示词名称
    { wch: 20 }, // 模型名称
    { wch: 10 }, // 第几次
    { wch: 50 }, // 输出结果
    { wch: 10 }, // 状态
    { wch: 30 }, // 错误信息
    { wch: 20 }, // 时间戳
    { wch: 12 }, // 耗时
  ];
  ws['!cols'] = colWidths;
  
  // 添加工作表到工作簿
  XLSX.utils.book_append_sheet(wb, ws, '测试结果');
  
  // 生成文件名
  const defaultFilename = `API测试结果_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.xlsx`;
  const finalFilename = filename || defaultFilename;
  
  // 写入文件
  XLSX.writeFile(wb, finalFilename);
};

// 导出测试结果到CSV
export const exportToCSV = async (results: TestResult[], filename?: string): Promise<void> => {
  const XLSX = await import('xlsx');
  // 准备数据
  const data = results.map((result, index) => ({
    '序号': index + 1,
    '用户输入': result.userInput,
    '提示词名称': result.promptName,
    '模型名称': result.modelName,
    '第几次': result.repetitionIndex,
    '输出结果': result.output,
    '状态': result.status === 'success' ? '成功' : result.status === 'error' ? '失败' : '等待中',
    '错误信息': result.errorMessage || '',
    '时间戳': new Date(result.timestamp).toLocaleString('zh-CN'),
    '耗时(毫秒)': result.duration || '',
  }));

  // 创建工作簿和工作表
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, '测试结果');
  
  // 生成文件名
  const defaultFilename = `API测试结果_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.csv`;
  const finalFilename = filename || defaultFilename;
  
  // 写入CSV文件
  XLSX.writeFile(wb, finalFilename, { bookType: 'csv' });
};

// 复制结果到剪贴板
export const copyResultsToClipboard = (results: TestResult[]): string => {
  const headers = ['序号', '用户输入', '提示词名称', '模型名称', '第几次', '输出结果', '状态', '错误信息', '时间戳', '耗时(毫秒)'];
  
  const rows = results.map((result, index) => [
    (index + 1).toString(),
    result.userInput,
    result.promptName,
    result.modelName,
    result.repetitionIndex.toString(),
    result.output,
    result.status === 'success' ? '成功' : result.status === 'error' ? '失败' : '等待中',
    result.errorMessage || '',
    new Date(result.timestamp).toLocaleString('zh-CN'),
    result.duration ? result.duration.toString() : '',
  ]);
  
  // 组合成制表符分隔的文本
  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join('\t'))
    .join('\n');
  
  // 复制到剪贴板
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(csvContent);
  } else {
    // 降级方案：使用传统的复制方法
    const textArea = document.createElement('textarea');
    textArea.value = csvContent;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    document.execCommand('copy');
    textArea.remove();
  }
  
  return csvContent;
};

// 格式化结果为可读文本
export const formatResultsAsText = (results: TestResult[]): string => {
  let text = '=== API测试结果 ===\n\n';
  
  results.forEach((result, index) => {
    text += `--- 结果 ${index + 1} ---\n`;
    text += `用户输入: ${result.userInput}\n`;
    text += `提示词: ${result.promptName}\n`;
    text += `模型: ${result.modelName}\n`;
    text += `第 ${result.repetitionIndex} 次调用\n`;
    text += `状态: ${result.status === 'success' ? '成功' : result.status === 'error' ? '失败' : '等待中'}\n`;
    if (result.errorMessage) {
      text += `错误信息: ${result.errorMessage}\n`;
    }
    text += `输出结果:\n${result.output}\n`;
    text += `时间: ${new Date(result.timestamp).toLocaleString('zh-CN')}\n`;
    if (result.duration) {
      text += `耗时: ${result.duration}ms\n`;
    }
    text += '\n';
  });
  
  return text;
};

// 复制单行结果到剪贴板
export const copySingleResultToClipboard = (result: TestResult): string => {
  const content = result.status === 'error' ? (result.errorMessage || '错误') : result.output;
  
  // 复制到剪贴板
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(content);
  } else {
    // 降级方案：使用传统的复制方法
    const textArea = document.createElement('textarea');
    textArea.value = content;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    document.execCommand('copy');
    textArea.remove();
  }
  
  return content;
}; 