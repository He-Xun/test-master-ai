const { contextBridge } = require('electron');

console.log('preload.js loaded');

function getResourcesPath() {
  const arg = process.argv.find(arg => arg.startsWith('--resourcesPath='));
  if (arg) {
    return arg.replace('--resourcesPath=', '');
  }
  return '';
}

contextBridge.exposeInMainWorld('wasmHelper', {
  getWasmPath: (file) => {
    const resourcesPath = getResourcesPath();
    const sep = process.platform === 'win32' ? '\\' : '/';
    const wasmPath = `file://${resourcesPath}${sep}${file}`;
    console.log('[preload.js] getWasmPath called, return:', wasmPath);
    return wasmPath;
  }
});
