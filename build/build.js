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
  legalName: "GBNT",
  country: "US",
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

// Shown on /editorial-standards/ and on the newsroom author page; also linked from the publisher schema.
const STANDARDS_URL = "/editorial-standards/";
const ABOUT_URL = "/about/";
const PRIVACY_URL = "/privacy-policy/";
const TERMS_URL = "/terms/";
const STANDARDS = [
  "<strong>Primary sources first.</strong> Figures and claims are taken from regulatory filings, central bank statements, official statistics, court records and company announcements, and linked inline so readers can check them.",
  "<strong>Clear dates.</strong> Every article shows when it was published and, where relevant, when it was last updated or when its facts were last checked.",
  "<strong>Separation of news and promotion.</strong> Press releases are published only in the Press Releases section and are labelled as corporate announcements.",
  `<strong>Corrections.</strong> Errors are corrected promptly. Readers can report a mistake through the <a href="/contact.html">contact page</a> or by emailing <a href="mailto:${SITE.email}">${SITE.email}</a>.`
];

// Author profiles, keyed by the author.name used in js/articles-data.js. Authors listed here get a
// dedicated /author/<slug>/ page, a linked byline and a bio in the article author box.
const AUTHORS = {
  "GBNT Newsroom": {
    slug: "gbnt-newsroom",
    type: "Organization",
    title: "Editorial Desk",
    avatar: "/assets/logo-512.png",
    metaDescription: "GBNT Newsroom is the editorial desk of Global Business News Today. Read its bio, reporting standards and latest fact-checked business and tech news.",
    shortBio: "GBNT Newsroom is the in-house editorial desk of Global Business News Today. It reports and fact-checks stories on markets, SMEs, technology and the global economy using primary sources, and links to every source inline.",
    bio: [
      "GBNT Newsroom is the in-house editorial desk of Global Business News Today. The desk researches, writes and fact-checks business news and explainers for executives, founders, investors and small business owners who need clear answers backed by evidence.",
      "Stories published under the GBNT Newsroom byline are produced and reviewed by the editorial team as a whole rather than by a single reporter. Each one goes through a source check before publication, and the desk returns to explainers when the facts change, recording the update date on the article."
    ],
    standards: STANDARDS
  }
};

const authorFor = (a) => AUTHORS[a.author.name];
const authorUrl = (profile) => `/author/${profile.slug}/`;

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
    // Google truncates long headlines in Top Stories and Discover; warn rather than fail.
    if (a.title && a.title.length > 110) console.warn(`Warning: ${where}: headline is ${a.title.length} characters (aim for 110 or fewer)`);
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
  <link rel="icon" href="/favicon.ico" sizes="48x48">
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
            ${Object.entries(AUTHORS).map(([name, p]) => `<li><a href="${authorUrl(p)}">${esc(name)}</a></li>`).join("\n            ")}
            <li><a href="${ABOUT_URL}">About Us</a></li>
            <li><a href="${STANDARDS_URL}">Editorial Standards</a></li>
            <li><a href="/contact.html">Contact Us</a></li>
            <li><a href="${PRIVACY_URL}">Privacy Policy</a></li>
            <li><a href="${TERMS_URL}">Terms of Use</a></li>
          </ul>
        </nav>
      </div>

      <div class="footer-bottom">
        <p>© ${year} ${esc(SITE.name)}, published by ${esc(SITE.legalName)} (USA). All rights reserved.</p>
        <p class="footer-legal"><a href="${ABOUT_URL}">About</a> · <a href="${PRIVACY_URL}">Privacy</a> · <a href="${TERMS_URL}">Terms</a> · <a href="${STANDARDS_URL}#corrections">Corrections</a></p>
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

// Compact contact form for the article sidebar; posts to the same mailer as the contact page.
function contactBox() {
  return `<div class="widget-box widget-contact">
            <h2 class="widget-title">Contact the Desk</h2>
            <p>Have a tip, a correction or a question about this story? Send it to our editors.</p>
            <form class="contact-side-form" data-form="contact" novalidate>
              <input type="hidden" name="type" value="contact">
              ${honeypot()}
              <label class="form-label" for="side-name">Name</label>
              <input type="text" id="side-name" name="name" class="form-control" required maxlength="120" autocomplete="name" placeholder="Your name">
              <label class="form-label" for="side-email">Email</label>
              <input type="email" id="side-email" name="email" class="form-control" required maxlength="200" autocomplete="email" placeholder="you@company.com">
              <label class="form-label" for="side-message">Message</label>
              <textarea id="side-message" name="message" class="form-control" rows="4" required maxlength="5000" placeholder="How can we help?"></textarea>
              <button type="submit" class="btn-pr-submit btn-block">Send Message</button>
              <p class="form-status" role="status" aria-live="polite"></p>
              <p class="form-privacy">We use your details only to reply. See our <a href="${PRIVACY_URL}">privacy policy</a>.</p>
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
  legalName: SITE.legalName,
  url: `${SITE.url}/`,
  email: SITE.email,
  address: { "@type": "PostalAddress", addressCountry: SITE.country },
  areaServed: "Worldwide",
  description: SITE.description,
  logo: { "@type": "ImageObject", url: abs(SITE.logo.url), width: SITE.logo.width, height: SITE.logo.height },
  image: abs(SITE.ogImage.url),
  contactPoint: [{ "@type": "ContactPoint", contactType: "editorial", email: SITE.email, url: `${SITE.url}/contact.html`, availableLanguage: "English" }],
  knowsAbout: CATEGORIES.filter(c => c.slug !== "press-releases").map(c => c.title),
  publishingPrinciples: `${SITE.url}${STANDARDS_URL}`,
  ethicsPolicy: `${SITE.url}${STANDARDS_URL}`,
  correctionsPolicy: `${SITE.url}${STANDARDS_URL}#corrections`,
  actionableFeedbackPolicy: `${SITE.url}${STANDARDS_URL}#feedback`,
  ownershipFundingInfo: `${SITE.url}${ABOUT_URL}#ownership`
};

const WEBSITE_REF = { "@type": "WebSite", "@id": `${SITE.url}/#website`, name: SITE.name, url: `${SITE.url}/` };

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
    schema: [{
      "@context": "https://schema.org",
      "@graph": [
        { ...WEBSITE_REF, alternateName: ["GBNT", "globalbusinessnewstoday.com"], description: SITE.description, inLanguage: "en", publisher: { "@id": ORGANIZATION["@id"] } },
        ORGANIZATION,
        {
          "@type": "CollectionPage",
          "@id": `${SITE.url}/#webpage`,
          url: `${SITE.url}/`,
          name: "Global Business News Today: Markets, Economy & Company News",
          description: SITE.description,
          inLanguage: "en",
          isPartOf: { "@id": WEBSITE_REF["@id"] },
          about: { "@id": ORGANIZATION["@id"] },
          publisher: { "@id": ORGANIZATION["@id"] },
          dateModified: updated,
          primaryImageOfPage: { "@type": "ImageObject", url: imageUrl(lead, 1200, 675), width: 1200, height: 675 },
          mainEntity: {
            "@type": "ItemList",
            name: "Latest Global Business News",
            itemListOrder: "https://schema.org/ItemListOrderDescending",
            numberOfItems: Math.min(ARTICLES.length, 10),
            itemListElement: ARTICLES.slice(0, 10).map((a, i) => ({ "@type": "ListItem", position: i + 1, url: `${SITE.url}${articleUrl(a)}`, name: a.title }))
          }
        }
      ]
    }],
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
  const profile = authorFor(a);
  const authorName = profile
    ? `<a href="${authorUrl(profile)}" rel="author">${esc(a.author.name)}</a>`
    : esc(a.author.name);

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
          <span class="author-pill">${avatar(a, 32)}<span><span class="author-name">${authorName}</span>${a.author.role ? `<span class="author-role">${esc(a.author.role)}</span>` : ""}</span></span>
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

          ${a.categorySlug === "press-releases" ? `<p class="content-disclosure"><strong>${a.paid ? "Paid press release" : "Press release"}:</strong> ${a.paid ? `this announcement was published in exchange for payment from the organisation named in it.` : `this announcement was supplied by the organisation named in it.`} It is published as submitted and was not written or independently verified by ${esc(SITE.name)}. Read our <a href="${STANDARDS_URL}#sponsored">sponsored content and press release policy</a>.</p>` : ""}
          <div class="article-prose">
${a.content.replace(/^\n+|\s+$/g, "")}
          </div>

          ${a.tags && a.tags.length ? `<ul class="tag-list" aria-label="Topics">${a.tags.map(t => `<li>#${esc(t)}</li>`).join("")}</ul>` : ""}

          <div class="author-box">
            ${avatar(a, 64)}
            <div>
              <p class="author-box-name">${authorName}</p>
              ${a.author.role || profile ? `<p class="author-box-role">${esc(a.author.role || profile.title)}, ${esc(SITE.name)}</p>` : ""}
              ${profile ? `<p class="author-box-bio">${esc(profile.shortBio)}</p>
              <a class="author-box-link" href="${authorUrl(profile)}">More from ${esc(a.author.name)} ➔</a>` : ""}
            </div>
          </div>
        </div>

        <aside class="article-sidebar" aria-label="Related stories, newsletter and contact">
          <div class="widget-box">
            <h2 class="widget-title">Related Stories</h2>
            ${related.map(r => sideCard(r, "h3")).join("\n            ")}
          </div>
          <div class="sidebar-sticky">
            ${newsletterBox("Stay Ahead", "Subscribe for our market and SME briefing.")}
            ${contactBox()}
          </div>
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
      `<meta property="article:author" content="${profile ? SITE.url + authorUrl(profile) : esc(a.author.name)}">`,
      `<meta name="author" content="${esc(a.author.name)}">`,
      ...(a.tags || []).map(t => `<meta property="article:tag" content="${esc(t)}">`)
    ].join("\n  "),
    schema: [
      {
        "@context": "https://schema.org",
        "@type": "NewsArticle",
        "@id": `${url}#article`,
        url,
        mainEntityOfPage: { "@type": "WebPage", "@id": url },
        isPartOf: WEBSITE_REF,
        headline: a.title,
        description: a.excerpt,
        inLanguage: "en",
        wordCount: a.content.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length,
        thumbnailUrl: heroImage.url,
        image: isUnsplash(a.image)
          ? [imageUrl(a, 1600, 900), imageUrl(a, 1600, 1200), imageUrl(a, 1200, 1200)]
          : [abs(a.image)],
        datePublished: a.publishedAt,
        dateModified: modified,
        articleSection: cat.name,
        keywords: (a.tags || []).join(", "),
        author: [profile
          ? { "@type": profile.type, "@id": `${SITE.url}${authorUrl(profile)}#author`, name: a.author.name, url: `${SITE.url}${authorUrl(profile)}` }
          : a.author.type === "Organization"
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
    ? { slug: "all", name: "All News", title: "Global Business Articles and News", description: "Browse every global business article from Global Business News Today: markets, SMEs, technology, real estate, world business and corporate news." }
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

function buildAuthor(name, profile) {
  const list = ARTICLES.filter(a => a.author.name === name);
  const url = `${SITE.url}${authorUrl(profile)}`;
  const covers = CATEGORIES.filter(c => list.some(a => a.categorySlug === c.slug));
  const title = `${name}: ${profile.title} at ${SITE.name}`;
  const description = profile.metaDescription;

  const main = `
    <div class="author-profile">
      <nav class="breadcrumb" aria-label="Breadcrumb">
        <ol>
          <li><a href="/">Home</a></li>
          <li aria-current="page">${esc(name)}</li>
        </ol>
      </nav>

      <header class="author-profile-header">
        <img src="${esc(profile.avatar)}" width="112" height="112" alt="${esc(name)} logo">
        <div>
          <h1 class="page-title">${esc(name)}</h1>
          <p class="author-profile-role">${esc(profile.title)}, ${esc(SITE.name)}</p>
          <p class="author-profile-stats">${list.length} article${list.length === 1 ? "" : "s"}${list.length ? ` • Latest <time datetime="${list[0].publishedAt}">${formatDate(list[0].publishedAt)}</time>` : ""}</p>
        </div>
      </header>

      <div class="author-profile-body">
        <section aria-labelledby="authorAboutTitle">
          <h2 id="authorAboutTitle">About ${esc(name)}</h2>
          ${profile.bio.map(p => `<p>${esc(p)}</p>`).join("\n          ")}
        </section>

        ${covers.length ? `<section aria-labelledby="authorCoversTitle">
          <h2 id="authorCoversTitle">Coverage Areas</h2>
          <ul class="author-topics">
            ${covers.map(c => `<li><a href="${categoryUrl(c.slug)}">${esc(c.name)}</a></li>`).join("\n            ")}
          </ul>
        </section>` : ""}

        <section aria-labelledby="authorStandardsTitle">
          <h2 id="authorStandardsTitle">How We Report</h2>
          <ul class="author-standards">
            ${profile.standards.map(s => `<li>${s}</li>`).join("\n            ")}
          </ul>
          <p>Read our full <a href="${STANDARDS_URL}">editorial standards and corrections policy</a>.</p>
        </section>

        <section aria-labelledby="authorContactTitle">
          <h2 id="authorContactTitle">Contact the Desk</h2>
          <p>Send news tips, questions about a story or correction requests to <a href="mailto:${SITE.email}">${SITE.email}</a>, or use the <a href="/contact.html">contact page</a>.</p>
        </section>
      </div>
    </div>

    <section class="author-articles" aria-labelledby="authorArticlesTitle">
      <div class="section-header-banner">
        <h2 id="authorArticlesTitle">Latest Articles by ${esc(name)}</h2>
      </div>
      ${list.length ? `<div class="articles-grid articles-grid-3">
        ${list.map(newsCard).join("\n        ")}
      </div>` : `<p class="empty-state">No articles yet.</p>`}
    </section>`;

  return render({
    title: title.length <= 70 ? title : `${name} | ${SITE.name}`,
    description,
    canonical: url,
    robots: list.length ? ROBOTS_INDEX : ROBOTS_NOINDEX,
    og: { type: "profile", title: `${name} | ${SITE.name}`, image: { url: abs(profile.avatar), width: 512, height: 512, alt: `${name} logo` } },
    schema: [
      {
        "@context": "https://schema.org",
        "@type": "ProfilePage",
        url,
        name: title,
        description,
        dateModified: latest(list),
        isPartOf: { "@id": `${SITE.url}/#website` },
        mainEntity: {
          "@type": profile.type,
          "@id": `${url}#author`,
          name,
          alternateName: "Global Business News Today Newsroom",
          url,
          description: profile.shortBio,
          email: SITE.email,
          logo: abs(profile.avatar),
          image: abs(profile.avatar),
          knowsAbout: covers.map(c => c.title),
          parentOrganization: { "@id": ORGANIZATION["@id"], "@type": ORGANIZATION["@type"], name: SITE.name, url: `${SITE.url}/` }
        },
        hasPart: list.map(a => ({ "@type": "NewsArticle", headline: a.title, url: `${SITE.url}${articleUrl(a)}`, datePublished: a.publishedAt }))
      },
      breadcrumb([{ name: "Home", url: "/" }, { name, url: authorUrl(profile) }])
    ],
    main
  });
}

function buildStandards() {
  const url = `${SITE.url}${STANDARDS_URL}`;
  const title = "Editorial Standards and Corrections Policy";
  const description = "How Global Business News Today sources, dates and corrects its reporting, separates news from press releases, and handles reader feedback.";
  const newsroom = Object.entries(AUTHORS)[0];

  const main = `
    <div class="author-profile">
      <nav class="breadcrumb" aria-label="Breadcrumb">
        <ol>
          <li><a href="/">Home</a></li>
          <li aria-current="page">Editorial Standards</li>
        </ol>
      </nav>
      <h1 class="page-title">${esc(title)}</h1>
      <p class="page-description">${esc(description)}</p>

      <div class="author-profile-body">
        <section aria-labelledby="whoTitle">
          <h2 id="whoTitle">Who We Are</h2>
          <p>${esc(SITE.name)} is an independent business news site for executives, founders, investors and small business owners. Our coverage spans ${CATEGORIES.filter(c => c.slug !== "press-releases").map(c => c.name).join(", ")}.${newsroom ? ` Most stories are published by our editorial desk, <a href="${authorUrl(newsroom[1])}">${esc(newsroom[0])}</a>.` : ""}</p>
        </section>

        <section aria-labelledby="standardsTitle">
          <h2 id="standardsTitle">How We Report</h2>
          <ul class="author-standards">
            ${STANDARDS.map(s => `<li>${s}</li>`).join("\n            ")}
          </ul>
        </section>

        <section id="corrections" aria-labelledby="correctionsTitle">
          <h2 id="correctionsTitle">Corrections Policy</h2>
          <p>If we get a fact wrong, we fix it in the article and show the date it was updated. To report an error, email <a href="mailto:${SITE.email}">${SITE.email}</a> or use our <a href="/contact.html">contact page</a>, and include the article link and what needs correcting.</p>
        </section>

        <section id="sponsored" aria-labelledby="sponsoredTitle">
          <h2 id="sponsoredTitle">Sponsored Content and Press Releases</h2>
          <p>Our news and analysis are written by our editorial desk and are never paid for by the companies or websites we cover. Press releases appear only in our <a href="${categoryUrl("press-releases")}">Press Releases</a> section and are published as supplied by the organisation named in them, without independent verification. We accept both free and paid press releases. Paid releases are labelled "Paid press release" at the top of the page, and free submissions are labelled "Press release". Payment never affects our news coverage or reviews, and we do not present promotional material as independent reporting. Any other sponsored or affiliate content will be clearly labelled as such at the top of the page.</p>
        </section>

        <section aria-labelledby="adviceTitle">
          <h2 id="adviceTitle">Financial and Health Information</h2>
          <p>Our reporting on markets, companies and health is for information only. It is not investment, financial, legal or medical advice.</p>
        </section>

        <section id="feedback" aria-labelledby="feedbackTitle">
          <h2 id="feedbackTitle">Reader Feedback</h2>
          <p>We welcome news tips, questions about a story and suggestions. Contact the newsroom at <a href="mailto:${SITE.email}">${SITE.email}</a> or through the <a href="/contact.html">contact page</a>. Companies can send announcements through our <a href="/submit-pr.html">press release form</a>.</p>
        </section>
      </div>
    </div>`;

  return render({
    title: `${title} | ${SITE.name}`.length <= 70 ? `${title} | ${SITE.name}` : title,
    description,
    canonical: url,
    robots: ROBOTS_INDEX,
    og: { type: "website", title, image: defaultOgImage },
    schema: [
      { "@context": "https://schema.org", "@type": "WebPage", "@id": `${url}#webpage`, name: title, url, description, inLanguage: "en", isPartOf: WEBSITE_REF, about: { "@id": ORGANIZATION["@id"] }, publisher: ORGANIZATION },
      breadcrumb([{ name: "Home", url: "/" }, { name: "Editorial Standards", url: STANDARDS_URL }])
    ],
    main
  });
}

// Shared layout for trust and legal pages (About, Privacy Policy, Terms of Use).
function buildInfoPage({ path, crumb, title, description, updated, schemaType = "WebPage", body }) {
  const url = `${SITE.url}${path}`;
  const main = `
    <div class="author-profile">
      <nav class="breadcrumb" aria-label="Breadcrumb">
        <ol>
          <li><a href="/">Home</a></li>
          <li aria-current="page">${esc(crumb)}</li>
        </ol>
      </nav>
      <h1 class="page-title">${esc(title)}</h1>
      <p class="page-description">${esc(description)}</p>
      ${updated ? `<p class="page-updated">Last updated: <time datetime="${updated}">${formatDate(updated)}</time></p>` : ""}

      <div class="author-profile-body">
${body}
      </div>
    </div>`;

  return render({
    title: `${title} | ${SITE.name}`.length <= 70 ? `${title} | ${SITE.name}` : title,
    description,
    canonical: url,
    robots: ROBOTS_INDEX,
    og: { type: "website", title, image: defaultOgImage },
    schema: [
      { "@context": "https://schema.org", "@type": schemaType, "@id": `${url}#webpage`, name: title, url, description, inLanguage: "en", isPartOf: WEBSITE_REF, about: { "@id": ORGANIZATION["@id"] }, publisher: ORGANIZATION, ...(updated ? { dateModified: updated } : {}) },
      breadcrumb([{ name: "Home", url: "/" }, { name: crumb, url: path }])
    ],
    main
  });
}

const POLICY_UPDATED = "2026-11-09";

function buildAbout() {
  const newsroom = Object.entries(AUTHORS)[0];
  const desks = CATEGORIES.filter(c => c.slug !== "press-releases");
  return buildInfoPage({
    path: ABOUT_URL,
    crumb: "About Us",
    title: "About Global Business News Today",
    description: "Who we are, what we cover, how our newsroom works, who is behind the site and how to contact Global Business News Today.",
    schemaType: "AboutPage",
    body: `
        <section aria-labelledby="whoTitle">
          <h2 id="whoTitle">Who We Are</h2>
          <p>${esc(SITE.name)} is an independent, English-language business news publication at <a href="/">globalbusinessnewstoday.com</a>, published by ${esc(SITE.legalName)} in the United States. We publish news, explainers and analysis for executives, founders, investors and small business owners, with a focus on facts readers can check for themselves.</p>
        </section>

        <section aria-labelledby="coverTitle">
          <h2 id="coverTitle">What We Cover</h2>
          <ul class="author-standards">
            ${desks.map(c => `<li><a href="${categoryUrl(c.slug)}"><strong>${esc(c.name)}</strong></a>: ${esc(c.description)}</li>`).join("\n            ")}
          </ul>
          <p>We also review websites that many people search for by name, checking domain records, archive history and published claims so readers can decide whether a site is trustworthy.</p>
        </section>

        <section aria-labelledby="newsroomTitle">
          <h2 id="newsroomTitle">Our Newsroom</h2>
          <p>${newsroom ? `Stories are researched, written and fact-checked by our editorial desk, <a href="${authorUrl(newsroom[1])}">${esc(newsroom[0])}</a>. ` : ""}Every article shows its byline, publication date and, when it changes, the date it was updated. We link to primary sources such as company filings, government data and official statements next to the facts they support.</p>
          <p>Read our full <a href="${STANDARDS_URL}">editorial standards</a>, including our <a href="${STANDARDS_URL}#corrections">corrections policy</a> and our <a href="${STANDARDS_URL}#sponsored">policy on sponsored content and press releases</a>.</p>
        </section>

        <section id="ownership" aria-labelledby="ownershipTitle">
          <h2 id="ownershipTitle">Ownership and Funding</h2>
          <p>${esc(SITE.name)} is published by ${esc(SITE.legalName)}, an independent publisher based in the United States. It is not owned by, or affiliated with, any of the companies or websites it reports on.</p>
          <p>The site is funded by its owners and by press release publishing. Organisations can submit press releases free of charge or pay for publication. Paid releases are labelled "Paid press release", and all releases appear separately in our <a href="${categoryUrl("press-releases")}">Press Releases</a> section. Companies cannot pay to change our news coverage or reviews.</p>
        </section>

        <section aria-labelledby="contactTitle">
          <h2 id="contactTitle">Contact Us</h2>
          <p>Email <a href="mailto:${SITE.email}">${SITE.email}</a> or use our <a href="/contact.html">contact page</a> for news tips, corrections, partnerships and general questions. Companies can send announcements through our <a href="/submit-pr.html">press release form</a>.</p>
        </section>`
  });
}

function buildPrivacy() {
  return buildInfoPage({
    path: PRIVACY_URL,
    crumb: "Privacy Policy",
    title: "Privacy Policy",
    description: "What information Global Business News Today collects, how we use it, the services involved, and how to ask us to access or delete your data.",
    updated: POLICY_UPDATED,
    body: `
        <section aria-labelledby="p1">
          <h2 id="p1">Who We Are</h2>
          <p>This policy explains how ${esc(SITE.legalName)}, the US-based publisher of ${esc(SITE.name)} ("we", "us"), handles personal information when you visit <a href="/">globalbusinessnewstoday.com</a> or contact us. Questions about this policy can be sent to <a href="mailto:${SITE.email}">${SITE.email}</a>.</p>
        </section>

        <section aria-labelledby="p2">
          <h2 id="p2">Information You Give Us</h2>
          <ul class="author-standards">
            <li><strong>Contact forms:</strong> your name, email address and message.</li>
            <li><strong>Newsletter sign-up:</strong> your email address.</li>
            <li><strong>Press release submissions:</strong> company name, media contact email, the release text and any links you include.</li>
          </ul>
          <p>When you submit a form, we also record the page you sent it from, the time and your IP address. We use these to reply to you, to prevent spam and abuse (for example, by limiting repeated submissions), and to keep a private backup copy of submissions on our hosting server.</p>
        </section>

        <section aria-labelledby="p3">
          <h2 id="p3">How We Use Your Information</h2>
          <ul class="author-standards">
            <li>To reply to messages, tips and correction requests.</li>
            <li>To send the newsletter you signed up for. You can unsubscribe at any time by emailing us.</li>
            <li>To review press releases for publication.</li>
            <li>To protect the site against spam and misuse.</li>
          </ul>
          <p>We do not sell your personal information.</p>
        </section>

        <section aria-labelledby="p4">
          <h2 id="p4">Analytics and Cookies</h2>
          <p>We use Google Analytics to understand how many people visit the site and which pages they read. Google Analytics uses cookies and collects information such as your device, browser, approximate location and the pages you view. Google explains how it uses this data at <a href="https://policies.google.com/technologies/partner-sites" target="_blank" rel="noopener">How Google uses information from sites that use its services</a>. You can opt out with the <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener">Google Analytics opt-out browser add-on</a> or by blocking cookies in your browser.</p>
          <p>We also save your light or dark theme choice in your browser's local storage. It stays on your device and is not sent to us.</p>
        </section>

        <section aria-labelledby="p5">
          <h2 id="p5">Third-Party Services</h2>
          <ul class="author-standards">
            <li><strong>Hosting and email:</strong> the site and its form mailer run on our web hosting provider's servers, and form submissions are delivered to our email inbox.</li>
            <li><strong>Images:</strong> many article images are loaded from Unsplash, which receives your IP address when your browser loads an image.</li>
            <li><strong>External links:</strong> we link to other websites. Their privacy practices are their own.</li>
          </ul>
        </section>

        <section aria-labelledby="p6">
          <h2 id="p6">How Long We Keep Information</h2>
          <p>We keep form submissions only as long as we need them to respond, review a submission or protect the site, and we delete them on request.</p>
        </section>

        <section aria-labelledby="p7">
          <h2 id="p7">Your Choices and Rights</h2>
          <p>You can ask us to tell you what information we hold about you, correct it or delete it by emailing <a href="mailto:${SITE.email}">${SITE.email}</a>. Depending on where you live, you may have further rights under local data protection law, including the right to complain to your data protection authority.</p>
        </section>

        <section aria-labelledby="p8">
          <h2 id="p8">Children</h2>
          <p>This site is intended for adults and is not directed at children under 13. We do not knowingly collect information from children.</p>
        </section>

        <section aria-labelledby="p9">
          <h2 id="p9">Changes to This Policy</h2>
          <p>If we change this policy, we will update the date at the top of this page.</p>
        </section>`
  });
}

function buildTerms() {
  return buildInfoPage({
    path: TERMS_URL,
    crumb: "Terms of Use",
    title: "Terms of Use",
    description: "The terms for using Global Business News Today, including how you may share our content, submissions, external links and our information-only disclaimer.",
    updated: POLICY_UPDATED,
    body: `
        <section aria-labelledby="t1">
          <h2 id="t1">Using This Site</h2>
          <p>${esc(SITE.name)} is operated by ${esc(SITE.legalName)} in the United States. By using <a href="/">globalbusinessnewstoday.com</a>, you agree to these terms. If you do not agree, please do not use the site.</p>
        </section>

        <section aria-labelledby="t2">
          <h2 id="t2">Information, Not Advice</h2>
          <p>Our articles are for general information only. They are not investment, financial, legal, tax or medical advice, and they do not recommend buying or selling any security. Markets and rules change, so check important facts with the original source or a qualified professional before acting on them. See our <a href="${STANDARDS_URL}">editorial standards</a> for how we report.</p>
        </section>

        <section aria-labelledby="t3">
          <h2 id="t3">Our Content</h2>
          <p>Articles, graphics and site design are owned by ${esc(SITE.legalName)}, the publisher of ${esc(SITE.name)}, or used under licence. You may share links to our articles and quote short passages with a credit and a link to the original page. Please do not republish full articles without written permission. Photographs belong to their creators and are used under their licences.</p>
        </section>

        <section aria-labelledby="t4">
          <h2 id="t4">Submissions</h2>
          <p>When you send us a press release, tip or other material, you confirm that you have the right to share it and that it is accurate. You allow us to edit, publish or decline it. Press releases may be free or paid. They are published as supplied, and paid releases are labelled "Paid press release", as explained in our <a href="${STANDARDS_URL}#sponsored">press release policy</a>.</p>
        </section>

        <section aria-labelledby="t5">
          <h2 id="t5">External Links</h2>
          <p>We link to other websites to support our reporting. We are not responsible for their content, availability or practices, and a link is not an endorsement.</p>
        </section>

        <section aria-labelledby="t6">
          <h2 id="t6">Corrections and Liability</h2>
          <p>We work to keep our reporting accurate and correct errors promptly under our <a href="${STANDARDS_URL}#corrections">corrections policy</a>. The site is provided "as is", and to the extent allowed by law we are not liable for losses arising from reliance on its content.</p>
        </section>

        <section aria-labelledby="t7">
          <h2 id="t7">Privacy and Contact</h2>
          <p>Our <a href="${PRIVACY_URL}">privacy policy</a> explains how we handle personal information. Questions about these terms can be sent to <a href="mailto:${SITE.email}">${SITE.email}</a>.</p>
        </section>`
  });
}

// Google News sitemap: only articles from the last two days are eligible.
function buildNewsSitemap() {
  const cutoff = Date.now() - 2 * 24 * 60 * 60 * 1000;
  const urls = ARTICLES.filter(a => Date.parse(a.publishedAt) >= cutoff).map(a => `  <url>
    <loc>${SITE.url}${articleUrl(a)}</loc>
    <news:news>
      <news:publication>
        <news:name>${esc(SITE.name)}</news:name>
        <news:language>en</news:language>
      </news:publication>
      <news:publication_date>${a.publishedAt}</news:publication_date>
      <news:title>${esc(a.title)}</news:title>
    </news:news>
  </url>`);
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${urls.join("\n")}
</urlset>
`;
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
  </url>`.replace(/\n\s*\n/g, "\n"));
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
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
${section("Authors", Object.entries(AUTHORS).map(([name, p]) => `- [${name}](${SITE.url}${authorUrl(p)}): ${p.shortBio}`))}
${section("Editorial Policies", [`- [Editorial Standards and Corrections Policy](${SITE.url}${STANDARDS_URL}): How we source, date and correct our reporting`, `- [About Us](${SITE.url}${ABOUT_URL}): Who we are, our newsroom, ownership and contact details`, `- [Privacy Policy](${SITE.url}${PRIVACY_URL}): What data we collect and how to request deletion`, `- [Terms of Use](${SITE.url}${TERMS_URL}): Terms for using and sharing our content`])}
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
for (const dir of ["articles", "category", "author"]) fs.rmSync(path.join(ROOT, dir), { recursive: true, force: true });

const sitemapPages = [{ path: "/", lastmod: latest(ARTICLES) }];

write("index.html", buildHome());

for (const a of ARTICLES) {
  write(`articles/${a.id}/index.html`, buildArticle(a));
  sitemapPages.push({ path: articleUrl(a), lastmod: a.updatedAt || a.publishedAt });
}

write("category/all/index.html", buildCategory("all"));
sitemapPages.push({ path: "/category/all/", lastmod: latest(ARTICLES) });
for (const c of CATEGORIES) {
  write(`category/${c.slug}/index.html`, buildCategory(c.slug));
  const list = ARTICLES.filter(a => a.categorySlug === c.slug);
  if (list.length) sitemapPages.push({ path: categoryUrl(c.slug), lastmod: latest(list) });
}

for (const [name, profile] of Object.entries(AUTHORS)) {
  write(`author/${profile.slug}/index.html`, buildAuthor(name, profile));
  const list = ARTICLES.filter(a => a.author.name === name);
  if (list.length) sitemapPages.push({ path: authorUrl(profile), lastmod: latest(list) });
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
write("editorial-standards/index.html", buildStandards());
write("about/index.html", buildAbout());
write("privacy-policy/index.html", buildPrivacy());
write("terms/index.html", buildTerms());
sitemapPages.push({ path: "/contact.html" }, { path: "/submit-pr.html" }, { path: STANDARDS_URL }, { path: ABOUT_URL }, { path: PRIVACY_URL, lastmod: POLICY_UPDATED }, { path: TERMS_URL, lastmod: POLICY_UPDATED });

write("404.html", build404());
write("sitemap.xml", buildSitemap(sitemapPages));
write("news-sitemap.xml", buildNewsSitemap());
write("feed.xml", buildFeed());
write("llms.txt", buildLlmsTxt());

console.log(`Built ${ARTICLES.length} articles, ${CATEGORIES.length + 1} category pages, ${Object.keys(AUTHORS).length} author pages, home, contact, submit-pr, 404, sitemap.xml, feed.xml and llms.txt (assets v=${VERSION}).`);
