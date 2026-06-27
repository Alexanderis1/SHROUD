# SHROUD

SHROUD is a privacy-focused, client-side message encryption app. The frontend lets a user
"shroud" (encrypt) and "unshroud" (decrypt) text with a passphrase. All cryptography runs in
the browser via the Web Crypto API (AES-256-GCM with PBKDF2 key derivation); no data leaves
the device and there is no backend yet.

## Cursor Cloud specific instructions

- The frontend lives in `frontend/` (Vite + React 19 + TypeScript). Run all frontend commands
  from that directory (or with `npm --prefix frontend ...`).
- Standard commands are in `frontend/package.json`: `npm run dev` (Vite dev server on
  `http://localhost:5173`), `npm run build` (`tsc -b` type-check + Vite production build),
  `npm run lint` (oxlint), `npm run preview`.
- Linting uses **oxlint** (config: `frontend/.oxlintrc.json`), not ESLint.
- Crypto requires a secure context. `localhost` counts as secure, so `crypto.subtle` works on
  the dev server. If you serve the app from a non-localhost host over plain HTTP,
  `crypto.subtle` will be `undefined` and shroud/unshroud will fail.
- TypeScript 6 enforces `ArrayBuffer`-backed typed arrays for Web Crypto calls; allocate byte
  arrays with `new Uint8Array(n)` (not `SharedArrayBuffer`) when passing them to `crypto.subtle`.
