"use client";
import { useCatalogue } from "./catalogue-provider";
export function Photo({
  slot,
  name,
  alt,
  priority = false,
  eager = false,
  className = "",
  sizes: requestedSizes,
}: {
  slot: string;
  name: string;
  alt?: string;
  priority?: boolean;
  eager?: boolean;
  className?: string;
  sizes?: string;
}) {
  const { getImage } = useCatalogue();
  const image = getImage(slot);
  if (!image)
    return (
      <div
        className={`photo placeholder ${className}`}
        role="img"
        aria-label={`${name}. Photo coming soon.`}
      >
        <span className="placeholder-line" aria-hidden="true" />
        <span className="placeholder-name" aria-hidden="true">
          {name}
        </span>
        <span className="mono" aria-hidden="true">
          Photo coming soon
        </span>
        <span className="placeholder-index" aria-hidden="true">
          L /
        </span>
      </div>
    );
  const sizes = requestedSizes ?? (slot.startsWith("atelier")
    ? "100vw"
    : "(min-width: 1024px) 33vw, (min-width: 600px) 45vw, 50vw");
  return (
    <picture className={`photo ${className}`}>
      <source
        type={image.sourceType ?? "image/avif"}
        srcSet={image.variants.map((v) => `${v.avif} ${v.width}w`).join(", ")}
        sizes={sizes}
      />
      <img
        src={image.variants[1].webp}
        srcSet={image.variants.map((v) => `${v.webp} ${v.width}w`).join(", ")}
        sizes={sizes}
        width={image.width}
        height={image.height}
        alt={alt ?? name}
        loading={priority || eager ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        decoding="async"
      />
    </picture>
  );
}
