# CostMyDish Marketing Site

Next.js marketing website for the CostMyDish mobile app.

## Pages

- `/` — Landing page (features, how it works, pricing)
- `/contact` — Contact & Support
- `/terms` — Terms & Conditions
- `/privacy` — Privacy Policy

## Environment variables

Copy `.env.example` to `.env.local` and adjust:

```bash
NEXT_PUBLIC_SITE_URL=https://costmydish.com
NEXT_PUBLIC_SUPPORT_EMAIL=support@costmydish.com
NEXT_PUBLIC_PRIVACY_EMAIL=privacy@costmydish.com
```

## Development

```bash
cd marketing-site
cp .env.example .env.local   # if needed
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Build

```bash
npm run build
npm start
```

## Stack

- Next.js 16 (App Router)
- Tailwind CSS 4
- JavaScript
