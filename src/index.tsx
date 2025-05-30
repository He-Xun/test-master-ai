import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './i18n'; // 初始化i18n

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
); 