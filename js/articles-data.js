// Sample Business News Data for Global Business News Today
const ARTICLES = [
  {
    id: "fed-rate-cuts-global-markets-2026",
    title: "Global Central Banks Pivot as Inflation Cools: What Rate Cuts Mean for SME Growth in 2026",
    excerpt: "With inflation normalizing across major economies, central banks are signaling strategic interest rate cuts, opening fresh liquidity channels for mid-tier businesses and capital expenditure.",
    category: "Markets & Economy",
    categorySlug: "markets",
    author: {
      name: "Marcus Vance",
      role: "Chief Financial Analyst",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80"
    },
    publishedAt: "2026-11-02T08:30:00Z",
    readTime: "5 min read",
    image: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=1200&q=80",
    isLead: true,
    isTrending: true,
    views: 14820,
    tags: ["Central Banks", "Monetary Policy", "Interest Rates", "SME Finance"],
    content: `
      <p class="lead">Central bankers across Europe, North America, and Asia-Pacific are coordinating monetary easing strategies designed to support sustainable growth without reigniting price pressures.</p>
      
      <p>The global macroeconomic landscape is shifting rapidly. Following three years of stringent inflation containment measures, benchmark borrowing costs are declining across major trading blocs. For business leaders, particularly in the small-to-medium enterprise (SME) sector, this marks an inflection point in capital allocation and debt refinancing.</p>

      <h2>The Impact on Small & Medium Enterprises</h2>
      <p>SMEs have shouldered the burden of high debt servicing costs over the past cycle. Recent industry data shows that commercial loan yields have compressed by 85 basis points on average over the last quarter, giving privately held enterprises the runway needed to fund long-delayed modernization and automated workflow rollouts.</p>

      <blockquote>"We are witnessing a structural transition from balance sheet defense to targeted expansion across middle-market industrials and digital service providers." — Elena Rostova, Senior Economist at Global Capital Insights</blockquote>

      <h2>Currency Dynamics and Cross-Border Trade</h2>
      <p>As rate differentials narrow between the US Federal Reserve, the European Central Bank, and the Bank of England, foreign exchange volatility has trended down to multi-year lows. This stability simplifies hedging for exporters and supply chain operators navigating international sourcing contracts.</p>

      <h2>Key Takeaways for Corporate Executives</h2>
      <ul>
        <li><strong>Audit Existing Credit Facilities:</strong> Re-evaluate covenants and fixed vs. floating debt exposure to capitalize on lower rates.</li>
        <li><strong>Accelerate Capex Programs:</strong> Equipment financing and digital infrastructure investments are becoming markedly more affordable.</li>
        <li><strong>Revisit Valuation Multiples:</strong> M&A pipelines in the lower-middle market are thawing as private equity sponsors gain cheaper debt packages.</li>
      </ul>
    `
  },
  {
    id: "ai-enterprise-adoption-roi-surge",
    title: "From Pilots to Profits: How Enterprise AI is Delivering Real ROI for Mid-Sized Firms",
    excerpt: "New benchmark reports reveal that companies deploying domain-specific AI agents in customer operations and supply chain management are achieving 22% faster cycle times.",
    category: "Tech & AI",
    categorySlug: "tech",
    author: {
      name: "Sophia Chen",
      role: "Technology Editor",
      avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=150&q=80"
    },
    publishedAt: "2026-11-02T06:15:00Z",
    readTime: "4 min read",
    image: "https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=1200&q=80",
    isLead: false,
    isTrending: true,
    views: 11200,
    tags: ["Artificial Intelligence", "Enterprise Tech", "Productivity", "Automation"],
    content: `
      <p class="lead">The era of speculative generative AI hype is giving way to concrete corporate balance-sheet results.</p>
      <p>Mid-sized enterprises across logistics, legal services, and manufacturing are moving beyond generic chatbot experiments. Instead, organizations are deploying tightly scoped autonomous agents connected directly to enterprise resource planning (ERP) systems.</p>
      <p>According to the Q4 Global Enterprise Tech Survey, over 64% of companies with revenues between $15M and $150M reported measurable productivity gains exceeding 18% within six months of deployment.</p>
    `
  },
  {
    id: "green-energy-manufacturing-incentives",
    title: "Clean Energy Infrastructure: Global Grants Spark Surge in Sustainable Manufacturing",
    excerpt: "Tax credits and localized subsidies across Australia, the EU, and North America are prompting industrial manufacturers to electrify plants ahead of 2030 regulatory deadlines.",
    category: "World Business",
    categorySlug: "world",
    author: {
      name: "David Harrison",
      role: "Industrial & Energy Correspondent",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80"
    },
    publishedAt: "2026-11-01T14:45:00Z",
    readTime: "6 min read",
    image: "https://images.unsplash.com/photo-1497435334941-8c899ee9e8e9?auto=format&fit=crop&w=1200&q=80",
    isLead: false,
    isTrending: false,
    views: 8940,
    tags: ["Clean Energy", "Manufacturing", "ESG", "Industrial Policy"],
    content: `
      <p class="lead">Industrial companies are unlocking unprecedented capital flows by pairing green manufacturing tax credits with on-site solar and micro-grid storage.</p>
      <p>Commercial electricity rates continue to weigh on margins, but forward-looking manufacturing plants in regions like Queensland, Northern Europe, and the US Sunbelt are achieving near-energy independence through private generation.</p>
    `
  },
  {
    id: "sme-cash-flow-fintech-revolution",
    title: "Next-Gen Invoicing and Embedded Banking: The Lifeline Transforming SME Cash Flow",
    excerpt: "Delayed receivables remain the number one killer of small enterprises. A new wave of real-time embedded payment platforms is settling invoices in minutes, not months.",
    category: "SMEs & Startups",
    categorySlug: "smes",
    author: {
      name: "Alisha Patel",
      role: "Fintech & SME Specialist",
      avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80"
    },
    publishedAt: "2026-11-01T11:20:00Z",
    readTime: "4 min read",
    image: "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=1200&q=80",
    isLead: false,
    isTrending: true,
    views: 13450,
    tags: ["SME News", "Fintech", "Cash Flow", "Payments"],
    content: `
      <p class="lead">For decades, small contractors, agencies, and suppliers were held hostage by 60-day and 90-day payment terms imposed by multinational corporations.</p>
      <p>Today, embedded finance mechanisms within cloud accounting software allow vendors to get paid immediately upon approval, using automated dynamic discounting and ledger-backed micro-liquidity.</p>
    `
  },
  {
    id: "commercial-property-hybrid-workspace",
    title: "Commercial Real Estate Adapts: Office Towers Pivot to Mixed-Use Innovation Hubs",
    excerpt: "With remote and hybrid work permanently ingrained, commercial landlords in prime CBDs are converting excess office square footage into boutique hospitality, wellness, and research labs.",
    category: "Real Estate",
    categorySlug: "property",
    author: {
      name: "Arthur Pendelton",
      role: "Real Estate Market Analyst",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80"
    },
    publishedAt: "2026-10-31T17:00:00Z",
    readTime: "5 min read",
    image: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80",
    isLead: false,
    isTrending: false,
    views: 7420,
    tags: ["Real Estate", "Office Space", "Commercial Property", "Urban Development"],
    content: `
      <p class="lead">Prime commercial properties that once relied solely on 10-year corporate leases are reinventing their revenue models.</p>
      <p>From Sydney to Singapore and London to Chicago, developers are creating multi-tenant spaces that merge grade-A flexible desks with collaborative seminar halls, private event clubs, and tech incubation suites.</p>
    `
  },
  {
    id: "pr-nexura-global-logistics-expansion",
    title: "Press Release: Nexura Global Logistics Announces $45M Automated Fulfillment Center Expansion",
    excerpt: "Leading logistics and cargo operator Nexura Global today officially breaks ground on its next-generation multi-modal distribution facility to streamline trans-Pacific cargo freight.",
    category: "Press Releases",
    categorySlug: "press-releases",
    author: {
      name: "Corporate Wire",
      role: "Press Distribution",
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80"
    },
    publishedAt: "2026-10-31T09:00:00Z",
    readTime: "3 min read",
    image: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80",
    isLead: false,
    isTrending: false,
    views: 6100,
    tags: ["Press Release", "Logistics", "Supply Chain", "Corporate Expansion"],
    content: `
      <p class="lead"><strong>SYDNEY / NEW YORK — Corporate Wire</strong> — Nexura Global Logistics, a premier provider of international supply chain management solutions, has formally announced the groundbreaking of its new flagship automated distribution hub.</p>
      <p>The 350,000 sq ft facility incorporates state-of-the-art robotic sorting racks, electric fleet charging bays, and automated customs clearance documentation pipelines.</p>
      <p><em>To distribute your company's corporate announcements across Global Business News Today and affiliate networks, visit our Submit PR portal.</em></p>
    `
  },
  {
    id: "cybersecurity-compliance-middle-market",
    title: "Cyber Insurance Premiums Surge: The Essential Security Checklist for Corporate Boards",
    excerpt: "Ransomware underwriters are demanding rigorous proof of multi-factor identity enforcement and zero-trust segmentation before approving commercial liability policies.",
    category: "Tech & AI",
    categorySlug: "tech",
    author: {
      name: "Sophia Chen",
      role: "Technology Editor",
      avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=150&q=80"
    },
    publishedAt: "2026-10-30T15:10:00Z",
    readTime: "5 min read",
    image: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1200&q=80",
    isLead: false,
    isTrending: false,
    views: 8190,
    tags: ["Cybersecurity", "Risk Management", "Corporate Governance", "Insurance"],
    content: `
      <p class="lead">Corporate risk officers are finding that cybersecurity is no longer merely an IT operational topic, but a board-level fiduciary imperative.</p>
      <p>With underwriters inspecting telemetry and incident response rehearsals before binding coverage, organizations without automated vulnerability patch cycles are facing 40% premium penalties.</p>
    `
  },
  {
    id: "venture-debt-startup-funding-shift",
    title: "Venture Debt Overtakes Dilutive Equity: Founders Guard Ownership in Cautious Market",
    excerpt: "Early-stage founders are increasingly turning to structured venture debt and revenue-based facilities to extend operational runway without slashing valuation multiples.",
    category: "SMEs & Startups",
    categorySlug: "smes",
    author: {
      name: "Alisha Patel",
      role: "Fintech & SME Specialist",
      avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80"
    },
    publishedAt: "2026-10-30T11:45:00Z",
    readTime: "4 min read",
    image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80",
    isLead: false,
    isTrending: false,
    views: 9340,
    tags: ["Startups", "Venture Capital", "Venture Debt", "Entrepreneurship"],
    content: `
      <p class="lead">The balance of power in startup capitalization has stabilized as founders seek alternative growth finance.</p>
      <p>Instead of taking down-rounds from institutional venture capital, revenue-positive software and B2B service firms are pairing venture debt lines with strict expense management to preserve equity value.</p>
    `
  }
];

const MARKET_DATA = [
  { symbol: "S&P 500", value: "5,864.20", change: "+0.62%", positive: true },
  { symbol: "NASDAQ", value: "18,518.61", change: "+0.85%", positive: true },
  { symbol: "DOW JONES", value: "42,233.05", change: "-0.14%", positive: false },
  { symbol: "FTSE 100", value: "8,210.40", change: "+0.34%", positive: true },
  { symbol: "NIKKEI 225", value: "38,651.97", change: "+1.12%", positive: true },
  { symbol: "BITCOIN", value: "$71,450.00", change: "+2.40%", positive: true },
  { symbol: "BRENT CRUDE", value: "$73.10/bbl", change: "-0.80%", positive: false },
  { symbol: "GOLD", value: "$2,745.80/oz", change: "+0.45%", positive: true }
];

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ARTICLES, MARKET_DATA };
}
