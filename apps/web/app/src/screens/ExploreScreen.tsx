import { ChevronRight, LocateFixed, Search, X } from "lucide-react";
import maplibregl, { type Map as MapLibreMap, type MapLayerMouseEvent, type MapGeoJSONFeature } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAppState } from "../app-state";
import type { GeoJsonFeatureCollection, OccurrenceDigest } from "../contracts";
import { formatDateTime, lifecycleLabel, scaleLabel } from "../format";
import { Link, useRouter } from "../router";

export function ExploreScreen() {
  const { dataset, serviceSyncState, selectedOccurrenceId, selectOccurrence } = useAppState();
  const { route } = useRouter();
  const [query, setQuery] = useState("");
  const requestedOccurrenceId = route.search.get("occurrence") || undefined;
  const selectedId = selectedOccurrenceId || requestedOccurrenceId;
  const selected = dataset?.occurrences.find((item) => item.id === selectedId);
  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("ko");
    if (!normalized) return dataset?.occurrences || [];
    return dataset?.occurrences.filter((item) => `${item.title} ${item.regionLabel} ${item.issueTitle || ""}`.toLocaleLowerCase("ko").includes(normalized)) || [];
  }, [dataset, query]);
  useEffect(() => {
    if (requestedOccurrenceId) selectOccurrence(requestedOccurrenceId);
  }, [requestedOccurrenceId, selectOccurrence]);

  return (
    <section className="explore-screen" data-screen="explore">
      <div className="map-topbar">
        <label className="map-search">
          <Search aria-hidden="true" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="지역, 이슈, 현장 검색" aria-label="지도 검색" />
          {query ? <button type="button" onClick={() => setQuery("")} aria-label="검색어 지우기"><X /></button> : null}
        </label>
        {query ? <div className="map-results" aria-label="검색 결과">
          {filtered.slice(0, 5).map((item) => <button key={item.id} type="button" onClick={() => { selectOccurrence(item.id); setQuery(""); }}><span>{item.regionLabel}</span><strong>{item.title}</strong><ChevronRight /></button>)}
          {!filtered.length ? <p>일치하는 공개 현장이 없습니다</p> : null}
        </div> : null}
      </div>

      <OccurrenceMap pins={dataset?.map.geojson.pins} areas={dataset?.map.geojson.presenceAreas} occurrences={dataset?.occurrences || []} selectedId={selectedId} onSelect={selectOccurrence} />

      <div className="map-key" aria-label="지도 표시 설명"><span><i className="key-pin" />자료 위치</span><span><i className="key-area" />현장 인증 범위</span></div>

      {serviceSyncState === "unavailable" ? <div className="map-notice">공개 지도 자료 연결을 확인하고 있습니다</div> : null}
      {selected ? <MapSelection occurrence={selected} onClose={() => selectOccurrence(undefined)} /> : null}
    </section>
  );
}

function OccurrenceMap({ pins, areas, occurrences, selectedId, onSelect }: {
  pins?: GeoJsonFeatureCollection;
  areas?: GeoJsonFeatureCollection;
  occurrences: OccurrenceDigest[];
  selectedId?: string;
  onSelect: (id?: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | undefined>(undefined);
  const pinData = pins || { type: "FeatureCollection" as const, features: [] };
  const areaData = areas || { type: "FeatureCollection" as const, features: [] };

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: window.MUSUNIL_WEB_CONFIG?.mapStyleUrl || "https://tiles.openfreemap.org/styles/positron",
      center: [127.7, 36.35],
      zoom: 6.3,
      attributionControl: false
    });
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");
    map.on("load", () => {
      map.addSource("presence-areas", { type: "geojson", data: areaData as never });
      map.addLayer({ id: "presence-fill", type: "fill", source: "presence-areas", paint: { "fill-color": "#0b6c74", "fill-opacity": 0.14 } });
      map.addLayer({ id: "presence-outline", type: "line", source: "presence-areas", paint: { "line-color": "#0b6c74", "line-width": 2, "line-opacity": 0.7 } });
      map.addSource("occurrence-pins", { type: "geojson", data: pinData as never });
      map.addLayer({
        id: "occurrence-pin-shadow",
        type: "circle",
        source: "occurrence-pins",
        paint: { "circle-radius": 14, "circle-color": "#ffffff", "circle-stroke-width": 1, "circle-stroke-color": "#c8d1d3" }
      });
      map.addLayer({
        id: "occurrence-pins",
        type: "circle",
        source: "occurrence-pins",
        paint: {
          "circle-radius": 8,
          "circle-color": ["case", ["==", ["get", "occurrenceUnitId"], selectedId || ""], "#0b6c74", "#176f77"],
          "circle-stroke-width": ["case", ["==", ["get", "occurrenceUnitId"], selectedId || ""], 3, 0],
          "circle-stroke-color": "#9dd8dc"
        }
      });
      const handleClick = (event: MapLayerMouseEvent) => {
        const feature = event.features?.[0] as MapGeoJSONFeature | undefined;
        const id = String(feature?.properties?.occurrenceUnitId || "");
        if (id) onSelect(id);
      };
      map.on("click", "occurrence-pins", handleClick);
      map.on("click", "presence-fill", handleClick);
      map.on("mouseenter", "occurrence-pins", () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", "occurrence-pins", () => { map.getCanvas().style.cursor = ""; });
    });
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = undefined; };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.isStyleLoaded()) return;
    (map.getSource("occurrence-pins") as maplibregl.GeoJSONSource | undefined)?.setData(pinData as never);
    (map.getSource("presence-areas") as maplibregl.GeoJSONSource | undefined)?.setData(areaData as never);
  }, [pins, areas]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.isStyleLoaded()) return;
    map.setPaintProperty("occurrence-pins", "circle-stroke-width", ["case", ["==", ["get", "occurrenceUnitId"], selectedId || ""], 3, 0]);
    if (!selectedId) return;
    const feature = pinData.features.find((item) => item.properties.occurrenceUnitId === selectedId);
    if (feature?.geometry.type === "Point") {
      map.easeTo({ center: feature.geometry.coordinates as [number, number], zoom: Math.max(map.getZoom(), 12), duration: 420, padding: { top: 80, bottom: 180, left: 40, right: 40 } });
    }
  }, [selectedId, pinData.features]);

  return <div ref={containerRef} className="map-canvas" aria-label={`${occurrences.length}개 공개 현장 지도`} />;
}

function MapSelection({ occurrence, onClose }: { occurrence: OccurrenceDigest; onClose: () => void }) {
  return (
    <aside className="map-selection" aria-label="선택한 현장">
      <button type="button" className="map-selection-close" onClick={onClose} aria-label="현장 선택 닫기"><X /></button>
      <span className="selection-state"><i />{lifecycleLabel(occurrence.lifecycleState)}</span>
      <h2>{occurrence.title}</h2>
      <p>{occurrence.locationLabel || occurrence.regionLabel}</p>
      <p>{formatDateTime(occurrence.startsAt)} · {scaleLabel(occurrence)}</p>
      <Link href={`/occurrences/${encodeURIComponent(occurrence.id)}`} className="primary-button">현장 보기<ChevronRight /></Link>
    </aside>
  );
}
