import { StorefrontLayout } from "@/components/storefront-layout";
import Link from "next/link";
import { PageShell } from "@/components/page-shell";
import { pageMetadata } from "@/lib/seo";
export const metadata = pageMetadata(
  "Page not found — Libaas",
  "This thread leads nowhere. Return to the Libaas collection.",
  "/404/",
  true,
);
export default function NotFound() {
  return (
    <StorefrontLayout><PageShell>
      <div className="page-heading not-found">
        <p className="eyebrow mono">404 / A LOOSE THREAD</p>
        <svg
          viewBox="0 0 64 90"
          fill="none"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path d="M47 5C13 21 2 47 9 68c9 25 45 19 48-4 2-15-8-23-16-20-12 5-5 19 4 15C23 81 4 40 47 5Z" />
        </svg>
        <h1>
          A thread
          <br />
          <em>worth following.</em>
        </h1>
        <p>
          This page has slipped away. There is still a collection to explore.
        </p>
        <Link href="/shop/" className="button primary">
          Shop the Collection ↗
        </Link>
        <Link href="/" className="text-button">
          Back to the beginning
        </Link>
      </div>
    </PageShell></StorefrontLayout>
  );
}
