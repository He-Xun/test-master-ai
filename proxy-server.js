const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');
const url = require('url');

const app = express();
const PORT = 3001;

app.use(cors());
// 不要加 express.json() 和 express.urlencoded()

app.use(/^\/proxy\/(.+)/, (req, res, next) => {
  try {
    const encodedUrl = req.params[0];
    const targetUrl = decodeURIComponent(encodedUrl);

    if (!/^https?:\/\//.test(targetUrl)) {
      return res.status(400).send('Invalid target URL');
    }

    const parsed = url.parse(targetUrl);
    const realTarget = `${parsed.protocol}//${parsed.host}`;
    let path = parsed.path || '/';
    path = encodeURI(path);

    return createProxyMiddleware({
      target: realTarget,
      changeOrigin: true,
      secure: false,
      pathRewrite: () => path,
      onError: (err, req, res) => {
        res.status(502).send('代理请求失败: ' + err.message);
      },
      // 不需要 onProxyReq，body 会自动透传
    })(req, res, next);
  } catch (err) {
    res.status(500).send('代理服务内部错误: ' + err.message);
  }
});

app.listen(PORT, () => {
  console.log(`万能代理服务已启动，监听端口 ${PORT}`);
});
