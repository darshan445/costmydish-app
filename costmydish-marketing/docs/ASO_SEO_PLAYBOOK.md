# CostMyDish ASO / SEO Playbook

Complete action plan to rank for **food cost calculator**, **recipe cost calculator**, and related terms on Google Search, Apple App Store, and Google Play — with primary focus on **US, UK, Canada, Australia** and secondary focus on **India + global**.

---

## What we implemented (marketing site)

| Asset | URL / file | Purpose |
|-------|------------|---------|
| Dynamic sitemap | `/sitemap.xml` → `app/sitemap.js` | All indexable pages + 4 keyword landing pages |
| Dynamic robots | `/robots.txt` → `app/robots.js` | Allow crawl; block auth utility pages |
| Web manifest | `/manifest.webmanifest` | PWA metadata, theme color, icons |
| JSON-LD | `lib/seo.js` | Organization, WebSite, MobileApplication, FAQ, Breadcrumbs |
| Keyword landing pages | `/food-cost-calculator`, `/recipe-cost-calculator`, `/bakery-pricing-calculator`, `/restaurant-menu-costing` | Target long-tail SEO |
| Comparison page | `/compare` | vs spreadsheets, Fillet, meez, xtraCHEF, DishCost |
| hreflang stubs | `en-US`, `en-GB`, `en-CA`, `en-AU`, `en-IN`, `x-default` | Regional signals (same English content today) |
| OG / social | `/og-image.png`, `/og-banner.png`, `/logo.png` | Share previews + GSC rich results |
| noindex | `/confirm`, `/reset-password`, `/update-password`, `/delete-account` | Keep utility pages out of index |

**Deploy** after every SEO change, then request indexing in GSC (see below).

---

## Competitive landscape (March 2026 snapshot)

### iOS US — keyword: `food cost calculator` (popularity 5, competitiveness 40)

| Rank | App | Weakness we exploit |
|------|-----|---------------------|
| 1 | Food Cost Calculator: Recipe+ | Dated UX, limited free tier |
| 2 | Food Cost Calc & Pricing | Generic, weak margin workflow |
| 3 | Food Cost Calculator - Calcy | No ingredient library sync story |
| 4 | Recipe Cost Calculator App | Single-purpose, no restaurant filters |
| 5 | KitchenCost | Niche naming, limited ASO breadth |
| 6 | **Fillet** | Chef-focused but subscription friction |
| 7 | **xtraCHEF** | Enterprise ($75+/mo), browser-first |
| — | **CostMyDish** | ~#17 iOS US (improving); strong mobile wizard + free tier |

### CostMyDish current iOS US keyword positions (AppFigures)

| Keyword | Position | Priority |
|---------|----------|----------|
| recipe costing | 12 | Push to top 5 |
| food cost calculator | 17 | Push to top 5 |
| food costing software | 17 | Maintain |
| ingredient cost tracker | 6 | Defend |
| recipe cost | 23 | Landing page + reviews |
| recipe cost calculator | 42 | Dedicated page live |
| restaurant food cost calculator recipe c | 20 | Long-tail in subtitle |

### Competitor complaints (patterns from store reviews & forums)

Use these in **store screenshots**, **landing page copy**, and **review replies**:

1. **Spreadsheets** — unit conversion errors, manual recalc when one price changes
2. **Enterprise tools (meez, xtraCHEF)** — too expensive for independents, overkill features, desktop-only
3. **Generic calculator apps** — no food cost %, no profit/margin view, confusing UX
4. **Fillet / KitchenCost** — subscription paywalls before value, steep learning curve
5. **Bakery-specific (CakeCost, BakeCost)** — slice vs whole-cake pricing awkward

**CostMyDish positioning:** *Mobile-first food cost calculator — free to start, ingredient library, live food cost %, dish profit, over-target alerts — without enterprise pricing.*

---

## Google Search Console — setup & ongoing use

### One-time setup

1. **Property:** Add `https://www.costmydish.com` as **Domain** property (covers www + apex) *or* URL-prefix for `https://www.costmydish.com/`.
2. **Verify ownership:**
   - Option A (recommended): DNS TXT record at your registrar.
   - Option B: Add to `.env.local` and redeploy:
     ```
     NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=your_meta_tag_content
     ```
     (Pulled from GSC → Settings → Ownership verification → HTML tag.)
3. **Submit sitemap:** `https://www.costmydish.com/sitemap.xml`
4. **Set preferred domain:** Ensure site always redirects apex → `www` (or pick one and stick to it). Canonicals already use `www`.
5. **Link GA4** (if you use Analytics): GSC → Settings → Associations.

### Request indexing (do this after deploy)

In GSC → **URL Inspection**, request indexing for:

- `https://www.costmydish.com/`
- `https://www.costmydish.com/food-cost-calculator`
- `https://www.costmydish.com/recipe-cost-calculator`
- `https://www.costmydish.com/bakery-pricing-calculator`
- `https://www.costmydish.com/restaurant-menu-costing`
- `https://www.costmydish.com/compare`

### Weekly GSC routine (15 min)

| Report | Action |
|--------|--------|
| **Performance → Queries** | Sort by impressions; find queries ranking 5–20 → improve matching landing page H1 + first paragraph |
| **Performance → Pages** | Low CTR with good position → rewrite title/meta description |
| **Indexing → Pages** | Fix any "Crawled – currently not indexed" (add internal links from homepage/footer) |
| **Experience → Core Web Vitals** | Keep LCP < 2.5s (Next.js static pages should pass) |
| **Enhancements → FAQ** | Confirm FAQ rich results on homepage + landing pages |
| **Links** | Track referring domains; pursue food-industry blogs, bakery forums, Reddit r/Chefit, r/Baking |

### Target web keywords (by region)

**Primary (US, UK, CA, AU):**

- food cost calculator
- recipe cost calculator
- food cost percentage calculator
- restaurant food cost calculator
- bakery pricing calculator
- menu costing app
- food costing software free
- recipe costing app

**Secondary (India + global):**

- food cost calculator app
- recipe cost calculator india
- catering food cost calculator
- food truck menu pricing

Each primary keyword has a dedicated landing page or section on `/compare`.

---

## Apple App Store Connect — ASO checklist

### App name (30 chars max)

**Recommended:** `CostMyDish: Food Cost Calc`

Alternate if rejected: `CostMyDish — Recipe Costing`

### Subtitle (30 chars)

**Recommended:** `Recipe & Menu Food Cost %`

### Keyword field (100 chars, comma-separated, no spaces after commas)

```
food,cost,calculator,recipe,restaurant,bakery,menu,pricing,margin,catering,chef,ingredient,profit,truck
```

**UK / AU / CA localizations:** Duplicate English but swap spelling where needed (`flavour` not required in keywords). Create **en-GB**, **en-AU**, **en-CA** store listings.

### Promotional text (170 chars, updatable without review)

```
Calculate food cost % and dish profit on your phone. Free ingredient library, live margin alerts, and multi-format pricing — built for restaurants, bakeries & food trucks.
```

### Description structure (first 3 lines matter most)

```
CostMyDish is the free food cost calculator built for chefs, bakers, and food business owners who need accurate recipe costing without spreadsheets or $75/month software.

• Live food cost % and profit as you build each dish
• Ingredient library — update a buy price once, every dish recalculates
• Green / yellow / red margin vs your target
• Multiple selling formats (slice, portion, whole item)
• Free plan: 5 dishes & 20 ingredients

WHY CHEFS SWITCH FROM SPREADSHEETS
...

DOWNLOAD FREE — iOS & Android
https://www.costmydish.com
```

### Screenshots (6.7" iPhone required)

1. **Hero:** "Know your food cost % in 2 minutes" + wizard
2. **Ingredient library** with price update
3. **Result screen** — food cost %, profit, margin badge
4. **Dishes list** — On Target / Over Target filters
5. **Bakery** — slice vs whole cake pricing
6. **Free vs Pro** — honest pricing table

Use **caption overlays** with keywords: "Food Cost Calculator", "Recipe Costing", "Menu Margin".

### Categories

- **Primary:** Food & Drink
- **Secondary:** Business

### In-App Events (optional, boosts discovery)

- "New: Food Cost Wizard" — 2-week event after major releases

### Track in AppFigures

Track these keywords per country: `food cost calculator`, `recipe costing`, `recipe cost calculator`, `bakery pricing`, `menu costing`.

---

## Google Play Console — ASO checklist

### App title (30 chars)

`CostMyDish: Food Cost Calculator`

### Short description (80 chars)

`Free recipe & food cost calculator. Margin %, profit & ingredient library.`

### Full description (first 250 chars visible)

Mirror iOS description; front-load: **food cost calculator**, **recipe cost**, **restaurant**, **bakery**, **free**.

### Store listing experiments

Run A/B tests on:
- Icon (green plate vs calculator motif)
- Short description (margin % vs "free food cost calculator")
- Feature graphic text

### Tags / category

- **Category:** Business (or Food & Drink if available in your region)
- **Tags:** food cost, recipe calculator, restaurant, bakery, catering

### Screenshots

Same narrative as iOS; add **7" tablet** if you support tablets.

### Custom store listing (optional)

Create listing targeting **United Kingdom** with "menu costing" emphasis.

---

## Regional rollout priority

| Tier | Countries | Store localizations | Web hreflang |
|------|-----------|---------------------|--------------|
| 1 | US, UK, CA, AU | en-US, en-GB, en-CA, en-AU | Done in `lib/seo.js` |
| 2 | India | en-IN listing + INR in screenshots | en-IN hreflang |
| 3 | Global | Default English | x-default |

**India-specific tips:**
- Show ₹ currency in one screenshot
- Mention metric units (kg, g, L) in Play description
- Pursue backlinks from Indian food entrepreneur blogs / YouTube

---

## Content & link building (monthly)

1. **Blog (future):** "What is a good food cost percentage for restaurants?" → internal link to `/food-cost-calculator`
2. **Guest posts:** Chef blogs, bakery associations, food truck associations
3. **Directories:** Product Hunt, AlternativeTo (vs Fillet, meez), Capterra (when ready)
4. **Reddit/Quora:** Answer "how to calculate food cost" with helpful reply + link (no spam)
5. **YouTube:** 60-second "How to cost a recipe in CostMyDish" → link in description

---

## Review generation (ASO multiplier)

Store algorithms weight **rating + velocity + keyword-rich reviews**.

1. In-app prompt after user saves 3rd dish (not before — they need value first)
2. Reply to every review within 48h mentioning "food cost" naturally
3. Ask happy beta users to mention: *"food cost calculator"*, *"recipe costing"*, *"bakery pricing"*

---

## KPIs to watch

| Channel | Metric | Target (90 days) |
|---------|--------|-------------------|
| GSC | Clicks from "food cost calculator" | 500+/mo |
| GSC | Avg position top 10 queries | < 15 |
| iOS ASO | Rank `food cost calculator` US | Top 5 |
| iOS ASO | Rank `recipe costing` US | Top 5 |
| Play ASO | Top 10 for "food cost calculator" | Top 10 |
| Conversion | Store page → install rate | > 25% |

---

## Deployment checklist

```bash
cd costmydish-marketing
npm run build
# deploy to Vercel/hosting
```

After deploy:

1. Verify `https://www.costmydish.com/robots.txt` shows sitemap line
2. Verify `https://www.costmydish.com/sitemap.xml` lists all 10 URLs
3. GSC → Sitemaps → resubmit if needed
4. GSC → URL Inspection → request indexing for new pages
5. Update App Store + Play listings with copy above
6. Track keyword ranks weekly in AppFigures

---

## Environment variables

```env
NEXT_PUBLIC_SITE_URL=https://www.costmydish.com
NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=   # optional, from GSC HTML tag
NEXT_PUBLIC_SUPPORT_EMAIL=support@costmydish.com
NEXT_PUBLIC_PRIVACY_EMAIL=privacy@costmydish.com
```

---

## What beats incumbents long-term

1. **SEO moat** — 4+ landing pages + compare page + FAQ schema (implemented)
2. **ASO moat** — keyword-aligned screenshots, reviews mentioning core terms
3. **Product moat** — mobile wizard, draft resume, over-target dish filters (app)
4. **Trust moat** — free tier that actually works; transparent pricing on `/compare`
5. **Speed moat** — ship store listing updates every release; refresh promotional text monthly

This is a marathon. Enterprise competitors won't out-SEO you on "free food cost calculator app" — but you must **deploy**, **submit sitemap**, **update store listings**, and **collect reviews** consistently.
