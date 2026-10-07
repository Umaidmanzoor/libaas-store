"use client";
import { useEffect,useRef, useState } from "react";
import Link from "next/link";
import { price, type Product } from "@/lib/catalogue";
import { useCatalogue } from "./catalogue-provider";
import { Photo } from "./photo";
import { useStore } from "./store";
import { ProductCard } from "./product-card";
import { EnquiryForm } from "./enquiry-form";
export function ProductDetail({ product }: { product: Product }) {
  const { getCommerce, getProductImages, getProducts, getWhatsAppLink } = useCatalogue();
  const [size, setSize] = useState(product.sizes[0]),
    [color, setColor] = useState(product.color),
    { add, toggle, favourites, openBag } = useStore();
  const active=product.variants?.find(v=>v.size===size&&v.colour===color);
  const soldOut=!!product.variants&&(!active||active.available<=0);
  const guide = useRef<HTMLDialogElement>(null),
    guideButton = useRef<HTMLButtonElement>(null);
  const gallery = useRef<HTMLDivElement>(null);
  const mainBuy=useRef<HTMLButtonElement>(null);
  const [stickyBuy,setStickyBuy]=useState(false),[galleryIndex,setGalleryIndex]=useState(1);
  useEffect(()=>{let frame=0;const update=()=>{frame=0;setStickyBuy(matchMedia("(max-width:1023px)").matches&&!!mainBuy.current&&mainBuy.current.getBoundingClientRect().bottom<0);};const schedule=()=>{if(!frame)frame=requestAnimationFrame(update);};schedule();window.addEventListener("scroll",schedule,{passive:true});window.addEventListener("resize",schedule);return()=>{cancelAnimationFrame(frame);window.removeEventListener("scroll",schedule);window.removeEventListener("resize",schedule);};},[]);
  const zoom = useRef<HTMLDialogElement>(null);
  const [zoomSlot,setZoomSlot]=useState<string|null>(null);
  const zoomOpener = useRef<HTMLElement | null>(null);
  const slots = getProductImages(product.slug, color);
  const whatsapp = getWhatsAppLink(product.name);
  const saved = favourites.includes(product.slug);
  return (
    <>
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link prefetch={false} href="/shop/">
          Shop
        </Link>
        <span>/</span>
        <Link prefetch={false} href={`/shop/${product.category}/`}>
          {product.category}
        </Link>
        <span>/</span>
        <span>{product.name}</span>
      </nav>
      <div className="product-detail">
        <div>
          <div
            className="product-gallery"
            ref={gallery}
            onScroll={event=>{const el=event.currentTarget;setGalleryIndex(Math.min(slots.length,1+Math.round(el.scrollLeft/Math.max(1,(el.firstElementChild?.getBoundingClientRect().width??el.clientWidth)+16))));}}
            role="region"
            tabIndex={0}
            aria-label={`${product.name} gallery. Swipe or scroll horizontally on mobile.`}
          >
            {slots.map((slot, i) => (
              <figure key={slot}>
                <button className="gallery-zoom" aria-label={`Enlarge ${product.name} in ${color}`} onClick={(event)=>{zoomOpener.current=event.currentTarget;setZoomSlot(slot);zoom.current?.showModal();}}>
                <Photo
                  slot={slot}
                  eager={i === 0}
                  sizes={i===0?"(max-width: 599px) 90vw, (max-width: 1023px) 55vw, 58vw":"(max-width: 599px) 90vw, 28vw"}
                  alt={`${product.name} in ${color}`}
                  name={
                    i === 0 ? product.name : `${product.name} · Detail ${i + 1}`
                  }
                />
                </button>
                <figcaption className="mono">
                  0{i + 1} / {color} / {i === 0 ? "The piece · tap to enlarge" : "A closer look"}
                </figcaption>
              </figure>
            ))}
          </div>
          <p className="gallery-position mono" aria-live="polite">{galleryIndex} / {slots.length}</p>
        </div>
        <div className="product-description">
          <p className="eyebrow mono">{product.technique}</p>
          <h1>{product.name}</h1>
          <p className="product-price">
            {price(product.price)}
          </p>
          <p>{product.description}</p>
          <fieldset className="variant-options">
            <legend>Colour: {color}</legend>
            {product.colors.map((c) => (
              <button
                key={c}
                type="button"
                aria-pressed={color === c}
                onClick={() => {setColor(c); gallery.current?.scrollTo({left:0,behavior:"instant"});}}
              >
                {c}
              </button>
            ))}
          </fieldset>
          <div className="size-heading">
            <span>Choose your size</span>
            <button
              ref={guideButton}
              className="text-button"
              onClick={() => guide.current?.showModal()}
            >
              Size guide
            </button>
          </div>
          <fieldset className="variant-options">
            <legend className="sr-only">Size</legend>
            {product.sizes.map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={size === s}
                disabled={!!product.variants&&!product.variants.some(v=>v.size===s&&v.colour===color&&v.available>0)}
                onClick={() => setSize(s)}
              >
                {s}
              </button>
            ))}
          </fieldset>
          {product.variants&&<p role="status" className="small-note">{soldOut?"Sold out":active!.available<=3?`Only ${active!.available} left`:"Available"}</p>}
          <div className="product-buttons">
            <button ref={mainBuy}
              className="button primary"
              disabled={soldOut}
              onClick={() => {
                add(product.slug, size, color);
                openBag();
              }}
            >
              {soldOut?"Sold out":"Add to Bag"} <span>↗</span>
            </button>
            <button
              className="save-product"
              onClick={() => toggle(product.slug)}
              aria-pressed={saved}
            >
              {saved ? "♥ Saved" : "♡ Save piece"}
            </button>
          </div>
          {whatsapp ? (
            <a
              className="text-link"
              href={whatsapp}
              target="_blank"
              rel="noopener noreferrer"
            >
              Enquire on WhatsApp ↗
            </a>
          ) : (
            <>
              <a className="text-link" href="#enquiry">
                Enquire about this piece ↗
              </a>

            </>
          )}
          <div className="product-accordions">
            {[
              { title: "Details", text: product.dimensions },
              {
                title: "Craft & Fabric",
                text: `${product.technique}. ${product.fabric}`,
              },
              { title: "Care", text: getCommerce().care },
              {
                title: "Shipping & Returns",
                text: `${getCommerce().shippingNote} ${getCommerce().returnsNote}`,
              },
            ].map((item, i) => (
              <details key={item.title} open={i === 0}>
                <summary>{item.title}</summary>
                <p>{item.text}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
      <section id="enquiry" className="enquiry-section">
        <div>
          <p className="eyebrow mono">A LITTLE MORE TO KNOW</p>
          <h2>
            Ask about
            <br />
            <em>this piece.</em>
          </h2>
          <p>
            Questions about the details, colour or fit? Begin with your enquiry below.
          </p>
        </div>
        <EnquiryForm product={product.name} />
      </section>
      <section className="related">
        <p className="eyebrow mono">IN GOOD COMPANY</p>
        <h2>You might also like.</h2>
        <div className="product-group">
          {getProducts()
            .filter(
              (p) => p.category === product.category && p.slug !== product.slug,
            )
            .map((p, i) => (
              <ProductCard key={p.slug} product={p} index={i} />
            ))}
        </div>
      </section>
      <div className={`mobile-product-bar ${stickyBuy?"is-visible":""}`}><button className="button primary" disabled={soldOut} onClick={()=>{add(product.slug,size,color);openBag();}}>{soldOut?"Sold out":"Add to Bag"} — {price(product.price)}</button></div>
      <dialog className="image-dialog" ref={zoom} aria-labelledby="image-dialog-title" data-lenis-prevent onClose={()=>{setZoomSlot(null);zoomOpener.current?.focus();}}>
        <div className="image-dialog-heading"><h2 id="image-dialog-title">{product.name} · {color}</h2><button className="text-button" aria-label="Close image" onClick={()=>zoom.current?.close()}>Close ×</button></div>
        {zoomSlot&&<Photo slot={zoomSlot} name={`${product.name} in ${color}`} eager sizes="90vw" />}
      </dialog>
      <dialog
        className="size-dialog"
        ref={guide}
        aria-labelledby="size-title"
        data-lenis-prevent
        onClose={() => guideButton.current?.focus()}
      >
        <button
          className="text-button dialog-close"
          onClick={() => guide.current?.close()}
          aria-label="Close size guide"
        >
          Close ×
        </button>
        <h2 id="size-title">A little guidance.</h2>
        <p className="small-note">
          Measurements are a guide. Confirm sizing for the final
          garment.
        </p>
        {product.sizes.length === 1 ? (
          <p>{product.dimensions}</p>
        ) : (
          <table>
            <caption>Garment size guide, in inches</caption>
            <thead>
              <tr>
                <th scope="col">Size</th>
                <th scope="col">Chest</th>
                <th scope="col">Length</th>
              </tr>
            </thead>
            <tbody>
              {getCommerce().sizeGuide.map((row) => (
                <tr key={row.size}>
                  <th scope="row">{row.size}</th>
                  <td>{row.chest}</td>
                  <td>{row.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </dialog>
    </>
  );
}
