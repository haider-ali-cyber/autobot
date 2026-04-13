# Sellora — Complete Guide

## Ye kya hai?

Sellora ek **all-in-one e-commerce intelligence platform** hai jo Amazon aur Shopify sellers ke liye banaya gaya hai. Abhi ye **demo/prototype phase** mein hai — matlab sab kuch real UI dikhata hai lekin actual data APIs se nahi ata.

---

## Ye kese kaam karta hai? (Architecture)

```
[Amazon SP-API]  ──►
[Shopify API]    ──►  Sellora Backend  ──►  Dashboard
[Meta API]       ──►  (Node.js/Next.js)     (Ye jo aap dekh rahe hain)
[WhatsApp API]   ──►
```

Jab production mein hoga:
- Seller apna store connect karega (OAuth ya API key)
- Sellora background mein data sync karega (har 5-15 min)
- Dashboard pe real orders, revenue, aur social messages nazar ayenge

---

## Features — Kese Use Karein

### 1. Product Research (`/dashboard/product-hunter`)
**Kya karta hai:** Different niches mein selling potential wale products dhundta hai.

**Kese use karein:**
1. Search box mein niche ya product name likho (e.g. "neck massager")
2. Platform filter lagao (Amazon / Shopify / TikTok)
3. Category filter lagao
4. Table mein results dekho:
   - **Est. Profit** = sell price minus sourcing cost
   - **Demand** = search volume / BSR trend (0-100)
   - **Competition** = Low/Medium/High (kitne sellers hain)

> **Pro tip:** Competition Low + Demand 80+ = best opportunity

---

### 2. Keyword Research (`/dashboard/keyword-research`)
**Kya karta hai:** Amazon aur Google pe products ke keywords dhundta hai.

**Kese use karein:**
1. Product name likhein
2. Platform select karein
3. Keywords dekhein — Volume, CPC, aur Difficulty note karein
4. Low difficulty + high volume keywords listing mein use karein

---

### 3. Listing Builder (`/dashboard/listing-generator`)
**Kya karta hai:** Amazon ya Shopify ke liye optimized product listing banata hai.

**Kese use karein:**
1. Platform choose karein (Amazon / Shopify / TikTok)
2. Product ka name aur basic details likhein
3. "Generate Listing" press karein
4. Title, bullet points, aur description copy karein

---

### 4. Competitor Analysis (`/dashboard/competitor-spy`)
**Kya karta hai:** Kisi bhi competitor ke ASIN ya Shopify store ko track karta hai.

**Kese use karein:**
1. ASIN (e.g. B09X...) ya Shopify URL paste karein
2. Rank history chart dekhein
3. Unki pricing, sales estimate, aur ad strategy dekhein

---

### 5. Ad Intelligence (`/dashboard/ad-spy`)
**Kya karta hai:** Dikhata hai kaunse ads chal rahe hain — Facebook, Instagram, TikTok pe.

**Kese use karein:**
1. Product ya brand name search karein
2. Winning ads dekhein (score, views, days running)
3. Script Generator se apna ad script banaein

---

### 6. Integrations (`/dashboard/integrations`) ← NEW
**Kya karta hai:** Apna Amazon, Shopify, Meta, aur WhatsApp account connect karo.

**Amazon connect karna:**
1. Amazon Seller Central → Apps & Services → Develop Apps
2. New app banao, Client ID + Secret copy karo
3. Sellora Integrations page pe paste karo
4. Connect karo — read-only access milegi

**Shopify connect karna:**
1. Shopify Admin → Settings → Apps → Develop apps
2. Private app banao, Orders + Products API enable karo
3. Access token copy karo
4. Sellora mein store URL + token dalo

**Real faida:** Jab connected hoga, dashboard pe real orders, real revenue, aur real inventory nazar aayegi.

---

### 7. Social Inbox (`/dashboard/inbox`) ← NEW
**Kya karta hai:** Facebook, Instagram, WhatsApp ke saare messages ek jagah.

**Kese use karein:**
1. Left side pe conversations list hai
2. Platform filter lagao (Facebook / Instagram / WhatsApp)
3. Koi bhi conversation click karo
4. Right side pe reply likhein ya quick replies use karein
5. Enter press karo — message send hoga directly us platform pe

**Quick Replies:** Common jawab (like "COD available hai") save hain — ek click mein bhej sako.

---

### 8. Analytics (`/dashboard/analytics`)
Revenue, orders, aur margin breakdowns — platform ke hisaab se.

### 9. Order Management (`/dashboard/order-management`)
Saare orders ek jagah — Amazon + Shopify. Status update, tracking add.

### 10. Profit Calculator (`/dashboard/profit-calculator`)
Product ki exact landed cost calculate karo — freight, duties, FBA fees sab include.

### 11. Supplier Finder (`/dashboard/supplier-finder`)
Alibaba se verified suppliers — MOQ, pricing, aur negotiation template.

### 12. Settings (`/dashboard/settings`) ← NEW
Profile, notifications, preferences, plan & billing, security — sab ek jagah.

### 13. Help & Guide (`/dashboard/help`) ← NEW
FAQs, quick start guide, aur sab features ki directory — searchable.

### 14. Login / Signup (`/login`) ← NEW
Clean auth UI — email/password + Google login. Backend Phase 2 mein connect hoga.

---

## Abhi Demo Hai — Production Mein Kya Different Hoga?

| Feature | Demo (Abhi) | Production |
|---------|-------------|------------|
| Data | Fake/mock data | Real Amazon/Shopify API data |
| Orders | Hardcoded sample orders | Live orders, real-time |
| Revenue | Static numbers | Actual revenue from connected stores |
| Social Inbox | Mock messages | Real Facebook/WhatsApp messages |
| Keyword data | Sample data | Live Google Trends + Amazon data |
| Ad Intelligence | Sample ads | Live running ads via Meta API |

---

## Next Phase — Kya Banana Hai?

### Phase 2: Backend + Real APIs (4-8 weeks)
- [ ] Node.js/Express backend setup
- [ ] Amazon SP-API integration (orders, inventory, revenue)
- [ ] Shopify REST Admin API integration
- [ ] Database: PostgreSQL for storing seller data
- [ ] User authentication (NextAuth.js)
- [ ] Data sync cron jobs (every 15 min)

### Phase 3: Social & Ads (3-5 weeks)
- [ ] Meta Marketing API (ad performance)
- [ ] Facebook/Instagram Graph API (comments, DMs)
- [ ] WhatsApp Business Cloud API (messages + webhooks)
- [ ] Real-time inbox (WebSockets)
- [ ] Auto-reply rules engine

### Phase 4: Intelligence Layer (4-6 weeks)
- [ ] Real keyword data (via DataForSEO or Keepa API)
- [ ] BSR tracking (background jobs)
- [ ] Competitor price alerts
- [ ] Email/SMS notifications for order updates

### Phase 5: Monetization (2-3 weeks)
- [ ] Stripe subscription billing
- [ ] Plan limits enforcement
- [ ] Onboarding flow for new sellers
- [ ] Team/multi-user support

---

## Tech Stack (Current + Planned)

### Current (Demo)
- **Frontend:** Next.js 16 (App Router) + TypeScript
- **Styling:** Tailwind CSS v4
- **Charts:** Recharts
- **Icons:** Lucide React

### Planned (Production)
- **Backend:** Node.js + Express (or Next.js API routes)
- **Database:** PostgreSQL + Prisma ORM
- **Auth:** NextAuth.js (Google + email login)
- **Queue:** BullMQ + Redis (for sync jobs)
- **Hosting:** Vercel (frontend) + Railway/Render (backend)
- **APIs:** Amazon SP-API, Shopify Admin API, Meta Graph API, WhatsApp Cloud API

---

## Auth Setup (Current Working)

Abhi auth flow **NextAuth.js + Prisma + PostgreSQL** par chal raha hai.

### Required `.env.local`

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/sellora?schema=public"
AUTH_SECRET="change-this-to-a-long-random-secret"

# Optional — Google OAuth (login button hides if not set)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Optional — Gemini AI (Listing Generator, Review Reply, Trend Insights)
GEMINI_API_KEY="your-gemini-api-key"
```

> Agar `GOOGLE_CLIENT_ID` set nahi to Google button hide hoga.  
> Agar `GEMINI_API_KEY` set nahi to AI features sample data dikhayenge (503 error nahi aayega).

### Quick setup steps

1. `npm run prisma:generate`
2. `cmd /c npx prisma migrate dev --name init`  ← DB tables banata hai
3. `npm run dev`

### Get free Gemini API key

1. https://aistudio.google.com/app/apikey par jao
2. **"Get API Key"** click karo — bilkul free hai, credit card nahi chahiye
3. Key ko `.env.local` mein `GEMINI_API_KEY=` ke sath paste karo
4. Server restart karo (`npm run dev`)

**AI features enabled ho jaate hain:**
- Listing Generator → real Amazon listings generate karta hai
- Review Intelligence → har review par "Generate AI Reply" button
- Trend Predictor → har trend card par "Get AI Insight" button

### Google OAuth callback URLs

- Local: `http://localhost:3000/api/auth/callback/google`
- Production: `https://your-domain.com/api/auth/callback/google`

### Demo credentials (email login)

- Email: `demo@sellora.io`
- Password: `demo12345`

---

## Cost Estimates (Monthly — Production)

| Service | Cost |
|---------|------|
| Vercel Pro | $20/mo |
| Railway (backend) | $5-20/mo |
| PostgreSQL (Railway) | $5/mo |
| Redis (Upstash) | Free-$10/mo |
| Amazon SP-API | Free |
| Meta API | Free (rate limits apply) |
| WhatsApp Cloud API | Free up to 1000 conv/mo |
| **Total** | **~$30-55/mo** |

---

## Questions? Issues?

Agar koi feature kaam nahi kar raha ya kuch aur chahiye, batao.
Demo data ko real data se replace karne ke liye backend integration shuru karni hogi.

---

*Last updated: March 2025 | Version: 0.1.0-demo*
