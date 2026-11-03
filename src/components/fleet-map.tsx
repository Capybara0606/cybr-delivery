"use client";
import { useEffect, useRef, useState } from "react";
import type { Map as MapInstance, Marker } from "maplibre-gl";
import { fleetSignal, type FleetPosition } from "@/lib/commerce/fleet";
export function FleetMap({ points, selected }: { points: FleetPosition[]; selected: string | null }) {
  const element = useRef<HTMLDivElement>(null);
  const map = useRef<MapInstance | null>(null);
  const markers = useRef(new Map<string, Marker>());
  const signature = useRef("");
  const lastFocus = useRef("");
  const initial = useRef(points[0]);
  const [ready, setReady] = useState(false), [failed, setFailed] = useState(false);
  useEffect(() => {
    let disposed = false;
    const currentMarkers = markers.current;
    void import("maplibre-gl").then((lib) => {
      if (disposed || !element.current) return;
      try {
        lib.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
        const instance = new lib.Map({ container: element.current, style: process.env.NEXT_PUBLIC_MAP_STYLE_URL || "https://tiles.openfreemap.org/styles/liberty", center: [initial.current.lng, initial.current.lat], zoom: 14, attributionControl: { compact: true } });
        map.current = instance;
        instance.addControl(new lib.NavigationControl(), "top-right");
        instance.on("error", () => { if (!disposed) setFailed(true); });
        setReady(true);
      } catch { setFailed(true); }
    }).catch(() => { if (!disposed) setFailed(true); });
    return () => { disposed = true; for (const marker of currentMarkers.values()) marker.remove(); currentMarkers.clear(); map.current?.remove(); map.current = null; };
  }, []);
  useEffect(() => {
    if (!ready || !map.current) return;
    let disposed = false;
    void import("maplibre-gl").then((lib) => {
      if (disposed || !map.current) return;
      const ids = new Set(points.map(p => p.driver_id));
      for (const [id, marker] of markers.current) if (!ids.has(id)) { marker.remove(); markers.current.delete(id); }
      for (const p of points) {
        let marker = markers.current.get(p.driver_id);
        if (!marker) {
          marker = new lib.Marker({ color: "#1db954" }).setLngLat([p.lng, p.lat]).addTo(map.current);
          marker.setPopup(new lib.Popup({ offset: 24 }).setText(p.driver_name));
          markers.current.set(p.driver_id, marker);
        }
        marker.setLngLat([p.lng, p.lat]);
        marker.getElement().style.opacity = fleetSignal(p) === "stale" ? ".45" : "1";
        marker.getElement().setAttribute("aria-label", `Ubicación de ${p.driver_name}`);
      }
      const nextSignature = Array.from(ids).sort().join(",");
      const focus = points.find(p => p.driver_id === selected);
      if (focus) {
        const key = `${focus.driver_id}:${focus.lat}:${focus.lng}`;
        if (lastFocus.current !== key) map.current.easeTo({ center: [focus.lng, focus.lat], zoom: 15, duration: 400 });
        lastFocus.current = key;
      }
      else if (points.length && nextSignature !== signature.current) {
        if (points.length === 1) map.current.easeTo({ center: [points[0].lng, points[0].lat], zoom: 14 });
        else { const bounds = new lib.LngLatBounds(); for (const p of points) bounds.extend([p.lng, p.lat]); map.current.fitBounds(bounds, { padding: 50, maxZoom: 15 }); }
      }
      if (!focus) lastFocus.current = "";
      signature.current = nextSignature;
    }).catch(() => { if (!disposed) setFailed(true); });
    return () => { disposed = true; };
  }, [points, selected, ready]);
  return <div className="map-frame fleet-map-frame">
    <div ref={element} className="map" role="region" aria-label="Mapa de repartidores en turno" />
    {failed && <p className="map-warning">El mapa no pudo cargar. Consulta la lista de ubicaciones y su última actualización.</p>}
    <span className="map-hint">UBICACIÓN DEL TURNO · SOLO ADMINISTRACIÓN</span>
  </div>;
}
