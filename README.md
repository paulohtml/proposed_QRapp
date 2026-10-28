# QR Attendance

School event attendance using QR codes. Expo (React Native, runs on Android, iOS and web) + Supabase (Postgres, Auth, Row Level Security, Realtime).

## Roles

| Role | Can do |
|---|---|
| **Student** | Register, sign in, view/edit own profile, see open events, scan an event QR, see confirmation, view own attendance history |
| **Teacher** | Create / edit / close / reopen own events, show or replace the event QR, watch check-ins live, view attendance records and summaries |
| **Administrator** | Everything a teacher can do for **all** events, plus manage users (role, deactivate), correct attendance (change status, remove, add manually), and view system reports |

New sign-ups are always **students**. Teachers and admins are promoted by an administrator (the first admin is created with one SQL line, below).

## Setup

1. **Supabase project** - create one at supabase.com.
2. **Database** - open *SQL Editor*, paste all of `supabase/schema.sql`, run it. Safe to re-run; it also upgrades the earlier version of this project.
3. **Auth settings** - *Authentication > Providers > Email*. For development you can turn *Confirm email* off so sign-up logs in immediately; if it stays on, students confirm via the emailed link first.
4. **Credentials** - copy `.env.example` to `.env` and fill in your project URL and **anon/publishable** key. `.env` is git-ignored. Never use the `service_role` key in the app.
   For EAS builds: `eas env:create` (variables `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`) instead of writing them into `eas.json`.
5. **Install and run**
   ```
   npm install --legacy-peer-deps
   npx expo start -c
   ```
   Press `w` for web, or scan the QR with Expo Go.
6. **First admin** - register an account in the app, then run in the SQL Editor:
   ```sql
   update public.profiles set role = 'admin' where email = 'your.admin@school.edu';
   ```
   Sign out and in again. Promote teachers from the **Admin > Users** tab.

> If an earlier `.env` or `eas.json` containing real keys was ever pushed to a public repo, rotate the key in Supabase (*Project Settings > API*).

## How attendance stays trustworthy

- The QR contains only a secret random token (`QRATT:<uuid>`), never event details, so it cannot be forged on a phone.
- Tokens live in a separate table that students cannot read.
- Students have **no** insert permission on `attendance`. They call the database function `record_attendance()`, which checks: signed in, active **student**, token valid, event **open**, inside the time window, and not a **duplicate** (also enforced by a unique constraint). Late arrivals are labelled `late` automatically.
- A teacher can **Replace QR** to invalidate any shared or printed copy.
- Role changes are blocked at the database level for non-admins (a student cannot promote themselves).

## Project map

```
app/                 screens (Expo Router)   login, register, (tabs)/*, event/[id], event/form
components/          Screen, AppButton, Field, ui (cards, badges, states, sheets), EventCard, AttendanceList, DateTimeField
lib/                 auth (provider), supabase client, secureStorage, events, attendance, admin, validation, format, qr
supabase/schema.sql  tables, RLS policies, triggers, RPC functions, realtime
docs/EVENTS.md       Event -> Handler -> Action -> Result table for the oral exam
```

## Manual test checklist

1. Register a student; confirm role is Student and no teacher option exists.
2. As admin, make a second account a Teacher.
3. Teacher: create an event, open it, see the QR; tap *Full screen*.
4. Student (second device or browser): Scan tab -> scan the QR -> green confirmation; teacher list updates by itself (Live dot).
5. Scan again -> amber "Already checked in".
6. Teacher: *Close event*; student scans -> "Event closed".
7. Scan any non-attendance QR -> red "Invalid QR code".
8. *Replace QR*; scan the old image -> invalid.
9. Student opens the Records/Admin route -> "Access restricted".
10. Admin: change a record to Late / remove it / add a student manually; view Reports.
11. Sign out -> back to login; reopening the app while signed in restores the session.
