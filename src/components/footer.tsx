"use client";
import { useStore } from "./store";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useCatalogue } from "./catalogue-provider";
import { joinNewsletter } from "@/lib/actions";
import { withDeadline } from "@/lib/deadline";
export function Footer() {
  const { getSite } = useCatalogue();
  const site = getSite();
  const { ready } = useStore();
  const [newsletter, setNewsletter] = useState(""),
    [sending, setSending] = useState(false);
  const started=useRef(0);
  useEffect(() => {
    started.current=Date.now();
    const revealAnchor = () => {
      const id=window.location.hash.slice(1);
      if(id === "care") {
        const target=document.getElementById(id);
        if(target instanceof HTMLDetailsElement) target.open=true;
      }
    };
    revealAnchor();
    window.addEventListener("hashchange",revealAnchor);
    return ()=>window.removeEventListener("hashchange",revealAnchor);
  }, []);
  async function subscribe(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if(sending)return;
    const form = event.currentTarget;
    const data = new FormData(form);
    setSending(true);
    try {
      const result = await withDeadline(joinNewsletter({
        email: data.get("email"),
        website: data.get("website"),
        consent:data.get("consent")==="yes" ? true : undefined,
        started_at:started.current,
      }));
      setNewsletter(result.message);
      if (result.ok){form.reset();started.current=Date.now();}
    } catch {
      setNewsletter("Sign-up could not finish in time. Please try Join again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <footer className="footer section-pad" id="contact">
      <div className="footer-top">
        <div className="newsletter" id="newsletter">
          <p className="eyebrow mono">A LETTER, NOW AND THEN.</p>
          <h2>
            Good things.
            <br />
            <em>Worth waiting for.</em>
          </h2>
          <form inert={!ready} onSubmit={subscribe} noValidate>
            <label htmlFor="email" className="sr-only">
              Your email address
            </label>
            <div className="email-row">
              <input
                id="email"
                type="email"
                name="email"
                autoComplete="email"
                placeholder="Your email address"
                required
                aria-describedby="newsletter-message"
              />
              <button type="submit" disabled={sending}>
                {sending ? "Joining…" : "Join"}{" "}
                <span aria-hidden="true">↗</span>
              </button>
            </div>
            <label className="small-note consent-note"><input type="checkbox" name="consent" value="yes" required /> I agree to receive occasional Libaas emails.</label>
            <div className="honeypot" aria-hidden="true">
              <label htmlFor="website">Leave this field empty</label>
              <input
                id="website"
                name="website"
                tabIndex={-1}
                autoComplete="off"
              />
            </div>
            <p id="newsletter-message" className="form-note" role="status">
              {newsletter || "A little inspiration for your inbox."}
            </p>
          </form>
        </div>
        <div className="footer-links">
          {site.footer.map((column) => (
            <div key={column.title}>
              <h3 className="mono">{column.title}</h3>
              {column.links.map((link) => (
                <Link prefetch={false} key={link.label} href={["/#care","/#newsletter"].includes(link.href)?link.href.slice(1):link.href} onClick={(event) => {
                  const id = link.href.split("#")[1];
                  if (id) {
                    const target = document.getElementById(id);
                    if (target && !event.metaKey && !event.ctrlKey) {
                      event.preventDefault();
                      if (target instanceof HTMLDetailsElement) target.open = true;
                      history.pushState(history.state,"",`#${id}`);
                      target.scrollIntoView({behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth",block:"center"});
                      target.querySelector<HTMLElement>("summary, input")?.focus({preventScroll:true});
                    }
                  }
                }}>
                  {link.label}
                </Link>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="footer-detail">
        <Link prefetch={false} href="/" className="footer-logo">
          <img
            src="/brand/logo-display.webp"
            alt="Libaas Apparel & Design"
            width="2048"
            height="2100"
          />
        </Link>
        <details id="care">
          <summary>A note on keeping your pieces</summary>
          <p>
            Follow the garment’s care label. Store clean, dry pieces away from
            direct sunlight. Ask a textile specialist about delicate embroidery.
          </p>
        </details>
      </div>
      <div className="footer-wordmark" role="img" aria-label="Libaas">
        <div className="footer-disc" aria-hidden="true" />
        <span aria-hidden="true">LIBAAS</span>
        <svg
          className="paisley"
          viewBox="0 0 64 90"
          fill="none"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path d="M47 5C13 21 2 47 9 68c9 25 45 19 48-4 2-15-8-23-16-20-12 5-5 19 4 15C23 81 4 40 47 5Z" />
        </svg>
      </div>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} Libaas</span>
        <span>{site.signature}</span>
        <nav className="legal-links" aria-label="Legal">
          <Link prefetch={false} href="/privacy/">
            Privacy
          </Link>
          <Link prefetch={false} href="/terms/">
            Terms
          </Link>
          <Link prefetch={false} href="/shipping-returns/">
            Shipping & returns
          </Link>
          <Link prefetch={false} href="/track/">Track order</Link>
        </nav>
        <Link prefetch={false} href="/">
          Back to the beginning ↑
        </Link>
      </div>
    </footer>
  );
}
