# map-demo

Standalone UK city flyover loop. No backend required — Vite serves the tiles directly.

## Setup

1. Install dependencies
   ```
   npm install
   ```

2. Copy your tile assets into `public/tiles/`:
   ```
   public/tiles/uk_optimized.pmtiles
   public/tiles/uki_mask.geojson
   ```

3. Copy your map style JSON into `src/styles/`:
   ```
   src/styles/map_style.json
   ```
   The component automatically patches `localhost:8000` → the current origin at
   runtime, so copy the file as-is without editing the URLs.

4. Run
   ```
   npm run dev
   ```

## Tweakable constants in MapLoop.jsx

| Constant       | Default | What it controls                                    |
|----------------|---------|-----------------------------------------------------|
| ZOOM_OVERVIEW  | 5.0     | Starting wide shot                                  |
| ZOOM_LAND      | 5.5     | Where flyTo deposits the camera                     |
| ZOOM_CLOSE     | 14.5    | Final close-up zoom after arrival                   |
| FLY_SPEED      | 0.55    | Flight speed (lower = slower)                       |
| FLY_CURVE      | 1.35    | Arc height during flight (higher = more pull-back)  |
| ZOOM_IN_MS     | 3800    | Duration of the close-in ease (ms)                  |
| DWELL_MS       | 9000    | Time spent at full zoom before leaving (ms)         |
| PULLBACK_MS    | 2200    | Duration of the pull-back ease before next flight   |
