"use client";
import { useEffect, useState } from "react";
import { FleetMap } from "@/components/fleet-map";
import { fleetPositions, fleetSignal, type ShiftLocation } from "@/lib/commerce/fleet";
import { statusLabels } from "@/lib/commerce/contracts";
export function LiveFleet() {
  const [locations, setLocations] = useState<ShiftLocation[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [snapshotAt, setSnapshotAt] = useState(0), [clock, setClock] = useState(0);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let cancelled = false;
    let controller: AbortController | null = null;
    const load = async () => {
      if (document.hidden || controller) return;
      const requestController = new AbortController();
      controller = requestController;
      const timeout = setTimeout(() => requestController.abort(), 15000);
      setLoading(true);
      try {
        const response = await fetch("/api/admin/fleet-locations", { cache: "no-store", signal: controller.signal });
        const data = await response.json();
        if (!response.ok) {
          if (!cancelled && (response.status === 401 || response.status === 403)) setLocations([]);
          throw new Error(data.error || "No se pudo consultar la ubicación.");
        }
        if (!Array.isArray(data.locations)) throw new Error("No se pudo interpretar la ubicación de la flota.");
        if (!cancelled) {
          setLocations(data.locations); setError("");
          const now = performance.now(); setSnapshotAt(now); setClock(now);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error && e.name === "AbortError" ? "La consulta tardó demasiado. Revisa tu conexión." : e instanceof Error ? e.message : "Sin conexión para actualizar ubicaciones.");
      } finally { clearTimeout(timeout); controller = null; if (!cancelled) setLoading(false); }
    };
    void load();
    const onVisibility = () => { if (!document.hidden) { setClock(performance.now()); void load(); } };
    document.addEventListener("visibilitychange", onVisibility);
    const timer = setInterval(() => void load(), 10000);
    const ageTimer = setInterval(() => { if (!document.hidden) setClock(performance.now()); }, 1000);
    return () => { cancelled = true; controller?.abort(); clearInterval(timer); clearInterval(ageTimer); document.removeEventListener("visibilitychange", onVisibility); };
  }, [revision]);
  const elapsed = Math.max(0, (clock - snapshotAt) / 1000);
  const points = error ? [] : fleetPositions(locations, elapsed).map(p => ({ ...p, age_seconds: (p.age_seconds || 0) + elapsed }));
  return <div className="fleet-live shift-fleet">
    <div className="fleet-heading"><h3>Ubicación durante el turno</h3>
      <button className="button secondary" disabled={loading} onClick={() => setRevision(n => n + 1)}>{loading ? "Actualizando…" : "Actualizar ubicaciones"}</button>
    </div>
    <p className="field-hint">Actualización cada 10 segundos, también sin pedidos. Solo se muestran posiciones de turnos activos. La app del repartidor debe estar actualizada y tener permisos de ubicación.</p>
    {error && <p role="alert" className="notice">{error} No se muestran posiciones como actuales hasta recuperar la conexión.</p>}
    {!locations.length && !loading && !error && <p className="field-hint">No hay repartidores con cuenta y turno activo.</p>}
    {!!points.length && <FleetMap points={points} selected={selected} />}
    {!!locations.length && !points.length && !error && <p className="field-hint">Esperando una ubicación reciente de la app del repartidor.</p>}
    <div className="fleet-position-list">
      {locations.map(row => {
        const signal = error ? "no_signal" : fleetSignal(row, elapsed);
        const lastReceived = row.received_at ? new Date(row.received_at).toLocaleString("es-SV", { timeZone: "America/El_Salvador" }) : null;
        return <article className="fleet-position-card" key={row.driver_id} aria-label={`Turno de ${row.driver_name}`}>
          <div className="fleet-heading"><h4>{row.driver_name}</h4><span className={signal === "fresh" ? "status-on" : "status-off"}>{signal === "fresh" ? "GPS reciente" : signal === "stale" ? "Señal atrasada" : "Sin señal GPS"}</span></div>
          <p>{row.order_number ? `Pedido #${row.order_number} · ${statusLabels[row.order_status || ""] || row.order_status}` : "En turno · sin entrega asignada"}</p>
          <p className="field-hint">{lastReceived ? `Última recepción: ${lastReceived}` : "Todavía no se ha recibido ubicación en este turno."}{signal !== "no_signal" && row.accuracy_m !== null ? ` · Precisión ±${Math.round(row.accuracy_m)} m` : ""}</p>
          {signal !== "no_signal" && row.lat !== null && row.lng !== null ? <>
            <p className="fleet-coordinates">{row.lat.toFixed(6)}, {row.lng.toFixed(6)}</p>
            <div className="fleet-heading"><button className="text-button" onClick={() => setSelected(selected === row.driver_id ? null : row.driver_id)}>{selected === row.driver_id ? "Dejar de seguir en mapa" : "Seguir en mapa"}</button>
              <a target="_blank" rel="noreferrer" href={`https://www.openstreetmap.org/?mlat=${row.lat}&mlon=${row.lng}#map=16/${row.lat}/${row.lng}`}>Abrir ubicación ↗</a>
            </div>
          </> : <p className="field-hint">Revisa conexión, permisos y turno en la app del repartidor. Las posiciones de más de 90 segundos se ocultan del mapa.</p>}
        </article>;
      })}
    </div>
  </div>;
}
