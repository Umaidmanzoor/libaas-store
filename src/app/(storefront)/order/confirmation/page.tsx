import { pageMetadata } from "@/lib/seo";
import { PageShell } from "@/components/page-shell";
import { Confirmation } from "@/components/checkout";
import Link from "next/link";
import { getStorefront } from "@/lib/data";
import { readConfirmation } from "@/lib/order-access";
import { money } from "@/lib/money";
export const dynamic="force-dynamic";
export const metadata = pageMetadata(
  "Selection Summary — Libaas",
  "Your Libaas selection summary.",
  "/order/confirmation/",
  true,
);
export default async function Page() {
  if((await getStorefront()).configured){
    const order=await readConfirmation();
    return <PageShell><div className="confirmation"><span className="confirmation-disc" aria-hidden="true"/><p className="eyebrow mono">YOUR ORDER</p><h1>{order?"A lovely choice.":"Thank you."}</h1>
      <p>{order?`Your order ${order.number} has been received.`:"Your payment may still be confirming. You can check its progress with Track order."}</p>
      {order&&<div className="receipt"><p className="mono">{order.number} / ORDER REFERENCE</p><ul>{order.order_items.map((item:{name:string;size:string;colour:string;qty:number;unit_price_paise:number},index:number)=><li key={index}>{item.name} · {item.size} · {item.colour} × {item.qty} — {money(item.unit_price_paise*item.qty)}</li>)}</ul><dl className="totals"><div><dt>Subtotal</dt><dd>{money(order.subtotal_paise)}</dd></div><div><dt>Discount</dt><dd>{money(order.discount_paise)}</dd></div><div><dt>Shipping</dt><dd>{money(order.shipping_paise)}</dd></div><div className="total"><dt>Total</dt><dd>{money(order.total_paise)}</dd></div></dl></div>}
      <Link href="/track/" className="button primary">Track order ↗</Link></div></PageShell>;
  }
  return (
    <PageShell>
      <Confirmation />
    </PageShell>
  );
}
