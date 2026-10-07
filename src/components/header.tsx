"use client";
import Link from "next/link";
import { lockPageScroll } from "@/lib/scroll-lock";
import { useEffect, useRef, useState } from "react";
import { useCatalogue } from "./catalogue-provider";
import { useStore } from "./store";
export function Header({ home = false }: { home?: boolean }) {
  const { getSite } = useCatalogue();
  const { count, favourites, openBag } = useStore(),
    [menu, setMenu] = useState(false),
    header = useRef<HTMLElement>(null),
    button = useRef<HTMLButtonElement>(null);
  const overlay=useRef<HTMLDialogElement>(null);
  useEffect(()=>{
    if(!menu)return;
    const el=overlay.current;if(!el)return;
    el.showModal();const unlock=lockPageScroll();let active=true;let cleanup=()=>{};
    const desktop=matchMedia("(min-width:1024px)");
    const closeOnDesktop=()=>{if(desktop.matches)setMenu(false);};
    desktop.addEventListener("change",closeOnDesktop);
    if(!matchMedia("(prefers-reduced-motion: reduce)").matches)void import("gsap").then(({gsap})=>{if(active){const ctx=gsap.context(()=>{gsap.fromTo(el.querySelectorAll("nav a"),{y:18,opacity:0},{y:0,opacity:1,duration:.5,stagger:.055,clearProps:"transform,opacity"});});cleanup=()=>ctx.revert();}});
    return ()=>{active=false;desktop.removeEventListener("change",closeOnDesktop);cleanup();el.close();unlock();button.current?.focus({preventScroll:true});};
  },[menu]);
  useEffect(() => {
    let previous = window.scrollY;
    const scroll = () => {
      const el = header.current;
      if (!el) return;
      const y = window.scrollY;
      if(Math.abs(y-previous)<8&&y>40)return;
      el.classList.toggle("scrolled", y > 40 || !home);
      el.classList.toggle(
        "header-hidden",
        !matchMedia("(prefers-reduced-motion: reduce)").matches &&
          y > 200 &&
          y > previous &&
          !el.contains(document.activeElement) &&
          !menu,
      );
      previous = y;
    };
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape" && menu) {
        setMenu(false);
        button.current?.focus();
      }
    };
    window.addEventListener("scroll", scroll, { passive: true });
    window.addEventListener("keydown", close);
    scroll();
    return () => {
      window.removeEventListener("scroll", scroll);
      window.removeEventListener("keydown", close);
    };
  }, [home, menu]);
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header ref={header} className={`site-header ${home ? "" : "scrolled"}`}>
        <Link
          prefetch={false}
          href="/"
          className="logo"
          aria-label="Libaas home"
        >
          <img
            src="/brand/logo-display.webp"
            alt="Libaas Apparel & Design"
            width="2048"
            height="2100"
          />
        </Link>
        <nav
          id="main-nav"
          className={menu ? "main-nav open" : "main-nav"}
          aria-label="Main navigation"
        >
          {getSite().nav.map((link) => (
            <Link
              prefetch={false}
              key={link.label}
              href={link.href}
              onClick={() => setMenu(false)}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="header-actions">
          <Link
            prefetch={false}
            className="saved-button"
            href="/wishlist/"
            aria-label={`View ${favourites.length} saved pieces`}
          >
            ♡ <span>{favourites.length}</span>
          </Link>
          <button
            className="bag-button"
            onClick={openBag}
            aria-label={`Open bag, ${count} items`}
          >
            Bag{" "}
            <span key={count} className="bag-count">
              {count}
            </span>
          </button>
          <button
            ref={button}
            className="menu-button"
            aria-expanded={menu}
            aria-controls="mobile-navigation"
            aria-label={menu ? "Close menu" : "Open menu"}
            onClick={() => setMenu(!menu)}
          >
            {menu ? "Close" : "Menu"}{" "}
            <span aria-hidden="true">{menu ? "−" : "+"}</span>
          </button>
        </div>
      </header>
      <dialog ref={overlay} id="mobile-navigation" className="mobile-navigation" aria-label="Main menu" onCancel={()=>setMenu(false)} data-lenis-prevent>
        <div className="mobile-menu-top"><img src="/brand/logo-display.webp" alt="Libaas" width="76" height="78"/><button className="text-button" onClick={()=>setMenu(false)}>Close ×</button></div>
        <nav aria-label="Mobile navigation">{[...getSite().nav,{label:"Track order",href:"/track/"},{label:`Saved pieces (${favourites.length})`,href:"/wishlist/"}].map(link=><Link prefetch={false} key={link.href} href={link.href} onClick={()=>setMenu(false)}>{link.label}</Link>)}</nav>
      </dialog>
    </>
  );
}
