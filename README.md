# Setlist to Playlist

A PWA that imports a setlist from [setlist.fm](https://www.setlist.fm) (by URL or setlist ID) and creates an **Apple Music** playlist in your account.

> **About this project**  
> This is my first repository built **entirely with AI-assisted development** (Cursor, Codex, Kilo Code). From structure and docs to implementation and tests—all created with AI support. The approach follows the methodology documented in [Harness Engineering](https://openai.com/index/harness-engineering/).

## Quick Start

```bash
pnpm install
pnpm build
pnpm dev
```

Then open the web app (default: `http://localhost:3000`). For local development you need:

- `.env` in the repo root (see `.env.example` for required variables)
- Apple Developer credentials (Team ID, Key ID, private key) for the Developer Token
- Optional: setlist.fm API key for the proxy (or use client-side fetch with key in env)

## Monorepo Overview

| Path | Description |
|------|-------------|
| `apps/web` | Next.js PWA – Import → Preview → Matching → Export |
| `apps/api` | Serverless/API – Apple Developer Token (JWT), optional setlist.fm proxy |
| `packages/core` | Domain logic: setlist parsing, track matching, normalization (no UI) |
| `packages/shared` | Shared types, utils, constants |
| `packages/ui` | Optional design system (placeholder) |
| `docs/` | Product specs, design docs, tech docs, ADR, exec plans |

See [ARCHITECTURE.md](ARCHITECTURE.md) for flows and [CONTRIBUTING.md](CONTRIBUTING.md) for how to contribute.

## Project structure

```
.
├── README.md
├── AGENTS.md
├── ARCHITECTURE.md
├── CONTRIBUTING.md
├── CHANGELOG.md
├── LICENSE
├── SECURITY.md
├── PRIVACY.md
├── TERMS.md
├── .env.example
├── .gitignore
├── .editorconfig
├── .prettierrc
├── eslint.config.mjs
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
├── apps/
│   ├── web/                 # Next.js PWA
│   │   ├── src/
│   │   │   ├── app/
│   │   │   ├── components/
│   │   │   ├── features/
│   │   │   │   ├── setlist-import/
│   │   │   │   ├── matching/
│   │   │   │   └── playlist-export/
│   │   │   ├── lib/
│   │   │   ├── styles/
│   │   │   └── types/
│   │   ├── public/
│   │   │   ├── manifest.webmanifest
│   │   │   └── icons/
│   │   ├── tests/
│   │   ├── e2e/
│   │   └── package.json
│   └── api/                 # Serverless/API
│       ├── src/
│       │   ├── routes/
│       │   │   ├── apple/
│       │   │   │   └── dev-token.ts
│       │   │   ├── setlist/
│       │   │   │   └── proxy.ts
│       │   │   └── health.ts
│       │   ├── middleware/
│       │   └── lib/
│       ├── tests/
│       └── package.json
├── packages/
│   ├── core/                # Domain logic
│   │   ├── src/
│   │   │   ├── setlist/
│   │   │   ├── matching/
│   │   │   ├── apple/
│   │   │   └── index.ts
│   │   └── tests/
│   ├── shared/
│   │   ├── src/
│   │   │   ├── types/
│   │   │   ├── utils/
│   │   │   └── index.ts
│   │   └── tests/
│   └── ui/                  # Design system (optional)
│       └── src/
├── docs/
│   ├── index.md
│   ├── product-specs/
│   ├── design-docs/
│   ├── tech/
│   ├── adr/
│   ├── exec-plans/
│   │   ├── active/
│   │   └── completed/
│   ├── generated/
│   └── references/
├── infra/
│   ├── deploy/
│   ├── nginx/
│   └── terraform/
└── scripts/
    ├── seed-demo-setlists.ts
    └── export-diagnostics.ts
```
