# Global Business News Today

A high-performance, modern business news and corporate wire publication platform delivering real-time financial market intelligence, SME developments, technology insights, and verified corporate press releases.

---

## 🌟 Key Features

- **Editorial Newsroom Layout**: Responsive editorial typography and layout designed for international commerce, markets, and SME growth.
- **Financial Market Watch Strip**: Live index tracking for major global benchmarks (S&P 500, NASDAQ, Dow Jones, FTSE 100, Nikkei 225, Bitcoin, Crude Oil, and Gold).
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
- **Automated CI/CD**: Continuous deployment pipeline using GitHub Actions to sync updates to web hosting.

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

## 🚀 Automated Deployment (CI/CD)

This repository is configured with zero-downtime automated deployment to Hostinger via GitHub Actions (`.github/workflows/deploy.yml`).

### 1. Required Repository Secrets
Ensure the following 3 secrets are configured in your GitHub repository (**Settings → Secrets and variables → Actions**):
- `HOSTINGER_FTP_SERVER`: Hostinger FTP hostname or server IP
- `HOSTINGER_FTP_USERNAME`: Hostinger FTP account username
- `HOSTINGER_FTP_PASSWORD`: Hostinger FTP account password

### 2. How to Deploy Changes
Whenever you update code, articles, or styles, push to the `main` branch:

```bash
git add .
git commit -m "Update headlines and news content"
git push origin main
```

### 3. What Happens in the Background
1. **GitHub Actions Triggers**: Detects the push to `main` and starts the sync workflow.
2. **Secure FTPS Sync**: Connects to Hostinger using your encrypted repository secrets.
3. **Instant Live Update**: Only changed files are transferred into `public_html`, and updates go live on [globalbusinessnewstoday.com](https://globalbusinessnewstoday.com) within 15–30 seconds.

---

## 📄 License & Attribution

All rights reserved © Global Business News Today.
