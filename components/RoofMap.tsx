"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import * as L from "leaflet";
import "@geoman-io/leaflet-geoman-free";
import "leaflet/dist/leaflet.css";
import "@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css";
import { Search, Loader2 } from "lucide-react";
import type { Feature, Polygon } from "geojson";

export interface RoofMapApi {
  /** Programmatically remove an obstruction layer from the map. */
  removeObstruction: (id: string) => void;
}

interface RoofMapProps {
  onRoofChange: (polygon: Feature<Polygon> | null) => void;
  /** A roof supplied from outside (instant demo): replaces any drawn shape. */
  externalRoof?: Feature<Polygon> | null;
  /** While true, the next drawn polygon is an obstruction, not the roof. */
  obstructionMode?: boolean;
  onObstructionAdd?: (id: string, polygon: Feature<Polygon>) => void;
  onObstructionEdit?: (id: string, polygon: Feature<Polygon>) => void;
  onObstructionRemove?: (id: string) => void;
  apiRef?: React.MutableRefObject<RoofMapApi | null>;
}

interface SearchResult {
  lat: number;
  lng: number;
  label: string;
}

type MetaLayer = L.Layer & { _kind?: "roof" | "obstruction"; _obsId?: string };

// Default view: central New Delhi at building-level zoom so the satellite
// imagery is immediately useful before the user searches for their address.
const DEFAULT_CENTER: [number, number] = [28.6139, 77.209];
const DEFAULT_ZOOM = 18;

const ROOF_STYLE = {
  color: "#f59e0b",
  fillColor: "#f59e0b",
  fillOpacity: 0.25,
  weight: 2,
};

const OBSTRUCTION_STYLE = {
  color: "#f43f5e",
  fillColor: "#f43f5e",
  fillOpacity: 0.25,
  weight: 2,
  dashArray: "6 4",
};

// Esri's keyless reference layers, designed to overlay World Imagery:
// street/road names + place labels — the "Hybrid" in every maps app.
const ESRI_IMAGERY =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const ESRI_TRANSPORT =
  "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}";
const ESRI_PLACES =
  "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}";

/** Free-text address search via OpenStreetMap Nominatim (keyless, India-scoped). */
function SearchBox({ onResult }: { onResult: (result: SearchResult) => void }) {
  const map = useMap();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);

  async function handleSearch(event: React.FormEvent) {
    event.preventDefault();
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setNotFound(false);
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=in&q=${encodeURIComponent(
        q
      )}`;
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      const results = (await res.json()) as {
        lat: string;
        lon: string;
        display_name?: string;
      }[];
      const first = results[0];
      if (first) {
        const lat = Number(first.lat);
        const lng = Number(first.lon);
        onResult({ lat, lng, label: first.display_name ?? q });
        map.flyTo([lat, lng], 18, { duration: 1.2 });
      } else {
        setNotFound(true);
      }
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="absolute left-3 top-3 z-[1000]">
      <form
        onSubmit={handleSearch}
        className="flex items-center gap-1 rounded-lg bg-white/95 p-1 shadow-lg backdrop-blur"
      >
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setNotFound(false);
          }}
          placeholder="Search your address…"
          className="w-56 rounded-md bg-transparent px-2 py-1.5 text-sm text-slate-900 outline-none placeholder:text-slate-400"
        />
        <button
          type="submit"
          disabled={loading}
          aria-label="Search"
          className="rounded-md bg-amber-500 p-1.5 text-white transition hover:bg-amber-600 disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
        </button>
      </form>
      {notFound && (
        <p className="mt-1 rounded-md bg-slate-900/90 px-2.5 py-1.5 text-xs text-amber-300 shadow">
          No match — try adding the city or PIN code.
        </p>
      )}
    </div>
  );
}

/** Hybrid (satellite + labels) ⇄ pure satellite toggle. */
function LayerToggle({
  showLabels,
  onChange,
}: {
  showLabels: boolean;
  onChange: (value: boolean) => void;
}) {
  const base = "px-3 py-1.5 text-xs font-medium transition";
  const active = "bg-amber-500 text-white";
  const idle = "bg-transparent text-slate-700 hover:bg-slate-200";
  return (
    <div className="absolute left-3 top-14 z-[1000] flex overflow-hidden rounded-lg bg-white/95 shadow-lg backdrop-blur">
      <button
        type="button"
        onClick={() => onChange(true)}
        className={`${base} ${showLabels ? active : idle}`}
      >
        Hybrid
      </button>
      <button
        type="button"
        onClick={() => onChange(false)}
        className={`${base} ${!showLabels ? active : idle}`}
      >
        Satellite
      </button>
    </div>
  );
}

/**
 * Wires up Geoman drawing for the roof and obstructions, renders externally
 * supplied roofs, and reports all shapes upward.
 */
function DrawControls({
  onRoofChange,
  externalRoof,
  obstructionMode = false,
  onObstructionAdd,
  onObstructionEdit,
  onObstructionRemove,
  apiRef,
}: RoofMapProps) {
  const map = useMap();
  const externalLayerRef = useRef<L.GeoJSON | null>(null);
  const obstructionLayers = useRef(new Map<string, L.Layer>());
  const idCounter = useRef(0);

  // Keep latest values in refs so the main effect subscribes exactly once.
  const modeRef = useRef(obstructionMode);
  modeRef.current = obstructionMode;
  const callbacksRef = useRef({ onObstructionAdd, onObstructionEdit, onObstructionRemove });
  callbacksRef.current = { onObstructionAdd, onObstructionEdit, onObstructionRemove };

  useEffect(() => {
    map.pm.addControls({
      position: "topright",
      drawPolygon: true,
      drawRectangle: true,
      editMode: true,
      removalMode: true,
      drawMarker: false,
      drawCircleMarker: false,
      drawPolyline: false,
      drawCircle: false,
      drawText: false,
      cutPolygon: false,
      rotateMode: false,
      dragMode: false,
    });
    map.pm.setPathOptions(ROOF_STYLE);

    const toFeature = (layer: L.Layer): Feature<Polygon> =>
      (layer as unknown as { toGeoJSON: () => Feature<Polygon> }).toGeoJSON();

    const clearRoofLayers = (except?: L.Layer) => {
      for (const layer of map.pm.getGeomanLayers() as MetaLayer[]) {
        if (layer._kind !== "obstruction" && layer !== except) map.removeLayer(layer);
      }
      if (externalLayerRef.current && externalLayerRef.current !== except) {
        map.removeLayer(externalLayerRef.current);
        externalLayerRef.current = null;
      }
    };

    const handleCreate = (event: { layer: L.Layer }) => {
      const layer = event.layer as MetaLayer;

      if (modeRef.current) {
        // ── Obstruction ────────────────────────────────────────────────
        const id = `obs-${++idCounter.current}`;
        layer._kind = "obstruction";
        layer._obsId = id;
        (layer as unknown as L.Path).setStyle?.(OBSTRUCTION_STYLE);
        obstructionLayers.current.set(id, layer);
        layer.on("pm:edit", () =>
          callbacksRef.current.onObstructionEdit?.(id, toFeature(layer))
        );
        callbacksRef.current.onObstructionAdd?.(id, toFeature(layer));
        return;
      }

      // ── Roof (one at a time) ──────────────────────────────────────────
      layer._kind = "roof";
      clearRoofLayers(layer);
      onRoofChange(toFeature(layer));
      layer.on("pm:edit", () => onRoofChange(toFeature(layer)));
    };

    const handleRemove = (event: { layer: L.Layer }) => {
      const layer = event.layer as MetaLayer;
      if (layer._kind === "obstruction" && layer._obsId) {
        obstructionLayers.current.delete(layer._obsId);
        callbacksRef.current.onObstructionRemove?.(layer._obsId);
        return;
      }
      const roofsLeft = (map.pm.getGeomanLayers() as MetaLayer[]).filter(
        (l) => l._kind !== "obstruction"
      );
      if (roofsLeft.length === 0) onRoofChange(null);
    };

    map.on("pm:create", handleCreate as unknown as L.LeafletEventHandlerFn);
    map.on("pm:remove", handleRemove as unknown as L.LeafletEventHandlerFn);

    return () => {
      map.off("pm:create", handleCreate as unknown as L.LeafletEventHandlerFn);
      map.off("pm:remove", handleRemove as unknown as L.LeafletEventHandlerFn);
      map.pm.removeControls();
    };
  }, [map, onRoofChange]);

  // Obstruction mode: switch draw style and auto-start polygon drawing.
  useEffect(() => {
    if (obstructionMode) {
      map.pm.setPathOptions(OBSTRUCTION_STYLE);
      map.pm.enableDraw("Polygon");
    } else {
      map.pm.disableDraw();
      map.pm.setPathOptions(ROOF_STYLE);
    }
  }, [obstructionMode, map]);

  // Expose programmatic removal (for the sidebar's per-row delete button).
  useEffect(() => {
    if (!apiRef) return;
    apiRef.current = {
      removeObstruction: (id: string) => {
        const layer = obstructionLayers.current.get(id);
        if (layer) {
          map.removeLayer(layer);
          obstructionLayers.current.delete(id);
        }
      },
    };
    return () => {
      apiRef.current = null;
    };
  }, [apiRef, map]);

  // Render an externally supplied roof (instant demo) and fly to it.
  useEffect(() => {
    if (!externalRoof) return;

    for (const layer of map.pm.getGeomanLayers() as MetaLayer[]) {
      if (layer._kind !== "obstruction") map.removeLayer(layer);
    }
    if (externalLayerRef.current) {
      map.removeLayer(externalLayerRef.current);
    }

    const layer = L.geoJSON(externalRoof, { style: ROOF_STYLE });
    layer.addTo(map);
    externalLayerRef.current = layer;

    // Keep the demo shape editable so users can tweak it like a drawn one.
    layer.eachLayer((child) => {
      (child as MetaLayer)._kind = "roof";
      child.on("pm:edit", () => {
        const feature = (child as unknown as {
          toGeoJSON: () => Feature<Polygon>;
        }).toGeoJSON();
        onRoofChange(feature);
      });
    });

    map.flyToBounds(layer.getBounds(), { maxZoom: 19, duration: 1.4 });
  }, [externalRoof, map, onRoofChange]);

  return null;
}

export function RoofMap(props: RoofMapProps) {
  const [showLabels, setShowLabels] = useState(true);
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);

  // Amber map pin as a divIcon — avoids Leaflet's bundler-broken default
  // marker images entirely.
  const pinIcon = useMemo(
    () =>
      L.divIcon({
        className: "",
        html: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="#f59e0b" stroke="#0f172a" stroke-width="1"><path d="M20 10c0 6-8 13-8 13S4 16 4 10a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3" fill="#0f172a" stroke="none"/></svg>`,
        iconSize: [32, 32],
        iconAnchor: [16, 30],
        popupAnchor: [0, -28],
      }),
    []
  );

  return (
    <MapContainer
      center={DEFAULT_CENTER}
      zoom={DEFAULT_ZOOM}
      maxZoom={21}
      className="h-full w-full"
      scrollWheelZoom
    >
      <TileLayer
        url={ESRI_IMAGERY}
        attribution="Tiles &copy; Esri — Source: Esri, Maxar, Earthstar Geographics"
        maxNativeZoom={19}
        maxZoom={21}
      />
      {showLabels && (
        <>
          {/* Street & road names */}
          <TileLayer url={ESRI_TRANSPORT} maxNativeZoom={18} maxZoom={21} zIndex={5} />
          {/* Place / locality labels */}
          <TileLayer url={ESRI_PLACES} maxNativeZoom={18} maxZoom={21} zIndex={6} />
        </>
      )}

      {searchResult && (
        <Marker
          position={[searchResult.lat, searchResult.lng]}
          icon={pinIcon}
          eventHandlers={{
            add: (event) => (event.target as L.Marker).openPopup(),
          }}
        >
          <Popup>
            <span className="text-xs">{searchResult.label}</span>
          </Popup>
        </Marker>
      )}

      <SearchBox onResult={setSearchResult} />
      <LayerToggle showLabels={showLabels} onChange={setShowLabels} />
      <DrawControls {...props} />
    </MapContainer>
  );
}
