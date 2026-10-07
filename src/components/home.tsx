"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { flushSync } from "react-dom";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { CustomEase } from "gsap/CustomEase";
import Lenis from "lenis";
import {reportMotion} from "@/lib/motion-debug";
import { getAtelier, getNotes, price } from "@/lib/catalogue";
import { useCatalogue } from "./catalogue-provider";
import { Header } from "./header";
import { Footer } from "./footer";
import { useStore } from "./store";
import { Photo } from "./photo";

gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText, CustomEase);
ScrollTrigger.config({ignoreMobileResize:true});
function Arrow() {
  return <span aria-hidden="true">↗</span>;
}
function Heart({ filled = false }: { filled?: boolean }) {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.4"
      aria-hidden="true"
    >
      <path d="M20.7 4.7a5.5 5.5 0 0 0-7.8 0L12 5.8l-.9-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.7-8.5a5.5 5.5 0 0 0 0-7.8Z" />
    </svg>
  );
}
function Label({ children }: { children: React.ReactNode }) {
  return <p className="eyebrow mono">{children}</p>;
}
function Badge() {
  return (
    <svg
      className="circle-badge"
      viewBox="0 0 120 120"
      aria-label="The Kashmir edit, Libaas"
    >
      <defs>
        <path
          id="badge-circle"
          d="M60,60 m-43,0 a43,43 0 1,1 86,0 a43,43 0 1,1 -86,0"
        />
      </defs>
      <text>
        <textPath href="#badge-circle" textLength="266">
          THE KASHMIR EDIT · LIBAAS ·{" "}
        </textPath>
      </text>
      <path d="M45 60h30m-15-15v30" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

export default function Home() {
  const { getSite, getCollections, getFeaturedProducts, getProductMedia } = useCatalogue();
const site = getSite(),
  collections = getCollections(),
  products = getFeaturedProducts(),
  atelier = getAtelier(),
  notes = getNotes();

  const root = useRef<HTMLDivElement>(null),
    grid = useRef<HTMLDivElement>(null);
  const [category, setCategory] = useState("all");
  const { favourites, toggle, add: addItem, openBag } = useStore();
  const filtered = products.filter(
    (p) => category === "all" || p.category === category,
  );
  const { contextSafe } = useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(
        {
          desktop: "(min-width: 1024px) and (hover: hover)",
          mobile: "(max-width: 1023px)",
          reduce: "(prefers-reduced-motion: reduce)",
        },
        (ctx) => {
          const reduce = !!ctx.conditions?.reduce,
            desktop = !!ctx.conditions?.desktop;
          document.documentElement.classList.add("js");
          if (reduce){reportMotion();return;}
          const ease = CustomEase.create("libaas-reveal", "0.16,1,0.3,1");
          const lenis = desktop ? new Lenis({
            anchors: true,
            duration: 1.05,
            smoothWheel: true,
          }) : null;
          lenis?.on("scroll", ScrollTrigger.update);
          const overlay=(event:Event)=>{if((event as CustomEvent<boolean>).detail)lenis?.stop();else lenis?.start();};window.addEventListener("store-overlay",overlay);
          const tick = (time: number) => lenis?.raf(time * 1000);
          if (lenis) gsap.ticker.add(tick);
          gsap.ticker.lagSmoothing(0);
          const split = SplitText.create(".hero-line", {
            type: "lines",
            aria: "none",
            mask: "lines",
          });
          const intro = gsap.timeline({
            defaults: { ease },
            onComplete: () => {
              split.masks.forEach((mask) => {
                (mask as HTMLElement).style.overflow = "visible";
              });
            },
          });
          intro
            .from(split.lines, { yPercent: 110, duration: desktop ? 0.9 : 0.7, stagger: 0.08 })
            .from(".hero-disc", { scale: 0.6, duration: 1 }, 0)
            .from(
              ".hero-arch .photo",
              {
                clipPath: "inset(100% 0 0 0)",
                scale: 1.15,
                duration: desktop ? 1.1 : 0.8,
                stagger: 0.12,
              },
              0.15,
            );
          const rotation = gsap.to(".circle-badge", {
            rotation: 360,
            duration: 40,
            ease: "none",
            repeat: -1,
          });
          const hero = gsap.timeline({
            scrollTrigger: {
              trigger: ".hero",
              start: "top top",
              end: "bottom top",
              scrub: desktop ? 0.8 : 0.5,
              onToggle: (self) =>
                self.isActive ? rotation.play() : rotation.pause(),
            },
          });
          hero
            .to(".hero-arch", { y: (i) => -(i + 1) * (desktop ? 22 : 10), ease: "none" }, 0)
            .to(".hero-disc", { y: desktop?100:30, x: desktop?40:12, ease: "none" }, 0)
            .fromTo(
              ".word-fill",
              { clipPath: "inset(100% 0 0 0)" },
              { clipPath: "inset(0% 0 0 0)", ease: "none" },
              0,
            );
          const viewport =
              root.current!.querySelector<HTMLElement>(".rail-viewport")!,
            track = root.current!.querySelector<HTMLElement>(".rail-track")!;
          let focusRail: ((event: FocusEvent) => void) | undefined;
          if (desktop) {
            viewport.classList.add("is-pinned");
            const rail = gsap.timeline({
              scrollTrigger: {
                trigger: ".collections",
                start: "top top",
                end: () =>
                  `+=${Math.max(1, track.scrollWidth - viewport.clientWidth)}`,
                pin: true,
                scrub: desktop ? 0.8 : 0.5,
                invalidateOnRefresh: true,
                onUpdate: (self) => {
                  const counter = root.current?.querySelector(".rail-counter");
                  if (counter)
                    counter.textContent = `0${Math.min(4, 1 + Math.floor(self.progress * 4))} / 04`;
                },
              },
            });
            rail
              .to(
                track,
                {
                  x: () => -(track.scrollWidth - viewport.clientWidth),
                  ease: "none",
                },
                0,
              )
              .fromTo(
                ".rail-progress span",
                { scaleX: 0.25 },
                { scaleX: 1, ease: "none" },
                0,
              )
              .fromTo(
                ".rail-panel .photo",
                { xPercent: -3, scale: 1.08 },
                { xPercent: 3, scale: 1.08, ease: "none" },
                0,
              );
            focusRail = (event) => {
              const target = (event.target as HTMLElement).closest<HTMLElement>(
                ".rail-panel",
              );
              if (!target) return;
              const trigger = rail.scrollTrigger!;
              viewport.scrollLeft = 0;
              const distance = track.scrollWidth - viewport.clientWidth;
              const ratio = Math.min(
                1,
                Math.max(0, target.offsetLeft / distance),
              );
              lenis?.scrollTo(
                trigger.start + (trigger.end - trigger.start) * ratio,
                { immediate: true },
              );
              rail.progress(ratio);
            };
            viewport.addEventListener("focusin", focusRail);
          }
          const revealGroups = root.current!.querySelectorAll(".product-group");
          const revealTargets=desktop?Array.from(revealGroups):Array.from(root.current!.querySelectorAll(".product-card")).filter((_,i)=>i%2===0);
          ScrollTrigger.batch(revealTargets, {
            start: "top 95%",
            once: true,
            onEnter: (batch) => {
              ctx.add(() => {
                const cards = batch.flatMap((el) =>
                  desktop?Array.from(el.querySelectorAll(".product-card")):[el,el.nextElementSibling].filter((card):card is Element=>!!card&&card.classList.contains("product-card")),
                );
                gsap.fromTo(
                  cards,
                  { y: 48, opacity: 0 },
                  {
                    y: 0,
                    opacity: 1,
                    duration: 0.8,
                    stagger: 0.08,
                    ease,
                    clearProps: "transform,opacity",
                  },
                );
              });
            },
          });
          gsap.fromTo(
            ".atelier-backdrop",
            { yPercent: desktop?-12:-8, scale: 1.2 },
            {
              yPercent: desktop?12:8,
              scale: 1.2,
              ease: "none",
              scrollTrigger: {
                trigger: ".atelier-visual",
                start: "top bottom",
                end: "bottom top",
                scrub: desktop ? 0.8 : 0.5,
              },
            },
          );
          const counters = Array.from(
            root.current!.querySelectorAll<HTMLElement>("[data-count]"),
          );
          ScrollTrigger.create({
            trigger: ".stats",
            start: "top 60%",
            once: true,
            onEnter: () => {
              ctx.add(() => {
                counters.forEach((el) => {
                  const number = { value: 0 };
                  gsap.to(number, {
                    value: Number(el.dataset.count),
                    duration: 1.1,
                    ease: "power2.out",
                    onUpdate: () => {
                      el.textContent = Math.round(number.value)
                        .toString()
                        .padStart(2, "0");
                    },
                  });
                });
              });
            },
          });
          const quote = SplitText.create(".main-quote", { type: "words" });
          gsap.fromTo(
            quote.words,
            { opacity: 0.65 },
            {
              opacity: 1,
              stagger: 0.12,
              ease: "none",
              scrollTrigger: {
                trigger: ".main-quote",
                start: "top 85%",
                end: "bottom 40%",
                scrub: desktop?.7:.5,
              },
            },
          );
          gsap.from(".note-card", {
            y: 35,
            opacity: 0,
            duration: 0.8,
            stagger: 0.12,
            ease,
            scrollTrigger: {
              trigger: ".note-cards",
              start: "top 90%",
              once: true,
            },
          });
          gsap.fromTo(
            ".footer-disc",
            { yPercent: 55 },
            {
              yPercent: 0,
              ease: "none",
              scrollTrigger: {
                trigger: ".footer-wordmark",
                start: "top bottom",
                end: "bottom bottom",
                scrub: desktop ? 0.8 : 0.5,
              },
            },
          );
          let active = true;
          let refreshTimer:ReturnType<typeof setTimeout>;
          const refresh = () => {clearTimeout(refreshTimer);refreshTimer=setTimeout(()=>{if(active)ScrollTrigger.refresh();},120);};
          window.addEventListener("orientationchange",refresh);
          reportMotion();
          document.fonts.ready.then(refresh);
          const images = Array.from(root.current!.querySelectorAll("img"));
          images.forEach((image) => image.addEventListener("load", refresh));
          ScrollTrigger.refresh();
          return () => {
            active = false;clearTimeout(refreshTimer);window.removeEventListener("orientationchange",refresh);window.removeEventListener("store-overlay",overlay);
            counters.forEach((el) => {
              el.textContent = String(el.dataset.count).padStart(2, "0");
            });
            images.forEach((image) =>
              image.removeEventListener("load", refresh),
            );
            if (focusRail) viewport.removeEventListener("focusin", focusRail);
            viewport.classList.remove("is-pinned");
            lenis?.destroy();
            gsap.ticker.remove(tick);
            split.revert();
            quote.revert();
          };
        },
        root,
      );
      return () => {mm.revert();reportMotion();};
    },
    { scope: root },
  );
  async function animateFilter(next: string) {
    if (next === category) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setCategory(next);
      return;
    }
    const { Flip } = await import("gsap/Flip");
    gsap.registerPlugin(Flip);
    if (grid.current) runFlip(Flip, next, grid.current);
  }
  const runFlip = contextSafe(
    (
      Flip: typeof import("gsap/Flip").Flip,
      next: string,
      element: HTMLDivElement,
    ) => {
      const state = Flip.getState(element.querySelectorAll(".product-card"));
      flushSync(() => setCategory(next));
      Flip.from(state, {
        duration: 0.7,
        ease: "power2.inOut",
        scale: true,
        absoluteOnLeave: true,
        onEnter: (elements) =>
          gsap.fromTo(
            elements,
            { opacity: 0, y: 24 },
            { opacity: 1, y: 0, duration: 0.7 },
          ),
        onComplete: () => ScrollTrigger.refresh(),
      });
    },
  );
  const bump = contextSafe((target: Element | null) => {
    if (
      target &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      gsap.fromTo(
        target,
        { scale: 1.2 },
        { scale: 1, duration: 0.7, ease: "back.out(2)" },
      );
  });
  function save(slug: string, target: Element) {
    toggle(slug);
    bump(target);
  }
  function add(slug: string) {
    addItem(slug);
    openBag();
  }
  return (
    <div ref={root}>
      <Header home />
      <main id="main">
        <section
          className="hero section-pad"
          id="home"
          aria-labelledby="hero-title"
        >
          <div className="hero-meta mono">
            <span>( 01 ) — THE KASHMIR EDIT</span>
            <span>ATTIRE, WITH A SENSE OF PLACE.</span>
          </div>
          <div className="hero-disc" aria-hidden="true" />
          <h1 id="hero-title">
            <span className="hero-line">
              A little of the <em>valley.</em>
            </span>
            <span className="hero-line">
              With you.{" "}
              <span className="outline-word">
                Always.
                <span className="word-fill" aria-hidden="true">
                  Always.
                </span>
              </span>
            </span>
          </h1>
          <div className="hero-bottom">
            <div className="hero-intro">
              <p>
                Soft layers. Intricate details.
                <br />A quieter way to dress.
              </p>
              <Link prefetch={false} className="button primary" href="/shop/">
                Shop the Collection <Arrow />
              </Link>
              <span className="hero-scroll mono">
                TAKE YOUR TIME <span aria-hidden="true">↓</span>
              </span>
            </div>
            <div className="hero-images">
              <Badge />
              {site.hero.map((item, i) => (
                <figure className={`hero-arch arch-${i + 1}`} key={item.slot}>
                  <Photo
                    slot={item.slot}
                    name={item.name}
                    alt={item.alt}
                    priority={i === 1}
                    sizes="(min-width: 1024px) 33vw, 34vw"
                    eager
                  />
                  <figcaption className="mono">
                    0{i + 1} / {item.name}
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
          <p className="stock-note mono">
            A study in texture, colour and detail
          </p>
        </section>
        <div className="trust-strip">
          {site.trust.map((text, i) => (
            <span key={text}>
              <span className="trust-mark" aria-hidden="true">
                {String(i + 1).padStart(2, "0")}
              </span>
              {text}
            </span>
          ))}
        </div>
        <section
          className="collections section-pad"
          id="collections"
          aria-labelledby="collections-title"
        >
          <div className="rail-intro">
            <Label>( 02 ) — THE COLLECTIONS</Label>
            <h2 id="collections-title">
              Four ways.
              <br />
              <em>One valley.</em>
            </h2>
            <p>
              From the first chill to the last light. Find a layer that feels
              like you.
            </p>
            <div className="rail-controls">
              <span className="mono">
                EXPLORE THE EDIT <span aria-hidden="true">→</span>
              </span>
              <span className="rail-counter mono">01 / 04</span>
            </div>
            <div className="rail-progress" aria-hidden="true">
              <span />
            </div>
          </div>
          <div
            className="rail-viewport"
            tabIndex={0}
            aria-label="Collections. Scroll horizontally or tab through four collections."
            onScroll={(event) => {
              if (
                window.innerWidth >= 1024 &&
                !window.matchMedia("(prefers-reduced-motion: reduce)").matches
              )
                return;
              const el = event.currentTarget;
              const ratio =
                el.scrollLeft / Math.max(1, el.scrollWidth - el.clientWidth);
              const progress=root.current?.querySelector<HTMLElement>(".rail-progress span");if(progress)progress.style.transform=`scaleX(${.25+ratio*.75})`;
              if(!matchMedia("(prefers-reduced-motion:reduce)").matches){const bounds=el.getBoundingClientRect();el.querySelectorAll<HTMLElement>(".rail-panel").forEach(panel=>{const r=panel.getBoundingClientRect(),offset=Math.max(-1,Math.min(1,(r.left+r.width/2-bounds.left-bounds.width/2)/bounds.width));gsap.set(panel,{scale:1-Math.abs(offset)*.06});const photo=panel.querySelector(".photo");if(photo)gsap.set(photo,{xPercent:offset*3,scale:1.06});});}
              const counter = root.current?.querySelector(".rail-counter");
              if (counter)
                counter.textContent = `0${Math.min(4, 1 + Math.round(ratio * 3))} / 04`;
            }}
          >
            <div className="rail-track">
              {collections.map((collection, i) => (
                <Link
                  prefetch={false}
                  href={`/shop/${collection.slug}/`}
                  className="rail-panel"
                  key={collection.slug}
                >
                  <div className="rail-image">
                    <Photo
                      slot={collection.image_path || `collections/${collection.slug}`}
                      name={collection.name}
                    />
                  </div>
                  <div className="rail-caption">
                    <span className="mono">0{i + 1}</span>
                    <h3>{collection.name}</h3>
                    <Arrow />
                  </div>
                  <p>{collection.caption}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
        <section
          className="selection section-pad"
          id="selection"
          aria-labelledby="selection-title"
        >
          <Label>( 03 ) — THE COLLECTION</Label>
          <div className="section-heading">
            <h2 id="selection-title">
              For the <em className="outline-text">keeping.</em>
            </h2>
            <p>
              Considered layers, familiar comforts.
              <br />
              Eight pieces, thoughtfully selected.
            </p>
          </div>
          <div className="filters" aria-label="Filter the collection">
            {[{ name: "All pieces", slug: "all" }, ...collections].map((c) => (
              <button
                key={c.slug}
                aria-pressed={category === c.slug}
                onClick={() => animateFilter(c.slug)}
              >
                {c.name}
              </button>
            ))}
          </div>
          <div className="product-grid" ref={grid}>
            <div className="product-group">
              {filtered.map((product, i) => (
                <article
                  className="product-card"
                  key={product.slug}
                  data-flip-id={product.slug}
                >
                  <div className={`product-image tone-${i % 4}`}>
                    <Link
                      prefetch={false}
                      href={`/product/${product.slug}/`}
                      aria-label={`View ${product.name}`}
                    >
                      <Photo
                        slot={getProductMedia(product.slug).slot}
                        name={product.name}
                      />
                    </Link>
                    <button
                      className="heart-button"
                      aria-label={`${favourites.includes(product.slug) ? "Unsave" : "Save"} ${product.name}`}
                      aria-pressed={favourites.includes(product.slug)}
                      onClick={(e) => save(product.slug, e.currentTarget)}
                    >
                      <Heart filled={favourites.includes(product.slug)} />
                    </button>
                    <button
                      className="quick-add"
                      disabled={!!product.variants&&!product.variants.some(v=>v.size===product.sizes[0]&&v.colour===product.color&&v.available>0)}
                      onClick={() => add(product.slug)}
                      aria-label={`Add to bag — ${product.name} — ${price(product.price)}`}
                    >
                      {!!product.variants&&!product.variants.some(v=>v.size===product.sizes[0]&&v.colour===product.color&&v.available>0)?"Sold out":"Add to bag"} <span>— {price(product.price)}</span>
                      <span aria-hidden="true">+</span>
                    </button>
                  </div>
                  <div className="product-info">
                    <h3>
                      <Link prefetch={false} href={`/product/${product.slug}/`}>
                        {product.name}
                      </Link>
                    </h3>
                    <span>{price(product.price)}</span>
                  </div>
                  <p className="mono product-technique">{product.technique}</p>
                </article>
              ))}
            </div>
          </div>
          <div className="selection-end">
            <span className="mono" aria-live="polite">
              {filtered.length} PIECES /{" "}
              {category === "all" ? "ALL COLLECTIONS" : category.toUpperCase()}
            </span>
            <Link prefetch={false} href="/shop/" className="text-link">
              View all collections <Arrow />
            </Link>
          </div>
          <noscript>
            <p>
              All pieces are shown. Interactive filters, saving and
              bag previews need JavaScript.
            </p>
          </noscript>
        </section>
        <section
          id="atelier"
          className="atelier"
          aria-labelledby="atelier-title"
        >
          <div className="atelier-visual section-pad">
            <div className="atelier-backdrop">
              <Photo
                slot="atelier/fabric"
                name="The fabric"
                alt="Macro view of an Indian vintage textile, showing interlaced threads. "
              />
            </div>
            <div className="atelier-shade" />
            <div className="atelier-glow" aria-hidden="true" />
            <div className="atelier-content">
              <Label>( 04 ) — THE ATELIER</Label>
              <h2 id="atelier-title">
                A world within
                <br />a single <em className="outline-text">thread.</em>
              </h2>
              <p>
                Look closer. There is beauty in the time
                <br className="desktop-break" /> taken, the texture, the tiniest
                detail.
              </p>
              <div className="stats">
                {atelier.stats.map((stat) => (
                  <div key={stat.label}>
                    <strong data-count={stat.value}>
                      {String(stat.value).padStart(2, "0")}
                    </strong>

                    <p>{stat.label}</p>
                  </div>
                ))}
              </div>
              <p className="mono atelier-caption">
                A STUDY IN THREAD
              </p>
            </div>
          </div>
          <div className="craft-steps section-pad">
            {atelier.steps.map((step, i) => (
              <div key={step.name}>
                <span className="mono">0{i + 1} /</span>
                <h3>{step.name}</h3>
                <p>{step.text}</p>
              </div>
            ))}
            <Link prefetch={false} href="/our-craft/" className="text-link">
              Explore our craft <Arrow />
            </Link>
          </div>
        </section>
        <section
          className="notes section-pad"
          id="notes"
          aria-labelledby="notes-title"
        >
          <Label>( 05 ) — WORN NOTES</Label>
          <h2 id="notes-title" className="sr-only">
            Worn notes
          </h2>
          <blockquote className="main-quote">“{notes.quote}”</blockquote>
          <p className="mono quote-caption">
            AN IMAGINED WARDROBE / NOT A CUSTOMER TESTIMONIAL
          </p>
          <div className="note-cards" tabIndex={0} role="region" aria-label="Collection notes">
            {notes.cards.map((quote, i) => (
              <div className="note-card" key={quote}>
                <p>“{quote}”</p>
                <span className="mono">NOTE 0{i + 1}</span>
              </div>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
