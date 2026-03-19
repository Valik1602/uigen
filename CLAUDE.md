# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Initial setup (install deps + generate Prisma client + run migrations)
npm run setup

# Development server (with Turbopack)
npm run dev

# Build
npm run build

# Lint
npm run lint

# Run all tests
npm test

# Run a single test file
npx vitest run src/components/chat/__tests__/ChatInterface.test.tsx

# Reset database
npm run db:reset

# Run Prisma migrations after schema changes
npx prisma migrate dev
```

## Environment

Copy `.env` and set `ANTHROPIC_API_KEY`. Without it, the app uses `MockLanguageModel` in `src/lib/provider.ts` which returns static pre-canned components.

The live model is `claude-haiku-4-5` (configured in `src/lib/provider.ts`).

## Architecture

UIGen is a Next.js 15 (App Router) application where users chat with Claude to generate React components that are previewed live in an iframe.

### Data Flow

1. **User sends message** → `ChatContext` (wraps Vercel AI SDK `useChat`) → `POST /api/chat`
2. **API route** reconstructs `VirtualFileSystem` from serialized state, calls `streamText` with two tools
3. **AI uses tools** to create/edit files; tool calls are streamed back to the client
4. **`FileSystemContext`** intercepts tool calls via `onToolCall` callback and applies them to the in-memory `VirtualFileSystem`
5. **`PreviewFrame`** watches `refreshTrigger` from `FileSystemContext`, transforms JSX files via Babel (in-browser), creates blob URLs, and renders the result in an `<iframe srcdoc>`
6. On finish, if authenticated + `projectId` exists, the API route persists messages + serialized FS to SQLite via Prisma

### Key Abstractions

**`VirtualFileSystem`** (`src/lib/file-system.ts`) — In-memory tree of `FileNode` objects. All file operations happen here; nothing is written to disk. Supports `serialize()`/`deserializeFromNodes()` for API round-trips and DB persistence.

**AI Tools** (server-side, `src/lib/tools/`):
- `str_replace_editor` — create/str_replace/insert/view file operations
- `file_manager` — rename/delete operations

**JSX Transformer** (`src/lib/transform/jsx-transformer.ts`) — Runs entirely in the browser. Uses `@babel/standalone` to transpile JSX/TSX, builds an ES module import map (with blob URLs for local files, `https://esm.sh/` for third-party packages), and generates the full preview HTML with Tailwind CDN.

**System Prompt** (`src/lib/prompts/generation.tsx`) — Instructs Claude to always create `/App.jsx` as root, use `@/` alias for local imports, and style with Tailwind CSS only.

### Contexts

- **`FileSystemProvider`** — owns the `VirtualFileSystem` instance; exposes file CRUD and `handleToolCall` which maps AI tool calls to FS operations
- **`ChatProvider`** — wraps Vercel AI SDK `useChat`; depends on `FileSystemProvider` (consumes `handleToolCall` and `fileSystem.serialize()` for the request body)

Both providers are composed in the page components. `ChatProvider` must always be nested inside `FileSystemProvider`.

### Auth

Custom JWT auth (`src/lib/auth.ts`) using `jose`. Sessions stored in httpOnly cookies. Passwords hashed with `bcrypt`. No third-party auth library. Anonymous users can work freely; their session data (messages + FS) is tracked in `sessionStorage` via `src/lib/anon-work-tracker.ts` and can be migrated to an account on sign-up.

### Database

Prisma + SQLite (`prisma/dev.db`). Two models: `User` and `Project`. A `Project` stores `messages` (JSON string) and `data` (serialized `VirtualFileSystem` JSON string). `userId` is optional to support anonymous project creation.

### Path Aliases

`@/` maps to `src/` (TypeScript paths). The same alias is also injected into the browser import map so generated components can use `@/components/Foo` imports.

### UI Components

Shadcn/ui components live in `src/components/ui/`. Custom components are in `src/components/chat/`, `src/components/editor/`, `src/components/preview/`, and `src/components/auth/`.
