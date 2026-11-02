/**
 * Global Business News Today — Core Client Scripts
 */

document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  initDateDisplay();
  initMarketTicker();
  initNavigation();
  initNewsRender();
  initSearch();
  initNewsletter();
  initModals();
});

/* --------------------------------------------------------------------------
   Theme Management (Dark / Light Mode)
   -------------------------------------------------------------------------- */
function initTheme() {
  const toggleBtn = document.getElementById("themeToggleBtn");
  const storedTheme = localStorage.getItem("gbnt_theme") || 
    (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");

  document.documentElement.setAttribute("data-theme", storedTheme);
  updateThemeIcon(storedTheme);

  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
      const currentTheme = document.documentElement.getAttribute("data-theme");
      const nextTheme = currentTheme === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", nextTheme);
      localStorage.setItem("gbnt_theme", nextTheme);
      updateThemeIcon(nextTheme);
      initMarketTicker();
    });
  }
}

function updateThemeIcon(theme) {
  const icon = document.getElementById("themeIcon");
  const label = document.getElementById("themeLabel");
  if (icon) {
    icon.textContent = theme === "dark" ? "☀️" : "🌙";
  }
  if (label) {
    label.textContent = theme === "dark" ? "Light" : "Dark";
  }
}

/* --------------------------------------------------------------------------
   Live Date Header
   -------------------------------------------------------------------------- */
function initDateDisplay() {
  const dateEl = document.getElementById("liveDate");
  if (dateEl) {
    const options = { weekday: "long", year: "numeric", month: "long", day: "numeric" };
    dateEl.textContent = new Date().toLocaleDateString("en-US", options);
  }
}

/* --------------------------------------------------------------------------
   Market Watch Ticker
   -------------------------------------------------------------------------- */
function initMarketTicker() {
  const tickerWrap = document.getElementById("marketTickerInner");
  if (!tickerWrap) return;

  const widget = document.createElement("div");
  widget.className = "tradingview-widget-container__widget";

  const script = document.createElement("script");
  script.src = "https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js";
  script.async = true;
  script.textContent = JSON.stringify({
    symbols: [
      { proName: "TVC:SPX", title: "S&P 500" },
      { proName: "TVC:IXIC", title: "Nasdaq" },
      { proName: "TVC:DJI", title: "Dow Jones" },
      { proName: "TVC:UKX", title: "FTSE 100" },
      { proName: "TVC:NI225", title: "Nikkei 225" },
      { proName: "BITSTAMP:BTCUSD", title: "Bitcoin" },
      { proName: "TVC:UKOIL", title: "Brent Crude" },
      { proName: "TVC:GOLD", title: "Gold" }
    ],
    showSymbolLogo: true,
    isTransparent: true,
    displayMode: "adaptive",
    colorTheme: document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light",
    locale: "en"
  });

  tickerWrap.className = "market-strip-inner tradingview-widget-container";
  tickerWrap.replaceChildren(widget, script);
}

/* --------------------------------------------------------------------------
   Mobile Menu Navigation
   -------------------------------------------------------------------------- */
function initNavigation() {
  const menuBtn = document.getElementById("mobileMenuBtn");
  const navList = document.getElementById("mainNavList");

  if (menuBtn && navList) {
    menuBtn.addEventListener("click", () => {
      navList.classList.toggle("open");
      const isOpen = navList.classList.contains("open");
      menuBtn.setAttribute("aria-expanded", isOpen);
      menuBtn.textContent = isOpen ? "✕" : "☰";
    });
  }
}

/* --------------------------------------------------------------------------
   Article Rendering & Categorization
   -------------------------------------------------------------------------- */
function initNewsRender() {
  if (typeof ARTICLES === "undefined") return;

  const leadContainer = document.getElementById("heroLeadStory");
  const sideContainer = document.getElementById("heroSideStories");
  const trendingContainer = document.getElementById("trendingGrid");
  const mainGridContainer = document.getElementById("mainArticlesGrid");

  // 1. Render Hero Lead Story
  const leadArticle = ARTICLES.find(a => a.isLead) || ARTICLES[0];
  if (leadContainer && leadArticle) {
    leadContainer.innerHTML = `
      <article class="lead-card">
        <a href="/articles/${encodeURIComponent(leadArticle.id)}/" class="lead-media-wrap">
          <span class="card-category-badge">${escapeHtml(leadArticle.category)}</span>
          <img src="${escapeHtml(leadArticle.image)}" alt="${escapeHtml(leadArticle.title)}" loading="eager" />
        </a>
        <div class="lead-content">
          <a href="/articles/${encodeURIComponent(leadArticle.id)}/">
            <h2 class="lead-title">${escapeHtml(leadArticle.title)}</h2>
          </a>
          <p class="lead-excerpt">${escapeHtml(leadArticle.excerpt)}</p>
          <div class="article-meta" style="margin-top: 0.75rem;">
            <div class="author-pill">
              <img src="${escapeHtml(leadArticle.author.avatar)}" alt="${escapeHtml(leadArticle.author.name)}">
              <span>${escapeHtml(leadArticle.author.name)}</span>
            </div>
            <span class="meta-dot">•</span>
            <time datetime="${leadArticle.publishedAt}">${formatDate(leadArticle.publishedAt)}</time>
            <span class="meta-dot">•</span>
            <span>${escapeHtml(leadArticle.readTime)}</span>
          </div>
        </div>
      </article>
    `;
  }

  // 2. Render Side Stories (Editor's Picks)
  if (sideContainer) {
    const sideArticles = ARTICLES.filter(a => a.id !== leadArticle?.id).slice(0, 3);
    sideContainer.innerHTML = sideArticles.map(article => `
      <article class="side-story-card">
        <a href="/articles/${encodeURIComponent(article.id)}/" class="side-thumb">
          <img src="${escapeHtml(article.image)}" alt="${escapeHtml(article.title)}" loading="lazy" />
        </a>
        <div class="side-story-content">
          <span class="side-category">${escapeHtml(article.category)}</span>
          <a href="/articles/${encodeURIComponent(article.id)}/">
            <h4 class="side-title">${escapeHtml(article.title)}</h4>
          </a>
          <span class="article-meta" style="font-size: 0.71875rem;">${formatDate(article.publishedAt)}</span>
        </div>
      </article>
    `).join("");
  }

  // 3. Render Numbered Trending Stories (1 - 4)
  if (trendingContainer) {
    const trendingArticles = ARTICLES.slice(0, 4);
    trendingContainer.innerHTML = trendingArticles.map((article, idx) => `
      <div class="trending-item">
        <span class="trending-num">${idx + 1}</span>
        <div class="trending-content">
          <span class="side-category">${escapeHtml(article.category)}</span>
          <a href="/articles/${encodeURIComponent(article.id)}/">
            <h4 class="trending-title">${escapeHtml(article.title)}</h4>
          </a>
          <span class="article-meta" style="font-size: 0.71875rem;">${escapeHtml(article.readTime)}</span>
        </div>
      </div>
    `).join("");
  }

  // 4. Render Main Articles Grid with Category Filter
  renderArticlesGrid("all");

  // Category filter pills click
  const filterPills = document.querySelectorAll(".filter-pill");
  filterPills.forEach(pill => {
    pill.addEventListener("click", () => {
      filterPills.forEach(p => p.classList.remove("active"));
      pill.classList.add("active");
      const category = pill.getAttribute("data-category");
      renderArticlesGrid(category);
    });
  });
}

function renderArticlesGrid(category = "all") {
  const container = document.getElementById("mainArticlesGrid");
  if (!container || typeof ARTICLES === "undefined") return;

  const filtered = category === "all" 
    ? ARTICLES 
    : ARTICLES.filter(a => a.categorySlug === category);

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; padding: 3rem; text-align: center; color: var(--text-muted);">
        <p>No stories found in this section right now. Check back shortly or submit a story.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(article => `
    <article class="news-card">
      <a href="/articles/${encodeURIComponent(article.id)}/" class="news-card-thumb">
        <span class="card-category-badge">${escapeHtml(article.category)}</span>
        <img src="${escapeHtml(article.image)}" alt="${escapeHtml(article.title)}" loading="lazy" />
      </a>
      <div class="news-card-body">
        <a href="/articles/${encodeURIComponent(article.id)}/">
          <h3 class="news-card-title">${escapeHtml(article.title)}</h3>
        </a>
        <p class="news-card-excerpt">${escapeHtml(article.excerpt)}</p>
        <div class="news-card-footer">
          <span>${formatDate(article.publishedAt)} • ${escapeHtml(article.readTime)}</span>
          <button type="button" class="btn-read-quick" data-article-id="${article.id}">
            Quick Read ➔
          </button>
        </div>
      </div>
    </article>
  `).join("");

  // Attach quick read listeners
  container.querySelectorAll(".btn-read-quick").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const id = btn.getAttribute("data-article-id");
      openQuickReadModal(id);
    });
  });
}

/* --------------------------------------------------------------------------
   Quick Read Modal
   -------------------------------------------------------------------------- */
function initModals() {
  const modal = document.getElementById("quickReadModal");
  const closeBtn = document.getElementById("modalCloseBtn");

  if (closeBtn && modal) {
    closeBtn.addEventListener("click", () => modal.close());
  }

  // Click outside to close (light dismiss)
  if (modal) {
    modal.addEventListener("click", (e) => {
      const rect = modal.getBoundingClientRect();
      const isInDialog = (rect.top <= e.clientY && e.clientY <= rect.top + rect.height
        && rect.left <= e.clientX && e.clientX <= rect.left + rect.width);
      if (!isInDialog) {
        modal.close();
      }
    });
  }
}

function openQuickReadModal(articleId) {
  const modal = document.getElementById("quickReadModal");
  const titleEl = document.getElementById("modalArticleTitle");
  const bodyEl = document.getElementById("modalArticleBody");
  const fullLink = document.getElementById("modalFullStoryLink");

  if (!modal || typeof ARTICLES === "undefined") return;

  const article = ARTICLES.find(a => a.id === articleId);
  if (!article) return;

  if (titleEl) titleEl.textContent = article.title;
  if (bodyEl) {
    bodyEl.innerHTML = `
      <img src="${escapeHtml(article.image)}" alt="${escapeHtml(article.title)}" style="border-radius: var(--radius-sm); margin-bottom: 1.25rem; aspect-ratio: 16/9; object-fit: cover; width: 100%;">
      <div class="article-meta" style="margin-bottom: 1rem;">
        <strong>${escapeHtml(article.author.name)}</strong> • ${formatDate(article.publishedAt)} • ${escapeHtml(article.category)}
      </div>
      <div class="article-prose" style="font-size: 1rem; line-height: 1.6;">
        ${article.content}
      </div>
    `;
  }
  if (fullLink) {
    fullLink.href = `/articles/${encodeURIComponent(article.id)}/`;
  }

  modal.showModal();
}

/* --------------------------------------------------------------------------
   Live Search
   -------------------------------------------------------------------------- */
function initSearch() {
  const searchTrigger = document.getElementById("searchTriggerBtn");
  const searchModal = document.getElementById("searchModal");
  const searchClose = document.getElementById("searchCloseBtn");
  const searchInput = document.getElementById("siteSearchInput");
  const searchResults = document.getElementById("searchResultsWrap");

  if (searchTrigger && searchModal) {
    searchTrigger.addEventListener("click", () => {
      searchModal.showModal();
      if (searchInput) searchInput.focus();
    });
  }

  if (searchClose && searchModal) {
    searchClose.addEventListener("click", () => searchModal.close());
  }

  if (searchInput && searchResults && typeof ARTICLES !== "undefined") {
    searchInput.addEventListener("input", (e) => {
      const q = e.target.value.trim().toLowerCase();
      if (!q) {
        searchResults.innerHTML = `<p style="color: var(--text-muted); font-size: 0.875rem;">Type to search global business news, markets, and press releases...</p>`;
        return;
      }

      const matches = ARTICLES.filter(a => 
        a.title.toLowerCase().includes(q) ||
        a.excerpt.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q) ||
        a.tags.some(t => t.toLowerCase().includes(q))
      );

      if (matches.length === 0) {
        searchResults.innerHTML = `<p style="color: var(--text-muted); font-size: 0.875rem;">No stories found matching "<strong>${escapeHtml(q)}</strong>".</p>`;
        return;
      }

      searchResults.innerHTML = matches.map(m => `
        <div style="padding: 0.75rem 0; border-bottom: 1px solid var(--border-color);">
          <span style="font-size: 0.6875rem; font-weight: 700; color: var(--brand-accent); text-transform: uppercase;">${escapeHtml(m.category)}</span>
          <h4 style="font-size: 0.9375rem; margin: 0.25rem 0;"><a href="/articles/${encodeURIComponent(m.id)}/">${escapeHtml(m.title)}</a></h4>
          <span style="font-size: 0.75rem; color: var(--text-muted);">${formatDate(m.publishedAt)} • ${escapeHtml(m.readTime)}</span>
        </div>
      `).join("");
    });
  }
}

/* --------------------------------------------------------------------------
   Newsletter Submission
   -------------------------------------------------------------------------- */
function initNewsletter() {
  const forms = document.querySelectorAll(".newsletter-form");
  forms.forEach(form => {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const input = form.querySelector('input[type="email"]');
      if (input && input.value) {
        alert(`Thank you for subscribing to Global Business News Today! A confirmation email has been sent to ${input.value}.`);
        input.value = "";
      }
    });
  });
}

/* --------------------------------------------------------------------------
   Utility Helpers
   -------------------------------------------------------------------------- */
function formatDate(dateString) {
  try {
    const d = new Date(dateString);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch (e) {
    return dateString;
  }
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
