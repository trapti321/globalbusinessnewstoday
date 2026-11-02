/**
 * Global Business News Today — static site generator.
 *
 * Renders every public page from js/articles-data.js and the fragments in
 * build/pages/, so all pages share one header, footer and SEO head.
 *
 * Usage: node build/build.js
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = path.resolve(__dirname, "..");
const { ARTICLES: RAW_ARTICLES } = require(path.join(ROOT, "js/articles-data.js"));

/* --------------------------------------------------------------------------
   Site configuration
   -------------------------------------------------------------------------- */
const SITE = {
  name: "Global Business News Today",
  url: "https://globalbusinessnewstoday.com",
  email: "info@globalbusinessnewstoday.com",
  tagline: "Global Markets • SME Intelligence • Corporate Wire • Industry Insights",
  description: "Business news and analysis on global markets, central banks, SMEs and startups, technology and AI, and commercial real estate.",
  gaId: "G-B1Y0P92M6Q",
  gscVerification: "dKElYqhHPKQ73zFGKvLYSk9McinojlVUcrKMyDxLxiU",
  logo: { url: "/assets/logo-512.png", width: 512, height: 512 },
  ogImage: { url: "/assets/og-default.jpg", width: 1200, height: 630, alt: "Global Business News Today logo on a navy background" }
};

const CATEGORIES = [
  { slug: "world", name: "World Business", title: "World Business & Global Economy", description: "Global economy, trade, energy and industrial policy news for business leaders." },
  { slug: "markets", name: "Markets & Finance", title: "Financial Markets, Rates & Currencies", description: "Central bank decisions, interest rates, inflation and financial market analysis." },
  { slug: "tech", name: "Tech & AI", title: "Technology, Enterprise Software & AI", description: "Enterprise AI adoption, cybersecurity and business technology news." },
  { slug: "smes", name: "SMEs & Startups", title: "SME Intelligence & Startup Growth", description: "Small business finance, cash flow, venture capital and startup funding news." },
  { slug: "property", name: "Real Estate", title: "Commercial Real Estate & Property", description: "Office markets, commercial property, conversions and real estate finance." },
  { slug: "press-releases", name: "Press Releases", title: "Corporate Wire & Press Releases", description: "Corporate announcements and press releases distributed by Global Business News Today." }
];

// Upcoming policy dates shown in the homepage sidebar (past dates are hidden at build time).
const CALENDAR = [
  { name: "Bank of England MPC", date: "2026-11-05" },
  { name: "US Federal Reserve FOMC", date: "2026-12-09" },
  { name: "European Central Bank", date: "2026-12-17" }
];

const MIN_IMAGE_WIDTH = 1200; // Google Discover requires large images at least 1200px wide.

/* --------------------------------------------------------------------------
   Helpers
   -------------------------------------------------------------------------- */
const esc = (str) => String(str ?? "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#039;");

const abs = (p) => (/^https?:\/\//.test(p) ? p : SITE.url + p);

const formatDate = (iso) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

const jsonLd = (data) => `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, "\\u003c")}</script>`;

const isUnsplash = (src) => /^https:\/\/images\.unsplash\.com\//.test(src);

// Returns a cropped URL at the requested size (Unsplash) or the original image.
function imageUrl(article, w, h) {
  if (isUnsplash(article.image)) {
    return `${article.image.split("?")[0]}?auto=format&fit=crop&w=${w}&h=${h}&q=80`;
  }
  return abs(article.image);
}

function srcset(article, widths, ratio) {
  if (!isUnsplash(article.image)) return "";
  return widths.map(w => `${imageUrl(article, w, Math.round(w * ratio))} ${w}w`).join(", ");
}

function img(article, { widths, ratio, sizes, alt, cls = "", eager = false }) {
  const w = widths[widths.length - 1];
  const h = Math.round(w * ratio);
  const set = srcset(article, widths, ratio);
  return `<img${cls ? ` class="${cls}"` : ""} src="${esc(imageUrl(article, w, h))}"${set ? ` srcset="${esc(set)}" sizes="${esc(sizes)}"` : ""} width="${w}" height="${h}" alt="${esc(alt ?? article.imageAlt)}"${eager ? ` loading="eager" fetchpriority="high"` : ` loading="lazy" decoding="async"`}>`;
}

function avatar(article, size) {
  const src = isUnsplash(article.author.avatar)
    ? `${article.author.avatar.split("?")[0]}?auto=format&fit=crop&w=${size * 2}&h=${size * 2}&q=80`
    : article.author.avatar;
  return `<img src="${esc(src)}" width="${size}" height="${size}" alt="${esc(article.author.name)}" loading="lazy" decoding="async">`;
}

const categoryFor = (slug) => CATEGORIES.find(c => c.slug === slug);
const articleUrl = (a) => `/articles/${a.id}/`;
const categoryUrl = (slug) => `/category/${slug}/`;

/* --------------------------------------------------------------------------
   Validation — every article (including future ones) must meet these rules
   -------------------------------------------------------------------------- */
function validate(articles) {
  const errors = [];
  const ids = new Set();
  for (const a of articles) {
    const where = `Article "${a.id || a.title || "?"}"`;
    for (const field of ["id", "title", "excerpt", "category", "categorySlug", "publishedAt", "image", "imageAlt", "content", "readTime"]) {
      if (!a[field] || !String(a[field]).trim()) errors.push(`${where}: missing "${field}"`);
    }
    if (!a.author || !a.author.name) errors.push(`${where}: missing author.name`);
    if (a.id && !/^[a-z0-9-]+$/.test(a.id)) errors.push(`${where}: id must be lowercase letters, numbers and hyphens`);
    if (ids.has(a.id)) errors.push(`${where}: duplicate id`);
    ids.add(a.id);
    if (a.categorySlug && !categoryFor(a.categorySlug)) errors.push(`${where}: unknown categorySlug "${a.categorySlug}"`);
    if (a.publishedAt && isNaN(Date.parse(a.publishedAt))) errors.push(`${where}: invalid publishedAt`);
    if (a.updatedAt && isNaN(Date.parse(a.updatedAt))) errors.push(`${where}: invalid updatedAt`);
    if (a.excerpt && a.excerpt.length > 160) errors.push(`${where}: excerpt is ${a.excerpt.length} characters (max 160, it is used as the meta description)`);
    if (a.imageAlt && a.imageAlt.trim() === a.title) errors.push(`${where}: imageAlt must describe the image, not repeat the headline`);
    if (a.image && !isUnsplash(a.image) && !(a.imageWidth >= MIN_IMAGE_WIDTH)) {
      errors.push(`${where}: self-hosted images need imageWidth >= ${MIN_IMAGE_WIDTH} (and imageHeight) for Google Discover`);
    }
    if (a.content && /<img(?![^>]*\balt=)/i.test(a.content)) errors.push(`${where}: an <img> in the content has no alt attribute`);
  }
  if (errors.length) {
    console.error("Build failed:\n  " + errors.join("\n  "));
    process.exit(1);
  }
}

validate(RAW_ARTICLES);
// Newest first, and the visible category label always matches the section the article is filed under.
const ARTICLES = RAW_ARTICLES
  .map(a => ({ ...a, category: categoryFor(a.categorySlug).name }))
  .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));

/* --------------------------------------------------------------------------
   Asset versioning (cache busting by content hash)
   -------------------------------------------------------------------------- */
const VERSION = crypto.createHash("sha1")
  .update(["css/styles.css", "js/main.js", "js/articles-data.js"].map(f => fs.readFileSync(path.join(ROOT, f))).join(""))
  .digest("hex")
  .slice(0, 10);

/* --------------------------------------------------------------------------
   Shared partials
   -------------------------------------------------------------------------- */
function head({ title, description, canonical, robots, og, articleMeta, schema }) {
  const image = og.image;
  return `<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  ${canonical ? `<link rel="canonical" href="${esc(canonical)}">` : ""}
  <meta name="robots" content="${esc(robots)}">
  <meta name="google-site-verification" content="${SITE.gscVerification}">
  <meta name="theme-color" content="#0a2540">
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <link rel="icon" type="image/png" sizes="192x192" href="/assets/icon-192.png">
  <link rel="apple-touch-icon" href="/assets/apple-touch-icon.png">
  <link rel="alternate" type="application/rss+xml" title="${esc(SITE.name)}" href="/feed.xml">
  <link rel="preconnect" href="https://images.unsplash.com">

  <meta property="og:site_name" content="${esc(SITE.name)}">
  <meta property="og:locale" content="en_US">
  <meta property="og:type" content="${og.type}">
  <meta property="og:title" content="${esc(og.title)}">
  <meta property="og:description" content="${esc(description)}">
  ${canonical ? `<meta property="og:url" content="${esc(canonical)}">` : ""}
  <meta property="og:image" content="${esc(image.url)}">
  <meta property="og:image:width" content="${image.width}">
  <meta property="og:image:height" content="${image.height}">
  <meta property="og:image:alt" content="${esc(image.alt)}">
  ${articleMeta || ""}
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(og.title)}">
  <meta name="twitter:description" content="${esc(description)}">
  <meta name="twitter:image" content="${esc(image.url)}">
  <meta name="twitter:image:alt" content="${esc(image.alt)}">

  <script>try{document.documentElement.setAttribute("data-theme",localStorage.getItem("gbnt_theme")||(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"))}catch(e){}</script>
  <link rel="stylesheet" href="/css/styles.css?v=${VERSION}">
  ${(schema || []).map(jsonLd).join("\n  ")}

  <!-- Google tag (gtag.js) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=${SITE.gaId}"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${SITE.gaId}');
  </script>
</head>`;
}

function header({ active, isHome }) {
  const lead = ARTICLES[0]; // newest published article
  const navItem = (href, label, key) => `<li><a href="${href}" class="nav-link${active === key ? " active" : ""}"${active === key ? ` aria-current="page"` : ""}>${esc(label)}</a></li>`;
  const brandTag = isHome ? "h1" : "div";
  return `<a class="skip-link" href="#main">Skip to content</a>
  <header class="site-header">
    <div class="top-bar">
      <div class="container">
        <div class="top-bar-left">
          <span class="live-date" id="liveDate"></span>
          ${lead ? `<a class="breaking-ticker-wrap" href="${articleUrl(lead)}">
            <span class="breaking-badge">Latest</span>
            <span class="ticker-content">${esc(lead.title)}</span>
          </a>` : ""}
        </div>
        <div class="top-bar-right">
          <button type="button" class="theme-toggle-btn" id="themeToggleBtn" aria-label="Toggle dark mode">
            <span id="themeIcon" aria-hidden="true">🌙</span>
            <span id="themeLabel">Dark</span>
          </button>
        </div>
      </div>
    </div>

    <div class="masthead">
      <div class="container">
        <div class="masthead-left">
          <button type="button" class="btn-search-trigger" id="searchTriggerBtn" aria-label="Search articles">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <span class="btn-search-label">Search</span>
          </button>
        </div>

        <div class="masthead-center">
          <a href="/" aria-label="${esc(SITE.name)} home">
            <${brandTag} class="brand-title"><img class="brand-mark" src="/assets/brand-mark.svg" width="56" height="56" alt="Global Business News Today logo"><span class="brand-name">Global Business News <span>Today</span></span></${brandTag}>
            <p class="brand-tagline">${esc(SITE.tagline)}</p>
          </a>
        </div>

        <div class="masthead-right">
          <button type="button" class="mobile-menu-btn" id="mobileMenuBtn" aria-label="Toggle navigation" aria-controls="mainNavList" aria-expanded="false">☰</button>
        </div>
      </div>
    </div>

    <nav class="main-nav" aria-label="Primary">
      <div class="container">
        <ul class="nav-list" id="mainNavList">
          ${navItem("/", "Home", "home")}
          ${CATEGORIES.map(c => navItem(categoryUrl(c.slug), c.name, c.slug)).join("\n          ")}
          ${navItem("/contact.html", "Contact Us", "contact")}
        </ul>
      </div>
    </nav>
  </header>`;
}

function footer() {
  const year = new Date().getUTCFullYear();
  return `<footer class="site-footer">
    <div class="container">
      <div class="footer-grid">
        <div class="footer-brand">
          <p class="footer-brand-name">${esc(SITE.name)}</p>
          <p>Independent business news and analysis on global markets, SMEs, technology and commercial property.</p>
          <p class="footer-email">Email: <a href="mailto:${SITE.email}">${SITE.email}</a></p>
        </div>

        <nav class="footer-col" aria-label="Sections">
          <p class="footer-heading">Sections</p>
          <ul class="footer-links">
            ${CATEGORIES.map(c => `<li><a href="${categoryUrl(c.slug)}">${esc(c.name)}</a></li>`).join("\n            ")}
          </ul>
        </nav>

        <nav class="footer-col" aria-label="Company">
          <p class="footer-heading">Company</p>
          <ul class="footer-links">
            <li><a href="/">Home</a></li>
            <li><a href="/category/all/">All News</a></li>
            <li><a href="/contact.html">Contact Us</a></li>
          </ul>
        </nav>
      </div>

      <div class="footer-bottom">
        <p>© ${year} ${esc(SITE.name)}. All rights reserved.</p>
        <p>Email: <a href="mailto:${SITE.email}">${SITE.email}</a></p>
      </div>
    </div>
  </footer>

  <dialog id="searchModal" class="custom-modal" aria-labelledby="searchModalTitle">
    <div class="modal-header">
      <h2 class="modal-title" id="searchModalTitle">Search ${esc(SITE.name)}</h2>
      <button type="button" class="modal-close-btn" id="searchCloseBtn" aria-label="Close search">✕</button>
    </div>
    <div class="modal-body">
      <label class="sr-only" for="siteSearchInput">Search articles</label>
      <input type="search" id="siteSearchInput" class="form-control" placeholder="Search by topic, company, or keyword...">
      <div id="searchResultsWrap" class="search-results"></div>
    </div>
  </dialog>

  <script src="/js/main.js?v=${VERSION}" defer data-search-src="/js/articles-data.js?v=${VERSION}"></script>`;
}

function honeypot() {
  return `<div class="hp" aria-hidden="true"><label>Leave this field empty <input type="text" name="website" tabindex="-1" autocomplete="off"></label></div>`;
}

function newsletterBox(title, text, placeholder = "Your business email") {
  return `<div class="widget-box widget-newsletter">
            <h2 class="widget-title">${esc(title)}</h2>
            <p>${esc(text)}</p>
            <form class="newsletter-form" data-form="newsletter" novalidate>
              <input type="hidden" name="type" value="newsletter">
              ${honeypot()}
              <label class="sr-only" for="nl-${title.replace(/\W+/g, "").toLowerCase()}">Email address</label>
              <input type="email" id="nl-${title.replace(/\W+/g, "").toLowerCase()}" name="email" class="newsletter-input" placeholder="${esc(placeholder)}" autocomplete="email" required>
              <button type="submit" class="btn-subscribe">Subscribe</button>
              <p class="form-status" role="status" aria-live="polite"></p>
            </form>
          </div>`;
}

function newsCard(a) {
  return `<article class="news-card" data-category="${a.categorySlug}">
            <a href="${articleUrl(a)}" class="news-card-thumb" tabindex="-1" aria-hidden="true">
              <span class="card-category-badge">${esc(a.category)}</span>
              ${img(a, { widths: [400, 800, 1200], ratio: 9 / 16, sizes: "(max-width: 992px) calc(100vw - 2.5rem), 420px" })}
            </a>
            <div class="news-card-body">
              <h3 class="news-card-title"><a href="${articleUrl(a)}">${esc(a.title)}</a></h3>
              <p class="news-card-excerpt">${esc(a.excerpt)}</p>
              <div class="news-card-footer">
                <span><time datetime="${a.publishedAt}">${formatDate(a.publishedAt)}</time> • ${esc(a.readTime)}</span>
                <a href="${articleUrl(a)}" class="btn-read-quick" aria-label="Read: ${esc(a.title)}">Read Story ➔</a>
              </div>
            </div>
          </article>`;
}

function sideCard(a, headingTag = "h3") {
  return `<article class="side-story-card">
            <a href="${articleUrl(a)}" class="side-thumb" tabindex="-1" aria-hidden="true">
              ${img(a, { widths: [200, 400], ratio: 1, sizes: "100px" })}
            </a>
            <div class="side-story-content">
              <span class="side-category">${esc(a.category)}</span>
              <${headingTag} class="side-title"><a href="${articleUrl(a)}">${esc(a.title)}</a></${headingTag}>
              <time class="side-date" datetime="${a.publishedAt}">${formatDate(a.publishedAt)}</time>
            </div>
          </article>`;
}

function render(opts) {
  return `<!DOCTYPE html>
<html lang="en">
${head(opts)}
<body${opts.bodyClass ? ` class="${opts.bodyClass}"` : ""}>
  ${header({ active: opts.active, isHome: opts.isHome })}

  <main id="main" class="${opts.mainClass || "container"}">
${opts.main}
  </main>

  ${footer()}
</body>
</html>
`;
}

const ROBOTS_INDEX = "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1";
const ROBOTS_NOINDEX = "noindex, follow";

const ORGANIZATION = {
  "@type": "NewsMediaOrganization",
  "@id": `${SITE.url}/#organization`,
  name: SITE.name,
  url: `${SITE.url}/`,
  email: SITE.email,
  description: SITE.description,
  logo: { "@type": "ImageObject", url: abs(SITE.logo.url), width: SITE.logo.width, height: SITE.logo.height }
};

const breadcrumb = (items) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: abs(it.url) }))
});

const defaultOgImage = { url: abs(SITE.ogImage.url), width: SITE.ogImage.width, height: SITE.ogImage.height, alt: SITE.ogImage.alt };

const latest = (list) => list.map(a => a.updatedAt || a.publishedAt).sort().pop();

/* --------------------------------------------------------------------------
   Pages
   -------------------------------------------------------------------------- */
function buildHome() {
  const lead = ARTICLES[0]; // newest published article
  const side = ARTICLES.slice(1, 4);
  const trending = [...ARTICLES].sort((a, b) => (b.isTrending ? 1 : 0) - (a.isTrending ? 1 : 0)).slice(0, 4);
  const today = new Date().toISOString().slice(0, 10);
  const calendar = CALENDAR.filter(e => e.date >= today);

  const updated = latest(ARTICLES);
  const sections = CATEGORIES.map(c => ({ ...c, top: ARTICLES.find(a => a.categorySlug === c.slug) })).filter(c => c.top);

  const main = `
    <section class="home-intro" aria-labelledby="homeIntroTitle">
      <h2 id="homeIntroTitle" class="home-intro-title">Today's Global Business News</h2>
      <p class="home-intro-text">Global Business News Today reports on world markets, central bank decisions, company filings, SME finance, startups, technology and commercial real estate. Every figure is sourced to filings, regulators or official statistics. <span class="home-intro-updated">Updated <time datetime="${updated}">${formatDate(updated)}</time>.</span></p>
    </section>

    <div class="category-filter-bar">
      <div class="filter-pills" role="toolbar" aria-label="Filter latest stories by section">
        <button type="button" class="filter-pill active" data-category="all" aria-pressed="true">All News</button>
        ${CATEGORIES.filter(c => ARTICLES.some(a => a.categorySlug === c.slug)).map(c => `<button type="button" class="filter-pill" data-category="${c.slug}" aria-pressed="false">${esc(c.name)}</button>`).join("\n        ")}
      </div>
    </div>

    <section class="main-news-section" aria-label="Top stories">
      <div class="hero-news-grid">
        <article class="lead-card">
          <a href="${articleUrl(lead)}" class="lead-media-wrap" tabindex="-1" aria-hidden="true">
            <span class="card-category-badge">${esc(lead.category)}</span>
            ${img(lead, { widths: [800, 1200, 1600], ratio: 9 / 16, sizes: "(max-width: 992px) calc(100vw - 2.5rem), 820px", eager: true })}
          </a>
          <div class="lead-content">
            <h2 class="lead-title"><a href="${articleUrl(lead)}">${esc(lead.title)}</a></h2>
            <p class="lead-excerpt">${esc(lead.excerpt)}</p>
            <div class="article-meta">
              <span class="author-pill">${avatar(lead, 24)}<span>${esc(lead.author.name)}</span></span>
              <span class="meta-dot">•</span>
              <time datetime="${lead.publishedAt}">${formatDate(lead.publishedAt)}</time>
              <span class="meta-dot">•</span>
              <span>${esc(lead.readTime)}</span>
            </div>
          </div>
        </article>

        <aside class="sidebar-col" aria-label="Editor's picks">
          <div class="section-subhead"><h2>Editor's Picks</h2></div>
          ${side.map(a => sideCard(a)).join("\n          ")}
        </aside>
      </div>
    </section>

    <section class="trending-strip-section" aria-label="Trending stories">
      <div class="section-subhead"><h2>Trending</h2><span class="section-kicker">★ Most Read</span></div>
      <div class="trending-grid">
        ${trending.map((a, i) => `<div class="trending-item">
          <span class="trending-num" aria-hidden="true">${i + 1}</span>
          <div class="trending-content">
            <span class="side-category">${esc(a.category)}</span>
            <h3 class="trending-title"><a href="${articleUrl(a)}">${esc(a.title)}</a></h3>
            <span class="side-date">${esc(a.readTime)}</span>
          </div>
        </div>`).join("\n        ")}
      </div>
    </section>

    <section class="content-layout-section" aria-label="Latest stories">
      <div class="content-grid-wrap">
        <div>
          <div class="section-header-banner">
            <h2>Latest Global Business News</h2>
            <a href="/category/all/" class="section-link">View All ➔</a>
          </div>
          <div class="articles-grid" id="mainArticlesGrid">
          ${ARTICLES.map(newsCard).join("\n          ")}
          </div>
          <p class="empty-state" id="gridEmptyState" hidden>No stories in this section yet.</p>
        </div>

        <aside aria-label="Newsletter and calendar">
          ${newsletterBox("Executive Briefing", "Get our breakdown of market-moving decisions, enterprise deals and SME growth strategies in your inbox.", "Your corporate email address")}
          ${calendar.length ? `<div class="widget-box">
            <h2 class="widget-title">Central Bank Calendar</h2>
            <ul class="calendar-list">
              ${calendar.map(e => `<li><strong>${esc(e.name)}</strong><time datetime="${e.date}">${formatDate(e.date + "T12:00:00Z")}</time></li>`).join("\n              ")}
            </ul>
          </div>` : ""}
        </aside>
      </div>
    </section>

    <section class="home-sections" aria-labelledby="homeSectionsTitle">
      <div class="section-header-banner">
        <h2 id="homeSectionsTitle">Business News by Section</h2>
      </div>
      <div class="home-sections-grid">
        ${sections.map(c => `<div class="home-section-card">
          <h3><a href="${categoryUrl(c.slug)}">${esc(c.name)}</a></h3>
          <p>${esc(c.description)}</p>
          <p class="home-section-latest">Latest: <a href="${articleUrl(c.top)}">${esc(c.top.title)}</a></p>
        </div>`).join("\n        ")}
      </div>
    </section>

    <section class="home-about" aria-labelledby="homeAboutTitle">
      <h2 id="homeAboutTitle">About Global Business News Today</h2>
      <p>Global Business News Today is an independent business news site for executives, founders, investors and small business owners. We cover the decisions that move markets and company finances: central bank rate moves, inflation data, IPO filings and earnings, venture funding, enterprise technology and commercial property.</p>
      <p>Our reporting starts with primary sources such as SEC filings, central bank statements and government statistics, and links to them so readers can check the numbers. News tips, corrections and partnership enquiries can be sent through our <a href="/contact.html">contact page</a> or to <a href="mailto:${SITE.email}">${SITE.email}</a>.</p>
    </section>`;

  return render({
    title: "Global Business News Today: Markets, Economy & Company News",
    description: "Global Business News Today: the latest world business news on markets, central banks, company earnings, IPOs, SMEs, startups, AI and real estate.",
    canonical: `${SITE.url}/`,
    robots: ROBOTS_INDEX,
    og: { type: "website", title: SITE.name, image: { url: imageUrl(lead, 1200, 675), width: 1200, height: 675, alt: lead.imageAlt } },
    schema: [
      { "@context": "https://schema.org", "@type": "WebSite", "@id": `${SITE.url}/#website`, name: SITE.name, alternateName: ["GBNT", "globalbusinessnewstoday.com"], url: `${SITE.url}/`, description: SITE.description, inLanguage: "en", publisher: { "@id": ORGANIZATION["@id"] } },
      { "@context": "https://schema.org", ...ORGANIZATION }
    ],
    active: "home",
    isHome: true,
    main
  });
}

function buildArticle(a) {
  const cat = categoryFor(a.categorySlug);
  const url = `${SITE.url}${articleUrl(a)}`;
  const modified = a.updatedAt || a.publishedAt;
  const sameCat = ARTICLES.filter(o => o.id !== a.id && o.categorySlug === a.categorySlug);
  const related = [...sameCat, ...ARTICLES.filter(o => o.id !== a.id && o.categorySlug !== a.categorySlug)].slice(0, 3);
  const heroImage = isUnsplash(a.image)
    ? { url: imageUrl(a, 1200, 675), width: 1200, height: 675 }
    : { url: abs(a.image), width: a.imageWidth, height: a.imageHeight };

  const main = `
    <article class="article-page">
      <header class="article-header">
        <nav class="breadcrumb" aria-label="Breadcrumb">
          <ol>
            <li><a href="/">Home</a></li>
            <li><a href="${categoryUrl(cat.slug)}">${esc(cat.name)}</a></li>
          </ol>
        </nav>
        <a class="category-badge" href="${categoryUrl(cat.slug)}">${esc(a.category)}</a>
        <h1 class="article-main-title">${esc(a.title)}</h1>
        <p class="article-subtitle">${esc(a.excerpt)}</p>
        <div class="article-meta">
          <span class="author-pill">${avatar(a, 32)}<span><span class="author-name">${esc(a.author.name)}</span>${a.author.role ? `<span class="author-role">${esc(a.author.role)}</span>` : ""}</span></span>
          <span class="meta-dot">•</span>
          <span>Published <time datetime="${a.publishedAt}">${formatDate(a.publishedAt)}</time></span>
          ${a.updatedAt ? `<span class="meta-dot">•</span><span>Updated <time datetime="${a.updatedAt}">${formatDate(a.updatedAt)}</time></span>` : ""}
          <span class="meta-dot">•</span>
          <span>${esc(a.readTime)}</span>
        </div>
      </header>

      <div class="article-body-layout">
        <div class="article-main-col">
          <figure class="article-lead-img">
            ${img(a, { widths: [800, 1200, 1600], ratio: 9 / 16, sizes: "(max-width: 992px) calc(100vw - 2.5rem), 860px", eager: true })}
          </figure>

          <div class="share-bar">
            <span class="share-label">Share</span>
            <button type="button" class="share-btn" data-share="x" aria-label="Share on X" title="Share on X">
              <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M17.75 3h3.07l-6.7 7.66L22 21h-6.17l-4.83-6.32L5.47 21H2.4l7.17-8.2L2 3h6.33l4.37 5.77L17.75 3Zm-1.08 16.2h1.7L7.4 4.73H5.58L16.67 19.2Z"/></svg>
            </button>
            <button type="button" class="share-btn" data-share="linkedin" aria-label="Share on LinkedIn" title="Share on LinkedIn">
              <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9.75h4v11.25H3V9.75Zm6.5 0h3.83v1.54h.06c.53-1.01 1.84-2.08 3.79-2.08 4.05 0 4.8 2.67 4.8 6.13V21h-4v-4.98c0-1.19-.02-2.72-1.66-2.72-1.66 0-1.92 1.3-1.92 2.63V21h-4V9.75Z"/></svg>
            </button>
            <button type="button" class="share-btn" data-share="copy" aria-label="Copy link" title="Copy link">
              <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.5 1.5"/><path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.5-1.5"/></svg>
            </button>
            <span class="share-feedback" role="status" aria-live="polite"></span>
          </div>

          <div class="article-prose">
${a.content.replace(/^\n+|\s+$/g, "")}
          </div>

          ${a.tags && a.tags.length ? `<ul class="tag-list" aria-label="Topics">${a.tags.map(t => `<li>#${esc(t)}</li>`).join("")}</ul>` : ""}

          <div class="author-box">
            ${avatar(a, 64)}
            <div>
              <p class="author-box-name">${esc(a.author.name)}</p>
              ${a.author.role ? `<p class="author-box-role">${esc(a.author.role)}, ${esc(SITE.name)}</p>` : ""}
            </div>
          </div>
        </div>

        <aside class="article-sidebar" aria-label="Related stories and newsletter">
          <div class="widget-box">
            <h2 class="widget-title">Related Stories</h2>
            ${related.map(r => sideCard(r, "h3")).join("\n            ")}
          </div>
          ${newsletterBox("Stay Ahead", "Subscribe for our market and SME briefing.")}
        </aside>
      </div>
    </article>`;

  return render({
    // Long headlines already exceed what search results display, so only short ones carry the site name.
    title: `${a.title} | ${SITE.name}`.length <= 70 ? `${a.title} | ${SITE.name}` : a.title,
    description: a.excerpt,
    canonical: url,
    robots: ROBOTS_INDEX,
    og: { type: "article", title: a.title, image: { ...heroImage, alt: a.imageAlt } },
    articleMeta: [
      `<meta property="article:published_time" content="${a.publishedAt}">`,
      `<meta property="article:modified_time" content="${modified}">`,
      `<meta property="article:section" content="${esc(cat.name)}">`,
      ...(a.tags || []).map(t => `<meta property="article:tag" content="${esc(t)}">`)
    ].join("\n  "),
    schema: [
      {
        "@context": "https://schema.org",
        "@type": "NewsArticle",
        mainEntityOfPage: { "@type": "WebPage", "@id": url },
        headline: a.title,
        description: a.excerpt,
        image: isUnsplash(a.image)
          ? [imageUrl(a, 1600, 900), imageUrl(a, 1600, 1200), imageUrl(a, 1200, 1200)]
          : [abs(a.image)],
        datePublished: a.publishedAt,
        dateModified: modified,
        articleSection: cat.name,
        keywords: (a.tags || []).join(", "),
        author: [a.author.type === "Organization"
          ? { "@type": "Organization", name: a.author.name, url: `${SITE.url}/` }
          : { "@type": "Person", name: a.author.name, ...(a.author.role ? { jobTitle: a.author.role } : {}) }],
        publisher: ORGANIZATION
      },
      breadcrumb([{ name: "Home", url: "/" }, { name: cat.name, url: categoryUrl(cat.slug) }, { name: a.title, url: articleUrl(a) }])
    ],
    active: cat.slug,
    main
  });
}

function buildCategory(slug) {
  const cat = slug === "all"
    ? { slug: "all", name: "All News", title: "All Global Business News", description: "Every story from Global Business News Today: markets, SMEs, technology, real estate and corporate news." }
    : categoryFor(slug);
  const list = slug === "all" ? ARTICLES : ARTICLES.filter(a => a.categorySlug === slug);
  const url = `${SITE.url}${categoryUrl(slug)}`;
  const first = list[0];

  const main = `
    <div class="page-intro">
      <nav class="breadcrumb" aria-label="Breadcrumb">
        <ol>
          <li><a href="/">Home</a></li>
          <li aria-current="page">${esc(cat.name)}</li>
        </ol>
      </nav>
      <h1 class="page-title">${esc(cat.title)}</h1>
      <p class="page-description">${esc(cat.description)}</p>
    </div>

    <div class="content-grid-wrap">
      <div>
        ${list.length ? `<div class="articles-grid">
          ${list.map(newsCard).join("\n          ")}
        </div>` : `<p class="empty-state">No stories in this section yet. <a href="/">Return to the front page.</a></p>`}
      </div>
      <aside aria-label="Newsletter">
        ${newsletterBox("Daily Intelligence", "Get reports on SME finance, market rates and technology policy.")}
      </aside>
    </div>`;

  return render({
    title: `${cat.title} | ${SITE.name}`,
    description: cat.description,
    canonical: url,
    robots: list.length ? ROBOTS_INDEX : ROBOTS_NOINDEX,
    og: { type: "website", title: cat.title, image: first ? { url: imageUrl(first, 1200, 675), width: 1200, height: 675, alt: first.imageAlt } : defaultOgImage },
    schema: [
      {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: cat.title,
        url,
        description: cat.description,
        isPartOf: { "@type": "WebSite", name: SITE.name, url: `${SITE.url}/` },
        mainEntity: { "@type": "ItemList", itemListElement: list.map((a, i) => ({ "@type": "ListItem", position: i + 1, url: `${SITE.url}${articleUrl(a)}` })) }
      },
      breadcrumb([{ name: "Home", url: "/" }, { name: cat.name, url: categoryUrl(slug) }])
    ],
    active: slug === "all" ? "" : slug,
    main
  });
}

function buildStatic({ file, fragment, title, description, active, schemaType }) {
  const body = fs.readFileSync(path.join(__dirname, "pages", fragment), "utf8")
    .replace(/\{\{EMAIL\}\}/g, SITE.email)
    .replace(/\{\{HONEYPOT\}\}/g, honeypot());
  const url = `${SITE.url}/${file}`;
  return render({
    title: `${title} | ${SITE.name}`,
    description,
    canonical: url,
    robots: ROBOTS_INDEX,
    og: { type: "website", title, image: defaultOgImage },
    schema: [
      { "@context": "https://schema.org", "@type": schemaType, name: title, url, description, publisher: ORGANIZATION },
      breadcrumb([{ name: "Home", url: "/" }, { name: title, url: `/${file}` }])
    ],
    active,
    main: body
  });
}

function build404() {
  return render({
    title: `Page Not Found | ${SITE.name}`,
    description: "The page you were looking for could not be found.",
    canonical: null,
    robots: ROBOTS_NOINDEX,
    og: { type: "website", title: "Page Not Found", image: defaultOgImage },
    schema: [],
    main: `
    <div class="page-intro page-intro-center">
      <h1 class="page-title">Page not found</h1>
      <p class="page-description">The story or page you were looking for may have moved. Try the latest news below.</p>
    </div>
    <div class="articles-grid articles-grid-3">
      ${ARTICLES.slice(0, 3).map(newsCard).join("\n      ")}
    </div>`
  });
}

/* --------------------------------------------------------------------------
   Feeds
   -------------------------------------------------------------------------- */
function buildSitemap(pages) {
  const urls = pages.map(p => `  <url>
    <loc>${esc(SITE.url + p.path)}</loc>
    ${p.lastmod ? `<lastmod>${p.lastmod}</lastmod>` : ""}
    ${(p.images || []).map(im => `<image:image><image:loc>${esc(im)}</image:loc></image:image>`).join("")}
  </url>`.replace(/\n\s*\n/g, "\n"));
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls.join("\n")}
</urlset>
`;
}

function buildFeed() {
  const items = ARTICLES.map(a => `    <item>
      <title>${esc(a.title)}</title>
      <link>${SITE.url}${articleUrl(a)}</link>
      <guid isPermaLink="true">${SITE.url}${articleUrl(a)}</guid>
      <pubDate>${new Date(a.publishedAt).toUTCString()}</pubDate>
      <category>${esc(categoryFor(a.categorySlug).name)}</category>
      <description>${esc(a.excerpt)}</description>
      <media:content url="${esc(imageUrl(a, 1200, 675))}" medium="image" width="1200" height="675"/>
    </item>`);
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${esc(SITE.name)}</title>
    <link>${SITE.url}/</link>
    <atom:link href="${SITE.url}/feed.xml" rel="self" type="application/rss+xml"/>
    <description>${esc(SITE.description)}</description>
    <language>en-us</language>
${items.join("\n")}
  </channel>
</rss>
`;
}

// llms.txt: a plain-Markdown map of the site for AI assistants (https://llmstxt.org).
function buildLlmsTxt() {
  const section = (title, list) => `## ${title}\n\n${list.join("\n")}\n`;
  const articleLine = (a) => `- [${a.title}](${SITE.url}${articleUrl(a)}): ${a.excerpt} (Published ${a.publishedAt.slice(0, 10)}${a.updatedAt ? `, updated ${a.updatedAt.slice(0, 10)}` : ""})`;
  const bySection = CATEGORIES
    .map(c => ({ c, list: ARTICLES.filter(a => a.categorySlug === c.slug) }))
    .filter(x => x.list.length)
    .map(({ c, list }) => section(`${c.name}`, list.map(articleLine)));

  return `# ${SITE.name}

> ${SITE.description}

Global Business News Today is an independent business news website. Articles cite primary sources such as SEC filings, central bank statements, government statistics and company announcements, and link to them inline. Every article page includes NewsArticle structured data with its publication and update dates.

- Editorial contact: ${SITE.email}
- Sitemap: ${SITE.url}/sitemap.xml
- RSS feed: ${SITE.url}/feed.xml

${section("Site Sections", [
  `- [Home](${SITE.url}/): Latest global business news and top stories`,
  `- [All News](${SITE.url}/category/all/): Every article, newest first`,
  ...CATEGORIES.filter(c => ARTICLES.some(a => a.categorySlug === c.slug)).map(c => `- [${c.name}](${SITE.url}${categoryUrl(c.slug)}): ${c.description}`)
])}
${bySection.join("\n")}
${section("Optional", [
  `- [Contact Us](${SITE.url}/contact.html): Newsroom, corrections, advertising and partnership enquiries`,
  `- [Submit a Press Release](${SITE.url}/submit-pr.html): Corporate announcements for editorial review`
])}`;
}

/* --------------------------------------------------------------------------
   Write output
   -------------------------------------------------------------------------- */
function write(rel, content) {
  const file = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

// Remove generated directories so deleted articles/categories disappear.
for (const dir of ["articles", "category"]) fs.rmSync(path.join(ROOT, dir), { recursive: true, force: true });

const sitemapPages = [{ path: "/", lastmod: latest(ARTICLES) }];

write("index.html", buildHome());

for (const a of ARTICLES) {
  write(`articles/${a.id}/index.html`, buildArticle(a));
  sitemapPages.push({ path: articleUrl(a), lastmod: a.updatedAt || a.publishedAt, images: [imageUrl(a, 1600, 900)] });
}

write("category/all/index.html", buildCategory("all"));
sitemapPages.push({ path: "/category/all/", lastmod: latest(ARTICLES) });
for (const c of CATEGORIES) {
  write(`category/${c.slug}/index.html`, buildCategory(c.slug));
  const list = ARTICLES.filter(a => a.categorySlug === c.slug);
  if (list.length) sitemapPages.push({ path: categoryUrl(c.slug), lastmod: latest(list) });
}

write("contact.html", buildStatic({
  file: "contact.html",
  fragment: "contact.html",
  title: "Contact Us",
  description: "Contact the Global Business News Today newsroom for news tips, corrections, advertising and press release distribution.",
  active: "contact",
  schemaType: "ContactPage"
}));
write("submit-pr.html", buildStatic({
  file: "submit-pr.html",
  fragment: "submit-pr.html",
  title: "Submit a Press Release",
  description: "Submit corporate announcements, SME milestones and press releases for editorial review by Global Business News Today.",
  active: "",
  schemaType: "WebPage"
}));
sitemapPages.push({ path: "/contact.html" }, { path: "/submit-pr.html" });

write("404.html", build404());
write("sitemap.xml", buildSitemap(sitemapPages));
write("feed.xml", buildFeed());
write("llms.txt", buildLlmsTxt());

console.log(`Built ${ARTICLES.length} articles, ${CATEGORIES.length + 1} category pages, home, contact, submit-pr, 404, sitemap.xml, feed.xml and llms.txt (assets v=${VERSION}).`);
