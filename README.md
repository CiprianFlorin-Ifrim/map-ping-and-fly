# Map Ping and Fly

Standalone UK city flyover loop. No backend required - Vite serves the map tiles directly.

## Screenshots

<img width="1564" height="1307" alt="high_level" src="https://github.com/user-attachments/assets/a3b49663-043d-4928-8337-bef398a4c953" />
<img width="1564" height="1307" alt="london" src="https://github.com/user-attachments/assets/07ac87bc-a553-4738-a0f6-a7b2531287f9" />
<img width="1564" height="1307" alt="belfast" src="https://github.com/user-attachments/assets/9370f635-b23c-4548-856d-5c9281fe3340" />


## Recordings
#### Demo Fast Flyover
https://github.com/user-attachments/assets/87a6cf2e-3d44-42b5-b074-b11fde350ef3

#### Demo Slow Flyover
https://github.com/user-attachments/assets/e15ae6ec-7db6-454d-b076-54756a997505

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
