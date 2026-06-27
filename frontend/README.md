# SHROUD — Frontend

The web client for SHROUD, a privacy-focused message encryption tool. Everything runs in the
browser: messages are encrypted with **AES-256-GCM** using a key derived from your passphrase
via **PBKDF2**, all through the native Web Crypto API. No backend, no logs.

## Stack

- Vite + React 19 + TypeScript
- oxlint for linting
- Plain CSS design system (`src/index.css`)

## Scripts

```bash
npm install      # install dependencies
npm run dev      # start the dev server (http://localhost:5173)
npm run build    # type-check (tsc -b) + production build
npm run preview  # preview the production build
npm run lint     # run oxlint
```

## Layout

- `src/lib/crypto.ts` — Web Crypto encryption/decryption (`shroud` / `unshroud`)
- `src/components/ShroudConsole.tsx` — interactive encrypt/decrypt console
- `src/App.tsx` — landing page (hero, console, features)
- `src/index.css` — global styles / design system
