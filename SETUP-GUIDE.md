# Trolley — Setup & Deployment Guide

## Quick Overview

Trolley is a PWA shopping list app for your household. Here's the full setup process, which should take about 15 minutes.

## Step 1: Supabase Setup

### 1a. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up / log in
2. Click **New Project**
3. Choose your organisation (or create one)
4. Set the project name to `trolley`
5. Generate a strong database password (save it somewhere safe)
6. Choose a region close to Australia: **Southeast Asia (Singapore)** is the nearest option
7. Click **Create new project** and wait for it to provision (~2 minutes)

### 1b. Run the Database Schema

1. In your Supabase dashboard, go to **SQL Editor** (left sidebar)
2. Click **New query**
3. Open the file `supabase-schema.sql` from this project
4. Copy the ENTIRE contents and paste into the SQL editor
5. Click **Run** (or Cmd+Enter)
6. You should see "Success. No rows returned" — this is correct

### 1c. Enable Realtime

The SQL schema already includes the realtime publication commands, but verify:

1. Go to **Database** > **Replication** in the Supabase dashboard
2. Under the `supabase_realtime` publication, confirm these tables are listed:
   - `items`
   - `notifications`
   - `weeks`
3. If they're not there, toggle them on

### 1d. Get Your API Keys

1. Go to **Project Settings** > **API** (left sidebar, bottom)
2. Copy these two values — you'll need them soon:
   - **Project URL** (looks like `https://abcdef12345.supabase.co`)
   - **anon public** key (the long JWT string under "Project API keys")

## Step 2: Local Development Setup

### 2a. Clone / Copy the Project

If you haven't already, copy the `trolley` folder to your computer.

### 2b. Create Environment File

In the `trolley` folder root, create a file called `.env`:

```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

Replace with the real values from Step 1d.

### 2c. Install Dependencies

```bash
cd trolley
npm install
```

### 2d. Run Locally

```bash
npm run dev
```

Open `http://localhost:3000` in your browser. You should see the Trolley splash screen.

### 2e. Test the App

1. Enter any 4-digit PIN (e.g., `1234`) — this creates a new household
2. Select your name (Toby or Orla)
3. Try adding an item — type "milk" and watch autocomplete suggestions
4. Open a second browser tab and log in with the same PIN as the other user
5. Add items in one tab and watch them appear in real time in the other

## Step 3: Deploy to Vercel

### 3a. Push to GitHub

```bash
cd trolley
git init
git add -A
git commit -m "Initial Trolley app"
```

Create a new repo on GitHub called `trolley`, then:

```bash
git remote add origin https://github.com/YOUR_USERNAME/trolley.git
git branch -M main
git push -u origin main
```

### 3b. Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) and log in
2. Click **Add New** > **Project**
3. Import your `trolley` repository from GitHub
4. Vercel should auto-detect it as a Vite project
5. Before clicking Deploy, add **Environment Variables**:
   - `VITE_SUPABASE_URL` = your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` = your Supabase anon key
6. Click **Deploy**

Your app will be live at `https://trolley-xxxxx.vercel.app` (or whatever name Vercel assigns).

### 3c. Custom Domain (Optional)

In Vercel project settings, go to **Domains** to add a custom domain if you have one.

## Step 4: Install on Phones

### Android (Chrome)

1. Open the Vercel URL in Chrome
2. Chrome should show an "Add to Home Screen" banner
3. If not, tap the three-dot menu > "Add to home screen"
4. The Trolley icon will appear on your home screen

### iPhone (Safari)

1. Open the Vercel URL in Safari
2. Tap the Share button (square with arrow)
3. Scroll down and tap "Add to Home Screen"
4. Tap "Add"
5. The Trolley icon will appear on your home screen

## How to Use

### Your Household PIN

Pick any 4-digit number (like your house number, anniversary, etc). Both you and Orla use the **same PIN** to access the shared list. The first time you enter a PIN, it creates a new household.

### Adding Items

Three ways to add items:

1. **Type it** — Start typing and pick from suggestions. History items (things you've bought before) appear first.
2. **Scan barcode** — Uses your phone camera to scan a barcode and look it up on Open Food Facts.
3. **Photo** — Take a photo of a product label and OCR reads the text.

After identifying a product, the app suggests Aldi or Woolworths based on category and your purchase history.

### Shopping Flow

1. Build your list during the week
2. At the shops, tap items to tick them off (satisfying strikethrough animation)
3. When done at Aldi, tap "Finish Aldi Shop" — any unticked Aldi items automatically move to Woolworths
4. After shopping, scan your receipt for price tracking
5. "Finish Woolworths Shop" completes the week

### Budget

Toby can set the weekly budget from the Dashboard. The budget bar shows green/amber/red as you approach the limit.

### Smart Staples

After 3-4 weeks, the app learns your regular items and offers to add them at the start of each new week. One tap adds them all.

## Architecture Notes

- **Frontend**: React SPA with Vite build tool
- **Database**: Supabase (PostgreSQL + Realtime)
- **OCR**: Tesseract.js (runs in-browser, no API key needed)
- **Barcode**: html5-qrcode + Open Food Facts API (free, no key)
- **Product Search**: Open Food Facts API (free, no key)
- **Hosting**: Vercel (free tier)
- **PWA**: vite-plugin-pwa with Workbox service worker

Everything runs on free tiers. No paid services.

## Troubleshooting

### "Could not connect. Check your PIN."
- Make sure your `.env` / Vercel env vars are set correctly
- Check the Supabase project is running (not paused)

### Real-time not working
- Verify the tables are added to the `supabase_realtime` publication
- Check browser console for WebSocket errors

### Camera not working
- Make sure you're on HTTPS (localhost or Vercel URL)
- Grant camera permissions when prompted
- Some older browsers don't support the Camera API

### Supabase project paused
- Free tier Supabase projects pause after 1 week of inactivity
- Just go to your Supabase dashboard and click "Restore"
