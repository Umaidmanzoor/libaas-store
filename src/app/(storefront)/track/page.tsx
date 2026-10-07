import { pageMetadata } from "@/lib/seo";
import { PageShell } from "@/components/page-shell";
import { TrackOrder } from "@/components/track-order";
export const metadata=pageMetadata("Track order — Libaas","Check your Libaas order status.","/track/",true);
export default function Page(){return <PageShell><div className="page-heading"><p className="eyebrow mono">YOUR ORDER</p><h1>A little further along.</h1><p>Enter your order number and the phone number you used at checkout.</p></div><TrackOrder /></PageShell>;}
