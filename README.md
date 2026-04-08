# 🚀 feision-portal

> **v1.3** — [更新日志](#-更新日志)

一个基于 GitHub API 的个人项目导航落地页，自动展示你的 GitHub 仓库，支持搜索筛选、详情展开、AI 提示词复制，深色主题，零依赖纯前端实现。

![version](https://img.shields.io/badge/version-1.3-blue) ![preview](https://img.shields.io/badge/构建状态-成功-brightgreen) ![license](https://img.shields.io/badge/license-MIT-blue)

## ✨ 特性

- **实时数据** — 通过 GitHub API 自动拉取仓库信息，无需手动维护
- **搜索筛选** — 支持按项目名/描述/语言搜索，可按"全部/原创/Fork"筛选
- **详情展开** — 点击卡片展开详情面板，懒加载按需获取，不浪费首屏资源
- **AI 提示词** — 一键复制项目信息提示词，直接粘贴给 AI 解读项目
- **深色主题** — 专业的暗色背景搭配 indigo 强调色
- **动画交互** — 卡片悬浮上移 + 辉光效果，渐入加载动画
- **响应式** — 移动端自动切换为单列布局
- **CORS Fallback** — 内置三级代理机制，本地和第三方平台均可正常访问
- **跨平台部署** — 支持 GitHub Pages / Cloudflare Worker / Vercel / 本地等任意环境
- **双层缓存** — 列表缓存 30min + 详情缓存 2h，秒开体验
- **零依赖** — 纯 HTML/CSS/JS 单文件，无需构建工具，性能极佳

## 📸 预览

![feision-portal preview](https://feision.github.io/feision-portal/)

## 🛠 快速开始

### 1. Fork 或克隆本项目

```bash
git clone https://github.com/feision/feision-portal.git
cd feision-portal
```

### 2. 修改配置

打开 `index.html`，找到以下配置项并修改为你自己的 GitHub 用户名：

```javascript
const GITHUB_USERNAME = 'feision';  // 👈 改成你的 GitHub 用户名
```

同时修改 HTML 中头像图片的 `src` 和 `alt` 属性：

```html
<img class="hero-avatar" src="https://avatars.githubusercontent.com/u/你的用户ID?v=4" alt="你的用户名">
```

以及 Hero 区域的标题和 GitHub 主页链接：

```html
<h1>你的用户名</h1>
<a class="hero-link" href="https://github.com/你的用户名" target="_blank" rel="noopener">
```

### 3. 本地预览

直接双击打开 `index.html` 即可本地预览。页面内置了 CORS 代理 fallback 机制，本地访问也能正常加载数据。

如果仍遇到跨域问题，可用本地服务器：

```bash
# Python
python -m http.server 3000

# Node.js
npx serve -l 3000
```

然后访问 http://localhost:3000

### 4. 部署到 GitHub Pages

#### Step 1：创建 GitHub 仓库

在 GitHub 上新建一个公开仓库，名称随意（如 `my-portal`），然后将代码推送上去：

```bash
git init
git add .
git commit -m "feat: init GitHub projects portal"
git branch -M main
git remote add origin https://github.com/你的用户名/你的仓库名.git
git push -u origin main
```

#### Step 2：启用 GitHub Pages

进入仓库的 **Settings → Pages** 页面：

- **Source** 选择 `Deploy from a branch`
- **Branch** 选择 `main`，路径选 `/ (root)`
- 点击 **Save**

等待 1-2 分钟，你的导航页就会上线：

```
https://你的用户名.github.io/你的仓库名/
```

#### Step 3（可选）：通过 API 启用 Pages

如果你想用命令行操作，也可以通过 GitHub API 启用 Pages：

```bash
# 替换 YOUR_TOKEN 和 YOUR_USERNAME
curl -X POST \
  -H "Authorization: token YOUR_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  https://api.github.com/repos/YOUR_USERNAME/YOUR_REPO/pages \
  -d '{"build_type":"legacy","source":{"branch":"main","path":"/"}}'
```

或用 Python：

```python
import urllib.request, json

token = "YOUR_TOKEN"
repo = "YOUR_USERNAME/YOUR_REPO"

data = json.dumps({
    "build_type": "legacy",
    "source": {"branch": "main", "path": "/"}
}).encode()

req = urllib.request.Request(
    f"https://api.github.com/repos/{repo}/pages",
    data=data,
    headers={
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github.v3+json",
        "Content-Type": "application/json"
    },
    method="POST"
)

urllib.request.urlopen(req)
```

### 5. 部署到 Cloudflare Workers

本项目提供了 `worker.js`，可直接部署到 Cloudflare Workers，**在服务端代理 GitHub API，彻底解决 CORS 跨域问题**。

#### 方式 A：Cloudflare Dashboard 部署（推荐）

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 进入 **Workers & Pages → Create application → Create Worker**
3. 给 Worker 起个名字（如 `feision-portal`），点击 **Deploy**
4. 点击 **Edit code**，删除默认代码，将 `worker.js` 的内容粘贴进去
5. 修改第 9 行的 `GITHUB_USERNAME` 为你的用户名：
   ```javascript
   const GITHUB_USERNAME = '你的用户名';
   ```
6. 点击 **Save and deploy**
7. 访问你的 Worker URL：`https://你的worker名.你的子域名.workers.dev`

#### 方式 B：Wrangler CLI 部署

```bash
# 安装 Wrangler
npm install -g wrangler

# 登录
wrangler login

# 创建项目目录
mkdir feision-portal-worker && cd feision-portal-worker

# 复制 worker.js 到目录中
cp /path/to/worker.js ./worker.js

# 创建 wrangler.toml
cat > wrangler.toml << EOF
name = "feision-portal"
main = "worker.js"
compatibility_date = "2024-01-01"
EOF

# 部署
wrangler deploy
```

#### （可选）配置 GitHub Token 提高 API 速率限制

未认证的 GitHub API 请求限制为 60 次/小时。如果访问量大，可以配置 Token 提升到 5000 次/小时：

1. 在 [GitHub Settings → Tokens](https://github.com/settings/tokens) 创建一个 Token（只需 `public_repo` 权限）
2. 在 Cloudflare Dashboard 的 Worker 设置中添加环境变量：
   - 变量名：`GITHUB_TOKEN`
   - 变量值：你的 Token
3. 或在 `wrangler.toml` 中配置：
   ```toml
   [vars]
   GITHUB_TOKEN = "ghp_your_token_here"
   ```

> 💡 **Worker 版本的优势**：
> - 服务端代理 GitHub API，无 CORS 问题
> - 内置 5 分钟缓存，减少 API 调用
> - 支持 GitHub Token 环境变量，安全且可提高速率限制
> - 自带全球 CDN，访问速度极快

## ⚠️ 踩坑记录

以下是部署过程中遇到的问题及解决方案，希望能帮你避开这些坑。

### 问题 1：GitHub Pages 启用后访问 404

**现象**：Pages 已启用，`https://xxx.github.io/xxx/` 返回 404，持续数分钟甚至更久。

**原因**：通过 API 创建 GitHub Pages 时，`build_type` 默认为 `workflow`，这要求仓库中存在 GitHub Actions 工作流文件（如 `.github/workflows/pages.yml`）才能触发部署。如果仓库里没有工作流文件，Pages 永远不会构建，导致一直 404。

**解决方案**：将 `build_type` 改为 `legacy`，直接从分支读取静态文件部署，无需工作流。

```bash
# 修改 Pages 构建模式为 legacy
curl -X PUT \
  -H "Authorization: token YOUR_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  https://api.github.com/repos/YOUR_USERNAME/YOUR_REPO/pages \
  -d '{"build_type":"legacy","source":{"branch":"main","path":"/"}}'
```

修改后，手动触发一次构建：

```bash
curl -X POST \
  -H "Authorization: token YOUR_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  https://api.github.com/repos/YOUR_USERNAME/YOUR_REPO/pages/builds
```

检查构建状态：

```bash
curl -H "Authorization: token YOUR_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  https://api.github.com/repos/YOUR_USERNAME/YOUR_REPO/pages/builds/latest
```

返回 `"status": "built"` 即表示构建成功，页面即可正常访问。

### 问题 2：两种 Pages 构建模式的区别

| 模式 | 说明 | 适用场景 |
|------|------|----------|
| `legacy` | 直接从分支读取静态文件部署 | 纯静态 HTML/CSS/JS 项目（**本项目**） |
| `workflow` | 需要 GitHub Actions 工作流触发构建 | Jekyll、Hugo、Next.js 等需要构建步骤的项目 |

**建议**：如果你的项目是纯静态文件（如本项目），**务必使用 `legacy` 模式**，省去配置工作流的麻烦。

### 问题 3：GitHub API 创建仓库后需要配置 Git 认证

**现象**：`git push` 时提示认证失败。

**解决方案**：使用 Personal Access Token (PAT) 作为密码：

```bash
# 方式一：在 remote URL 中嵌入 token（不推荐长期使用）
git remote add origin https://YOUR_TOKEN@github.com/用户名/仓库.git

# 方式二：推送时输入用户名和 token
git push -u origin main
# Username: 你的GitHub用户名
# Password: ghp_xxxxxxxxxxxx（使用 PAT，不是 GitHub 密码）
```

> ⚠️ **安全提醒**：不要将 token 提交到代码仓库中！推完成后应将 remote URL 中的 token 移除：
> ```bash
> git remote set-url origin https://github.com/用户名/仓库.git
> ```

### 问题 4：本地访问或部署到 Cloudflare Worker 时项目列表加载失败

**现象**：部署在 GitHub Pages 上可以正常显示项目列表，但本地打开 `index.html` 或部署到 Cloudflare Worker / Vercel / 其他平台时，页面显示"加载失败，请稍后刷新重试"。

**原因**：这是 **CORS（跨域资源共享）限制** 导致的。GitHub API 对不同来源的请求有不同的 CORS 策略：

| 访问来源 | CORS 状态 | 说明 |
|----------|-----------|------|
| `*.github.io` | ✅ 允许 | GitHub Pages 域名在白名单中 |
| `localhost` | ❌ 阻止 | 本地开发不在白名单中 |
| Cloudflare Worker | ❌ 阻止 | 第三方域名不在白名单中 |
| Vercel / Netlify 等 | ❌ 阻止 | 第三方域名不在白名单中 |

浏览器在遇到 CORS 限制时会直接阻止 `fetch` 请求，导致数据获取失败。

**解决方案**：本项目已内置 CORS 代理 fallback 机制，代码会按以下顺序尝试获取数据：

1. **直接请求** GitHub API（github.io 等白名单域名可用）
2. **allorigins.win 代理**（绕过 CORS 限制）
3. **corsproxy.io 代理**（备用代理）

如果你需要自行部署到非 GitHub Pages 平台，还可以选择：

**方案 A：自建 CORS 代理**（推荐，最稳定）

在 Cloudflare Worker 中创建一个代理：

```javascript
export default {
  async fetch(request) {
    const url = new URL(request.url);
    const targetUrl = url.searchParams.get('url');

    if (!targetUrl) {
      return new Response('Missing url parameter', { status: 400 });
    }

    const response = await fetch(targetUrl, {
      headers: { 'Accept': 'application/vnd.github.v3+json' }
    });

    return new Response(response.body, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      }
    });
  }
}
```

然后在 `index.html` 中将 API 请求地址改为你的 Worker 地址。

**方案 B：使用 GitHub Token 认证请求**

在 fetch 请求中添加 `Authorization` header，GitHub API 对认证请求的 CORS 策略更宽松：

```javascript
const res = await fetch(API_URL, {
  headers: {
    'Accept': 'application/vnd.github.v3+json',
    'Authorization': 'token YOUR_GITHUB_TOKEN'
  }
});
```

> ⚠️ **注意**：Token 会暴露在前端代码中，仅适用于私有部署或测试环境，**不要在公开仓库中使用**。

**方案 C：部署在 GitHub Pages 上**（最简单）

直接部署在 GitHub Pages 上，无需处理 CORS 问题，这是最推荐的方式。

## 📝 自定义指南

### 修改主题色

在 `index.html` 的 `:root` 中修改 CSS 变量：

```css
:root {
  --accent: #6366f1;        /* 主强调色，改为任何你喜欢的颜色 */
  --accent-glow: rgba(99, 102, 241, 0.15);  /* 对应的辉光色 */
  --bg-primary: #0a0a0f;    /* 背景色 */
}
```

### 添加语言颜色映射

在 `LANG_COLORS` 对象中添加更多编程语言的颜色：

```javascript
const LANG_COLORS = {
  JavaScript: '#f1e05a',
  Python: '#3572A5',
  // 添加更多...
  YourLang: '#hexcolor',
};
```

## 📋 更新日志

### v1.3 (2026-04-08)

- 🆕 新增详情面板懒加载：点击卡片展开详情，首次展开才请求 API，不浪费首屏资源
- 🆕 新增 AI 提示词一键复制：展开详情面板后可复制项目信息提示词给 AI 解读
- 🆕 新增"访问项目"按钮：详情面板中直接跳转 GitHub 项目
- 🆕 新增双层 localStorage 缓存：列表缓存 30 分钟 + 详情缓存 2 小时
- 🆕 新增开发详情文档 `DEVELOPMENT.md`：完整记录技术策略、架构决策和二次开发指南
- 🔧 修复详情面板点击不稳定 bug：根因是 `r.id` 数字/字符串类型不一致
- 🔧 修复静默刷新后展开状态丢失：改为 `smartUpdateCards()` 智能差异更新
- 🔧 事件委托替代内联 onclick：无论 DOM 怎么重建，点击事件永不失效
- 🔧 分页大小从 30 优化为 10：首屏渲染速度提升 3x
- 🔧 Worker 新增 `/api/repos/:name` 详情代理接口
- 🔧 Worker 前端同步升级：懒加载详情 + 事件委托 + 双层缓存

### v1.2 (2026-04-08)

- 🆕 新增 Cloudflare Worker 版本 (`worker.js`)，服务端代理 GitHub API 彻底解决 CORS
- 🆕 新增 CORS 代理 fallback 机制（index.html），本地和第三方平台可正常加载数据
- 🆕 新增 allorigins.win / corsproxy.io 双重代理 fallback
- 📝 新增 Cloudflare Worker 部署教程（Dashboard + Wrangler CLI）
- 📝 新增踩坑记录：CORS 跨域限制问题及解决方案
- 📝 新增自建 CORS 代理（Cloudflare Worker）教程
- 🔧 Worker 版本内置 5 分钟 API 缓存 + GitHub Token 环境变量支持
- 🔧 优化错误提示信息，区分 CORS 限制场景

### v1.1 (2026-04-08)

- 📝 新增完整部署教程
- 📝 新增踩坑记录：GitHub Pages 404 问题、构建模式区别、Git 认证配置

### v1.0 (2026-04-08)

- 🎉 初始版本发布
- ✅ GitHub API 实时拉取仓库数据
- ✅ 搜索筛选功能
- ✅ 深色主题 + 动画交互
- ✅ 响应式布局

## 🧰 技术栈 & 开发环境

### 技术栈

| 类别 | 技术 | 说明 |
|------|------|------|
| 前端 | HTML5 / CSS3 / ES6+ | 纯原生，零框架零依赖 |
| 数据源 | GitHub REST API v3 | 实时拉取仓库信息 |
| CORS 代理 | allorigins.win / corsproxy.io | index.html 的 fallback 方案 |
| 服务端代理 | Cloudflare Workers | worker.js 版本，彻底解决 CORS |
| 部署 | GitHub Pages (Legacy 模式) | 静态文件直接部署，无需构建 |
| 部署 | Cloudflare Workers | 服务端渲染 + API 代理 |

### 开发环境

| 工具 | 版本 / 说明 |
|------|-------------|
| 操作系统 | Windows Server (win32) |
| 编辑器 | CodeBuddy CN (AI IDE) |
| AI 模型 | GLM-5.1 (由 CodeBuddy 驱动) |
| 本地服务器 | Python `http.server` / `npx serve` |
| 版本控制 | Git |
| 包管理 | 无 (零依赖项目) |
| GitHub 交互 | GitHub REST API + Python urllib |

### 所需工具

本项目是纯静态单文件项目，**无需安装任何依赖**，你只需要：

- **浏览器** — 任意现代浏览器（Chrome / Firefox / Safari / Edge）
- **文本编辑器** — 任意编辑器即可修改 `index.html` 或 `worker.js`
- **Git**（可选）— 用于版本管理和推送到 GitHub
- **GitHub 账号**（可选）— 用于部署到 GitHub Pages
- **Cloudflare 账号**（可选）— 用于部署 Worker 版本

### 项目文件说明

| 文件 | 说明 |
|------|------|
| `index.html` | 纯静态版本，适用于 GitHub Pages 部署，内置 CORS fallback + 懒加载详情 + 双层缓存 |
| `worker.js` | Cloudflare Worker 版本，服务端代理 API，彻底解决 CORS，支持详情代理 |
| `README.md` | 项目文档，包含部署教程和踩坑记录 |
| `DEVELOPMENT.md` | 开发详情文档，记录技术策略和二次开发指南 |

如果你想用命令行管理 GitHub Pages：

- **Python 3.x** — 用于调用 GitHub API
- **GitHub Personal Access Token** — 用于 API 认证（需 `repo` 权限）

### AI 开发备注

本项目由 **GLM-5.1** AI 模型辅助开发，使用 **CodeBuddy CN** AI IDE 作为开发环境。整个项目从设计到部署全流程由 AI 完成，包括：

- 页面设计与样式编写
- GitHub API 集成与数据渲染
- CORS 跨域问题的诊断与修复
- GitHub 仓库创建、Pages 部署与构建
- 踩坑记录文档的整理

> 如果你也想用 AI 辅助开发，推荐使用 CodeBuddy CN，它内置了 CloudBase MCP 等工具链，可以一站式完成编码、调试和部署。

## 📄 License

[MIT](LICENSE) © feision
