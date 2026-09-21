const imageBase = "/images/store";

export const fallbackCategories = [
  {
    id: 1,
    name: "Wigs",
    slug: "wigs",
    description: "Glueless, lace-front, bob, HD lace, and ready-to-wear units.",
    sort_order: 10,
  },
  {
    id: 2,
    name: "Bundles",
    slug: "bundles",
    description: "Human hair bundles for sew-ins and custom installs.",
    sort_order: 20,
  },
  {
    id: 3,
    name: "Closures & Frontals",
    slug: "closures-frontals",
    description: "Closures, frontals, and install essentials.",
    sort_order: 30,
  },
];

export const storefrontImages = {
  hero: `${imageBase}/hero-slide-lavender.png`,
  heroLavender: `${imageBase}/hero-slide-lavender.png`,
  heroSilver: `${imageBase}/hero-slide-silver.png`,
  heroBlush: `${imageBase}/hero-slide-blush.png`,
  bodyWave: `${imageBase}/body-wave-hd-wig.png`,
  sleekBob: `${imageBase}/sleek-bob-lace-wig.png`,
  kinkyCurly: `${imageBase}/kinky-curly-glueless-wig.png`,
  deepWave: `${imageBase}/deep-wave-bundle-set.png`,
  waterWave: `${imageBase}/water-wave-closure-set.png`,
};

export const heroSlides = [
  {
    image: storefrontImages.heroLavender,
    alt: "Black women showcasing bob and body wave wig hair extensions in a lavender salon",
    eyebrow: "Bob Edit",
    title: "A NEW TAKE ON BOB",
    subtitle: "Timeless shapes with a modern finish.",
    href: "/collections/wigs",
  },
  {
    image: storefrontImages.heroSilver,
    alt: "Black women showcasing curly wig hair extensions in a silver studio",
    eyebrow: "Curly Collection",
    title: "MINUTE GLAM",
    subtitle: "Ready-to-wear curls. No stress.",
    href: "/collections/glueless-wigs",
  },
  {
    image: storefrontImages.heroBlush,
    alt: "Black women showcasing straight and water wave wig hair extensions in a blush salon",
    eyebrow: "New Arrivals",
    title: "SLEEK LACE FINISH",
    subtitle: "Soft installs, polished parting, everyday luxury.",
    href: "/shop",
  },
];

function makeVariant(
  id,
  productId,
  sku,
  length,
  color,
  density,
  lace,
  price,
  stock = 8,
) {
  return {
    id,
    product_id: productId,
    sku,
    length,
    color,
    density,
    lace,
    price,
    compare_at_price: price + 340,
    stock_quantity: stock,
    reserved_quantity: 0,
    available_stock: stock,
    weight_kg: 0.38,
  };
}

export const fallbackProducts = [
  {
    id: 1,
    name: "Eona Signature Body Wave HD Wig",
    slug: "eona-signature-body-wave-hd-wig",
    category: fallbackCategories[0],
    short_description:
      "A polished ready-to-wear HD lace unit with soft body movement.",
    description:
      "Premium glueless human hair with a natural hairline, secure fit, adjustable band, and Ghana-ready styling flexibility.",
    collection: "Eona Signature",
    material: "100% human hair",
    texture: "Body Wave",
    colors: ["Natural Black", "Brown"],
    media: [storefrontImages.bodyWave, storefrontImages.hero],
    care_instructions: [
      "Use sulfate-free shampoo.",
      "Air dry when possible.",
      "Store on a wig stand.",
      "Heat style below 180C.",
    ],
    rating: 4.9,
    review_count: 128,
    badge: "Best Seller",
    variants: [
      makeVariant(101, 1, "EON-BODY-16-NAT-150-5X5", '16"', "Natural Black", "150%", "5x5 HD Lace", 2580, 7),
      makeVariant(102, 1, "EON-BODY-18-NAT-180-13X4", '18"', "Natural Black", "180%", "13x4 HD Lace", 2960, 9),
      makeVariant(103, 1, "EON-BODY-22-BRN-200-13X4", '22"', "Brown", "200%", "13x4 HD Lace", 3560, 4),
    ],
    price_min: 2580,
    price_max: 3560,
  },
  {
    id: 2,
    name: "Akwaaba Sleek Bob Lace Wig",
    slug: "akwaaba-sleek-bob-lace-wig",
    category: fallbackCategories[0],
    short_description:
      "A sharp bob with an easy lace finish for office days and evenings.",
    description:
      "A polished bob wig with pre-plucked lace, clean movement, and a low-maintenance cut that keeps its shape.",
    collection: "Bob Edit",
    material: "100% human hair",
    texture: "Straight",
    colors: ["Jet Black", "Natural Black"],
    media: [storefrontImages.sleekBob, storefrontImages.hero],
    care_instructions: [
      "Wrap before sleeping.",
      "Use light serum only.",
      "Brush gently from ends upward.",
      "Store flat or on a stand.",
    ],
    rating: 4.8,
    review_count: 84,
    badge: "New",
    variants: [
      makeVariant(201, 2, "EON-BOB-10-JET-150-4X4", '10"', "Jet Black", "150%", "4x4 Lace", 1780, 8),
      makeVariant(202, 2, "EON-BOB-12-NAT-180-5X5", '12"', "Natural Black", "180%", "5x5 Lace", 2140, 6),
      makeVariant(203, 2, "EON-BOB-14-JET-180-5X5", '14"', "Jet Black", "180%", "5x5 Lace", 2320, 5),
    ],
    price_min: 1780,
    price_max: 2320,
  },
  {
    id: 3,
    name: "Gold Coast Kinky Curly Unit",
    slug: "gold-coast-kinky-curly-unit",
    category: fallbackCategories[0],
    short_description:
      "Defined curls, generous volume, and a scalp-friendly glueless cap.",
    description:
      "A textured glueless unit with rich curl definition, adjustable band, and everyday comfort for full-volume styling.",
    collection: "Texture Edit",
    material: "100% human hair",
    texture: "Kinky Curly",
    colors: ["Natural Black", "Brown"],
    media: [storefrontImages.kinkyCurly, storefrontImages.bodyWave],
    care_instructions: [
      "Mist with water before styling.",
      "Detangle with fingers.",
      "Use curl cream sparingly.",
      "Do not brush while dry.",
    ],
    rating: 4.7,
    review_count: 67,
    badge: "Limited",
    variants: [
      makeVariant(301, 3, "EON-KINK-16-NAT-180-5X5", '16"', "Natural Black", "180%", "5x5 Lace", 2280, 5),
      makeVariant(302, 3, "EON-KINK-20-NAT-200-13X4", '20"', "Natural Black", "200%", "13x4 Lace", 2960, 3),
      makeVariant(303, 3, "EON-KINK-24-BRN-200-13X4", '24"', "Brown", "200%", "13x4 Lace", 3340, 4),
    ],
    price_min: 2280,
    price_max: 3340,
  },
  {
    id: 4,
    name: "Kumasi Deep Wave Bundle Set",
    slug: "kumasi-deep-wave-bundle-set",
    category: fallbackCategories[1],
    short_description:
      "Full deep-wave bundles for sew-ins, ponytails, and custom units.",
    description:
      "Machine double-weft human hair bundles with a deep-wave finish, reusable quality, and matching closure options.",
    collection: "Bundle Bar",
    material: "100% human hair",
    texture: "Deep Wave",
    colors: ["Natural Black", "Brown"],
    media: [storefrontImages.deepWave, storefrontImages.kinkyCurly],
    care_instructions: [
      "Co-wash before install.",
      "Use a wide-tooth comb.",
      "Keep bundles dry before storage.",
      "Refresh wave with mousse.",
    ],
    rating: 4.8,
    review_count: 96,
    badge: "Bundle Deal",
    variants: [
      makeVariant(401, 4, "EON-DEEP-16-NAT-3B-NOLACE", '16"', "Natural Black", "3 Bundles", "No Lace", 1480, 11),
      makeVariant(402, 4, "EON-DEEP-20-NAT-4B-CLOSURE", '20"', "Natural Black", "4 Bundles", "Closure Add-on", 2140, 6),
      makeVariant(403, 4, "EON-DEEP-24-BRN-4B-CLOSURE", '24"', "Brown", "4 Bundles", "Closure Add-on", 2520, 5),
    ],
    price_min: 1480,
    price_max: 2520,
  },
  {
    id: 5,
    name: "Ada Water Wave Closure Set",
    slug: "ada-water-wave-closure-set",
    category: fallbackCategories[2],
    short_description:
      "A water-wave closure and bundle pairing for stylist-led installs.",
    description:
      "A closure-ready set with soft water-wave texture and lace options for a natural finish and flexible parting.",
    collection: "Install Essentials",
    material: "100% human hair",
    texture: "Water Wave",
    colors: ["Natural Black", "Honey Brown"],
    media: [storefrontImages.waterWave, storefrontImages.deepWave],
    care_instructions: [
      "Refresh wave with leave-in spray.",
      "Avoid heavy oils.",
      "Protect lace during storage.",
      "Use a satin wrap at night.",
    ],
    rating: 4.7,
    review_count: 43,
    badge: "Low Stock",
    variants: [
      makeVariant(501, 5, "EON-WATER-14-NAT-3B-4X4", '14"', "Natural Black", "3 Bundles", "4x4 Closure", 1680, 4),
      makeVariant(502, 5, "EON-WATER-18-NAT-4B-5X5", '18"', "Natural Black", "4 Bundles", "5x5 Closure", 2260, 3),
      makeVariant(503, 5, "EON-WATER-20-HNY-4B-5X5", '20"', "Honey Brown", "4 Bundles", "5x5 Closure", 2540, 2),
    ],
    price_min: 1680,
    price_max: 2540,
  },
];

export const fallbackShippingZones = [
  {
    id: 1,
    name: "Accra Central",
    region: "Greater Accra",
    fee: 30,
    free_delivery_threshold: 2000,
    timeframe: "Same day to next day",
  },
  {
    id: 2,
    name: "Greater Accra Zone 2",
    region: "Greater Accra",
    fee: 45,
    free_delivery_threshold: 2500,
    timeframe: "1-2 business days",
  },
  {
    id: 3,
    name: "Kumasi",
    region: "Ashanti",
    fee: 70,
    free_delivery_threshold: null,
    timeframe: "2-4 business days",
  },
  {
    id: 4,
    name: "Other Ghana Regions",
    region: "Nationwide",
    fee: 80,
    free_delivery_threshold: null,
    timeframe: "3-5 business days",
  },
];

export const fallbackAdminSummary = {
  revenue_today: 0,
  orders_today: 0,
  pending_dispatch: 0,
  low_stock_skus: 2,
  low_stock: [
    { id: 302, sku: "EON-KINK-20-NAT-200-13X4", stock_quantity: 3, reserved_quantity: 0 },
    { id: 503, sku: "EON-WATER-20-HNY-4B-5X5", stock_quantity: 2, reserved_quantity: 0 },
  ],
};

export const servicePromises = [
  "30 Days Free Return",
  "72-Hr Delivery",
  "Free Shipping",
  "Pay Later",
  "100% Human Hair",
];

export const checkoutDefaults = {
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
