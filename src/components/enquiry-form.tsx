"use client";
import { useStore } from "./store";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useCatalogue } from "./catalogue-provider";
import { sendContact, sendEnquiry, type FormResult } from "@/lib/actions";
export function Honeypot() {
  return (
    <div className="honeypot" aria-hidden="true">
      <label>
        Leave this field blank
        <input name="website" tabIndex={-1} autoComplete="off" />
      </label>
    </div>
  );
}
export function EnquiryForm({ product }: { product?: string }) {
  const {configured}=useCatalogue();
  const { ready } = useStore();
  const [result, setResult] = useState<FormResult | null>(null),
    [pending, setPending] = useState(false);
  const status = useRef<HTMLParagraphElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const started=useRef(0);
  useEffect(()=>{started.current=Date.now();},[]);
  useLayoutEffect(() => {
    if (result && !result.ok)
      formRef.current?.querySelector<HTMLInputElement>('[aria-invalid="true"]')?.focus();
  }, [result]);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = event.currentTarget;
    const data = {...Object.fromEntries(new FormData(form)),started_at:started.current};
    setPending(true);
    try {
      const response = await (product ? sendEnquiry : sendContact)(data);
      setResult(response);
      if (response.ok) {form.reset();started.current=Date.now();}

    } catch {
      setResult({
        ok: false,
        message: "Something went wrong. Please try again.",
      });
    } finally {
      setPending(false);
    }
  }
  return (
    <form ref={formRef} inert={!ready} className="enquiry-form" onSubmit={submit} noValidate>
      <p className="mono">
        {product ? `ENQUIRY / ${product}` : "CONTACT"}
      </p>
      {[
        { name: "name", label: "Your name", type: "text", auto: "name" },
        { name: "email", label: "Email address", type: "email", auto: "email" },
      ].map((field) => (
        <label key={field.name}>
          {field.label}
          <input
            name={field.name}
            type={field.type}
            autoComplete={field.auto}
            required
            aria-invalid={!!result?.errors?.[field.name]}
            aria-describedby={
              result?.errors?.[field.name]
                ? `${product ? "enquiry" : "contact"}-${field.name}-error`
                : undefined
            }
          />
          {result?.errors?.[field.name] && (
            <span
              className="field-error"
              id={`${product ? "enquiry" : "contact"}-${field.name}-error`}
            >
              {result.errors[field.name]}
            </span>
          )}
        </label>
      ))}
      <label>
        Your message
        <textarea
          name="message"
          rows={5}
          required
          maxLength={2000}
          defaultValue={
            product ? `I would like to know more about ${product}.` : ""
          }
          aria-invalid={!!result?.errors?.message}
          aria-describedby="message-error"
        />
        <span className="field-error" id="message-error">
          {result?.errors?.message}
        </span>
      </label>
      <Honeypot />
      <button className="button primary" disabled={pending}>
        {pending ? "Checking…" : "Send message"} ↗
      </button>
      <p ref={status} role="status" className="form-result">
        {result?.message ?? (configured ? "We’ll reply to the email you provide." : "Online enquiries are currently unavailable.")}
      </p>
    </form>
  );
}
