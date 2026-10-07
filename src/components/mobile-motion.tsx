"use client";
import dynamic from "next/dynamic";
import {usePathname} from "next/navigation";
import {useEffect,useState} from "react";
const Effects=dynamic(()=>import("./touch-motion"),{ssr:false});
export function MobileMotion(){const path=usePathname();const [enabled,setEnabled]=useState(false);useEffect(()=>{const query=matchMedia("(max-width:1023px) and (prefers-reduced-motion:no-preference)");const update=()=>setEnabled(query.matches&&(path.startsWith("/shop")||path.startsWith("/product")));update();query.addEventListener("change",update);return()=>query.removeEventListener("change",update);},[path]);return enabled?<Effects/>:null;}
