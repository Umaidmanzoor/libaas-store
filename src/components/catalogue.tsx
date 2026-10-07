"use client";
import { useState } from "react";
import Link from "next/link";
import { useCatalogue } from "./catalogue-provider";
import { ProductCard } from "./product-card";
import { useStore } from "./store";
export function Catalogue({
  category = "all",
  wishlist = false,
}: {
  category?: string;
  wishlist?: boolean;
}) {
  const { getCollections, getProducts } = useCatalogue();
  const [filter, setFilter] = useState(category),
    [query, setQuery] = useState(""),
    [sort, setSort] = useState("featured");
  const { favourites, ready } = useStore();
  const products = getProducts()
    .filter(
      (p) =>
        (!wishlist || favourites.includes(p.slug)) &&
        (filter === "all" || p.category === filter) &&
        `${p.name} ${p.technique} ${p.colors.join(" ")}`
          .toLowerCase()
          .includes(query.trim().toLowerCase()),
    )
    .sort((a, b) =>
      sort === "low"
        ? a.price - b.price
        : sort === "high"
          ? b.price - a.price
          : Number(b.featured) - Number(a.featured),
    );
  const collection = getCollections().find((c) => c.slug === category);
  return (
    <>
      <div className="page-heading">
        <p className="eyebrow mono">
          {wishlist
            ? "YOUR PERSONAL EDIT"
            : "THE KASHMIR EDIT / THE COLLECTION"}
        </p>
        <h1>
          {wishlist
            ? "Worth keeping."
            : collection
              ? collection.name
              : "Find your familiar."}
        </h1>
        <p>
          {wishlist
            ? "The pieces you have your eye on, saved in this browser."
            : (collection?.caption ??
              "Sixteen considered pieces. Four ways to bring a little of the valley into your wardrobe.")}
        </p>
      </div>
      <div className="catalogue-tools">
        <div className="filters" aria-label="Filter products">
          {[{ slug: "all", name: "All pieces" }, ...getCollections()].map(
            (c) => (
              <button
                key={c.slug}
                aria-pressed={filter === c.slug}
                onClick={() => setFilter(c.slug)}
              >
                {c.name}
              </button>
            ),
          )}
        </div>
        <div className="search-sort">
          <label>
            Search pieces
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Try shawl, indigo, floral…"
            />
          </label>
          <label>
            Sort by
            <select value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="featured">Featured</option>
              <option value="low">Price: low to high</option>
              <option value="high">Price: high to low</option>
            </select>
          </label>
        </div>
      </div>
      {wishlist && !ready ? (
        <div className="skeleton" role="status">
          Loading your saved pieces…
        </div>
      ) : (
        <>
          <p className="mono results-count" role="status">
            {products.length} {products.length === 1 ? "piece" : "pieces"} /
            PIECES
          </p>
          {products.length ? (
            <div className="product-group catalogue-grid">
              {products.map((p, i) => (
                <ProductCard
                  headingLevel={2}
                  key={p.slug}
                  product={p}
                  index={i}
                />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <h2>
                {wishlist && !favourites.length
                  ? "A collection of your own."
                  : "No pieces found."}
              </h2>
              <p>
                {wishlist && !favourites.length
                  ? "Tap a heart on any piece to save it here."
                  : "Try another search or explore all collections."}
              </p>
              {wishlist && !favourites.length ? (
                <Link prefetch={false} href="/shop/" className="button primary">
                  Shop the Collection ↗
                </Link>
              ) : (
                <button
                  className="button primary"
                  onClick={() => {
                    setQuery("");
                    setFilter("all");
                  }}
                >
                  Reset filters
                </button>
              )}
            </div>
          )}
        </>
      )}
    </>
  );
}
