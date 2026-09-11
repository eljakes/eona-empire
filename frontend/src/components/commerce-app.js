"use client";

/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  Check,
  CreditCard,
  Heart,
  Loader2,
  Menu,
  PackageCheck,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Truck,
  UserRound,
  X,
} from "lucide-react";
import { apiFetch, API_BASE_URL } from "@/lib/api";

const emptyCart = {
  token: null,
  items: [],
  subtotal: 0,
  item_count: 0,
};

const defaultCheckout = {
  first_name: "Ama",
  last_name: "Mensah",
  email: "ama@example.com",
  phone: "+233240000142",
  country: "Ghana",
  region: "Greater Accra",
  city: "Accra",
  area: "Osu",
  ghana_post_gps: "GA-123-4567",
  street_address: "Oxford Street",
  landmark: "Near the mall",
  delivery_notes: "Call before dispatch.",
  payment_method: "mtn_momo",
};

const statusLabels = {
  order_placed: "Order placed",
  payment_pending: "Payment pending",
  payment_confirmed: "Payment confirmed",
  processing: "Processing",
  ready_for_dispatch: "Ready for dispatch",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
};

function formatCedis(value) {
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function optionLabel(variant) {
  return [variant.length, variant.color, variant.density, variant.lace]
    .filter(Boolean)
    .join(" · ");
}

export default function CommerceApp() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [shippingZones, setShippingZones] = useState([]);
  const [adminSummary, setAdminSummary] = useState(null);
  const [cart, setCart] = useState(emptyCart);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedOptions, setSelectedOptions] = useState({});
  const [activeCategory, setActiveCategory] = useState("all");
  const [activeTexture, setActiveTexture] = useState("all");
  const [query, setQuery] = useState("");
  const [wishlist, setWishlist] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkout, setCheckout] = useState(defaultCheckout);
  const [shippingZoneId, setShippingZoneId] = useState("");
  const [trackNumber, setTrackNumber] = useState("");
  const [trackContact, setTrackContact] = useState("");
  const [trackedOrder, setTrackedOrder] = useState(null);
  const [lastOrder, setLastOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const loadCart = useCallback(async (token) => {
    if (!token) {
      setCart(emptyCart);
      return emptyCart;
    }

    try {
      const freshCart = await apiFetch(`/carts/${token}`);
      setCart(freshCart);
      return freshCart;
    } catch {
      localStorage.removeItem("eona_cart_token");
      setCart(emptyCart);
      return emptyCart;
    }
  }, []);

  const chooseProduct = useCallback((product) => {
    const firstAvailable =
      product.variants.find((variant) => variant.available_stock > 0) ||
      product.variants[0];

    setSelectedProduct(product);
    setSelectedOptions({
      length: firstAvailable?.length,
      color: firstAvailable?.color,
      density: firstAvailable?.density,
      lace: firstAvailable?.lace,
    });
  }, []);

  const loadStorefront = useCallback(async () => {
    try {
      const [productData, categoryData, zoneData, summaryData] =
        await Promise.all([
          apiFetch("/products"),
          apiFetch("/categories"),
          apiFetch("/shipping-zones"),
          apiFetch("/admin/summary"),
        ]);

      setProducts(productData);
      setCategories(categoryData);
      setShippingZones(zoneData);
      setAdminSummary(summaryData);
      setShippingZoneId(String(zoneData[0]?.id || ""));

      const initialProduct = productData[0] || null;
      if (initialProduct) {
        chooseProduct(initialProduct);
      }

      await loadCart(localStorage.getItem("eona_cart_token"));
      setError("");
    } catch (requestError) {
      setError(
        `${requestError.message} Check that the Laravel API is running at ${API_BASE_URL}.`,
      );
    } finally {
      setLoading(false);
    }
  }, [chooseProduct, loadCart]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadStorefront();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadStorefront]);

  const selectedVariant = useMemo(() => {
    if (!selectedProduct) {
      return null;
    }

    return (
      selectedProduct.variants.find(
        (variant) =>
          variant.length === selectedOptions.length &&
          variant.color === selectedOptions.color &&
          variant.density === selectedOptions.density &&
          variant.lace === selectedOptions.lace,
      ) ||
      selectedProduct.variants.find((variant) => variant.available_stock > 0) ||
      selectedProduct.variants[0]
    );
  }, [selectedOptions, selectedProduct]);

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return products.filter((product) => {
      const matchesQuery =
        !normalizedQuery ||
        [
          product.name,
          product.short_description,
          product.category?.name,
          product.collection,
          product.texture,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      const matchesCategory =
        activeCategory === "all" || product.category?.slug === activeCategory;
      const matchesTexture =
        activeTexture === "all" || product.texture === activeTexture;

      return matchesQuery && matchesCategory && matchesTexture;
    });
  }, [activeCategory, activeTexture, products, query]);

  const textures = useMemo(
    () => ["all", ...unique(products.map((product) => product.texture))],
    [products],
  );

  const selectedZone = useMemo(
    () =>
      shippingZones.find((zone) => String(zone.id) === String(shippingZoneId)) ||
      shippingZones[0],
    [shippingZoneId, shippingZones],
  );

  const shippingFee =
    selectedZone &&
    selectedZone.free_delivery_threshold &&
    Number(cart.subtotal) >= Number(selectedZone.free_delivery_threshold)
      ? 0
      : Number(selectedZone?.fee || 0);
  const orderTotal = Number(cart.subtotal || 0) + shippingFee;

  async function ensureCartToken() {
    const storedToken = localStorage.getItem("eona_cart_token");

    if (storedToken && cart.token) {
      return storedToken;
    }

    if (storedToken) {
      const storedCart = await loadCart(storedToken);
      if (storedCart.token) {
        return storedCart.token;
      }
    }

    const createdCart = await apiFetch("/carts", {
      method: "POST",
      body: JSON.stringify({}),
    });

    localStorage.setItem("eona_cart_token", createdCart.token);
    setCart(createdCart);

    return createdCart.token;
  }

  async function addToCart(product, variant) {
    if (!variant || variant.available_stock < 1) {
      setError("This variant is out of stock.");
      return;
    }

    setBusy(true);
    setError("");

    try {
      const token = await ensureCartToken();
      const updatedCart = await apiFetch(`/carts/${token}/items`, {
        method: "POST",
        body: JSON.stringify({
          product_variant_id: variant.id,
          quantity: 1,
        }),
      });

      setCart(updatedCart);
      setCartOpen(true);
      chooseProduct(product);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  async function updateCartItem(item, quantity) {
    if (!cart.token) {
      return;
    }

    setBusy(true);
    setError("");

    try {
      const updatedCart = await apiFetch(`/carts/${cart.token}/items/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({ quantity }),
      });
      setCart(updatedCart);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  async function placeOrder(event) {
    event.preventDefault();

    if (!cart.token || cart.items.length === 0) {
      setError("Add at least one item before checkout.");
      return;
    }

    setBusy(true);
    setError("");

    try {
      const order = await apiFetch("/checkout", {
        method: "POST",
        body: JSON.stringify({
          cart_token: cart.token,
          customer: {
            first_name: checkout.first_name,
            last_name: checkout.last_name,
            email: checkout.email,
            phone: checkout.phone,
          },
          address: {
            country: checkout.country,
            region: checkout.region,
            city: checkout.city,
            area: checkout.area,
            ghana_post_gps: checkout.ghana_post_gps,
            street_address: checkout.street_address,
            landmark: checkout.landmark,
            delivery_notes: checkout.delivery_notes,
          },
          shipping_zone_id: Number(shippingZoneId),
          payment_method: checkout.payment_method,
        }),
      });

      setLastOrder(order);
      setTrackNumber(order.order_number);
      setTrackContact(checkout.email);
      setTrackedOrder(null);
      setCart(emptyCart);
      setCheckoutOpen(false);
      setCartOpen(false);
      localStorage.removeItem("eona_cart_token");
      await loadStorefront();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  async function trackOrder(event) {
    event.preventDefault();

    setBusy(true);
    setError("");

    try {
      const order = await apiFetch(
        `/orders/track?order_number=${encodeURIComponent(
          trackNumber,
        )}&contact=${encodeURIComponent(trackContact)}`,
      );
      setTrackedOrder(order);
    } catch (requestError) {
      setTrackedOrder(null);
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  function updateCheckout(field, value) {
    setCheckout((current) => ({ ...current, [field]: value }));
  }

  const optionGroups = selectedProduct
    ? [
        {
          label: "Length",
          key: "length",
          values: unique(selectedProduct.variants.map((variant) => variant.length)),
        },
        {
          label: "Color",
          key: "color",
          values: unique(selectedProduct.variants.map((variant) => variant.color)),
        },
        {
          label: "Density / Pack",
          key: "density",
          values: unique(selectedProduct.variants.map((variant) => variant.density)),
        },
        {
          label: "Lace",
          key: "lace",
          values: unique(selectedProduct.variants.map((variant) => variant.lace)),
        },
      ]
    : [];

  return (
    <main id="top" className="min-h-screen bg-background text-foreground">
      <div className="bg-primary px-4 py-2 text-center text-xs font-semibold uppercase tracking-[0.14em] text-primary-foreground">
        Local API connected · Ghana-first checkout · Variant inventory from Laravel
      </div>

      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              className="grid size-9 place-items-center rounded-md border border-border lg:hidden"
              aria-label="Open navigation"
            >
              <Menu className="size-4" />
            </button>
            <a href="#top" className="text-xl font-semibold tracking-[0.18em]">
              EONA EMPIRE
            </a>
          </div>

          <div className="hidden items-center gap-6 text-sm font-medium lg:flex">
            <a href="#shop">Shop</a>
            <a href="#product-detail">Product</a>
            <a href="#track-order">Track Order</a>
            <a href="#admin">Admin</a>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="#shop"
              className="hidden h-9 items-center gap-2 rounded-md border border-border bg-card px-3 text-sm font-medium sm:flex"
            >
              <Search className="size-4" />
              Search
            </a>
            <button
              className="grid size-9 place-items-center rounded-md border border-border bg-card"
              aria-label="Account"
            >
              <UserRound className="size-4" />
            </button>
            <button
              onClick={() => setCartOpen(true)}
              className="relative grid size-9 place-items-center rounded-md border border-border bg-primary text-primary-foreground"
              aria-label="Open cart"
            >
              <ShoppingBag className="size-4" />
              {cart.item_count > 0 && (
                <span className="absolute -right-2 -top-2 grid size-5 place-items-center rounded-full bg-accent text-[10px] font-bold text-accent-foreground">
                  {cart.item_count}
                </span>
              )}
            </button>
          </div>
        </nav>
      </header>

      {error && (
        <div className="mx-auto mt-4 max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-md border border-danger/25 bg-red-50 p-3 text-sm font-medium text-danger">
            {error}
          </div>
        </div>
      )}

      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_420px] lg:px-8 lg:py-10">
        <div className="grid gap-6 bg-card p-5 shadow-sm ring-1 ring-border sm:p-7 lg:grid-cols-[minmax(0,1fr)_290px]">
          <div className="flex flex-col justify-between gap-8">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-md border border-border px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                <Sparkles className="size-3.5 text-accent" />
                Backend-powered commerce
              </div>
              <h1 className="max-w-3xl text-4xl font-semibold leading-[0.98] tracking-normal sm:text-5xl lg:text-6xl">
                Premium human hair, with real catalog and checkout operations.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground">
                Products, variants, delivery zones, cart items, orders, payments, and
                inventory movements now come from the Laravel API.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <label className="relative block">
                <span className="sr-only">Search products</span>
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search body wave, bob, lace, bundles"
                  className="h-12 w-full rounded-md border border-border bg-background pl-10 pr-3 text-sm outline-none focus:ring-4 focus:ring-accent/20"
                />
              </label>
              <a
                href="#shop"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-primary px-5 text-sm font-semibold uppercase tracking-[0.08em] text-primary-foreground"
              >
                Shop API catalog <ArrowRight className="size-4" />
              </a>
            </div>
          </div>

          <div className="relative min-h-[360px] overflow-hidden rounded-md bg-primary">
            {selectedProduct?.media?.[0] ? (
              <img
                src={selectedProduct.media[0]}
                alt={selectedProduct.name}
                className="absolute inset-0 h-full w-full object-cover opacity-90"
              />
            ) : (
              <div className="absolute inset-0 grid place-items-center bg-primary text-primary-foreground">
                <Loader2 className="size-7 animate-spin text-accent" />
              </div>
            )}
            <div className="absolute inset-x-4 bottom-4 rounded-md bg-background/94 p-4 shadow-2xl backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {products.length} products ·{" "}
                {products.reduce(
                  (total, product) => total + product.variants.length,
                  0,
                )}{" "}
                variants
              </p>
              <p className="mt-1 text-xl font-semibold">
                Live data from Laravel at port 8000.
              </p>
            </div>
          </div>
        </div>

        <aside className="bg-primary p-5 text-primary-foreground shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary-foreground/70">
            Current product
          </p>
          {selectedProduct ? (
            <>
              <img
                src={selectedProduct.media?.[0]}
                alt={selectedProduct.name}
                className="mt-4 aspect-[4/3] w-full rounded-md object-cover"
              />
              <div className="mt-4">
                <div className="flex items-center justify-between gap-4 text-sm text-primary-foreground/75">
                  <span>{selectedProduct.texture}</span>
                  <span>★ {selectedProduct.rating}</span>
                </div>
                <h2 className="mt-2 text-2xl font-semibold tracking-normal">
                  {selectedProduct.name}
                </h2>
                <div className="mt-4 flex items-center gap-2">
                  <span className="text-2xl font-semibold">
                    {formatCedis(selectedVariant?.price)}
                  </span>
                  {selectedVariant?.compare_at_price && (
                    <span className="text-sm text-primary-foreground/60 line-through">
                      {formatCedis(selectedVariant.compare_at_price)}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => addToCart(selectedProduct, selectedVariant)}
                  disabled={busy || !selectedVariant || selectedVariant.available_stock < 1}
                  className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-background text-sm font-semibold uppercase tracking-[0.08em] text-foreground disabled:opacity-50"
                >
                  {busy && <Loader2 className="size-4 animate-spin" />}
                  Add to cart
                </button>
              </div>
            </>
          ) : (
            <div className="mt-4 rounded-md bg-background/10 p-4 text-sm">
              Start the backend API to load products.
            </div>
          )}
        </aside>
      </section>

      <section className="border-y border-border bg-muted/55">
        <div className="mx-auto grid max-w-7xl gap-4 px-4 py-5 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
          {[
            [ShieldCheck, "Secure payment references", "No raw card storage"],
            [Truck, "Ghana delivery zones", "Fees from the backend"],
            [PackageCheck, "Variant stock", "Stock deducted on order"],
            [CreditCard, "Gateway-ready", "Paystack or Hubtel credentials next"],
          ].map(([Icon, title, detail]) => (
            <div key={title} className="flex items-start gap-3">
              <Icon className="mt-0.5 size-5 text-accent" />
              <div>
                <p className="text-sm font-semibold">{title}</p>
                <p className="text-xs leading-5 text-muted-foreground">{detail}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="shop" className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.12em] text-accent">
              Storefront
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-normal">
              Database catalog
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveCategory("all")}
              className={`h-10 rounded-md border px-4 text-sm font-semibold ${
                activeCategory === "all"
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card"
              }`}
            >
              All
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.slug)}
                className={`h-10 rounded-md border px-4 text-sm font-semibold ${
                  activeCategory === category.slug
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card"
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
          {textures.map((texture) => (
            <button
              key={texture}
              onClick={() => setActiveTexture(texture)}
              className={`h-10 shrink-0 rounded-md border px-4 text-sm font-semibold ${
                activeTexture === texture
                  ? "border-accent bg-accent text-accent-foreground"
                  : "border-border bg-card"
              }`}
            >
              {texture === "all" ? "All textures" : texture}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid min-h-72 place-items-center rounded-md border border-border bg-card">
            <Loader2 className="size-7 animate-spin text-accent" />
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredProducts.map((product) => {
              const firstAvailable =
                product.variants.find((variant) => variant.available_stock > 0) ||
                product.variants[0];
              const isSaved = wishlist.includes(product.id);

              return (
                <article
                  key={product.id}
                  className="group rounded-md bg-card ring-1 ring-border"
                >
                  <button
                    onClick={() => chooseProduct(product)}
                    className="relative block aspect-[4/5] w-full overflow-hidden rounded-t-md bg-muted text-left"
                  >
                    <img
                      src={product.media?.[0]}
                      alt={product.name}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04] group-hover:opacity-0"
                    />
                    <img
                      src={product.media?.[1] || product.media?.[0]}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover opacity-0 transition duration-500 group-hover:scale-[1.04] group-hover:opacity-100"
                    />
                    {product.badge && (
                      <span className="absolute left-3 top-3 rounded-md bg-background px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em]">
                        {product.badge}
                      </span>
                    )}
                  </button>
                  <div className="space-y-3 p-4">
                    <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
                      <span>{product.collection}</span>
                      <span className="inline-flex items-center gap-1">
                        <Star className="size-3.5 fill-accent text-accent" />
                        {product.rating} ({product.review_count})
                      </span>
                    </div>
                    <h3 className="min-h-12 text-lg font-semibold leading-6">
                      {product.name}
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-semibold">
                        {formatCedis(firstAvailable?.price)}
                      </span>
                      {firstAvailable?.compare_at_price && (
                        <span className="text-sm text-muted-foreground line-through">
                          {formatCedis(firstAvailable.compare_at_price)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs text-muted-foreground">
                        {product.variants.length} variants ·{" "}
                        {firstAvailable?.available_stock || 0} available
                      </p>
                      <button
                        onClick={() =>
                          setWishlist((current) =>
                            current.includes(product.id)
                              ? current.filter((id) => id !== product.id)
                              : [...current, product.id],
                          )
                        }
                        className="grid size-9 place-items-center rounded-md border border-border"
                        aria-label={`Save ${product.name}`}
                      >
                        <Heart
                          className={`size-4 ${
                            isSaved ? "fill-accent text-accent" : ""
                          }`}
                        />
                      </button>
                    </div>
                    <div className="grid grid-cols-[1fr_auto] gap-2">
                      <button
                        onClick={() => addToCart(product, firstAvailable)}
                        disabled={busy || !firstAvailable?.available_stock}
                        className="h-11 rounded-md bg-primary text-sm font-semibold uppercase tracking-[0.08em] text-primary-foreground disabled:opacity-50"
                      >
                        Quick add
                      </button>
                      <a
                        href="#product-detail"
                        onClick={() => chooseProduct(product)}
                        className="inline-flex h-11 items-center justify-center rounded-md border border-border px-3 text-sm font-semibold"
                      >
                        View
                      </a>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {selectedProduct && (
        <section
          id="product-detail"
          className="mx-auto grid max-w-7xl gap-6 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_480px] lg:px-8"
        >
          <div className="grid gap-4 md:grid-cols-[110px_minmax(0,1fr)]">
            <div className="hidden gap-3 md:grid">
              {selectedProduct.media?.map((image) => (
                <img
                  key={image}
                  src={image}
                  alt=""
                  className="aspect-square rounded-md object-cover ring-1 ring-border"
                />
              ))}
            </div>
            <div className="relative min-h-[620px] overflow-hidden rounded-md bg-muted">
              <img
                src={selectedProduct.media?.[0]}
                alt={selectedProduct.name}
                className="h-full w-full object-cover"
              />
              {selectedProduct.badge && (
                <div className="absolute left-4 top-4 rounded-md bg-background px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em]">
                  {selectedProduct.badge}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-md bg-card p-5 ring-1 ring-border sm:p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.12em] text-accent">
              {selectedProduct.category?.name}
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-normal">
              {selectedProduct.name}
            </h2>
            <p className="mt-3 leading-7 text-muted-foreground">
              {selectedProduct.description}
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1 text-sm font-semibold">
                <Star className="size-4 fill-accent text-accent" />
                {selectedProduct.rating} ({selectedProduct.review_count} reviews)
              </span>
              <span className="rounded-md bg-muted px-3 py-1 text-xs font-semibold">
                {selectedProduct.material}
              </span>
            </div>

            <div className="mt-6 flex items-end gap-3">
              <span className="text-3xl font-semibold">
                {formatCedis(selectedVariant?.price)}
              </span>
              {selectedVariant?.compare_at_price && (
                <span className="pb-1 text-base text-muted-foreground line-through">
                  {formatCedis(selectedVariant.compare_at_price)}
                </span>
              )}
            </div>

            <div className="mt-6 space-y-5">
              {optionGroups.map((group) => (
                <fieldset key={group.key}>
                  <legend className="mb-2 text-sm font-semibold">{group.label}</legend>
                  <div className="flex flex-wrap gap-2">
                    {group.values.map((value) => (
                      <button
                        key={value}
                        onClick={() =>
                          setSelectedOptions((current) => ({
                            ...current,
                            [group.key]: value,
                          }))
                        }
                        className={`h-10 rounded-md border px-3 text-sm font-semibold ${
                          selectedOptions[group.key] === value
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-background"
                        }`}
                        type="button"
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                </fieldset>
              ))}
            </div>

            <div className="mt-6 rounded-md border border-border bg-muted/60 p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold">{selectedVariant?.sku}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {selectedVariant?.available_stock > 2
                      ? "In stock - ready to ship"
                      : selectedVariant?.available_stock > 0
                        ? `Only ${selectedVariant.available_stock} left`
                        : "Out of stock"}
                  </p>
                </div>
                <PackageCheck className="size-6 text-accent" />
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <button
                onClick={() => addToCart(selectedProduct, selectedVariant)}
                disabled={busy || !selectedVariant?.available_stock}
                className="h-12 rounded-md bg-primary text-sm font-semibold uppercase tracking-[0.08em] text-primary-foreground disabled:opacity-50"
              >
                Add to cart
              </button>
              <button
                onClick={async () => {
                  await addToCart(selectedProduct, selectedVariant);
                  setCheckoutOpen(true);
                }}
                disabled={busy || !selectedVariant?.available_stock}
                className="h-12 rounded-md border border-primary text-sm font-semibold uppercase tracking-[0.08em] disabled:opacity-50"
              >
                Buy now
              </button>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {selectedProduct.care_instructions?.map((detail) => (
                <div key={detail} className="flex items-center gap-2 text-sm">
                  <Check className="size-4 text-accent" />
                  {detail}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-10 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
        <form
          id="track-order"
          onSubmit={trackOrder}
          className="rounded-md bg-card p-5 ring-1 ring-border sm:p-6"
        >
          <p className="text-sm font-semibold uppercase tracking-[0.12em] text-accent">
            Order tracking
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-normal">
            Track a real database order
          </h2>
          {lastOrder && (
            <div className="mt-4 rounded-md border border-border bg-muted/50 p-3 text-sm">
              Latest order: <strong>{lastOrder.order_number}</strong>. Use{" "}
              <strong>{trackContact}</strong> as the contact.
            </div>
          )}
          <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <label className="grid gap-1 text-sm font-medium">
              Order number
              <input
                value={trackNumber}
                onChange={(event) => setTrackNumber(event.target.value)}
                className="h-11 rounded-md border border-border bg-background px-3 outline-none focus:ring-4 focus:ring-accent/20"
                required
              />
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Email or phone
              <input
                value={trackContact}
                onChange={(event) => setTrackContact(event.target.value)}
                className="h-11 rounded-md border border-border bg-background px-3 outline-none focus:ring-4 focus:ring-accent/20"
                required
              />
            </label>
            <button className="mt-6 h-11 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground">
              Track
            </button>
          </div>

          {trackedOrder && (
            <div className="mt-6 rounded-md border border-border bg-muted/50 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-lg font-semibold">{trackedOrder.order_number}</p>
                  <p className="text-sm text-muted-foreground">
                    {trackedOrder.shipping_zone} · {formatCedis(trackedOrder.total)}
                  </p>
                </div>
                <span className="rounded-md bg-background px-3 py-1 text-xs font-semibold">
                  {statusLabels[trackedOrder.status] || trackedOrder.status}
                </span>
              </div>
              <ol className="mt-6 space-y-4">
                {trackedOrder.timeline.map((step) => (
                  <li key={step.key} className="flex items-center gap-3">
                    <span
                      className={`grid size-7 place-items-center rounded-full border text-xs font-bold ${
                        step.complete
                          ? "border-accent bg-accent text-accent-foreground"
                          : "border-border bg-background"
                      }`}
                    >
                      {step.complete ? <Check className="size-4" /> : ""}
                    </span>
                    <span
                      className={step.complete ? "font-semibold" : "text-muted-foreground"}
                    >
                      {step.label}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </form>

        <div id="admin" className="rounded-md bg-primary p-5 text-primary-foreground sm:p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.12em] text-primary-foreground/70">
            Admin operations
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-normal">
            Live admin summary
          </h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {[
              ["Revenue today", formatCedis(adminSummary?.revenue_today)],
              ["Orders today", adminSummary?.orders_today || 0],
              ["Pending dispatch", adminSummary?.pending_dispatch || 0],
              ["Low stock SKUs", adminSummary?.low_stock_skus || 0],
            ].map(([label, value]) => (
              <div key={label} className="rounded-md bg-background p-4 text-foreground">
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="mt-2 text-2xl font-semibold">{value}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-md bg-background p-4 text-foreground">
            <div className="flex items-center gap-2">
              <BarChart3 className="size-5 text-accent" />
              <h3 className="font-semibold">Low stock variants</h3>
            </div>
            <div className="mt-4 space-y-2">
              {(adminSummary?.low_stock || []).slice(0, 5).map((variant) => (
                <div
                  key={variant.id}
                  className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"
                >
                  <span>{variant.sku}</span>
                  <span className="font-semibold">
                    {variant.stock_quantity - variant.reserved_quantity} left
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-border bg-primary px-4 py-10 text-primary-foreground sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-[1fr_2fr]">
          <div>
            <p className="text-2xl font-semibold tracking-[0.18em]">EONA EMPIRE</p>
            <p className="mt-4 max-w-sm text-sm leading-6 text-primary-foreground/70">
              Connected local stack: Next.js storefront, Laravel API, database-backed
              commerce, and Docker-ready infrastructure.
            </p>
          </div>
          <div className="grid gap-6 text-sm sm:grid-cols-4">
            {[
              ["Shop", "Wigs", "Bundles", "Closures", "Best Sellers"],
              ["Help", "Contact", "FAQ", "Track Order", "Returns"],
              ["Legal", "Privacy", "Terms", "Refunds", "Shipping"],
              ["Ops", "Catalog", "Inventory", "Orders", "Payments"],
            ].map(([title, ...links]) => (
              <div key={title}>
                <p className="font-semibold">{title}</p>
                <div className="mt-3 grid gap-2 text-primary-foreground/70">
                  {links.map((link) => (
                    <a
                      key={link}
                      href={link === "Track Order" ? "#track-order" : "#shop"}
                    >
                      {link}
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </footer>

      {cartOpen && (
        <div className="fixed inset-0 z-50 bg-black/25" role="presentation">
          <aside className="ml-auto flex h-full w-full max-w-xl flex-col bg-background shadow-2xl">
            <div className="flex items-center justify-between border-b border-border p-4">
              <div>
                <p className="text-lg font-semibold">Shopping cart</p>
                <p className="text-sm text-muted-foreground">
                  Token persisted in browser, items stored in Laravel
                </p>
              </div>
              <button
                onClick={() => setCartOpen(false)}
                className="grid size-9 place-items-center rounded-md border border-border"
                aria-label="Close cart"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-4">
              {cart.items.length === 0 ? (
                <div className="grid min-h-72 place-items-center rounded-md border border-dashed border-border text-center">
                  <div>
                    <ShoppingBag className="mx-auto size-8 text-muted-foreground" />
                    <p className="mt-3 font-semibold">Your cart is empty</p>
                    <a
                      href="#shop"
                      onClick={() => setCartOpen(false)}
                      className="mt-3 inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground"
                    >
                      Start shopping
                    </a>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {cart.items.map((item) => (
                    <div
                      key={item.id}
                      className="grid grid-cols-[88px_minmax(0,1fr)] gap-3 rounded-md border border-border bg-card p-3"
                    >
                      <img
                        src={item.image_url}
                        alt={item.product_name}
                        className="aspect-square rounded-md object-cover"
                      />
                      <div>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold leading-5">{item.product_name}</p>
                            <p className="mt-1 text-xs leading-5 text-muted-foreground">
                              {optionLabel(item)}
                            </p>
                          </div>
                          <p className="font-semibold">{formatCedis(item.unit_price)}</p>
                        </div>
                        <div className="mt-3 flex items-center justify-between">
                          <div className="flex items-center rounded-md border border-border">
                            <button
                              onClick={() => updateCartItem(item, item.quantity - 1)}
                              className="grid size-8 place-items-center"
                              aria-label={`Decrease ${item.product_name}`}
                            >
                              -
                            </button>
                            <span className="grid size-8 place-items-center text-sm font-semibold">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateCartItem(item, item.quantity + 1)}
                              className="grid size-8 place-items-center"
                              aria-label={`Increase ${item.product_name}`}
                            >
                              +
                            </button>
                          </div>
                          <button
                            onClick={() => updateCartItem(item, 0)}
                            className="text-sm font-semibold text-muted-foreground"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {checkoutOpen && cart.items.length > 0 && (
                <form
                  onSubmit={placeOrder}
                  className="mt-5 rounded-md border border-border bg-card p-4"
                >
                  <p className="text-lg font-semibold">Checkout</p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {[
                      ["first_name", "First name"],
                      ["last_name", "Last name"],
                      ["email", "Email"],
                      ["phone", "Phone"],
                      ["region", "Region"],
                      ["city", "City/Town"],
                      ["area", "Area/Suburb"],
                      ["ghana_post_gps", "GhanaPost GPS"],
                      ["street_address", "Street/House"],
                      ["landmark", "Nearest landmark"],
                    ].map(([field, label]) => (
                      <label key={field} className="grid gap-1 text-sm font-medium">
                        {label}
                        <input
                          value={checkout[field]}
                          onChange={(event) => updateCheckout(field, event.target.value)}
                          className="h-10 rounded-md border border-border bg-background px-3 outline-none focus:ring-4 focus:ring-accent/20"
                          required={[
                            "first_name",
                            "last_name",
                            "email",
                            "phone",
                            "region",
                            "city",
                          ].includes(field)}
                        />
                      </label>
                    ))}
                  </div>
                  <label className="mt-3 grid gap-1 text-sm font-medium">
                    Delivery zone
                    <select
                      value={shippingZoneId}
                      onChange={(event) => setShippingZoneId(event.target.value)}
                      className="h-10 rounded-md border border-border bg-background px-3 outline-none focus:ring-4 focus:ring-accent/20"
                      required
                    >
                      {shippingZones.map((zone) => (
                        <option key={zone.id} value={zone.id}>
                          {zone.name} · {formatCedis(zone.fee)} · {zone.timeframe}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="mt-3 grid gap-1 text-sm font-medium">
                    Delivery instructions
                    <textarea
                      value={checkout.delivery_notes}
                      onChange={(event) =>
                        updateCheckout("delivery_notes", event.target.value)
                      }
                      className="min-h-20 rounded-md border border-border bg-background p-3 outline-none focus:ring-4 focus:ring-accent/20"
                    />
                  </label>
                  <label className="mt-3 grid gap-1 text-sm font-medium">
                    Payment method
                    <select
                      value={checkout.payment_method}
                      onChange={(event) =>
                        updateCheckout("payment_method", event.target.value)
                      }
                      className="h-10 rounded-md border border-border bg-background px-3 outline-none focus:ring-4 focus:ring-accent/20"
                    >
                      <option value="mtn_momo">MTN MoMo</option>
                      <option value="telecel_cash">Telecel Cash</option>
                      <option value="card">Visa/Mastercard</option>
                      <option value="bank_transfer">Bank transfer</option>
                    </select>
                  </label>
                  <button
                    disabled={busy}
                    className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary text-sm font-semibold uppercase tracking-[0.08em] text-primary-foreground disabled:opacity-50"
                  >
                    {busy && <Loader2 className="size-4 animate-spin" />}
                    Create order and payment reference
                  </button>
                </form>
              )}
            </div>

            <div className="border-t border-border p-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{formatCedis(cart.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery</span>
                  <span>{shippingFee === 0 ? "Free" : formatCedis(shippingFee)}</span>
                </div>
                <div className="flex justify-between text-lg font-semibold">
                  <span>Total</span>
                  <span>{formatCedis(orderTotal)}</span>
                </div>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <button
                  onClick={() => setCartOpen(false)}
                  className="h-11 rounded-md border border-border text-sm font-semibold"
                >
                  Continue shopping
                </button>
                <button
                  onClick={() => setCheckoutOpen(true)}
                  disabled={!cart.items.length}
                  className="h-11 rounded-md bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-50"
                >
                  Checkout
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}
    </main>
  );
}
