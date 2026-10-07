import { pageMetadata } from "@/lib/seo";
import { PageShell } from "@/components/page-shell";
import { CartContents } from "@/components/store";
export const metadata = pageMetadata(
  "Your Bag — Libaas",
  "Review your Libaas selection.",
  "/cart/",
  true,
);
export default function Page() {
  return (
    <PageShell>
      <div className="page-heading">
        <p className="eyebrow mono">YOUR PERSONAL EDIT</p>
        <h1>A little of your own.</h1>
        <p>Your favourite layers, together in one place.</p>
      </div>
      <div className="cart-page">
        <CartContents />
      </div>
    </PageShell>
  );
}
