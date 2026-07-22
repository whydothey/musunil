import { ChevronRight, LocateFixed, Search, X } from "lucide-react";
import maplibregl, { type Map as MapLibreMap, type MapLayerMouseEvent, type MapGeoJSONFeature, type StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAppState } from "../app-state";
import type { GeoJsonFeatureCollection, OccurrenceDigest } from "../contracts";
import { formatDateTime, occurrenceTopicContext, occurrenceTopicTitle, pastMarkerOpacity, schedulePhase, schedulePhaseLabel, scaleLabel } from "../format";
import { Link, useRouter } from "../router";

type PhaseFilter = "active" | "past" | "all";

export function ExploreScreen() {
  const { dataset, serviceSyncState, selectedOccurrenceId, selectOccurrence } = useAppState();
  const { route } = useRouter();
  const [query, setQuery] = useState("");
  const [phaseFilter, setPhaseFilter] = useState<PhaseFilter>("active");
  const requestedOccurrenceId = route.search.get("occurrence") || undefined;
  const selectedId = selectedOccurrenceId || requestedOccurrenceId;
  const selected = dataset?.occurrences.find((item) => item.id === selectedId);
  const phaseCounts = useMemo(() => (dataset?.occurrences || []).reduce((counts, item) => {
    counts[schedulePhase(item)] += 1;
    return counts;
  }, { current: 0, upcoming: 0, past: 0 }), [dataset]);
  const visibleOccurrences = useMemo(() => (dataset?.occurrences || []).filter((item) => {
    const phase = schedulePhase(item);
    if (phaseFilter === "active") return phase !== "past";
    return phaseFilter === "all" || phase === "past";
  }), [dataset, phaseFilter]);
  const visibleIds = useMemo(() => new Set(visibleOccurrences.map((item) => item.id)), [visibleOccurrences]);
  const visiblePins = useMemo<GeoJsonFeatureCollection | undefined>(() => dataset?.map.geojson.pins ? ({
    ...dataset.map.geojson.pins,
    features: dataset.map.geojson.pins.features.filter((feature) => visibleIds.has(String(feature.properties.occurrenceUnitId || "")))
  }) : undefined, [dataset, visibleIds]);
  const visibleAreas = useMemo<GeoJsonFeatureCollection | undefined>(() => dataset?.map.geojson.presenceAreas ? ({
    ...dataset.map.geojson.presenceAreas,
    features: dataset.map.geojson.presenceAreas.features.filter((feature) => visibleIds.has(String(feature.properties.occurrenceUnitId || "")))
  }) : undefined, [dataset, visibleIds]);
  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("ko");
    const matches = normalized
      ? dataset?.occurrences.filter((item) => `${item.title} ${item.regionLabel} ${item.issueTitle || ""} ${item.topicCandidate?.title || ""} ${item.topicStatusLabel || ""}`.toLocaleLowerCase("ko").includes(normalized)) || []
      : dataset?.occurrences || [];
    return [...matches].sort((left, right) => phaseOrder(schedulePhase(left)) - phaseOrder(schedulePhase(right)) || String(left.startsAt || "").localeCompare(String(right.startsAt || "")));
  }, [dataset, query]);
  useEffect(() => {
    if (!requestedOccurrenceId) return;
    selectOccurrence(requestedOccurrenceId);
    const requested = dataset?.occurrences.find((item) => item.id === requestedOccurrenceId);
    if (requested) setPhaseFilter(schedulePhase(requested) === "past" ? "past" : "active");
  }, [dataset, requestedOccurrenceId, selectOccurrence]);

  return (
    <section className="explore-screen" data-screen="explore">
      <div className="map-topbar">
        <label className="map-search">
          <Search aria-hidden="true" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="지역, 이슈, 현장 검색" aria-label="지도 검색" />
          {query ? <button type="button" onClick={() => setQuery("")} aria-label="검색어 지우기"><X /></button> : null}
        </label>
        {query ? <div className="map-results" aria-label="검색 결과">
          {filtered.slice(0, 5).map((item) => <button key={item.id} type="button" onClick={() => { selectOccurrence(item.id); setPhaseFilter(schedulePhase(item) === "past" ? "past" : "active"); setQuery(""); }}><span>{item.regionLabel} · {schedulePhaseLabel(schedulePhase(item))}</span><strong>{occurrenceTopicTitle(item)}</strong><small>{occurrenceTopicContext(item)} · {item.title} · {formatDateTime(item.startsAt)}</small><ChevronRight /></button>)}
          {!filtered.length ? <p>일치하는 공개 현장이 없습니다</p> : null}
        </div> : null}
        {!query ? <div className="map-phase-filters" aria-label="일정 시점 필터">
          <button type="button" aria-pressed={phaseFilter === "active"} onClick={() => { setPhaseFilter("active"); selectOccurrence(undefined); }}><i className="key-current" />진행 {phaseCounts.current} · 예정 {phaseCounts.upcoming}</button>
          <button type="button" aria-pressed={phaseFilter === "past"} onClick={() => { setPhaseFilter("past"); selectOccurrence(undefined); }}><i className="key-past" />지난 {phaseCounts.past}</button>
          <button type="button" aria-pressed={phaseFilter === "all"} onClick={() => { setPhaseFilter("all"); selectOccurrence(undefined); }}>전체 {dataset?.occurrences.length || 0}</button>
        </div> : null}
      </div>

      <OccurrenceMap pins={visiblePins} areas={visibleAreas} occurrences={visibleOccurrences} selectedId={selectedId} onSelect={selectOccurrence} />

      <div className="map-key" aria-label="일정 및 위치 상태 표시 설명"><span><i className="key-current" />진행 중</span><span><i className="key-upcoming" />예정</span><span><i className="key-past" />지난 일정 · 오래될수록 흐림</span><span><i className="key-source" />공개자료 예상</span><span><i className="key-disputed" />위치 확인 중</span><span><i className="key-area" />현장 근거 범위</span></div>

      {serviceSyncState === "unavailable" ? <div className="map-notice">공개 지도 자료 연결을 확인하고 있습니다</div> : null}
      {selected ? <MapSelection occurrence={selected} onClose={() => selectOccurrence(undefined)} /> : null}
    </section>
  );
}

function phaseOrder(phase: ReturnType<typeof schedulePhase>): number {
  return phase === "current" ? 0 : phase === "upcoming" ? 1 : 2;
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
  const userMarkerRef = useRef<maplibregl.Marker | undefined>(undefined);
  const [mapReady, setMapReady] = useState(false);
  const [baseMapReady, setBaseMapReady] = useState(false);
  const [baseMapFallback, setBaseMapFallback] = useState(false);
  const [locationMessage, setLocationMessage] = useState("");
  const occurrenceById = useMemo(() => new Map(occurrences.map((item) => [item.id, item])), [occurrences]);
  const pinData: GeoJsonFeatureCollection = useMemo(() => ({
    type: "FeatureCollection" as const,
    features: (pins?.features || []).map((feature) => {
      const occurrence = occurrenceById.get(String(feature.properties.occurrenceUnitId || ""));
      return {
        ...feature,
        properties: {
          ...feature.properties,
          schedulePhase: occurrence ? schedulePhase(occurrence) : "current",
          markerOpacity: occurrence ? pastMarkerOpacity(occurrence) : 1,
          locationStatus: occurrence?.locationStatus || feature.properties.locationStatus || "SOURCE_GEOCODED"
        }
      };
    })
  }), [pins, occurrenceById]);
  const areaData = useMemo(() => areas || { type: "FeatureCollection" as const, features: [] }, [areas]);
  const pinDataRef = useRef(pinData);
  const areaDataRef = useRef(areaData);
  pinDataRef.current = pinData;
  areaDataRef.current = areaData;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: window.MUSUNIL_WEB_CONFIG?.mapStyleUrl || "https://tiles.openfreemap.org/styles/positron",
      center: [127.7, 36.35],
      zoom: 6.3,
      minZoom: 6,
      maxBounds: [[124.4, 32.8], [132.0, 38.7]],
      renderWorldCopies: false,
      attributionControl: false
    });
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");
    let interactionsBound = false;
    let fallbackApplied = false;
    let contextualPaintReady = false;
    let contextualErrors = 0;
    const applyFallback = () => {
      if (fallbackApplied) return;
      fallbackApplied = true;
      contextualPaintReady = false;
      setBaseMapReady(false);
      setBaseMapFallback(true);
      map.setStyle(fallbackRasterStyle());
    };
    const fallbackTimer = window.setTimeout(() => {
      if (!contextualPaintReady) applyFallback();
    }, 8_000);
    const installLayers = () => {
      if (map.getSource("occurrence-pins")) return;
      map.addSource("presence-areas", { type: "geojson", data: areaDataRef.current as never });
      map.addLayer({ id: "presence-fill", type: "fill", source: "presence-areas", paint: { "fill-color": "#0b6c74", "fill-opacity": 0.14 } });
      map.addLayer({ id: "presence-outline", type: "line", source: "presence-areas", paint: { "line-color": "#0b6c74", "line-width": 2, "line-opacity": 0.7 } });
      map.addSource("occurrence-pins", { type: "geojson", data: pinDataRef.current as never });
      map.addLayer({
        id: "occurrence-pin-shadow",
        type: "circle",
        source: "occurrence-pins",
        layout: { "circle-sort-key": ["get", "markerOpacity"] },
        paint: {
          "circle-radius": 14,
          "circle-color": "#ffffff",
          "circle-stroke-width": 1,
          "circle-stroke-color": "#c8d1d3",
          "circle-opacity": ["*", ["get", "markerOpacity"], 0.82]
        }
      });
      map.addLayer({
        id: "occurrence-pins",
        type: "circle",
        source: "occurrence-pins",
        layout: { "circle-sort-key": ["get", "markerOpacity"] },
        paint: {
          "circle-radius": 8,
          "circle-color": [
            "case",
            ["==", ["get", "locationStatus"], "LOCATION_DISPUTED"], "#b86b18",
            ["==", ["get", "locationStatus"], "SOURCE_GEOCODED"], "#647b82",
            ["match", ["get", "schedulePhase"], "past", "#899598", "upcoming", "#2563a7", "#0b7a67"]
          ],
          "circle-opacity": ["case", ["==", ["get", "occurrenceUnitId"], selectedId || ""], 1, ["get", "markerOpacity"]],
          "circle-stroke-width": ["case", ["==", ["get", "occurrenceUnitId"], selectedId || ""], 3, 0],
          "circle-stroke-color": "#9dd8dc"
        }
      });
      if (!interactionsBound) {
        const handleClick = (event: MapLayerMouseEvent) => {
          const feature = event.features?.[0] as MapGeoJSONFeature | undefined;
          const id = String(feature?.properties?.occurrenceUnitId || "");
          if (id) onSelect(id);
        };
        map.on("click", "occurrence-pins", handleClick);
        map.on("mouseenter", "occurrence-pins", () => { map.getCanvas().style.cursor = "pointer"; });
        map.on("mouseleave", "occurrence-pins", () => { map.getCanvas().style.cursor = ""; });
        interactionsBound = true;
      }
      setMapReady(true);
    };
    map.on("style.load", installLayers);
    map.on("idle", () => {
      const contextualLayers = map.getStyle().layers.filter((layer) => !["background", "fallback-background", "presence-fill", "presence-outline", "occurrence-pin-shadow", "occurrence-pins"].includes(layer.id));
      if (!contextualLayers.length) return;
      contextualPaintReady = true;
      setBaseMapReady(true);
      window.clearTimeout(fallbackTimer);
    });
    map.on("error", (event) => {
      if (fallbackApplied) return;
      const message = String(event.error?.message || "");
      if (!/tile|source|glyph|sprite|fetch|network/i.test(message)) return;
      contextualErrors += 1;
      if (contextualErrors >= 3) applyFallback();
    });
    mapRef.current = map;
    return () => { window.clearTimeout(fallbackTimer); userMarkerRef.current?.remove(); map.remove(); mapRef.current = undefined; };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.isStyleLoaded()) return;
    (map.getSource("occurrence-pins") as maplibregl.GeoJSONSource | undefined)?.setData(pinData as never);
    (map.getSource("presence-areas") as maplibregl.GeoJSONSource | undefined)?.setData(areaData as never);
  }, [pinData, areaData]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.isStyleLoaded()) return;
    if (!map.getLayer("occurrence-pins")) return;
    map.setPaintProperty("occurrence-pins", "circle-stroke-width", ["case", ["==", ["get", "occurrenceUnitId"], selectedId || ""], 3, 0]);
    if (!selectedId) return;
    const feature = pinData.features.find((item) => item.properties["occurrenceUnitId"] === selectedId);
    if (feature?.geometry.type === "Point") {
      map.easeTo({ center: feature.geometry.coordinates as [number, number], zoom: Math.max(map.getZoom(), 12), duration: 420, padding: { top: 80, bottom: 180, left: 40, right: 40 } });
    }
  }, [selectedId, pinData.features]);

  const locateUser = () => {
    if (!navigator.geolocation) {
      setLocationMessage("이 기기에서는 위치 기능을 사용할 수 없습니다.");
      return;
    }
    setLocationMessage("현재 위치를 확인하고 있습니다.");
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      const center: [number, number] = [coords.longitude, coords.latitude];
      if (center[0] < 124.4 || center[0] > 132.0 || center[1] < 32.8 || center[1] > 38.7) {
        setLocationMessage("현재 위치가 남한 지도 범위 밖입니다.");
        return;
      }
      const map = mapRef.current;
      if (!map) return;
      userMarkerRef.current?.remove();
      userMarkerRef.current = new maplibregl.Marker({ color: "#ec5f4f", scale: 0.72 }).setLngLat(center).addTo(map);
      map.easeTo({ center, zoom: Math.max(map.getZoom(), 12), duration: 520 });
      setLocationMessage("현재 위치를 지도에 표시했습니다. 위치 정보는 기기 밖으로 전송하지 않습니다.");
    }, () => setLocationMessage("위치 권한을 허용하면 내 주변 지도를 볼 수 있습니다."), { enableHighAccuracy: false, timeout: 10_000, maximumAge: 60_000 });
  };

  return <>
    <div ref={containerRef} className="map-canvas" data-map-ready={mapReady ? "true" : "false"} data-basemap-ready={baseMapReady ? "true" : "false"} aria-label={`지도 핀 ${pinData.features.length}개, 위치 확인 중 ${Math.max(0, occurrences.length - pinData.features.length)}개`} />
    <button type="button" className="map-locate" onClick={locateUser} aria-label="내 위치로 지도 이동"><LocateFixed aria-hidden="true" /><span>내 위치</span></button>
    <p className="map-location-message" aria-live="polite">{locationMessage}</p>
    {baseMapFallback ? <div className="map-basemap-notice">대체 지도 연결됨</div> : null}
  </>;
}

function fallbackRasterStyle(): StyleSpecification {
  return {
    version: 8,
    sources: {
      "fallback-map": {
        type: "raster",
        tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
        tileSize: 256,
        attribution: "© OpenStreetMap contributors"
      }
    },
    layers: [
      { id: "fallback-background", type: "background", paint: { "background-color": "#e8edef" } },
      { id: "fallback-map", type: "raster", source: "fallback-map", paint: { "raster-opacity": 1 } }
    ]
  };
}

function MapSelection({ occurrence, onClose }: { occurrence: OccurrenceDigest; onClose: () => void }) {
  const phase = schedulePhase(occurrence);
  return (
    <aside className="map-selection" aria-label="선택한 현장">
      <button type="button" className="map-selection-close" onClick={onClose} aria-label="현장 선택 닫기"><X /></button>
      <span className={`selection-state phase-${phase}`}><i />{schedulePhaseLabel(phase)}</span>
      <h2>{occurrenceTopicTitle(occurrence)}</h2>
      <p className="selection-topic">{occurrenceTopicContext(occurrence)}</p>
      <p className="selection-event">개별 일정 · {occurrence.title}</p>
      <p>장소 · {occurrence.locationLabel || occurrence.regionLabel}</p>
      <p>{occurrence.locationStatusLabel || "좌표 확인 중"}{occurrence.fieldLocationEvidenceCount ? ` · 독립 현장 근거 ${occurrence.fieldLocationEvidenceCount}건` : ""}</p>
      <p>{formatDateTime(occurrence.startsAt)} · {scaleLabel(occurrence)}</p>
      <Link href={`/occurrences/${encodeURIComponent(occurrence.id)}`} className="primary-button">현장 보기<ChevronRight /></Link>
    </aside>
  );
}
