# Deb8er — Agent Guide

## Architecture

Static HTML site (Netlify-hosted) + Firebase (Auth + Firestore) + Google Sheets (AutoCrat certificate pipeline) + Apps Script bridge.

**Entrypoints by function:**

| Purpose | File | Key detail |
|---|---|---|
| User signup/auth | `auth.html` | Deferred: anonymous auth → OTP → `linkWithCredential` creates real account. Pending data stored with `_pending: true` in `users/{uid}`, overwritten after verification |
| Conference signup | `join-conference.html` | POSTs to Apps Script + logs to Firestore via `arrayUnion` |
| Dashboard | `dashboard.html` | Reads Firestore first; sheet merge for awards (always fetches) |
| Leaderboard | `leaderboard.html` | Reads public `leaderboard/{uid}` collection (no auth needed) |
| Admin panel | `admin.html` | Firestore CRUD + sheet sync (awards & conferences) |
| Certificate verify | `verification.html` + `verification.js` | GETs Apps Script `?certificateId=` (separate script project) |
| Navbar | `navbar-auth.js` | Module — included on every page, drives #nav-auth-item |

**Two separate Apps Script projects:**
1. **Main** (`Code.gs`) — form submission, admin sync, email check, cert ID lookup, profile fetch, header diagnostics, certificate download redirect. URL deployed as `SHEET_API` / `GOOGLE_SHEET_URL` in HTML files. Protected endpoints (`addAward`, `updateConference`, `deleteSheetRow`, `deleteUserRows`, `getCertIds`) require `adminToken` param matching `ADMIN_TOKEN` in Code.gs — value is `ADMIN_API_TOKEN` in admin.html.
2. **Verification** (`verification.js`) — read-only cert lookup. URL is `API_URL` in `verification.js` only.

## When deploying Apps Script

Every `Code.gs` change requires: Editor → Deploy → New deployment → Web app → Deploy. The resulting URL **must** be updated in **all 4 files** via `replaceAll`:
- `dashboard.html` (`SHEET_API`)
- `admin.html` (`SHEET_API`)
- `join-conference.html` (`GOOGLE_SHEET_URL`)
- `form.html` (`GOOGLE_SHEET_URL`)

`verification.js` (`API_URL`) is a separate script — only update if that script was redeployed.

**Current URL:** `AKfycbx_YlVpMbjm4qCWlrs6gphHRyRmQWrOpYwD8M35vKF7b2R7_nGdbeDOQJtHaVl0dTwZ`

## Data model

**Firestore `users/{uid}`:** (temporary pending data stored with `_pending: true` flag, created before OTP, overwritten after verification)

```
{
  _pending?: true,         // only while OTP is not yet verified
  fullName, nickName, email, phone, age, country,
  otpHash, otpExpiresAt, createdAt
}
```

**Firestore `users/{uid}`:** (final profile after OTP verified)

```
{
  fullName, nickName, email, phone, age, country,
  role?: "admin",
  points?: number,       // stored but admin panel computes dynamically
  conferences: [{ type, name, portfolio, committee, region, date, certificateId? }],
  awards: [{ title, conference, certificateId, eventDate }]
}
```

**Firestore `leaderboard/{uid}`:** (public readable, auto-synced via Cloud Function)

```
{
  fullName, nickName, country,
  conferenceCount, awardCount,
  points, updatedAt (server timestamp)
}
```

**Points are computed dynamically** (not read from Firestore): `confs.length * 15 + awardPoints(title)`. Same formula in `dashboard.html` and `admin.html`. The `AWARD_POINTS` map is the source of truth.

**Sheet columns (Sheet1):** Timestamp, Full Name, Nick Name, Email, Phone Number, Age, Country, portfolio, Committee, Region, Certificate ID, award, Event Date, Mode, Merged Doc columns…

## Leaderboard sync

Client-side sync via `assets/leaderboard-sync.js`:

- `dashboard.html` syncs after computing points on profile load
- `join-conference.html` syncs after logging a conference to Firestore
- `leaderboard.html` syncs the viewing user if they're logged in
- `admin.html` syncs on saveDetail and has a **Sync All** button for backfill
- No Cloud Function (project is on Spark plan)

## Admin panel quirks

- **Conference editing:** Stores `_origCommittee` before edit, strips before Firestore save. Sheet match falls back to email + original committee when no `certificateId` exists.
- **Award editing:** Clears `_synced` flag so `saveDetail` re-syncs to sheet.
- **Delete conference:** Calls `deleteSheetRow` immediately (matches all 10 fields exactly), before "Save Changes".
- **Delete account:** Calls `deleteUserRows` (by email) + `deleteDoc` + deletes `leaderboard/{uid}`. Cannot delete Firebase Auth user from client.
- **Cert ID dropdown:** Fetches user's existing cert IDs via `?action=getCertIds&email=…` when detail panel opens.
- **Award types dropdown:** Defined in `AWARD_TYPES` array in admin.html.

## Conferences

- `join-conference.html` generates a `certificateId` client-side, sends it with the form submission, and saves it to Firestore.
- `form.html` (standalone form) POSTs to Apps Script but does NOT save to Firestore — only sheet.
- Both forms use `mode: "no-cors"` for the sheet POST (fire-and-forget).

## Dashboard awards

Dashboard merges awards from Firestore + sheet on every load:
1. Reads `d.awards` from Firestore
2. Always fetches sheet via `?action=getProfile&email=…` (GET, `mode: "cors"`)
3. Merges: keeps existing Firestore awards, appends sheet awards with new `certificateId`s
4. Persists merged result back to Firestore

This ensures admin-added awards (synced to sheet) appear even for existing users.

## Certificate download

Dashboard cert button (`dashboard.html`) uses POST to Apps Script (`action=lookupCertificate`) with `mode: "cors"` to avoid the Apps Script GET redirect + CORS issue. The `doPost` handler in `Code.gs` routes to `handleVerification`. On success, the download URL is cached to Firestore (`certificateUrl`) and the button is replaced with a direct `<a>` link.

## Auth persistence

- `navbar-auth.js` calls `setPersistence(auth, browserLocalPersistence)` after initialization
- Firestore profile read in navbar has 3-attempt retry with 1s delay to handle race condition between auth restore and Firestore connection
- Errors are logged to console (not silently swallowed)

## Firebase

- Project: `deb8ersignup-4b9e1`
- Firestore rules in `firestore.rules` — admin role check via `get()`. Must be manually deployed via Firebase Console.
- No Cloud Functions (project is on Spark plan).
- All Firebase SDK imports use CDN (`https://www.gstatic.com/firebasejs/12.15.0/`). All files now use 12.15.0.

## Netlify

- `_redirects` file handles domain redirects (deb8er.netlify.app → deb8erglobal.com).
- No build step — static HTML.
