# Deb8er

A free global MUN and debate platform for students ages 10–18. Learn debate skills, join live conferences, earn certificates, and compete on a worldwide leaderboard.

**Live site:** [deb8erglobal.com](https://deb8erglobal.com)

## Tech Stack

| Layer | Technology |
|---|---|
| Hosting | Netlify (static HTML) |
| Auth | Firebase Authentication (email OTP) |
| Database | Cloudflare Workers (chat) + Firestore (profiles, leaderboard) |
| Backend | Google Apps Script (form submissions, sheet sync, certificate generation) |
| Chatbot | Groq LLM via Cloudflare Worker (SSE streaming) |

## Project Structure

```
/
├── index.html              # Homepage
├── auth.html               # Sign up / login (email OTP)
├── dashboard.html          # User dashboard
├── learn.html              # Gamified debate lessons
├── conferences.html        # Conference listings
├── join-conference.html    # Conference registration
├── leaderboard.html        # Global leaderboard
├── admin.html              # Admin panel
├── verification.html       # Certificate verification
├── about.html              # About page
├── team.html               # Team page
├── privacy.html            # Privacy policy
├── terms.html              # Terms of service
├── 404.html / 500.html     # Error pages
├── assets/
│   ├── *.css               # Stylesheets
│   ├── *.js                # Client-side modules
│   └── images/             # Static images
├── worker/
│   └── src/index.js        # Cloudflare Worker (chat proxy)
├── Code.gs                 # Google Apps Script (deployed separately)
├── firestore.rules         # Firestore security rules
└── guides/                 # SEO guide pages
```

## Local Development

This is a static HTML site. No build step required.

1. Clone the repo:
   ```bash
   git clone https://github.com/Joe122234/Deb8er.git
   cd Deb8er
   ```

2. Start a local server:
   ```bash
   # Using Python
   python3 -m http.server 8000

   # Or using VS Code Live Server extension
   ```

3. Open `http://localhost:8000` in your browser.

## Cloudflare Worker (Chat)

The chatbot runs on Cloudflare Workers. To develop/deploy:

```bash
cd worker
npm install
npx wrangler dev      # Local development
npx wrangler deploy   # Deploy to Cloudflare
```

### Required Secrets

Set via Wrangler (not in source code):

```bash
npx wrangler secret put GROQ_API_KEY
```

## Firebase Setup

- Project: `deb8ersignup-4b9e1`
- Firestore rules: `firestore.rules`
- Deploy rules via Firebase Console > Firestore > Rules

## Deployment

- **Netlify:** Push to `main` branch → auto-deploys
- **Cloudflare Worker:** `cd worker && npx wrangler deploy`
- **Firestore rules:** Manual deploy via Firebase Console
- **Apps Script:** Deploy via Google Apps Script Editor (separate project)

## Environment Variables

| Variable | Location | Purpose |
|---|---|---|
| `GROQ_API_KEY` | Cloudflare Worker secret | LLM API key for chatbot |
| `ADMIN_TOKEN` | `Code.gs` (Apps Script) | Admin API authentication |

## License

All rights reserved. © 2026 Deb8er
