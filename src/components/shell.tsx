import Link from "next/link";
import { installation } from "@/config/installation";
import Image from "next/image";
import { ArrowUpRight, ArrowLeft } from "lucide-react";
export function Brand() { return <Link href="/" className="brand" aria-label="CYBR DELIVERY, inicio"><span className="brand-symbol">C<span><ArrowUpRight size={21}/></span></span><span>{installation.brand.name}<span className="brand-sub">{installation.brand.descriptor}</span></span></Link>; }
export function Header({ back = false }: { back?: boolean }) { return <header className="header"><Brand/><nav aria-label="Navegación principal">{back ? <Link href="/"><ArrowLeft size={14}/> Inicio</Link> : <><a href="#interfaces">Explorar sistema <ArrowUpRight size={14}/></a><Link className="nav-admin" href="/admin">Administración <ArrowUpRight size={14}/></Link></>}</nav></header>; }
export function Footer() { return <footer><span>CYBR DELIVERY © 2026</span><span className="footer-location">SAN SALVADOR / EL SALVADOR</span><span className="made">BY <Image src="/kiru-icon.svg" width={17} height={17} alt=""/> KIRU</span></footer>; }
