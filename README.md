# LONFRO 中英文独立站

这是一个可静态部署的中英文 B2B 产品展示与询价网站，不依赖 Vercel、Supabase、在线数据库或特定托管平台。

## 当前内容

- 62 款产品，严格读取上级目录中的 `保温箱-2026年柬埔寨丽卡报价.xlsx`
- 产品图从 Excel 内嵌图片自动提取
- 产品名称、材质、颜色、规格和包装信息自动生成英文展示内容
- 中文版本使用 Excel 中的原始中文产品字段，并与英文版共用同一产品图、价格和稳定 slug
- 英文首页：`/`，中文首页：`/zh/`，页头可直接切换语言
- 公开显示两档美元批发参考价
- 501-999 件固定显示 `Contact for Price`
- 产品链接通过 `data/product-slugs.json` 保持稳定
- PDF 资料只用于公司背景、制造能力、认证和 OEM/ODM 内容

## 最简单的使用方式

### 预览网站

双击：

`预览网站.command`

终端显示本地地址后，在浏览器打开：

`http://localhost:4321`

中文版打开：

`http://localhost:4321/zh/`

### 更新 Excel 后重新生成

1. 将新版报价表放在 `lonfro-site` 的上一级目录，或上一级的 `参考` 文件夹。
2. 文件名保持为 `保温箱-2026年柬埔寨丽卡报价.xlsx`。
3. 双击 `更新并生成网站.command`。
4. 生成结果位于 `dist` 文件夹。

如果报价表路径或文件名发生变化，可以在终端中使用：

```bash
LONFRO_WORKBOOK="/完整路径/新版报价.xlsx" npm run build
```

## 正式上线前必须配置

编辑 `src/config.ts`：

- 将 `formspreeEndpoint` 替换为正式 Formspree 地址
- 填写 Google Analytics Measurement ID
- 填写 TikTok Pixel ID
- 如联系方式变化，在同一文件内更新

## 部署

执行构建后，把 `dist` 文件夹中的全部内容上传到支持静态网站的 Nginx、Apache、cPanel、海外虚拟主机或对象存储。

服务器应支持目录形式的静态页面，例如：

`/products/pro-26l-cooler/`

更新产品时继续使用同一域名，并保留 `data/product-slugs.json`，这样已经发布到 TikTok 的产品链接不会因重新导入而变化。

## 常用命令

```bash
npm install
npm run import:products
npm run dev
npm run build
```

## 目录说明

- `src/data/products.json`：网站构建使用的中英文公开产品数据
- `data/product-source-audit.json`：Excel 原始中文数据和价格核对记录，不会作为公开页面展示
- `data/product-slugs.json`：稳定产品链接注册表，不要删除
- `public/images/products`：从 Excel 自动提取并优化后的产品图
- `dist`：最终可上传服务器的静态网站
