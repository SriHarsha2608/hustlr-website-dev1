# PR #4 — Client Onboarding Code Review Issues

**PR**: #4 from SriHarsha2608/main
**Files**: `pages/get-started/client/onboarding.tsx`, `pages/get-started/client/verify.tsx`
**Reviewed**: 2026-03-21
**Note**: Backend is intentionally not implemented yet — only frontend issues are listed.

---

## CRITICAL

### Issue 1 — Broken relative navigation path (verify.tsx:139)
**What**: `router.push("get-started/student/login")` uses a relative path (missing leading `/`).
**Impact**: From `/get-started/client/verify`, this resolves to `/get-started/client/get-started/student/login` — a 404.
**Fix**: Change to `router.push("/get-started/student/login")`.

### Issue 2 — Duplicate `value` in COUNTRY_CODES breaks Select (verify.tsx:18-19)
**What**: US and Canada both have `value: "+1"`. Radix `Select` matches by `value`, so selecting Canada always displays/resolves as US. Other shared codes (e.g. future duplicates) have the same risk.
**Impact**: Users cannot select Canada (or any country sharing a code with an earlier entry).
**Fix**: Use a unique identifier (ISO country code) as the `value`, and store/display the dial code separately.

---

## HIGH

### Issue 3 — Missing apostrophe typo (onboarding.tsx:152)
**What**: Text reads `Youre Ready to Post Your First Project` — missing apostrophe.
**Impact**: Visible grammar error on the success screen.
**Fix**: Change to `You&apos;re Ready to Post Your First Project`.

### Issue 4 — Success buttons navigate to wrong places (onboarding.tsx:161-176)
**What**:
- "Post My First Project" → `router.push("/")` (homepage, no project posting flow exists)
- "Go To Dashboard" → `router.push("/admin")` (internal admin panel with Firebase auth, not a client dashboard)
**Impact**: Clients land on irrelevant pages after onboarding.
**Fix**: Both should navigate to `/get-started/client/verify` (the client entry point) until actual client dashboard/project-posting pages exist.

### Issue 5 — Sign In button sends clients to student login (verify.tsx:253)
**What**: The "Sign In" button navigates to `/get-started/student/login` — the student OTP flow.
**Impact**: Clients entering an existing-account flow end up in the wrong user type's authentication.
**Fix**: Since no client auth exists yet, keep on the same page with a toast indicating "Client sign-in coming soon", or navigate to a placeholder.

---

## MEDIUM

### Issue 6 — Unused `mode` state (verify.tsx:114)
**What**: `mode` is set to `"signup"` inside `submitCreateAccount` but is only read for the `autoComplete` attribute on the password field. There is no sign-in mode implementation.
**Impact**: Dead code that adds confusion.
**Fix**: Remove `mode` state entirely. Hardcode `autoComplete="new-password"`.

### Issue 7 — Hardcoded inline `fontFamily` styles (onboarding.tsx:144-148, 166-169)
**What**: Multiple elements use `style={{ fontFamily: '"FONTSPRING DEMO - TT Commons Pro DemiBold"...' }}`. The app already defines fonts via `src/fonts.js` using `next/font/local` with CSS variables (`--font-the-seasons`, `--font-ovo`).
**Impact**: Inconsistent font loading, possible FOUT, references demo font names that shouldn't ship.
**Fix**: Use existing CSS variable classes (`font-serif` mapped to `--font-the-seasons`) or extend the font config if TT Commons Pro is a legitimate addition.

### Issue 8 — No `htmlFor` on labels (both files)
**What**: All `<label>` elements lack `htmlFor` (or wrapping the input), so clicking a label doesn't focus its input.
**Impact**: Accessibility failure (WCAG 2.1 Level A, criterion 1.3.1).
**Fix**: Add `id` to each input and matching `htmlFor` to each label.

---

## LOW (noted, not blocking)

- **topo.svg is 25,165 lines** — large SVG used as background. Consider optimizing in a future pass.
- **URL regex is permissive** — `abc.de` passes validation. LinkedIn field could enforce `linkedin.com` domain. Non-blocking for now.
- **Limited country list in onboarding** — only 5 countries. Likely intentional for MVP scope.
