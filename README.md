# Global Business News Today

A high-performance, modern business news and corporate wire publication platform delivering real-time financial market intelligence, SME developments, technology insights, and verified corporate press releases.

---

## 🌟 Key Features

- **Editorial Newsroom Layout**: Responsive editorial typography and layout designed for international commerce, markets, and SME growth.
- **Hero & Trending Feed**: Lead story showcase, editor's picks, and ranked trending analysis.
- **Categorized Editorial Desks**:
  - World Business & Global Economy
  - Financial Markets & Banking
  - Technology & Enterprise AI
  - SMEs & Startup Intelligence
  - Commercial Real Estate
  - Corporate Wire & Press Releases
- **Interactive Modals & Instant Search**: In-browser search filtering and native `<dialog>` quick-read modal previews without page reloading.
- **Corporate Wire Portal (`submit-pr.html`)**: Press release submission and syndication interface for business announcements.
- **Theme Switcher**: Dark and light mode toggle with client-side persistence.
- **Automated CI/CD**: Continuous deployment pipeline using GitHub Actions to sync updates directly to live hosting.

---

## ✍️ Publishing a New Article

1. Add an entry to `js/articles-data.js` with `id`, `title`, `excerpt` (max 160 characters, used as the meta description), `category`, `categorySlug`, `author`, `publishedAt`, optional `updatedAt`, `readTime`, `tags`, `content`, `image` and `imageAlt`.
2. `image` must be a large image (Unsplash URLs are resized automatically; self-hosted images also need `imageWidth` of at least 1200 and `imageHeight`) so the story is eligible for Google Discover.
3. `imageAlt` must describe what the image shows. The build fails if it is missing or just repeats the headline.
4. `categorySlug` decides the section (world, markets, tech, smes, property, press-releases); the label shown on the site comes from it automatically. The newest `publishedAt` becomes the homepage lead story.
5. Run `node build/build.js` to regenerate every page, `sitemap.xml`, `feed.xml` and `llms.txt`, then commit and push. The deploy workflow also runs the build automatically.

Pages are generated from `build/build.js` (shared head, header and footer) and `build/pages/` (contact and press release forms). Do not edit the generated `index.html`, `articles/`, `category/`, `contact.html` or `submit-pr.html` by hand.

Form submissions (newsletter, contact, press release) are handled by `api/submit.php`, which emails them to the site owner and keeps a private backup outside `public_html`.

---

## 📁 Project Structure

```text
├── .github/
│   └── workflows/
│       └── deploy.yml          # Automated CI/CD deployment workflow
├── css/
│   └── styles.css              # Modern CSS (Grid, Flexbox, logical properties, themes)
├── js/
│   ├── articles-data.js        # News database and market index models
│   └── main.js                 # Theme switcher, market ticker, search, dialog modals
├── index.html                  # Front page portal
├── article.html                # Single story reading template
├── category.html               # Category archive view
├── submit-pr.html              # Press release submission portal
├── contact.html                # Editorial and advertising contact page
└── .gitignore
```

---

## 🚀 Continuous Deployment (CI/CD) Workflow

This project is configured with automated continuous deployment. 

```text
[Local Code Changes] ──► [git push origin main] ──► [GitHub Actions CI/CD] ──► [Live Production Server]
```

- Any approved commit pushed to the `main` branch automatically triggers `.github/workflows/deploy.yml`.
- The workflow securely authenticates with the production hosting environment and synchronizes file changes to `public_html` within 15–30 seconds.

---

## 🔒 Security, Credential Protection & Misuse Prevention

To safeguard the production infrastructure, brand integrity, and hosting environment against misuse, follow these security rules:

### 1. Strict Credential Isolation
- **NEVER commit sensitive credentials**: Do not hardcode or commit FTP hostnames, server IPs, passwords, private keys, or API tokens into any file, script, commit message, or pull request.
- **Encrypted Environment Secrets**: Deployment credentials must strictly reside in **GitHub Repository Secrets** (`Settings` → `Secrets and variables` → `Actions`):
  - `HOSTINGER_FTP_SERVER`
  - `HOSTINGER_FTP_USERNAME`
  - `HOSTINGER_FTP_PASSWORD`
- Secrets are masked in execution logs and never exposed in public build outputs.

### 2. Production Branch Governance
- Because pushes to `main` go **directly to production**, do not test unverified scripts directly on `main`.
- For feature updates or collaborative contributions, create a separate branch (`git checkout -b feature/update-news`), test locally, and merge only after verification.
- It is recommended to enable **Branch Protection Rules** on GitHub (`Settings` → `Branches` → protect `main`) to prevent accidental force pushes (`git push --force`) or unauthorized direct commits.

### 3. Anti-Scraping & Brand Protection
- The brand identity, design layout, corporate wire syndication trademarks, and editorial reporting of **Global Business News Today** are proprietary.
- Automated mass scraping, unauthorized content republishing, spoofing the corporate wire distribution system, or deploying replicas without written authorization is strictly prohibited.

---

## 💻 Local Development

1. **Clone the repository:**
   ```bash
   git clone https://github.com/trapti321/globalbusinessnewstoday.git
   cd globalbusinessnewstoday
   ```

2. **Run locally:**
   Open `index.html` in any modern web browser or serve via a local static server:
   ```bash
   npx serve .
   # or
   python3 -m http.server 8000
   ```

---

## 📄 Terms of Use & Legal Notice

All rights reserved © Global Business News Today (`globalbusinessnewstoday.com`).  
Unauthorized reproduction, reverse-engineering of deployment secrets, or commercial redistributions without prior written consent is strictly prohibited.
