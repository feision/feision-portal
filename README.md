# 🚀 feision-portal

一个基于 GitHub API 的个人项目导航落地页，自动展示你的 GitHub 仓库，支持搜索筛选，深色主题，零依赖纯前端实现。

![preview](https://img.shields.io/badge/构建状态-成功-brightgreen) ![license](https://img.shields.io/badge/license-MIT-blue)

## ✨ 特性

- **实时数据** — 通过 GitHub API 自动拉取仓库信息，无需手动维护
- **搜索筛选** — 支持按项目名/描述/语言搜索，可按"全部/原创/Fork"筛选
- **深色主题** — 专业的暗色背景搭配 indigo 强调色
- **动画交互** — 卡片悬浮上移 + 辉光效果，渐入加载动画
- **响应式** — 移动端自动切换为单列布局
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

由于使用了 GitHub API（浏览器 fetch），直接双击打开 `index.html` 即可本地预览，无需任何服务器。如果遇到跨域问题，可用本地服务器：

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

## 📄 License

[MIT](LICENSE) © feision
