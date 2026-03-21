# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Chinese calligraphy (书法) web application for creating couplets (春联), hanging scrolls (挂画), and plaques (牌匾). Users write characters by hand (touch/stylus on mobile), select brush styles and templates, then export as PNG/JPG.

**Tech Stack**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, Zustand (state + persistence), `perfect-freehand` (brush stroke rendering), pnpm

## Commands

```bash
pnpm dev      # Start development server
pnpm build    # Production build
pnpm start    # Start production server
pnpm lint     # Run ESLint
```

## Architecture

### Page Flow
`/` → `/input` → `/write` → `/style` → `/preview` → `/export`

Each page is a standalone route in `app/`. State flows through Zustand store (`stores/project-store.ts`).

### State Management (Zustand)

`useProjectStore` holds the entire project state with `persist` middleware:
- `categoryId`, `text` (CoupletText or plain string)
- `characters`: `CharacterStrokes[]` — each character with its `Stroke[]`
- `currentCharIndex` — which character is being written
- `styleId` (brush style), `templateId` (paper template)
- Draft auto-saves to localStorage

**Important**: Most components are `'use client'` and access the store directly.

### Drawing Pipeline

1. **WritingCanvas** (`components/write/WritingCanvas.tsx`) — triple-canvas system with RAF:
   - Bottom canvas (gridCanvas): grid lines (米字格), drawn once on mount/resize
   - Middle canvas (bgCanvas): completed strokes, updated when stroke ends (incremental merge)
   - Top canvas (fgCanvas): current active stroke, RAF-scheduled via `scheduleRedraw()` with `rafIdRef` dedup
   - Touch events captured natively (not React's onPointer*), converted to `Point[]`
   - Each stroke saved as `{ id, points, smoothedPath }`

2. **Brush Engine** (`lib/beautify/brush-engine.ts`) — uses `perfect-freehand`:
   - `getStroke()` converts touch points to polygon outline
   - Three styles: `natural`, `heavy_ink`, `flying_white`
   - Flying white applies `destination-out` composite for dry-brush gaps

3. **Composition** (`lib/composition/`):
   - `layout-engine.ts`: calculates `CharPosition[]` per category (couplet vertical columns, hanging vertical single column, plaque horizontal row)
   - `compositor.ts`: `composeArtwork()` renders strokes onto final canvas at correct scale; `composePreview()` scales down for preview

### Key Types (`types/index.ts`)

```typescript
Point { x, y, t, pressure? }
Stroke { id, points: Point[], smoothedPath: BezierPath[] }
CharacterStrokes { charId, character, strokes: Stroke[] }
CategoryId = 'couplet' | 'hanging' | 'plaque'
BrushStyle { id, name, smoothing, widthRange, opacity, textureType }
CoupletText { upper, lower, banner? }
```

### Template & Style Data

- `data/categories.ts` — three categories with `maxChars`
- `data/templates.ts` — six templates (2 per category) with `bgColor`, `borderStyle`, `textColor`
- `lib/beautify/styles.ts` — three `BRUSH_STYLES`

### CSS Theme (`app/globals.css`)

Uses Tailwind CSS v4 with `@theme inline` custom colors:
- `--color-ink`, `--color-paper`, `--color-paper-dark`, `--color-seal`, `--color-gold`, `--color-bamboo`

## Code Conventions

- All route pages are `'use client'`
- `@/*` path alias maps to project root
- Canvas rendering uses device pixel ratio (DPR) scaling for crisp strokes on high-DPI screens
- Store actions that depend on other store values use `get()` to avoid stale closures
