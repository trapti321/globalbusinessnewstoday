// Notifies search engines about pages that changed in a deploy.
//   - IndexNow (Bing, Yandex, Naver, Seznam and other participating engines share submissions)
//   - WebSub hub for feed.xml (Google's public hub, used by feed readers and Google)
// Google itself has no general "submit URL" API: it discovers changes from sitemap.xml,
// news-sitemap.xml and the feed. This script never fails the deploy.
//
// Usage:
//   node build/notify-indexers.js <base-sha> <head-sha>   submit pages changed between two commits
//   node build/notify-indexers.js --all                    submit every URL in sitemap.xml
//   node build/notify-indexers.js --urls <url> [<url>...]  submit specific URLs

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const vm = require("vm");

const ROOT = path.join(__dirname, "..");
const SITE = "https://globalbusinessnewstoday.com";
const HOST = "globalbusinessnewstoday.com";
const FEED = `${SITE}/feed.xml`;
const HUB = "https://pubsubhubbub.appspot.com/";

const keyFile = fs.readdirSync(ROOT).find(f => /^[0-9a-f]{32}\.txt$/.test(f));
const KEY = keyFile ? fs.readFileSync(path.join(ROOT, keyFile), "utf8").trim() : null;

const sleep = ms => new Promise(r => setTimeout(r, ms));

// Every build rewrites shared page chrome (asset version, related stories), so a file diff
// would resubmit the whole site. Instead compare the article data between the two commits
// and submit only new or edited articles, their category pages and the homepage.
function loadArticles(rev) {
  try {
    const src = execSync(`git show ${rev}:js/articles-data.js`, { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
    return vm.runInNewContext(`${src}\n;ARTICLES`, { window: {} });
  } catch (e) {
    return null;
  }
}

function changedUrls(base, head) {
  if (!base || /^0+$/.test(base)) base = `${head}~1`;
  const before = loadArticles(base) || [];
  const after = loadArticles(head);
  if (!after) { console.log("Could not read articles at", head); return []; }
  const old = new Map(before.map(a => [a.id, JSON.stringify(a)]));
  const changed = after.filter(a => old.get(a.id) !== JSON.stringify(a));
  if (!changed.length) return [];
  const urls = changed.map(a => `${SITE}/articles/${a.id}/`);
  const cats = [...new Set(changed.map(a => a.categorySlug))].map(c => `${SITE}/category/${c}/`);
  return [...urls, `${SITE}/`, ...cats, `${SITE}/category/all/`];
}

function sitemapUrls() {
  const xml = fs.readFileSync(path.join(ROOT, "sitemap.xml"), "utf8");
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
}

// Wait until the deploy is actually serving the page, so engines don't crawl a 404.
async function waitLive(url, tries = 12) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { method: "HEAD", redirect: "manual" });
      if (res.status === 200) return true;
    } catch (e) { /* retry */ }
    await sleep(10000);
  }
  return false;
}

async function submitIndexNow(urls) {
  if (!KEY) { console.log("IndexNow: no key file found, skipping."); return; }
  for (let i = 0; i < urls.length; i += 10000) {
    const urlList = urls.slice(i, i + 10000);
    try {
      const res = await fetch("https://api.indexnow.org/indexnow", {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({ host: HOST, key: KEY, keyLocation: `${SITE}/${KEY}.txt`, urlList })
      });
      console.log(`IndexNow: ${res.status} ${res.statusText} for ${urlList.length} URL(s)`);
    } catch (e) {
      console.log(`IndexNow: request failed: ${e.message}`);
    }
  }
}

async function pingWebSub() {
  try {
    const res = await fetch(HUB, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ "hub.mode": "publish", "hub.url": FEED }).toString()
    });
    console.log(`WebSub hub: ${res.status} ${res.statusText} for ${FEED}`);
  } catch (e) {
    console.log(`WebSub hub: request failed: ${e.message}`);
  }
}

(async () => {
  const args = process.argv.slice(2);
  let urls;
  if (args[0] === "--all") urls = sitemapUrls();
  else if (args[0] === "--urls") urls = args.slice(1);
  else urls = changedUrls(args[0], args[1] || "HEAD");

  if (!urls.length) { console.log("No changed pages to submit."); return; }
  console.log(`Pages to submit (${urls.length}):\n  ${urls.slice(0, 50).join("\n  ")}${urls.length > 50 ? "\n  ..." : ""}`);

  // Confirm the first page (normally the newest article) is live before notifying anyone.
  if (!(await waitLive(urls[0]))) console.log(`Warning: ${urls[0]} did not return 200 yet; submitting anyway.`);

  await submitIndexNow(urls);
  if (urls.some(u => u.includes("/articles/"))) await pingWebSub();
})().catch(e => console.log(`notify-indexers: ${e.message}`));
