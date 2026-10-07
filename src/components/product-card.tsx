"use client";
import Link from "next/link";
import { price, type Product } from "@/lib/catalogue";
import { useCatalogue } from "./catalogue-provider";
import { Photo } from "./photo";
import { useStore } from "./store";
export function ProductCard({
  product,
  index = 0,
  headingLevel = 3,
}: {
  product: Product;
  index?: number;
  headingLevel?: 2 | 3;
}) {
  const { getProductMedia } = useCatalogue();
  const Heading = headingLevel === 2 ? "h2" : "h3";
  const { favourites, toggle, add, openBag } = useStore();
  const saved = favourites.includes(product.slug);
  const available=product.variants?.find(v=>v.size===product.sizes[0]&&v.colour===product.color)?.available??0;
  const soldOut=!!product.variants&&available<=0;
  return (
    <article className="product-card">
      <div className={`product-image tone-${index % 4}`}>
        <Link
          prefetch={false}
          href={`/product/${product.slug}/`}
          aria-label={`View ${product.name}`}
        >
          <Photo
            slot={getProductMedia(product.slug).slot}
            name={product.name}
            eager={index < 2}
          />
        </Link>
        <button
          className="heart-button"
          aria-label={`${saved ? "Unsave" : "Save"} ${product.name}`}
          aria-pressed={saved}
          onClick={() => toggle(product.slug)}
        >
          <span aria-hidden="true">{saved ? "♥" : "♡"}</span>
        </button>
        <button
          className="quick-add"
          disabled={soldOut}
          aria-label={`Add to bag — ${product.name} — ${price(product.price)}`}
          onClick={() => { add(product.slug); openBag(); }}
        >
          {soldOut?"Sold out":"Add to bag"} <span>— {price(product.price)}</span>
          <span aria-hidden="true">+</span>
        </button>
      </div>
      <div className="product-info">
        <Heading>
          <Link prefetch={false} href={`/product/${product.slug}/`}>
            {product.name}
          </Link>
        </Heading>
        <span>{price(product.price)}</span>
      </div>
      <p className="mono product-technique">{product.technique}</p>
      {product.variants&&available>0&&available<=3&&<p className="small-note">Only {available} left</p>}
    </article>
  );
}
