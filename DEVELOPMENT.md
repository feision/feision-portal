# 🏗️ feision-portal 开发详情文档

> 本文档记录了项目开发过程中采用的所有技术策略、架构决策和踩坑经验，便于二次开发和复用。

---

## 📑 目录

- [架构概览](#-架构概览)
- [数据加载策略](#-数据加载策略)
- [缓存架构](#-缓存架构)
- [详情面板懒加载](#-详情面板懒加载)
- [详情自动预加载](#-详情自动预加载)
- [事件委托机制](#-事件委托机制)
- [ID 类型一致性策略](#-id-类型一致性策略)
- [CORS 跨域解决方案](#-cors-跨域解决方案)
- [DOM 更新策略](#-dom-更新策略)
- [搜索防抖](#-搜索防抖)
- [Cloudflare Worker 服务端代理](#-cloudflare-worker-服务端代理)
- [二次开发指南](#-二次开发指南)

---

## 🏛️ 架构概览

```
┌─────────────────────────────────────────────────────┐
│                    用户浏览器                         │
│                                                      │
│  ┌──────────┐    ┌──────────┐    ┌───────────────┐  │
│  │ 精简卡片  │ →  │ 点击展开  │ →  │ 懒加载详情面板 │  │
│  │ (首屏快)  │    │ (事件委托)│    │ (带缓存)      │  │
│  └──────────┘    └──────────┘    └───────────────┘  │
│        ↑               ↑                  ↑          │
│   localStorage    事件委托点击        localStorage     │
│   列表缓存 30min   永不失效          详情缓存 2h      │
└─────────────────────────────────────────────────────┘
                          │
              ┌───────────┴───────────┐
              │                       │
     ┌────────▼────────┐    ┌────────▼────────┐
     │  GitHub Pages    │    │ Cloudflare Worker │
     │  (CORS 直连)     │    │ (服务端代理)      │
     │                  │    │                   │
     │  直接请求 API    │    │  /api/repos       │
     │  + CORS Fallback │    │  /api/repos/:name │
     └────────┬────────┘    │  5min 内存缓存     │
              │              └────────┬──────────┘
              │                       │
              └───────────┬───────────┘
                          │
                ┌─────────▼─────────┐
                │   GitHub REST API  │
                │   v3 (json)        │
                └───────────────────┘
```

### 核心设计原则

| 原则 | 实现方式 |
|------|----------|
| **首屏快** | 精简卡片（无详情 HTML），10 条/页分批拉取 |
| **交互稳定** | 事件委托替代内联 onclick，DOM 重建不影响 |
| **数据复用** | 双层 localStorage 缓存（列表 + 详情） |
| **渐进增强** | 列表数据 → 立即渲染 → 后台静默刷新 → 详情按需加载 |
| **容错降级** | 三级 CORS fallback + 详情请求失败用列表数据降级 |

---

## 📡 数据加载策略

### 分页拉取 + 渐进式渲染

```
时间线:
  T+0s    请求第 1 页 (10条)  →  立即渲染卡片
  T+1s    请求第 2 页 (10条)  →  增量追加卡片（不重建已有 DOM）
  T+2s    请求第 3 页 (10条)  →  增量追加卡片
  ...
  完成    写入 localStorage 缓存
```

**为什么是 10 条/页？**

| per_page | 首屏时间 | API 请求数 | 适用场景 |
|-----------|----------|-----------|---------|
| 100 | ~3-5s | 1 | 仓库少（<100），不在意首屏速度 |
| 30 | ~1-2s | 2-4 | 默认平衡值 |
| **10** | **~0.5-1s** | 3-10 | **仓库多，首屏体验优先** |

10 条/页的代价是多几次 API 请求，但 GitHub API 认证后有 5000 次/小时的限额，即使 10 页也就 10 次请求，完全可接受。

### 关键代码（index.html）

```javascript
const PER_PAGE = 10;

async function loadFromNetwork() {
  // 第一页立即渲染
  const first = await fetchPage(1);
  allRepos = first.data;
  renderCards();        // 渲染精简卡片
  
  // 后续页增量追加
  let page = 2;
  while (/* has more */) {
    const next = await fetchPage(page);
    allRepos = allRepos.concat(next.data);
    appendNewCards();   // 只追加新卡片，不重建已有 DOM
    page++;
  }
}
```

---

## 💾 缓存架构

### 双层缓存设计

```
┌─────────────────────────────────────────────┐
│              localStorage                    │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │  gh_repos_feision (列表缓存)           │  │
│  │  TTL: 30 分钟                          │  │
│  │  数据: 全部仓库列表 JSON                │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │  gh_detail_feision (详情缓存)          │  │
│  │  TTL: 2 小时                           │  │
│  │  数据: { "repoId": repoDetailJSON }    │  │
│  └────────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

### 缓存读取流程

```
用户访问页面
    │
    ├─ 有列表缓存？ ─── 是 ──→ 秒开渲染 → 后台静默刷新（不阻塞 UI）
    │                                      │
    │                                      ├─ 数据无变化 → 什么都不做
    │                                      └─ 数据有变化 → smartUpdateCards()
    │
    └─ 无缓存 ──→ 网络分页拉取 → 渐进式渲染 → 写入缓存
```

### 静默刷新策略

缓存命中后，不会让用户等待，而是**立即展示缓存数据**，同时在后台静默刷新：

```javascript
async function silentRefresh() {
  if (isRefreshing) return;  // 防止并发刷新
  isRefreshing = true;
  
  const fresh = await fetchAllPages();
  
  // 智能对比：只在数据有变化时才更新 DOM
  const hasChanges = fresh.length !== allRepos.length ||
    fresh.some(r => {
      const old = allRepos.find(o => String(o.id) === String(r.id));
      return !old || old.updated_at !== r.updated_at;
    });
  
  if (hasChanges) {
    smartUpdateCards();  // 只增删差异卡片，不破坏已有 DOM
  }
  
  isRefreshing = false;
}
```

**为什么不用 `renderRepos(true)` 重建 DOM？** 因为如果用户正在操作（如展开了一个卡片），重建 DOM 会导致展开状态丢失。`smartUpdateCards()` 只增删差异部分。

### 详情缓存读取优先级

```
点击展开卡片
    │
    ├─ 1. 内存 repoMap（最快，0ms）
    │     └─ repoMap.get(id)._detailLoaded === true → 直接用
    │
    ├─ 2. localStorage 详情缓存（~1ms）
    │     └─ readDetailCache().get(id) → 命中则用
    │
    ├─ 3. 网络请求 /repos/{owner}/{repo}（~200ms）
    │     └─ 成功 → 写入内存 + localStorage
    │
    └─ 4. 降级：用列表数据（0ms）
          └─ 列表数据已有基本字段，可展示基本信息
```

---

## 🔍 详情面板懒加载

### 设计思路

传统做法是每个卡片在渲染时就生成完整的详情 HTML（包括 AI 提示词、标签、详情按钮等），这意味着：

- 30 个仓库 × 详情 HTML ≈ **额外 15KB+ DOM 节点**
- 用户可能只展开 1-2 个，95% 的 DOM 是浪费

**懒加载策略**：首屏只渲染精简卡片（名称 + 描述 + 统计），点击展开时才填充详情。

### 实现方式

```javascript
// 首屏渲染：卡片详情区为空
function buildCompactCardHTML(r, index) {
  return `
    <div class="project-card" data-repo-id="${rid}">
      <!-- 卡片头部、描述、统计 -->
      <div class="card-detail"></div>  <!-- 空容器，待填充 -->
    </div>`;
}

// 点击展开时才加载详情
function toggleCard(repoId) {
  card.classList.toggle('expanded');
  if (shouldExpand) {
    const detailEl = card.querySelector('.card-detail');
    if (!detailEl.dataset.loaded) {
      loadDetailIntoCard(repoId, card, detailEl);  // 懒加载
    }
  }
}

// 加载详情并填充
async function loadDetailIntoCard(repoId, card, detailEl) {
  const repo = repoMap.get(repoId);
  if (!repo._detailLoaded) {
    detailEl.innerHTML = '<spinner>加载详情中...</spinner>';
  }
  const detail = await fetchRepoDetail(repo);  // 带缓存
  fillDetailPanel(detailEl, detail);            // 填充 HTML
  detailEl.dataset.loaded = '1';                // 标记已加载
}
```

### 优势

| 指标 | 传统（全量渲染） | 懒加载 |
|------|-----------------|--------|
| 首屏 DOM 大小 | 大（含所有详情） | 小（仅卡片摘要） |
| 首屏渲染时间 | 慢 | 快 |
| 详情展示延迟 | 0ms | ~0-200ms（缓存命中则 0ms） |
| API 请求 | 只需列表接口 | 列表 + 按需请求详情 |

---

## 🔄 详情自动预加载

### 设计思路

v1.4 新增的策略。v1.3 的懒加载虽然节省了首屏资源，但用户点击展开详情时仍需等待网络请求（约 200ms-2s）。对于仓库数量不多的场景（<50 个），可以在列表加载完成后，**后台自动预加载所有详情数据**。

### 优势

| 场景 | 无预加载 | 有预加载 |
|------|---------|---------|
| 用户点击展开 | 需等待详情 API（0.2-2s） | 命中缓存，几乎 0ms |
| 首屏渲染速度 | 快（只加载列表） | 快（预加载不阻塞首屏） |
| API 请求次数 | 按需请求 | 全部请求（但间隔 200ms，不并发） |

### 实现方式

```javascript
// 列表加载完后自动触发
async function preloadAllDetails() {
  const unloaded = allRepos.filter(r => !repoMap.get(String(r.id))?._detailLoaded);
  for (const repo of unloaded) {
    await fetchRepoDetail(repo);    // 带缓存，已加载的跳过
    await new Promise(r => setTimeout(r, 200));  // 200ms 间隔，避免 API 限流
  }
}
```

**关键设计点**：
- **不阻塞 UI**：预加载是异步后台执行，用户可以正常操作
- **200ms 间隔**：避免并发请求打爆 GitHub API 限制
- **带缓存**：如果某个详情已被点击加载过，`fetchRepoDetail()` 直接返回缓存
- **动态填充**：如果用户在预加载过程中点击了某张卡片，预加载完成后会自动填充

### 立即显示"访问项目"按钮

v1.4 另一个优化：点击卡片展开时，不等详情 API 返回，**立即用列表数据显示"访问项目"按钮**。

```
用户点击卡片
    │
    ├─ 1. 立即展开面板 + 显示"访问项目"按钮（用列表数据，0ms）
    │     └─ showQuickActions()：只需 html_url，列表数据已有
    │
    └─ 2. 后台加载详情 API（0.2-2s）
          └─ fillDetailPanel()：替换为完整详情（语言、协议、标签、提示词等）
```

```javascript
function showQuickActions(detailEl, repo) {
  // 用列表数据（已有 html_url），不等详情 API
  detailEl.innerHTML = `
    <div class="detail-actions">
      <a class="detail-btn" href="${repo.html_url}">访问项目</a>
    </div>
    <div class="detail-loader">加载详情中...</div>`;
}
```

**为什么"访问项目"按钮可以用列表数据？** 因为列表 API 已返回 `html_url` 字段，而详情 API 返回的额外字段（`license`、`default_branch`、`topics` 等）只在详情面板中使用。"访问项目"按钮只需要 `html_url`，所以可以立即显示。

---

## 🖱️ 事件委托机制

### 问题

内联 `onclick="toggleCard(${r.id})"` 存在以下问题：

1. **DOM 重建后失效**：`innerHTML` 重建 DOM 时，新元素没有重新绑定事件
2. **时序问题**：新数据到达触发 `renderRepos()` 时，用户可能正在点击
3. **内存泄漏**：大量 `onclick` 绑定增加内存占用

### 解决方案：事件委托

将点击事件绑定在父容器 `#projects` 上，通过 `e.target.closest()` 找到目标卡片：

```javascript
const grid = document.getElementById('projects');

grid.addEventListener('click', (e) => {
  const card = e.target.closest('.project-card');
  if (!card) return;                         // 点击的不是卡片
  if (e.target.closest('.detail-actions')) return;  // 详情按钮区域不触发展开
  toggleCard(card.dataset.repoId);
});
```

### 优势

- **永不失效**：无论 DOM 怎么重建，事件委托始终有效
- **单绑定**：只需一个事件监听器，而非 N 个内联 onclick
- **自动适配**：新增的卡片自动可点击，无需额外绑定

---

## 🔑 ID 类型一致性策略

### Bug 背景

GitHub API 返回的 `id` 字段是**数字类型**（如 `890123456`），但：

- `data-repo-id="890123456"` → 属性值是**字符串**
- `onclick="toggleCard(890123456)"` → JS 表达式中是**数字**
- `expandedCardId === r.id` → `"890123456" === 890123456` → **false**

不同浏览器的隐式转换行为不一致，导致"有时候可以有时候不行"。

### 解决方案

**统一使用字符串 ID**，在所有入口点做 `String()` 转换：

```javascript
// 数据存储
function rebuildRepoMap() {
  repoMap.clear();
  for (const r of allRepos) {
    repoMap.set(String(r.id), r);  // key 是字符串
  }
}

// 卡片 HTML
function buildCompactCardHTML(r, index) {
  const rid = String(r.id);  // 确保字符串
  return `<div data-repo-id="${rid}">...</div>`;
}

// 事件处理
function toggleCard(repoId) {
  repoId = String(repoId);  // 入口处强制转换
  // ...
}

// 事件委托
grid.addEventListener('click', (e) => {
  const card = e.target.closest('.project-card');
  toggleCard(card.dataset.repoId);  // dataset 返回字符串，天然一致
});
```

### 经验总结

> **规则**：当 API 返回的 ID 是数字类型时，前端必须统一转换为字符串再使用。`dataset` 属性天然是字符串，配合事件委托可以完全避免类型不一致问题。

---

## 🌐 CORS 跨域解决方案

### GitHub API CORS 策略

| 访问来源 | CORS 状态 | 原因 |
|----------|-----------|------|
| `*.github.io` | ✅ 允许 | GitHub 白名单域名 |
| `localhost` | ❌ 阻止 | 不在白名单 |
| 第三方域名 | ❌ 阻止 | 不在白名单 |

### 三级 Fallback 机制

```javascript
const makeAttempts = (url) => [
  () => tryFetch(url),                                                    // 1. 直接请求
  () => tryFetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`),  // 2. allorigins 代理
  () => tryFetch(`https://corsproxy.io/?${encodeURIComponent(url)}`),              // 3. corsproxy 代理
];

async function fetchPage(page) {
  for (const attempt of makeAttempts(url)) {
    try {
      const res = await attempt();
      return await res.json();
    } catch (_) {}  // 失败则尝试下一个
  }
  throw new Error('所有代理均失败');
}
```

### 注意事项

- CORS 代理可能**丢失响应头**（如 `Link` header），导致分页判断失效
- 解决：同时用 `linkHeader.includes('rel="next"')` 和 `data.length === PER_PAGE` 判断
- 公共代理有速率限制，**生产环境建议用 Cloudflare Worker 方案**

---

## 🔄 DOM 更新策略

### 三种更新方式

| 场景 | 方法 | 说明 |
|------|------|------|
| 首次加载 / 搜索 / 筛选 | `renderCards()` | 完全重建 DOM |
| 分页追加新数据 | `appendNewCards()` | 只追加新卡片，不破坏已有 |
| 静默刷新数据变化 | `smartUpdateCards()` | 增删差异卡片，保留已有状态 |

### appendNewCards() — 增量追加

```javascript
function appendNewCards() {
  const existingIds = new Set();
  grid.querySelectorAll('.project-card').forEach(c => existingIds.add(c.dataset.repoId));
  
  for (const r of repos) {
    if (!existingIds.has(String(r.id))) {
      grid.appendChild(buildCardElement(r));  // 只追加新的
    }
  }
}
```

**关键**：遍历已有卡片的 `data-repo-id`，只追加不存在的新卡片，已有卡片（包括展开状态）完全不受影响。

### smartUpdateCards() — 智能更新

静默刷新后，如果数据有变化（新增/删除/更新了仓库），不能直接 `innerHTML` 重建，因为用户可能正在操作卡片。

```javascript
function smartUpdateCards() {
  // 1. 移除不存在的卡片
  grid.querySelectorAll('.project-card').forEach(card => {
    if (!newIds.has(card.dataset.repoId)) card.remove();
  });
  
  // 2. 追加新卡片到正确位置
  for (const r of repos) {
    if (!currentCardIds.includes(String(r.id))) {
      grid.insertBefore(newCard, nextCard);  // 按顺序插入
    }
  }
}
```

---

## 🔎 搜索防抖

```javascript
let searchTimer = null;
document.getElementById('search').addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    expandedCardId = null;
    renderCards();
  }, 200);  // 200ms 防抖
});
```

**为什么是 200ms？** 用户快速输入时，每次按键都触发 `renderCards()` 会导致：
- 大量 DOM 操作（30+ 卡片重建）
- 输入框卡顿
- 200ms 是人眼感知不到的延迟，但能过滤掉大量无效渲染

---

## ☁️ Cloudflare Worker 服务端代理

### 架构

```
用户浏览器 → Cloudflare Worker → GitHub API
                │
                ├── GET /           → 返回 HTML 页面
                ├── GET /api/repos  → 代理仓库列表 API（5min 内存缓存）
                └── GET /api/repos/:name → 代理仓库详情 API（10min 内存缓存）
```

### 与 index.html 的区别

| 特性 | index.html | worker.js |
|------|-----------|-----------|
| API 请求方式 | 前端直接请求 + CORS fallback | 服务端代理，无 CORS 问题 |
| 缓存位置 | localStorage（浏览器端） | 内存（Worker 端）+ localStorage |
| 详情加载 | 前端 CORS fallback 请求 | Worker 代理 `/api/repos/:name` |
| 部署平台 | GitHub Pages | Cloudflare Workers |

### Worker 新增的详情 API

```javascript
// 路由匹配：/api/repos/:repoName
const detailMatch = url.pathname.match(/^\/api\/repos\/([^/]+)$/);
if (detailMatch) {
  const data = await fetchGitHubRepoDetail(repoName, detailCache);
  return new Response(JSON.stringify(data), { ... });
}
```

Worker 端对每个 repo 详情也有 10 分钟内存缓存，避免重复请求 GitHub API。

---

## 🛠️ 二次开发指南

### 修改为你的项目

1. **修改用户名**：全局替换 `feision` 为你的 GitHub 用户名
2. **修改头像**：替换 `hero-avatar` 的 `src` 为你的头像 URL
3. **修改主题色**：修改 CSS 变量 `--accent` 和 `--accent-glow`

### 添加新功能

#### 添加新的语言颜色映射

```javascript
const LANG_COLORS = {
  // 现有映射...
  Elixir: '#6e4a7e',   // 新增
  Haskell: '#5e5086',  // 新增
};
```

#### 添加新的筛选条件

```javascript
// 1. HTML 中添加按钮
<button class="filter-btn" data-filter="starred">星标</button>

// 2. JS 中添加筛选逻辑
function getFilteredRepos() {
  return allRepos.filter(r => {
    const matchFilter = currentFilter === 'all' ||
      (currentFilter === 'own' && !r.fork) ||
      (currentFilter === 'forked' && r.fork) ||
      (currentFilter === 'starred' && r.stargazers_count > 0);  // 新增
    // ...
  });
}
```

#### 修改缓存 TTL

```javascript
const CACHE_TTL = 30 * 60 * 1000;       // 列表缓存：30 分钟
const DETAIL_CACHE_TTL = 2 * 60 * 60 * 1000;  // 详情缓存：2 小时
```

#### 修改分页大小

```javascript
const PER_PAGE = 10;  // 改大（如 30）= 少请求但慢首屏
                      // 改小（如 5）= 快首屏但多请求
```

### 部署清单

| 平台 | 步骤 | 文件 |
|------|------|------|
| GitHub Pages | 推送到 main 分支，启用 Legacy 模式 Pages | `index.html` |
| Cloudflare Worker | 粘贴代码到 Worker 编辑器 | `worker.js` |
| 本地 | 双击打开或 `python -m http.server` | `index.html` |

---

## 📌 关键经验总结

1. **ID 类型一致性**：API 返回数字 ID 时，前端必须统一转字符串
2. **事件委托 > 内联 onclick**：DOM 重建场景下事件委托是唯一可靠方案
3. **懒加载详情**：首屏只渲染摘要，点击展开才加载详情，减少 80%+ DOM
4. **增量 DOM 更新**：分页追加和静默刷新不应破坏已有 DOM 状态
5. **缓存命中 + 静默刷新**：先展示缓存，后台刷新对比差异后按需更新
6. **CORS fallback 链**：直连 → 代理1 → 代理2，逐级降级
7. **搜索防抖 200ms**：过滤无效渲染，保证输入流畅
8. **GitHub Pages 用 Legacy 模式**：API 默认创建 Workflow 模式会导致 404

---

*文档版本：v1.4 | 最后更新：2026-04-08 | 作者：GLM-5.1 + CodeBuddy CN*
