import { pageMetadata } from "@/lib/seo";
import Link from "next/link";
import { PageShell } from "@/components/page-shell";
import { Photo } from "@/components/photo";
import { getCraftStories } from "@/lib/data";
export const metadata = pageMetadata(
  "Our Craft — Libaas",
  "Explore the textile ideas behind the Libaas collection: thread, weave and embroidered detail.",
  "/our-craft/",
  false,
);
export default function Page() {
  return (
    <PageShell>
      <div className="page-heading">
        <p className="eyebrow mono">THE ATELIER / AN EXPLORATION</p>
        <h1>Look a little closer.</h1>
        <p>
          A collection inspired by the valley’s textile traditions. A reason to
          notice the smallest details.
        </p>
      </div>
      <div className="craft-cover">
        <Photo
          slot="atelier/fabric"
          name="A study in thread"
          alt="A vintage Indian textile showing woven threads."
        />
      </div>
      <p className="small-note">
        An intimate study of colour and woven thread.
      </p>
      <div className="craft-stories">
        {getCraftStories().map((story, i) => (
          <section key={story.name}>
            <p className="mono">0{i + 1} /</p>
            <h2>{story.name}</h2>
            <p>{story.text}</p>
          </section>
        ))}
      </div>
      <div className="craft-ending">
        <h2>
          Made for
          <br />
          <em>your everyday.</em>
        </h2>
        <p>
          Explore the pieces, and imagine how they might become part of
          your story.
        </p>
        <Link href="/shop/" className="button primary">
          Shop the Collection ↗
        </Link>
      </div>
    </PageShell>
  );
}
