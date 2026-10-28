# Event-driven map (Event -> Handler -> Action -> Result)

| # | Event | Handler (file) | Action | Result |
|---|---|---|---|---|
| 1 | User presses **Sign in** | `handleLogin` (`app/login.tsx`) | Validate fields, `supabase.auth.signInWithPassword` | Session stored securely; route guard (`app/_layout.tsx`) moves user into the app. Bad login shows an error banner |
| 2 | **QR scanner detects a code** | `handleScanned` (`app/(tabs)/scan.tsx`) | Lock scanner, `recordAttendance()` -> RPC `record_attendance` | Result sheet: confirmed / duplicate / closed / invalid |
| 3 | **Invalid QR detected** | `parseQRPayload` (`lib/qr.ts`) and RPC `invalid_qr` branch | Reject before/at the server | Red "Invalid QR code" sheet, nothing recorded |
| 4 | **Duplicate attendance detected** | `on conflict (student_id, event_id) do nothing` in `record_attendance` | Return `duplicate` with original time | Amber "Already checked in" sheet |
| 5 | **Event is created** (Save pressed) | `handleSave` (`app/event/form.tsx`) | Validate, `createEvent` insert; DB trigger creates the secret QR token | Navigates to event detail showing the QR |
| 6 | **Event status changes** (Close / Reopen) | `toggleStatus` (`app/event/[id].tsx`) | `setEventStatus` update | Badge changes; scans now return "Event closed" |
| 7 | **Database record inserted** (attendance) | Supabase Realtime `subscribeToEventAttendance` (`lib/attendance.ts`) | Callback reloads the list | Teacher screen updates instantly (Live dot) |
| 8 | **User logs out** | `handleSignOut` (`app/(tabs)/profile.tsx`) -> `signOut` (`lib/auth.tsx`) | Clear state, revoke session | Guard redirects to login; protected screens unreachable |
| 9 | **App starts / auth state changes** | `getSession` + `onAuthStateChange` (`lib/auth.tsx`) | Restore or clear session, load profile, reject deactivated users | Correct role-based tabs; deactivated users are signed out with a notice |
| 10 | **Data refreshed** (pull to refresh / screen focus) | `useQuery` (`lib/useQuery.ts`) | Re-run the screen's fetcher | Lists and counts update |
| 11 | **Admin changes a role / status** | `changeRole`, `toggleActive` (`app/(tabs)/admin.tsx`) | Update `profiles` (DB trigger allows admins only) | User list refreshes; non-admins are refused by the database |
| 12 | **Admin corrects attendance** | `changeStatus` / `remove` (`components/AttendanceList.tsx`) | Update / delete row (RLS: admin only) | Record changes; confirmation banner |
