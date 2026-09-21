"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Archive,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Crown,
  Heart,
  HelpCircle,
  ImagePlus,
  LogIn,
  LogOut,
  Loader2,
  MessageCircle,
  Menu,
  Minus,
  RotateCcw,
  Search,
  ShieldCheck,
  ShoppingBag,
  SlidersHorizontal,
  Star,
  Trash2,
  Truck,
  UserRound,
  Wrench,
  X,
} from "lucide-react";
import { API_BASE_URL, apiFetch } from "@/lib/api";
import {
  checkoutDefaults,
  fallbackAdminSummary,
  fallbackCategories,
  fallbackProducts,
  fallbackShippingZones,
  heroSlides,
  servicePromises,
  storefrontImages,
} from "@/lib/store-data";

const WHATSAPP_SUPPORT_URL =
  "https://wa.me/233200745409?text=Hello%20Eona%20Empire%2C%20I%20need%20help%20with%20my%20order.";

const emptyCart = {
  token: null,
  status: "active",
  items: [],
  subtotal: 0,
  item_count: 0,
};

const localMediaBySlug = {
  "eona-signature-body-wave-hd-wig": [
    storefrontImages.bodyWave,
    storefrontImages.hero,
  ],
  "akwaaba-sleek-bob-lace-wig": [
    storefrontImages.sleekBob,
    storefrontImages.hero,
  ],
  "gold-coast-kinky-curly-unit": [
    storefrontImages.kinkyCurly,
    storefrontImages.bodyWave,
  ],
  "kumasi-deep-wave-bundle-set": [
    storefrontImages.deepWave,
    storefrontImages.kinkyCurly,
  ],
  "ada-water-wave-closure-set": [
    storefrontImages.waterWave,
    storefrontImages.deepWave,
  ],
};

const demoAdminUser = {
  id: "demo-admin",
  name: "Eona Admin",
  email: "admin@eonaempire.com",
  phone: "+233240000000",
  role: "admin",
  password: "Admin12345",
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

function optionLabel(item) {
  return [item.length, item.color, item.density, item.lace].filter(Boolean).join(" · ");
}

function firstAvailableVariant(product) {
  return (
    product?.variants?.find((variant) => variant.available_stock > 0) ||
    product?.variants?.[0] ||
    null
  );
}

function priceRange(product) {
  if (!product) {
    return "";
  }

  if (Number(product.price_min) === Number(product.price_max)) {
    return formatCedis(product.price_min);
  }

  return `${formatCedis(product.price_min)} - ${formatCedis(product.price_max)}`;
}

function productHref(slug) {
  return `/product/?slug=${encodeURIComponent(slug)}`;
}

function withLocalMedia(product) {
  const apiOrigin = new URL(API_BASE_URL).origin;
  const resolveMedia = (images = []) => images.map((image) =>
    typeof image === "string" && image.startsWith("/storage/")
      ? `${apiOrigin}${image}`
      : image,
  );
  const media = resolveMedia(product.media);

  return {
    ...product,
    raw_media: resolveMedia(product.raw_media),
    media:
      localMediaBySlug[product.slug] ||
      (media.length ? media : [storefrontImages.bodyWave]),
  };
}

function cartWithTotals(cart) {
  const items = (cart.items || []).map((item) => ({
    ...item,
    image_url: localMediaBySlug[item.product_slug]?.[0] || item.image_url,
    line_total: Number(item.unit_price || 0) * Number(item.quantity || 0),
  }));

  return {
    ...cart,
    items,
    subtotal: items.reduce((sum, item) => sum + item.line_total, 0),
    item_count: items.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
  };
}

function buildCartItem(product, variant, quantity = 1) {
  return {
    id: `demo-${variant.id}`,
    product_id: product.id,
    product_name: product.name,
    product_slug: product.slug,
    image_url: product.media?.[0],
    product_variant_id: variant.id,
    sku: variant.sku,
    length: variant.length,
    color: variant.color,
    density: variant.density,
    lace: variant.lace,
    quantity,
    unit_price: Number(variant.price),
    line_total: Number(variant.price) * quantity,
    available_stock: variant.available_stock,
  };
}

function readJson(key) {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return JSON.parse(localStorage.getItem(key) || "null");
  } catch {
    return null;
  }
}

function writeJson(key, value) {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      if (error?.name === "QuotaExceededError") {
        throw new Error("Browser storage is full. Remove unused preview data and try again.");
      }
      throw error;
    }
  }
}

function openDemoDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("eona_empire_preview", 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains("store")) {
        request.result.createObjectStore("store");
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function readDemoProducts() {
  if (typeof window === "undefined" || !window.indexedDB) {
    return fallbackProducts;
  }

  const database = await openDemoDatabase();
  const storedProducts = await new Promise((resolve, reject) => {
    const request = database.transaction("store").objectStore("store").get("products");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  database.close();

  const legacyProducts = readJson("eona_store_products");
  const sourceProducts = storedProducts?.length ? storedProducts : legacyProducts;

  if (sourceProducts?.length) {
    const normalizedProducts = await normalizePersistedProductImages(sourceProducts);
    if (normalizedProducts !== sourceProducts || legacyProducts?.length) {
      await persistDemoProducts(normalizedProducts);
    }
    localStorage.removeItem("eona_store_products");
    return normalizedProducts;
  }

  return fallbackProducts;
}

async function persistDemoProducts(products) {
  if (typeof window === "undefined" || !window.indexedDB) {
    throw new Error("This browser cannot save preview products.");
  }

  const database = await openDemoDatabase();
  await new Promise((resolve, reject) => {
    const request = database
      .transaction("store", "readwrite")
      .objectStore("store")
      .put(products, "products");
    request.onsuccess = resolve;
    request.onerror = () => reject(request.error);
  });
  database.close();
}

function demoUsers() {
  const users = readJson("eona_demo_users");

  if (users?.length) {
    return users;
  }

  const seeded = [demoAdminUser];
  writeJson("eona_demo_users", seeded);
  return seeded;
}

function publicUser(user) {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
  };
}

function metricBarValue(value, max) {
  if (!max) {
    return 0;
  }

  return Math.max(6, Math.min(100, (Number(value || 0) / max) * 100));
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function optimizeProductImage(file) {
  return new Promise((resolve, reject) => {
    const sourceUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      const maxDimension = 1600;
      const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
      const width = Math.max(1, Math.round(image.naturalWidth * scale));
      const height = Math.max(1, Math.round(image.naturalHeight * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, width, height);
      context.drawImage(image, 0, 0, width, height);
      URL.revokeObjectURL(sourceUrl);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("The product image could not be processed."));
            return;
          }
          const baseName = file.name.replace(/\.[^.]+$/, "") || "product-image";
          resolve(new File([blob], `${baseName}.jpg`, { type: "image/jpeg" }));
        },
        "image/jpeg",
        0.88,
      );
    };

    image.onerror = () => {
      URL.revokeObjectURL(sourceUrl);
      reject(new Error("Use a valid JPG, PNG, WebP, HEIC, or HEIF product image."));
    };
    image.src = sourceUrl;
  });
}

async function normalizePersistedProductImages(products) {
  let changed = false;
  const normalizedProducts = await Promise.all(
    products.map(async (product) => {
      const media = await Promise.all(
        (product.media || []).map(async (image, index) => {
          const needsConversion =
            typeof image === "string" &&
            image.startsWith("data:image/") &&
            (image.startsWith("data:image/heic") ||
              image.startsWith("data:image/heif") ||
              image.length > 1_500_000);

          if (!needsConversion) {
            return image;
          }

          try {
            const blob = await fetch(image).then((response) => response.blob());
            const optimizedFile = await optimizeProductImage(
              new File([blob], `${product.slug || "product"}-${index}`, { type: blob.type }),
            );
            changed = true;
            return await fileToDataUrl(optimizedFile);
          } catch {
            return image;
          }
        }),
      );

      return media.some((image, index) => image !== product.media?.[index])
        ? { ...product, media }
        : product;
    }),
  );

  return changed ? normalizedProducts : products;
}

function decrementDemoStock(products, cartItems) {
  return products.map((product) => {
    const variants = product.variants.map((variant) => {
      const cartItem = cartItems.find(
        (item) => Number(item.product_variant_id) === Number(variant.id),
      );

      if (!cartItem) {
        return variant;
      }

      const stock = Math.max(0, Number(variant.stock_quantity) - cartItem.quantity);

      return {
        ...variant,
        stock_quantity: stock,
        available_stock: Math.max(0, stock - Number(variant.reserved_quantity || 0)),
      };
    });

    return { ...product, variants };
  });
}

function buildDemoDashboard(products) {
  const orders = readJson("eona_demo_orders") || [];
  const payments = readJson("eona_demo_payments") || [];
  const users = demoUsers().map(publicUser);
  const clientsByEmail = new Map();

  users
    .filter((user) => user.role === "customer")
    .forEach((user) => {
      clientsByEmail.set(user.email, {
        ...user,
        orders_count: 0,
        lifetime_value: 0,
        last_order_at: null,
        source: "account",
      });
    });

  orders.forEach((order) => {
    const existing = clientsByEmail.get(order.customer_email);
    clientsByEmail.set(order.customer_email, {
      name: order.customer_name,
      email: order.customer_email,
      phone: order.customer_phone,
      orders_count: Number(existing?.orders_count || 0) + 1,
      lifetime_value: Number(existing?.lifetime_value || 0) + Number(order.total || 0),
      last_order_at: order.created_at,
      source: "orders",
    });
  });

  const lowStock = products
    .flatMap((product) =>
      product.variants.map((variant) => ({
        id: variant.id,
        sku: variant.sku,
        product_name: product.name,
        available_stock: variant.available_stock,
      })),
    )
    .filter((variant) => Number(variant.available_stock) <= 3);
  const totalRevenue = payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const today = new Date().toISOString().slice(0, 10);
  const salesByDay = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    const key = date.toISOString().slice(0, 10);
    const dayOrders = orders.filter((order) => order.created_at?.slice(0, 10) === key);

    return {
      date: key,
      revenue: dayOrders.reduce((sum, order) => sum + Number(order.total || 0), 0),
      orders: dayOrders.length,
    };
  });
  const salesByMethod = Object.values(
    payments.reduce((methods, payment) => {
      const method = payment.method || "unknown";
      methods[method] ||= { method, count: 0, amount: 0 };
      methods[method].count += 1;
      methods[method].amount += Number(payment.amount || 0);
      return methods;
    }, {}),
  );

  return {
    summary: {
      revenue_today: payments
        .filter((payment) => payment.created_at?.slice(0, 10) === today)
        .reduce((sum, payment) => sum + Number(payment.amount || 0), 0),
      revenue_total: totalRevenue,
      orders_today: orders.filter((order) => order.created_at?.slice(0, 10) === today).length,
      orders_total: orders.length,
      payments_total: totalRevenue,
      clients_total: clientsByEmail.size,
      products_total: products.length,
      low_stock_skus: lowStock.length,
    },
    orders,
    payments,
    clients: Array.from(clientsByEmail.values()),
    products,
    low_stock: lowStock,
    sales_by_day: salesByDay,
    sales_by_method: salesByMethod,
    top_products: products.slice(0, 5).map((product) => ({
      product_name: product.name,
      units: product.variants.reduce(
        (sum, variant) => sum + Math.max(0, 10 - Number(variant.available_stock || 0)),
        0,
      ),
      revenue: product.price_min,
    })),
  };
}

export default function CommerceApp({
  collectionSlug = "",
  productSlug = "",
  view = "home",
}) {
  const router = useRouter();
  const [products, setProducts] = useState(fallbackProducts);
  const [categories, setCategories] = useState(fallbackCategories);
  const [shippingZones, setShippingZones] = useState(fallbackShippingZones);
  const [adminSummary, setAdminSummary] = useState(fallbackAdminSummary);
  const [cart, setCart] = useState(emptyCart);
  const [wishlist, setWishlist] = useState([]);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [activeTexture, setActiveTexture] = useState("all");
  const [sortBy, setSortBy] = useState("featured");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [apiMode, setApiMode] = useState("loading");
  const [error, setError] = useState("");
  const [checkout, setCheckout] = useState(checkoutDefaults);
  const [shippingZoneId, setShippingZoneId] = useState("");
  const [trackNumber, setTrackNumber] = useState("");
  const [trackContact, setTrackContact] = useState("");
  const [trackedOrder, setTrackedOrder] = useState(null);
  const [lastOrder, setLastOrder] = useState(null);
  const [authToken, setAuthToken] = useState("");
  const [authUser, setAuthUser] = useState(null);
  const [adminAuthToken, setAdminAuthToken] = useState("");
  const [adminUser, setAdminUser] = useState(null);
  const [adminDashboard, setAdminDashboard] = useState(null);
  const [adminRefreshing, setAdminRefreshing] = useState(false);
  const [resolvedProductSlug, setResolvedProductSlug] = useState(productSlug || null);

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

  const loadDemoCart = useCallback(() => {
    const stored = readJson("eona_demo_cart");
    const nextCart = stored?.items ? cartWithTotals(stored) : emptyCart;
    setCart(nextCart);
    return nextCart;
  }, []);

  const loadCart = useCallback(
    async (token) => {
      if (!token) {
        setCart(emptyCart);
        return emptyCart;
      }

      try {
        const freshCart = await apiFetch(`/carts/${token}`);
        setCart(cartWithTotals(freshCart));
        return freshCart;
      } catch {
        localStorage.removeItem("eona_cart_token");
        return loadDemoCart();
      }
    },
    [loadDemoCart],
  );

  const loadStorefront = useCallback(async () => {
    try {
      const [productData, categoryData, zoneData, summaryData] = await Promise.all([
        apiFetch("/products"),
        apiFetch("/categories"),
        apiFetch("/shipping-zones"),
        apiFetch("/admin/summary"),
      ]);

      setProducts(productData.map(withLocalMedia));
      setCategories(categoryData);
      setShippingZones(zoneData);
      setAdminSummary(summaryData);
      setShippingZoneId(String(zoneData[0]?.id || ""));
      setApiMode("live");
      setError("");
      await loadCart(localStorage.getItem("eona_cart_token"));
    } catch {
      setProducts(await readDemoProducts());
      setCategories(fallbackCategories);
      setShippingZones(fallbackShippingZones);
      setAdminSummary(fallbackAdminSummary);
      setShippingZoneId(String(fallbackShippingZones[0]?.id || ""));
      setApiMode("demo");
      setError("");
      loadDemoCart();
    } finally {
      setLoading(false);
    }
  }, [loadCart, loadDemoCart]);

  const refreshAdminDashboard = useCallback(async () => {
    setAdminRefreshing(true);
    setError("");

    try {
      if (apiMode === "live" && adminAuthToken && adminUser?.role === "admin") {
        const dashboard = await apiFetch("/admin/dashboard", { token: adminAuthToken });
        setAdminDashboard(dashboard);
        setAdminSummary(dashboard.summary || fallbackAdminSummary);
        if (Array.isArray(dashboard.products)) {
          setProducts(dashboard.products.map(withLocalMedia));
        }
        return;
      }

      const savedProducts = await readDemoProducts();
      if (JSON.stringify(savedProducts) !== JSON.stringify(products)) {
        setProducts(savedProducts);
      }
      setAdminDashboard(buildDemoDashboard(savedProducts));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setAdminRefreshing(false);
    }
  }, [apiMode, adminAuthToken, adminUser, products]);

  useEffect(() => {
    if (view !== "product" || productSlug) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setResolvedProductSlug(new URLSearchParams(window.location.search).get("slug") || "");
    }, 0);

    return () => window.clearTimeout(timer);
  }, [productSlug, view]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const savedWishlist = readJson("eona_wishlist");
      if (Array.isArray(savedWishlist)) {
        setWishlist(savedWishlist);
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadStorefront();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadStorefront]);

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      const storedToken = localStorage.getItem("eona_auth_token") || "";
      const storedUser = readJson("eona_auth_user");
      const demoCurrentUser = readJson("eona_demo_current_user");

      if (storedUser?.role === "customer") {
        setAuthUser(storedUser);
      } else if (demoCurrentUser?.role === "customer") {
        setAuthUser(demoCurrentUser);
      }

      if (storedToken) {
        setAuthToken(storedToken);
      }

      if (storedToken && apiMode === "live") {
        try {
          const session = await apiFetch("/auth/me", { token: storedToken });
          if (session.user?.role !== "customer") {
            throw new Error("Customer access is required.");
          }
          setAuthUser(session.user);
          writeJson("eona_auth_user", session.user);
        } catch {
          localStorage.removeItem("eona_auth_token");
          localStorage.removeItem("eona_auth_user");
          setAuthToken("");
        }
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, [apiMode]);

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      const storedToken = localStorage.getItem("eona_admin_auth_token") || "";
      const storedUser = readJson("eona_admin_auth_user");
      const demoCurrentAdmin = readJson("eona_demo_current_admin");
      const currentAdmin = storedUser || demoCurrentAdmin;

      if (currentAdmin?.role === "admin") {
        setAdminUser(currentAdmin);
      }
      if (storedToken) {
        setAdminAuthToken(storedToken);
      }

      if (storedToken && apiMode === "live") {
        try {
          const session = await apiFetch("/auth/me", { token: storedToken });
          if (session.user?.role !== "admin") {
            throw new Error("Admin access is required.");
          }
          setAdminUser(session.user);
          writeJson("eona_admin_auth_user", session.user);
        } catch {
          localStorage.removeItem("eona_admin_auth_token");
          localStorage.removeItem("eona_admin_auth_user");
          setAdminAuthToken("");
          setAdminUser(null);
        }
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, [apiMode]);

  useEffect(() => {
    if (view !== "admin") {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      refreshAdminDashboard();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [view, refreshAdminDashboard]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      const search = params.get("search");
      const category = params.get("category");
      const order = params.get("order");
      const contact = params.get("contact");

      if (search) {
        setQuery(search);
      }

      if (category) {
        setActiveCategory(category);
      } else if (view !== "shop") {
        setActiveCategory("all");
      }

      if (order) {
        setTrackNumber(order);
      }

      if (contact) {
        setTrackContact(contact);
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, [view]);

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
    setCart(cartWithTotals(createdCart));

    return createdCart.token;
  }

  function persistDemoCart(nextCart) {
    const withTotals = cartWithTotals(nextCart);
    localStorage.setItem("eona_demo_cart", JSON.stringify(withTotals));
    setCart(withTotals);
    return withTotals;
  }

  async function persistProducts(nextProducts) {
    setProducts(nextProducts);

    if (apiMode !== "live") {
      await persistDemoProducts(nextProducts);
      setAdminDashboard(buildDemoDashboard(nextProducts));
    }
  }

  function addLocalCartItem(product, variant) {
    const existing = cart.items.find(
      (item) => Number(item.product_variant_id) === Number(variant.id),
    );
    const items = existing
      ? cart.items.map((item) =>
          item.product_variant_id === existing.product_variant_id
            ? {
                ...item,
                quantity: Math.min(item.quantity + 1, variant.available_stock || 20),
              }
            : item,
        )
      : [...cart.items, buildCartItem(product, variant)];

    persistDemoCart({
      token: cart.token || "demo-cart",
      status: "active",
      items,
    });
  }

  async function addToCart(product, variant, redirectToCheckout = false) {
    if (!variant || variant.available_stock < 1) {
      setError("This variant is out of stock.");
      return;
    }

    setBusy(true);
    setError("");

    try {
      if (apiMode !== "live") {
        addLocalCartItem(product, variant);
      } else {
        const token = await ensureCartToken();
        const updatedCart = await apiFetch(`/carts/${token}/items`, {
          method: "POST",
          body: JSON.stringify({
            product_variant_id: variant.id,
            quantity: 1,
          }),
        });

        setCart(cartWithTotals(updatedCart));
      }

      if (redirectToCheckout) {
        router.push("/checkout");
      }
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  async function updateCartItem(item, quantity) {
    const nextQuantity = Math.max(0, Number(quantity));

    if (apiMode !== "live") {
      const items =
        nextQuantity === 0
          ? cart.items.filter((cartItem) => cartItem.id !== item.id)
          : cart.items.map((cartItem) =>
              cartItem.id === item.id
                ? {
                    ...cartItem,
                    quantity: Math.min(nextQuantity, cartItem.available_stock || 20),
                  }
                : cartItem,
            );
      persistDemoCart({
        token: cart.token || "demo-cart",
        status: "active",
        items,
      });
      return;
    }

    if (!cart.token) {
      return;
    }

    setBusy(true);
    setError("");

    try {
      const updatedCart = await apiFetch(`/carts/${cart.token}/items/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({ quantity: nextQuantity }),
      });
      setCart(cartWithTotals(updatedCart));
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
      if (apiMode !== "live") {
        const order = {
          order_number: `EON-${Date.now().toString().slice(-7)}`,
          shipping_zone: selectedZone?.name || "Delivery",
          total: orderTotal,
          status: "order_placed",
          timeline: Object.entries(statusLabels).map(([key, label], index) => ({
            key,
            label,
            complete: index === 0,
          })),
        };
        const payment = {
          id: `demo-payment-${Date.now()}`,
          reference: `EONA-PAY-${Date.now().toString().slice(-8)}`,
          method: checkout.payment_method,
          gateway: "preview_gateway",
          amount: orderTotal,
          currency: "GHS",
          status: "pending",
          customer_name: `${checkout.first_name} ${checkout.last_name}`,
          customer_email: checkout.email,
          created_at: new Date().toISOString(),
        };
        const demoOrder = {
          ...order,
          customer_name: `${checkout.first_name} ${checkout.last_name}`,
          customer_email: checkout.email,
          customer_phone: checkout.phone,
          payment_status: payment.status,
          payment_method: payment.method,
          created_at: new Date().toISOString(),
          contact: checkout.email || checkout.phone,
        };
        const nextProducts = decrementDemoStock(products, cart.items);
        const demoOrders = [demoOrder, ...(readJson("eona_demo_orders") || [])];
        const demoPayments = [payment, ...(readJson("eona_demo_payments") || [])];

        setLastOrder(order);
        writeJson("eona_demo_order", demoOrder);
        writeJson("eona_demo_orders", demoOrders);
        writeJson("eona_demo_payments", demoPayments);
        await persistProducts(nextProducts);
        localStorage.removeItem("eona_demo_cart");
        setCart(emptyCart);
        router.push(
          `/track-order?order=${encodeURIComponent(
            order.order_number,
          )}&contact=${encodeURIComponent(checkout.email || checkout.phone)}`,
        );
        return;
      }

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
      setTrackedOrder(null);
      setCart(emptyCart);
      localStorage.removeItem("eona_cart_token");
      await loadStorefront();
      router.push(
        `/track-order?order=${encodeURIComponent(
          order.order_number,
        )}&contact=${encodeURIComponent(checkout.email)}`,
      );
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
      if (apiMode !== "live") {
        const demoOrder = readJson("eona_demo_order");
        if (
          demoOrder?.order_number?.toLowerCase() === trackNumber.toLowerCase() &&
          [demoOrder.contact, checkout.email, checkout.phone]
            .filter(Boolean)
            .some((contact) => contact.toLowerCase() === trackContact.toLowerCase())
        ) {
          setTrackedOrder(demoOrder);
          return;
        }

        throw new Error("No demo order matched that tracking information.");
      }

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

  function toggleWishlist(productId) {
    setWishlist((current) => {
      const nextWishlist = current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId];
      writeJson("eona_wishlist", nextWishlist);
      return nextWishlist;
    });
  }

  async function registerAccount(payload) {
    setBusy(true);
    setError("");

    try {
      if (payload.password !== payload.passwordConfirmation) {
        throw new Error("Passwords do not match.");
      }

      if (payload.password.length < 8) {
        throw new Error("Password must be at least 8 characters.");
      }

      if (apiMode === "live") {
        const session = await apiFetch("/auth/register", {
          method: "POST",
          body: JSON.stringify({
            name: payload.name,
            email: payload.email,
            phone: payload.phone,
            password: payload.password,
            password_confirmation: payload.passwordConfirmation,
          }),
        });
        localStorage.setItem("eona_auth_token", session.token);
        writeJson("eona_auth_user", session.user);
        setAuthToken(session.token);
        setAuthUser(session.user);
        router.push("/account");
        return;
      }

      const users = demoUsers();
      if (users.some((user) => user.email.toLowerCase() === payload.email.toLowerCase())) {
        throw new Error("An account already exists for this email.");
      }

      const user = {
        id: `demo-user-${Date.now()}`,
        name: payload.name,
        email: payload.email,
        phone: payload.phone,
        role: "customer",
        password: payload.password,
      };
      const publicAccount = publicUser(user);
      writeJson("eona_demo_users", [...users, user]);
      writeJson("eona_demo_current_user", publicAccount);
      setAuthToken("demo-token");
      setAuthUser(publicAccount);
      router.push("/account");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  async function loginAccount(payload) {
    setBusy(true);
    setError("");

    try {
      if (apiMode === "live") {
        const session = await apiFetch("/auth/login", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        if (session.user?.role !== "customer") {
          throw new Error("Use the admin console sign-in for administrator accounts.");
        }
        localStorage.setItem("eona_auth_token", session.token);
        writeJson("eona_auth_user", session.user);
        setAuthToken(session.token);
        setAuthUser(session.user);
        router.push("/account");
        return;
      }

      const user = demoUsers().find(
        (currentUser) =>
          currentUser.role === "customer" &&
          currentUser.email.toLowerCase() === payload.email.toLowerCase() &&
          currentUser.password === payload.password,
      );

      if (!user) {
        throw new Error("The email or password is incorrect.");
      }

      const publicAccount = publicUser(user);
      writeJson("eona_demo_current_user", publicAccount);
      setAuthToken("demo-token");
      setAuthUser(publicAccount);
      router.push("/account");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  async function logoutAccount() {
    if (apiMode === "live" && authToken) {
      await apiFetch("/auth/logout", {
        method: "POST",
        body: JSON.stringify({}),
        token: authToken,
      }).catch(() => {});
    }

    localStorage.removeItem("eona_auth_token");
    localStorage.removeItem("eona_auth_user");
    localStorage.removeItem("eona_demo_current_user");
    setAuthToken("");
    setAuthUser(null);
    router.push("/sign-in");
  }

  async function loginAdmin(payload) {
    setBusy(true);
    setError("");

    try {
      if (apiMode === "live") {
        const session = await apiFetch("/auth/admin/login", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        if (session.user?.role !== "admin") {
          throw new Error("This account does not have administrator access.");
        }
        localStorage.setItem("eona_admin_auth_token", session.token);
        writeJson("eona_admin_auth_user", session.user);
        setAdminAuthToken(session.token);
        setAdminUser(session.user);
        router.push("/admin");
        return;
      }

      const admin = demoUsers().find(
        (user) =>
          user.role === "admin" &&
          user.email.toLowerCase() === payload.email.toLowerCase() &&
          user.password === payload.password,
      );
      if (!admin) {
        throw new Error("The admin email or password is incorrect.");
      }

      const publicAdmin = publicUser(admin);
      writeJson("eona_demo_current_admin", publicAdmin);
      setAdminAuthToken("demo-admin-token");
      setAdminUser(publicAdmin);
      router.push("/admin");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  async function logoutAdmin() {
    if (apiMode === "live" && adminAuthToken) {
      await apiFetch("/auth/logout", {
        method: "POST",
        body: JSON.stringify({}),
        token: adminAuthToken,
      }).catch(() => {});
    }

    localStorage.removeItem("eona_admin_auth_token");
    localStorage.removeItem("eona_admin_auth_user");
    localStorage.removeItem("eona_demo_current_admin");
    setAdminAuthToken("");
    setAdminUser(null);
    router.push("/admin/sign-in");
  }

  async function updateAdminProduct(productId, updates) {
    setBusy(true);
    setError("");

    try {
      if (apiMode === "live" && adminAuthToken && adminUser?.role === "admin") {
        const product = await apiFetch(`/admin/products/${productId}`, {
          method: "PATCH",
          body: JSON.stringify(updates),
          token: adminAuthToken,
        });
        const nextProducts = products.map((currentProduct) =>
          Number(currentProduct.id) === Number(productId) ? withLocalMedia(product) : currentProduct,
        );
        setProducts(nextProducts);
        await refreshAdminDashboard();
        return;
      }

      const nextProducts = products.map((product) =>
        Number(product.id) === Number(productId) ? { ...product, ...updates } : product,
      );
      await persistProducts(nextProducts);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  async function updateAdminVariant(productId, variantId, updates) {
    setBusy(true);
    setError("");

    try {
      if (apiMode === "live" && adminAuthToken && adminUser?.role === "admin") {
        const product = await apiFetch(`/admin/variants/${variantId}`, {
          method: "PATCH",
          body: JSON.stringify(updates),
          token: adminAuthToken,
        });
        const nextProducts = products.map((currentProduct) =>
          Number(currentProduct.id) === Number(productId) ? withLocalMedia(product) : currentProduct,
        );
        setProducts(nextProducts);
        await refreshAdminDashboard();
        return;
      }

      const nextProducts = products.map((product) => {
        if (Number(product.id) !== Number(productId)) {
          return product;
        }

        const variants = product.variants.map((variant) =>
          Number(variant.id) === Number(variantId)
            ? {
                ...variant,
                ...updates,
                available_stock:
                  "stock_quantity" in updates
                    ? Math.max(
                        0,
                        Number(updates.stock_quantity) - Number(variant.reserved_quantity || 0),
                      )
                    : variant.available_stock,
              }
            : variant,
        );

        return {
          ...product,
          variants,
          price_min: Math.min(...variants.map((variant) => Number(variant.price || 0))),
          price_max: Math.max(...variants.map((variant) => Number(variant.price || 0))),
        };
      });
      await persistProducts(nextProducts);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  async function uploadAdminProductImage(productId, file, kind = "finished") {
    if (!file) {
      return;
    }

    setBusy(true);
    setError("");

    try {
      const optimizedFile = await optimizeProductImage(file);

      if (apiMode === "live" && adminAuthToken && adminUser?.role === "admin") {
        const formData = new FormData();
        formData.append("image", optimizedFile);
        const endpoint = kind === "raw" ? "raw-images" : "images";
        const product = await apiFetch(`/admin/products/${productId}/${endpoint}`, {
          method: "POST",
          body: formData,
          token: adminAuthToken,
        });
        const nextProducts = products.map((currentProduct) =>
          Number(currentProduct.id) === Number(productId) ? withLocalMedia(product) : currentProduct,
        );
        setProducts(nextProducts);
        await refreshAdminDashboard();
        return;
      }

      const dataUrl = await fileToDataUrl(optimizedFile);
      const mediaField = kind === "raw" ? "raw_media" : "media";
      const nextProducts = products.map((product) =>
        Number(product.id) === Number(productId)
          ? { ...product, [mediaField]: [dataUrl, ...(product[mediaField] || [])] }
          : product,
      );
      await persistProducts(nextProducts);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  async function setAdminProductStatus(productId, status) {
    await updateAdminProduct(productId, { status });
  }

  async function deleteAdminProduct(productId) {
    setBusy(true);
    setError("");

    try {
      if (apiMode === "live" && adminAuthToken && adminUser?.role === "admin") {
        await apiFetch(`/admin/products/${productId}`, {
          method: "DELETE",
          token: adminAuthToken,
        });
      }

      const nextProducts = products.filter(
        (product) => Number(product.id) !== Number(productId),
      );
      if (apiMode === "live") {
        setProducts(nextProducts);
        await refreshAdminDashboard();
      } else {
        await persistProducts(nextProducts);
      }
      setWishlist((current) => {
        const nextWishlist = current.filter((id) => Number(id) !== Number(productId));
        writeJson("eona_wishlist", nextWishlist);
        return nextWishlist;
      });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  async function createAdminProduct(payload) {
    setBusy(true);
    setError("");

    try {
      const imageFile = payload.imageFile;
      const rawImageFile = payload.rawImageFile;
      const productPayload = { ...payload };
      delete productPayload.imageFile;
      delete productPayload.imagePreview;
      delete productPayload.rawImageFile;
      delete productPayload.rawImagePreview;

      if (apiMode === "live" && adminAuthToken && adminUser?.role === "admin") {
        const product = await apiFetch("/admin/products", {
          method: "POST",
          body: JSON.stringify(productPayload),
          token: adminAuthToken,
        });
        if (imageFile) {
          const formData = new FormData();
          formData.append("image", imageFile);
          await apiFetch(`/admin/products/${product.id}/images`, {
            method: "POST",
            body: formData,
            token: adminAuthToken,
          });
        }
        if (rawImageFile) {
          const formData = new FormData();
          formData.append("image", rawImageFile);
          await apiFetch(`/admin/products/${product.id}/raw-images`, {
            method: "POST",
            body: formData,
            token: adminAuthToken,
          });
        }
        setProducts([withLocalMedia(product), ...products]);
        await refreshAdminDashboard();
        return;
      }

      const uploadedImage = imageFile ? await fileToDataUrl(imageFile) : null;
      const uploadedRawImage = rawImageFile ? await fileToDataUrl(rawImageFile) : null;

      const variant = {
        ...payload.variant,
        id: Date.now(),
        product_id: Date.now(),
        price: Number(payload.variant.price),
        compare_at_price: payload.variant.compare_at_price
          ? Number(payload.variant.compare_at_price)
          : null,
        stock_quantity: Number(payload.variant.stock_quantity),
        reserved_quantity: 0,
        available_stock: Number(payload.variant.stock_quantity),
        weight_kg: 0.38,
      };
      const product = {
        id: Date.now(),
        slug: `${payload.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`,
        category:
          categories.find((category) => Number(category.id) === Number(payload.category_id)) ||
          fallbackCategories[0],
        name: payload.name,
        short_description: payload.short_description,
        description: payload.description,
        collection: payload.collection,
        material: "100% human hair",
        texture: payload.texture,
        colors: [variant.color],
        media: uploadedImage ? [uploadedImage] : [storefrontImages.bodyWave],
        raw_media: uploadedRawImage ? [uploadedRawImage] : [],
        care_instructions: ["Use sulfate-free shampoo.", "Store on a wig stand."],
        rating: 0,
        review_count: 0,
        badge: payload.badge,
        discount_percentage: payload.discount_percentage || null,
        status: "active",
        variants: [variant],
        price_min: variant.price,
        price_max: variant.price,
      };
      await persistProducts([product, ...products]);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  const storefrontProducts = useMemo(
    () => products.filter((product) => !product.status || product.status === "active"),
    [products],
  );

  const textures = useMemo(
    () => ["all", ...unique(storefrontProducts.map((product) => product.texture))],
    [storefrontProducts],
  );

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const nextProducts = storefrontProducts.filter((product) => {
      const haystack = [
        product.name,
        product.short_description,
        product.category?.name,
        product.collection,
        product.texture,
      ]
        .join(" ")
        .toLowerCase();

      const matchesQuery = !normalizedQuery || haystack.includes(normalizedQuery);
      const matchesCategory =
        activeCategory === "all" || product.category?.slug === activeCategory;
      const matchesTexture =
        activeTexture === "all" || product.texture === activeTexture;

      return matchesQuery && matchesCategory && matchesTexture;
    });

    return [...nextProducts].sort((a, b) => {
      if (sortBy === "price-low") {
        return Number(a.price_min) - Number(b.price_min);
      }

      if (sortBy === "price-high") {
        return Number(b.price_max) - Number(a.price_max);
      }

      if (sortBy === "rating") {
        return Number(b.rating) - Number(a.rating);
      }

      return Number(b.review_count || 0) - Number(a.review_count || 0);
    });
  }, [activeCategory, activeTexture, storefrontProducts, query, sortBy]);

  const context = {
    activeCategory,
    activeTexture,
    addToCart,
    adminDashboard,
    adminRefreshing,
    adminSummary,
    adminUser,
    apiMode,
    authToken,
    authUser,
    busy,
    cart,
    categories,
    checkout,
    createAdminProduct,
    deleteAdminProduct,
    error,
    filteredProducts,
    lastOrder,
    loginAccount,
    loginAdmin,
    loading,
    logoutAccount,
    logoutAdmin,
    orderTotal,
    placeOrder,
    products: view === "admin" ? products : storefrontProducts,
    query,
    refreshAdminDashboard,
    registerAccount,
    selectedZone,
    setActiveCategory,
    setActiveTexture,
    setQuery,
    setShippingZoneId,
    setSortBy,
    setAdminProductStatus,
    shippingFee,
    shippingZoneId,
    shippingZones,
    sortBy,
    textures,
    toggleWishlist,
    trackContact,
    trackNumber,
    trackOrder,
    trackedOrder,
    updateAdminProduct,
    updateAdminVariant,
    uploadAdminProductImage,
    updateCartItem,
    updateCheckout,
    wishlist,
    setTrackContact,
    setTrackNumber,
  };

  const isAdminExperience = view === "admin" || view === "admin-sign-in";

  return (
    <main className="min-h-screen bg-background text-foreground">
      {!isAdminExperience && <StoreHeader {...context} />}

      {error && (
        <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6 lg:px-8">
          <div className="rounded-md border border-danger/25 bg-red-50 p-3 text-sm font-medium text-danger">
            {error}
          </div>
        </div>
      )}

      {view === "home" && <HomeView {...context} />}
      {view === "shop" && <ShopView {...context} />}
      {view === "product" && (
        <ProductView
          {...context}
          productSlug={resolvedProductSlug}
          resolvingSlug={!productSlug && resolvedProductSlug === null}
        />
      )}
      {view === "cart" && <CartView {...context} />}
      {view === "checkout" && <CheckoutView {...context} />}
      {view === "track" && <TrackView {...context} />}
      {view === "account" && <AccountView {...context} />}
      {view === "favorites" && <FavoritesView {...context} />}
      {view === "deals" && <DealsView {...context} />}
      {view === "admin" && <AdminView {...context} />}
      {view === "admin-sign-in" && <AdminSignInView {...context} />}
      {view === "collection" && (
        <CollectionView {...context} collectionSlug={collectionSlug} />
      )}
      {view === "tools" && <ToolsView {...context} />}
      {view === "help" && <HelpCenterView />}
      {view === "sign-in" && <SignInView {...context} />}
      {view === "sign-up" && <SignUpView {...context} />}

      {!isAdminExperience && (
        <>
          <WhatsAppSupport />
          <StoreFooter categories={categories} />
        </>
      )}
    </main>
  );
}

function StoreHeader({
  cart,
  products,
  query,
  setQuery,
  wishlist,
}) {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const menuProducts = products.slice(0, 6);
  const menuLinks = [
    ["Shop", "/shop", ShoppingBag],
    ["Wigs", "/collections/wigs", SparkMenuIcon],
    ["Bundles", "/collections/bundles", ShoppingBag],
    ["Closures & Frontals", "/collections/closures-frontals", SparkMenuIcon],
    ["Deals", "/deals", CreditCard],
    [`Favorites${wishlist.length ? ` (${wishlist.length})` : ""}`, "/favorites", Heart],
    ["Track Order", "/track-order", Truck],
    ["Help Center", WHATSAPP_SUPPORT_URL, MessageCircle],
  ];

  function submitSearch(event) {
    event.preventDefault();
    const target = query.trim()
      ? `/shop?search=${encodeURIComponent(query.trim())}`
      : "/shop";
    router.push(target);
    setSearchOpen(false);
  }

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border bg-[#fffdf9]/95 backdrop-blur">
        <div className="mx-auto flex h-20 max-w-[1440px] items-center justify-between gap-2 px-3 sm:h-24 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-2 sm:gap-4">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="grid size-10 place-items-center rounded-md border border-border bg-white"
              aria-label="Open navigation"
            >
              <Menu className="size-5" />
            </button>
            <LogoMark />
          </div>

          <div className="flex items-center gap-2">
            <form
              onSubmit={submitSearch}
              className="hidden h-11 w-64 items-center rounded-md border border-border bg-white px-3 lg:flex"
            >
              <Search className="size-4 text-muted-foreground" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search wigs, bundles, lace"
                className="h-full min-w-0 flex-1 bg-transparent px-2 text-sm outline-none"
              />
              <button type="submit" className="text-sm font-semibold">
                Go
              </button>
            </form>
            <button
              type="button"
              onClick={() => setSearchOpen((current) => !current)}
              className="grid size-10 place-items-center rounded-md border border-border bg-white lg:hidden"
              aria-label="Search"
            >
              <Search className="size-5" />
            </button>
            <Link
              href="/account"
              className="grid size-10 place-items-center rounded-md border border-border bg-white"
              aria-label="Account"
            >
              <UserRound className="size-5" />
            </Link>
            <Link
              href="/favorites"
              className="relative grid size-10 place-items-center rounded-md border border-border bg-white"
              aria-label={`Favorites${wishlist.length ? ` (${wishlist.length})` : ""}`}
            >
              <Heart className={`size-5 ${wishlist.length ? "fill-[#7c3aed] text-[#7c3aed]" : ""}`} />
              {wishlist.length > 0 && (
                <span className="absolute -right-2 -top-2 grid size-5 place-items-center rounded-full bg-[#7c3aed] text-[10px] font-bold text-white">
                  {wishlist.length}
                </span>
              )}
            </Link>
            <Link
              href="/cart"
              className="relative grid size-10 place-items-center rounded-md border border-[#171214] bg-[#171214] text-white"
              aria-label="Cart"
            >
              <ShoppingBag className="size-5" />
              {cart.item_count > 0 && (
                <span className="absolute -right-2 -top-2 grid size-5 place-items-center rounded-full bg-[#7c3aed] text-[10px] font-bold text-white">
                  {cart.item_count}
                </span>
              )}
            </Link>
          </div>
        </div>

        {searchOpen && (
          <form onSubmit={submitSearch} className="border-t border-border bg-white p-3 lg:hidden">
            <div className="flex h-11 items-center rounded-md border border-border px-3">
              <Search className="size-4 text-muted-foreground" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search wigs, bundles, lace"
                className="h-full min-w-0 flex-1 bg-transparent px-2 text-sm outline-none"
              />
              <button type="submit" className="text-sm font-semibold">
                Go
              </button>
            </div>
          </form>
        )}
      </header>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/55 backdrop-blur-[2px]"
          role="presentation"
          onClick={() => setMobileOpen(false)}
        >
          <aside
            className="flex h-full w-[min(92vw,680px)] flex-col bg-[#fffdf9] shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <LogoMark />
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="grid size-10 place-items-center rounded-md border border-border bg-white"
                aria-label="Close navigation"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto md:grid md:grid-cols-[180px_minmax(0,1fr)] md:overflow-hidden">
              <nav className="border-b border-border bg-[#f5effa] md:overflow-y-auto md:border-b-0 md:border-r">
                {menuLinks.map(([label, href, Icon]) => {
                  const className = "flex min-h-14 items-center gap-3 border-b border-border px-4 text-sm font-bold transition hover:bg-white hover:text-[#5b21b6]";
                  const content = <><Icon className="size-4.5 text-[#6d28d9]" />{label}</>;

                  return href.startsWith("http") ? (
                    <a key={href} href={href} target="_blank" rel="noreferrer" onClick={() => setMobileOpen(false)} className={className}>
                      {content}
                    </a>
                  ) : (
                    <Link key={href} href={href} onClick={() => setMobileOpen(false)} className={className}>
                      {content}
                    </Link>
                  );
                })}
              </nav>
              <div className="min-h-0 p-5 md:overflow-auto">
                <p className="border-l-4 border-[#7c3aed] pl-3 text-lg font-black">
                  Top Picks
                </p>
                <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {menuProducts.map((product) => (
                    <a
                      key={product.id}
                      href={productHref(product.slug)}
                      onClick={() => setMobileOpen(false)}
                      className="group text-center"
                    >
                      <div className="aspect-square overflow-hidden rounded-md bg-white ring-1 ring-border">
                        <img
                          src={product.media?.[0]}
                          alt={`${product.name} worn by a Black model`}
                          className="h-full w-full object-contain transition duration-500 group-hover:scale-[1.03]"
                        />
                      </div>
                      <p className="mt-2 text-sm font-semibold leading-5">
                        {product.collection || product.name}
                      </p>
                    </a>
                  ))}
                  <Link
                    href="/track-order"
                    onClick={() => setMobileOpen(false)}
                    className="group text-center"
                  >
                    <div className="grid aspect-square place-items-center rounded-md bg-[#efe7ff] ring-1 ring-border">
                      <Truck className="size-12 text-[#6d28d9]" />
                    </div>
                    <p className="mt-2 text-sm font-semibold leading-5">Ship in 24H</p>
                  </Link>
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}

function SparkMenuIcon({ className }) {
  return <Crown className={className} />;
}

function LogoMark() {
  return (
    <Link
      href="/"
      className="inline-flex flex-col items-center justify-center leading-none text-[#6d28d9]"
      aria-label="Eona Empire home"
    >
      <Crown className="mb-0.5 size-4 fill-[#6d28d9]/15 sm:size-5" />
      <span className="text-xl font-black tracking-normal sm:text-3xl lg:text-4xl">
        EONA EMPIRE
      </span>
    </Link>
  );
}

function HomeView({
  addToCart,
  busy,
  categories,
  products,
  setActiveCategory,
  toggleWishlist,
  wishlist,
}) {
  const heroProduct =
    products.find((product) => product.slug === "akwaaba-sleek-bob-lace-wig") ||
    products[0];
  const featured = products.slice(0, 5);
  const [heroIndex, setHeroIndex] = useState(0);
  const activeSlide = heroSlides[heroIndex];

  useEffect(() => {
    const timer = window.setInterval(() => {
      setHeroIndex((current) => (current + 1) % heroSlides.length);
    }, 5500);

    return () => window.clearInterval(timer);
  }, []);

  function moveHero(step) {
    setHeroIndex(
      (current) => (current + step + heroSlides.length) % heroSlides.length,
    );
  }

  return (
    <>
      <section
        className="relative min-h-[520px] overflow-hidden transition-colors duration-700 sm:min-h-[620px]"
        style={{ backgroundColor: activeSlide.background }}
      >
        {heroSlides.map((slide, index) => (
          <img
            key={slide.image}
            src={slide.image}
            alt={slide.alt}
            className={`absolute inset-0 h-full w-full object-contain object-right transition-opacity duration-700 ${
              heroIndex === index ? "opacity-100" : "opacity-0"
            }`}
          />
        ))}
        <div className="absolute inset-0 bg-black/14" />
        <button
          type="button"
          onClick={() => moveHero(-1)}
          className="absolute left-5 top-1/2 hidden size-11 -translate-y-1/2 place-items-center rounded-full bg-white text-[#3f1b96] shadow-lg lg:grid"
          aria-label="Previous hero"
        >
          <ChevronLeft className="size-6" />
        </button>
        <button
          type="button"
          onClick={() => moveHero(1)}
          className="absolute right-5 top-1/2 hidden size-11 -translate-y-1/2 place-items-center rounded-full bg-white text-[#3f1b96] shadow-lg lg:grid"
          aria-label="Next hero"
        >
          <ChevronRight className="size-6" />
        </button>
        <div className="relative mx-auto flex min-h-[520px] max-w-[1440px] items-center px-4 py-12 sm:min-h-[620px] sm:px-6 lg:px-8">
          <div className="max-w-xl text-center text-white md:text-left">
            <p className="mb-4 text-sm font-bold uppercase">{activeSlide.eyebrow}</p>
            <h1 className="text-5xl font-black leading-none sm:text-6xl lg:text-7xl">
              {activeSlide.title}
            </h1>
            <p className="mt-5 text-lg font-semibold text-white/90">
              {activeSlide.subtitle}
            </p>
            <Link
              href={activeSlide.href}
              onClick={() => setActiveCategory("wigs")}
              className="mt-8 inline-flex h-12 min-w-56 items-center justify-center rounded-md bg-[#7c3aed] px-6 text-sm font-bold text-white shadow-lg"
            >
              Shop now
            </Link>
          </div>
        </div>
        <div className="absolute bottom-9 left-1/2 hidden w-96 -translate-x-1/2 gap-2 sm:flex">
          {heroSlides.map((slide, index) => (
            <button
              key={slide.image}
              type="button"
              onClick={() => setHeroIndex(index)}
              className={`h-1 flex-1 rounded-full ${
                heroIndex === index ? "bg-white" : "bg-white/45"
              }`}
              aria-label={`Show hero slide ${index + 1}`}
            />
          ))}
        </div>
      </section>

      <ServiceStrip />

      <section className="mx-auto max-w-[1440px] px-4 py-10 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Shop by department"
          title="Find your next install faster"
          actionLabel="View all"
          actionHref="/shop"
        />
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {categories.map((category) => {
            const image =
              products.find((product) => product.category?.slug === category.slug)
                ?.media?.[0] || storefrontImages.bodyWave;
            return (
              <Link
                key={category.id}
                href={`/collections/${category.slug}`}
                onClick={() => setActiveCategory(category.slug)}
                className="group overflow-hidden rounded-md border border-border bg-card"
              >
                <div className="aspect-[4/3] overflow-hidden bg-white">
                  <img
                    src={image}
                    alt={`${category.name} worn by a Black model`}
                    className="h-full w-full object-contain transition duration-500 group-hover:scale-[1.03]"
                  />
                </div>
                <div className="p-4">
                  <h2 className="text-xl font-bold">{category.name}</h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {category.description}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <ProductRail
        title="Trending now"
        eyebrow="Customers are viewing"
        products={featured}
        addToCart={addToCart}
        busy={busy}
        toggleWishlist={toggleWishlist}
        wishlist={wishlist}
      />

      <section className="bg-[#171214] px-4 py-12 text-white sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-[1440px] gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
          <div>
            <p className="text-sm font-bold uppercase text-[#a78bfa]">
              Eona Promise
            </p>
            <h2 className="mt-3 text-3xl font-black sm:text-4xl">
              Premium human hair prepared for beautiful installs.
            </h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ["Salon-ready finish", "Soft lace, clean parting, natural movement"],
              ["Flexible choices", "Lengths, densities, textures, and lace options"],
              ["Ghana delivery", "Accra dispatch and nationwide shipping support"],
            ].map(([title, detail]) => (
              <div key={title} className="rounded-md border border-white/14 bg-white/8 p-4">
                <p className="font-bold">{title}</p>
                <p className="mt-2 text-sm leading-6 text-white/68">{detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {heroProduct && (
        <section className="mx-auto grid max-w-[1440px] gap-6 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_420px] lg:px-8">
          <div className="overflow-hidden rounded-md bg-white">
            <img
              src={heroProduct.media?.[0]}
              alt={heroProduct.name}
              className="h-full min-h-[420px] w-full object-contain"
            />
          </div>
          <div className="flex flex-col justify-center rounded-md border border-border bg-card p-6">
            <p className="text-sm font-bold text-[#6d28d9]">Editor pick</p>
            <h2 className="mt-2 text-3xl font-black">{heroProduct.name}</h2>
            <p className="mt-3 leading-7 text-muted-foreground">
              {heroProduct.short_description}
            </p>
            <p className="mt-5 text-2xl font-black">{priceRange(heroProduct)}</p>
            <div className="mt-6 flex gap-3">
              <a
                href={productHref(heroProduct.slug)}
                className="inline-flex h-11 flex-1 items-center justify-center rounded-md border border-primary px-4 text-sm font-bold"
              >
                View details
              </a>
              <button
                type="button"
                onClick={() => addToCart(heroProduct, firstAvailableVariant(heroProduct))}
                disabled={busy}
                className="inline-flex h-11 flex-1 items-center justify-center rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-50"
              >
                Add to cart
              </button>
            </div>
          </div>
        </section>
      )}
    </>
  );
}

function ServiceStrip() {
  return (
    <section className="border-y border-border bg-[#f1ecff]">
      <div className="mx-auto grid max-w-[1440px] grid-cols-2 gap-3 px-4 py-4 text-center text-sm font-bold sm:px-6 md:grid-cols-5 lg:px-8">
        {servicePromises.map((promise) => (
          <div key={promise} className="py-1">
            {promise}
          </div>
        ))}
      </div>
    </section>
  );
}

function ShopView({
  activeCategory,
  activeTexture,
  addToCart,
  busy,
  categories,
  filteredProducts,
  loading,
  query,
  setActiveCategory,
  setActiveTexture,
  setQuery,
  setSortBy,
  sortBy,
  textures,
  toggleWishlist,
  wishlist,
}) {
  return (
    <>
      <section className="mx-auto grid max-w-[1440px] gap-6 px-4 py-8 sm:px-6 sm:py-10 xl:grid-cols-[260px_minmax(0,1fr)] lg:px-8">
        <aside className="h-fit rounded-md border border-border bg-card p-4 lg:sticky lg:top-28">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="size-4 text-[#7c3aed]" />
            <h2 className="font-bold">Filters</h2>
          </div>
          <div className="mt-5">
            <p className="mb-2 text-sm font-bold">Department</p>
            <div className="grid gap-2">
              <FilterButton
                active={activeCategory === "all"}
                onClick={() => setActiveCategory("all")}
              >
                All departments
              </FilterButton>
              {categories.map((category) => (
                <FilterButton
                  key={category.id}
                  active={activeCategory === category.slug}
                  onClick={() => setActiveCategory(category.slug)}
                >
                  {category.name}
                </FilterButton>
              ))}
            </div>
          </div>

          <div className="mt-6">
            <p className="mb-2 text-sm font-bold">Texture</p>
            <div className="grid gap-2">
              {textures.map((texture) => (
                <FilterButton
                  key={texture}
                  active={activeTexture === texture}
                  onClick={() => setActiveTexture(texture)}
                >
                  {texture === "all" ? "All textures" : texture}
                </FilterButton>
              ))}
            </div>
          </div>
        </aside>

        <div>
          <div className="mb-5 grid gap-3 rounded-md border border-border bg-card p-4 md:grid-cols-[minmax(0,1fr)_190px]">
            <label className="relative block">
              <span className="sr-only">Search catalog</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search bob, body wave, kinky curly"
                className="h-11 w-full rounded-md border border-border bg-background pl-10 pr-3 text-sm outline-none focus:ring-4 focus:ring-[#7c3aed]/20"
              />
            </label>
            <label className="relative block">
              <span className="sr-only">Sort products</span>
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value)}
                className="h-11 w-full appearance-none rounded-md border border-border bg-background px-3 pr-9 text-sm font-semibold outline-none focus:ring-4 focus:ring-[#7c3aed]/20"
              >
                <option value="featured">Featured</option>
                <option value="rating">Top rated</option>
                <option value="price-low">Price: low to high</option>
                <option value="price-high">Price: high to low</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            </label>
          </div>

          <div className="mb-4 flex items-center justify-between gap-4">
            <p className="text-sm font-semibold text-muted-foreground">
              {filteredProducts.length} result{filteredProducts.length === 1 ? "" : "s"}
            </p>
            <Link href="/deals" className="text-sm font-bold text-[#5b21b6]">
              View deals
            </Link>
          </div>

          {loading ? (
            <LoadingPanel />
          ) : (
            <ProductGrid
              products={filteredProducts}
              addToCart={addToCart}
              busy={busy}
              toggleWishlist={toggleWishlist}
              wishlist={wishlist}
            />
          )}
        </div>
      </section>
    </>
  );
}

function ProductView({
  addToCart,
  busy,
  loading,
  products,
  productSlug,
  resolvingSlug,
  toggleWishlist,
  wishlist,
}) {
  const product = products.find((currentProduct) => currentProduct.slug === productSlug);
  const [selectedOptions, setSelectedOptions] = useState({});
  const [galleryIndex, setGalleryIndex] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const firstVariant = firstAvailableVariant(product);
      setSelectedOptions({
        length: firstVariant?.length,
        color: firstVariant?.color,
        density: firstVariant?.density,
        lace: firstVariant?.lace,
      });
      setGalleryIndex(0);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [product]);

  const selectedVariant = useMemo(() => {
    if (!product) {
      return null;
    }

    return (
      product.variants.find(
        (variant) =>
          variant.length === selectedOptions.length &&
          variant.color === selectedOptions.color &&
          variant.density === selectedOptions.density &&
          variant.lace === selectedOptions.lace,
      ) ||
      firstAvailableVariant(product)
    );
  }, [product, selectedOptions]);

  const optionGroups = product
    ? [
        {
          label: "Length",
          key: "length",
          values: unique(product.variants.map((variant) => variant.length).filter(Boolean)),
        },
        {
          label: "Color",
          key: "color",
          values: unique(product.variants.map((variant) => variant.color).filter(Boolean)),
        },
        {
          label: "Density / Pack",
          key: "density",
          values: unique(product.variants.map((variant) => variant.density).filter(Boolean)),
        },
        {
          label: "Lace",
          key: "lace",
          values: unique(product.variants.map((variant) => variant.lace).filter(Boolean)),
        },
      ]
    : [];

  function selectOption(key, value) {
    const matchingVariant =
      product.variants.find(
        (variant) =>
          variant[key] === value &&
          Object.entries(selectedOptions).every(
            ([optionKey, optionValue]) =>
              optionKey === key || !optionValue || variant[optionKey] === optionValue,
          ),
      ) || product.variants.find((variant) => variant[key] === value);

    if (!matchingVariant) {
      return;
    }

    setSelectedOptions({
      length: matchingVariant.length,
      color: matchingVariant.color,
      density: matchingVariant.density,
      lace: matchingVariant.lace,
    });
  }

  if (loading || resolvingSlug) {
    return <LoadingPanel />;
  }

  if (!product) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="text-3xl font-black">Product not found</h1>
        <Link
          href="/shop"
          className="mt-6 inline-flex h-11 items-center justify-center rounded-md bg-primary px-5 text-sm font-bold text-primary-foreground"
        >
          Back to shop
        </Link>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-5 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <Link href="/">Home</Link>
        <span>/</span>
        <Link href="/shop">Shop</Link>
        <span>/</span>
        <span className="text-foreground">{product.name}</span>
      </div>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1.1fr)_minmax(340px,0.9fr)_300px]">
        <div className="grid gap-3 md:grid-cols-[88px_minmax(0,1fr)]">
          <div className="order-2 flex gap-3 overflow-x-auto md:order-1 md:grid md:content-start">
            {product.media.map((image, index) => (
              <button
                key={`${image}-${index}`}
                type="button"
                onClick={() => setGalleryIndex(index)}
                className={`aspect-square w-20 shrink-0 overflow-hidden rounded-md border bg-white md:w-full ${
                  galleryIndex === index ? "border-[#7c3aed]" : "border-border"
                }`}
              >
                <img src={image} alt="" className="h-full w-full object-contain" />
              </button>
            ))}
          </div>
          <div className="order-1 overflow-hidden rounded-md border border-border bg-white md:order-2">
            <img
              src={product.media[galleryIndex] || product.media[0]}
              alt={product.name}
              className="h-full min-h-[520px] w-full object-contain"
            />
          </div>
        </div>

        <div>
          <p className="text-sm font-bold text-[#5b21b6]">
            {product.category?.name} · {product.collection}
          </p>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">{product.name}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1 text-sm font-bold">
              <Star className="size-4 fill-[#ffcf4a] text-[#ffcf4a]" />
              {product.rating} ({product.review_count} reviews)
            </span>
            {product.badge && (
              <span className="rounded-md bg-[#f1ecff] px-3 py-1 text-xs font-bold">
                {product.badge}
              </span>
            )}
          </div>

          <p className="mt-5 text-base leading-7 text-muted-foreground">
            {product.description}
          </p>

          <div className="mt-7 space-y-5">
            {optionGroups.map((group) => (
              <fieldset key={group.key}>
                <legend className="mb-2 text-sm font-bold">{group.label}</legend>
                <div className="flex flex-wrap gap-2">
                  {group.values.map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => selectOption(group.key, value)}
                      className={`h-10 rounded-md border px-3 text-sm font-bold ${
                        selectedOptions[group.key] === value
                          ? "border-[#171214] bg-[#171214] text-white"
                          : "border-border bg-card"
                      }`}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </fieldset>
            ))}
          </div>

          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            {product.care_instructions.map((detail) => (
              <div key={detail} className="flex items-center gap-2 text-sm">
                <Check className="size-4 text-[#13a876]" />
                <span>{detail}</span>
              </div>
            ))}
          </div>
        </div>

        <aside className="h-fit rounded-md border border-border bg-card p-5 xl:sticky xl:top-28">
          <p className="text-3xl font-black">{formatCedis(selectedVariant?.price)}</p>
          {selectedVariant?.compare_at_price && (
            <p className="mt-1 text-sm text-muted-foreground">
              Was{" "}
              <span className="line-through">
                {formatCedis(selectedVariant.compare_at_price)}
              </span>
            </p>
          )}
          <div className="mt-5 rounded-md border border-[#13a876]/25 bg-[#eefcf5] p-3 text-sm">
            <p className="font-bold text-[#08784f]">
              {shippingMessage(selectedVariant)}
            </p>
            <p className="mt-1 text-[#08784f]">Accra delivery can arrive in 72 hours.</p>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            SKU: <span className="font-semibold text-foreground">{selectedVariant?.sku}</span>
          </p>
          <dl className="mt-4 grid gap-2 border-t border-border pt-4 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Material</dt>
              <dd className="text-right font-semibold">{product.material || "Premium human hair"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Availability</dt>
              <dd className="text-right font-semibold">{selectedVariant?.available_stock || 0} in stock</dd>
            </div>
          </dl>
          <div className="mt-5 grid gap-3">
            <button
              type="button"
              onClick={() => addToCart(product, selectedVariant)}
              disabled={busy || !selectedVariant?.available_stock}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-[#7c3aed] px-4 text-sm font-black text-white disabled:opacity-50"
            >
              {busy && <Loader2 className="size-4 animate-spin" />}
              Add to cart
            </button>
            <button
              type="button"
              onClick={() => addToCart(product, selectedVariant, true)}
              disabled={busy || !selectedVariant?.available_stock}
              className="h-12 rounded-md bg-[#171214] px-4 text-sm font-black text-white disabled:opacity-50"
            >
              Buy now
            </button>
            <button
              type="button"
              onClick={() => toggleWishlist(product.id)}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-border bg-white px-4 text-sm font-bold"
            >
              <Heart
                className={`size-4 ${
                  wishlist.includes(product.id) ? "fill-[#7c3aed] text-[#7c3aed]" : ""
                }`}
              />
              Save for later
            </button>
          </div>
        </aside>
      </div>
    </section>
  );
}

function shippingMessage(variant) {
  if (!variant || variant.available_stock < 1) {
    return "Currently out of stock";
  }

  if (variant.available_stock <= 3) {
    return `Only ${variant.available_stock} left in stock`;
  }

  return "In stock and ready to ship";
}

function CartView({
  addToCart,
  busy,
  cart,
  products,
  shippingFee,
  toggleWishlist,
  orderTotal,
  updateCartItem,
  wishlist,
}) {
  return (
    <section className="mx-auto max-w-[1440px] px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-4xl font-black">Shopping Cart</h1>
      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-md border border-border bg-card">
          {cart.items.length === 0 ? (
            <div className="grid min-h-80 place-items-center p-6 text-center">
              <div>
                <ShoppingBag className="mx-auto size-10 text-muted-foreground" />
                <p className="mt-4 text-xl font-bold">Your cart is empty</p>
                <Link
                  href="/shop"
                  className="mt-5 inline-flex h-11 items-center justify-center rounded-md bg-primary px-5 text-sm font-bold text-primary-foreground"
                >
                  Continue shopping
                </Link>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {cart.items.map((item) => (
                <CartLine key={item.id} item={item} updateCartItem={updateCartItem} />
              ))}
            </div>
          )}
        </div>

        <OrderSummary
          cart={cart}
          shippingFee={shippingFee}
          orderTotal={orderTotal}
          checkoutHref="/checkout"
        />
      </div>

      <ProductRail
        title="Complete the look"
        eyebrow="Recommended"
        products={products.slice(0, 4)}
        addToCart={addToCart}
        busy={busy}
        toggleWishlist={toggleWishlist}
        wishlist={wishlist}
      />
    </section>
  );
}

function CheckoutView({
  busy,
  cart,
  checkout,
  orderTotal,
  placeOrder,
  selectedZone,
  setShippingZoneId,
  shippingFee,
  shippingZoneId,
  shippingZones,
  updateCheckout,
}) {
  if (!cart.items.length) {
    return (
      <section className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-3xl font-black">Checkout is waiting for your cart</h1>
        <p className="mt-3 text-muted-foreground">
          Add your favorite wig, bundle, closure, or frontal before checking out.
        </p>
        <Link
          href="/shop"
          className="mt-6 inline-flex h-11 items-center justify-center rounded-md bg-primary px-5 text-sm font-bold text-primary-foreground"
        >
          Shop products
        </Link>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-[1440px] px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-4xl font-black">Checkout</h1>
      <form onSubmit={placeOrder} className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="grid gap-6">
          <CheckoutSection title="Contact">
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ["first_name", "First name"],
                ["last_name", "Last name"],
                ["email", "Email"],
                ["phone", "Phone"],
              ].map(([field, label]) => (
                <TextField
                  key={field}
                  label={label}
                  value={checkout[field]}
                  onChange={(value) => updateCheckout(field, value)}
                  required
                />
              ))}
            </div>
          </CheckoutSection>

          <CheckoutSection title="Delivery address">
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ["region", "Region"],
                ["city", "City/Town"],
                ["area", "Area/Suburb"],
                ["ghana_post_gps", "GhanaPost GPS"],
                ["street_address", "Street/House"],
                ["landmark", "Nearest landmark"],
              ].map(([field, label]) => (
                <TextField
                  key={field}
                  label={label}
                  value={checkout[field]}
                  onChange={(value) => updateCheckout(field, value)}
                  required={["region", "city", "street_address"].includes(field)}
                />
              ))}
            </div>
            <label className="mt-3 grid gap-1 text-sm font-semibold">
              Delivery instructions
              <textarea
                value={checkout.delivery_notes}
                onChange={(event) => updateCheckout("delivery_notes", event.target.value)}
                className="min-h-24 rounded-md border border-border bg-background p-3 outline-none focus:ring-4 focus:ring-[#7c3aed]/20"
              />
            </label>
          </CheckoutSection>

          <CheckoutSection title="Shipping and payment">
            <label className="grid gap-1 text-sm font-semibold">
              Delivery zone
              <select
                value={shippingZoneId}
                onChange={(event) => setShippingZoneId(event.target.value)}
                className="h-11 rounded-md border border-border bg-background px-3 outline-none focus:ring-4 focus:ring-[#7c3aed]/20"
                required
              >
                {shippingZones.map((zone) => (
                  <option key={zone.id} value={zone.id}>
                    {zone.name} · {formatCedis(zone.fee)} · {zone.timeframe}
                  </option>
                ))}
              </select>
            </label>
            <label className="mt-3 grid gap-1 text-sm font-semibold">
              Payment method
              <select
                value={checkout.payment_method}
                onChange={(event) => updateCheckout("payment_method", event.target.value)}
                className="h-11 rounded-md border border-border bg-background px-3 outline-none focus:ring-4 focus:ring-[#7c3aed]/20"
              >
                <option value="mtn_momo">MTN MoMo</option>
                <option value="telecel_cash">Telecel Cash</option>
                <option value="card">Visa/Mastercard</option>
                <option value="bank_transfer">Bank transfer</option>
              </select>
            </label>
          </CheckoutSection>
        </div>

        <aside className="h-fit rounded-md border border-border bg-card p-5 lg:sticky lg:top-28">
          <h2 className="text-xl font-black">Order summary</h2>
          <div className="mt-4 space-y-3">
            {cart.items.map((item) => (
              <div key={item.id} className="grid grid-cols-[56px_minmax(0,1fr)] gap-3">
                <img
                  src={item.image_url}
                  alt={item.product_name}
                  className="aspect-square rounded-md object-contain"
                />
                <div>
                  <p className="text-sm font-bold leading-5">{item.product_name}</p>
                  <p className="text-xs text-muted-foreground">Qty {item.quantity}</p>
                </div>
              </div>
            ))}
          </div>
          <SummaryRows
            subtotal={cart.subtotal}
            shippingFee={shippingFee}
            orderTotal={orderTotal}
          />
          <div className="mt-4 rounded-md bg-[#eefcf5] p-3 text-sm text-[#08784f]">
            Delivery: {selectedZone?.name} · {selectedZone?.timeframe}
          </div>
          <button
            disabled={busy}
            className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-[#7c3aed] px-4 text-sm font-black text-white disabled:opacity-50"
          >
            {busy && <Loader2 className="size-4 animate-spin" />}
            Place order
          </button>
        </aside>
      </form>
    </section>
  );
}

function TrackView({
  busy,
  lastOrder,
  setTrackContact,
  setTrackNumber,
  trackContact,
  trackNumber,
  trackOrder,
  trackedOrder,
}) {
  return (
    <section className="mx-auto grid max-w-[1200px] gap-6 px-4 py-10 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
      <form onSubmit={trackOrder} className="rounded-md border border-border bg-card p-5">
        <p className="text-sm font-bold text-[#5b21b6]">Order tracking</p>
        <h1 className="mt-2 text-3xl font-black">Where is my order?</h1>
        <p className="mt-3 leading-7 text-muted-foreground">
          Enter the order number and the email or phone number used at checkout.
        </p>
        {lastOrder && (
          <div className="mt-4 rounded-md border border-border bg-background p-3 text-sm">
            Latest order: <strong>{lastOrder.order_number}</strong>
          </div>
        )}
        <div className="mt-5 grid gap-3">
          <TextField
            label="Order number"
            value={trackNumber}
            onChange={setTrackNumber}
            required
          />
          <TextField
            label="Email or phone"
            value={trackContact}
            onChange={setTrackContact}
            required
          />
          <button
            disabled={busy}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-50"
          >
            {busy && <Loader2 className="size-4 animate-spin" />}
            Track package
          </button>
        </div>
      </form>

      <div className="rounded-md border border-border bg-card p-5">
        <h2 className="text-xl font-black">Tracking details</h2>
        {trackedOrder ? (
          <div className="mt-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-lg font-black">{trackedOrder.order_number}</p>
                <p className="text-sm text-muted-foreground">
                  {trackedOrder.shipping_zone} · {formatCedis(trackedOrder.total)}
                </p>
              </div>
              <span className="rounded-md bg-[#f1ecff] px-3 py-1 text-xs font-bold">
                {statusLabels[trackedOrder.status] || trackedOrder.status}
              </span>
            </div>
            <ol className="mt-6 space-y-4">
              {trackedOrder.timeline.map((step) => (
                <li key={step.key} className="flex items-center gap-3">
                  <span
                    className={`grid size-8 place-items-center rounded-full border text-xs font-bold ${
                      step.complete
                        ? "border-[#13a876] bg-[#13a876] text-white"
                        : "border-border bg-background"
                    }`}
                  >
                    {step.complete ? <Check className="size-4" /> : ""}
                  </span>
                  <span className={step.complete ? "font-bold" : "text-muted-foreground"}>
                    {step.label}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        ) : (
          <div className="mt-5 grid min-h-64 place-items-center rounded-md border border-dashed border-border text-center text-muted-foreground">
            Tracking results will appear here.
          </div>
        )}
      </div>
    </section>
  );
}

function DealsView({
  addToCart,
  busy,
  products,
  toggleWishlist,
  wishlist,
}) {
  const dealProducts = products.filter((product) => product.badge).concat(products).slice(0, 6);

  return (
    <>
      <PageIntro
        title="Today&apos;s Deals"
        description="Bundle offers, new arrivals, low-stock edits, and best-selling human hair pieces."
      />
      <section className="mx-auto max-w-[1440px] px-4 pb-12 sm:px-6 lg:px-8">
        <ProductGrid
          products={dealProducts}
          addToCart={addToCart}
          busy={busy}
          toggleWishlist={toggleWishlist}
          wishlist={wishlist}
        />
      </section>
    </>
  );
}

function CollectionView({
  addToCart,
  busy,
  collectionSlug,
  products,
  toggleWishlist,
  wishlist,
}) {
  const collections = {
    "glueless-wigs": {
      title: "Glueless Wigs",
      description:
        "Ready-to-wear lace units with secure fit, clean parting, and no salon install required.",
      products: products.filter((product) => product.category?.slug === "wigs"),
    },
    wigs: {
      title: "Wigs",
      description:
        "Shop bob, body wave, kinky curly, straight, lace-front, and HD lace wig units.",
      products: products.filter((product) => product.category?.slug === "wigs"),
    },
    bundles: {
      title: "Bundles",
      description:
        "Human hair bundle sets for sew-ins, ponytails, custom wigs, and stylist installs.",
      products: products.filter((product) => product.category?.slug === "bundles"),
    },
    "closures-frontals": {
      title: "Closures & Frontals",
      description:
        "Closure and frontal pieces for natural parting, protective installs, and custom units.",
      products: products.filter(
        (product) => product.category?.slug === "closures-frontals",
      ),
    },
  };
  const collection = collections[collectionSlug] || {
    title: "Collection",
    description: "Browse selected Eona Empire hair extensions and wig units.",
    products,
  };

  return (
    <>
      <PageIntro title={collection.title} description={collection.description} />
      <section className="mx-auto max-w-[1440px] px-4 pb-12 sm:px-6 lg:px-8">
        <ProductGrid
          products={collection.products}
          addToCart={addToCart}
          busy={busy}
          toggleWishlist={toggleWishlist}
          wishlist={wishlist}
        />
      </section>
    </>
  );
}

function ToolsView({ products }) {
  const bodyWave = products.find(
    (product) => product.slug === "eona-signature-body-wave-hd-wig",
  );

  return (
    <>
      <PageIntro
        title="Hair Tools"
        description="Quick buying guides for choosing length, lace, density, and delivery timing."
      />
      <section className="mx-auto grid max-w-[1200px] gap-5 px-4 pb-12 sm:px-6 md:grid-cols-3 lg:px-8">
        {[
          ["Length Guide", "Compare short bob, shoulder length, mid-back, and waist length finishes."],
          ["Lace Finder", "Pick 4x4, 5x5, or 13x4 lace based on your parting and styling needs."],
          ["Bundle Calculator", "Estimate how many bundles you need for fullness and length."],
        ].map(([title, detail]) => (
          <div key={title} className="rounded-md border border-border bg-card p-5">
            <Wrench className="size-6 text-[#6d28d9]" />
            <h2 className="mt-4 text-xl font-black">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{detail}</p>
            {bodyWave && (
              <a
                href={productHref(bodyWave.slug)}
                className="mt-4 inline-flex text-sm font-bold text-[#5b21b6]"
              >
                Start with a bestseller
              </a>
            )}
          </div>
        ))}
      </section>
    </>
  );
}

function HelpCenterView() {
  return (
    <>
      <PageIntro
        title="Help Center"
        description="Support for delivery, payments, returns, sizing, wig care, and order tracking."
      />
      <section className="mx-auto grid max-w-[1200px] gap-5 px-4 pb-12 sm:px-6 md:grid-cols-2 lg:px-8">
        {[
          ["Delivery", "Accra deliveries can be same-day to next-day depending on dispatch cut-off and zone."],
          ["Returns", "Eligible products can be returned within 30 days when lace is uncut and hair is unused."],
          ["Payments", "Checkout supports MoMo, cards, bank transfer, and pay-later style payment references."],
          ["Hair Care", "Use sulfate-free products, gentle detangling, satin storage, and controlled heat."],
        ].map(([title, detail]) => (
          <div key={title} className="rounded-md border border-border bg-card p-5">
            <HelpCircle className="size-6 text-[#6d28d9]" />
            <h2 className="mt-4 text-xl font-black">{title}</h2>
            <p className="mt-2 leading-7 text-muted-foreground">{detail}</p>
          </div>
        ))}
        <div className="rounded-md border border-[#1f9d55]/30 bg-[#effcf5] p-5 md:col-span-2">
          <MessageCircle className="size-7 text-[#128c4a]" />
          <h2 className="mt-4 text-xl font-black">Talk to customer support</h2>
          <p className="mt-2 leading-7 text-muted-foreground">
            Chat directly with an Eona Empire representative on WhatsApp for product, delivery, and order support.
          </p>
          <a
            href={WHATSAPP_SUPPORT_URL}
            target="_blank"
            rel="noreferrer"
            className="mt-5 inline-flex h-11 items-center gap-2 rounded-md bg-[#128c4a] px-5 text-sm font-bold text-white transition hover:bg-[#0f763e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#128c4a] focus-visible:ring-offset-2"
          >
            <MessageCircle className="size-5" />
            Chat on WhatsApp
          </a>
        </div>
      </section>
    </>
  );
}

function FavoritesView({ addToCart, busy, products, toggleWishlist, wishlist }) {
  const favoriteProducts = products.filter((product) => wishlist.includes(product.id));

  return (
    <>
      <PageIntro
        title="Favorites"
        description="Your saved Eona Empire products, ready whenever you want to compare or purchase."
      />
      <section className="mx-auto max-w-[1440px] px-4 pb-12 sm:px-6 lg:px-8">
        {favoriteProducts.length ? (
          <ProductGrid
            products={favoriteProducts}
            addToCart={addToCart}
            busy={busy}
            toggleWishlist={toggleWishlist}
            wishlist={wishlist}
          />
        ) : (
          <div className="grid min-h-72 place-items-center rounded-md border border-dashed border-border bg-card p-6 text-center">
            <div>
              <Heart className="mx-auto size-9 text-[#7c3aed]" />
              <h2 className="mt-4 text-xl font-black">No favorites yet</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Select the heart beside any product to save it here.
              </p>
              <Link href="/shop" className="mt-5 inline-flex h-11 items-center rounded-md bg-primary px-5 text-sm font-bold text-primary-foreground">
                Browse products
              </Link>
            </div>
          </div>
        )}
      </section>
    </>
  );
}

function AdminSignInView({ busy, loginAdmin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function submit(event) {
    event.preventDefault();
    loginAdmin({ email, password });
  }

  return (
    <section className="grid min-h-screen place-items-center bg-[#f7f5f6] px-4 py-10 sm:px-6">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <LogoMark />
        </div>
        <form onSubmit={submit} className="rounded-md border border-border bg-white p-5 shadow-sm sm:p-7">
          <p className="text-sm font-bold text-[#5b21b6]">Secure administration</p>
          <h1 className="mt-2 text-3xl font-black">Admin sign in</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Access store operations, products, stock, payments, and analytics.
          </p>
          <div className="mt-6 grid gap-4">
            <TextField label="Admin email" type="email" value={email} onChange={setEmail} required />
            <TextField label="Password" type="password" value={password} onChange={setPassword} required />
            <button disabled={busy} className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-[#171214] px-4 text-sm font-black text-white disabled:opacity-50">
              {busy && <Loader2 className="size-4 animate-spin" />}
              Sign in to console
            </button>
          </div>
        </form>
        <Link href="/" className="mt-5 flex justify-center text-sm font-bold text-[#5b21b6]">
          Return to storefront
        </Link>
      </div>
    </section>
  );
}

function SignInView({ busy, loginAccount }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function submit(event) {
    event.preventDefault();
    loginAccount({ email, password });
  }

  return (
    <section className="mx-auto grid max-w-[1100px] gap-6 px-4 py-10 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
      <div className="rounded-md border border-border bg-card p-6">
        <p className="text-sm font-bold text-[#5b21b6]">Customer account</p>
        <h1 className="mt-2 text-4xl font-black">Sign in</h1>
        <p className="mt-3 leading-7 text-muted-foreground">
          Access saved items, order history, checkout details, and delivery support.
        </p>
        <Link href="/sign-up" className="mt-6 inline-flex text-sm font-bold text-[#5b21b6]">
          Create a new account
        </Link>
      </div>
      <form onSubmit={submit} className="rounded-md border border-border bg-card p-6">
        <div className="grid gap-4">
          <TextField
            label="Email address"
            type="email"
            value={email}
            onChange={setEmail}
            required
          />
          <TextField
            label="Password"
            type="password"
            value={password}
            onChange={setPassword}
            required
          />
          <button
            disabled={busy}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-[#7c3aed] px-4 text-sm font-black text-white disabled:opacity-50"
          >
            {busy && <Loader2 className="size-4 animate-spin" />}
            Sign in
          </button>
        </div>
      </form>
    </section>
  );
}

function SignUpView({ busy, registerAccount }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    passwordConfirmation: "",
  });

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function submit(event) {
    event.preventDefault();
    registerAccount(form);
  }

  return (
    <section className="mx-auto grid max-w-[1100px] gap-6 px-4 py-10 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
      <div className="rounded-md border border-border bg-card p-6">
        <p className="text-sm font-bold text-[#5b21b6]">New customer</p>
        <h1 className="mt-2 text-4xl font-black">Create account</h1>
        <p className="mt-3 leading-7 text-muted-foreground">
          Create a customer profile, then use the same email and password to sign in.
        </p>
        <Link href="/sign-in" className="mt-6 inline-flex text-sm font-bold text-[#5b21b6]">
          Already have an account?
        </Link>
      </div>
      <form onSubmit={submit} className="rounded-md border border-border bg-card p-6">
        <div className="grid gap-4">
          <TextField
            label="Full name"
            value={form.name}
            onChange={(value) => update("name", value)}
            required
          />
          <TextField
            label="Email address"
            type="email"
            value={form.email}
            onChange={(value) => update("email", value)}
            required
          />
          <TextField
            label="Phone number"
            value={form.phone}
            onChange={(value) => update("phone", value)}
          />
          <TextField
            label="Password"
            type="password"
            value={form.password}
            onChange={(value) => update("password", value)}
            required
          />
          <TextField
            label="Confirm password"
            type="password"
            value={form.passwordConfirmation}
            onChange={(value) => update("passwordConfirmation", value)}
            required
          />
          <button
            disabled={busy}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-[#7c3aed] px-4 text-sm font-black text-white disabled:opacity-50"
          >
            {busy && <Loader2 className="size-4 animate-spin" />}
            Create account
          </button>
        </div>
      </form>
    </section>
  );
}

function AccountView({
  addToCart,
  apiMode,
  authUser,
  busy,
  cart,
  logoutAccount,
  products,
  toggleWishlist,
  wishlist,
}) {
  const savedProducts = products.filter((product) => wishlist.includes(product.id));

  return (
    <section className="mx-auto max-w-[1200px] px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-[#5b21b6]">
            {authUser ? authUser.email : "Guest"}
          </p>
          <h1 className="mt-2 text-4xl font-black">Your Account</h1>
        </div>
        {authUser ? (
          <button
            type="button"
            onClick={logoutAccount}
            className="h-11 rounded-md border border-border bg-card px-4 text-sm font-bold"
          >
            Sign out
          </button>
        ) : (
          <div className="flex gap-3">
            <Link
              href="/sign-in"
              className="inline-flex h-11 items-center justify-center rounded-md border border-border bg-card px-4 text-sm font-bold"
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="inline-flex h-11 items-center justify-center rounded-md bg-[#7c3aed] px-4 text-sm font-bold text-white"
            >
              Create account
            </Link>
          </div>
        )}
      </div>
      {authUser && (
        <div className="mt-6 rounded-md border border-border bg-card p-5">
          <h2 className="text-xl font-black">{authUser.name}</h2>
          <div className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
            <p>{authUser.email}</p>
            <p>{authUser.phone || "No phone saved"}</p>
            <p className="capitalize">{authUser.role}</p>
          </div>
        </div>
      )}
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {[
          ["Orders", apiMode === "live" ? "Connected to checkout records" : "Preview order history"],
          ["Saved Items", `${wishlist.length} item${wishlist.length === 1 ? "" : "s"} saved`],
          ["Cart", `${cart.item_count} item${cart.item_count === 1 ? "" : "s"} ready`],
        ].map(([title, detail]) => (
          <div key={title} className="rounded-md border border-border bg-card p-5">
            <p className="text-xl font-black">{title}</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{detail}</p>
          </div>
        ))}
      </div>
      <div className="mt-6">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-[#5b21b6]">Your shortlist</p>
            <h2 className="mt-1 text-2xl font-black">Saved products</h2>
          </div>
          <span className="text-sm font-semibold text-muted-foreground">
            {savedProducts.length} saved
          </span>
        </div>
        {savedProducts.length ? (
          <ProductGrid
            products={savedProducts}
            addToCart={addToCart}
            busy={busy}
            toggleWishlist={toggleWishlist}
            wishlist={wishlist}
          />
        ) : (
          <div className="grid min-h-44 place-items-center rounded-md border border-dashed border-border bg-card p-6 text-center">
            <div>
              <Heart className="mx-auto size-7 text-muted-foreground" />
              <p className="mt-3 font-bold">No saved products yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Select the heart on any product to keep it here.
              </p>
            </div>
          </div>
        )}
      </div>
      <div className="mt-6 rounded-md border border-border bg-card p-5">
        <h2 className="text-xl font-black">Customer support</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {[
            [Truck, "Delivery help", "Accra and nationwide shipping zones."],
            [CreditCard, "Payments", "MoMo, card, transfer, and pay later flows."],
            [ShieldCheck, "Returns", "30-day return window for eligible orders."],
          ].map(([Icon, title, detail]) => (
            <div key={title} className="rounded-md bg-background p-4">
              <Icon className="size-5 text-[#7c3aed]" />
              <p className="mt-3 font-bold">{title}</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{detail}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function AdminView({
  adminDashboard,
  adminRefreshing,
  adminUser,
  busy,
  categories,
  createAdminProduct,
  deleteAdminProduct,
  logoutAdmin,
  products,
  refreshAdminDashboard,
  setAdminProductStatus,
  updateAdminProduct,
  updateAdminVariant,
  uploadAdminProductImage,
}) {
  const [activeTab, setActiveTab] = useState("overview");
  const dashboard = adminDashboard || buildDemoDashboard(products);
  const summary = dashboard.summary || {};
  const maxDailyRevenue = Math.max(
    ...dashboard.sales_by_day.map((day) => Number(day.revenue || 0)),
    1,
  );

  if (adminUser?.role !== "admin") {
    return (
      <section className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6 lg:px-8">
        <Crown className="mx-auto size-10 text-[#6d28d9]" />
        <h1 className="mt-4 text-3xl font-black">Admin sign-in required</h1>
        <p className="mt-3 text-muted-foreground">
          Sign in with an admin account to manage products, uploads, stock,
          payments, clients, and analytics.
        </p>
        <Link
          href="/admin/sign-in"
          className="mt-6 inline-flex h-11 items-center justify-center rounded-md bg-[#7c3aed] px-5 text-sm font-bold text-white"
        >
          Sign in
        </Link>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-[#5b21b6]">Store operations</p>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">Admin Console</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={refreshAdminDashboard}
            disabled={adminRefreshing}
            className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-card px-3 text-sm font-bold disabled:cursor-wait disabled:opacity-60"
          >
            <RotateCcw className={`size-4 ${adminRefreshing ? "animate-spin" : ""}`} />
            {adminRefreshing ? "Refreshing" : "Refresh"}
          </button>
          <button
            type="button"
            onClick={logoutAdmin}
            className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-card px-3 text-sm font-bold"
          >
            <LogOut className="size-4" />
            Sign out
          </button>
        </div>
      </div>

      <div className="mt-6 flex gap-2 overflow-x-auto pb-1">
        {[
          ["overview", "Overview"],
          ["products", "Products"],
          ["payments", "Payments"],
          ["clients", "Clients"],
          ["analytics", "Analytics"],
        ].map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key)}
            className={`h-10 shrink-0 rounded-md border px-4 text-sm font-bold ${
              activeTab === key
                ? "border-[#7c3aed] bg-[#7c3aed] text-white"
                : "border-border bg-card"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <div className="mt-6 grid gap-5">
          <MetricGrid summary={summary} />
          <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
            <AdminPanel title="Low Stock">
              <div className="divide-y divide-border">
                {(dashboard.low_stock || []).slice(0, 8).map((variant) => (
                  <div
                    key={variant.id}
                    className="flex items-center justify-between gap-4 py-3 text-sm"
                  >
                    <div>
                      <p className="font-bold">{variant.product_name}</p>
                      <p className="text-muted-foreground">{variant.sku}</p>
                    </div>
                    <span>{variant.available_stock} left</span>
                  </div>
                ))}
              </div>
            </AdminPanel>
            <AdminPanel title="Recent Payments">
              <PaymentTable payments={(dashboard.payments || []).slice(0, 5)} compact />
            </AdminPanel>
          </div>
        </div>
      )}

      {activeTab === "products" && (
        <div className="mt-6 grid min-w-0 gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
          <NewProductForm
            busy={busy}
            categories={categories}
            createAdminProduct={createAdminProduct}
          />
          <div className="grid gap-4">
            {products.map((product) => (
              <ProductAdminCard
                key={product.id}
                busy={busy}
                deleteAdminProduct={deleteAdminProduct}
                product={product}
                setAdminProductStatus={setAdminProductStatus}
                updateAdminProduct={updateAdminProduct}
                updateAdminVariant={updateAdminVariant}
                uploadAdminProductImage={uploadAdminProductImage}
              />
            ))}
          </div>
        </div>
      )}

      {activeTab === "payments" && (
        <AdminPanel title="Payments">
          <PaymentTable payments={dashboard.payments || []} />
        </AdminPanel>
      )}

      {activeTab === "clients" && (
        <AdminPanel title="Clients">
          <ClientTable clients={dashboard.clients || []} />
        </AdminPanel>
      )}

      {activeTab === "analytics" && (
        <div className="mt-6 grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <AdminPanel title="Revenue by Day">
            <div className="space-y-3">
              {(dashboard.sales_by_day || []).map((day) => (
                <div key={day.date} className="grid grid-cols-[52px_minmax(0,1fr)_76px] items-center gap-2 text-xs sm:grid-cols-[92px_minmax(0,1fr)_92px] sm:gap-3 sm:text-sm">
                  <span className="font-semibold">{day.date.slice(5)}</span>
                  <div className="h-3 overflow-hidden rounded-full bg-[#ece5ff]">
                    <div
                      className="h-full rounded-full bg-[#7c3aed]"
                      style={{ width: `${metricBarValue(day.revenue, maxDailyRevenue)}%` }}
                    />
                  </div>
                  <span className="text-right font-bold">{formatCedis(day.revenue)}</span>
                </div>
              ))}
            </div>
          </AdminPanel>
          <AdminPanel title="Payment Methods">
            <div className="space-y-3">
              {(dashboard.sales_by_method || []).map((method) => (
                <div key={method.method} className="rounded-md border border-border p-3">
                  <div className="flex justify-between gap-3 text-sm">
                    <span className="font-bold">{method.method}</span>
                    <span>{formatCedis(method.amount)}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{method.count} payment{method.count === 1 ? "" : "s"}</p>
                </div>
              ))}
            </div>
          </AdminPanel>
          <AdminPanel title="Top Products">
            <div className="divide-y divide-border">
              {(dashboard.top_products || []).map((product) => (
                <div key={product.product_name} className="flex justify-between gap-4 py-3 text-sm">
                  <span className="font-bold">{product.product_name}</span>
                  <span>{product.units || 0} units</span>
                </div>
              ))}
            </div>
          </AdminPanel>
        </div>
      )}
    </section>
  );
}

function MetricGrid({ summary }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {[
        ["Revenue today", formatCedis(summary.revenue_today)],
        ["Total revenue", formatCedis(summary.revenue_total)],
        ["Orders", summary.orders_total || 0],
        ["Clients", summary.clients_total || 0],
        ["Payments", formatCedis(summary.payments_total)],
        ["Products", summary.products_total || 0],
        ["Low stock SKUs", summary.low_stock_skus || 0],
        ["Orders today", summary.orders_today || 0],
      ].map(([label, value]) => (
        <div key={label} className="rounded-md border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-black">{value}</p>
        </div>
      ))}
    </div>
  );
}

function AdminPanel({ children, title }) {
  return (
    <section className="rounded-md border border-border bg-card p-4 sm:p-5">
      <div className="flex items-center gap-2">
        <BarChart3 className="size-5 text-[#7c3aed]" />
        <h2 className="text-xl font-black">{title}</h2>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function NewProductForm({ busy, categories, createAdminProduct }) {
  const [imageError, setImageError] = useState("");
  const [form, setForm] = useState({
    category_id: categories[0]?.id || "",
    name: "",
    short_description: "",
    description: "",
    collection: "",
    texture: "",
    badge: "",
    discount_percentage: "",
    imageFile: null,
    imagePreview: "",
    rawImageFile: null,
    rawImagePreview: "",
    variant: {
      sku: "",
      length: "",
      color: "Natural Black",
      density: "180%",
      lace: "5x5 Lace",
      price: "",
      compare_at_price: "",
      stock_quantity: "",
    },
  });

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function updateVariant(field, value) {
    setForm((current) => ({
      ...current,
      variant: { ...current.variant, [field]: value },
    }));
  }

  async function chooseImage(event, kind = "finished") {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setImageError("Choose an image smaller than 5 MB.");
        event.target.value = "";
        return;
      }
      try {
        const optimizedFile = await optimizeProductImage(file);
        setImageError("");
        const prefix = kind === "raw" ? "rawImage" : "image";
        update(`${prefix}File`, optimizedFile);
        update(`${prefix}Preview`, await fileToDataUrl(optimizedFile));
      } catch (error) {
        setImageError(error.message);
        event.target.value = "";
      }
    }
  }

  function submit(event) {
    event.preventDefault();
    createAdminProduct({
      ...form,
      imageFile: form.imageFile,
      category_id: Number(form.category_id),
      discount_percentage: form.discount_percentage
        ? Number(form.discount_percentage)
        : null,
      variant: {
        ...form.variant,
        price: Number(form.variant.price),
        compare_at_price: form.variant.compare_at_price
          ? Number(form.variant.compare_at_price)
          : null,
        stock_quantity: Number(form.variant.stock_quantity),
      },
    });
  }

  return (
    <form onSubmit={submit} className="h-fit min-w-0 rounded-md border border-border bg-card p-5 xl:sticky xl:top-6">
      <h2 className="text-xl font-black">Add product</h2>
      <div className="mt-4 grid gap-3">
        <label className="grid gap-1 text-sm font-semibold">
          Department
          <select
            value={form.category_id}
            onChange={(event) => update("category_id", event.target.value)}
            className="h-11 w-full min-w-0 rounded-md border border-border bg-background px-3 outline-none focus:ring-4 focus:ring-[#7c3aed]/20"
            required
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <TextField label="Product name" value={form.name} onChange={(value) => update("name", value)} required />
        <TextField label="Collection" value={form.collection} onChange={(value) => update("collection", value)} />
        <TextField label="Texture" value={form.texture} onChange={(value) => update("texture", value)} required />
        <TextField label="Badge" value={form.badge} onChange={(value) => update("badge", value)} />
        <TextField label="Discount percentage" type="number" value={form.discount_percentage} onChange={(value) => update("discount_percentage", value)} />
        <TextField label="Short description" value={form.short_description} onChange={(value) => update("short_description", value)} required />
        <label className="grid gap-1 text-sm font-semibold">
          Description
          <textarea
            value={form.description}
            onChange={(event) => update("description", event.target.value)}
            className="min-h-24 w-full min-w-0 rounded-md border border-border bg-background p-3 outline-none focus:ring-4 focus:ring-[#7c3aed]/20"
            required
          />
        </label>
        <label className="grid cursor-pointer gap-3 rounded-md border border-dashed border-[#7c3aed]/50 bg-[#f8f5ff] p-4 text-center transition hover:border-[#7c3aed] hover:bg-[#f3edff]">
          <input type="file" accept="image/jpeg,image/png,image/webp,image/heic" onChange={(event) => chooseImage(event, "finished")} className="sr-only" required />
          <ImagePlus className="mx-auto size-7 text-[#7c3aed]" />
          <span className="text-sm font-black">Upload product image</span>
          <span className="text-xs leading-5 text-muted-foreground">
            JPG, PNG, WebP, or HEIC up to 5 MB. Use a clear square or portrait image.
          </span>
        </label>
        {imageError && <p className="text-sm font-semibold text-red-700">{imageError}</p>}
        {form.imagePreview && <img src={form.imagePreview} alt="New product preview" className="aspect-square w-full rounded-md bg-white object-contain ring-1 ring-border" />}
        <label className="grid cursor-pointer gap-3 rounded-md border border-dashed border-[#7c3aed]/50 bg-white p-4 text-center transition hover:border-[#7c3aed] hover:bg-[#f8f5ff]">
          <input type="file" accept="image/jpeg,image/png,image/webp,image/heic" onChange={(event) => chooseImage(event, "raw")} className="sr-only" />
          <ImagePlus className="mx-auto size-7 text-[#7c3aed]" />
          <span className="text-sm font-black">Upload raw product image</span>
          <span className="text-xs leading-5 text-muted-foreground">
            Show the bundles, wig, closure, or frontal before installation.
          </span>
        </label>
        {form.rawImagePreview && <img src={form.rawImagePreview} alt="Raw product preview" className="aspect-square w-full rounded-md bg-white object-contain ring-1 ring-border" />}
        <div className="grid min-w-0 gap-3 sm:grid-cols-2">
          {[
            ["sku", "SKU"],
            ["length", "Length"],
            ["color", "Color"],
            ["density", "Density"],
            ["lace", "Lace"],
            ["price", "Price"],
            ["compare_at_price", "Canceled price"],
            ["stock_quantity", "Stock"],
          ].map(([field, label]) => (
            <TextField
              key={field}
              label={label}
              type={["price", "compare_at_price", "stock_quantity"].includes(field) ? "number" : "text"}
              value={form.variant[field]}
              onChange={(value) => updateVariant(field, value)}
              required={["color", "price", "stock_quantity"].includes(field)}
            />
          ))}
        </div>
        <button
          disabled={busy}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#7c3aed] px-4 text-sm font-black text-white disabled:opacity-50"
        >
          {busy && <Loader2 className="size-4 animate-spin" />}
          Create product
        </button>
      </div>
    </form>
  );
}

function ProductAdminCard({
  busy,
  deleteAdminProduct,
  product,
  setAdminProductStatus,
  updateAdminProduct,
  updateAdminVariant,
  uploadAdminProductImage,
}) {
  const firstVariant = firstAvailableVariant(product);
  const [selectedVariantId, setSelectedVariantId] = useState(firstVariant?.id || "");
  const selectedVariant =
    product.variants.find((variant) => String(variant.id) === String(selectedVariantId)) ||
    firstVariant;
  const [productDraft, setProductDraft] = useState({
    name: product.name,
    collection: product.collection || "",
    texture: product.texture || "",
    badge: product.badge || "",
    discount_percentage: product.discount_percentage || "",
    short_description: product.short_description || "",
    description: product.description || "",
  });
  const [variantDraft, setVariantDraft] = useState({
    price: selectedVariant?.price || "",
    compare_at_price: selectedVariant?.compare_at_price || "",
    stock_quantity: selectedVariant?.stock_quantity || "",
  });

  function chooseVariant(variant) {
    setSelectedVariantId(variant.id);
    setVariantDraft({
      price: variant.price || "",
      compare_at_price: variant.compare_at_price || "",
      stock_quantity: variant.stock_quantity || "",
    });
  }

  function updateProductDraft(field, value) {
    setProductDraft((current) => ({ ...current, [field]: value }));
  }

  function submitProduct(event) {
    event.preventDefault();
    updateAdminProduct(product.id, productDraft);
  }

  function submitVariant(event) {
    event.preventDefault();
    updateAdminVariant(product.id, selectedVariant.id, {
      price: Number(variantDraft.price),
      compare_at_price: variantDraft.compare_at_price
        ? Number(variantDraft.compare_at_price)
        : null,
      stock_quantity: Number(variantDraft.stock_quantity),
    });
  }

  return (
    <article className={`min-w-0 rounded-md border bg-card p-4 sm:p-5 ${product.status === "archived" ? "border-border opacity-75" : "border-border"}`}>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <span className={`rounded-md px-2.5 py-1 text-xs font-black uppercase ${product.status === "archived" ? "bg-slate-200 text-slate-700" : "bg-emerald-100 text-emerald-800"}`}>
          {product.status || "active"}
        </span>
        <div className="flex flex-wrap gap-2">
          {product.status === "archived" ? (
            <button type="button" disabled={busy} onClick={() => setAdminProductStatus(product.id, "active")} className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-white px-3 text-xs font-bold disabled:opacity-50">
              <RotateCcw className="size-4" /> Reinstate
            </button>
          ) : (
            <button type="button" disabled={busy} onClick={() => setAdminProductStatus(product.id, "archived")} className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-white px-3 text-xs font-bold disabled:opacity-50">
              <Archive className="size-4" /> Archive
            </button>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              if (window.confirm(`Permanently delete ${product.name}? This cannot be undone.`)) {
                deleteAdminProduct(product.id);
              }
            }}
            className="inline-flex h-9 items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 text-xs font-bold text-red-700 disabled:opacity-50"
          >
            <Trash2 className="size-4" /> Delete
          </button>
        </div>
      </div>
      <div className="grid min-w-0 gap-5 xl:grid-cols-[210px_minmax(0,1fr)]">
        <div>
          <div className="aspect-square overflow-hidden rounded-md bg-white ring-1 ring-border">
            <img
              src={product.media?.[0]}
              alt={product.name}
              className="h-full w-full object-contain"
            />
          </div>
          <label className="mt-3 grid gap-1 text-sm font-semibold">
            Replace finished product image
            <input
              type="file"
              accept="image/*"
              onChange={(event) =>
                uploadAdminProductImage(product.id, event.target.files?.[0])
              }
              className="text-sm"
            />
          </label>
          <label className="mt-3 grid gap-1 text-sm font-semibold">
            Upload raw product image
            <input
              type="file"
              accept="image/*"
              onChange={(event) =>
                uploadAdminProductImage(product.id, event.target.files?.[0], "raw")
              }
              className="text-sm"
            />
          </label>
          {product.raw_media?.[0] && (
            <img
              src={product.raw_media[0]}
              alt={`${product.name} raw product`}
              className="mt-3 aspect-square w-24 rounded-md bg-white object-contain ring-1 ring-border"
            />
          )}
        </div>
        <div className="grid min-w-0 gap-5 2xl:grid-cols-2">
          <form onSubmit={submitProduct} className="grid gap-3">
            <h3 className="text-lg font-black">Product details</h3>
            <TextField label="Name" value={productDraft.name} onChange={(value) => updateProductDraft("name", value)} required />
            <TextField label="Collection" value={productDraft.collection} onChange={(value) => updateProductDraft("collection", value)} />
            <TextField label="Texture" value={productDraft.texture} onChange={(value) => updateProductDraft("texture", value)} required />
            <TextField label="Badge" value={productDraft.badge} onChange={(value) => updateProductDraft("badge", value)} />
            <TextField label="Discount percentage" type="number" value={productDraft.discount_percentage} onChange={(value) => updateProductDraft("discount_percentage", value ? Number(value) : null)} />
            <TextField label="Short description" value={productDraft.short_description} onChange={(value) => updateProductDraft("short_description", value)} required />
            <label className="grid min-w-0 gap-1 text-sm font-semibold">
              Description
              <textarea
                value={productDraft.description}
                onChange={(event) => updateProductDraft("description", event.target.value)}
                className="min-h-24 w-full min-w-0 rounded-md border border-border bg-background p-3 outline-none focus:ring-4 focus:ring-[#7c3aed]/20"
                required
              />
            </label>
            <button
              disabled={busy}
              className="h-10 rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-50"
            >
              Save product
            </button>
          </form>
          <form onSubmit={submitVariant} className="grid content-start gap-3">
            <h3 className="text-lg font-black">Pricing and stock</h3>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {product.variants.map((variant) => (
                <button
                  key={variant.id}
                  type="button"
                  onClick={() => chooseVariant(variant)}
                  className={`h-9 shrink-0 rounded-md border px-3 text-xs font-bold ${
                    String(selectedVariant?.id) === String(variant.id)
                      ? "border-[#7c3aed] bg-[#7c3aed] text-white"
                      : "border-border bg-white"
                  }`}
                >
                  {optionLabel(variant) || variant.sku}
                </button>
              ))}
            </div>
            <TextField label="Current price" type="number" value={variantDraft.price} onChange={(value) => setVariantDraft((current) => ({ ...current, price: value }))} required />
            <TextField label="Canceled price" type="number" value={variantDraft.compare_at_price} onChange={(value) => setVariantDraft((current) => ({ ...current, compare_at_price: value }))} />
            <TextField label="Stock quantity" type="number" value={variantDraft.stock_quantity} onChange={(value) => setVariantDraft((current) => ({ ...current, stock_quantity: value }))} required />
            <p className="text-sm text-muted-foreground">
              Available now: {selectedVariant?.available_stock || 0}
            </p>
            <button
              disabled={busy}
              className="h-10 rounded-md bg-[#7c3aed] px-4 text-sm font-bold text-white disabled:opacity-50"
            >
              Save pricing and stock
            </button>
          </form>
        </div>
      </div>
    </article>
  );
}

function PaymentTable({ compact = false, payments }) {
  if (!payments.length) {
    return <EmptyAdminState label="No payments yet" />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead className="text-xs uppercase text-muted-foreground">
          <tr>
            <th className="py-2 pr-4">Reference</th>
            <th className="py-2 pr-4">Client</th>
            <th className="py-2 pr-4">Method</th>
            <th className="py-2 pr-4">Amount</th>
            {!compact && <th className="py-2 pr-4">Status</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {payments.map((payment) => (
            <tr key={payment.id || payment.reference}>
              <td className="py-3 pr-4 font-bold">{payment.reference}</td>
              <td className="py-3 pr-4">
                <p className="font-semibold">{payment.customer_name || "Customer"}</p>
                <p className="text-xs text-muted-foreground">{payment.customer_email}</p>
              </td>
              <td className="py-3 pr-4">{payment.method}</td>
              <td className="py-3 pr-4 font-bold">{formatCedis(payment.amount)}</td>
              {!compact && <td className="py-3 pr-4">{payment.status}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ClientTable({ clients }) {
  if (!clients.length) {
    return <EmptyAdminState label="No clients yet" />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead className="text-xs uppercase text-muted-foreground">
          <tr>
            <th className="py-2 pr-4">Name</th>
            <th className="py-2 pr-4">Contact</th>
            <th className="py-2 pr-4">Orders</th>
            <th className="py-2 pr-4">Lifetime value</th>
            <th className="py-2 pr-4">Last order</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {clients.map((client) => (
            <tr key={`${client.email}-${client.phone}`}>
              <td className="py-3 pr-4 font-bold">{client.name}</td>
              <td className="py-3 pr-4">
                <p>{client.email}</p>
                <p className="text-xs text-muted-foreground">{client.phone}</p>
              </td>
              <td className="py-3 pr-4">{client.orders_count}</td>
              <td className="py-3 pr-4 font-bold">{formatCedis(client.lifetime_value)}</td>
              <td className="py-3 pr-4">{client.last_order_at || "No orders"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EmptyAdminState({ label }) {
  return (
    <div className="grid min-h-36 place-items-center rounded-md border border-dashed border-border text-center text-sm text-muted-foreground">
      {label}
    </div>
  );
}

function ProductRail({
  addToCart,
  busy,
  eyebrow,
  products,
  title,
  toggleWishlist,
  wishlist,
}) {
  return (
    <section className="mx-auto max-w-[1440px] px-4 py-10 sm:px-6 lg:px-8">
      <SectionHeading eyebrow={eyebrow} title={title} actionLabel="Shop all" actionHref="/shop" />
      <div className="mt-6 grid auto-cols-[78%] grid-flow-col gap-4 overflow-x-auto pb-3 sm:auto-cols-[46%] lg:auto-cols-[24%]">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            addToCart={addToCart}
            busy={busy}
            isSaved={wishlist.includes(product.id)}
            toggleWishlist={toggleWishlist}
          />
        ))}
      </div>
    </section>
  );
}

function ProductGrid({
  addToCart,
  busy,
  products,
  toggleWishlist,
  wishlist,
}) {
  if (products.length === 0) {
    return (
      <div className="grid min-h-72 place-items-center rounded-md border border-dashed border-border bg-card p-6 text-center">
        <div>
          <Search className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-3 font-bold">No products matched your filters</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {products.map((product) => (
        <ProductCard
          key={`${product.id}-${product.slug}`}
          product={product}
          addToCart={addToCart}
          busy={busy}
          isSaved={wishlist.includes(product.id)}
          toggleWishlist={toggleWishlist}
        />
      ))}
    </div>
  );
}

function ProductCard({ addToCart, busy, isSaved, product, toggleWishlist }) {
  const variant = firstAvailableVariant(product);

  return (
    <article className="group overflow-hidden rounded-md border border-border bg-card">
      <a href={productHref(product.slug)} className="relative block aspect-[4/5] bg-white">
        <img
          src={product.media?.[0]}
          alt={`${product.name} worn by a Black model`}
          className="h-full w-full object-contain transition duration-500 group-hover:scale-[1.03]"
        />
        {product.discount_percentage ? (
          <span className="absolute left-3 top-3 rounded-md bg-[#7c3aed] px-3 py-1 text-xs font-black text-white shadow-sm">
            {product.discount_percentage}% OFF
          </span>
        ) : product.badge ? (
          <span className="absolute left-3 top-3 rounded-md bg-white px-3 py-1 text-xs font-bold shadow-sm">
            {product.badge}
          </span>
        ) : null}
        {product.raw_media?.[0] && (
          <span className="absolute bottom-3 left-3 block size-16 overflow-hidden rounded-md border-2 border-white bg-white shadow-md sm:size-20">
            <img
              src={product.raw_media[0]}
              alt={`${product.name} raw product`}
              className="h-full w-full object-contain"
            />
          </span>
        )}
      </a>
      <div className="p-4">
        <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
          <span>{product.texture}</span>
          <span className="inline-flex items-center gap-1">
            <Star className="size-3.5 fill-[#ffcf4a] text-[#ffcf4a]" />
            {product.rating}
          </span>
        </div>
        <a href={productHref(product.slug)} className="mt-2 block min-h-14">
          <h2 className="text-lg font-black leading-6">{product.name}</h2>
        </a>
        <p className="mt-2 min-h-11 text-sm leading-6 text-muted-foreground">
          {product.short_description}
        </p>
        <div className="mt-3 flex items-end gap-2">
          <span className="text-xl font-black">{formatCedis(variant?.price)}</span>
          {variant?.compare_at_price && (
            <span className="pb-0.5 text-sm text-muted-foreground line-through">
              {formatCedis(variant.compare_at_price)}
            </span>
          )}
        </div>
        <p className="mt-2 text-xs font-semibold text-muted-foreground">
          {product.variants.length} variants · {variant?.available_stock || 0} in stock
        </p>
        <div className="mt-4 grid grid-cols-[1fr_44px] gap-2">
          <button
            type="button"
            onClick={() => addToCart(product, variant)}
            disabled={busy || !variant?.available_stock}
            className="h-11 rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-50"
          >
            Quick add
          </button>
          <button
            type="button"
            onClick={() => toggleWishlist(product.id)}
            className="grid size-11 place-items-center rounded-md border border-border bg-white"
            aria-label={
              isSaved ? `Remove ${product.name} from saved products` : `Save ${product.name}`
            }
            aria-pressed={isSaved}
            title={isSaved ? "Remove from saved products" : "Save product"}
          >
            <Heart className={`size-4 ${isSaved ? "fill-[#7c3aed] text-[#7c3aed]" : ""}`} />
          </button>
        </div>
      </div>
    </article>
  );
}

function CartLine({ item, updateCartItem }) {
  return (
    <div className="grid gap-4 p-4 sm:grid-cols-[120px_minmax(0,1fr)_150px]">
      <a href={productHref(item.product_slug)} className="block overflow-hidden rounded-md bg-white">
        <img src={item.image_url} alt={item.product_name} className="aspect-square w-full object-contain" />
      </a>
      <div>
        <a href={productHref(item.product_slug)} className="font-black">
          {item.product_name}
        </a>
        <p className="mt-1 text-sm text-muted-foreground">{optionLabel(item)}</p>
        <p className="mt-3 text-sm font-semibold">{formatCedis(item.unit_price)}</p>
        <button
          type="button"
          onClick={() => updateCartItem(item, 0)}
          className="mt-4 text-sm font-bold text-[#5b21b6]"
        >
          Remove
        </button>
      </div>
      <div className="flex items-start justify-between gap-3 sm:block sm:text-right">
        <QuantityStepper item={item} updateCartItem={updateCartItem} />
        <p className="mt-3 font-black">{formatCedis(item.line_total)}</p>
      </div>
    </div>
  );
}

function QuantityStepper({ item, updateCartItem }) {
  return (
    <div className="inline-flex h-10 items-center rounded-md border border-border bg-white">
      <button
        type="button"
        onClick={() => updateCartItem(item, item.quantity - 1)}
        className="grid size-10 place-items-center"
        aria-label={`Decrease ${item.product_name}`}
      >
        <Minus className="size-4" />
      </button>
      <span className="grid size-10 place-items-center text-sm font-black">{item.quantity}</span>
      <button
        type="button"
        onClick={() => updateCartItem(item, item.quantity + 1)}
        className="grid size-10 place-items-center"
        aria-label={`Increase ${item.product_name}`}
      >
        +
      </button>
    </div>
  );
}

function OrderSummary({ cart, checkoutHref, orderTotal, shippingFee }) {
  return (
    <aside className="h-fit rounded-md border border-border bg-card p-5 lg:sticky lg:top-28">
      <h2 className="text-xl font-black">Subtotal ({cart.item_count} items)</h2>
      <SummaryRows
        subtotal={cart.subtotal}
        shippingFee={shippingFee}
        orderTotal={orderTotal}
      />
      <Link
        href={checkoutHref}
        className={`mt-5 flex h-12 items-center justify-center rounded-md px-4 text-sm font-black ${
          cart.items.length
            ? "bg-[#7c3aed] text-white"
            : "pointer-events-none bg-muted text-muted-foreground"
        }`}
      >
        Proceed to checkout
      </Link>
    </aside>
  );
}

function SummaryRows({ orderTotal, shippingFee, subtotal }) {
  return (
    <div className="mt-4 space-y-2 text-sm">
      <div className="flex justify-between">
        <span>Items</span>
        <span>{formatCedis(subtotal)}</span>
      </div>
      <div className="flex justify-between">
        <span>Delivery</span>
        <span>{shippingFee === 0 ? "Free" : formatCedis(shippingFee)}</span>
      </div>
      <div className="border-t border-border pt-3 text-lg font-black">
        <div className="flex justify-between">
          <span>Total</span>
          <span>{formatCedis(orderTotal)}</span>
        </div>
      </div>
    </div>
  );
}

function CheckoutSection({ children, title }) {
  return (
    <section className="rounded-md border border-border bg-card p-5">
      <h2 className="text-xl font-black">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function TextField({ label, onChange, required = false, type = "text", value }) {
  return (
    <label className="grid min-w-0 gap-1 text-sm font-semibold">
      {label}
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full min-w-0 rounded-md border border-border bg-background px-3 outline-none focus:ring-4 focus:ring-[#7c3aed]/20"
        required={required}
      />
    </label>
  );
}

function FilterButton({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-10 items-center justify-between rounded-md border px-3 text-left text-sm font-semibold ${
        active ? "border-[#171214] bg-[#171214] text-white" : "border-border bg-white"
      }`}
    >
      <span>{children}</span>
      {active && <Check className="size-4" />}
    </button>
  );
}

function PageIntro({ description, title }) {
  return (
    <section className="border-b border-border bg-[#f6f0ff]">
      <div className="mx-auto max-w-[1440px] px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-[#5b21b6]">
          <ArrowLeft className="size-4" />
          Eona Empire
        </Link>
        <div className="mt-5 max-w-3xl border-l-4 border-[#7c3aed] pl-5 sm:pl-7">
          <h1 className="text-4xl font-black sm:text-5xl">{title}</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
          {description}
          </p>
        </div>
      </div>
    </section>
  );
}

function SectionHeading({ actionHref, actionLabel, eyebrow, title }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-sm font-bold text-[#5b21b6]">{eyebrow}</p>
        <h2 className="mt-1 text-3xl font-black">{title}</h2>
      </div>
      {actionHref && (
        <Link
          href={actionHref}
          className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-white px-4 text-sm font-bold"
        >
          {actionLabel}
          <ArrowRight className="size-4" />
        </Link>
      )}
    </div>
  );
}

function LoadingPanel() {
  return (
    <div className="grid min-h-72 place-items-center rounded-md border border-border bg-card">
      <Loader2 className="size-7 animate-spin text-[#7c3aed]" />
    </div>
  );
}

function StoreFooter({ categories }) {
  return (
    <footer className="border-t border-border bg-[#171214] px-4 py-10 text-white sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-[1440px] gap-8 md:grid-cols-[1fr_2fr]">
        <div>
          <LogoMark />
          <p className="mt-4 max-w-sm text-sm leading-6 text-white/70">
            Premium human hair commerce for wigs, bundles, closures, frontals,
            Ghana delivery, order tracking, and store operations.
          </p>
        </div>
        <div className="grid gap-6 text-sm sm:grid-cols-4">
          <FooterColumn
            title="Shop"
            links={[
              ["All products", "/shop"],
              ...categories.map((category) => [
                category.name,
                `/collections/${category.slug}`,
              ]),
            ]}
          />
          <FooterColumn
            title="Customer"
            links={[
              ["Account", "/account"],
              ["Sign In", "/sign-in"],
              ["Create Account", "/sign-up"],
              ["Cart", "/cart"],
              ["Checkout", "/checkout"],
              ["Track Order", "/track-order"],
            ]}
          />
          <FooterColumn
            title="Store"
            links={[
              ["Deals", "/deals"],
              ["Best Sellers", "/shop?search=best"],
              ["New Arrivals", "/deals"],
            ]}
          />
          <FooterColumn
            title="Support"
            links={[
              ["WhatsApp Support", WHATSAPP_SUPPORT_URL],
              ["Help Center", "/help-center"],
              ["Track Order", "/track-order"],
              ["Returns", "/help-center"],
              ["Payments", "/checkout"],
            ]}
          />
        </div>
      </div>
      <div className="mx-auto mt-10 max-w-[1440px] border-t border-white/20 pt-6 text-sm text-white/70">
        <p>Powered by Navkwa Group Ltd.</p>
        <p className="mt-1">© 2026 Eona Empire. All rights reserved.</p>
      </div>
    </footer>
  );
}

function WhatsAppSupport() {
  return (
    <a
      href={WHATSAPP_SUPPORT_URL}
      target="_blank"
      rel="noreferrer"
      aria-label="Chat with Eona Empire support on WhatsApp"
      title="WhatsApp support"
      className="fixed bottom-4 right-4 z-30 inline-flex h-12 items-center gap-2 rounded-md bg-[#128c4a] px-3 text-sm font-bold text-white shadow-lg transition hover:bg-[#0f763e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#128c4a] focus-visible:ring-offset-2 sm:bottom-6 sm:right-6 sm:px-4"
    >
      <MessageCircle className="size-6" />
      <span className="hidden sm:inline">WhatsApp support</span>
    </a>
  );
}

function FooterColumn({ links, title }) {
  return (
    <div>
      <p className="font-bold">{title}</p>
      <div className="mt-3 grid gap-2 text-white/70">
        {links.map(([label, href]) =>
          href.startsWith("http") ? (
            <a key={`${title}-${label}`} href={href} target="_blank" rel="noreferrer">
              {label}
            </a>
          ) : (
            <Link key={`${title}-${label}`} href={href}>
              {label}
            </Link>
          ),
        )}
      </div>
    </div>
  );
}
