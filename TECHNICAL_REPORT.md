# Hustlr Website — Comprehensive Technical Report

---

## 1. Project Overview

### What is it?

Hustlr is a **selective freelance marketplace** targeting India's top college students. The platform uses a competitive two-round vetting process to admit only the top 5% of student applicants. Clients post real projects via a CMS; only vetted students can pick them up.

### Tech Stack

| Category | Details |
|---|---|
| **Framework** | Next.js 15 (Pages Router), React 19 |
| **Language** | TypeScript (with some `.jsx` files) |
| **Styling** | Tailwind CSS v3, Framer Motion, shadcn/ui (Radix UI) |
| **Auth (Students)** | Supabase Auth (email + password) + custom JWT via `jsonwebtoken` |
| **Auth (Admins)** | Firebase Auth (Google sign-in) + same custom JWT |
| **Database** | Supabase PostgreSQL |
| **File Storage** | Supabase Storage |
| **CMS** | Sanity v3 (project listings) |
| **Forms** | react-hook-form + Zod |
| **Email** | Resend + React Email |
| **OTP/Firestore** | Firebase Admin + Firestore (partially wired) |
| **Animations** | Framer Motion |
| **Notifications** | Sonner (toast) |

### Folder Layout

```
pages/          ← All routes (Next.js Pages Router)
  api/          ← Backend API route handlers
  admin/        ← Admin-only dashboard pages
  auth/         ← Email confirmation screens
  get-started/  ← Student onboarding funnel
  studio/       ← Sanity Studio embedded route
src/
  components/   ← All React components
    vetting/    ← 20+ form field components for Stage 1
    stage2/     ← Project selection & submission components
    admin/      ← Admin UI components
    top5/       ← Marketing page components
    verify/     ← OTP and timeline components
    emails/     ← React Email templates
  lib/          ← Utility functions, DB clients, schemas
    schemas/    ← Zod validation schemas + TypeScript types
    supabase/   ← Supabase client factories (component, API, SSR)
sanity/         ← Sanity schema definitions and client
components/ui/  ← shadcn/ui primitive components
public/         ← Fonts, images, static assets
styles/         ← Global CSS
```

---

## 2. Authentication & User Flow

### How Auth Works

There are **two separate auth systems**, one for students and one for admins, both culminating in the same `session` cookie format.

#### Student Login Flow

```
1. User visits /get-started/student/login
2. Submits email + password
3. supabaseClient.auth.signInWithPassword() is called (browser-side)
4. Supabase returns a session with access_token
5. Frontend POSTs access_token to /api/auth/exchange
6. Server verifies access_token with supabaseAdmin.auth.getUser()
7. Server signs a custom JWT: { email, role: "user" } (7-day expiry)
8. JWT is set as httpOnly cookie named "session"
9. User is redirected to /get-started/student/application
```

#### Student Sign-Up Flow

```
1. User clicks "Sign up" on the same login page
2. supabaseClient.auth.signUp() is called with emailRedirectTo pointing to /api/auth/confirm
3. User receives email → clicks link → GET /api/auth/confirm?token_hash=...&type=...
4. Server calls supabase.auth.verifyOtp() to verify the link
5. Server signs a custom JWT and sets the "session" cookie
6. User is redirected to /auth/confirmEmail which auto-redirects to /get-started/student/application
```

#### Admin Login Flow

```
1. Admin visits /admin/login
2. Signs in with Google via Firebase Auth (client-side)
3. Gets Firebase ID token
4. Frontend POSTs ID token to /api/admin/login (as Authorization: Bearer <token>)
5. Server verifies with firebaseAdminAuth.verifyIdToken()
6. Server signs JWT: { email, role: "admin" } (7-day expiry)
7. JWT is set as httpOnly "session" cookie
8. Admin redirected to /admin
```

#### Logout

`POST /api/auth/logout` — sets the `session` cookie to an expired empty value.

### JWT Structure

```ts
// Student token
{ email: "user@email.com", role: "user", iat: ..., exp: ... }

// Admin token
{ email: "admin@email.com", role: "admin", iat: ..., exp: ... }
```

**Secret**: `process.env.JWT_SECRET`

### Auth State Management

There is **no global auth context or store**. Auth state is derived entirely at the **server side** via `getServerSideProps` — each protected page reads and verifies the `session` cookie independently before rendering. There is no client-side auth state manager.

### User Roles

| Role | How Identified | What They Can Access |
|---|---|---|
| `user` | JWT role = "user" | Student application funnel |
| `admin` | JWT role = "admin" | Admin dashboard + status updates |
| Unauthenticated | No/invalid JWT | Public marketing pages only |

---

## 3. Pages & Routing

All routing uses the **Next.js Pages Router**. Navigation is handled via `next/router` (`useRouter`) and `next/link`.

### Complete Route Inventory

| Route | Protection | Purpose |
|---|---|---|
| `/` | Public | Marketing homepage |
| `/top5` | Public | "Top 5%" explainer page for students |
| `/get-started` | Public | Role selector (Student / Client) |
| `/error` | Public | Error display page (reads `?message=` query param) |
| `/auth/verificationSent` | Public | "Check your email" screen after sign-up |
| `/auth/confirmEmail` | Public | Email confirmed landing, auto-redirects |
| `/get-started/student/login` | Public (redirects if already logged in) | Student login + sign-up on one page |
| `/get-started/student/application` | JWT required | Application hub — shows current status and next step |
| `/get-started/student/application/stage1` | JWT required | 9-step vetting form (Stage 1) |
| `/get-started/student/application/vetting` | JWT required | Alternative vetting form entry point (duplicate of stage1) |
| `/get-started/student/application/status` | Client-side fetch | Shows application status after submission |
| `/get-started/student/application/stage2` | JWT required, must be `round_2_eligible` | Project selection grid |
| `/get-started/student/application/stage2/projectInfo/[id]` | JWT required | Detailed info for a specific project |
| `/get-started/student/application/stage2/projectSubmit` | JWT required, must be `round_2_project_selected` | Submit project work (video link) |
| `/get-started/student/application/stage2/view` | JWT required, must be `round_2_under_review` | View submitted project details |
| `/admin/login` | Public (Google Firebase sign-in) | Admin authentication |
| `/admin` | Admin JWT required | List all applications, filter/search |
| `/admin/applications/[email]` | Admin JWT required | Full application detail + status update |
| `/studio/[[...index]]` | Sanity Studio embedded | CMS editor for project listings |

### Protected Route Pattern

Every protected page uses `getServerSideProps`:

```ts
const token = req.cookies?.session;
const payload = verifyToken(token);
if (!token || payload.role !== "admin") {
  return { redirect: { destination: "/...", permanent: false } };
}
```

---

## 4. Components

### Navigation & Layout

| Component | Location | Purpose |
|---|---|---|
| `Nav` | `src/components/Nav.tsx` | Top navigation bar used on all pages |
| `MobileMenu` | `src/components/MobileMenu.tsx` | Hamburger menu for mobile |
| `TimelineDots` | `src/components/Timeline.tsx` | Visual progress indicator (Round 1 → 2 → 3) |

### Homepage Components (page-specific)

| Component | Purpose |
|---|---|
| `HomepageHero` | Hero section with typewriter and parallax |
| `WhatHustlrOffers` | Feature cards with scroll-triggered animation |
| `HowHustlrWorks` | Steps/process section |
| `VisionSection` | Mission/vision statement block |
| `CtaSection` | Final call-to-action button section |

### Top5 Page Components

| Component | Purpose |
|---|---|
| `Top5Hero` | Hero for the /top5 marketing page |
| `VettingProcess` | Explains the vetting pipeline |
| `Vision` | Vision statement variant for top5 page |
| `Top5Cta` | CTA section for top5 page |

### Vetting Form Components (Step-specific, inside a dialog pattern)

All live in `src/components/vetting/` and receive `form: FormFieldProp` as a prop.

| Component | Step | Fields |
|---|---|---|
| `CategoryRadio` | 0 | category |
| `NameInput` | 1 | name |
| `EmailInput` | 1 | email (read-only, pre-filled) |
| `DobInput` | 1 | date of birth (calendar picker) |
| `PhoneInput` | 1 | phone (+91 format) |
| `CollegeInput` | 1 | college name |
| `CollegeEmailInput` | 1 | college email |
| `DegreeInput` | 1 | degree |
| `BranchInput` | 1 | branch/major |
| `CollegeYearInput` | 1 | current year of study |
| `CgpaInput` | 1 | CGPA (6.0–10.0, decimal required) |
| `UploadFileInput` | 1 | File uploader (resume, transcript, student ID) |
| `SkillsProficiencyInput` | 2 | skills array with proficiency level |
| `ProjectsInput` | 3 | projects array with description (200-word limit) |
| `ExperienceInput` | 4 | work experience array with description (200-word limit) |
| `HackathonInput` | 5 | hackathons array with description (200-word limit) |
| `OpenSourceInput` | 6 | open source contributions, impactDescription (200-word limit) |
| `ResearchCompetitiveInput` | 7 | research papers, Codeforces/CodeChef ratings, CP competitions |
| `LinksInput` | 8 | LinkedIn, GitHub |
| `AwardsInput` | 8 | awards array with file upload per award |
| `VettingDetails` | Display-only | Read-only view of all submitted data (used in admin + after submission) |
| `VettingForm` | Orchestrator | Manages step progression, saves, and final submit |

### Stage 2 Components

| Component | Purpose |
|---|---|
| `ProjectCard` | Card showing project name, tags, duration |
| `ProjectSelection` | Grid of `ProjectCard`s with selection state |
| `ProjectSubmissionForm` | Google Drive video link submission form |
| `CountdownTimer` | Live countdown to project deadline |
| `RichTextRenderer` | Renders Sanity `PortableTextBlock` content |

### Admin Components

| Component | Purpose |
|---|---|
| `AdminLogin` | Firebase Google sign-in button |
| `ApplicationStatusMsg` | Displays current status badge for an application |
| `ApplicationStatusUpdate` | Dropdown + button to change status, calls `updateApplicationStatus` API |

### Verify Components

| Component | Purpose |
|---|---|
| `InputOtpForm` | OTP input form (6-digit) — appears to be unused in current flows |
| `VettingTimeline` | Alternative timeline display |

### Email Components

| Component | Purpose |
|---|---|
| `emails/notification.tsx` | React Email template — not called from any API route (unused) |

### Reusable UI Primitives (`components/ui/`)

All are shadcn/ui components: `Alert`, `Badge`, `Button`, `Calendar`, `Card`, `Carousel`, `Checkbox`, `Command`, `Dialog`, `Form`, `Input`, `InputOtp`, `Label`, `Popover`, `Progress`, `RadioGroup`, `Select`, `Separator`, `Skeleton`, `Table`, `Textarea`, `Timeline`.

### State Management Pattern

- **No global state** (no Context, no Redux, no Zustand)
- All vetting form state lives inside `VettingForm` via `react-hook-form`
- Individual sub-components (e.g., `ProjectsInput`) manage their own **local dialog state** separately from the main form, then write final entries into the parent `react-hook-form` via `form.setValue()`
- Auth state is entirely server-side (cookie-based), not reflected in any client state

---

## 5. Forms & Multi-Step Flows

### The Vetting Form (Stage 1) — 9 Steps

**Location**: `src/components/vetting/VettingForm.tsx`, rendered by `pages/get-started/student/application/stage1.tsx`

| Step | Fields |
|---|---|
| 0 | category |
| 1 | name, email, dob, phone, college, collegeEmail, degree, branch, year, cgpa, resume, transcript, studentId |
| 2 | skills (array) |
| 3 | projects (array with dialog) |
| 4 | experiences (array with dialog) |
| 5 | hackathons (array with dialog) |
| 6 | openSource (array with dialog) |
| 7 | hasPublishedResearch, researchPapers, Codeforces/CodeChef data, cpCompetitions |
| 8 | linkedin, github, awards (array with dialog) |

**Progress Tracking**: Auto-calculated by `calculteStartingStep()` which scans which fields are filled in the saved DB data and returns the first incomplete step.

**Data Persistence**:
- On "Next": saves via `POST /api/application/save` with JWT in `Authorization` header
- On page close/refresh: sends via `navigator.sendBeacon()` to `/api/application/save?beacon=true&token=<jwt>`
- On final submit: `POST /api/application/save?final=true` → sets `isComplete: true`, `status: "under_review"`

**Form Validation**: Zod schema (`formSchema`) enforced via `zodResolver` + `react-hook-form`. Per-step validation triggered by `form.trigger(stepFields[step])` on "Next" click. Sub-forms (projects, experiences, etc.) use their own local validation logic, not Zod.

**Word Limits**: Description fields in `ProjectsInput`, `ExperienceInput`, `HackathonInput`, `OpenSourceInput` are limited to 200 words. Exceeding the limit truncates to 200 words, shows a live inline error, and blocks saving.

### Login Form

**Location**: `pages/get-started/student/login.tsx`  
Fields: email, password. Zod schema with min 6-char password. Single form handles both login and signup depending on which button is clicked.

### Admin Login

**Location**: `src/components/admin/AdminLogin.tsx`  
No form fields — just a "Sign in with Google" button that calls Firebase `signInWithPopup`.

### Stage 2 — Project Selection

Not a traditional form. User clicks a `ProjectCard` to select it, then confirms via a button. POSTs to `/api/project/select`.

### Stage 2 — Project Submission Form

**Location**: `src/components/stage2/ProjectSubmissionForm.tsx`  
Fields: `videoLink` (must be a Google Drive link), `otherLinks` (optional). POSTs to `/api/project/submit`.

### Admin Status Update Form

**Location**: `src/components/admin/ApplicationStatusUpdate.tsx`  
Dropdown of all `ApplicationStatus` values + an "Update" button. POSTs to `/api/admin/updateApplicationStatus`.

---

## 6. Database & Supabase

### Tables

#### `vettingapplications`

The single Supabase table. Stores everything about a student application.

**Key columns:**

| Column | Type | Description |
|---|---|---|
| `email` | text (PK) | Student email, used as unique identifier |
| `name` | text | Full name |
| `category` | text | Selected freelance category |
| `phone`, `dob`, `college`, `year`, `cgpa`, etc. | various | Personal/academic info (Step 1) |
| `skills` | jsonb | Array of `{skill, proficiency}` |
| `projects` | jsonb | Array of project objects |
| `experiences` | jsonb | Array of experience objects |
| `hackathons` | jsonb | Array of hackathon objects |
| `openSource` | jsonb | Array of open source objects |
| `researchPapers`, `cpCompetitions` | jsonb | Research/CP data |
| `awards` | jsonb | Array of award objects |
| `resume`, `transcript`, `studentId` | text | Storage paths in `vetting-files-storage` bucket |
| `isComplete` | boolean | Stage 1 submitted |
| `status` | text | `ApplicationStatus` enum value |
| `currentStage` | int | Which stage the application is at |
| `selectedProjectSanityId` | text | Sanity ID of chosen Stage 2 project |
| `projectDeadline` | timestamptz | Deadline set when project is selected |
| `videoLink`, `otherLinks` | text | Stage 2 submission |

**Operations per API route:**

| Route | Operation |
|---|---|
| `POST /api/application/save` | INSERT or UPDATE `vettingapplications` |
| `POST /api/application/save?final=true` | UPDATE — sets `isComplete=true`, `status="under_review"` |
| `GET /api/application/status` | SELECT `status` WHERE `email` |
| `GET /api/admin/getAllApplications` | SELECT `*` ORDER BY name |
| `POST /api/admin/updateApplicationStatus` | UPDATE `currentStage`, `status` WHERE `email` |
| `POST /api/project/select` | UPDATE — sets `selectedProjectSanityId`, `projectDeadline`, `status` |
| `POST /api/project/submit` | UPDATE — sets `videoLink`, `otherLinks`, `status="round_2_under_review"` |
| `POST /api/file/upload` | UPDATE — sets file column (resume/transcript/studentId) to storage path |
| `DELETE /api/file/delete` | SELECT path → Storage DELETE → UPDATE column to null |
| `GET /api/file/metadata` | Storage signed URL fetch (no DB write) |

### Supabase Storage

**Bucket**: `vetting-files-storage`  
**Path pattern**: `applications/<email>/<fieldName>.<ext>`  
**Allowed types**: `.jpg`, `.jpeg`, `.png`, `.webp`, `.pdf`  
Signed URLs are generated with 1-hour expiry via `/api/file/metadata`.

### Firebase Firestore

**Collection**: `email_otps`  
**Used by**: `src/lib/otpUtils.ts` (`saveOtp`, `verifyOtp`, `removeExpiredOtps`)  
**Status**: Implemented but **not wired into any active API route**. Dead code in current flows.

### RLS / Edge Functions

No RLS policies or Edge Functions are visible in the codebase. All database access goes through `supabaseAdmin` (service key), bypassing RLS entirely.

---

## 7. API Layer

All API routes are in `pages/api/`. The frontend uses `fetch()` for all API calls.

### Auth Routes

| Route | Method | Auth | Description |
|---|---|---|---|
| `POST /api/auth/exchange` | POST | None | Takes Supabase `access_token`, issues custom JWT cookie |
| `GET /api/auth/confirm` | GET | None | Verifies Supabase email OTP link, issues JWT cookie, redirects |
| `/api/auth/logout` | Any | None | Clears `session` cookie |

### Application Routes

| Route | Method | Auth | Description |
|---|---|---|---|
| `POST /api/application/save` | POST | JWT (Bearer or beacon query) | Inserts or updates vetting data; `?final=true` marks complete |
| `GET /api/application/status` | GET | Session cookie | Returns `status` for the logged-in user |

### File Routes

| Route | Method | Auth | Description |
|---|---|---|---|
| `POST /api/file/upload?field=<name>` | POST | None (email in body) | Uploads file to Supabase Storage, updates DB column |
| `DELETE /api/file/delete?field=&email=` | DELETE | None | Deletes from Storage and clears DB column |
| `GET /api/file/metadata?path=` | GET | JWT Bearer | Returns signed URL and metadata for a file |

### Project Routes

| Route | Method | Auth | Description |
|---|---|---|---|
| `POST /api/project/select` | POST | JWT Bearer | Sets `selectedProjectSanityId` and `projectDeadline` |
| `POST /api/project/submit` | POST | JWT Bearer | Saves `videoLink` if within deadline, sets `status` |

### Admin Routes

| Route | Method | Auth | Description |
|---|---|---|---|
| `POST /api/admin/login` | POST | Firebase ID token (Bearer) | Verifies Firebase token, issues admin JWT cookie |
| `GET /api/admin/getAllApplications` | GET | Admin JWT Bearer | Returns all rows from `vettingapplications` |
| `POST /api/admin/updateApplicationStatus` | POST | Admin JWT Bearer | Updates `status` and `currentStage` for an email |

### Utility Routes

| Route | Method | Auth | Description |
|---|---|---|---|
| `GET /api/me` | GET | Session cookie | **Dev only** — returns JWT payload (broken, see §9) |
| `GET /api/test` | GET | None | **Dev only** — sets a hardcoded session JWT |

---

## 8. State Management

There is **no global client-side state manager** (no Context API, no Zustand, no Redux).

| Data | Where Stored | How Accessed |
|---|---|---|
| Auth/session | httpOnly cookie `session` | Read server-side in `getServerSideProps`; passed as prop |
| Vetting form data | `react-hook-form` state inside `VettingForm` | Via `form.getValues()` / `form.setValue()` |
| Sub-form dialog state (projects, etc.) | `useState` inside each `*Input` component | Local only; written to parent via `form.setValue()` on save |
| Application status | Fetched on `status.tsx` page via `useEffect` → `/api/application/status` | Local `useState` |
| Admin applications list | Fetched on mount in `pages/admin/index.tsx` | Local `useState` |
| Sanity project data | `getServerSideProps` → passed as prop | Props |
| JWT token (for client-side API calls) | Passed as prop from `getServerSideProps` | Prop drilling |

---

## 9. Known Issues & Code Smells

### Bugs

#### 1. `/api/me.ts` — always returns 403

```ts
if (process.env.NODE_ENV === "development") {
  // ...
  res.status(200).json({ user: payload }); // sends response
  console.log(...)
}
return res.status(403).json(...); // ALWAYS executes — headers already sent error in dev
```
The function never `return`s inside the `if` block, so it both sends a 200 and then tries to send a 403.

#### 2. `/api/project/submit.ts` — silent failure when past deadline

```ts
if (isWithinTime) {
  await updateVettingData({ ... });
}
return res.status(200).json({ success: true }); // returns 200 even if NOT saved
```
If the deadline has passed, the submission is silently discarded and a `200 OK` is still returned. The student receives no feedback that their submission was rejected.

#### 3. `/pages/admin/applications/[email].tsx` — arbitrary JWT generation

```ts
const userJwtToken = createToken(emailId as string); // emailId comes from URL params
```
A JWT is minted for any email address that appears in the URL. While the page itself is admin-protected, passing this token to `VettingDataDisplay` is an unnecessary risk.

#### 4. `/pages/get-started/student/application/stage2/view.tsx` — redirects to a non-existent route

```ts
redirect: { destination: "/get-started/verify", permanent: false }
```
The route `/get-started/verify` does not exist in the codebase. Users would hit a 404.

---

### Dead Code / Unused Implementations

#### 5. `src/lib/otpUtils.ts` and `src/lib/sendOtpEmail.ts`
Fully implemented OTP system (Firebase Firestore + Resend email) that is **not called from any API route**. This entire feature is unused.

#### 6. `src/components/emails/notification.tsx`
React Email template that is never imported or called.

#### 7. `src/components/verify/InputOtpForm.tsx`
OTP input UI component with no route currently using it.

#### 8. Firebase `db` export in `firebase-admin.ts`
Firestore client is only used by the dead OTP system. All live data uses Supabase.

#### 9. Commented-out Firebase code in `vettingUtils.ts`
The original implementation stored data in Firestore. The entire block is commented out and replaced with Supabase, but the dead code remains.

---

### Incomplete Implementations

#### 10. `formSchema.ts` TODO comment

```ts
/* TODO: Migrate isComplete also to status */
```
The `isComplete` boolean flag and the `status` field overlap — they both signal application completion state but are updated inconsistently.

#### 11. Duplicate Stage 1 entry pages
Both `pages/get-started/student/application/stage1.tsx` and `pages/get-started/student/application/vetting.tsx` render the same `VettingForm` component. It's unclear which is canonical and which is stale. The application hub (`application/index.tsx`) links to `stage1`.

#### 12. `pages/api/test.ts` — hardcoded email in dev tool

```ts
const token = createToken("max910payne@gmail.com");
```
This is a dev shortcut that creates a valid session for a specific real email. It must never be deployed to production.

#### 13. The `email_not_confirmed` login case falls back to `signUp()`

```ts
case "email_not_confirmed":
  // resend logic is commented out
  signUp(values);
```
Instead of resending the verification email, it calls `signUp()` again, which may silently fail or confuse users.

#### 14. No auth on `/api/file/upload` and `/api/file/delete`
The upload and delete routes validate `email` from the request body/query but don't require a valid JWT. Any caller who knows a user's email could upload files to their record.

#### 15. `src/lib/supabase/auth/static-props.ts`
A Supabase client factory for `getStaticProps` that is never used (the entire app uses `getServerSideProps`).

#### 16. `src/lib/firebaseClient.ts`
Client-side Firebase SDK initialized; unclear where it is used since admin login uses the Firebase Admin SDK server-side.

---

### Missing Error Handling

- `VettingForm` `onSubmit` never calls `setSubmitting(false)` if `isValid` is false — the submit button stays in "Submitting…" state permanently after a failed final submit.
- `checkIfExists()` in `vettingUtils.ts` throws on Supabase error rather than returning a structured error — callers don't handle this gracefully.

---

## 10. File-by-File Summary

### Root Config Files

| File | Summary |
|---|---|
| `package.json` | Project dependencies and npm scripts (dev, build, start, lint) |
| `next.config.js` | Next.js configuration |
| `tsconfig.json` | TypeScript config with `@/` path alias |
| `tailwind.config.js` | Tailwind theme config with custom colors and fonts |
| `sanity.config.ts` | Sanity Studio config, registers schemas |
| `components.json` | shadcn/ui component registry config |
| `postcss.config.js` / `postcss.config.mjs` | PostCSS config (duplicate files) |
| `commit-guidelines.md` | Team git commit message conventions |

### Pages

| File | Summary |
|---|---|
| `pages/_app.tsx` | Root app wrapper; injects fonts and Sonner Toaster |
| `pages/index.tsx` | Public homepage with scroll tracking for parallax |
| `pages/top5.tsx` | "Top 5% of student freelancers" marketing page |
| `pages/error.tsx` | Generic error page that displays a `?message=` query param |
| `pages/auth/confirmEmail.tsx` | Post-verification landing page; auto-redirects to application |
| `pages/auth/verificationSent.tsx` | Static screen telling user to check email |
| `pages/get-started/index.tsx` | Role selection page (Student / Client buttons) |
| `pages/get-started/student/login.tsx` | Student login + sign-up form; handles Supabase auth and JWT exchange |
| `pages/get-started/student/application/index.tsx` | Application hub; shows current status and routes user to the right next step |
| `pages/get-started/student/application/stage1.tsx` | The main 9-step Stage 1 vetting form page (canonical) |
| `pages/get-started/student/application/vetting.tsx` | Duplicate Stage 1 vetting form page (likely stale) |
| `pages/get-started/student/application/status.tsx` | Application status display page; fetches status client-side |
| `pages/get-started/student/application/stage2/index.tsx` | Stage 2 project selection page; shows Sanity projects |
| `pages/get-started/student/application/stage2/projectInfo/[id].tsx` | Detailed view of a single project from Sanity |
| `pages/get-started/student/application/stage2/projectSubmit.tsx` | Stage 2 project submission form (video link) |
| `pages/get-started/student/application/stage2/view.tsx` | Post-submission view page (accessible only at `round_2_under_review`) |
| `pages/admin/login.tsx` | Admin login page with Firebase Google sign-in |
| `pages/admin/index.tsx` | Admin dashboard listing all applications with filter/search |
| `pages/admin/applications/[email].tsx` | Full application detail + status update for a specific student |
| `pages/studio/[[...index]].tsx` | Sanity Studio embedded in the Next.js app |

### API Routes

| File | Summary |
|---|---|
| `pages/api/auth/exchange.ts` | Converts Supabase `access_token` → custom JWT cookie |
| `pages/api/auth/confirm.ts` | Handles Supabase email verification link, sets JWT cookie |
| `pages/api/auth/logout.ts` | Clears the session cookie |
| `pages/api/application/save.ts` | Inserts or updates vetting data; handles final submission |
| `pages/api/application/status.ts` | Returns application status for the authenticated user |
| `pages/api/file/upload.ts` | Uploads file to Supabase Storage and updates DB path |
| `pages/api/file/delete.ts` | Deletes file from storage and clears DB column |
| `pages/api/file/metadata.ts` | Returns signed URL and metadata for a stored file |
| `pages/api/project/select.ts` | Saves project selection and calculates deadline from Sanity duration |
| `pages/api/project/submit.ts` | Saves Google Drive video link if within deadline |
| `pages/api/admin/login.ts` | Verifies Firebase ID token and sets admin JWT cookie |
| `pages/api/admin/getAllApplications.ts` | Admin-only: returns all rows from `vettingapplications` |
| `pages/api/admin/updateApplicationStatus.ts` | Admin-only: updates `status` and `currentStage` for an applicant |
| `pages/api/me.ts` | Dev-only: returns JWT payload — **broken, always 403** |
| `pages/api/test.ts` | Dev-only: sets a hardcoded JWT session — **security risk if deployed** |

### src/lib

| File | Summary |
|---|---|
| `src/lib/jwt.ts` | Creates and verifies custom JWTs (`createToken`, `createAdminToken`, `verifyToken`) |
| `src/lib/supabase-admin.ts` | Exports `supabaseAdmin` (service key) and `supabase` (anon key) clients |
| `src/lib/supabase/auth/api.ts` | Supabase client factory for use inside API routes |
| `src/lib/supabase/auth/component.ts` | Supabase browser client factory for client-side React |
| `src/lib/supabase/auth/server-props.ts` | Supabase client factory for `getServerSideProps` |
| `src/lib/supabase/auth/static-props.ts` | Supabase client factory for `getStaticProps` — **unused** |
| `src/lib/firebase-admin.ts` | Initializes Firebase Admin SDK; exports `db` (Firestore) and `firebaseAdminAuth` |
| `src/lib/firebaseClient.ts` | Client-side Firebase SDK init — **unclear if actively used** |
| `src/lib/vettingUtils.ts` | All Supabase CRUD for `vettingapplications`: check, insert, update, get progress |
| `src/lib/fetchProjectsData.ts` | GROQ queries to fetch project listings from Sanity |
| `src/lib/otpUtils.ts` | OTP generate/verify/cleanup using Firestore — **unused in active flows** |
| `src/lib/sendOtpEmail.ts` | Sends OTP email via Resend — **unused in active flows** |
| `src/lib/utils.ts` | `cn()` utility (merges Tailwind classes with clsx + tailwind-merge) |
| `src/lib/schemas/formSchema.ts` | All Zod schemas and TypeScript types: `formSchema`, `SupabaseVettingData`, `ApplicationStatus`, `Stage2Data`, etc. |
| `src/lib/schemas/otpSchema.ts` | Zod schema for OTP Firestore documents |
| `src/fonts.js` | Next.js font definitions (Ovo serif, The Seasons custom font) |

### Sanity

| File | Summary |
|---|---|
| `sanity/lib/client.ts` | Sanity client export (`sanity`) used for GROQ queries |
| `sanity/schemas/testproject.ts` | `testProject` schema — project listings (name, desc, tags, duration, images, detailedDesc) |
| `sanity/schemas/category.ts` | `category` schema for project categories |
| `sanity/schemas/post.ts` | Generic `post` schema — appears to be a CMS blog schema, not actively used in the app |
| `sanity/schemas/index.ts` | Registers all schemas with Sanity Studio |

### styles

| File | Summary |
|---|---|
| `styles/globals.css` | Global CSS with Tailwind directives, CSS variables for theme colors, custom font-face declaration |
