# Smart Cleaner Pro — System Documentation

> **Stack:** React Native · Expo 55 · Supabase · Deno Edge Functions · Resend  
> **Platform:** iOS & Android  
> **Author:** Bless Ngesera  
> **Contact:** hello@smartcleanerpro.online

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Architecture](#2-architecture)
3. [Project Structure](#3-project-structure)
4. [Authentication System](#4-authentication-system)
5. [Email System](#5-email-system)
6. [Edge Functions](#6-edge-functions)
7. [Robot Communication](#7-robot-communication)
8. [Database Schema](#8-database-schema)
9. [Frontend Screens](#9-frontend-screens)
10. [State Management](#10-state-management)
11. [Design System](#11-design-system)
12. [Environment Configuration](#12-environment-configuration)
13. [Deep Link Handling](#13-deep-link-handling)
14. [Build & Deployment](#14-build--deployment)

---

## 1. System Overview

Smart Cleaner Pro is a mobile application that allows users to control, monitor, and schedule a smart cleaning robot. Users connect to their robot over Bluetooth or Wi-Fi and manage it through a real-time dashboard.

### Core capabilities

| Feature | Description |
|---|---|
| Robot control | Start, stop, pause, select cleaning mode and fan speed |
| Live map | Real-time sensor data and obstacle detection visualization |
| Scheduling | Calendar-based cleaning schedules synced to the cloud |
| History | Per-session logs with duration, area cleaned, and timestamps |
| Notifications | Configurable alerts for cleaning events and weekly reports |
| Multi-device | Multiple robots per account |

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  React Native App (Expo)                  │
│                                                           │
│  ┌───────────┐  ┌───────────┐  ┌───────────────────────┐ │
│  │  Screens  │  │ Contexts  │  │       Services        │ │
│  │ (Expo     │  │ Auth      │  │ auth.ts               │ │
│  │  Router)  │  │ Theme     │  │ supabase.ts           │ │
│  │           │  │ Toast     │  │ ProductionRobotService │ │
│  └───────────┘  └───────────┘  │ EmailService          │ │
│                                └───────────────────────┘ │
└──────────────────────────┬──────────────────────────────┘
                           │ HTTPS
         ┌─────────────────┼───────────────────┐
         │                 │                   │
         ▼                 ▼                   ▼
  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐
  │  Supabase   │  │   Supabase   │  │  Resend API      │
  │  Auth       │  │  Edge Fns    │  │  (email delivery) │
  │  Database   │  │  (Deno)      │  │  hello@           │
  │  Realtime   │  │              │  │  smartcleanerpro  │
  └─────────────┘  └──────────────┘  │  .online            │
                                     └──────────────────┘
         │
         ▼ BLE / Wi-Fi (direct)
  ┌─────────────┐
  │  Cleaning   │
  │  Robot      │
  └─────────────┘
```

### Key architectural decisions

- **Email via Edge Functions only** — Supabase's built-in free-tier mailer is rate-limited. All transactional emails (signup, reset, resend) bypass it entirely and go through Resend, called from Deno Edge Functions using the service role key server-side.
- **PKCE auth flow** — Supabase client is configured with `flowType: 'pkce'` and `detectSessionInUrl: false`. Deep link URL parsing is handled manually in `_layout.tsx` to support both PKCE (`?code=`) and implicit grant (`#access_token=`) flows produced by admin `generateLink`.
- **File-based routing** — Expo Router provides typed, file-based navigation with stack + tab navigators.
- **SF Pro Display** — All three font weights (Regular, Semibold, Bold) are bundled as `.otf` assets. The `AppText` component maps `fontWeight` to the correct file, ensuring consistent rendering on Android (which doesn't resolve weight variants from a single font family name).

---

## 3. Project Structure

```
smart-cleaning-robot/
├── app/                            # Expo Router screens
│   ├── _layout.tsx                 # Root layout: providers, deep links, splash
│   ├── index.tsx                   # Entry point: routes to login or dashboard
│   ├── LoginScreen.tsx
│   ├── SignupScreen.tsx
│   ├── ForgotPasswordScreen.tsx
│   ├── reset-password.tsx
│   ├── verified-account.tsx
│   ├── (tabs)/                     # Tab navigator
│   │   ├── _layout.tsx
│   │   ├── 01_DashboardScreen.tsx
│   │   ├── 02_ControlScreen.tsx
│   │   ├── 03_MapScreen.tsx
│   │   ├── 04_ScheduleScreen.tsx
│   │   └── 05_ProfileScreen.tsx
│   ├── settings/
│   │   ├── account.tsx
│   │   ├── robot.tsx
│   │   ├── connection.tsx
│   │   ├── history.tsx
│   │   ├── notifications.tsx
│   │   └── support.tsx
│   └── api/
│       └── send-email+api.ts       # Expo API route (server-side)
│
├── src/
│   ├── context/
│   │   ├── AuthContext.tsx          # Session state, routing, welcome email
│   │   ├── ThemeContext.tsx         # Light/dark theme + color palette
│   │   └── ToastContext.tsx         # Toast notification system
│   ├── services/
│   │   ├── supabase.ts             # Supabase client singleton
│   │   ├── auth.ts                 # Auth flows via Supabase + Edge Functions
│   │   ├── ProductionRobotService.ts
│   │   └── EmailService.ts         # Client-side Resend wrapper
│   ├── components/
│   │   ├── AppText.tsx             # Font-aware Text component
│   │   ├── Button.tsx
│   │   ├── Header.tsx
│   │   ├── Loader.tsx
│   │   ├── StatTile.tsx
│   │   └── ToastNotification.tsx
│   └── utils/
│       ├── responsive.ts           # Design tokens + responsive helpers
│       ├── disableFontScaling.ts   # Patches Text/TextInput at module load
│       └── emailScheduler.ts       # Weekly report scheduler
│
├── supabase/
│   └── functions/
│       ├── handle-signup/          # Creates user + sends confirmation email
│       ├── send-confirmation-email/ # Resends confirmation link
│       └── send-reset-email/       # Sends password reset link
│
├── assets/
│   └── fonts/
│       ├── SF-Pro-Display-Regular.otf
│       ├── SF-Pro-Display-Semibold.otf
│       └── SF-Pro-Display-Bold.otf
│
├── .env                            # Environment variables
├── app.json                        # Expo config (scheme, bundle ID, permissions)
├── package.json
└── tsconfig.json
```

---

## 4. Authentication System

### Flow overview

```
Signup
  Client → handle-signup Edge Fn → admin.createUser() → admin.generateLink() → Resend
  (Supabase's built-in mailer is never triggered)

Login
  Client → supabase.auth.signInWithPassword()

Password reset
  Client → send-reset-email Edge Fn → admin.generateLink(type:'recovery') → Resend
  User clicks link → deep link → _layout.tsx parses hash tokens → setSession() → /reset-password

Email confirmation
  User clicks link → deep link → _layout.tsx parses code → exchangeCodeForSession() → /verified-account
```

### AuthContext state

`AuthContext` wraps the entire app and exposes:

| Field | Type | Description |
|---|---|---|
| `user` | `User \| null` | Currently signed-in Supabase user |
| `isLoading` | `boolean` | True while the initial session check is running |
| `initialized` | `boolean` | True once session has been determined |

**Auto-routing logic:**
- On `SIGNED_IN`: navigates to `/(tabs)` unless `suppressNextSignedIn` is set (password recovery path)
- On `SIGNED_OUT`: navigates to `/LoginScreen`
- On `PASSWORD_RECOVERY`: navigates to `/reset-password` unless suppressed

**Welcome email:** On the first sign-in (account created within 2 minutes), `AuthContext` triggers a welcome email via `EmailService`.

### auth.ts methods

| Method | Description |
|---|---|
| `signUp(email, password, fullName, phone?)` | Calls `handle-signup` Edge Function. Returns `needsEmailConfirmation: true` on success. |
| `signIn(email, password)` | Direct `supabase.auth.signInWithPassword`. Blocks unconfirmed emails. |
| `forgotPassword(email)` | Calls `send-reset-email` Edge Function. |
| `resetPassword(newPassword)` | Calls `supabase.auth.updateUser`. Requires valid recovery session. |
| `resendConfirmationEmail(email)` | Calls `send-confirmation-email` Edge Function. |
| `signOut()` | Calls `supabase.auth.signOut`. |
| `getSession()` | Returns current session or null. |
| `validatePassword(password)` | Enforces: min 6 chars, uppercase, lowercase, number, special char. |

### Error codes

| Code | Meaning |
|---|---|
| `INVALID_EMAIL` | Malformed email address |
| `INVALID_PASSWORD` | Fails password strength rules |
| `USER_EXISTS` | Email already registered and confirmed |
| `UNVERIFIED_EMAIL` | Account exists but email not confirmed |
| `RATE_LIMIT_EXCEEDED` | Too many requests (429) |
| `EMAIL_FAILED` | Account created but confirmation email could not be sent |
| `SAME_PASSWORD` | New password matches old password (reset flow) |
| `USER_NOT_FOUND` | No account found for this email |

### Session suppression flags

Two module-level flags in `AuthContext` prevent unwanted redirects during auth flows:

- `setSuppressNextSignedIn(true)` — set before `setSession()` during password recovery so the `SIGNED_IN` event doesn't navigate to the dashboard
- `setSuppressNextUserUpdated(true)` — set before `updateUser()` so the `USER_UPDATED` event doesn't navigate away from the reset-password screen

---

## 5. Email System

All production emails come from **hello@smartcleanerpro.online** via **Resend**.

### Email types

| Email | Triggered by | Edge Function | Template |
|---|---|---|---|
| Account confirmation | New signup | `handle-signup` | Checkmark icon, confirm button, 3-step onboarding |
| Confirmation resend | User requests resend | `send-confirmation-email` | Same template |
| Password reset | Forgot password | `send-reset-email` | Lock icon, reset button, 1-hour expiry warning |
| Welcome | First login | `EmailService` (client) | Greeting, feature highlights |
| Weekly report | `emailScheduler` (client) | `EmailService` (client) | Session stats: runtime, area, sessions |

### EmailService (client-side)

Located at `src/services/EmailService.ts`. Uses the public Resend API key (`EXPO_PUBLIC_RESEND_API_KEY`). Implements:
- Retry with exponential backoff (3 attempts)
- In-memory rate limiting (max 5 sends per 60 seconds)
- Shared HTML template renderer

> **Note:** The client-side EmailService is for non-critical emails (welcome, weekly reports). Transactional auth emails (confirmation, reset) always go through Edge Functions using the secret API key server-side.

### Weekly report scheduler

`src/utils/emailScheduler.ts` — called on app foreground:
1. Checks `AsyncStorage` for the last send timestamp (`LAST_WEEKLY_KEY`)
2. If ≥ 7 days have elapsed and the user has notifications enabled, queries Supabase for the week's cleaning sessions
3. Calculates: total sessions, total runtime (hours), estimated area cleaned
4. Sends via `EmailService.sendWeeklyReport()`
5. Updates the last send timestamp

---

## 6. Edge Functions

All three functions run on Deno and are deployed to Supabase (project: `hdiqbfngevcpeylzwndq`). They share the same secrets:

| Secret | Purpose |
|---|---|
| `SUPABASE_URL` | Auto-injected by Supabase runtime |
| `SUPABASE_SERVICE_ROLE_KEY` | Auto-injected. Allows admin auth operations |
| `RESEND_API_KEY` | Manually set. Authenticates Resend API calls |

All functions are deployed with `--no-verify-jwt` (no auth required on the function endpoint — the sensitive operations are gated by the service role key server-side).

---

### handle-signup

**Endpoint:** `POST /functions/v1/handle-signup`

Owns the complete signup flow. Bypasses Supabase's email service entirely.

**Request body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass1!",
  "fullName": "Username",
  "redirectTo": "smartcleaner:///verified-account"
}
```

**Response (success):**
```json
{ "success": true, "userId": "uuid", "resent": false }
```

**Flow:**
1. `supabaseAdmin.auth.admin.createUser({ email, password, email_confirm: false })`
2. If user already exists and is **unconfirmed** → skip creation, generate a fresh confirmation link, resend email (returns `resent: true`)
3. If user already exists and is **confirmed** → return `USER_EXISTS` (400)
4. `supabaseAdmin.auth.admin.generateLink({ type: 'signup', email, options: { redirectTo } })`
5. POST to `https://api.resend.com/emails` with branded HTML
6. On Resend failure → `deleteUser()` to prevent orphaned accounts

**Error codes:**

| Code | HTTP | Meaning |
|---|---|---|
| `USER_EXISTS` | 400 | Email confirmed, already in use |
| `CREATE_FAILED` | 400 | Admin createUser rejected |
| `LINK_FAILED` | 500 | generateLink returned no action_link |
| `EMAIL_FAILED` | 500 | Resend API call failed |

---

### send-confirmation-email

**Endpoint:** `POST /functions/v1/send-confirmation-email`

Resends the confirmation email to an existing unconfirmed user.

**Request body:**
```json
{
  "email": "user@example.com",
  "redirectTo": "smartcleaner:///verified-account",
  "fullName": "Username"
}
```

**Flow:**
1. `admin.generateLink({ type: 'signup', email })`
2. POST to Resend with personalized HTML (greets by first name)

---

### send-reset-email

**Endpoint:** `POST /functions/v1/send-reset-email`

Sends a password reset email.

**Request body:**
```json
{
  "email": "user@example.com",
  "redirectTo": "smartcleaner:///reset-password"
}
```

**Flow:**
1. `admin.generateLink({ type: 'recovery', email })`
2. POST to Resend with password reset HTML template
3. On `USER_NOT_FOUND` from generateLink → returns `{ code: 'USER_NOT_FOUND' }` (400)

---

## 7. Robot Communication

### Connection methods

The app supports two connection paths:

| Method | Library | Use case |
|---|---|---|
| Bluetooth Low Energy | `react-native-ble-plx` | Close-range direct control |
| Wi-Fi (local network) | `axios` + `reconnecting-websocket` | Same-network control |
| Cloud relay | Supabase Realtime | Remote monitoring and commands |

### ProductionRobotService

Located at `src/services/ProductionRobotService.ts`.

**Key methods:**

| Method | Description |
|---|---|
| `getUserRobots()` | Fetches all robots owned by the current user from Supabase |
| `registerRobot(serial, name, ownerId?)` | Registers a new robot in the `robots` table |
| `updateRobotStatus(robotId, status)` | Updates robot status in `robot_status` table |
| `sendCommand(robotId, command)` | Writes a command row (start / stop / pause) to `robot_commands` table |
| `subscribeToStatusUpdates(robotId, cb)` | Opens a Supabase RealtimeChannel for live status updates |
| `getCleaningZones(robotId)` | Fetches defined cleaning zones from `cleaning_zones` table |

### Robot pairing (Connection screen)

The settings/connection screen uses `expo-barcode-scanner` to scan a QR code printed on the robot. The QR code encodes the robot's serial number. After scanning, the app calls `registerRobot()` to link the device to the user's account.

### Android BLE permissions

Required permissions declared in `app.json`:
- `BLUETOOTH`, `BLUETOOTH_ADMIN`, `BLUETOOTH_CONNECT`, `BLUETOOTH_SCAN`
- `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`, `ACCESS_BACKGROUND_LOCATION`

---

## 8. Database Schema

Tables managed in Supabase (PostgreSQL):

### `profiles`
| Column | Type | Description |
|---|---|---|
| `id` | `uuid` (FK auth.users) | Primary key, matches auth user |
| `email` | `text` | User email (indexed) |
| `full_name` | `text` | Display name |
| `avatar_url` | `text` | Profile picture URL |
| `created_at` | `timestamptz` | Account creation time |
| `updated_at` | `timestamptz` | Last profile update |

A database trigger on `auth.users INSERT` automatically creates a corresponding `profiles` row.

### `robots`
| Column | Type | Description |
|---|---|---|
| `id` | `uuid` | Primary key |
| `owner_id` | `uuid` (FK profiles) | Owning user |
| `serial_number` | `text` | Hardware serial |
| `name` | `text` | User-assigned name |
| `created_at` | `timestamptz` | Registration time |

### `robot_status`
| Column | Type | Description |
|---|---|---|
| `robot_id` | `uuid` (FK robots) | Associated robot |
| `status` | `text` | online / offline / charging / cleaning |
| `battery_level` | `int` | 0–100 |
| `updated_at` | `timestamptz` | Last status update |

### `cleaning_sessions`
| Column | Type | Description |
|---|---|---|
| `id` | `uuid` | Primary key |
| `robot_id` | `uuid` (FK robots) | Robot that performed the session |
| `user_id` | `uuid` (FK profiles) | Session owner |
| `started_at` | `timestamptz` | Session start |
| `ended_at` | `timestamptz` | Session end |
| `duration_minutes` | `int` | Total runtime |
| `area_cleaned_sqm` | `float` | Estimated area |
| `mode` | `text` | auto / spot / edge |

### `cleaning_zones`
| Column | Type | Description |
|---|---|---|
| `id` | `uuid` | Primary key |
| `robot_id` | `uuid` (FK robots) | Associated robot |
| `name` | `text` | Zone label |
| `coordinates` | `jsonb` | Zone boundary points |

### `schedules`
| Column | Type | Description |
|---|---|---|
| `id` | `uuid` | Primary key |
| `user_id` | `uuid` (FK profiles) | Owner |
| `robot_id` | `uuid` (FK robots) | Target robot |
| `scheduled_at` | `timestamptz` | Next run time |
| `recurring` | `boolean` | Whether to repeat |
| `mode` | `text` | Cleaning mode |

---

## 9. Frontend Screens

### Authentication

| Screen | Route | Description |
|---|---|---|
| Entry | `/` (index) | Checks session, redirects to login or dashboard |
| Login | `/LoginScreen` | Email + password login. Shake animation on error, resend confirmation link if unverified |
| Signup | `/SignupScreen` | Full name, email, phone, password, confirm password. Real-time password strength indicator. Terms acceptance required |
| Forgot Password | `/ForgotPasswordScreen` | Email input → calls `forgotPassword()`. Shows success state with 60s resend cooldown |
| Reset Password | `/reset-password` | New password + confirm. Validates recovery session with 8-retry loop (1.6s total). Password strength bar + requirements checklist |
| Email Verified | `/verified-account` | Shows pending/verified state. Auto-redirects to login after 5s when verified. 60s resend cooldown |

### Main Tabs

| Tab | Screen | Description |
|---|---|---|
| 1 | Dashboard | Robot status card, last cleaned time, weekly stats (runtime + area), pull-to-refresh |
| 2 | Control | Start/stop, cleaning mode selector (auto/spot/edge), fan speed (quiet/standard/turbo), directional pad |
| 3 | Map | Live sensor data overlay, obstacle detection (left/right sensors), robot position, connection status |
| 4 | Schedule | Calendar picker, time selection, recurring toggle, schedule list |
| 5 | Profile | Links to all settings screens |

### Settings

| Screen | Route | Description |
|---|---|---|
| Account | `/settings/account` | Change email, password, name |
| Robot | `/settings/robot` | Register new robot, rename, delete |
| Connection | `/settings/connection` | BLE/Wi-Fi pairing via QR scan |
| History | `/settings/history` | Cleaning session log |
| Notifications | `/settings/notifications` | Toggle alert types and weekly report |
| Support | `/settings/support` | FAQ and contact info |

---

## 10. State Management

The app uses React Context for all global state (no Redux or Zustand).

### ThemeContext

Manages light/dark theme and exposes a full color palette. Persists the user's choice to `AsyncStorage`.

**Color tokens:**

| Token | Light | Dark |
|---|---|---|
| `primary` | `#2563eb` | `#3b82f6` |
| `background` | `#ffffff` | `#0f172a` |
| `card` | `#f8fafc` | `#1e293b` |
| `text` | `#1e293b` | `#f1f5f9` |
| `textSecondary` | `#64748b` | `#94a3b8` |
| `border` | `#e2e8f0` | `#334155` |
| `error` | `#dc2626` | `#f87171` |

### ToastContext

Global toast notification system. Displays one toast at a time, auto-dismisses after a configurable duration (default 3.5 s).

**Toast types:** `success` · `error` · `info` · `warning`

Usage:
```tsx
const { showToast } = useToast();
showToast({ message: 'Robot started!', type: 'success' });
```

---

## 11. Design System

### Typography

All text uses `AppText` which resolves `fontWeight` to the correct SF Pro Display file:

| fontWeight | Font file |
|---|---|
| `400` / `normal` | `SF-Pro-Display-Regular.otf` |
| `600` / `semibold` | `SF-Pro-Display-Semibold.otf` |
| `700` / `bold` | `SF-Pro-Display-Bold.otf` |

**Type scale** (`src/utils/responsive.ts`):

| Token | Size | Use |
|---|---|---|
| `xs` | 11 | Labels, captions |
| `sm` | 13 | Secondary text |
| `body2` | 14 | Body small |
| `body` | 15 | Body default |
| `md` | 16 | Subheadings |
| `lg` | 18 | Section titles |
| `xl` | 20 | Screen titles |
| `xxl` | 24 | Large headings |
| `h2` | 28 | Card headings |
| `h1` | 32 | Page headings |
| `display` | 36 | Hero text |

### Responsive sizing

Base design dimensions: **390 × 844** (iPhone 14). The `responsive.ts` helpers scale values proportionally and clamp extremes:
- `rf(n)` — responsive font (±20% clamp)
- `rs(n)` — responsive spacing
- `rp(n)` — responsive padding
- `rh(n)` — responsive height

### Spacing scale

`xxs: 4` · `xs: 8` · `sm: 12` · `md: 16` · `lg: 24` · `xl: 32` · `xxl: 48`

---

## 12. Environment Configuration

### Client-side (bundled into app)

| Variable | Description |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (safe to expose) |
| `EXPO_PUBLIC_RESEND_API_KEY` | Resend public key (for welcome / weekly emails) |
| `EXPO_PUBLIC_RESEND_FROM_EMAIL` | `hello@smartcleanerpro.online` |
| `EXPO_PUBLIC_RESEND_FROM_NAME` | `Smart Cleaner Pro` |

### Server-side only (Edge Functions secrets)

Set via Supabase CLI:
```sh
npx supabase@latest secrets set RESEND_API_KEY=re_...
```

| Secret | Description |
|---|---|
| `RESEND_API_KEY` | Secret Resend API key. Never exposed to client |
| `SUPABASE_URL` | Auto-injected by Supabase runtime |
| `SUPABASE_SERVICE_ROLE_KEY` | Auto-injected. Full database + auth admin access |

> **Security note:** `EXPO_PUBLIC_*` variables are bundled into the app binary and visible to anyone who decompiles the APK/IPA. Only the anon key and public Resend key belong here. The service role key and secret Resend key must stay server-side.

---

## 13. Deep Link Handling

The app uses the custom URL scheme **`smartcleaner`** for deep links (e.g., from email buttons).

Configured in `app.json`:
- iOS: `CFBundleURLSchemes: ["smartcleaner"]`
- Android: Intent filters for `smartcleaner://` scheme

### Deep link auth flows

There are two token formats depending on how the link was generated:

**Path A — Implicit grant (hash fragment)**
Produced by `supabaseAdmin.auth.admin.generateLink()`:
```
smartcleaner:///reset-password#access_token=xxx&refresh_token=xxx&type=recovery
smartcleaner:///verified-account#access_token=xxx&refresh_token=xxx&type=signup
```
Handled by parsing the hash, extracting tokens, and calling `supabase.auth.setSession()`.

**Path B — PKCE (query param)**
Produced by Supabase's own email links (magic link / verification):
```
smartcleaner:///verified-account?code=xxx
```
Handled by `supabase.auth.exchangeCodeForSession(url)`.

### Race condition prevention

`reset-password.tsx` starts a session check immediately on mount. Because `setSession()` in `_layout.tsx` is async, the session may not be committed by the time the screen renders. The screen uses an **8-iteration retry loop** (200 ms delay each, 1.6 s total) to wait for the session before declaring the link invalid.

---

## 14. Build & Deployment

### Local development

```sh
npm install
npx expo start
```

### Edge Functions

Deploy all functions:
```sh
npx supabase@latest functions deploy handle-signup --no-verify-jwt
npx supabase@latest functions deploy send-confirmation-email --no-verify-jwt
npx supabase@latest functions deploy send-reset-email --no-verify-jwt
```

Verify secrets:
```sh
npx supabase@latest secrets list --project-ref hdiqbfngevcpeylzwndq
```

### EAS Build

The project is configured for EAS (Expo Application Services):

```sh
# Development build (runs on physical device)
eas build --platform android --profile development
eas build --platform ios --profile development

# Production build
eas build --platform all --profile production
```

**EAS Project ID:** `09bd7c25-eb0f-490c-b0c7-566bae9e9231`

### App identifiers

| Platform | Identifier |
|---|---|
| iOS Bundle ID | `com.blessnges.smartcleanerpro` |
| Android Package | `com.blessnges.smartcleanerpro` |
| Expo owner | `blessnges` |
| App scheme | `smartcleaner` |
| Supabase project | `hdiqbfngevcpeylzwndq` |


