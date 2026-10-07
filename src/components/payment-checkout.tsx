"use client";
import { useEffect,useRef,useState } from "react";
import Link from "next/link";
import {MobileOrderSummary} from "./mobile-order-summary";
import { useRouter } from "next/navigation";
import { useCatalogue } from "./catalogue-provider";
import { useStore } from "./store";
import { commerce } from "../../content/commerce";
import { money } from "@/lib/money";
import { loadPaymentScript } from "@/lib/payment-script";
import type { Quote } from "@/lib/payment-validation";
type CheckoutResult={orderNumber:string;razorpayOrderId:string;amount:number;keyId:string};
type PaymentResponse={razorpay_order_id:string;razorpay_payment_id:string;razorpay_signature:string};
type Customer={name:FormDataEntryValue;email:FormDataEntryValue;mobile:FormDataEntryValue;address:{line1:FormDataEntryValue;line2:FormDataEntryValue;city:FormDataEntryValue;state:FormDataEntryValue;pin:FormDataEntryValue};consent_marketing:boolean};
type RazorpayWidget={open:()=>void;on:(event:string,callback:()=>void)=>void};
declare global{interface Window{Razorpay?:new(options:Record<string,unknown>)=>RazorpayWidget}}
const post=async(path:string,body:unknown)=>{
  const response=await fetch(path,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body),signal:AbortSignal.timeout(10000)});
  return {ok:response.ok,status:response.status,data:await response.json()};
};
const report=(reason:string)=>{void post("/api/checkout/diagnostic/",{reason}).catch(()=>{});};
export function PaymentCheckout(){
  const {items,ready,clear}=useStore(),{getProduct,getCommerce}=useCatalogue(),router=useRouter();
  const [quote,setQuote]=useState<Quote|null>(null),[code,setCode]=useState(""),[discount,setDiscount]=useState(""),[message,setMessage]=useState(""),[errors,setErrors]=useState<Record<string,string>>({}),[busy,setBusy]=useState(false),[scriptReady,setScriptReady]=useState(false);
  const [prepared,setPrepared]=useState<{payment:CheckoutResult;customer:Customer}|null>(null);
  const [refresh,setRefresh]=useState(0);
  const [retry,setRetry]=useState<"script"|"quote"|"checkout"|"window"|null>(null);
  const formRef=useRef<HTMLFormElement>(null);
  const token=useRef(""),started=useRef(0),lock=useRef(false);
  useEffect(()=>{started.current=Date.now();token.current=crypto.randomUUID();},[]);
  useEffect(()=>{
    if(!ready||!items.length)return;
    let alive=true;
    void loadPaymentScript().then(()=>{if(alive)setScriptReady(true);}).catch(error=>{
      if(alive){setRetry("script");setMessage("The secure payment window could not load. Check your connection or browser blocker, then select Retry.");report(error instanceof Error?error.message:"script_missing");}
    });
    return ()=>{alive=false;};
  },[refresh,ready,items.length]);
  const selection=items.map(item=>{
    const variant=getProduct(item.slug)?.variants?.find(v=>v.size===item.size&&v.colour===item.color);
    return {variant_id:variant?.id??"",qty:item.quantity};
  });
  const selectionKey=JSON.stringify(selection);
  useEffect(()=>{
    if(!ready||!selection.length||selection.some(x=>!x.variant_id))return;
    let alive=true;
    void post("/api/discount/",{items:selection,code:discount}).then(result=>{
      if(!alive)return;
      if(result.ok){setQuote(result.data.quote);}else{setQuote(null);setRetry("quote");setMessage(result.data.message);}
    }).catch(()=>{if(alive){setQuote(null);setRetry("quote");setMessage("We could not check prices in time. Please select Retry.");}});
    return ()=>{alive=false;};
  // A stable key avoids refetching when a field is typed.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[ready,selectionKey,discount,refresh]);
  async function checkStatus(payment:PaymentResponse){
    for(let i=0;i<15;i++){
      await new Promise(resolve=>setTimeout(resolve,2000));
      try{const verified=await post("/api/checkout/verify/",{...payment,checkout_token:token.current});
        if(verified.status===200&&verified.data.ok===true){clear();router.push("/order/confirmation/");return;}
      }catch{/* Check the order status below. */}
      try{const response=await fetch("/api/order-status/",{headers:{authorization:`Bearer ${token.current}`}});
        if(response.ok&&(await response.json()).paid){clear();router.push("/order/confirmation/");return;}
      }catch{/* Keep trying within the bounded confirmation window. */}
    }
    setMessage("We are confirming your payment. Use Track order if this takes a moment.");setBusy(false);lock.current=false;
  }
  function openPayment(payment:CheckoutResult,customer:Customer){
    if(!window.Razorpay){setRetry("script");setScriptReady(false);setMessage("The payment window could not load. Please select Retry.");setBusy(false);lock.current=false;return;}
    setBusy(true);lock.current=true;setMessage("");setRetry(null);
    try{
      const widget=new window.Razorpay({key:payment.keyId,amount:payment.amount,currency:"INR",name:"Libaas",description:`Order ${payment.orderNumber}`,image:["localhost","127.0.0.1","[::1]"].includes(location.hostname)?undefined:new URL("/brand/logo-display.webp",location.origin).href,order_id:payment.razorpayOrderId,theme:{color:"#c98a2b"},timeout:900,retry:{enabled:true,max_count:1},prefill:{name:customer.name,email:customer.email,contact:customer.mobile},
        handler:async(response:PaymentResponse)=>{
          try{const verified=await post("/api/checkout/verify/",{...response,checkout_token:token.current});
            if(verified.status===200&&verified.data.ok===true){clear();router.push("/order/confirmation/");return;}
          }catch{/* Bounded status check below. */}
          setMessage("We are confirming your payment…");await checkStatus(response);
        },modal:{ondismiss:()=>{setMessage("Payment not completed. You can reopen the payment window while your selection is reserved.");setBusy(false);lock.current=false;}}});
      widget.on("payment.failed",()=>{setMessage("Payment did not go through. Please try again.");setBusy(false);lock.current=false;});
      widget.open();
      // Some browsers reject opening an iframe after the checkout request has
      // finished. The visible retry button opens it from a fresh user gesture.
      window.setTimeout(()=>{
        const frame=document.querySelector<HTMLIFrameElement>("iframe.razorpay-checkout-frame");
        if(!frame||!frame.getClientRects().length||getComputedStyle(frame).visibility==="hidden"){
          setMessage("The payment window did not open. Select Open payment window to try again.");
          setRetry("window");report("window_blocked");
          setBusy(false);lock.current=false;
        }
      },10000);
    }catch{setMessage("The payment window did not open. Please select Retry.");setRetry("window");report("window_blocked");setBusy(false);lock.current=false;}
  }
  async function pay(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();if(lock.current||!quote||!scriptReady||!window.Razorpay)return;
    lock.current=true;setBusy(true);setMessage("");setErrors({});setRetry(null);
    let handedOff=false;
    const form=event.currentTarget;
    const values=Object.fromEntries(new FormData(form));
    const customer={name:values.name,email:values.email,mobile:values.mobile,address:{line1:values.address,line2:values.address2||"",city:values.city,state:values.state,pin:values.pin},consent_marketing:values.marketing==="yes"};
    try{
      const result=await post("/api/checkout/",{items:selection,code:discount,customer,checkout_token:token.current,expected_total:quote.total_paise,website:values.website||"",started_at:started.current});
      if(!result.ok){if(result.data.refresh){token.current=crypto.randomUUID();setQuote(null);setRefresh(value=>value+1);}
        setErrors(result.data.errors||{});setMessage(result.data.message);setRetry("checkout");
        const first=Object.keys(result.data.errors||{})[0];
        if(first)requestAnimationFrame(()=>form.querySelector<HTMLElement>(`[name="${CSS.escape(first)}"]`)?.focus());
        return;}
      const payment=result.data as CheckoutResult;
      setPrepared({payment,customer});
      openPayment(payment,customer);
      handedOff=true;
    }catch(error){setMessage("Checkout took too long or could not connect. Your bag is safe. Please select Retry.");setRetry("checkout");report(error instanceof Error&&error.name==="TimeoutError"?"request_timeout":"request_failed");}
    finally{if(!handedOff){setBusy(false);lock.current=false;}}
  }
  if(!ready)return <div className="skeleton" role="status">Loading your bag…</div>;
  if(!items.length)return <div className="empty-state"><h2>Your bag is waiting.</h2><Link href="/shop/" className="button primary">Shop the Collection ↗</Link></div>;
  const missing=selection.some(x=>!x.variant_id);
  const low=quote?.items.filter(x=>x.available<=3)??[];
  return <div className="checkout-layout">
    <form ref={formRef} className="enquiry-form checkout-form" onSubmit={pay} noValidate>
      <h2>Your details.</h2>
      {process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID?.startsWith("rzp_test_")&&<p className="small-note">Test mode: no real money is charged. Test card: 4100 2800 0000 1007, any future expiry and any CVV. Test UPI: success@razorpay.</p>}
      <div className="form-fields">
        {[{name:"name",label:"Full name",auto:"name"},{name:"email",label:"Email address",auto:"email",type:"email"},{name:"mobile",label:"Mobile number",auto:"tel-national",type:"tel"},{name:"address",label:"Street address",auto:"street-address"},{name:"address2",label:"Address line 2",auto:"address-line2"},{name:"city",label:"City",auto:"address-level2"},{name:"pin",label:"PIN code",auto:"postal-code"}].map(field=><label key={field.name}>{field.label}<input name={field.name} type={field.type||"text"} inputMode={field.name==="mobile"||field.name==="pin"?"numeric":field.name==="email"?"email":"text"} enterKeyHint="next" autoComplete={field.auto} required={field.name!=="address2"} aria-invalid={!!errors[field.name]} maxLength={field.name==="mobile"?10:field.name==="pin"?6:250} />{errors[field.name]&&<span className="field-error">{errors[field.name]}</span>}</label>)}
        <label>State / union territory<select name="state" defaultValue="" required aria-invalid={!!errors.state}><option value="" disabled>Choose your state</option>{commerce.states.map(state=><option key={state}>{state}</option>)}</select>{errors.state&&<span className="field-error">{errors.state}</span>}</label>
      </div>
      <fieldset className="delivery"><legend>Delivery within India</legend><p>{getCommerce().shippingNote}</p></fieldset>
      <div className="honeypot" aria-hidden="true"><label>Leave blank<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
      <label className="small-note consent-note"><input type="checkbox" name="marketing" value="yes" /> I agree to receive occasional Libaas emails.</label>
      <button className="button primary" disabled={busy||missing||!quote||!scriptReady}>{busy?"Preparing payment…":"Pay securely ↗"}</button>
      {prepared&&<button type="button" className="text-link" disabled={busy||!scriptReady} onClick={()=>openPayment(prepared.payment,prepared.customer)}>Open payment window ↗</button>}
      {retry&&<button type="button" className="text-link" disabled={busy} onClick={()=>{
        setMessage("");setRetry(null);
        if(retry==="script"||retry==="quote"||!scriptReady||!quote)setRefresh(value=>value+1);
        else if(retry==="window"&&prepared)openPayment(prepared.payment,prepared.customer);
        else formRef.current?.requestSubmit();
      }}>Retry</button>}
      <p role="alert" className="form-result">{missing?"A selected size or colour is unavailable. Please edit your bag.":message||(!scriptReady?"Loading the secure payment window…":"")}</p>
    </form>
    <MobileOrderSummary total={quote?money(quote.total_paise):"…"}><p className="eyebrow mono">YOUR SELECTION</p><h2>A little closer.</h2>
      <p>{items.reduce((sum,item)=>sum+item.quantity,0)} pieces in your bag.</p>
      {low.map(line=><p className="small-note" key={line.variant_id}>Only {line.available} left: {line.name}, {line.size} {line.colour}</p>)}
      <div className="discount-entry"><label htmlFor="discount-code">Discount code</label><div className="discount-controls"><input id="discount-code" aria-label="Discount code" placeholder="Enter your code" autoComplete="off" value={code} onChange={e=>setCode(e.target.value.toUpperCase())} maxLength={40} />
      <button type="button" className="discount-apply" onClick={()=>{setPrepared(null);setQuote(null);setDiscount(code.trim());setRefresh(value=>value+1);token.current=crypto.randomUUID();}} disabled={busy}>Apply code</button></div></div>
      {quote?<dl className="totals"><div><dt>Subtotal</dt><dd>{money(quote.subtotal_paise)}</dd></div>{quote.discount_paise>0&&<div><dt>Discount</dt><dd>−{money(quote.discount_paise)}</dd></div>}<div><dt>Shipping</dt><dd>{money(quote.shipping_paise)}</dd></div><div className="total"><dt>Total</dt><dd>{money(quote.total_paise)}</dd></div></dl>:<p role="status">Checking prices and availability…</p>}
      <p className="small-note">Review the total before payment.</p>
      <Link href="/cart/" className="text-link">Edit your bag ↗</Link>
    </MobileOrderSummary>
  </div>;
}
