"use client";

import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import * as L from "leaflet";
import "@geoman-io/leaflet-geoman-free";
import "leaflet/dist/leaflet.css";
import "@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css";
import { Search } from "lucide-react";
import type { Feature, Polygon } from "geojson";

interface RoofMapProps {
  onRoofChange: (polygon: Feature<Polygon> | null) => void;
  /**
   * A roof supplied from outside the map (e.g. the instant demo). When it
   * changes (by reference), the map replaces any drawn shape with it, renders
   * it as an editable layer, and flies to it.
   */
  externalRoof?: Feature<Polygon> | null;
}

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

/** Free-text address search via OpenStreetMap Nominatim (keyless, India-scoped). */
function SearchBox() {
  const map = useMap();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSearch(event: React.FormEvent) {
    event.preventDefault();
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=in&q=${encodeURIComponent(
        q
      )}`;
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      const results = (await res.json()) as { lat: string; lon: string }[];
      const first = results[0];
      if (first) {
        map.flyTo([Number(first.lat), Number(first.lon)], 19, { duration: 1.2 });
      }
    } catch {
      /* geocoding is best-effort */
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSearch}
      className="absolute left-3 top-3 z-[1000] flex items-center gap-1 rounded-lg bg-white/95 p-1 shadow-lg backdrop-blur"
    >
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search your address…"
        className="w-56 rounded-md bg-transparent px-2 py-1.5 text-sm text-slate-900 outline-none placeholder:text-slate-400"
      />
      <button
        type="submit"
        disabled={loading}
        aria-label="Search"
        className="rounded-md bg-amber-500 p-1.5 text-white transition hover:bg-amber-600 disabled:opacity-50"
      >
        <Search className="h-4 w-4" />
      </button>
    </form>
  );
}

/**
 * Wires up Geoman polygon drawing, renders externally supplied roofs, and
 * reports the active roof upward.
 */
function DrawControls({ onRoofChange, externalRoof }: RoofMapProps) {
  const map = useMap();
  const externalLayerRef = useRef<L.GeoJSON | null>(null);

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

    const emit = (layer: L.Layer) => {
      const feature = (layer as unknown as {
        toGeoJSON: () => Feature<Polygon>;
      }).toGeoJSON();
      onRoofChange(feature);
    };

    const handleCreate = (event: { layer: L.Layer }) => {
      // Keep only the most recent shape — one roof at a time.
      for (const layer of map.pm.getGeomanLayers() as L.Layer[]) {
        if (layer !== event.layer) map.removeLayer(layer);
      }
      if (externalLayerRef.current) {
        map.removeLayer(externalLayerRef.current);
        externalLayerRef.current = null;
      }
      emit(event.layer);
      event.layer.on("pm:edit", () => emit(event.layer));
    };

    const handleRemove = () => {
      if ((map.pm.getGeomanLayers() as L.Layer[]).length === 0) {
        onRoofChange(null);
      }
    };

    map.on("pm:create", handleCreate as unknown as L.LeafletEventHandlerFn);
    map.on("pm:remove", handleRemove);

    return () => {
      map.off("pm:create", handleCreate as unknown as L.LeafletEventHandlerFn);
      map.off("pm:remove", handleRemove);
      map.pm.removeControls();
    };
  }, [map, onRoofChange]);

  // Render an externally supplied roof (instant demo) and fly to it.
  useEffect(() => {
    if (!externalRoof) return;

    for (const layer of map.pm.getGeomanLayers() as L.Layer[]) {
      map.removeLayer(layer);
    }
    if (externalLayerRef.current) {
      map.removeLayer(externalLayerRef.current);
    }

    const layer = L.geoJSON(externalRoof, { style: ROOF_STYLE }).addTo(map);
    externalLayerRef.current = layer;

    // Keep the demo shape editable so users can tweak it like a drawn one.
    layer.eachLayer((child) => {
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

export function RoofMap({ onRoofChange, externalRoof }: RoofMapProps) {
  return (
    <MapContainer
      center={DEFAULT_CENTER}
      zoom={DEFAULT_ZOOM}
      maxZoom={21}
      className="h-full w-full"
      scrollWheelZoom
    >
      <TileLayer
        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        attribution="Tiles &copy; Esri — Source: Esri, Maxar, Earthstar Geographics"
        maxNativeZoom={19}
        maxZoom={21}
      />
      <SearchBox />
      <DrawControls onRoofChange={onRoofChange} externalRoof={externalRoof} />
    </MapContainer>
  );
}
