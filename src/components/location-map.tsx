"use client";
import { useEffect, useRef, useState } from "react";
import type { LocationPoint } from "@/lib/commerce/contracts";
import type { Map as MapInstance, Marker as MapMarker } from "maplibre-gl";
export function LocationMap({point,onPick,label="Ubicación",driver}:{point:LocationPoint;onPick?:(p:LocationPoint)=>void;label?:string;driver?:LocationPoint|null}){
 const element=useRef<HTMLDivElement>(null),map=useRef<MapInstance|null>(null),pin=useRef<MapMarker|null>(null),rider=useRef<MapMarker|null>(null),pick=useRef(onPick);const [failed,setFailed]=useState(false);
 useEffect(()=>{pick.current=onPick;},[onPick]);
 useEffect(()=>{let disposed=false;import("maplibre-gl").then(lib=>{if(disposed||!element.current)return;try{lib.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");const instance=new lib.Map({container:element.current,style:process.env.NEXT_PUBLIC_MAP_STYLE_URL||"https://tiles.openfreemap.org/styles/liberty",center:[point.lng,point.lat],zoom:14,attributionControl:{compact:true}});map.current=instance;pin.current=new lib.Marker({color:point.is_stale?"#8a8a8a":"#1db954"}).setLngLat([point.lng,point.lat]).addTo(instance);instance.addControl(new lib.NavigationControl(),"top-right");instance.on("click",e=>pick.current?.({lat:e.lngLat.lat,lng:e.lngLat.lng}));instance.on("error",()=>setFailed(true));}catch{setFailed(true);}}).catch(()=>setFailed(true));return()=>{disposed=true;map.current?.remove();map.current=null;};
 // The initial view is captured once; subsequent coordinates update markers below.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[]);
 useEffect(()=>{if(!map.current)return;pin.current?.setLngLat([point.lng,point.lat]);if(pin.current)pin.current.getElement().style.opacity=point.is_stale?".45":"1";map.current.easeTo({center:[point.lng,point.lat],duration:300});},[point.lat,point.lng,point.is_stale]);
 useEffect(()=>{if(!map.current||!driver){rider.current?.remove();rider.current=null;return;}let disposed=false;import("maplibre-gl").then(lib=>{if(disposed||!map.current)return;rider.current?.remove();rider.current=new lib.Marker({color:driver.is_stale?"#8a8a8a":"#f3ba68"}).setLngLat([driver.lng,driver.lat]).addTo(map.current);});return()=>{disposed=true;};},[driver]);
 return <div className="map-frame"><div ref={element} className="map" role="region" aria-label={label}/>{failed&&<p className="map-warning">El mapa no pudo cargar todos sus recursos. Puedes ingresar las coordenadas manualmente.</p>}<span className="map-hint">{onPick?"TOCA EL MAPA PARA FIJAR LA ENTREGA":"UBICACIÓN DE ENTREGA"}</span></div>;
}
