# Concert Setlist Dashboard

A web dashboard for visualizing and exploring live concert setlists for any artist — built with Next.js 15, Supabase, and Tailwind CSS.

Originally created for ONE OK ROCK (2010–2025, 15 tours, 113 songs), but designed to be forked and adapted for any artist.

---

## Features

- **Statistics view** — song frequency matrix across all tours, sortable by play count, with resizable columns
- **Setlist view** — card-based layout per tour with copy-to-text and save-as-JPG export
- **YouTube playback** — click any song to search and play a live version inline, with mini-player support (audio keeps playing while you browse)
- **Favorites** — heart any song; favorites are deduplicated by song title and persisted locally
- **Tour filter** — select any combination of tours for cross-tour comparison
- **Mobile responsive** — optimized layout for small screens

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS + custom CSS |
| Database | Supabase (PostgreSQL) |
| Deployment | Vercel |
| Video | YouTube Data API v3 |

---

## Fork & Adapt for Any Artist

This project is designed to be reused. To adapt it for a different artist:

### 1. Clone the repo

```bash
git clone https://github.com/tomato018/jp-tour-setlist-dashboard.git
cd jp-tour-setlist-dashboard
npm install
```

### 2. Set up Supabase

1. Create a free project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run `supabase/schema.sql` to create the tables
3. Edit `supabase/seed.sql` with your artist's tour and setlist data, then run it

### 3. Configure environment variables

Create a `.env.local` file in the project root:

```env
# Artist name — the only value you need to change for a different artist
NEXT_PUBLIC_ARTIST_NAME=Your Artist Name

# Supabase (from your project's API settings)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# YouTube Data API v3 (get a key from Google Cloud Console)
YOUTUBE_API_KEY=your-youtube-api-key
```

> `NEXT_PUBLIC_ARTIST_NAME` controls the page title, YouTube search queries, JPG exports, and database lookup — it's the only value you need to change for a new artist.

### 4. Update tour order

Edit `src/app/page.tsx` to define the canonical display order of your tours:

```ts
const TOUR_ORDER = [
  '2019 Tour Name',
  '2021 Arena Tour',
  // ...
]
```

### 5. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Authentication System

The app includes an optional login system backed by **Supabase Auth**. It is intentionally lightweight — users can browse all setlists and play YouTube videos without logging in. Auth is only required to persist favorites across devices.

### How it works

| Step | What happens |
|------|-------------|
| User clicks **登录 / 注册** in the navbar | `AuthModal` opens |
| User chooses **Google OAuth** | Redirected to Google, then back to the app via Supabase OAuth callback |
| User chooses **email magic link** | Supabase sends a one-click login link; no password needed |
| On return / page load | `supabase.auth.onAuthStateChange` keeps session state in sync |
| Sign out | `supabase.auth.signOut()` clears the session |

### What's gated

- **Favorites tab** — unauthenticated users see a locked state with a login prompt instead of their saved songs
- Everything else (setlist browsing, stats, YouTube playback) is fully public

### What's NOT included (potential areas for extension)

- **Row-level security on favorites** — the `favorites` table has RLS defined in the schema, but syncing favorites to the database is not yet implemented; favorites are currently stored in `localStorage` only
- **Admin / editor role** — there is no role-based access control; all authenticated users have the same permissions
- **Email/password auth** — only Google OAuth and magic link are supported; adding password auth would require changes to `AuthModal.tsx`

### Setup required for Google OAuth

By default, only email magic link works out of the box. To enable Google login:

1. Go to your Supabase project → **Authentication → Providers → Google**
2. Enable Google and enter your **Client ID** and **Client Secret** from [Google Cloud Console](https://console.cloud.google.com/) (OAuth 2.0 credentials)
3. Add your site URL to the allowed redirect URIs in both Google Cloud Console and Supabase

---

## Database Schema

```
artists       — artist name and metadata
tours         — tour name, year, location
songs         — song titles (unique per artist)
tour_songs    — many-to-many: which songs appear in which tours, in order
favorites     — per-user saved songs (RLS enabled, requires Supabase Auth)
```

Full schema: [`supabase/schema.sql`](supabase/schema.sql)
Example data: [`supabase/seed.sql`](supabase/seed.sql)

---

## About Setlist Data

This project does not include a data scraper. Data quality directly determines the value of your dashboard — we recommend using sources you can personally verify:

- **Hand-curated (recommended)** — cross-referenced from tour pamphlets, concert photos, or video timestamps. This is how the OOR data in this repo was built, and it's the most accurate approach.
- **[setlist.fm](https://www.setlist.fm)** — a UGC community platform with broad coverage for popular artists. Useful as a starting point, but accuracy varies by artist and tour. Always verify before importing.
- **Fan communities** — some artists have dedicated setlist-tracking communities (e.g. live-log threads on Twitter/X or fan wikis) that can serve as a cross-reference.

If you've carefully curated data for an artist and want to share it, feel free to open an issue — community contributions are welcome.

---

## Getting a YouTube API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project → Enable **YouTube Data API v3**
3. Create an API key under **Credentials**
4. Add it to `.env.local` as `YOUTUBE_API_KEY`

> The API key is server-side only and never exposed to the browser.

---

## Deploy to Vercel

1. Push your fork to GitHub
2. Import the repo at [vercel.com/new](https://vercel.com/new)
3. Add all environment variables from your `.env.local`
4. Deploy

---

## YouTube Playback Notice

The play button searches YouTube for a live version of each song. Because concert recordings vary in upload availability, the result may come from a different tour or version — it's intended for listening reference only.

---

## Contributing

Pull requests are welcome. If you've adapted this for another artist, feel free to open an issue with a link to your fork.

---

## License

MIT
