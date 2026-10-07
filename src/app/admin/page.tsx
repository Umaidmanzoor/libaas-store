import Link from "next/link";
import { AdminShell,AdminNotice } from "@/components/admin-shell";
import { adminPage,stamp } from "@/lib/admin-core";
import { dashboardSummary } from "@/lib/admin-dashboard";
import { money } from "@/lib/money";
export const dynamic="force-dynamic";
export default async function Dashboard(){
  const {db}=await adminPage();
  const [totals,orders,variants]=await Promise.all([
    dashboardSummary(db),
    db.from("orders").select("id,number,created_at,total_paise").order("created_at",{ascending:false}).limit(5),
    db.from("variants").select("id,sku,stock").lte("stock",3).eq("active",true).limit(10)
  ]);
  const {summary,migrationNeeded}=totals,rows=orders.data??[],sums=summary.sums,chart=summary.chart;
  const max=Math.max(...chart.map(v=>v.amount),1),points=chart.map((v,i)=>`${i*10},${80-Math.round(v.amount/max*70)}`).join(" ");
  return <AdminShell title="Owner area"><p className="admin-subtitle">Your store at a glance.</p>{migrationNeeded&&<p className="admin-feedback">Dashboard is using the compatibility query. Apply supabase/part5.sql for faster totals.</p>}<section className="admin-metrics" aria-label="Sales summary">{["Today","7 days","30 days"].map((label,i)=><article key={label}><span>{label} revenue</span><strong>{money(sums[i])}</strong></article>)}<article><span>Average order</span><strong>{money(summary.paid_count?Math.round(sums[2]/summary.paid_count):0)}</strong></article></section><section className="admin-card"><h2>Revenue · last 30 days</h2><svg className="admin-chart" viewBox="0 0 290 90" role="img" aria-label="Revenue over the last 30 days"><title>{`Daily revenue in INR; peak ${money(max)}`}</title>{chart.map((v,i)=><circle key={v.day} cx={i*10} cy={80-Math.round(v.amount/max*70)} r="2"><title>{v.day}: {money(v.amount)}</title></circle>)}<polyline points={points} fill="none" stroke="currentColor" strokeWidth="2"/></svg><p>Daily peak: {money(Math.max(...chart.map(v=>v.amount),0))}</p><p>{summary.paid_count} paid orders in this period.</p></section><div className="admin-grid"><section className="admin-card"><h2>Needs attention</h2><p><Link href="/admin/orders/?status=paid">{summary.waiting} waiting to pack →</Link></p><p>{summary.flagged} flagged orders</p><p><Link href="/admin/messages/">{summary.unread} unread messages →</Link></p></section><section className="admin-card"><h2>Low stock</h2>{variants.data?.length?<ul>{variants.data.map(v=><li key={v.id}>{v.sku} · {v.stock} left</li>)}</ul>:<AdminNotice text="No low-stock variants."/>}</section><section className="admin-card"><h2>Recent orders</h2>{rows.length?<ul>{rows.slice(0,5).map(o=><li key={o.id}><Link href={`/admin/orders/${o.id}/`}>{o.number}</Link> · {stamp(o.created_at)} · {money(o.total_paise)}</li>)}</ul>:<AdminNotice/>}</section><section className="admin-card"><h2>Top products</h2>{summary.top.length?<ol>{summary.top.map(({name,qty})=><li key={name}>{name} · {qty}</li>)}</ol>:<AdminNotice/>}</section></div></AdminShell>
}
