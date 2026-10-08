# YouTube HighlightFlow — Vue 3 + Vite + TypeScript

Light-mode Clip Review Console for the existing [youtube-highlight-api](https://github.com/raksit17/youtube-highlight-api) NestJS service.

## Run (Windows CMD or PowerShell)

```bash
npm install
npm run dev
```

Open `http://localhost:5173`.

By default (without `.env`) the app runs in Demo Mode. Copy `.env.example` to `.env` to customize; the example sets `VITE_DEMO_MODE=true`, with **synthetic** candidates/chat/heatmap for an actual YouTube demo video. Demo review states and clip drafts are stored in browser `localStorage`; they are not written to PostgreSQL.

## Production API mode

Set:

```env
VITE_DEMO_MODE=false
VITE_API_URL=http://localhost:3001/api/v1
```

Restart Vite after modifying `.env`. The NestJS service must implement the API routes below and allow requests from `http://localhost:5173` using CORS (or proxy through the same origin).

### Expected API routes

- `GET /videos?limit=50` -> `{ items: Video[] }`
- `GET /videos/:id` -> `Video`
- `GET /videos/:id/candidates?sort=score_desc&limit=5` -> `{ items: Candidate[] }` including `clipPresets`
- `GET /videos/:id/heatmap?bucketMs=15000` -> `Heatmap`
- `GET /candidates/:id/context?beforeMs=20000&afterMs=20000&chatLimit=100` -> `{ candidateId, peakMs, chats, transcripts, chatTotal, truncated }`
- `PATCH /candidates/:id/review` -> updated `Candidate`
- `POST /videos/:id/clips` with `{ candidateId, preset }` -> created `ClipDraft`
- `GET /videos/:id/clips` -> `{ items: ClipDraft[] }`
- `GET /clips/:id` -> `ClipDraft`
- `PATCH /clips/:id` -> `ClipDraft` (custom Start/End/Title/Note/Status)
- `GET /clips/:id/export` -> clip export JSON

These routes are implemented in the GitHub backend as checked on 2026-10-08 (master branch). The frontend requires the matching Prisma migrations to be applied and the NestJS API to be running.

### UI behavior

- Streams library: videos, moment count, review progress.
- Review page: YouTube IFrame video player, hot moment cards, density previews, chat heat timeline, context, approve/reject and auto-next.
- Keyboard: Space play/pause, Up/Down previous/next moment, J/L -5/+5s, A approve, R rejection menu, C clip.
- Top 5 Moments × 4 presets: QUICK (30 sec), CONTEXT (60 sec), STANDARD (3 min, default), LONG (6 min).
- Preview uses the backend-provided range; the selected preset is remembered in the browser.
- Clip click creates a persistent draft, and the editor PATCHes only the draft, not the source variants.
- Clip editor: start/end timestamp editing, set to playback time, save, mark READY, export backend JSON; changing presets creates a new separate draft.
- Re-analyze button is intentionally disabled until Backend offers a safe, async reanalysis endpoint that preserves review state.

### Notes

- Time fields are **milliseconds** throughout API payloads; YouTube player uses **seconds**.
- Youtube embeds require network access and allow-embedding permissions from YouTube.
- Mock stats in demo are unrelated to the demo video and must not be treated as real analysis.
- The current MVP has no sign-in; protect review writes with authentication/authorization before production multi-user deployment.
- Vite is a client-side SPA; configure your web server to serve `index.html` for deep links (`/videos/...`).

## File structure

```text
src/
  components/{YouTubePlayer,MomentCard,HeatTimeline,ContextPanel}.vue
  services/{api,demo}.ts
  stores/review.ts
  views/{StreamsView,ReviewView,ClipView,AnalyticsView}.vue
  router/index.ts
  types/domain.ts
  utils/time.ts
  App.vue
  main.ts
  style.css
```

## Check

```bash
npm run typecheck
npm run build
```
