import { getSettings } from "@/lib/data";
import { pageMetadata } from "@/lib/seo";
import { PageShell } from "@/components/page-shell";
import { EnquiryForm } from "@/components/enquiry-form";
export const metadata = pageMetadata(
  "Contact — Libaas",
  "Questions about the Libaas collection, fit and details.",
  "/contact/",
  false,
);
export default async function Page() {
  const settings = await getSettings();
  return (
    <PageShell>
      <div className="page-heading">
        <p className="eyebrow mono">A CONVERSATION, UNHURRIED</p>
        <h1>We begin with hello.</h1>
        <p>
          A question about a piece, a detail, or the collection. Try the form
          below.
        </p>
      </div>
      <div className="contact-layout">
        <div>
          <h2>
            A little
            <br />
            <em>conversation.</em>
          </h2>
          <p>A closer look at colour, texture and fit. Share what caught your eye.</p>
          {settings.store_email && <p><a href={`mailto:${settings.store_email}`}>{settings.store_email}</a></p>}
          {settings.store_phone && <p><a href={`tel:${settings.store_phone}`}>{settings.store_phone}</a></p>}
          {settings.store_address && <p>{settings.store_address}</p>}
          {settings.store_hours && <p>{settings.store_hours}</p>}
          {/^[0-9]{10,15}$/.test(settings.whatsapp_number) && <p><a href={`https://wa.me/${settings.whatsapp_number}`}>WhatsApp enquiries</a></p>}
          <details>
            <summary>Delivery and exchanges</summary>
            <p>
              Delivery and exchange terms will be confirmed before live orders are accepted.
            </p>
          </details>
        </div>
        <EnquiryForm />
      </div>
    </PageShell>
  );
}
