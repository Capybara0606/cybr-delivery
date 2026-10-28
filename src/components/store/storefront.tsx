"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  Plus,
  Minus,
  ShoppingBag,
  X,
  MapPin,
  Coffee,
  LocateFixed,
  Check,
  LoaderCircle,
} from "lucide-react";
import {
  cartLineSchema,
  money,
  type Catalog,
  type CartLine,
  type Product,
  type LocationPoint,
} from "@/lib/commerce/contracts";
import { useModalFocus } from "@/components/use-modal-focus";
import { LocationMap } from "@/components/location-map";
import { installation } from "@/config/installation";
import { Footer } from "@/components/shell";
type BasketLine = CartLine & { key: string };
export function Storefront() {
  const router = useRouter();
  const [catalog, setCatalog] = useState<Catalog | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [category, setCategory] = useState("all"),
    [basket, setBasket] = useState<BasketLine[]>([]),
    [cartOpen, setCartOpen] = useState(false),
    [product, setProduct] = useState<Product | null>(null),
    [choices, setChoices] = useState<string[]>([]),
    [quantity, setQuantity] = useState(1),
    [placing, setPlacing] = useState(false),
    [notice, setNotice] = useState(""),
    [point, setPoint] = useState<LocationPoint | null>(null),
    [geoBusy, setGeoBusy] = useState(false),
    [locationConfirmed, setLocationConfirmed] = useState(false);
  const [idempotency, setIdempotency] = useState("");
  useEffect(() => {
    fetch("/api/catalog")
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        setIdempotency(
          localStorage.getItem("cybr-checkout-key") || crypto.randomUUID(),
        );
        setCatalog(d);
        setPoint({ lat: d.restaurant.lat, lng: d.restaurant.lng });
        try {
          const saved = JSON.parse(
            localStorage.getItem(`cybr-cart:${d.restaurant.id}`) || "[]",
          );
          setBasket(
            saved.map((x: unknown) => {
              const parsed = cartLineSchema.parse(x);
              return { ...parsed, key: crypto.randomUUID() };
            }),
          );
        } catch {
          setBasket([]);
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    if (catalog)
      localStorage.setItem(
        `cybr-cart:${catalog.restaurant.id}`,
        JSON.stringify(
          basket.map(({ key, ...line }) => {
            void key;
            return line;
          }),
        ),
      );
  }, [basket, catalog]);
  const linePrice = (line: CartLine) => {
    const p = catalog?.products.find((x) => x.id === line.product_id);
    return (
      (p?.price_cents || 0) +
      (line.options || []).reduce(
        (sum, id) =>
          sum +
          (catalog?.values.find((v) => v.id === id)?.extra_price_cents || 0),
        0,
      )
    );
  };
  const subtotal = basket.reduce(
      (sum, l) => sum + linePrice(l) * l.quantity,
      0,
    ),
    count = basket.reduce((sum, l) => sum + l.quantity, 0);
  const visible = useMemo(
    () =>
      catalog?.products.filter(
        (p) => category === "all" || p.category_id === category,
      ) || [],
    [catalog, category],
  );
  useModalFocus(!!product || cartOpen, () => {
    if (!placing) {
      setProduct(null);
      setCartOpen(false);
    }
  });
  const changeBasket = (next: BasketLine[]) => {
    setBasket(next);
    const key = crypto.randomUUID();
    setIdempotency(key);
    localStorage.setItem("cybr-checkout-key", key);
  };
  const openProduct = (p: Product) => {
    setProduct(p);
    setChoices([]);
    setQuantity(1);
    setNotice("");
  };
  function addProduct() {
    if (!product || !catalog) return;
    for (const g of catalog.options.filter(
      (g) => g.product_id === product.id,
    )) {
      const n = choices.filter((id) =>
        catalog.values.some((v) => v.id === id && v.option_id === g.id),
      ).length;
      if (n < g.min_choices || n > g.max_choices) {
        setNotice(
          `Selecciona entre ${g.min_choices} y ${g.max_choices} opciones de ${g.name}.`,
        );
        return;
      }
    }
    changeBasket([
      ...basket,
      {
        key: crypto.randomUUID(),
        product_id: product.id,
        quantity,
        options: choices,
      },
    ]);
    setProduct(null);
    setNotice("");
  }
  const locate = () => {
    if (!navigator.geolocation) {
      setNotice("Tu navegador no ofrece ubicación. Selecciónala en el mapa.");
      return;
    }
    setGeoBusy(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setPoint({ lat: p.coords.latitude, lng: p.coords.longitude });
        setGeoBusy(false);
      },
      () => {
        setNotice(
          "No pudimos obtener tu ubicación. Puedes usar el mapa o escribir coordenadas.",
        );
        setGeoBusy(false);
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };
  async function checkout(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!point || placing) return;
    setPlacing(true);
    setNotice("");
    const fields = new FormData(event.currentTarget);
    localStorage.setItem("cybr-checkout-key", idempotency);
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fields.get("name"),
          phone: fields.get("phone"),
          address: fields.get("address"),
          instructions: fields.get("instructions") || "",
          lat: point.lat,
          lng: point.lng,
          items: basket.map(({ key, ...line }) => {
            void key;
            return line;
          }),
          idempotency_key: idempotency,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      localStorage.removeItem(`cybr-cart:${catalog!.restaurant.id}`);
      localStorage.removeItem("cybr-checkout-key");
      router.push(`/track#token=${data.tracking_token}`);
    } catch (e) {
      setNotice(
        e instanceof Error
          ? e.message
          : "No se pudo confirmar el pedido. Puedes reintentar sin duplicarlo.",
      );
      setPlacing(false);
    }
  }
  return (
    <>
      <header className="shop-header">
        <Link href="/" className="shop-brand">
          <span className="mini-mark">↗</span>
          {catalog?.restaurant.name || installation.restaurant.name}
          <small>DELIVERY PROPIO / CYBR</small>
        </Link>
        <nav>
          <Link href="/admin" className="staff-link">
            Acceso del equipo <ArrowUpRight size={14} />
          </Link>
          <button
            className="bag-button"
            onClick={() => setCartOpen(true)}
            aria-label={`Abrir carrito, ${count} productos`}
          >
            <ShoppingBag size={18} />
            <span>{count.toString().padStart(2, "0")}</span>
          </button>
        </nav>
      </header>
      <main id="main" className="shop-main">
        <section className="shop-hero">
          <div>
            <p className="eyebrow">
              <span className="dot" />{" "}
              {(
                catalog?.restaurant.name || installation.restaurant.name
              ).toUpperCase()}{" "}
              / SAN SALVADOR
            </p>
            <h1>
              {installation.copy.headline}
              <br />
              <span>{installation.copy.highlight}</span>
            </h1>
            <p>{installation.copy.description}</p>
            <a href="#menu" className="button">
              Explorar el menú <ArrowUpRight size={18} />
            </a>
            <div className="shop-facts">
              <span>
                <MapPin size={13} />{" "}
                {catalog ? catalog.settings.delivery_radius_m / 1000 : 3} KM DE
                COBERTURA
              </span>
              <span>
                ENVÍO{" "}
                {catalog
                  ? money(catalog.settings.delivery_fee_cents)
                  : "POR CONFIGURAR"}
              </span>
            </div>
          </div>
          <div className="hero-food">
            <div className="food-photo photo-coffee" />
            <span className="photo-caption">
              IMAGEN REPRESENTATIVA / DEMOSTRACIÓN
            </span>
            <div className="hero-food-note">
              <Coffee size={18} />
              <span>
                HECHO AQUÍ.
                <br />
                ENTREGADO POR NOSOTROS.
              </span>
            </div>
          </div>
        </section>
        <div className="demo-strip">
          <span>
            {(catalog?.restaurant.is_demo ??
            installation.restaurant.isDemonstration)
              ? `${catalog?.restaurant.name || installation.restaurant.name} ES UN NEGOCIO FICTICIO DE DEMOSTRACIÓN.`
              : "PEDIDOS DIRECTOS CON TU RESTAURANTE."}
          </span>
          <span>UN RESTAURANTE. SU PROPIA PLATAFORMA.</span>
        </div>
        <section id="menu" className="menu-section">
          <div className="section-heading">
            <div>
              <span className="eyebrow">/01 — ELIGE TU MOMENTO</span>
              <h2>
                Algo rico.
                <br />
                Sin complicaciones.
              </h2>
            </div>
            {catalog && (
              <span
                className={`service-state ${catalog.settings.is_accepting_orders ? "" : "closed"}`}
              >
                <span className="dot" />
                {catalog.settings.is_accepting_orders
                  ? "RECEPCIÓN HABILITADA / SUJETO A HORARIO"
                  : "NO RECIBIMOS PEDIDOS AHORA"}
              </span>
            )}
          </div>
          {loading && (
            <p role="status" className="empty-state">
              <LoaderCircle className="spin" /> Cargando menú…
            </p>
          )}
          {error && (
            <div role="alert" className="setup-card">
              <h3>Estamos preparando esta cocina.</h3>
              <p>{error}</p>
              <p>
                El menú aparecerá al conectar la base de datos de esta
                instalación. No se aceptan pedidos todavía.
              </p>
            </div>
          )}
          {catalog && (
            <>
              <div
                className="category-tabs"
                role="group"
                aria-label="Categorías"
              >
                <button
                  aria-pressed={category === "all"}
                  onClick={() => setCategory("all")}
                >
                  Todo el menú
                </button>
                {catalog.categories.map((c) => (
                  <button
                    key={c.id}
                    aria-pressed={category === c.id}
                    onClick={() => setCategory(c.id)}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
              <div className="product-grid">
                {visible.map((p) => (
                  <button
                    className="product-card"
                    key={p.id}
                    onClick={() => openProduct(p)}
                  >
                    <div
                      className={`food-photo ${photoClass(catalog, p)}`}
                      style={productPhoto(p)}
                    />
                    <div className="product-copy">
                      <small>
                        {
                          catalog.categories.find((c) => c.id === p.category_id)
                            ?.name
                        }
                      </small>
                      <h3>{p.name}</h3>
                      <p>{p.description}</p>
                      <div>
                        <strong>{money(p.price_cents)}</strong>
                        <span className="add-square">
                          <Plus size={18} />
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              {!visible.length && (
                <p className="empty-state">
                  No hay productos disponibles en esta categoría.
                </p>
              )}
            </>
          )}
        </section>
      </main>
      <Footer />
      {count > 0 && !cartOpen && (
        <button className="floating-cart" onClick={() => setCartOpen(true)}>
          <ShoppingBag size={18} />
          <span>Ver mi pedido · {count}</span>
          <strong>{money(subtotal)}</strong>
        </button>
      )}
      {product && catalog && (
        <div className="modal-backdrop" onClick={() => setProduct(null)}>
          <section
            className="product-dialog dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="product-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="close-button"
              aria-label="Cerrar producto"
              onClick={() => setProduct(null)}
            >
              <X />
            </button>
            <div
              className={`food-photo ${photoClass(catalog, product)}`}
              style={productPhoto(product)}
            />
            <div className="dialog-body">
              <span className="eyebrow">PREPARADO A TU GUSTO</span>
              <h2 id="product-title">{product.name}</h2>
              <p>{product.description}</p>
              {catalog.options
                .filter((o) => o.product_id === product.id)
                .map((g) => (
                  <fieldset key={g.id}>
                    <legend>
                      {g.name}{" "}
                      <small>
                        ({g.min_choices}–{g.max_choices})
                      </small>
                    </legend>
                    {catalog.values
                      .filter((v) => v.option_id === g.id && v.is_available)
                      .map((v) => (
                        <label className="choice" key={v.id}>
                          <input
                            type={g.max_choices === 1 ? "radio" : "checkbox"}
                            name={g.id}
                            checked={choices.includes(v.id)}
                            onChange={() =>
                              setChoices((prev) =>
                                g.max_choices === 1
                                  ? [
                                      ...prev.filter(
                                        (id) =>
                                          !catalog.values.some(
                                            (x) =>
                                              x.id === id &&
                                              x.option_id === g.id,
                                          ),
                                      ),
                                      v.id,
                                    ]
                                  : prev.includes(v.id)
                                    ? prev.filter((id) => id !== v.id)
                                    : [...prev, v.id],
                              )
                            }
                          />
                          {v.name}
                          <span>+{money(v.extra_price_cents)}</span>
                        </label>
                      ))}
                  </fieldset>
                ))}
              <div className="quantity">
                <button
                  aria-label="Reducir cantidad"
                  disabled={quantity === 1}
                  onClick={() => setQuantity((q) => q - 1)}
                >
                  <Minus size={16} />
                </button>
                <span>{quantity}</span>
                <button
                  aria-label="Aumentar cantidad"
                  disabled={quantity === 99}
                  onClick={() => setQuantity((q) => q + 1)}
                >
                  <Plus size={16} />
                </button>
              </div>
              {notice && (
                <p role="alert" className="notice">
                  {notice}
                </p>
              )}
              <button className="button full" onClick={addProduct}>
                Agregar al pedido{" "}
                <span>
                  {money(
                    linePrice({
                      product_id: product.id,
                      quantity,
                      options: choices,
                    }) * quantity,
                  )}
                </span>
              </button>
            </div>
          </section>
        </div>
      )}
      {cartOpen && (
        <div
          className="modal-backdrop"
          onClick={() => !placing && setCartOpen(false)}
        >
          <section
            className="cart-dialog dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cart-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="cart-heading">
              <div>
                <span className="eyebrow">/02 — TU PEDIDO</span>
                <h2 id="cart-title">Casi en tu mesa.</h2>
              </div>
              <button
                aria-label="Cerrar carrito"
                onClick={() => setCartOpen(false)}
                disabled={placing}
              >
                <X />
              </button>
            </div>
            {!basket.length ? (
              <p className="empty-state">
                Tu carrito está vacío. Elige algo del menú.
              </p>
            ) : (
              <form onSubmit={checkout}>
                <div className="basket-lines">
                  {basket.map((line) => (
                    <div className="basket-line" key={line.key}>
                      <div>
                        <strong>
                          {catalog?.products.find(
                            (p) => p.id === line.product_id,
                          )?.name || "Producto no disponible"}
                        </strong>
                        <p>
                          {line.options
                            .map(
                              (id) =>
                                catalog?.values.find((v) => v.id === id)?.name,
                            )
                            .filter(Boolean)
                            .join(", ")}
                        </p>
                        <small>{money(linePrice(line))} por unidad</small>
                      </div>
                      <div className="quantity">
                        <button
                          type="button"
                          aria-label="Reducir producto"
                          disabled={placing}
                          onClick={() =>
                            changeBasket(
                              line.quantity === 1
                                ? basket.filter((l) => l.key !== line.key)
                                : basket.map((l) =>
                                    l.key === line.key
                                      ? { ...l, quantity: l.quantity - 1 }
                                      : l,
                                  ),
                            )
                          }
                        >
                          <Minus size={14} />
                        </button>
                        <span>{line.quantity}</span>
                        <button
                          type="button"
                          aria-label="Aumentar producto"
                          disabled={placing || line.quantity === 99}
                          onClick={() =>
                            changeBasket(
                              basket.map((l) =>
                                l.key === line.key
                                  ? { ...l, quantity: l.quantity + 1 }
                                  : l,
                              ),
                            )
                          }
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                      <strong>{money(linePrice(line) * line.quantity)}</strong>
                    </div>
                  ))}
                </div>
                <div className="checkout-fields">
                  <h3>¿Dónde lo llevamos?</h3>
                  <label>
                    Tu nombre
                    <input
                      name="name"
                      required
                      minLength={1}
                      maxLength={120}
                      autoComplete="name"
                    />
                  </label>
                  <label>
                    Teléfono
                    <input
                      name="phone"
                      type="tel"
                      required
                      maxLength={25}
                      autoComplete="tel"
                      placeholder="+503 7000 0000"
                    />
                  </label>
                  <label>
                    Dirección de entrega
                    <input
                      name="address"
                      required
                      minLength={5}
                      maxLength={500}
                      autoComplete="street-address"
                      placeholder="Calle, número de casa, colonia"
                    />
                  </label>
                  <label>
                    Indicaciones adicionales
                    <textarea
                      name="instructions"
                      maxLength={1000}
                      placeholder="Referencias para encontrar tu puerta"
                    />
                  </label>
                  <button
                    className="outline-button"
                    type="button"
                    onClick={locate}
                    disabled={geoBusy}
                  >
                    <LocateFixed size={16} />
                    {geoBusy ? "Obteniendo ubicación…" : "Usar mi ubicación"}
                  </button>
                  {point && (
                    <>
                      <LocationMap
                        point={point}
                        onPick={setPoint}
                        label="Seleccionar dirección de entrega"
                      />
                      <div className="coordinate-inputs">
                        <label>
                          Latitud
                          <input
                            aria-label="Latitud de entrega"
                            type="number"
                            step="any"
                            min={-90}
                            max={90}
                            required
                            value={point.lat}
                            onChange={(e) =>
                              setPoint({
                                ...point,
                                lat: Number(e.target.value),
                              })
                            }
                          />
                        </label>
                        <label>
                          Longitud
                          <input
                            aria-label="Longitud de entrega"
                            type="number"
                            step="any"
                            min={-180}
                            max={180}
                            required
                            value={point.lng}
                            onChange={(e) =>
                              setPoint({
                                ...point,
                                lng: Number(e.target.value),
                              })
                            }
                          />
                        </label>
                      </div>
                    </>
                  )}
                  <label className="choice">
                    <input
                      type="checkbox"
                      checked={locationConfirmed}
                      onChange={(e) => setLocationConfirmed(e.target.checked)}
                      required
                    />
                    Confirmo que el pin corresponde a mi dirección de entrega.
                  </label>
                  <p className="field-hint">
                    Fija tu ubicación exacta. La cobertura se valida al
                    confirmar; el punto inicial del mapa es la cafetería.
                  </p>
                </div>
                <div className="order-summary">
                  <p>
                    <span>Productos</span>
                    <strong>{money(subtotal)}</strong>
                  </p>
                  <p>
                    <span>Envío</span>
                    <strong>
                      {money(catalog?.settings.delivery_fee_cents || 0)}
                    </strong>
                  </p>
                  <p className="grand-total">
                    <span>Total estimado</span>
                    <strong>
                      {money(
                        subtotal + (catalog?.settings.delivery_fee_cents || 0),
                      )}
                    </strong>
                  </p>
                  <small>
                    El servidor confirmará el importe con los precios vigentes.
                  </small>
                </div>
                <div className="cash-note">
                  <Check size={17} />
                  <span>
                    Efectivo al recibir. No necesitas crear una cuenta.
                  </span>
                </div>
                {notice && (
                  <p role="alert" className="notice">
                    {notice}
                  </p>
                )}
                <button
                  className="button full"
                  type="submit"
                  disabled={placing || !catalog?.settings.is_accepting_orders}
                >
                  {placing ? (
                    <>
                      <LoaderCircle className="spin" size={17} /> Confirmando…
                    </>
                  ) : (
                    <>
                      Confirmar pedido <ArrowUpRight size={18} />
                    </>
                  )}
                </button>
              </form>
            )}
          </section>
        </div>
      )}
    </>
  );
}
function photoClass(c: Catalog, p: Product) {
  const n = c.categories.find((x) => x.id === p.category_id)?.name || "";
  return n.includes("frías")
    ? "photo-cold"
    : n.includes("Repostería")
      ? "photo-pastry"
      : n.includes("Desayuno")
        ? "photo-breakfast"
        : "photo-coffee";
}

function productPhoto(p: Product) {
  return p.image_path && process.env.NEXT_PUBLIC_SUPABASE_URL
    ? {
        backgroundImage: `url(${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-images/${p.image_path})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : undefined;
}
