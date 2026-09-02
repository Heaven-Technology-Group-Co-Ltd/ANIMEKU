# ANIMEKU

> Modern anime streaming platform built and maintained by **Heaven Technology Group Co., Ltd.**

[![CI](https://github.com/Heaven-Technology-Group/ANIMEKU/actions/workflows/ci.yml/badge.svg)](https://github.com/Heaven-Technology-Group/ANIMEKU/actions/workflows/ci.yml)
[![Next.js](https://img.shields.io/badge/Next.js-16.x-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.x-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-4.x-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)

---

## About

**ANIMEKU** is an anime-focused web platform designed to provide a modern, fast, and scalable viewing experience.

The project is developed under:

**Heaven Technology Group Co., Ltd.**
└── **Heaven Technologies** *(engineering division)*
&emsp;└── **ANIMEKU**

The repository follows a professional Git-based workflow with a protected `main` branch, pull requests, code review, and automated CI validation.

## Key Features

- Modern anime discovery and search experience
- Anime detail pages with structured metadata
- Episode / watch pages
- Trailer playback
- Caption and subtitle tooling
- Category-based browsing
- AniList-powered live search integration
- SEO-friendly metadata and sitemap generation
- Responsive UI for desktop and mobile
- Automated lint and production build checks through GitHub Actions

## Tech Stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js 16 |
| UI | React 19 |
| Language | TypeScript |
| Styling | Tailwind CSS 4 |
| Components | shadcn/ui |
| Data | Local data + AniList integration |
| Validation | ESLint |
| CI | GitHub Actions |
| Package Manager | npm |

## Project Structure

```text
ANIMEKU/
├── .github/
│   └── workflows/
│       └── ci.yml
├── docs/
├── public/
├── src/
│   ├── app/
│   │   ├── admin/
│   │   ├── api/
│   │   ├── anime/
│   │   ├── category/
│   │   ├── search/
│   │   └── watch/
│   ├── components/
│   └── lib/
├── package.json
├── package-lock.json
├── next.config.ts
├── tsconfig.json
└── eslint.config.mjs
```

## Getting Started

### Requirements

- Node.js 22+
- npm

### Installation

```bash
git clone https://github.com/Heaven-Technology-Group/ANIMEKU.git
cd ANIMEKU
npm ci
```

### Environment Variables

Create a local `.env` file for any environment-specific configuration required by the project.

> **Never commit secrets, API keys, or private credentials to Git.**

### Development

```bash
npm run dev
```

Then open:

```text
http://localhost:3000
```

## Quality Checks

Before opening a pull request, run:

```bash
npm run lint
npm run build
```

Both checks must pass before code is considered ready for merge. The repository also runs these checks automatically through GitHub Actions on pushes to `main` and on pull requests targeting `main`.

## Git Workflow

The project uses a pull-request-first workflow.

```text
feature / fix branch
        │
        ▼
      Pull Request
        │
        ├── Code Review
        ├── CI: Lint
        └── CI: Build
        │
        ▼
       main
```

### Branch Guidelines

Use descriptive branch names:

```text
feature/<name>
fix/<name>
chore/<name>
refactor/<name>
docs/<name>
```

Examples:

```text
feature/anilist-search
fix/player-caption-sync
chore/setup-ci
```

### Main Branch Protection

The `main` branch is protected. Changes should go through a pull request and required review rather than direct pushes.

## Continuous Integration

GitHub Actions validates the project with:

```text
Checkout
   ↓
Setup Node.js
   ↓
npm ci
   ↓
npm run lint
   ↓
npm run build
```

A pull request should only be merged after the required checks have passed.

## Repository

**GitHub:**
https://github.com/Heaven-Technology-Group/ANIMEKU

## Organization

**Heaven Technology Group Co., Ltd.**
Division: **Heaven Technologies**

The project is maintained as part of the group's software engineering and product development initiatives.

## Documentation

Project documentation is maintained in:

```text
/docs
```

Use the documentation in that directory as the source of truth for architecture, design system, development standards, and project planning.

## Development Principles

ANIMEKU aims to follow these principles:

- Keep the codebase maintainable and type-safe
- Prefer small, reviewable pull requests
- Preserve a consistent design system
- Validate changes with automated CI
- Avoid unnecessary changes outside the scope of a task
- Treat documentation and project conventions as part of the product

## License

This project does not currently declare a public open-source license.

Unless a separate license is provided, the repository and its contents should be treated as **all rights reserved** by **Heaven Technology Group Co., Ltd.**

---

**ANIMEKU**
A project by **Heaven Technology Group Co., Ltd.**
