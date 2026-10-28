import Link from "next/link";
export default function NotFound() {
  return (
    <main id="main" className="workspace">
      <span className="eyebrow">/404 — RUTA NO ENCONTRADA</span>
      <h1>Fuera de ruta.</h1>
      <p>Esta página no existe.</p>
      <Link href="/" className="button">
        Volver al inicio ↗
      </Link>
    </main>
  );
}
