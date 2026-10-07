import "server-only";
import { createAdminClient } from "./supabase/admin";
import { gateway,type GatewayPayment } from "./razorpay";
import { revalidateStorefront } from "./revalidation";
import { orderEmails } from "./email";
export function paymentDatabase(){const db=createAdminClient();if(!db)throw new Error("Not configured");return db;}
export async function settlePayment(orderId:string,paymentId:string,event?:{id:string;type:string}) {
  const db=paymentDatabase();
  const {data:o,error}=await db.from("orders").select("id,total_paise,razorpay_order_id").eq("razorpay_order_id",orderId).maybeSingle();
  if(error||!o)throw new Error("Order unavailable");
  const payment=await gateway<GatewayPayment>(`payments/${encodeURIComponent(paymentId)}`);
  if(payment.id!==paymentId||payment.order_id!==o.razorpay_order_id||payment.currency!=="INR"||payment.status!=="captured"||!payment.captured)throw new Error("Payment pending");
  const result=await db.rpc("mark_order_paid",{p_order:o.id,p_payment:payment.id,p_amount:payment.amount,p_event:event?.id??null,p_event_type:event?.type??null});
  if(result.error)throw new Error("Payment pending");
  revalidateStorefront();
  return o.id as string;
}
export {orderEmails};
