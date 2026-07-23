import { ChevronRight, List, LocateFixed, Search, X } from "lucide-react";
import maplibregl, { type Map as MapLibreMap, type MapGeoJSONFeature, type StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useAppState } from "../app-state";
import type { GeoJsonFeatureCollection, OccurrenceDigest } from "../contracts";
import { formatDateTime, occurrenceTopicContext, occurrenceTopicTitle, pastMarkerOpacity, schedulePhase, schedulePhaseLabel, scaleLabel } from "../format";
import { Link, useRouter } from "../router";

type PhaseFilter = "active" | "past" | "all";
type MapGroupSelection = {
  id: string;
  kind: "region" | "overlap";
  label: string;
  occurrenceIds: string[];
  coordinate: [number, number];
};

export function ExploreScreen() {
  const { dataset, serviceSyncState, selectedOccurrenceId, selectOccurrence } = useAppState();
  const { route, navigate } = useRouter();
  const [query, setQuery] = useState("");
  const [phaseFilter, setPhaseFilter] = useState<PhaseFilter>("active");
  const [now, setNow] = useState(() => Date.now());
  const [listOpen, setListOpen] = useState(false);
  const [listGroup, setListGroup] = useState<MapGroupSelection>();
  const [mapGroupOpen, setMapGroupOpen] = useState(false);
  const [mapGroupDismissal, setMapGroupDismissal] = useState(0);
  const requestedOccurrenceId = route.search.get("occurrence") || undefined;
  const topicUnknownOnly = route.search.get("topic") === "unknown";
  const selectedId = selectedOccurrenceId || requestedOccurrenceId;
  const selected = dataset?.occurrences.find((item) => item.id === selectedId);
  const scopedOccurrences = useMemo(() => (dataset?.occurrences || []).filter((item) => !topicUnknownOnly || item.topicStatus === "source_not_disclosed" || item.topicStatus === "unlinked"), [dataset, topicUnknownOnly]);
  const phaseCounts = useMemo(() => scopedOccurrences.reduce((counts, item) => {
    counts[schedulePhase(item, now)] += 1;
    return counts;
  }, { current: 0, upcoming: 0, past: 0 }), [scopedOccurrences, now]);
  const visibleOccurrences = useMemo(() => scopedOccurrences.filter((item) => {
    const phase = schedulePhase(item, now);
    if (phaseFilter === "active") return phase !== "past";
    return phaseFilter === "all" || phase === "past";
  }), [scopedOccurrences, phaseFilter, now]);
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
      ? scopedOccurrences.filter((item) => `${item.title} ${item.regionLabel} ${item.issueTitle || ""} ${item.topicCandidate?.title || ""} ${item.topicStatusLabel || ""}`.toLocaleLowerCase("ko").includes(normalized))
      : scopedOccurrences;
    return [...matches].sort((left, right) => phaseOrder(schedulePhase(left, now)) - phaseOrder(schedulePhase(right, now)) || String(left.startsAt || "").localeCompare(String(right.startsAt || "")));
  }, [scopedOccurrences, query, now]);
  const listedOccurrences = useMemo(() => {
    const memberIds = listGroup ? new Set(listGroup.occurrenceIds) : undefined;
    return visibleOccurrences
      .filter((item) => !memberIds || memberIds.has(item.id))
      .sort((left, right) => phaseOrder(schedulePhase(left, now)) - phaseOrder(schedulePhase(right, now)) || String(left.startsAt || "").localeCompare(String(right.startsAt || "")));
  }, [visibleOccurrences, listGroup, now]);
  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(interval);
  }, []);
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
          {topicUnknownOnly ? <button type="button" className="map-topic-filter" aria-pressed="true" onClick={() => { setMapGroupOpen(false); setMapGroupDismissal((value) => value + 1); navigate("/explore"); }}><span>주제 확인 중</span><X aria-hidden="true" /></button> : null}
          <button type="button" aria-pressed={phaseFilter === "active"} onClick={() => { setPhaseFilter("active"); setMapGroupOpen(false); setMapGroupDismissal((value) => value + 1); selectOccurrence(undefined); }}><i className="key-current" />진행 {phaseCounts.current} · 예정 {phaseCounts.upcoming}</button>
          <button type="button" aria-pressed={phaseFilter === "past"} onClick={() => { setPhaseFilter("past"); setMapGroupOpen(false); setMapGroupDismissal((value) => value + 1); selectOccurrence(undefined); }}><i className="key-past" />지난 {phaseCounts.past}</button>
          <button type="button" aria-pressed={phaseFilter === "all"} onClick={() => { setPhaseFilter("all"); setMapGroupOpen(false); setMapGroupDismissal((value) => value + 1); selectOccurrence(undefined); }}>전체 {scopedOccurrences.length}</button>
          <button type="button" className="map-list-button" aria-pressed={listOpen} aria-expanded={listOpen} onClick={() => { setListOpen((value) => !value); setListGroup(undefined); setMapGroupOpen(false); setMapGroupDismissal((value) => value + 1); selectOccurrence(undefined); }}><List aria-hidden="true" />일정 목록 {visibleOccurrences.length}</button>
        </div> : null}
      </div>

      <OccurrenceMap pins={visiblePins} areas={visibleAreas} occurrences={visibleOccurrences} selectedId={selectedId} now={now} dismissGroupSignal={mapGroupDismissal} onSelect={selectOccurrence} onGroupOpenChange={setMapGroupOpen} onOpenGroupList={(group) => { setListGroup(group); setListOpen(true); selectOccurrence(undefined); }} />

      {!selected && !listOpen && !mapGroupOpen ? <div className="map-key" aria-label="일정 및 위치 상태 표시 설명"><span><i className="key-current" />진행 중</span><span><i className="key-upcoming" />예정</span><span><i className="key-past" />지난 일정 · 오래될수록 흐림</span><span><i className="key-source" />공개자료 위치·넓은 원은 추정</span><span><i className="key-area" />현장 인증 범위</span></div> : null}
      {listOpen ? <aside className="map-event-list" aria-label="지도에 포함된 일정 목록">
        <div><strong>{listGroup?.label || "전체 일정"}</strong><button type="button" onClick={() => setListOpen(false)} aria-label="일정 목록 닫기"><X /></button></div>
        {listedOccurrences.map((item) => <button key={item.id} type="button" onClick={() => { selectOccurrence(item.id); setListOpen(false); setListGroup(undefined); }}><span>{schedulePhaseLabel(schedulePhase(item, now))} · {item.regionLabel}</span><strong>{occurrenceTopicTitle(item)}</strong><small>{item.locationLabel || item.title} · {formatDateTime(item.startsAt)}</small></button>)}
      </aside> : null}

      {serviceSyncState === "unavailable" ? <div className="map-notice">공개 지도 자료 연결을 확인하고 있습니다</div> : null}
      {selected ? <MapSelection occurrence={selected} onClose={() => selectOccurrence(undefined)} /> : null}
    </section>
  );
}

function phaseOrder(phase: ReturnType<typeof schedulePhase>): number {
  return phase === "current" ? 0 : phase === "upcoming" ? 1 : 2;
}

const REGIONAL_UNCERTAINTY_THRESHOLD_M = 15_000;
const REGIONAL_EXPANSION_ZOOM = 9;
const EVENT_CLUSTER_MAX_ZOOM = 12;

function OccurrenceMap({ pins, areas, occurrences, selectedId, now, dismissGroupSignal, onSelect, onGroupOpenChange, onOpenGroupList }: {
  pins?: GeoJsonFeatureCollection;
  areas?: GeoJsonFeatureCollection;
  occurrences: OccurrenceDigest[];
  selectedId?: string;
  now: number;
  dismissGroupSignal: number;
  onSelect: (id?: string) => void;
  onGroupOpenChange: (open: boolean) => void;
  onOpenGroupList: (group: MapGroupSelection) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | undefined>(undefined);
  const userMarkerRef = useRef<maplibregl.Marker | undefined>(undefined);
  const [mapReady, setMapReady] = useState(false);
  const [baseMapReady, setBaseMapReady] = useState(false);
  const [baseMapFallback, setBaseMapFallback] = useState(false);
  const [mapZoom, setMapZoom] = useState(6.3);
  const [visibleClusterCount, setVisibleClusterCount] = useState(0);
  const [locationMessage, setLocationMessage] = useState("");
  const [activeGroup, setActiveGroup] = useState<MapGroupSelection>();
  const [anchorPosition, setAnchorPosition] = useState<{ x: number; y: number }>();
  const occurrenceById = useMemo(() => new Map(occurrences.map((item) => [item.id, item])), [occurrences]);
  const occurrenceSignature = useMemo(() => occurrences.map((item) => item.id).sort().join("|"), [occurrences]);
  const mapDisplay = useMemo(() => {
    const precisePins: GeoJsonFeatureCollection["features"] = [];
    const regional = new Map<string, GeoJsonFeatureCollection["features"]>();
    const individualCoordinates = new Map<string, [number, number]>();
    for (const feature of pins?.features || []) {
      const occurrenceId = String(feature.properties.occurrenceUnitId || "");
      const occurrence = occurrenceById.get(occurrenceId);
      if (!occurrence || feature.geometry.type !== "Point") continue;
      const radius = occurrence.locationUncertaintyRadiusM ?? Number(feature.properties.uncertaintyRadiusM || 300);
      const coordinates = feature.geometry.coordinates as [number, number];
      individualCoordinates.set(occurrenceId, coordinates);
      const decorated = { ...feature, properties: { ...feature.properties, schedulePhase: schedulePhase(occurrence, now), markerOpacity: pastMarkerOpacity(occurrence, now), markerKind: radius > 1_500 ? "fuzzy" : "event", locationStatus: occurrence.locationStatus || feature.properties.locationStatus || "SOURCE_GEOCODED" } };
      if (radius > REGIONAL_UNCERTAINTY_THRESHOLD_M) regional.set(occurrence.regionLabel, [...(regional.get(occurrence.regionLabel) || []), decorated]);
      else precisePins.push(decorated);
    }
    const regionalPins: GeoJsonFeatureCollection["features"] = [];
    const regionalGroups: MapGroupSelection[] = [];
    for (const [region, features] of regional) {
      const coordinates = features.map((feature) => feature.geometry.coordinates as [number, number]);
      const coordinate: [number, number] = [coordinates.reduce((sum, item) => sum + item[0], 0) / coordinates.length, coordinates.reduce((sum, item) => sum + item[1], 0) / coordinates.length];
      const id = `region-${region}`;
      const occurrenceIds = features.map((feature) => String(feature.properties.occurrenceUnitId || "")).filter(Boolean);
      regionalGroups.push({ id, kind: "region", label: `${region} 권역 내 위치 확인 중`, occurrenceIds, coordinate });
      regionalPins.push({ type: "Feature", geometry: { type: "Point", coordinates: coordinate }, properties: { id, groupId: id, clusterCount: occurrenceIds.length, markerKind: "region", markerOpacity: 1, schedulePhase: "current", locationStatus: "SOURCE_GEOCODED" } });
    }
    return {
      precisePins: { type: "FeatureCollection" as const, features: precisePins },
      regionalPins: { type: "FeatureCollection" as const, features: regionalPins },
      regionalGroups,
      individualCoordinates,
      areas: areas || { type: "FeatureCollection" as const, features: [] }
    };
  }, [pins, areas, occurrenceById, now]);
  const precisePinData = mapDisplay.precisePins;
  const regionalPinData = mapDisplay.regionalPins;
  const areaData = mapDisplay.areas;
  const precisePinDataRef = useRef(precisePinData);
  const regionalPinDataRef = useRef(regionalPinData);
  const areaDataRef = useRef(areaData);
  const regionalGroupsRef = useRef(mapDisplay.regionalGroups);
  const activeGroupRef = useRef(activeGroup);
  const selectedIdRef = useRef(selectedId);
  const onSelectRef = useRef(onSelect);
  const onGroupOpenChangeRef = useRef(onGroupOpenChange);
  const onOpenGroupListRef = useRef(onOpenGroupList);
  const expandRegionalGroupRef = useRef<((group: MapGroupSelection) => void) | undefined>(undefined);
  precisePinDataRef.current = precisePinData;
  regionalPinDataRef.current = regionalPinData;
  areaDataRef.current = areaData;
  regionalGroupsRef.current = mapDisplay.regionalGroups;
  activeGroupRef.current = activeGroup;
  selectedIdRef.current = selectedId;
  onSelectRef.current = onSelect;
  onGroupOpenChangeRef.current = onGroupOpenChange;
  onOpenGroupListRef.current = onOpenGroupList;

  useEffect(() => {
    if (!activeGroupRef.current) return;
    activeGroupRef.current = undefined;
    setActiveGroup(undefined);
    setAnchorPosition(undefined);
    onGroupOpenChangeRef.current(false);
  }, [occurrenceSignature, dismissGroupSignal]);

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
    const positionGroup = (group: MapGroupSelection) => {
      const point = map.project(group.coordinate);
      const container = map.getContainer();
      setAnchorPosition({ x: Math.max(170, Math.min(container.clientWidth - 170, point.x)), y: Math.max(440, Math.min(container.clientHeight - 20, point.y)) });
    };
    const showGroup = (group: MapGroupSelection) => {
      activeGroupRef.current = group;
      setActiveGroup(group);
      onGroupOpenChangeRef.current(true);
      positionGroup(group);
    };
    const expandRegionalGroup = (group: MapGroupSelection) => {
      showGroup(group);
      if (map.getZoom() < REGIONAL_EXPANSION_ZOOM) map.easeTo({ center: group.coordinate, zoom: REGIONAL_EXPANSION_ZOOM, duration: 420 });
    };
    expandRegionalGroupRef.current = expandRegionalGroup;
    const syncExpandedRegionalGroup = () => {
      let active = activeGroupRef.current;
      const zoom = map.getZoom();
      const clearGroup = () => {
        activeGroupRef.current = undefined;
        active = undefined;
        setActiveGroup(undefined);
        setAnchorPosition(undefined);
        onGroupOpenChangeRef.current(false);
      };
      setMapZoom(zoom);
      if (active?.kind === "overlap" && zoom <= EVENT_CLUSTER_MAX_ZOOM) {
        clearGroup();
        return;
      }
      if (zoom < REGIONAL_EXPANSION_ZOOM) {
        if (active?.kind === "region") {
          clearGroup();
        } else if (active) positionGroup(active);
        return;
      }
      if (selectedIdRef.current) {
        if (active) clearGroup();
        return;
      }
      const bounds = map.getBounds();
      if (active && !bounds.contains(active.coordinate)) clearGroup();
      if (active) {
        positionGroup(active);
        return;
      }
      const center = map.project(map.getCenter());
      const nearest = regionalGroupsRef.current
        .filter((group) => bounds.contains(group.coordinate))
        .map((group) => ({ group, point: map.project(group.coordinate) }))
        .sort((left, right) => Math.hypot(left.point.x - center.x, left.point.y - center.y) - Math.hypot(right.point.x - center.x, right.point.y - center.y))[0]?.group;
      if (nearest) showGroup(nearest);
    };
    const syncVisibleClusters = () => {
      if (!map.getLayer("occurrence-clusters")) return;
      const clusterIds = new Set(map.queryRenderedFeatures({ layers: ["occurrence-clusters"] }).map((feature) => String(feature.properties?.cluster_id || "")));
      clusterIds.delete("");
      setVisibleClusterCount(clusterIds.size);
    };
    const installLayers = () => {
      if (map.getSource("occurrence-pins")) return;
      map.addSource("presence-areas", { type: "geojson", data: areaDataRef.current as never });
      map.addLayer({ id: "presence-fill", type: "fill", source: "presence-areas", paint: { "fill-color": "#0b6c74", "fill-opacity": 0.14 } });
      map.addLayer({ id: "presence-outline", type: "line", source: "presence-areas", paint: { "line-color": "#0b6c74", "line-width": 2, "line-opacity": 0.7 } });
      map.addSource("occurrence-pins", { type: "geojson", data: precisePinDataRef.current as never, cluster: true, clusterRadius: 48, clusterMaxZoom: EVENT_CLUSTER_MAX_ZOOM });
      map.addLayer({
        id: "occurrence-clusters",
        type: "circle",
        source: "occurrence-pins",
        filter: ["has", "point_count"],
        paint: {
          "circle-radius": ["step", ["get", "point_count"], 15, 10, 18, 30, 22],
          "circle-color": "#0b6c74",
          "circle-stroke-width": 3,
          "circle-stroke-color": "rgba(255,255,255,.9)"
        }
      });
      map.addLayer({
        id: "occurrence-pin-shadow",
        type: "circle",
        source: "occurrence-pins",
        filter: ["!", ["has", "point_count"]],
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
        filter: ["!", ["has", "point_count"]],
        layout: { "circle-sort-key": ["get", "markerOpacity"] },
        paint: {
          "circle-radius": ["match", ["get", "markerKind"], "fuzzy", 10, 8],
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
      map.addSource("regional-pins", { type: "geojson", data: regionalPinDataRef.current as never });
      map.addLayer({ id: "regional-pin-shadow", type: "circle", source: "regional-pins", maxzoom: REGIONAL_EXPANSION_ZOOM, paint: { "circle-radius": 17, "circle-color": "#ffffff", "circle-stroke-width": 1, "circle-stroke-color": "#c8d1d3", "circle-opacity": 0.86 } });
      map.addLayer({ id: "regional-pins", type: "circle", source: "regional-pins", maxzoom: REGIONAL_EXPANSION_ZOOM, paint: { "circle-radius": 13, "circle-color": "#647b82", "circle-opacity": 1 } });
      if (map.getStyle().glyphs) {
        map.addLayer({
          id: "occurrence-cluster-count",
          type: "symbol",
          source: "occurrence-pins",
          filter: ["has", "point_count"],
          layout: {
            "text-field": ["to-string", ["get", "point_count"]],
            "text-font": ["Noto Sans Bold"],
            "text-size": 11,
            "text-allow-overlap": true,
            "text-ignore-placement": true
          },
          paint: { "text-color": "#ffffff", "text-halo-width": 0 }
        });
        map.addLayer({ id: "regional-count", type: "symbol", source: "regional-pins", maxzoom: REGIONAL_EXPANSION_ZOOM, layout: { "text-field": ["to-string", ["get", "clusterCount"]], "text-font": ["Noto Sans Bold"], "text-size": 11, "text-allow-overlap": true, "text-ignore-placement": true }, paint: { "text-color": "#ffffff", "text-halo-width": 0 } });
      }
      if (!interactionsBound) {
        map.on("click", "occurrence-clusters", async (event) => {
          const feature = event.features?.[0] as MapGeoJSONFeature | undefined;
          const clusterId = Number(feature?.properties?.cluster_id);
          if (!Number.isFinite(clusterId) || feature?.geometry.type !== "Point") return;
          const source = map.getSource("occurrence-pins") as maplibregl.GeoJSONSource;
          const zoom = await source.getClusterExpansionZoom(clusterId);
          map.easeTo({ center: feature.geometry.coordinates as [number, number], zoom, duration: 420 });
        });
        map.on("click", "regional-pins", (event) => {
          const groupId = String(event.features?.[0]?.properties?.groupId || "");
          const group = regionalGroupsRef.current.find((item) => item.id === groupId);
          if (!group) return;
          expandRegionalGroup(group);
        });
        map.on("click", "occurrence-pins", (event) => {
          const overlappingIds = map.queryRenderedFeatures(event.point, { layers: ["occurrence-pins"] })
            .map((feature) => String(feature.properties?.occurrenceUnitId || ""))
            .filter((id, index, values) => Boolean(id) && values.indexOf(id) === index);
          if (overlappingIds.length > 1 && event.lngLat) {
            showGroup({ id: `overlap-${overlappingIds.sort().join("-")}`, kind: "overlap", label: "같은 공개 위치의 일정", occurrenceIds: overlappingIds, coordinate: [event.lngLat.lng, event.lngLat.lat] });
            return;
          }
          const id = overlappingIds[0] || String(event.features?.[0]?.properties?.occurrenceUnitId || "");
          if (id) onSelectRef.current(id);
        });
        for (const layer of ["occurrence-clusters", "regional-pins", "occurrence-pins"]) {
          map.on("mouseenter", layer, () => { map.getCanvas().style.cursor = "pointer"; });
          map.on("mouseleave", layer, () => { map.getCanvas().style.cursor = ""; });
        };
        interactionsBound = true;
      }
      setMapReady(true);
    };
    map.on("style.load", installLayers);
    map.on("move", () => { if (activeGroupRef.current) positionGroup(activeGroupRef.current); });
    map.on("zoomend", syncExpandedRegionalGroup);
    map.on("moveend", () => { syncExpandedRegionalGroup(); syncVisibleClusters(); });
    map.on("idle", () => {
      syncVisibleClusters();
      const contextualLayers = map.getStyle().layers.filter((layer) => !["background", "fallback-background", "presence-fill", "presence-outline", "occurrence-clusters", "occurrence-cluster-count", "occurrence-pin-shadow", "occurrence-pins", "regional-pin-shadow", "regional-pins", "regional-count"].includes(layer.id));
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
    return () => { window.clearTimeout(fallbackTimer); userMarkerRef.current?.remove(); expandRegionalGroupRef.current = undefined; map.remove(); mapRef.current = undefined; };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    (map.getSource("occurrence-pins") as maplibregl.GeoJSONSource | undefined)?.setData(precisePinData as never);
    (map.getSource("regional-pins") as maplibregl.GeoJSONSource | undefined)?.setData(regionalPinData as never);
    (map.getSource("presence-areas") as maplibregl.GeoJSONSource | undefined)?.setData(areaData as never);
  }, [precisePinData, regionalPinData, areaData]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!map.getLayer("occurrence-pins")) return;
    map.setPaintProperty("occurrence-pins", "circle-stroke-width", ["case", ["==", ["get", "occurrenceUnitId"], selectedId || ""], 3, 0]);
    if (!selectedId) return;
    activeGroupRef.current = undefined;
    setActiveGroup(undefined);
    setAnchorPosition(undefined);
    onGroupOpenChangeRef.current(false);
    const coordinate = mapDisplay.individualCoordinates.get(selectedId);
    const occurrence = occurrenceById.get(selectedId);
    if (coordinate) map.easeTo({ center: coordinate, zoom: Math.max(map.getZoom(), (occurrence?.locationUncertaintyRadiusM || 0) > REGIONAL_UNCERTAINTY_THRESHOLD_M ? REGIONAL_EXPANSION_ZOOM : EVENT_CLUSTER_MAX_ZOOM + 1), duration: 420, padding: { top: 80, bottom: 180, left: 40, right: 40 } });
  }, [selectedId, mapDisplay.individualCoordinates, occurrenceById]);

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
    <div ref={containerRef} className="map-canvas" data-map-ready={mapReady ? "true" : "false"} data-basemap-ready={baseMapReady ? "true" : "false"} data-map-zoom={mapZoom.toFixed(1)} data-visible-clusters={visibleClusterCount} aria-label={`정밀 위치 ${precisePinData.features.length}개와 권역 위치 ${regionalPinData.features.length}개를 표시한 지도. 전체 일정 ${occurrences.length}건이며 일정 목록 버튼에서 모두 확인할 수 있습니다.`} />
    <button type="button" className="map-locate" onClick={locateUser} aria-label="내 위치로 지도 이동"><LocateFixed aria-hidden="true" /><span>내 위치</span></button>
    <div className="map-region-shortcuts" aria-label="지도 권역 묶음 바로가기">
      {mapDisplay.regionalGroups.map((group) => <button key={group.id} type="button" onClick={() => expandRegionalGroupRef.current?.(group)}>{group.label} 일정 {group.occurrenceIds.length}건 펼치기</button>)}
    </div>
    <p className="map-location-message" aria-live="polite">{locationMessage}</p>
    {baseMapFallback ? <div className="map-basemap-notice">대체 지도 연결됨</div> : null}
    {activeGroup ? <MapAnchorStack group={activeGroup} occurrences={activeGroup.occurrenceIds.map((id) => occurrenceById.get(id)).filter((item): item is OccurrenceDigest => Boolean(item))} position={anchorPosition} now={now} onClose={() => { activeGroupRef.current = undefined; setActiveGroup(undefined); setAnchorPosition(undefined); onGroupOpenChangeRef.current(false); }} onSelect={(id) => { activeGroupRef.current = undefined; setActiveGroup(undefined); setAnchorPosition(undefined); onGroupOpenChangeRef.current(false); onSelectRef.current(id); }} onOpenAll={() => { onOpenGroupListRef.current(activeGroup); activeGroupRef.current = undefined; setActiveGroup(undefined); setAnchorPosition(undefined); onGroupOpenChangeRef.current(false); }} /> : null}
  </>;
}

function MapAnchorStack({ group, occurrences, position, now, onClose, onSelect, onOpenAll }: {
  group: MapGroupSelection;
  occurrences: OccurrenceDigest[];
  position?: { x: number; y: number };
  now: number;
  onClose: () => void;
  onSelect: (id: string) => void;
  onOpenAll: () => void;
}) {
  const sorted = [...occurrences].sort((left, right) => phaseOrder(schedulePhase(left, now)) - phaseOrder(schedulePhase(right, now)) || String(left.startsAt || "").localeCompare(String(right.startsAt || "")));
  const style = { "--anchor-x": `${position?.x || 0}px`, "--anchor-y": `${position?.y || 0}px` } as CSSProperties;
  return <aside className="map-anchor-stack" style={style} aria-label={group.label} data-group-kind={group.kind}>
    <div className="map-anchor-head"><div><strong>{group.label}</strong><span>{group.kind === "region" ? "권역 중심점은 개별 장소가 아닙니다" : "같은 좌표에 연결된 개별 일정입니다"}</span></div><button type="button" onClick={onClose} aria-label="펼친 일정 닫기"><X /></button></div>
    <div className="map-anchor-items">{sorted.slice(0, 4).map((item) => <button key={item.id} type="button" onClick={() => onSelect(item.id)}><span>{schedulePhaseLabel(schedulePhase(item, now))} · {item.regionLabel}</span><strong>{occurrenceTopicTitle(item)}</strong><small>{item.locationLabel || item.title} · {formatDateTime(item.startsAt)}</small></button>)}</div>
    {sorted.length > 4 ? <button type="button" className="map-anchor-all" onClick={onOpenAll}>전체 {sorted.length}건 보기<ChevronRight /></button> : null}
  </aside>;
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
      <p>{occurrence.locationStatusLabel || "좌표 확인 중"}{occurrence.locationUncertaintyRadiusM ? ` · 약 ${formatRadius(occurrence.locationUncertaintyRadiusM)} 범위의 위치 추정` : ""}{occurrence.fieldLocationEvidenceCount ? ` · 독립 현장 근거 ${occurrence.fieldLocationEvidenceCount}건` : ""}</p>
      <p>{formatDateTime(occurrence.startsAt)} · {occurrence.declaredParticipantCount ? `공개자료 기재 인원 ${occurrence.declaredParticipantCount.toLocaleString("ko-KR")}명` : scaleLabel(occurrence)}</p>
      <Link href={`/occurrences/${encodeURIComponent(occurrence.id)}`} className="primary-button">현장 보기<ChevronRight /></Link>
    </aside>
  );
}

function formatRadius(radiusM: number) {
  return radiusM >= 1_000 ? `${Math.round(radiusM / 1_000)}km` : `${Math.round(radiusM / 100) * 100}m`;
}
