"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { price } from "@/lib/catalogue";
import { useCatalogue } from "./catalogue-provider";
import { reviewSelection } from "@/lib/actions";
import { Totals, useStore } from "./store";
import { Honeypot } from "./enquiry-form";
import { PaymentCheckout } from "./payment-checkout";
type Receipt = {
  number: string;
  count: number;
  subtotal: number;
  shipping: number;
  total: number;
};
export function Checkout() {
  const { getCommerce, configured } = useCatalogue();
  const { items, ready, clear } = useStore(),
    router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({}),
    [message, setMessage] = useState(""),
    [pending, setPending] = useState(false);
  const busy = useRef(false);
  if(configured&&process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID)return <PaymentCheckout />;
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    busy.current = true;
    const form = event.currentTarget;
    setPending(true);
    setErrors({});
    setMessage("");
    try {
      const result = await reviewSelection(
        Object.fromEntries(new FormData(form)),
        items,
      );
      if (!result.ok) {
        setErrors(result.errors ?? {});
        setMessage(result.message);
        requestAnimationFrame(() =>
          form
            .querySelector<HTMLInputElement>('[aria-invalid="true"]')
            ?.focus(),
        );
        return;
      }
      try {
        sessionStorage.setItem(
          "libaas-selection-receipt",
          JSON.stringify(result.receipt),
        );
      } catch {
        setMessage(
          "Your browser cannot save the selection summary. Enable session storage and try again; your bag has been kept.",
        );
        return;
      }
      clear();
      router.push("/order/confirmation/");
    } catch {
      setMessage(
        "The selection could not be reviewed. Your bag is safe; please try again.",
      );
    } finally {
      busy.current = false;
      setPending(false);
    }
  }
  if (!ready)
    return (
      <div className="skeleton checkout-loading" role="status">
        Loading your bag…
      </div>
    );
  if (!items.length && !pending)
    return (
      <div className="empty-state">
        <h2>Your bag is waiting.</h2>
        <p>Add a piece before reviewing your selection.</p>
        <Link prefetch={false} href="/shop/" className="button primary">
          Shop the Collection ↗
        </Link>
      </div>
    );
  const fields = [
    { name: "name", label: "Full name", auto: "name" },
    { name: "email", label: "Email address", type: "email", auto: "email" },
    {
      name: "mobile",
      label: "Mobile number",
      type: "tel",
      auto: "tel-national",
      hint: "10 digits, without +91",
    },
    { name: "address", label: "Street address", auto: "street-address" },
    { name: "city", label: "City", auto: "address-level2" },
    { name: "pin", label: "PIN code", auto: "postal-code", hint: "6 digits" },
  ];
  return (
    <div className="checkout-layout">
      <form className="enquiry-form checkout-form" onSubmit={submit} noValidate>
        <h2>Your details.</h2>
        <p className="small-note">
          Review your details below. They remain in this browser and are not submitted.
        </p>
        <div className="form-fields">
          {fields.map((field) => (
            <label key={field.name}>
              {field.label}
              <input
                name={field.name}
                type={field.type ?? "text"}
                autoComplete={field.auto}
                placeholder={field.hint}
                inputMode={
                  field.name === "mobile" || field.name === "pin"
                    ? "numeric"
                    : undefined
                }
                maxLength={
                  field.name === "mobile"
                    ? 10
                    : field.name === "pin"
                      ? 6
                      : undefined
                }
                required
                aria-invalid={!!errors[field.name]}
                aria-describedby={
                  errors[field.name] ? `${field.name}-error` : undefined
                }
              />
              {errors[field.name] && (
                <span className="field-error" id={`${field.name}-error`}>
                  {errors[field.name]}
                </span>
              )}
            </label>
          ))}
          <label>
            State / union territory
            <select
              name="state"
              defaultValue=""
              required
              aria-invalid={!!errors.state}
              aria-describedby="state-error"
            >
              <option value="" disabled>
                Choose your state
              </option>
              {getCommerce().states.map((state) => (
                <option key={state}>{state}</option>
              ))}
            </select>
            <span className="field-error" id="state-error">
              {errors.state}
            </span>
          </label>
        </div>
        <fieldset className="delivery">
          <legend>Delivery within India</legend>
          <label>
            <input
              type="radio"
              name="delivery"
              value="standard"
              defaultChecked
            />{" "}
            Standard delivery
          </label>
          <p>{getCommerce().shippingNote}</p>
        </fieldset>
        <Honeypot />
        <p className="service-notice">
          Online ordering is currently unavailable. No payment or order has been processed.
        </p>
        <button className="button primary" disabled={pending}>
          {pending ? "Preparing confirmation…" : "Review selection"} ↗
        </button>
        <p role="alert" className="form-result">
          {message}
        </p>
      </form>
      <aside className="order-summary">
        <p className="eyebrow mono">YOUR SELECTION</p>
        <h2>A little closer.</h2>
        <p>
          {items.reduce((sum, item) => sum + item.quantity, 0)} pieces in
          your bag.
        </p>
        <Totals />
        <Link prefetch={false} className="text-link" href="/cart/">
          Edit your bag ↗
        </Link>
        <p className="small-note">No card or payment details are required.</p>
      </aside>
    </div>
  );
}
// Hydration reads browser session storage, an external source unavailable during SSR.
/* eslint-disable react-hooks/set-state-in-effect */
export function Confirmation() {
  const [receipt, setReceipt] = useState<Receipt | null>(null),
    [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      const raw = JSON.parse(
        sessionStorage.getItem("libaas-selection-receipt") ?? "null",
      );
      if (
        raw &&
        typeof raw.number === "string" &&
        /^REF-[A-F0-9]{8}$/.test(raw.number) &&
        [raw.count, raw.subtotal, raw.shipping, raw.total].every(
          (v) => typeof v === "number" && Number.isFinite(v) && v >= 0,
        )
      )
        setReceipt(raw);
    } catch {}
    setReady(true);
  }, []);
  if (!ready)
    return (
      <div className="skeleton" role="status">
        Loading confirmation…
      </div>
    );
  return (
    <div className="confirmation">
      <span className="confirmation-disc" aria-hidden="true" />
      <p className="eyebrow mono">
        {receipt ? "SELECTION REVIEWED" : "YOUR COLLECTION"}
      </p>
      <h1>{receipt ? "A lovely choice." : "Take your time."}</h1>
      <p>
        {receipt
          ? "Your selection has been reviewed. Thank you for exploring Libaas."
          : "There is no selection summary in this browser session yet."}
      </p>
      <p className="service-notice">
        Online ordering is currently unavailable. No payment or order has been processed.
      </p>
      {receipt && (
        <div className="receipt">
          <p className="mono">{receipt.number} / SELECTION REFERENCE</p>
          <dl className="totals">
            <div>
              <dt>Pieces</dt>
              <dd>{receipt.count}</dd>
            </div>
            <div>
              <dt>Subtotal</dt>
              <dd>{price(receipt.subtotal)}</dd>
            </div>
            <div>
              <dt>Shipping estimate</dt>
              <dd>{price(receipt.shipping)}</dd>
            </div>
            <div className="total">
              <dt>Estimated total</dt>
              <dd>{price(receipt.total)}</dd>
            </div>
          </dl>
          <p className="small-note">
            No email was sent and no delivery will be made. Contact and address
            details were not saved.
          </p>
        </div>
      )}
      <Link prefetch={false} href="/shop/" className="button primary">
        Shop the Collection ↗
      </Link>
    </div>
  );
}
