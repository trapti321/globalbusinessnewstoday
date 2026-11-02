# Global Business News Today (globalbusinessnewstoday.com)

A high-performance, modern business news and corporate wire publication website inspired by Business Daily Media (`businessdailymedia.com`).

---

## 🌟 Key Features

- **Editorial Masthead & Navigation**: Sleek business media design tailored for international commerce, SME insights, markets, and corporate developments.
- **Live Financial Market Ticker**: Real-time styled index tracker covering S&P 500, NASDAQ, DOW, FTSE, Nikkei, Bitcoin, Crude Oil, and Gold.
- **Top Stories & Lead Hero**: Prominent lead breaking news spotlight with editor's picks and numbered trending stories (1–4).
- **Categorized Sections**: World Business, Markets & Finance, Tech & AI, SMEs & Startups, Commercial Real Estate, and Corporate Press Releases.
- **Interactive Quick Read & Live Search**: Instant article preview via native HTML5 dialog modals without page reloads, plus real-time client-side search.
- **Press Release Wire Portal (`submit-pr.html`)**: Submission workflow for companies to distribute corporate announcements (similar to Business Daily Media's core syndication model).
- **Dark / Light Mode**: Seamless theme switcher with persistent preferences stored in `localStorage`.
- **Automated GitHub CI/CD**: Ready-to-go `.github/workflows/deploy.yml` for automated push-to-deploy syncing to Hostinger.

---

## 📁 Project Structure

```text
globalbusinessnewstoday/
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Actions auto-deploy to Hostinger
├── css/
│   └── styles.css              # Custom editorial stylesheet (CSS Grid, Flexbox, Dark mode)
├── js/
│   ├── articles-data.js        # Articles database and financial market indexes
│   └── main.js                 # Theme switcher, ticker, search, quick read, modals
├── index.html                  # Main news portal front page
├── article.html                # In-depth single article reading template
├── category.html               # Filtered category archive view
├── submit-pr.html              # Corporate press release submission portal
├── contact.html                # Editorial contact and advertising inquiry page
└── .gitignore
```

---

## 🚀 Deployment Guide: GoDaddy + Hostinger + GitHub

### Step 1: Connect GoDaddy Domain to Hostinger

You have registered `globalbusinessnewstoday.com` on GoDaddy and have hosting on Hostinger. To connect them:

#### Option A (Recommended): Update Nameservers in GoDaddy
1. Log in to your **Hostinger hPanel** -> **Websites** -> Check your domain's assigned nameservers (usually `ns1.dns-parking.com` and `ns2.dns-parking.com`).
2. Log in to **GoDaddy** -> Go to **Domain Portfolio** -> Click on `globalbusinessnewstoday.com`.
3. Select **DNS** -> **Nameservers** -> Click **Change Nameservers**.
4. Choose **"I'll use my own nameservers"** and enter:
   - `ns1.dns-parking.com`
   - `ns2.dns-parking.com`
5. Click **Save** (DNS propagation usually takes 15 minutes to a few hours).

#### Option B: Point via A Record (If keeping GoDaddy Nameservers)
1. In Hostinger hPanel -> Check your **Hosting IP Address** (e.g. `185.xxx.xxx.xxx`).
2. In GoDaddy DNS Management:
   - Edit the **A Record** (`@`): Set value to Hostinger's IP address.
   - Edit the **CNAME Record** (`www`): Set value to `@` or `globalbusinessnewstoday.com`.

---

### Step 2: Push this Project to GitHub

1. Open your terminal in this directory:
   ```bash
   cd /Users/kt/.gemini/antigravity/scratch/globalbusinessnewstoday
   ```
2. Check your git status and commit all files:
   ```bash
   git add .
   git commit -m "Initial release of Global Business News Today portal"
   ```
3. Go to [GitHub.com](https://github.com) and create a new repository named `globalbusinessnewstoday` (set it to Public or Private).
4. Link and push your code:
   ```bash
   git branch -M main
   git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/globalbusinessnewstoday.git
   git push -u origin main
   ```

---

### Step 3: Configure Automated Deployment to Hostinger

There are two easy methods to deploy from GitHub to Hostinger:

#### Method 1: Automated GitHub Actions (Pre-configured via `.github/workflows/deploy.yml`)
1. Log in to **Hostinger hPanel** -> Select your website -> Go to **Files** -> **FTP Accounts**.
2. Note your FTP details:
   - **FTP Host / Server** (e.g., `ftp.globalbusinessnewstoday.com` or Hostinger's server IP)
   - **FTP Username**
   - **FTP Password**
3. In your GitHub repository:
   - Go to **Settings** -> **Secrets and variables** -> **Actions** -> Click **New repository secret**.
   - Add these 3 secrets:
     - `HOSTINGER_FTP_SERVER` : Your Hostinger FTP host / server address
     - `HOSTINGER_FTP_USERNAME` : Your FTP username
     - `HOSTINGER_FTP_PASSWORD` : Your FTP password
4. Now, every time you run `git push origin main`, GitHub Actions will automatically transfer and update the files in Hostinger's `public_html` directory within seconds!

#### Method 2: Hostinger Native Git Manager (Alternative)
1. In Hostinger hPanel -> Go to **Advanced** -> **Git**.
2. Paste your repository URL: `https://github.com/<YOUR_GITHUB_USERNAME>/globalbusinessnewstoday.git`.
3. Set **Branch** to `main`.
4. Set **Install Path** to `/` or `public_html`.
5. Click **Create** and **Deploy**.
6. (Optional) Copy the **Webhook URL** provided by Hostinger and paste it into GitHub (`Settings -> Webhooks`) for automatic deployments on push.
