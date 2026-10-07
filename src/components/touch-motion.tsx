"use client";
import {useGSAP} from "@gsap/react";
import {usePathname} from "next/navigation";
import gsap from "gsap";
import {ScrollTrigger} from "gsap/ScrollTrigger";
import {reportMotion} from "@/lib/motion-debug";
gsap.registerPlugin(useGSAP,ScrollTrigger);
ScrollTrigger.config({ignoreMobileResize:true});
export default function TouchMotion(){
 const path=usePathname();
 useGSAP(()=>{const mm=gsap.matchMedia();mm.add("(max-width:1023px) and (prefers-reduced-motion:no-preference)",ctx=>{
  const main=document.querySelector("#main");if(!main)return;
  const cards=Array.from(main.querySelectorAll(".product-card")).filter((_,i)=>i%2===0);
  if(cards.length)ScrollTrigger.batch(cards,{start:"top 96%",once:true,onEnter:batch=>{ctx.add(()=>gsap.fromTo(batch.flatMap(el=>[el,el.nextElementSibling].filter((card):card is Element=>!!card&&card.classList.contains("product-card"))),{y:24,opacity:.4},{y:0,opacity:1,duration:.65,stagger:.055,clearProps:"transform,opacity"}));}});
  const gallery=main.querySelector(".product-gallery");if(gallery)gsap.fromTo(gallery,{y:0},{y:-16,ease:"none",scrollTrigger:{trigger:gallery,start:"top 10%",end:"bottom top",scrub:.45}});
  const disc=document.querySelector(".footer-disc");if(disc)gsap.fromTo(disc,{yPercent:55},{yPercent:0,ease:"none",scrollTrigger:{trigger:disc.parentElement,start:"top bottom",end:"bottom bottom",scrub:.5}});
  let active=true;let timer:ReturnType<typeof setTimeout>;const refresh=()=>{clearTimeout(timer);timer=setTimeout(()=>{if(active)ScrollTrigger.refresh();},120);};
  document.fonts.ready.then(refresh);document.addEventListener("load",refresh,true);window.addEventListener("orientationchange",refresh);reportMotion();
  return()=>{active=false;clearTimeout(timer);document.removeEventListener("load",refresh,true);window.removeEventListener("orientationchange",refresh);};
 });return()=>{mm.revert();reportMotion();};},{dependencies:[path],revertOnUpdate:true});return null;
}
