import { useEffect, useRef, useState } from 'react'
import Map, { Marker } from 'react-map-gl/maplibre'
import maplibregl from 'maplibre-gl'
import { Protocol } from 'pmtiles'
import 'maplibre-gl/dist/maplibre-gl.css'
import rawStyle from './styles/map_style_darkviz_custom.json'

// ---------------------------------------------------------------------------
// PMTiles protocol — module-level, runs once
// ---------------------------------------------------------------------------
const _protocol = new Protocol()
maplibregl.addProtocol('pmtiles', _protocol.tile.bind(_protocol))
maplibregl.workerCount =
    typeof navigator !== 'undefined' ? (navigator.hardwareConcurrency || 4) : 4

// ---------------------------------------------------------------------------
// Patch style URLs at runtime
// ---------------------------------------------------------------------------
const MAP_STYLE = JSON.parse(
    JSON.stringify(rawStyle)
        .replace(/http:\/\/localhost:\d+(\/tiles|\/map)?/g, window.location.origin + '/map')
)

// ---------------------------------------------------------------------------
// Design tokens
// ---------------------------------------------------------------------------
const BLUE = '#4589ff'
const SANS = 'IBM Plex Sans, system-ui, sans-serif'
const MONO = 'IBM Plex Mono, monospace'

// ---------------------------------------------------------------------------
// Timing constants
// ---------------------------------------------------------------------------
const ZOOM_ARRIVAL  = 12.5   // zoom flyTo targets
const FLY_MS_MIN    = 10000  // minimum flight duration
const FLY_MS_MAX    = 15000  // maximum flight duration
const DWELL_MS      = 15000  // time at city before next flight
const LABEL_FADE    = 1500   // label fade duration (ms)
const BEACON_FADE   = 1500   // old beacon fade-out duration (ms) — slow and graceful

// ---------------------------------------------------------------------------
// Distance-proportional flight duration (Haversine)
// ---------------------------------------------------------------------------
function flyDuration([lng1, lat1], [lng2, lat2]) {
    const R    = 6371
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a    = Math.sin(dLat / 2) ** 2
               + Math.cos(lat1 * Math.PI / 180)
               * Math.cos(lat2 * Math.PI / 180)
               * Math.sin(dLng / 2) ** 2
    const km   = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return Math.round(FLY_MS_MIN + Math.min(km / 1000, 1) * (FLY_MS_MAX - FLY_MS_MIN))
}

// ---------------------------------------------------------------------------
// Cities
// ---------------------------------------------------------------------------
const UK_CITIES = [
    { id: 'Inverness',   country: 'Scotland',          coords: [-4.2247,  57.4778] },
    { id: 'Aberdeen',    country: 'Scotland',          coords: [-2.0943,  57.1497] },
    { id: 'Edinburgh',   country: 'Scotland',          coords: [-3.1883,  55.9533] },
    { id: 'Glasgow',     country: 'Scotland',          coords: [-4.2518,  55.8642] },
    { id: 'Belfast',     country: 'Northern Ireland',  coords: [-5.9301,  54.5973] },
    { id: 'Newcastle',   country: 'England',           coords: [-1.6178,  54.9783] },
    { id: 'Leeds',       country: 'England',           coords: [-1.5491,  53.8008] },
    { id: 'Manchester',  country: 'England',           coords: [-2.2426,  53.4808] },
    { id: 'Sheffield',   country: 'England',           coords: [-1.4701,  53.3811] },
    { id: 'Nottingham',  country: 'England',           coords: [-1.1581,  52.9548] },
    { id: 'Birmingham',  country: 'England',           coords: [-1.8904,  52.4862] },
    { id: 'Cambridge',   country: 'England',           coords: [ 0.1218,  52.2053] },
    { id: 'Oxford',      country: 'England',           coords: [-1.2577,  51.7520] },
    { id: 'Cardiff',     country: 'Wales',             coords: [-3.1791,  51.4816] },
    { id: 'Bristol',     country: 'England',           coords: [-2.5879,  51.4545] },
    { id: 'London',      country: 'England',           coords: [-0.1278,  51.5074] },
    { id: 'Brighton',    country: 'England',           coords: [-0.1372,  50.8225] },
    { id: 'Plymouth',    country: 'England',           coords: [-4.1427,  50.3755] },
]

function buildDistantSequence(cities) {
    const dist = (a, b) => {
        const dx = a.coords[0] - b.coords[0]
        const dy = a.coords[1] - b.coords[1]
        return Math.sqrt(dx * dx + dy * dy)
    }
    const remaining = [...cities]
    const seq = [remaining.splice(Math.floor(Math.random() * remaining.length), 1)[0]]
    while (remaining.length) {
        const last = seq[seq.length - 1]
        let fi = 0, fd = -1
        remaining.forEach((c, i) => { const d = dist(last, c); if (d > fd) { fd = d; fi = i } })
        seq.push(remaining.splice(fi, 1)[0])
    }
    return seq
}

const SEQUENCE = buildDistantSequence(UK_CITIES)

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const sleep = ms => new Promise(r => setTimeout(r, ms))
const BOOT  = { longitude: -2.5, latitude: 54.0, zoom: 6.0 }

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function MapLoop() {
    const mapRef   = useRef(null)
    const aliveRef = useRef(true)

    const [ready,      setReady     ] = useState(false)
    const [city,       setCity      ] = useState(null)   // current destination beacon
    const [prevCity,   setPrevCity  ] = useState(null)   // departing beacon, fading out
    const [fadePrev,   setFadePrev  ] = useState(false)  // triggers CSS fade on prevCity
    const [showLabel,  setShowLabel ] = useState(false)

    useEffect(() => {
        if (!ready) return
        aliveRef.current = true

        const run = async () => {
            const map = mapRef.current?.getMap()
            if (!map) return

            let lastCoords = [-2.5, 54.0]
            let lastCity   = null

            for (let i = 0; aliveRef.current; i = (i + 1) % SEQUENCE.length) {
                const target   = SEQUENCE[i]
                const duration = flyDuration(lastCoords, target.coords)

                // Hand off previous beacon to the fading layer, start new beacon
                if (lastCity) {
                    setPrevCity(lastCity)
                    setFadePrev(false)
                    // Next tick: trigger the CSS transition to opacity 0
                    requestAnimationFrame(() => requestAnimationFrame(() => setFadePrev(true)))
                }

                setCity(target)
                setShowLabel(false)

                // Single flyTo — one continuous move to arrival zoom
                map.flyTo({
                    center   : target.coords,
                    zoom     : ZOOM_ARRIVAL,
                    duration : duration,
                    essential: true,
                    easing   : t => t < 0.5
                        ? 4 * t * t * t
                        : 1 - Math.pow(-2 * t + 2, 3) / 2,
                })

                // Clear the old beacon after its fade completes (well within flight time)
                await sleep(BEACON_FADE + 100)
                if (!aliveRef.current) break
                setPrevCity(null)

                // Wait for the rest of the flight
                await sleep(duration - BEACON_FADE - 100)
                if (!aliveRef.current) break

                // Landed — show label and dwell
                setShowLabel(true)
                await sleep(DWELL_MS)
                if (!aliveRef.current) break

                // Fade label
                setShowLabel(false)
                await sleep(LABEL_FADE)
                if (!aliveRef.current) break

                lastCoords = target.coords
                lastCity   = target
            }
        }

        run()
        return () => { aliveRef.current = false }
    }, [ready])

    return (
        <div style={{ position: 'fixed', inset: 0, background: '#111', overflow: 'hidden', cursor: 'none' }}>
            <style>{`
                *, *::before, *::after { cursor: none !important; }
                html, body { overflow: hidden; scrollbar-width: none; }
                body::-webkit-scrollbar { display: none; }
                .maplibregl-canvas { outline: none !important; cursor: none !important; }
                .maplibregl-canvas-container { cursor: none !important; }
                .maplibregl-ctrl-bottom-left,
                .maplibregl-ctrl-bottom-right { display: none !important; }

                @keyframes beacon-ping {
                    0%   { transform: scale(1); opacity: 0.8; }
                    100% { transform: scale(6); opacity: 0;   }
                }
                .beacon-wrap {
                    position: relative; width: 10px; height: 10px; cursor: none;
                }
                .beacon-dot {
                    width: 10px; height: 10px;
                    background: ${BLUE};
                    border-radius: 50%;
                    box-shadow: 0 0 18px ${BLUE}, 0 0 6px ${BLUE};
                    position: absolute; top: 0; left: 0;
                }
                .beacon-ring {
                    position: absolute;
                    width: 10px; height: 10px;
                    border-radius: 50%;
                    border: 2px solid ${BLUE};
                    top: 0; left: 0;
                }
            `}</style>

            <Map
                ref={mapRef}
                initialViewState={BOOT}
                mapStyle={MAP_STYLE}
                style={{ width: '100%', height: '100%' }}
                interactive={false}
                attributionControl={false}
                maxTileCacheSize={2000}
                fadeDuration={0}
                transformRequest={url => ({ url, priority: 'high' })}
                onLoad={() => setReady(true)}
            >
                {/* Arriving / active beacon — always full opacity */}
                {city && (
                    <Marker longitude={city.coords[0]} latitude={city.coords[1]} anchor="center">
                        <div className="beacon-wrap">
                            <div className="beacon-ring" style={{ animation: 'beacon-ping 2.5s cubic-bezier(0,0,0.2,1) infinite 0ms' }} />
                            <div className="beacon-ring" style={{ animation: 'beacon-ping 2.5s cubic-bezier(0,0,0.2,1) infinite 1300ms' }} />
                            <div className="beacon-dot" />
                        </div>
                    </Marker>
                )}

                {/* Departing beacon — fades out while next flight is already underway */}
                {prevCity && (
                    <Marker longitude={prevCity.coords[0]} latitude={prevCity.coords[1]} anchor="center">
                        <div className="beacon-wrap" style={{
                            opacity   : fadePrev ? 0 : 1,
                            transition: `opacity ${BEACON_FADE}ms ease`,
                        }}>
                            <div className="beacon-ring" style={{ animation: 'beacon-ping 2.5s cubic-bezier(0,0,0.2,1) infinite 0ms' }} />
                            <div className="beacon-ring" style={{ animation: 'beacon-ping 2.5s cubic-bezier(0,0,0.2,1) infinite 1300ms' }} />
                            <div className="beacon-dot" />
                        </div>
                    </Marker>
                )}
            </Map>

            {/* City label — bottom right, only visible after landing */}
            <div style={{
                position     : 'fixed',
                bottom       : '4rem',
                right        : '4rem',
                zIndex       : 10,
                pointerEvents: 'none',
                opacity      : showLabel ? 1 : 0,
                transition   : `opacity ${LABEL_FADE}ms ease`,
                display      : 'flex',
                flexDirection: 'column',
                alignItems   : 'flex-end',
            }}>
                <span style={{
                    display      : 'inline-block',
                    color        : '#f4f4f4',
                    fontFamily   : SANS,
                    fontSize     : '2.052rem',
                    fontWeight   : 300,
                    letterSpacing: '0.15em',
                    textTransform: 'uppercase',
                    lineHeight   : 1,
                    marginRight  : '-0.15em',
                }}>
                    {city?.id}
                </span>
                <span style={{
                    display      : 'inline-block',
                    color        : '#8d8d8d',
                    fontFamily   : MONO,
                    fontSize     : '0.9595rem',
                    letterSpacing: '0.15em',
                    marginTop    : '0.25rem',
                    marginRight  : '-0.15em',
                }}>
                    {city?.country}
                </span>
            </div>
        </div>
    )
}