import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import App from './App'
import 'github-markdown-css/github-markdown.css'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
