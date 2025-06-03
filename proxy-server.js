const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');
const url = require('url');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 通用代理，支持所有 /proxy/ 后跟任意 encodeURIComponent 目标URL
app.use(/^\/proxy\/(.+)/, (req, res, next) => {
  try {
    const encodedUrl = req.params[0];
    const targetUrl = decodeURIComponent(encodedUrl);

    if (!/^https?:\/\//.test(targetUrl)) {
      return res.status(400).send('Invalid target URL');
    }

    const parsed = url.parse(targetUrl);
    const realTarget = `${parsed.protocol}//${parsed.host}`;
    const path = parsed.path;

    return createProxyMiddleware({
      target: realTarget,
      changeOrigin: true,
      secure: false,
      pathRewrite: () => path,
      onError: (err, req, res) => {
        res.status(500).json({ error: '代理请求失败', detail: err.message });
      },
      logLevel: 'warn',
    })(req, res, next);
  } catch (e) {
    res.status(500).json({ error: '代理服务内部错误', detail: e.message });
  }
});

app.listen(PORT, () => {
  console.log(`万能代理服务器已启动: http://localhost:${PORT}/proxy/<encodeURIComponent(完整目标URL)>`);
});
