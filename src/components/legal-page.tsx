import { getLegal,getStorefront } from "@/lib/data";
import { PageShell } from "./page-shell";
export async function LegalPage({
  slug,
}: {
  slug: keyof ReturnType<typeof getLegal>;
}) {
  const page = getLegal()[slug];
  const configured=(await getStorefront()).configured;
  const liveSections:Record<string,[string,string][]>={
    privacy:[
      ["Your saved pieces","Your bag and saved pieces are stored in your browser on this device. Clear this website’s browser data to remove them."],
      ["Orders and enquiries","The details you provide at checkout, contact or sign-up are stored in our database to process test orders, reply to enquiries and record your email consent. Payment card information is handled by Razorpay, not stored on this site."],
      ["Emails and cookies","Resend sends order and enquiry emails. A short-lived signed cookie lets your browser see its own paid order confirmation. The payment provider may use its own cookies during checkout. We do not use an analytics service."],
    ],
    terms:[
      ["The collection","Browse pieces, save favourites and place test orders. Availability and prices are checked again by the server at checkout."],
      ["Test payments","Razorpay Test Mode simulates payment. No real money is charged and no real garment or delivery is promised. A confirmation shows only a test order."],
      ["Images and detail","Colours can vary between screens. Confirm the materials, measurements and finish before any future live purchase."],
    ],
    "shipping-returns":[
      ["Test orders","Checkout currently runs in Test Mode. No physical item is dispatched, so the displayed shipping fee is part of the test order only."],
      ["Live delivery and returns","Delivery estimates, exchange eligibility and refund terms will be confirmed before live orders are accepted."],
      ["Your bag","Saving a piece does not reserve it. Test checkout reserves stock briefly while payment is attempted."],
    ],
  };
  const sections=configured?liveSections[slug]:page.sections;
  return (
    <PageShell>
      <div className="page-heading">
        <p className="eyebrow mono">INFORMATION</p>
        <h1>{page.title}</h1>
        <p>{page.description}</p>
      </div>
      <article className="legal-copy">
        {sections.map(([title, text]) => (
          <section key={title}>
            <h2>{title}</h2>
            <p>{text}</p>
          </section>
        ))}
      </article>
    </PageShell>
  );
}
