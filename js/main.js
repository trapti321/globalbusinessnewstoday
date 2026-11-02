/**
 * Global Business News Today — Core Client Scripts
 *
 * Pages are pre-rendered by build/build.js; this file only adds interactivity.
 */

const SEARCH_DATA_SRC = document.currentScript && document.currentScript.dataset.searchSrc;
const FORM_ENDPOINT = "/api/submit.php";

document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  initDateDisplay();
  initNavigation();
  initFilterPills();
  initSearch();
  initForms();
  initShare();
  initReadingProgress();
});

/* --------------------------------------------------------------------------
   Theme Management (Dark / Light Mode)
   -------------------------------------------------------------------------- */
function initTheme() {
  const toggleBtn = document.getElementById("themeToggleBtn");
  let storedTheme = null;
  try {
    storedTheme = localStorage.getItem("gbnt_theme");
  } catch (e) {}
  const theme = storedTheme ||
    (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");

  document.documentElement.setAttribute("data-theme", theme);
  updateThemeIcon(theme);

  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
      const currentTheme = document.documentElement.getAttribute("data-theme");
      const nextTheme = currentTheme === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", nextTheme);
      try {
        localStorage.setItem("gbnt_theme", nextTheme);
      } catch (e) {}
      updateThemeIcon(nextTheme);
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
   Mobile Menu Navigation
   -------------------------------------------------------------------------- */
function initNavigation() {
  const menuBtn = document.getElementById("mobileMenuBtn");
  const navList = document.getElementById("mainNavList");

  if (menuBtn && navList) {
    menuBtn.addEventListener("click", () => {
      navList.classList.toggle("open");
      const isOpen = navList.classList.contains("open");
      menuBtn.setAttribute("aria-expanded", String(isOpen));
      menuBtn.textContent = isOpen ? "✕" : "☰";
    });
  }
}

/* --------------------------------------------------------------------------
   Homepage Category Filter (cards are pre-rendered, so filtering just hides them)
   -------------------------------------------------------------------------- */
function initFilterPills() {
  const pills = document.querySelectorAll(".filter-pill");
  const grid = document.getElementById("mainArticlesGrid");
  const empty = document.getElementById("gridEmptyState");
  if (!pills.length || !grid) return;

  pills.forEach(pill => {
    pill.addEventListener("click", () => {
      const category = pill.dataset.category;
      pills.forEach(p => {
        p.classList.toggle("active", p === pill);
        p.setAttribute("aria-pressed", String(p === pill));
      });

      let visible = 0;
      grid.querySelectorAll(".news-card").forEach(card => {
        const show = category === "all" || card.dataset.category === category;
        card.hidden = !show;
        if (show) visible++;
      });
      if (empty) empty.hidden = visible > 0;
    });
  });
}

/* --------------------------------------------------------------------------
   Live Search (article data is loaded on first open)
   -------------------------------------------------------------------------- */
let searchDataPromise = null;

function loadSearchData() {
  if (typeof ARTICLES !== "undefined") return Promise.resolve(ARTICLES);
  if (!searchDataPromise) {
    searchDataPromise = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = SEARCH_DATA_SRC || "/js/articles-data.js";
      s.onload = () => resolve(typeof ARTICLES !== "undefined" ? ARTICLES : []);
      s.onerror = () => {
        searchDataPromise = null;
        reject(new Error("Search data failed to load"));
      };
      document.head.appendChild(s);
    });
  }
  return searchDataPromise;
}

function initSearch() {
  const searchTrigger = document.getElementById("searchTriggerBtn");
  const searchModal = document.getElementById("searchModal");
  const searchClose = document.getElementById("searchCloseBtn");
  const searchInput = document.getElementById("siteSearchInput");
  const searchResults = document.getElementById("searchResultsWrap");
  if (!searchTrigger || !searchModal || !searchInput || !searchResults) return;

  const hint = `<p class="search-hint">Type to search business news, markets and press releases...</p>`;
  searchResults.innerHTML = hint;

  searchTrigger.addEventListener("click", () => {
    searchModal.showModal();
    searchInput.focus();
    loadSearchData().catch(() => {
      searchResults.innerHTML = `<p class="search-hint">Search is unavailable right now. Please try again.</p>`;
    });
  });

  if (searchClose) {
    searchClose.addEventListener("click", () => searchModal.close());
  }

  searchModal.addEventListener("click", (e) => {
    if (e.target === searchModal) searchModal.close();
  });

  searchInput.addEventListener("input", async () => {
    const q = searchInput.value.trim().toLowerCase();
    if (!q) {
      searchResults.innerHTML = hint;
      return;
    }

    let articles;
    try {
      articles = await loadSearchData();
    } catch (e) {
      return;
    }
    if (searchInput.value.trim().toLowerCase() !== q) return;

    const matches = articles.filter(a =>
      a.title.toLowerCase().includes(q) ||
      a.excerpt.toLowerCase().includes(q) ||
      a.category.toLowerCase().includes(q) ||
      (a.tags || []).some(t => t.toLowerCase().includes(q))
    );

    if (matches.length === 0) {
      searchResults.innerHTML = `<p class="search-hint">No stories found matching "<strong>${escapeHtml(q)}</strong>".</p>`;
      return;
    }

    searchResults.innerHTML = matches.map(m => `
      <div class="search-result">
        <span class="side-category">${escapeHtml(m.category)}</span>
        <h3 class="search-result-title"><a href="/articles/${encodeURIComponent(m.id)}/">${escapeHtml(m.title)}</a></h3>
        <span class="side-date">${formatDate(m.publishedAt)} • ${escapeHtml(m.readTime)}</span>
      </div>
    `).join("");
  });
}

/* --------------------------------------------------------------------------
   Forms (newsletter, contact, press release) — posted to the PHP mailer
   -------------------------------------------------------------------------- */
function initForms() {
  document.querySelectorAll("form[data-form]").forEach(form => {
    const status = form.querySelector(".form-status");
    const button = form.querySelector('button[type="submit"]');
    const startedAt = Date.now();

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      if (!form.checkValidity()) {
        const firstInvalid = form.querySelector(":invalid");
        setStatus(status, "error", firstInvalid && firstInvalid.type === "email"
          ? "Please enter a valid email address."
          : "Please fill in all required fields.");
        if (firstInvalid) firstInvalid.focus();
        return;
      }

      const data = new FormData(form);
      data.append("elapsed", String(Date.now() - startedAt));
      data.append("page", window.location.pathname);

      const originalLabel = button ? button.textContent : "";
      if (button) {
        button.disabled = true;
        button.textContent = "Sending...";
      }
      setStatus(status, "", "");

      try {
        const res = await fetch(FORM_ENDPOINT, { method: "POST", body: data, headers: { Accept: "application/json" } });
        const json = await res.json().catch(() => ({}));
        if (res.ok && json.ok) {
          setStatus(status, "success", json.message || "Thank you. Your submission has been received.");
          form.reset();
        } else {
          setStatus(status, "error", json.message || "Sorry, something went wrong. Please try again or email info@globalbusinessnewstoday.com.");
        }
      } catch (err) {
        setStatus(status, "error", "Network error. Please check your connection and try again.");
      } finally {
        if (button) {
          button.disabled = false;
          button.textContent = originalLabel;
        }
      }
    });
  });
}

function setStatus(el, type, message) {
  if (!el) return;
  el.textContent = message;
  el.classList.toggle("is-success", type === "success");
  el.classList.toggle("is-error", type === "error");
}

/* --------------------------------------------------------------------------
   Article Share Buttons & Reading Progress
   -------------------------------------------------------------------------- */
function initShare() {
  document.querySelectorAll("[data-share]").forEach(btn => {
    btn.addEventListener("click", () => {
      const canonical = document.querySelector('link[rel="canonical"]');
      const url = canonical ? canonical.href : window.location.href;
      const title = document.querySelector("h1") ? document.querySelector("h1").textContent : document.title;

      if (btn.dataset.share === "x") {
        window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`, "_blank", "noopener");
      } else if (btn.dataset.share === "linkedin") {
        window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, "_blank", "noopener");
      } else if (btn.dataset.share === "copy" && navigator.clipboard) {
        navigator.clipboard.writeText(url).then(() => {
          const feedback = btn.parentElement.querySelector(".share-feedback");
          if (!feedback) return;
          feedback.textContent = "Link copied";
          setTimeout(() => { feedback.textContent = ""; }, 2000);
        });
      }
    });
  });
}

function initReadingProgress() {
  if (!document.querySelector(".article-page")) return;
  const bar = document.createElement("div");
  bar.className = "reading-progress-bar";
  document.body.prepend(bar);

  window.addEventListener("scroll", () => {
    const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = totalHeight > 0 ? (window.scrollY / totalHeight) * 100 : 0;
    bar.style.width = `${progress}%`;
  }, { passive: true });
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
