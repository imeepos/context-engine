export function wrapInHtmlPage(
  content: string,
  title = 'Sker CLI'
): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport"
    content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <script src="https://cdn.tailwindcss.com">
  </script>
  <style>
    body { font-family: system-ui, sans-serif; }
    .tool-btn {
      @apply px-3 py-1.5 bg-blue-600
        text-white rounded hover:bg-blue-700
        transition-colors cursor-pointer;
    }
  </style>
</head>
<body class="bg-gray-50 min-h-screen">
  <nav class="bg-white shadow-sm border-b
    border-gray-200 px-6 py-3">
    <div class="flex items-center gap-6">
      <span class="font-bold text-lg
        text-gray-800">Sker</span>
      ${navLinks()}
    </div>
  </nav>
  <main class="max-w-5xl mx-auto px-6 py-8">
    ${content}
  </main>
  <script>${clientScript()}</script>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function navLinks(): string {
  const links = [
    { href: '/', label: 'Dashboard' },
    { href: '/tasks', label: '任务' },
    { href: '/market', label: '市场' },
    { href: '/plugins', label: '插件' },
    { href: '/skills', label: '经验' },
    { href: '/files', label: '文件' },
    { href: '/base-info', label: '系统' },
  ];
  return links
    .map(l =>
      `<a href="${l.href}" data-navigate="true"
        class="text-gray-600 hover:text-blue-600
        transition-colors text-sm">${l.label}</a>`
    )
    .join('\n      ');
}

function clientScript(): string {
  return `
    // SSE: 实时更新页面内容
    const evtSource = new EventSource('/sse');
    evtSource.addEventListener('update', (e) => {
      const main = document.querySelector('main');
      if (main) main.innerHTML = e.data;
    });

    // 导航拦截: data-navigate 链接走 AJAX
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[data-navigate]');
      if (!a) return;
      e.preventDefault();
      const href = a.getAttribute('href');
      if (!href) return;
      history.pushState(null, '', href);
      fetch('/navigate?path=' +
        encodeURIComponent(href))
        .then(r => r.text())
        .then(html => {
          const main =
            document.querySelector('main');
          if (main) main.innerHTML = html;
        });
    });

    // Tool 按钮点击
    document.addEventListener('click', (e) => {
      const btn = e.target.closest(
        'button[data-tool]');
      if (!btn) return;
      const tool = btn.getAttribute('data-tool');
      fetch('/tool?name=' +
        encodeURIComponent(tool),
        { method: 'POST' })
        .then(r => r.json())
        .then(data => {
          if (data.redirect) {
            history.pushState(
              null, '', data.redirect);
            fetch('/navigate?path=' +
              encodeURIComponent(data.redirect))
              .then(r => r.text())
              .then(html => {
                const main =
                  document.querySelector('main');
                if (main) main.innerHTML = html;
              });
          }
        });
    });

    // 浏览器前进后退
    window.addEventListener('popstate', () => {
      fetch('/navigate?path=' +
        encodeURIComponent(location.pathname))
        .then(r => r.text())
        .then(html => {
          const main =
            document.querySelector('main');
          if (main) main.innerHTML = html;
        });
    });
  `;
}
