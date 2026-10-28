"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { installation } from "@/config/installation";
import { ArrowLeft, Check, RefreshCw, KeyRound, MapPin } from "lucide-react";
import {
  money,
  statusLabels,
  type Tracking as OrderTracking,
  type LocationPoint,
} from "@/lib/commerce/contracts";
import { LocationMap } from "@/components/location-map";
export function TrackingPage() {
  const [order, setOrder] = useState<
      (OrderTracking & { destination?: LocationPoint }) | null
    >(null),
    [error, setError] = useState(""),
    [updated, setUpdated] = useState("");
  useEffect(() => {
    const token = new URLSearchParams(window.location.hash.slice(1)).get(
      "token",
    );
    if (!token) {
      queueMicrotask(() =>
        setError(
          "Abre el enlace privado que recibiste al confirmar tu pedido.",
        ),
      );
      return;
    }
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const load = async () => {
      try {
        const r = await fetch("/api/tracking", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = await r.json();
        if (!r.ok) throw new Error(data.error);
        if (cancelled) return;
        setOrder(data);
        setError("");
        setUpdated(
          new Date().toLocaleTimeString("es-SV", {
            timeZone: "America/El_Salvador",
          }),
        );
        if (!["delivered", "cancelled"].includes(data.status))
          timer = setTimeout(load, 5000);
      } catch (e) {
        if (cancelled) return;
        setError(
          e instanceof Error ? e.message : "No se pudo actualizar el pedido.",
        );
        timer = setTimeout(load, 10000);
      }
    };
    void load();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);
  const states = [
      "pending",
      "accepted",
      "preparing",
      "ready_for_pickup",
      "assigned",
      "picked_up",
      "on_the_way",
      "delivered",
    ],
    index = states.indexOf(order?.status || "");
  return (
    <main id="main" className="tracking-page">
      <Link href="/" className="text-link">
        <ArrowLeft size={15} /> Volver a {installation.restaurant.name}
      </Link>
      <div className="eyebrow">SEGUIMIENTO PRIVADO / TU PEDIDO</div>
      <h1>
        {order ? (
          <>
            Pedido <span>#{order.order_number}</span>
          </>
        ) : (
          <>
            Tu pedido.
            <br />
            <span>En buenas manos.</span>
          </>
        )}
      </h1>
      {error && (
        <p className="notice" role="alert">
          {error}
          {order && " La información mostrada es la última recibida."}
        </p>
      )}
      {!order && !error && (
        <p className="empty-state">
          <RefreshCw className="spin" size={18} /> Buscando tu pedido…
        </p>
      )}
      {order && (
        <>
          <div className="tracking-grid">
            <section className="panel">
              <p className="eyebrow">ESTADO ACTUAL</p>
              <h2>{statusLabels[order.status] || order.status}</h2>
              <p className="field-hint">
                Última consulta: {updated} · El Salvador
              </p>
              {order.status === "cancelled" ? (
                <p className="notice">
                  El restaurante canceló este pedido. No se realizará el cobro
                  contra entrega.
                </p>
              ) : (
                <ol className="timeline">
                  {states.map((s, i) => (
                    <li key={s} className={i <= index ? "done" : ""}>
                      <span>
                        {i < index ? (
                          <Check size={12} />
                        ) : (
                          String(i + 1).padStart(2, "0")
                        )}
                      </span>
                      {statusLabels[s]}
                    </li>
                  ))}
                </ol>
              )}
            </section>
            <section className="panel">
              <p className="eyebrow">EL RESUMEN</p>
              <h2>Gracias, {order.customer_name}.</h2>
              {order.items.map((item, i) => (
                <div key={i} className="tracking-item">
                  <span>
                    {item.quantity} × {item.name}
                  </span>
                  <strong>{money(item.line_total_cents)}</strong>
                </div>
              ))}
              <div className="tracking-item total">
                <span>Total · efectivo</span>
                <strong>{money(order.total_cents)}</strong>
              </div>
              <p className="tracking-address">
                <MapPin size={16} />
                {order.address}
              </p>
              {order.delivery_code && (
                <div className="delivery-code">
                  <KeyRound size={20} />
                  <div>
                    <span>CÓDIGO DE ENTREGA</span>
                    <strong>{order.delivery_code}</strong>
                    <p>
                      Compártelo con el repartidor solo cuando recibas tu
                      pedido.
                    </p>
                  </div>
                </div>
              )}
            </section>
          </div>
          {order.status === "on_the_way" && (
            <section className="panel live-location">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">/ EN LA ÚLTIMA MILLA</p>
                  <h2>Ya vamos en camino.</h2>
                </div>
                <span className="outline-tag">
                  {order.location?.is_simulated
                    ? "UBICACIÓN SIMULADA / PRUEBA"
                    : order.location?.is_stale
                      ? "ÚLTIMA POSICIÓN CONOCIDA"
                      : "SEGUIMIENTO"}
                </span>
              </div>
              {order.location ? (
                <>
                  <p
                    className={
                      order.location.is_stale ? "notice" : "field-hint"
                    }
                  >
                    {order.location.is_stale
                      ? "El GPS dejó de actualizarse. Esta posición está desactualizada."
                      : "Ubicación recibida del dispositivo del repartidor."}{" "}
                    Último GPS:{" "}
                    {new Date(order.location.recorded_at!).toLocaleTimeString(
                      "es-SV",
                      { timeZone: "America/El_Salvador" },
                    )}
                    .
                  </p>
                  <p className="field-hint">
                    Precisión reportada: ±
                    {Math.round(order.location.accuracy_m || 0)} m.
                  </p>
                  {order.destination && (
                    <LocationMap
                      point={order.destination}
                      driver={order.location}
                      label="Última ubicación del repartidor y destino"
                    />
                  )}
                </>
              ) : (
                <p className="notice">
                  Esperando una posición GPS válida del repartidor. No se
                  muestra una ubicación inventada.
                </p>
              )}
            </section>
          )}
          <p className="field-hint tracking-privacy">
            Este enlace permite consultar tu pedido. No lo publiques ni lo
            compartas con terceros. Vence después de siete días.
          </p>
        </>
      )}
    </main>
  );
}
