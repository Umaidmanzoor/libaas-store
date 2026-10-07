export const site = {
  name: "Libaas",
  url: "https://libaas.example",
  whatsapp: "",
  nav: [
    { label: "Shop", href: "/shop/" },
    { label: "Collections", href: "/#collections" },
    { label: "Our Craft", href: "/our-craft/" },
    { label: "Contact", href: "/contact/" },
  ],
  footer: [
    {
      title: "Shop",
      links: [
        { label: "The selection", href: "/shop/" },
        { label: "Four collections", href: "/#collections" },
      ],
    },
    {
      title: "House",
      links: [
        { label: "The atelier", href: "/our-craft/" },
        { label: "Worn notes", href: "/#notes" },
      ],
    },
    {
      title: "Care",
      links: [
        { label: "Keeping your pieces", href: "/#care" },
        { label: "Shipping & returns", href: "/shipping-returns/" },
      ],
    },
    {
      title: "Contact",
      links: [
        { label: "Write to us", href: "/contact/" },
        { label: "Stay in the loop", href: "/#newsletter" },
        { label: "Product enquiries", href: "/contact/" },
      ],
    },
  ],
  trust: [
    "Inspired by the valley",
    "Shawls, phirans, suits & stoles",
    "Details worth a closer look",
    "Explore the collection",
  ],
  signature: "Apparel & Design",
  hero: [
    {
      slot: "hero/hero-1",
      name: "The embroidery",
      alt: "An ivory shawl with colourful floral embroidery and softly gathered folds.",
    },
    {
      slot: "hero/hero-2",
      name: "The valley",
      alt: "Two people walking through a sunlit mountain meadow in Kashmir.",
    },
    {
      slot: "hero/hero-3",
      name: "The detail",
      alt: "Close view of the woven threads of a vintage Indian textile.",
    },
  ],
};
export const collections = [
  { name: "Shawls", slug: "shawls", caption: "A quiet kind of warmth." },
  { name: "Phirans", slug: "phirans", caption: "Room for the slower days." },
  { name: "Suits", slug: "suits", caption: "Tradition, in every detail." },
  { name: "Stoles", slug: "stoles", caption: "A little warmth to take along." },
];
export const notes = {
  quote: "Some things belong to a season. Others become part of your story.",
  cards: [
    "A shawl on the chair. A little warmth, waiting.",
    "The smallest stitch can hold the longest memory.",
    "For the days you want to feel a little closer to home.",
  ],
};
