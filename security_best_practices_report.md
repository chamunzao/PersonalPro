# Security Best Practices Report - PersonalPro

## Executive Summary

PersonalPro is a React + Vite + Firebase single page app hosted on GitHub Pages. Vite is only the static build tool; GitHub Pages remains the hosting target. The app avoids the highest-risk React XSS escape hatches: no `dangerouslySetInnerHTML`, `innerHTML`, `eval`, `postMessage`, or unsafe `window.open` usage was found in the source scan. The highest remaining risks are operational: Firebase App Check/API restrictions must be enabled in Firebase/Google Cloud, and remaining dependency advisories require dependency-major upgrades that should be tested separately.

## Critical Findings

### S1. Vulnerable Dependencies In The Installed Dependency Tree

- Rule ID: REACT-SUPPLY-001
- Severity: Critical
- Location: `package.json:14`, `package.json:18`, `package.json:19`
- Evidence:
  - `firebase`: `^10.9.0`
  - `vite`: `^5.1.0`
  - `vite-plugin-pwa`: `^0.19.0`
  - Initial `npm audit --audit-level=moderate` reported 18 vulnerabilities: 1 critical, 4 high, 13 moderate. The critical item was `protobufjs <7.5.5`; high items include `serialize-javascript <=7.0.4` and `undici <=6.23.0`.
- Status:
  - `npm audit fix` was applied and updated the lockfile, including the critical `protobufjs` patch path.
  - `node_modules` was removed from Git tracking and remains ignored by `.gitignore`.
  - Some remaining advisories require coordinated package upgrades for Firebase, Vite, and PWA tooling. Those upgrades do not change the hosting target, but they should be verified before shipping.
- Impact: A vulnerable dependency can expose the build/dev environment or Firebase SDK dependency paths to known attacks. The critical `protobufjs` advisory is arbitrary code execution.
- Fix:
  - Run `npm audit fix` first and rebuild. Done.
  - Upgrade Firebase to a version outside the audited vulnerable range.
  - Upgrade Vite and `vite-plugin-pwa`; avoid `npm audit fix --force` without testing because it may jump to a breaking Vite version.
  - Re-run `npm audit --audit-level=moderate` until clean or document accepted residual risk.
- Mitigation:
  - Enable Dependabot or GitHub security alerts.
  - Add a CI step for `npm audit --audit-level=high` or a scheduled security workflow.
- False positive notes: Some affected packages are build-time/dev-server related, but they still matter because this repo is built in CI and run locally.

## High Findings

### S2. Firestore Security Rules Are Not Versioned/Deployed With The App

- Rule ID: REACT-AUTHZ-001 / Firebase authorization posture
- Severity: High
- Location: `SETUP.md:39`, `SETUP.md:47-63`, `NEXT_STEPS.txt:36`, `NEXT_STEPS.txt:44-60`
- Evidence:
  - Setup docs instruct creating Firestore in test mode: `SETUP.md:39`, `NEXT_STEPS.txt:36`.
  - Suggested rules only cover `students`, `records`, and `payments`: `SETUP.md:55-63`.
  - The app also reads/writes `settings/theme` and `scheduleOverrides`, and nested student data such as workout plans, measurements, photos, and profile data.
- Impact: If Firestore remains in test mode, anyone with project access details could read/write sensitive student, payment, health, and workout data. If the provided rules are copied exactly, parts of the app may fail, which can push operators toward overly broad rules.
- Fix:
  - Add a versioned `firestore.rules` file to the repo. Done.
  - Include all used paths: `users/{userId}/settings/{doc}`, `users/{userId}/scheduleOverrides/{doc}`, `users/{userId}/students/{document=**}`, `users/{userId}/records/{doc}`, `users/{userId}/payments/{doc}`.
  - Deploy rules via Firebase CLI or a documented manual release checklist before/with production. Documented in `SETUP.md`; deployment itself must be done against the Firebase project.
- Mitigation:
  - Verify current Firebase Console rules immediately.
  - Avoid any rule like `allow read, write: if true`.
- False positive notes: Runtime rules are not visible in this repo; this finding is based on repository evidence and must be verified in Firebase Console.

### S3. Firebase Public Config Is In Client Code Without App Check Or Key Restrictions Documented

- Rule ID: REACT-CONFIG-001 / Firebase abuse protection
- Severity: High
- Location: `src/firebase.js:29-32`
- Evidence:
  - Firebase config is hard-coded in the browser bundle:
    - `apiKey`
    - `authDomain`
    - `projectId`
    - `storageBucket`
- Impact: Firebase web API keys are not secrets, but a malicious client can reuse them to target Auth/Firestore unless Security Rules, authorized domains, API restrictions, and App Check are correctly configured. This app stores sensitive personal, financial, health, and photo-link data.
- Fix:
  - Keep Firebase config public, but document that it is public and not secret.
  - Enable Firebase App Check for production.
  - Restrict API key usage in Google Cloud where possible.
  - Verify Firebase Auth authorized domains only include expected domains.
- Status:
  - Documented in `SETUP.md`.
  - Requires manual Firebase Console / Google Cloud configuration.
- Mitigation:
  - Monitor Auth/Firestore usage and quota spikes.
  - Use strict Firestore rules as the primary enforcement layer.
- False positive notes: The exposed API key itself is not a secret; the risk is abuse if backend controls are weak.

## Medium Findings

### S4. No CSP Or Security Headers Are Visible In The Static App

- Rule ID: REACT-CSP-001 / REACT-HEADERS-001
- Severity: Medium
- Location: `index.html:3-20`, `.github/workflows/deploy.yml:31-35`
- Evidence:
  - `index.html` has no `Content-Security-Policy` meta tag.
  - GitHub Pages deployment uploads static `dist` only; no edge header configuration is present in the repo.
- Impact: If an XSS bug is introduced later, lack of CSP reduces browser-side containment. Clickjacking and referrer controls are also not visible in repo-level config.
- Fix:
  - Prefer hosting behind an edge/CDN that can set headers:
    - `Content-Security-Policy`
    - `X-Content-Type-Options: nosniff`
    - `Referrer-Policy`
    - clickjacking protection via `frame-ancestors` or `X-Frame-Options`
  - If staying on GitHub Pages, add an early CSP meta tag as partial defense, understanding that meta CSP cannot enforce `frame-ancestors`. Done.
- Mitigation:
  - Continue avoiding raw HTML sinks.
  - Consider Trusted Types if richer content is added later.
- False positive notes: GitHub Pages may set some headers; verify with runtime response headers.

### S5. Progress Photo URLs Are User-Provided External URLs

- Rule ID: REACT-URL-001 / REACT-FILE-001
- Severity: Medium
- Location: `src/features/students/StudentsTab.jsx:541`, `src/features/students/StudentsTab.jsx:549-551`, `src/features/students/StudentsTab.jsx:669`
- Evidence:
  - Photo records store arbitrary URL strings for `frontUrl`, `sideUrl`, `backUrl`.
  - Render path uses `<img src={photo[field.key]}>`.
- Impact: External image URLs can be tracking beacons. Opening a student profile may disclose the trainer's IP, browser metadata, and page referrer to third-party hosts. If Firestore data is tampered with, the app may load unexpected URL schemes or very large assets.
- Fix:
  - Validate URLs before saving: only `https:` and optionally a short allowlist of trusted image/storage hosts.
  - Prefer Firebase Storage with per-user security rules instead of arbitrary external image URLs.
  - Add `referrerPolicy="no-referrer"` and `loading="lazy"` on `<img>`.
- Status:
  - HTTPS validation, lazy loading, and no-referrer rendering were added.
  - Firebase Storage remains the stronger future option for sensitive photos.
- Mitigation:
  - Warn users not to paste public image-hosting links for sensitive progress photos.
- False positive notes: React will not execute normal string text as HTML here; this is primarily privacy and URL-control risk.

### S6. Service Worker/PWA Needs An Explicit Sensitive-Data Caching Policy

- Rule ID: REACT-SW-001
- Severity: Medium
- Location: `vite.config.js:9-12`
- Evidence:
  - PWA is enabled via `VitePWA`.
  - No explicit `runtimeCaching` is configured, which likely means static assets only, but that assumption is not documented.
- Impact: Service workers are powerful. If future runtime caching is added carelessly, sensitive Firestore/API responses or user-specific content could persist across sessions/accounts.
- Fix:
  - Document that PWA caching must remain static-assets-only unless threat-modeled.
  - Add explicit Workbox runtime rules that avoid caching Firebase/Google API responses.
  - Consider disabling PWA in authenticated areas if offline support is not a product requirement.
- Status:
  - Explicit `runtimeCaching: []` was added to keep PWA runtime caching off.
- Mitigation:
  - Keep Firebase data persistence/caching behavior intentional and documented.
- False positive notes: Current config appears to precache generated assets, not Firestore data.

## Low Findings

### S7. Login And Password Reset Reveal Whether An Email Exists

- Rule ID: Authentication enumeration hygiene
- Severity: Low
- Location: `src/AuthContext.jsx:26`, `src/AuthContext.jsx:35`
- Evidence:
  - Login returns `Usuario nao encontrado`.
  - Password reset returns `Usuario nao encontrado`.
- Impact: Attackers can enumerate registered trainer emails. This is lower severity because Firebase rate limits some flows, but it is still avoidable.
- Fix:
  - Use generic messages:
    - Login: `E-mail ou senha incorretos.`
    - Reset: `Se este e-mail existir, enviaremos instrucoes.`
- Status:
  - Generic login, registration, and reset messages were added.
- Mitigation:
  - Keep Firebase throttling and monitor Auth abuse.
- False positive notes: Product support sometimes benefits from specific messages, but generic messages are safer.

### S8. `useLocalStorage` Exists And Should Never Store Secrets

- Rule ID: JS-STORAGE-001
- Severity: Low
- Location: `src/useLocalStorage.js:6`, `src/useLocalStorage.js:15`
- Evidence:
  - The helper reads/writes arbitrary values to `localStorage`.
  - It is currently unused.
- Impact: If reused later for auth/session/PII, data becomes readable by any future XSS or browser extension with page access.
- Fix:
  - Add a code comment warning not to store auth tokens, passwords, or sensitive student/financial/health data.
  - Prefer Firestore/Auth state for sensitive data.
- Status:
  - Warning comment added.
- Mitigation:
  - Leave it unused or remove it if not needed.
- False positive notes: No current active sensitive storage usage was found.

## Positive Findings

- No `dangerouslySetInnerHTML`, `innerHTML`, `document.write`, `eval`, `new Function`, or `postMessage` handlers were found in `src`.
- WhatsApp links use `encodeURIComponent` and `window.open` with `noopener,noreferrer` in `src/features/communication/CommunicationTab.jsx:12` and `src/features/schedule/AgendaTab.jsx:24`.
- CI uses `npm ci` in `.github/workflows/deploy.yml:24`, which is good for reproducible installs.
- No source maps were observed in the generated `dist/assets` listing during this review.

## Recommended Fix Order

1. In Firebase Console, publish the rules from `firestore.rules`.
2. Enable Firebase App Check and verify API/Auth domain restrictions.
3. Plan a tested dependency upgrade pass for Firebase, Vite, and PWA tooling to clear remaining audit findings.
4. Consider moving progress photos to Firebase Storage with user-scoped rules.
