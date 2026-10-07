"use client";
import { lockPageScroll } from "@/lib/scroll-lock";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { price } from "@/lib/catalogue";
import { useCatalogue } from "./catalogue-provider";
import { Photo } from "./photo";
export type CartItem = {
  slug: string;
  size: string;
  color: string;
  quantity: number;
};
export const itemKey = (item: CartItem) =>
  `${item.slug}|${item.size}|${item.color}`;
type Store = {
  items: CartItem[];
  favourites: string[];
  ready: boolean;
  count: number;
  notice: string;
  add: (slug: string, size?: string, color?: string) => void;
  toggle: (slug: string) => void;
  quantity: (key: string, n: number) => void;
  clear: () => void;
  openBag: () => void;
  closeBag: () => void;
  notify: (message: string) => void;
};
const StoreContext = createContext<Store | null>(null);
export function useStore() {
  const store = useContext(StoreContext);
  if (!store) throw Error("Store provider missing");
  return store;
}
function validateItems(raw: unknown, {getProduct, getCommerce}: ReturnType<typeof useCatalogue>): CartItem[] {
  if (!Array.isArray(raw)) return [];
  const items: CartItem[] = [];
  for (const value of raw.slice(0, 100)) {
    const item = typeof value === "string" ? { slug: value } : value;
    if (!item || typeof item !== "object") continue;
    const product = getProduct(item.slug);
    if (!product) continue;
    const size = product.sizes.includes(item.size)
      ? item.size
      : product.sizes[0];
    const color = product.colors.includes(item.color)
      ? item.color
      : product.color;
    const quantity =
      typeof item.quantity === "number" && Number.isFinite(item.quantity)
        ? Math.max(
            1,
            Math.min(getCommerce().maxQuantity, Math.floor(item.quantity)),
          )
        : 1;
    const found = items.find(
      (x) =>
        itemKey(x) === itemKey({ slug: product.slug, size, color, quantity }),
    );
    if (found)
      found.quantity = Math.min(
        getCommerce().maxQuantity,
        found.quantity + quantity,
      );
    else items.push({ slug: product.slug, size, color, quantity });
  }
  return items;
}
export function StoreProvider({ children }: { children: ReactNode }) {
  const catalogue = useCatalogue();
  const { getCommerce, getProduct } = catalogue;
  const [items, setItems] = useState<CartItem[]>([]),
    [favourites, setFavourites] = useState<string[]>([]),
    [ready, setReady] = useState(false),
    [notice, setNotice] = useState(""),
    [bagOpen, setBagOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null),
    opener = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const load = () => {
      try {
        setItems(
          validateItems(
            JSON.parse(
              localStorage.getItem("libaas-cart-v2") ??
                localStorage.getItem("libaas-bag") ??
                "[]",
            ), catalogue,
          ),
        );
        const saved: unknown = JSON.parse(
          localStorage.getItem("libaas-saved") ?? "[]",
        );
        setFavourites(
          Array.isArray(saved)
            ? [
                ...new Set(
                  saved.filter(
                    (slug): slug is string =>
                      typeof slug === "string" && !!getProduct(slug),
                  ),
                ),
              ]
            : [],
        );
      } catch {
        setNotice(
          "Saved selections could not be read. You can start a new bag.",
        );
      }
      setReady(true);
    };
    load();
    window.addEventListener("storage", load);
    return () => window.removeEventListener("storage", load);
  }, [catalogue, getProduct]);
  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => setNotice(""), 5000);
    return () => clearTimeout(id);
  }, [notice]);
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (bagOpen) {
      opener.current = document.activeElement as HTMLElement;
      element.showModal();
      const unlock=lockPageScroll();
      return () => {
        unlock();
        element.close();
        opener.current?.focus();
      };
    }
  }, [bagOpen]);
  function persist(key: string, value: unknown) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      setNotice(
        "Browser storage is unavailable. Your selection is kept for this visit only.",
      );
      return false;
    }
  }
  function commit(next: CartItem[]) {
    setItems(next);
    return persist("libaas-cart-v2", next);
  }
  function add(slug: string, size?: string, color?: string) {
    const p = getProduct(slug);
    if (!p) return;
    const item = {
      slug,
      size: size ?? p.sizes[0],
      color: color ?? p.color,
      quantity: 1,
    };
    if (!p.sizes.includes(item.size) || !p.colors.includes(item.color)) return;
    const existing = items.find((x) => itemKey(x) === itemKey(item));
    if (existing && existing.quantity >= getCommerce().maxQuantity) {
      setNotice(`Maximum ${getCommerce().maxQuantity} per variant.`);
      return;
    }
    const stored = commit(
      existing
        ? items.map((x) =>
            itemKey(x) === itemKey(item)
              ? { ...x, quantity: x.quantity + 1 }
              : x,
          )
        : [...items, item],
    );
    if (stored) setNotice(`${p.name} added to your bag.`);
  }
  function toggle(slug: string) {
    if (!getProduct(slug)) return;
    const next = favourites.includes(slug)
      ? favourites.filter((x) => x !== slug)
      : [...favourites, slug];
    setFavourites(next);
    persist("libaas-saved", next);
  }
  function quantity(key: string, n: number) {
    const stored = commit(
      n <= 0
        ? items.filter((x) => itemKey(x) !== key)
        : items.map((x) =>
            itemKey(x) === key
              ? {
                  ...x,
                  quantity: Math.min(getCommerce().maxQuantity, Math.floor(n)),
                }
              : x,
          ),
    );
    if (stored)
      setNotice(
        n <= 0 ? "Piece removed from your bag." : "Bag quantity updated.",
      );
  }
  const count = items.reduce((sum, item) => sum + item.quantity, 0);
  const value: Store = {
    items,
    favourites,
    ready,
    count,
    notice,
    add,
    toggle,
    quantity,
    clear: () => commit([]),
    openBag: () => setBagOpen(true),
    closeBag: () => setBagOpen(false),
    notify: setNotice,
  };
  return (
    <StoreContext.Provider value={value}>
      {children}
      <dialog
        ref={dialog}
        className="bag-drawer"
        aria-labelledby="bag-title"
        data-lenis-prevent
        onCancel={() => setBagOpen(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) setBagOpen(false);
        }}
      >
        <div className="drawer-body">
          <div className="drawer-heading">
            <h2 id="bag-title">
              Your bag <small>({count})</small>
            </h2>
            <button
              className="text-button"
              onClick={() => setBagOpen(false)}
              aria-label="Close bag"
            >
              Close ×
            </button>
          </div>
          <p className="mono">YOUR SELECTED PIECES</p>
          <CartContents compact />
          <Link
            prefetch={false}
            className="text-link"
            href="/cart/"
            onClick={() => setBagOpen(false)}
          >
            View full bag ↗
          </Link>
        </div>
      </dialog>
      <div
        className={`toast ${notice ? "is-visible" : ""}`}
        role="status"
        aria-live="polite"
      >
        {notice}
      </div>
    </StoreContext.Provider>
  );
}
export function Totals() {
  const catalogue = useCatalogue();
  const { getCommerce, getProduct } = catalogue;
  const { items } = useStore();
  const subtotal = items.reduce(
      (sum, item) => sum + (getProduct(item.slug)?.price ?? 0) * item.quantity,
      0,
    ),
    shipping =
      subtotal === 0 || subtotal >= getCommerce().shippingThreshold
        ? 0
        : getCommerce().shippingFee;
  return (
    <dl className="totals">
      <div>
        <dt>Subtotal</dt>
        <dd>{price(subtotal)}</dd>
      </div>
      <div>
        <dt>
          Shipping estimate
        </dt>
        <dd>{shipping ? price(shipping) : "Free"}</dd>
      </div>
      <div className="total">
        <dt>
          Total
        </dt>
        <dd>{price(subtotal + shipping)}</dd>
      </div>
    </dl>
  );
}
export function CartContents({ compact = false }: { compact?: boolean }) {
  const catalogue = useCatalogue();
  const { getCommerce, getProduct, getProductMedia } = catalogue;
  const { items, ready, quantity, closeBag } = useStore();
  if (!ready)
    return (
      <div className="skeleton" role="status">
        Loading your bag…
      </div>
    );
  if (!items.length)
    return (
      <div className="empty-state">
        <h3>A little space for something lovely.</h3>
        <p>Your bag is empty.</p>
        <Link
          prefetch={false}
          className="button primary"
          href="/shop/"
          onClick={closeBag}
        >
          Shop the Collection ↗
        </Link>
      </div>
    );
  return (
    <>
      <ul className={`cart-list ${compact ? "compact" : ""}`}>
        {items.map((item) => {
          const p = getProduct(item.slug)!;
          const key = itemKey(item);
          return (
            <li key={key}>
              <Link
                prefetch={false}
                href={`/product/${p.slug}/`}
                onClick={closeBag}
                className="cart-photo"
              >
                <Photo slot={getProductMedia(p.slug, item.color).slot} name={p.name} />
              </Link>
              <div className="cart-item-info">
                <Link
                  prefetch={false}
                  href={`/product/${p.slug}/`}
                  onClick={closeBag}
                >
                  <h3>{p.name}</h3>
                </Link>
                <p>
                  {item.color} / {item.size}
                </p>
                <span>{price(p.price)}</span>
                <div className="quantity-control">
                  <button
                    aria-label={`Decrease ${p.name} ${item.size} ${item.color}`}
                    disabled={item.quantity === 1}
                    onClick={() => quantity(key, item.quantity - 1)}
                  >
                    −
                  </button>
                  <span aria-label={`Quantity for ${p.name}`}>
                    {item.quantity}
                  </span>
                  <button
                    aria-label={`Increase ${p.name} ${item.size} ${item.color}`}
                    disabled={item.quantity >= getCommerce().maxQuantity}
                    onClick={() => quantity(key, item.quantity + 1)}
                  >
                    +
                  </button>
                </div>
                <button
                  className="text-button remove-item"
                  onClick={() => quantity(key, 0)}
                  aria-label={`Remove ${p.name} ${item.size} ${item.color}`}
                >
                  Remove
                </button>
              </div>
              <span className="line-total">
                {price(p.price * item.quantity)}
              </span>
            </li>
          );
        })}
      </ul>
      <div aria-live="polite">
        <Totals />
      </div>
      <p className="small-note">{getCommerce().shippingNote}</p>
      <Link
        prefetch={false}
        href="/checkout/"
        className="button primary checkout-link"
        onClick={closeBag}
      >
        Continue to checkout ↗
      </Link>
      <p className="small-note">No payment taken. No order placed.</p>
    </>
  );
}
