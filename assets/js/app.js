/* 咖啡知识百科全书 · 应用逻辑
 * 单页应用：哈希路由（兼容 file:// 与 GitHub Pages）
 *   #/            首页
 *   #/cat/<id>    分类词条列表
 *   #/entry/<id>  词条详情
 *   #/search?q=.. 搜索结果
 */

(function () {
  "use strict";

  var app = document.getElementById("app");
  var catNav = document.getElementById("catNav");

  /* ---------- 工具 ---------- */
  function esc(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function catById(id) {
    for (var i = 0; i < CATEGORIES.length; i++) {
      if (CATEGORIES[i].id === id) return CATEGORIES[i];
    }
    return null;
  }

  function entryById(id) {
    for (var i = 0; i < ENTRIES.length; i++) {
      if (ENTRIES[i].id === id) return ENTRIES[i];
    }
    return null;
  }

  function entriesOf(catId) {
    return ENTRIES.filter(function (e) { return e.cat === catId; });
  }

  /* 各分类的内联 SVG 图标（stroke 风格，随 currentColor 继承） */
  var ICONS = {
    history: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke="currentColor"><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19a2 2 0 0 1 2-2h13"/></svg>',
    beans: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke="currentColor"><ellipse cx="12" cy="12" rx="7" ry="9" transform="rotate(20 12 12)"/><path d="M9 4c-2 4-2 12 0 16" transform="rotate(20 12 12)"/></svg>',
    origin: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke="currentColor"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.5 3 14 0 18M12 3c-3 3.5-3 14 0 18"/></svg>',
    roast: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke="currentColor"><path d="M12 2c1 4-3 6-3 11a5 5 0 0 0 10 0c0-2-1-3-1-3s3 1 3 5a8 8 0 0 1-16 0C5 8 12 6 12 2z"/></svg>',
    grind: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke="currentColor"><circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4M5 5l2.5 2.5M16.5 16.5L19 19M19 5l-2.5 2.5M7.5 16.5L5 19"/></svg>',
    brew: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke="currentColor"><path d="M4 9h13v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z"/><path d="M17 10h2a3 3 0 0 1 0 6h-2M7 5c0-1 1-1 1-2M11 5c0-1 1-1 1-2"/></svg>',
    drinks: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke="currentColor"><path d="M6 3h12l-1.5 18h-9z"/><path d="M6.8 9h10.4"/></svg>',
    culture: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke="currentColor"><path d="M12 3l2.7 5.6 6.1.8-4.5 4.2 1.1 6-5.4-3-5.4 3 1.1-6L3.2 9.4l6.1-.8z"/></svg>',
    health: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke="currentColor"><path d="M12 21C7 16.5 3 13 3 8.8A4.8 4.8 0 0 1 12 6a4.8 4.8 0 0 1 9 2.8c0 4.2-4 7.7-9 12.2z"/></svg>',
    terms: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke="currentColor"><path d="M4 6h16M4 12h16M4 18h10"/></svg>'
  };

  function iconFor(catId) {
    return ICONS[catId] || ICONS.terms;
  }

  /* ---------- 搜索 ---------- */
  function normalize(s) {
    return String(s).toLowerCase().replace(/\s+/g, "");
  }

  function searchEntries(q) {
    var nq = normalize(q);
    if (!nq) return [];
    return ENTRIES.filter(function (e) {
      var hay = normalize(e.title + "\n" + e.summary + "\n" + e.body.join("\n"));
      return hay.indexOf(nq) !== -1;
    });
  }

  function highlight(text, q) {
    var nq = normalize(q);
    if (!nq) return esc(text);
    var out = "", i = 0;
    var lower = String(text).toLowerCase();
    // 在原文上做大小写不敏感查找并高亮
    while (true) {
      var idx = lower.indexOf(nq, i);
      if (idx === -1) break;
      out += esc(text.slice(i, idx)) + "<mark>" + esc(text.slice(idx, idx + nq.length)) + "</mark>";
      i = idx + nq.length;
    }
    out += esc(text.slice(i));
    return out;
  }

  function snippet(e, q) {
    var nq = normalize(q);
    var text = e.summary + " " + e.body.join(" ");
    var compact = text.replace(/\s+/g, "");
    var idx = compact.toLowerCase().indexOf(nq);
    if (idx === -1) return esc(e.summary);
    var start = Math.max(0, idx - 30);
    var end = Math.min(compact.length, idx + nq.length + 50);
    var s = (start > 0 ? "…" : "") + compact.slice(start, end) + (end < compact.length ? "…" : "");
    return highlight(s, q);
  }

  /* ---------- 视图渲染 ---------- */
  function entryCard(e) {
    var c = catById(e.cat);
    return (
      '<a class="entry-card" href="#/entry/' + e.id + '">' +
      '<span class="tag">' + esc(c ? c.name : "") + "</span>" +
      "<h3>" + esc(e.title) + "</h3>" +
      "<p>" + esc(e.summary) + "</p>" +
      "</a>"
    );
  }

  function renderHome() {
    document.title = "咖啡知识百科全书";
    var featured = ENTRIES.filter(function (e) { return e.featured; });
    var html = "";
    html += '<section class="hero">' +
      "<h1>咖啡知识百科全书</h1>" +
      "<p>从一颗豆子到一杯咖啡：历史、品种、产地、烘焙、冲煮、饮品与文化，一站式咖啡知识库。</p>" +
      '<form class="hero-search" id="heroSearch">' +
      '<input type="search" id="heroQ" placeholder="搜索词条：比如「瑰夏」「法压壶」「金杯准则」…" autocomplete="off">' +
      '<button class="btn" type="submit">搜索</button>' +
      "</form>" +
      '<div class="hero-stats">收录 ' + ENTRIES.length + " 个词条 · " + CATEGORIES.length + " 大分类</div>" +
      "</section>";

    html += '<section class="section video-section"><div class="section-head"><h2>视频介绍</h2>' +
      '<span class="more">手冲咖啡 · 20 秒</span></div>' +
      '<div class="video-wrap"><video controls preload="metadata" playsinline>' +
      '<source src="assets/video/pourover-intro.mp4" type="video/mp4">' +
      "您的浏览器不支持视频播放。</video></div>" +
      '<p class="video-caption">一杯手冲，讲究的是慢 —— 跟随咖啡师的双手，感受水温、流速与时间里的匠心。</p></section>';

    html += '<section class="section"><div class="section-head"><h2>浏览分类</h2></div><div class="cat-grid">';
    html += CATEGORIES.map(function (c) {
      var n = entriesOf(c.id).length;
      return (
        '<a class="cat-card" href="#/cat/' + c.id + '">' +
        '<span class="icon">' + iconFor(c.id) + "</span>" +
        "<h3>" + esc(c.name) + "</h3>" +
        "<p>" + esc(c.desc) + "</p>" +
        '<span class="count">' + n + " 个词条 →</span>" +
        "</a>"
      );
    }).join("");
    html += "</div></section>";

    html += '<section class="section"><div class="section-head"><h2>精选词条</h2></div><div class="entry-grid">';
    html += featured.map(entryCard).join("");
    html += "</div></section>";

    app.innerHTML = html;
    bindSearchForm("heroSearch", "heroQ");
  }

  function renderCategory(catId) {
    var c = catById(catId);
    if (!c) return renderNotFound();
    document.title = c.name + " · 咖啡知识百科全书";
    var list = entriesOf(catId);
    var html = '<div class="list-head"><h2>' + esc(c.name) + "</h2><p>" +
      esc(c.desc) + "（共 " + list.length + " 个词条）</p></div>";
    html += '<div class="entry-list">';
    html += list.map(function (e) {
      return (
        '<a class="entry-row" href="#/entry/' + e.id + '">' +
        "<h3>" + esc(e.title) + "</h3>" +
        "<p>" + esc(e.summary) + "</p>" +
        "</a>"
      );
    }).join("");
    html += "</div>";
    app.innerHTML = html;
  }

  function renderSearch(q) {
    q = (q || "").trim();
    document.title = q ? ("搜索：" + q + " · 咖啡知识百科全书") : "搜索 · 咖啡知识百科全书";
    var results = searchEntries(q);
    var html = '<div class="list-head"><h2>搜索结果</h2><p>';
    if (!q) {
      html += "请输入关键词进行搜索。</p></div>";
    } else {
      html += "关键词 “" + esc(q) + "”，找到 " + results.length + " 个相关词条。</p></div>";
    }
    if (q && results.length === 0) {
      html += '<div class="empty"><p>没有找到相关词条，换个关键词试试。<br>比如：拿铁 / 烘焙 / 埃塞俄比亚 / 研磨</p></div>';
    } else {
      html += '<div class="entry-list">';
      html += results.map(function (e) {
        var c = catById(e.cat);
        return (
          '<a class="entry-row" href="#/entry/' + e.id + '">' +
          "<h3><span class=\"tag\">" + esc(c ? c.name : "") + "</span>" + highlight(e.title, q) + "</h3>" +
          "<p>" + snippet(e, q) + "</p>" +
          "</a>"
        );
      }).join("");
      html += "</div>";
    }
    app.innerHTML = html;
  }

  function renderDetail(id) {
    var e = entryById(id);
    if (!e) return renderNotFound();
    var c = catById(e.cat);
    document.title = e.title + " · 咖啡知识百科全书";

    var related = ENTRIES.filter(function (x) { return x.cat === e.cat && x.id !== e.id; }).slice(0, 4);

    var html = '<a class="back-link" href="javascript:history.back()">← 返回</a>';
    html += '<article class="article">';
    html += '<div class="crumb"><a href="#/">首页</a> / <a href="#/cat/' + e.cat + '">' +
      esc(c ? c.name : "") + "</a> / " + esc(e.title) + "</div>";
    html += "<h1>" + esc(e.title) + "</h1>";
    html += '<p class="summary">' + esc(e.summary) + "</p>";
    html += '<div class="body">' + e.body.map(function (p) {
      return "<p>" + esc(p) + "</p>";
    }).join("") + "</div>";
    html += "</article>";

    if (e.id === "pourover") {
      html += '<section class="related"><h2>视频演示</h2>' +
        '<div class="video-wrap"><video controls preload="metadata" playsinline>' +
        '<source src="assets/video/pourover-intro.mp4" type="video/mp4">' +
        "您的浏览器不支持视频播放。</video></div>" +
        '<p class="video-caption">一杯手冲，讲究的是慢 —— 20 秒看完一次完整的手冲流程。</p></section>';
    }

    if (related.length) {
      html += '<section class="related"><h2>相关词条</h2><div class="entry-grid">';
      html += related.map(entryCard).join("");
      html += "</div></section>";
    }
    app.innerHTML = html;
    window.scrollTo(0, 0);
  }

  function renderNotFound() {
    document.title = "未找到 · 咖啡知识百科全书";
    app.innerHTML = '<div class="empty"><p>抱歉，没有找到这个页面。<br><a href="#/">返回首页</a></p></div>';
  }

  /* ---------- 导航 ---------- */
  function renderNav(activeCat) {
    catNav.innerHTML = CATEGORIES.map(function (c) {
      var cls = c.id === activeCat ? ' class="active"' : "";
      return '<a href="#/cat/' + c.id + '"' + cls + ">" + esc(c.name) + "</a>";
    }).join("");
  }

  function router() {
    var h = location.hash || "#/";
    var m;
    if ((m = h.match(/^#\/cat\/([\w-]+)/))) {
      renderNav(m[1]);
      renderCategory(m[1]);
    } else if ((m = h.match(/^#\/entry\/([\w-]+)/))) {
      var e = entryById(m[1]);
      renderNav(e ? e.cat : null);
      renderDetail(m[1]);
    } else if ((m = h.match(/^#\/search\?q=(.*)/))) {
      renderNav(null);
      renderSearch(decodeURIComponent(m[1] || ""));
    } else {
      renderNav(null);
      renderHome();
    }
  }

  function bindSearchForm(formId, inputId) {
    var form = document.getElementById(formId);
    if (!form) return;
    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var q = document.getElementById(inputId).value.trim();
      location.hash = "#/search?q=" + encodeURIComponent(q);
    });
  }

  /* 顶栏搜索 */
  document.getElementById("topSearch").addEventListener("submit", function (ev) {
    ev.preventDefault();
    var q = document.getElementById("topQ").value.trim();
    location.hash = "#/search?q=" + encodeURIComponent(q);
  });

  window.addEventListener("hashchange", router);
  router();
})();
