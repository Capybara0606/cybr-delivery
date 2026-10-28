"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { installation } from "@/config/installation";
import {
  Bike,
  MapPin,
  Navigation,
  Phone,
  Check,
  LogOut,
  RefreshCw,
  Radio,
  RadioTower,
  LocateFixed,
} from "lucide-react";
import { TeamLogin } from "./access";
import { LocationMap } from "@/components/location-map";
import {
  money,
  statusLabels,
  type LocationPoint,
} from "@/lib/commerce/contracts";
type Delivery = {
  id: string;
  assignment_id: string;
  assignment_status: string;
  order_number: number;
  status: string;
  customer_name: string;
  customer_phone: string;
  total_cents: number;
  address: string;
  instructions: string;
  destination: LocationPoint;
  pickup_address: string;
  pickup: LocationPoint;
  is_demo: boolean;
  items: { name: string; quantity: number }[];
};
type Workspace = {
  driver: { id: string; full_name: string; is_available: boolean };
  active: Delivery | null;
  history: {
    order_number: number;
    status: string;
    total_cents: number;
    ended_at: string;
    assignment_status?: string;
  }[];
};
export function Driver() {
  const [data, setData] = useState<Workspace | null>(null),
    [needsLogin, setNeedsLogin] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [online, setOnline] = useState(true),
    [sharing, setSharing] = useState(false),
    [gpsMessage, setGpsMessage] = useState(""),
    [lastSent, setLastSent] = useState(""),
    [simulated, setSimulated] = useState(false),
    [code, setCode] = useState(""),
    [clock, setClock] = useState(0);
  const watch = useRef<number | null>(null),
    timer = useRef<ReturnType<typeof setInterval> | null>(null),
    sending = useRef(false),
    lastPosition = useRef<GeolocationPosition | null>(null),
    lastAck = useRef(0);
  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/driver");
      const d = await r.json();
      if (r.status === 401 || r.status === 403) {
        setNeedsLogin(true);
        setData(null);
        return;
      }
      if (!r.ok) throw new Error(d.error);
      setData(d);
      setClock(Date.now());
      setNeedsLogin(false);
      setError("");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudo consultar tu turno.",
      );
    }
  }, []);
  useEffect(() => {
    queueMicrotask(() => void load());
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);
  const clearGps = useCallback(() => {
    if (watch.current !== null) {
      navigator.geolocation.clearWatch(watch.current);
      watch.current = null;
    }
    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
    lastPosition.current = null;
  }, []);
  const stopGps = useCallback(() => {
    clearGps();
    setSharing(false);
  }, [clearGps]);
  const activeStatus = data?.active?.status;
  useEffect(() => {
    if (activeStatus !== "on_the_way") queueMicrotask(stopGps);
  }, [activeStatus, stopGps]);
  useEffect(() => () => clearGps(), [clearGps]);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    queueMicrotask(update);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  useEffect(() => {
    const visibility = () => {
      if (document.hidden && watch.current !== null)
        setGpsMessage(
          "Al cambiar de app o bloquear el teléfono, el navegador puede pausar el GPS. Mantén esta pantalla abierta para compartirlo.",
        );
    };
    document.addEventListener("visibilitychange", visibility);
    return () => document.removeEventListener("visibilitychange", visibility);
  }, []);
  async function command(body: unknown) {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/driver", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      await load();
      if (
        body &&
        typeof body === "object" &&
        "action" in body &&
        body.action === "delivered"
      )
        setCode("");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudo guardar el cambio.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function startGps() {
    const order = data?.active;
    if (!order || order.status !== "on_the_way") return;
    if (!window.isSecureContext) {
      setGpsMessage("El GPS requiere una conexión HTTPS segura.");
      return;
    }
    setGpsMessage("");
    setSharing(true);
    lastAck.current = 0;
    const publish = async (
      p: { lat: number; lng: number; accuracy_m: number; recorded_at: string },
      stamp: number,
    ) => {
      if (sending.current || stamp === lastAck.current) return;
      sending.current = true;
      try {
        const r = await fetch("/api/driver/gps", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            assignment_id: order.assignment_id,
            ...p,
            simulated,
          }),
        });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        lastAck.current = stamp;
        setLastSent(new Date().toISOString());
        setGpsMessage("");
      } catch (e) {
        setGpsMessage(
          e instanceof Error ? e.message : "Sin conexión para publicar GPS.",
        );
      } finally {
        sending.current = false;
      }
    };
    if (simulated) {
      const tick = () => {
        const now = Date.now();
        void publish(
          {
            lat: order.destination.lat,
            lng: order.destination.lng,
            accuracy_m: 5,
            recorded_at: new Date(now).toISOString(),
          },
          now,
        );
      };
      tick();
      timer.current = setInterval(tick, 5000);
      return;
    }
    if (!navigator.geolocation) {
      setGpsMessage("Tu navegador no ofrece GPS.");
      setSharing(false);
      return;
    }
    watch.current = navigator.geolocation.watchPosition(
      (p) => {
        lastPosition.current = p;
      },
      (e) => {
        setGpsMessage(
          e.code === 1
            ? "Permiso GPS denegado. Habilítalo en los ajustes del navegador."
            : "No hay una posición GPS válida. Revisa la señal y mantén esta pantalla abierta.",
        );
        if (e.code === 1) stopGps();
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 },
    );
    const tick = () => {
      const p = lastPosition.current;
      if (p)
        void publish(
          {
            lat: p.coords.latitude,
            lng: p.coords.longitude,
            accuracy_m: p.coords.accuracy,
            recorded_at: new Date(p.timestamp).toISOString(),
          },
          p.timestamp,
        );
    };
    timer.current = setInterval(tick, 5000);
  }
  async function logout() {
    stopGps();
    await fetch("/api/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "logout" }),
    });
    setData(null);
    setNeedsLogin(true);
  }
  if (needsLogin)
    return <TeamLogin target="driver" onLogin={() => void load()} />;
  if (!data)
    return (
      <main id="main" className="workspace">
        <p className="eyebrow">
          REPARTIDORES / {installation.restaurant.name.toUpperCase()}
        </p>
        <h1>
          Vamos
          <br />
          <span>paso a paso.</span>
        </h1>
        {error ? (
          <p className="notice">{error}</p>
        ) : (
          <p className="empty-state">
            <RefreshCw size={18} className="spin" /> Verificando tu cuenta…
          </p>
        )}
        <button className="outline-button" onClick={() => void load()}>
          Reintentar
        </button>
        <Link href="/" className="text-link">
          Volver al restaurante
        </Link>
      </main>
    );
  const order = data.active,
    navPoint =
      order && (order.status === "assigned" ? order.pickup : order.destination);
  return (
    <>
      <header className="team-header">
        <Link href="/" className="team-brand">
          CYBR <span>/ REPARTIDORES</span>
        </Link>
        <button aria-label="Cerrar sesión" onClick={() => void logout()}>
          <LogOut size={18} />
        </button>
      </header>
      <main id="main" className="driver-main">
        <div className="driver-welcome">
          <div>
            <p className="eyebrow">
              {installation.restaurant.name.toUpperCase()} / TU TURNO
            </p>
            <h1>
              Hola, <span>{data.driver.full_name}.</span>
            </h1>
          </div>
          <Bike size={34} color="var(--green)" />
        </div>
        {!online && (
          <p className="notice" role="alert">
            Estás sin conexión. Los cambios no se confirman hasta recuperar
            internet.
          </p>
        )}
        {error && (
          <p className="notice" role="alert">
            {error}
          </p>
        )}
        <button
          className={`shift-toggle ${data.driver.is_available ? "on" : ""}`}
          disabled={busy || !online}
          onClick={() =>
            void command({
              action: "availability",
              available: !data.driver.is_available,
            })
          }
        >
          <span className="dot" />
          <div>
            <strong>
              {data.driver.is_available ? "Estoy en turno" : "Fuera de turno"}
            </strong>
            <small>
              {data.driver.is_available
                ? "Disponible para asignación"
                : "Actívalo para recibir pedidos"}
            </small>
          </div>
          <span>{data.driver.is_available ? "DESACTIVAR" : "ACTIVAR"}</span>
        </button>
        {order ? (
          <section className="delivery-panel">
            <div className="section-heading">
              <div>
                <span className="eyebrow">TU ENTREGA ACTIVA</span>
                <h2>Pedido #{order.order_number}</h2>
              </div>
              <span className="outline-tag">{statusLabels[order.status]}</span>
            </div>
            <div className="delivery-stop">
              <span>01</span>
              <div>
                <small>
                  RECOGER EN {installation.restaurant.name.toUpperCase()}
                </small>
                <p>{order.pickup_address}</p>
              </div>
            </div>
            <div className="delivery-stop">
              <span>02</span>
              <div>
                <small>ENTREGAR A {order.customer_name.toUpperCase()}</small>
                <p>{order.address}</p>
                {order.instructions && (
                  <p className="field-hint">{order.instructions}</p>
                )}
                <a className="text-link" href={`tel:${order.customer_phone}`}>
                  <Phone size={13} />
                  {order.customer_phone}
                </a>
              </div>
            </div>
            <div className="delivery-basket">
              {order.items.map((i, n) => (
                <p key={n}>
                  {i.quantity} × {i.name}
                </p>
              ))}
              <strong>Cobrar en efectivo: {money(order.total_cents)}</strong>
            </div>
            {navPoint && (
              <a
                className="outline-button full"
                target="_blank"
                rel="noreferrer"
                href={`https://www.google.com/maps/dir/?api=1&destination=${navPoint.lat},${navPoint.lng}&travelmode=driving`}
              >
                <Navigation size={16} /> Abrir navegación a{" "}
                {order.status === "assigned" ? "recogida" : "entrega"}
              </a>
            )}
            <p className="field-hint navigation-hint">
              Al abrir otra app, el GPS de esta web puede pausarse. Regresa a
              esta pantalla para continuar compartiendo ubicación.
            </p>
            <div className="delivery-actions">
              {order.assignment_status === "offered" ? (
                <>
                  <button
                    className="button full"
                    disabled={busy || !online}
                    onClick={() =>
                      void command({
                        action: "respond",
                        assignment_id: order.assignment_id,
                        accept: true,
                      })
                    }
                  >
                    Aceptar asignación <Check size={17} />
                  </button>
                  <button
                    className="outline-button full"
                    disabled={busy || !online}
                    onClick={() =>
                      void command({
                        action: "respond",
                        assignment_id: order.assignment_id,
                        accept: false,
                      })
                    }
                  >
                    Rechazar asignación
                  </button>
                </>
              ) : (
                <>
                  {order.status === "assigned" && (
                    <button
                      className="button full"
                      disabled={busy || !online}
                      onClick={() =>
                        void command({
                          action: "picked_up",
                          order_id: order.id,
                        })
                      }
                    >
                      Confirmar recogida <Check size={17} />
                    </button>
                  )}
                  {order.status === "picked_up" && (
                    <button
                      className="button full"
                      disabled={busy || !online}
                      onClick={() =>
                        void command({
                          action: "on_the_way",
                          order_id: order.id,
                        })
                      }
                    >
                      Salir a entrega <Navigation size={17} />
                    </button>
                  )}
                </>
              )}
              {order.status === "on_the_way" && (
                <>
                  <div className="gps-panel">
                    <div>
                      <RadioTower size={21} />
                      <strong>Compartir ubicación</strong>
                    </div>
                    <p>
                      Solo durante esta entrega y con tu permiso. No se
                      garantiza seguimiento con el teléfono bloqueado.
                    </p>
                    {process.env.NEXT_PUBLIC_ENABLE_GPS_SIMULATION === "true" &&
                      order.is_demo && (
                        <label className="choice">
                          <input
                            type="checkbox"
                            checked={simulated}
                            disabled={sharing}
                            onChange={(e) => setSimulated(e.target.checked)}
                          />
                          Modo de simulación (solo demo)
                        </label>
                      )}
                    {simulated && (
                      <p className="notice">
                        SIMULACIÓN: se publicará una posición ficticia en el
                        destino, marcada como simulada. No es GPS real.
                      </p>
                    )}
                    <button
                      className={
                        sharing ? "outline-button full" : "button full"
                      }
                      onClick={() => (sharing ? stopGps() : void startGps())}
                      disabled={!online}
                    >
                      {sharing ? (
                        <>
                          <Radio size={16} />
                          Detener ubicación
                        </>
                      ) : (
                        <>
                          <LocateFixed size={16} />
                          Compartir GPS{simulated ? " simulado" : " real"}
                        </>
                      )}
                    </button>
                    {lastSent && (
                      <p className="field-hint">
                        Último envío:{" "}
                        {new Date(lastSent).toLocaleTimeString("es-SV", {
                          timeZone: "America/El_Salvador",
                        })}
                        {clock - Date.parse(lastSent) > 30000
                          ? " · Sin actualización reciente"
                          : ""}
                      </p>
                    )}
                    {gpsMessage && (
                      <p className="notice" role="status">
                        {gpsMessage}
                      </p>
                    )}
                  </div>
                  <LocationMap
                    point={order.destination}
                    label="Dirección de entrega"
                  />
                  <button
                    className="outline-button full"
                    disabled={busy || !online}
                    onClick={() =>
                      void command({ action: "arrived", order_id: order.id })
                    }
                  >
                    Marcar llegada <MapPin size={16} />
                  </button>
                  <form
                    className="confirm-delivery"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void command({
                        action: "delivered",
                        order_id: order.id,
                        code,
                      });
                    }}
                  >
                    <label className="field">
                      Código que te dará el cliente
                      <input
                        name="delivery_code"
                        inputMode="numeric"
                        pattern="[0-9]{6}"
                        maxLength={6}
                        minLength={6}
                        value={code}
                        onChange={(e) =>
                          setCode(e.target.value.replace(/\D/g, ""))
                        }
                        placeholder="000000"
                        required
                        autoComplete="off"
                      />
                    </label>
                    <p className="field-hint">
                      Confirma solo después de entregar y cobrar{" "}
                      {money(order.total_cents)}. Máximo cinco intentos de
                      código.
                    </p>
                    <button className="button full" disabled={busy || !online}>
                      Confirmar entrega y cobro <Check size={17} />
                    </button>
                  </form>
                </>
              )}
            </div>
          </section>
        ) : (
          <section className="driver-empty">
            <Bike size={36} />
            <h2>Todo listo para la próxima.</h2>
            <p>
              {data.driver.is_available
                ? "Sin pedidos asignados. Mantén esta pantalla abierta para recibir el siguiente."
                : "Ponte en turno para que el restaurante pueda asignarte pedidos."}
            </p>
          </section>
        )}
        <p className="field-hint">
          En iPhone: Compartir → Agregar a inicio. La ubicación solo se comparte
          de forma confiable mientras mantienes esta pantalla abierta.
        </p>
        <section className="driver-history">
          <h2>Tus últimas entregas</h2>
          {data.history.length ? (
            data.history.map((h, i) => (
              <div className="tracking-item" key={i}>
                <span>
                  #{h.order_number}
                  <small>
                    {(
                      {
                        completed: "Entregado",
                        rejected: "Asignación rechazada",
                        cancelled: "Asignación cancelada",
                        expired: "Asignación vencida",
                      } as Record<string, string>
                    )[h.assignment_status || ""] || statusLabels[h.status]}{" "}
                    ·{" "}
                    {h.ended_at
                      ? new Date(h.ended_at).toLocaleDateString("es-SV", {
                          timeZone: "America/El_Salvador",
                        })
                      : ""}
                  </small>
                </span>
                <strong>{money(h.total_cents)}</strong>
              </div>
            ))
          ) : (
            <p className="field-hint">
              Tu historial aparecerá aquí al finalizar asignaciones.
            </p>
          )}
        </section>
      </main>
    </>
  );
}
