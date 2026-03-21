# PR #4 — Fix Plan

**Reference**: `docs_old/PR4-client-onboarding-issues.md`
**Date**: 2026-03-21

---

## Fix Order (dependencies considered)

### Step 1 — Fix broken navigation path (Issue 1) [CRITICAL]
- File: `verify.tsx:139`
- Change: `"get-started/student/login"` → `"/get-started/student/login"`
- Verify: Ensure all `router.push` calls in the file use absolute paths.

### Step 2 — Fix duplicate COUNTRY_CODES values (Issue 2) [CRITICAL]
- File: `verify.tsx:17-98`
- Change: Restructure COUNTRY_CODES to use unique `value` per entry (ISO 3166-1 alpha-2 code).
  - Each entry: `{ value: "US", dialCode: "+1", label: "..." }`
- Update `countryCode` state to store the ISO code.
- Update the Select to use ISO code as value, display dial code in UI.
- Verify: US and Canada both selectable and distinguishable.

### Step 3 — Fix apostrophe typo (Issue 3) [HIGH]
- File: `onboarding.tsx:152`
- Change: `Youre` → `You&apos;re`
- Verify: Text renders correctly with apostrophe.

### Step 4 — Fix success button navigation (Issue 4) [HIGH]
- File: `onboarding.tsx:161-176`
- Change:
  - "Post My First Project" → navigate to `/get-started/client/verify` (client entry, placeholder until real flow exists)
  - "Go To Dashboard" → same, or show a toast "Dashboard coming soon"
- Verify: Buttons lead to valid client-facing pages.

### Step 5 — Fix Sign In button (Issue 5) [HIGH]
- File: `verify.tsx:253`
- Change: Instead of navigating to student login, show a toast "Client sign-in coming soon" and stay on page.
- Verify: Button no longer navigates to wrong flow.

### Step 6 — Remove unused `mode` state (Issue 6) [MEDIUM]
- File: `verify.tsx`
- Change: Remove `mode` state, `setMode` calls, and replace `autoComplete={mode === "signin" ? "current-password" : "new-password"}` with `autoComplete="new-password"`.
- Verify: No references to `mode` remain.

### Step 7 — Fix hardcoded font styles (Issue 7) [MEDIUM]
- File: `onboarding.tsx`
- Change: Replace inline `style={{ fontFamily: ... }}` with Tailwind font classes that use existing CSS variables from `src/fonts.js`.
  - Use `font-serif` (maps to `--font-the-seasons`) for headings.
  - Use `font-sans` (Poppins) for buttons/body, which is the app default.
- Remove all inline `style` blocks that only set fontFamily.
- Verify: Fonts render consistently with the rest of the app.

### Step 8 — Add htmlFor accessibility (Issue 8) [MEDIUM]
- Files: `onboarding.tsx`, `verify.tsx`
- Change: Add unique `id` to each input, add matching `htmlFor` to each label.
- Naming convention: `client-onboarding-{fieldName}`, `client-verify-{fieldName}`
- Verify: Clicking labels focuses the correct input.

### Step 9 — Final verification
- Run `npx next build` or `npx next lint` to confirm no compile errors.
- Manually review both pages render correctly.
