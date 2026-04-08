/**
 * feision-portal - Cloudflare Worker 版本
 * 
 * 在服务端代理 GitHub API 请求，彻底解决 CORS 跨域问题
 * 部署方式：在 Cloudflare Dashboard 创建 Worker，粘贴此代码即可
 * 
 * 配置项：修改下方 GITHUB_USERNAME 为你的 GitHub 用户名
 */

const GITHUB_USERNAME = 'feision';

const LANG_COLORS = {
  JavaScript: '#f1e05a', Python: '#3572A5', HTML: '#e34c26', CSS: '#563d7c',
  TypeScript: '#3178c6', Go: '#00ADD8', Rust: '#dea584', Java: '#b07219',
  'C++': '#f34b7d', C: '#555555', Shell: '#89e051', Vue: '#41b883',
  Swift: '#F05138', Kotlin: '#A97BFF', Ruby: '#701516', PHP: '#4F5D95',
  Dart: '#00B4AB', Scala: '#c22d40', Lua: '#000080', R: '#198CE7',
};
const FALLBACK_LANG_COLOR = '#8b8b8b';

// ============ HTML 页面 ============
function getHTML() {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${GITHUB_USERNAME} | GitHub Projects</title>
  <meta name="description" content="${GITHUB_USERNAME} 的 GitHub 项目导航页">
  <link rel="icon" href="https://avatars.githubusercontent.com/${GITHUB_USERNAME}">
  <style>
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
    :root {
      --bg-primary: #0a0a0f; --bg-secondary: #12121a; --bg-card: #16161f;
      --bg-card-hover: #1c1c28; --border: #2a2a3a; --text-primary: #e8e8f0;
      --text-secondary: #8888a0; --accent: #6366f1;
      --accent-glow: rgba(99, 102, 241, 0.15); --radius: 16px;
      --transition: 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    html { scroll-behavior: smooth; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans SC', sans-serif;
      background: var(--bg-primary); color: var(--text-primary);
      min-height: 100vh; overflow-x: hidden; line-height: 1.6;
    }
    .bg-glow {
      position: fixed; top: -20%; left: 50%; transform: translateX(-50%);
      width: 800px; height: 600px;
      background: radial-gradient(ellipse, rgba(99,102,241,0.08) 0%, transparent 70%);
      pointer-events: none; z-index: 0;
    }
    .bg-grid {
      position: fixed; inset: 0;
      background-image: linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px);
      background-size: 60px 60px; pointer-events: none; z-index: 0;
    }
    .container { position: relative; z-index: 1; max-width: 1200px; margin: 0 auto; padding: 0 24px; }
    .hero { padding: 80px 0 40px; text-align: center; }
    .hero-avatar {
      width: 96px; height: 96px; border-radius: 50%; border: 3px solid var(--accent);
      box-shadow: 0 0 30px var(--accent-glow); margin-bottom: 20px; transition: var(--transition);
    }
    .hero-avatar:hover { transform: scale(1.05); box-shadow: 0 0 50px var(--accent-glow); }
    .hero h1 {
      font-size: 2.5rem; font-weight: 800; letter-spacing: -0.02em;
      background: linear-gradient(135deg, #e8e8f0 0%, #6366f1 100%);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent;
      background-clip: text; margin-bottom: 8px;
    }
    .hero p { color: var(--text-secondary); font-size: 1.1rem; margin-bottom: 24px; }
    .hero-links { display: flex; justify-content: center; gap: 16px; }
    .hero-link {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 10px 24px; border-radius: 12px; background: var(--bg-card);
      border: 1px solid var(--border); color: var(--text-primary);
      text-decoration: none; font-size: 0.9rem; font-weight: 500; transition: var(--transition);
    }
    .hero-link:hover { background: var(--bg-card-hover); border-color: var(--accent); box-shadow: 0 0 20px var(--accent-glow); }
    .hero-link svg { width: 18px; height: 18px; fill: currentColor; }
    .stats { display: flex; justify-content: center; gap: 40px; padding: 24px 0; margin-bottom: 16px; }
    .stat-item { text-align: center; }
    .stat-value { font-size: 1.8rem; font-weight: 800; color: var(--accent); }
    .stat-label { font-size: 0.8rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.1em; }
    .toolbar { display: flex; gap: 12px; margin-bottom: 32px; flex-wrap: wrap; align-items: center; }
    .search-box { flex: 1; min-width: 240px; position: relative; }
    .search-box svg {
      position: absolute; left: 14px; top: 50%; transform: translateY(-50%);
      width: 18px; height: 18px; color: var(--text-secondary);
    }
    .search-box input {
      width: 100%; padding: 12px 16px 12px 42px; border-radius: 12px;
      border: 1px solid var(--border); background: var(--bg-card);
      color: var(--text-primary); font-size: 0.95rem; outline: none; transition: var(--transition);
    }
    .search-box input::placeholder { color: var(--text-secondary); }
    .search-box input:focus { border-color: var(--accent); box-shadow: 0 0 20px var(--accent-glow); }
    .filter-btn {
      padding: 10px 20px; border-radius: 12px; border: 1px solid var(--border);
      background: var(--bg-card); color: var(--text-secondary); font-size: 0.85rem;
      cursor: pointer; transition: var(--transition); font-weight: 500;
    }
    .filter-btn:hover, .filter-btn.active { background: var(--accent); color: #fff; border-color: var(--accent); }
    .projects-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
      gap: 20px; padding-bottom: 80px;
    }
    .project-card {
      background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius);
      padding: 28px; text-decoration: none; color: inherit; display: flex;
      flex-direction: column; gap: 16px; transition: var(--transition);
      position: relative; overflow: hidden; opacity: 0; transform: translateY(20px);
      animation: fadeInUp 0.5s ease forwards;
    }
    .project-card::before {
      content: ''; position: absolute; inset: 0;
      background: linear-gradient(135deg, var(--accent-glow) 0%, transparent 60%);
      opacity: 0; transition: var(--transition);
    }
    .project-card:hover {
      transform: translateY(-4px); border-color: var(--accent);
      box-shadow: 0 8px 40px rgba(0,0,0,0.3), 0 0 30px var(--accent-glow);
    }
    .project-card:hover::before { opacity: 1; }
    .card-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; position: relative; z-index: 1; }
    .card-icon {
      width: 40px; height: 40px; border-radius: 10px; background: var(--bg-secondary);
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .card-icon svg { width: 20px; height: 20px; }
    .card-title-group { flex: 1; min-width: 0; }
    .card-title { font-size: 1.1rem; font-weight: 700; margin-bottom: 2px; word-break: break-word; }
    .card-fork-badge {
      display: inline-block; font-size: 0.65rem; padding: 2px 8px; border-radius: 6px;
      background: rgba(99,102,241,0.15); color: var(--accent); font-weight: 600;
      letter-spacing: 0.05em; vertical-align: middle; margin-left: 8px;
    }
    .card-desc {
      font-size: 0.9rem; color: var(--text-secondary); line-height: 1.5;
      position: relative; z-index: 1;
      display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
    }
    .card-footer {
      display: flex; align-items: center; gap: 16px; flex-wrap: wrap;
      position: relative; z-index: 1; margin-top: auto;
    }
    .card-lang { display: flex; align-items: center; gap: 6px; font-size: 0.8rem; color: var(--text-secondary); }
    .lang-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
    .card-stat { display: flex; align-items: center; gap: 4px; font-size: 0.8rem; color: var(--text-secondary); }
    .card-stat svg { width: 14px; height: 14px; fill: currentColor; }
    .card-date { margin-left: auto; font-size: 0.75rem; color: var(--text-secondary); }
    .empty-state { grid-column: 1 / -1; text-align: center; padding: 60px 20px; color: var(--text-secondary); }
    .empty-state svg { width: 48px; height: 48px; margin-bottom: 16px; opacity: 0.4; }
    .empty-state p { font-size: 1.1rem; }
    footer { text-align: center; padding: 40px 0; color: var(--text-secondary); font-size: 0.8rem; position: relative; z-index: 1; }
    footer a { color: var(--accent); text-decoration: none; }
    .loading { display: flex; justify-content: center; align-items: center; padding: 80px 0; }
    .spinner {
      width: 40px; height: 40px; border: 3px solid var(--border);
      border-top-color: var(--accent); border-radius: 50%; animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes fadeInUp { to { opacity: 1; transform: translateY(0); } }
    @media (max-width: 768px) {
      .hero h1 { font-size: 1.8rem; } .hero { padding: 48px 0 24px; }
      .projects-grid { grid-template-columns: 1fr; } .stats { gap: 24px; } .stat-value { font-size: 1.4rem; }
    }
    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
    }
  </style>
</head>
<body>
  <div class="bg-glow"></div>
  <div class="bg-grid"></div>
  <div class="container">
    <header class="hero">
      <img class="hero-avatar" src="https://avatars.githubusercontent.com/${GITHUB_USERNAME}" alt="${GITHUB_USERNAME}" loading="lazy">
      <h1>${GITHUB_USERNAME}</h1>
      <p>Open Source Projects & Code Collection</p>
      <div class="hero-links">
        <a class="hero-link" href="https://github.com/${GITHUB_USERNAME}" target="_blank" rel="noopener">
          <svg viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
          GitHub 主页
        </a>
      </div>
    </header>
    <div class="stats" id="stats"></div>
    <div class="toolbar">
      <div class="search-box">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input type="text" id="search" placeholder="搜索项目..." autocomplete="off">
      </div>
      <button class="filter-btn active" data-filter="all">全部</button>
      <button class="filter-btn" data-filter="own">原创</button>
      <button class="filter-btn" data-filter="forked">Fork</button>
    </div>
    <div class="projects-grid" id="projects">
      <div class="loading"><div class="spinner"></div></div>
    </div>
    <footer>
      Powered by <a href="https://github.com/${GITHUB_USERNAME}" target="_blank" rel="noopener">${GITHUB_USERNAME}</a> · Data from GitHub API · Deployed on Cloudflare Workers
    </footer>
  </div>
  <script>
    const LANG_COLORS = ${JSON.stringify(LANG_COLORS)};
    const FALLBACK_LANG_COLOR = '${FALLBACK_LANG_COLOR}';
    let allRepos = [];
    let currentFilter = 'all';

    async function fetchRepos() {
      try {
        const res = await fetch('/api/repos');
        if (!res.ok) throw new Error('API 请求失败');
        allRepos = await res.json();
        renderStats();
        renderRepos();
      } catch (err) {
        document.getElementById('projects').innerHTML =
          '<div class="empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"/></svg><p>加载失败，请稍后刷新重试</p></div>';
      }
    }

    function renderStats() {
      const total = allRepos.length;
      const own = allRepos.filter(r => !r.fork).length;
      const stars = allRepos.reduce((s, r) => s + r.stargazers_count, 0);
      const forks = allRepos.reduce((s, r) => s + r.forks_count, 0);
      document.getElementById('stats').innerHTML =
        '<div class="stat-item"><div class="stat-value">' + total + '</div><div class="stat-label">Repositories</div></div>' +
        '<div class="stat-item"><div class="stat-value">' + own + '</div><div class="stat-label">Original</div></div>' +
        '<div class="stat-item"><div class="stat-value">' + stars + '</div><div class="stat-label">Stars</div></div>' +
        '<div class="stat-item"><div class="stat-value">' + forks + '</div><div class="stat-label">Forks</div></div>';
    }

    function getFilteredRepos() {
      const q = document.getElementById('search').value.toLowerCase().trim();
      return allRepos.filter(function(r) {
        var matchFilter = currentFilter === 'all' || (currentFilter === 'own' && !r.fork) || (currentFilter === 'forked' && r.fork);
        var matchSearch = !q || r.name.toLowerCase().includes(q) || (r.description || '').toLowerCase().includes(q) || (r.language || '').toLowerCase().includes(q);
        return matchFilter && matchSearch;
      });
    }

    function renderRepos() {
      var repos = getFilteredRepos();
      var grid = document.getElementById('projects');
      if (!repos.length) {
        grid.innerHTML = '<div class="empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"/></svg><p>没有找到匹配的项目</p></div>';
        return;
      }
      grid.innerHTML = repos.map(function(r, i) {
        var langColor = LANG_COLORS[r.language] || FALLBACK_LANG_COLOR;
        var date = new Date(r.updated_at);
        var dateStr = date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
        return '<a class="project-card" href="' + r.html_url + '" target="_blank" rel="noopener" style="animation-delay:' + Math.min(i * 0.06, 0.6) + 's">' +
          '<div class="card-header"><div class="card-icon"><svg viewBox="0 0 24 24" fill="none" stroke="' + langColor + '" stroke-width="2" stroke-linecap="round"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg></div>' +
          '<div class="card-title-group"><div class="card-title">' + r.name + (r.fork ? '<span class="card-fork-badge">FORK</span>' : '') + '</div></div></div>' +
          '<p class="card-desc">' + (r.description || '暂无描述') + '</p>' +
          '<div class="card-footer">' +
          (r.language ? '<span class="card-lang"><span class="lang-dot" style="background:' + langColor + '"></span>' + r.language + '</span>' : '') +
          '<span class="card-stat"><svg viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>' + r.stargazers_count + '</span>' +
          '<span class="card-stat"><svg viewBox="0 0 24 24"><path d="M8.5 2L19 12.5 8.5 23l-2-2 8.5-8.5L6.5 4l2-2z" transform="rotate(90 12 12)"/></svg>' + r.forks_count + '</span>' +
          '<span class="card-date">' + dateStr + ' 更新</span></div></a>';
      }).join('');
    }

    document.getElementById('search').addEventListener('input', renderRepos);
    document.querySelectorAll('.filter-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        document.querySelectorAll('.filter-btn').forEach(function(b) { b.classList.remove('active'); });
        btn.classList.add('active');
        currentFilter = btn.dataset.filter;
        renderRepos();
      });
    });

    fetchRepos();
  </script>
</body>
</html>`;
}

// ============ GitHub API 代理 ============
async function fetchGitHubRepos(cache) {
  // 检查缓存
  const now = Date.now();
  if (cache.data && (now - cache.timestamp) < 300000) { // 5分钟缓存
    return cache.data;
  }

  const API_URL = `https://api.github.com/users/${GITHUB_USERNAME}/repos?sort=updated&per_page=100`;
  const headers = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'Cloudflare-Worker',
  };

  // 如果配置了 GitHub Token，可提高 API 速率限制
  if (typeof GITHUB_TOKEN !== 'undefined' && GITHUB_TOKEN) {
    headers['Authorization'] = `token ${GITHUB_TOKEN}`;
  }

  const res = await fetch(API_URL, { headers });
  if (!res.ok) {
    throw new Error(`GitHub API error: ${res.status}`);
  }

  const data = await res.json();
  cache.data = data;
  cache.timestamp = now;
  return data;
}

// ============ Worker 入口 ============
const repoCache = { data: null, timestamp: 0 };

export default {
  async fetch(request) {
    const url = new URL(request.url);

    // CORS 预检请求
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    // API 路由：代理 GitHub API
    if (url.pathname === '/api/repos') {
      try {
        const data = await fetchGitHubRepos(repoCache);
        return new Response(JSON.stringify(data), {
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'public, max-age=300',
          },
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }
    }

    // 默认路由：返回页面
    return new Response(getHTML(), {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  },
};
