# Frontend Workspace

## Commands

- `npm install`
- `npm run dev`
- `npm run build`
- `npm run check`
- `npm run test:e2e`

## Current Runtime Model

- `src/` is the only frontend logic source.
- `index.html` is now a static shell plus `data-*` hooks only.
- Runtime interactions are delegated through `src/app/event-handler.ts`.
- `dist/` is a generated artifact only and must come from `npm run build`.
- The backend serves `frontend/dist` first. `legacy-index.html` is fallback only.

## Migration Notes

- `src/legacy/legacy-app.ts` is the compatibility bridge for the existing product behavior.
- New work should land in `src/features`, `src/pages`, and `src/shared`.
- `features/topics` is the first migrated domain and is the reference pattern for future extractions.

## Deployment Notes

- Do not manually edit `dist/`.
- Before deployment, run:
  - `npm run check`
  - `npm run build`
- After deployment, verify the served homepage contains `data-action="refreshData"` and does not contain `onclick=`.

## Legacy Notes

- `legacy-index.html` is still kept as backend fallback.
- Older single-file deployment assumptions are no longer valid for the main runtime path.
