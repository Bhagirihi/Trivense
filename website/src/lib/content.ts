export const site = {
  name: "Trivense",
  tagline: "Split expenses, made easy.",
  description:
    "Trivense helps travelers and groups manage shared expenses with boards, real-time sync, analytics, and smart budgets — built for India and beyond.",
  url: "https://trivense.vercel.app",
  supportEmail: "support@trivense.app",
  playStoreUrl:
    "https://play.google.com/store/apps/details?id=com.trivense.app",
};

export const trustBadges = [
  "Real-time sync",
  "Group boards",
  "INR & multi-currency",
  "Encrypted in transit · RLS-backed",
];

export const features = [
  {
    title: "Expense boards",
    description:
      "Organize spending by trip, household, or project. Each board has its own budget and members.",
    icon: "grid",
  },
  {
    title: "Split & share",
    description:
      "Invite others with a share code or email. Free includes 1 shared board; Premium unlocks unlimited sharing.",
    icon: "users",
  },
  {
    title: "Smart analytics",
    description:
      "See where money goes with category breakdowns, trends, and period comparisons.",
    icon: "chart",
  },
  {
    title: "Budget alerts",
    description:
      "Set per-board budgets and get notified before you overspend on your next adventure.",
    icon: "bell",
  },
  {
    title: "Multi-currency",
    description:
      "Track expenses in INR and other currencies with localized formatting.",
    icon: "currency",
  },
  {
    title: "Secure cloud sync",
    description:
      "Your data is backed by Supabase with auth, row-level security, and realtime updates.",
    icon: "shield",
  },
];

export const steps = [
  {
    step: "01",
    title: "Create a board",
    description: "Start a board for your trip or group and set a per-person budget.",
  },
  {
    step: "02",
    title: "Add expenses",
    description: "Log spending with categories, payment method, and optional notes.",
  },
  {
    step: "03",
    title: "Invite & split",
    description: "Share the board so everyone stays aligned on who paid what.",
  },
  {
    step: "04",
    title: "Review insights",
    description: "Use analytics to understand spending and plan better next time.",
  },
];

export const planFeatures = {
  free: [
    "Unlimited personal boards",
    "1 shared board",
    "Settlements",
    "Analytics (week, month, year, all)",
    "Up to 3 custom categories",
    "Email sign-in",
    "Ads displayed in the app",
  ],
  premium: [
    "Ad-free experience",
    "Unlimited shared boards & invites",
    "Unlimited categories",
    "Export (JSON/CSV)",
    "Google Drive backup",
  ],
  yearly: [
    "Everything in Premium",
    "Save vs monthly billing",
    "Ideal for annual trip planning",
  ],
};

/** Free-plan ads bullet — links to /ads from the pricing card */
export const FREE_PLAN_ADS_FEATURE = "Ads displayed in the app";
export const ADS_POLICY_PATH = "/ads";

export const plans = [
  {
    name: "Free",
    price: "₹0",
    period: "forever",
    description:
      "Unlimited boards with ads — 1 shared board, settlements, and 3 categories.",
    features: [
      "Unlimited personal boards",
      "1 shared board",
      "Settlements",
      "Analytics (week, month, year, all)",
      "Up to 3 custom categories",
      "Email sign-in",
      "Ads displayed in the app",
    ],
    cta: "Get started",
    highlighted: false,
  },
  {
    name: "Premium",
    price: "₹299",
    period: "/month",
    description: "For frequent travelers and groups who need more.",
    features: [
      "Ad-free experience",
      "Unlimited shared boards & invites",
      "Unlimited categories",
      "Export (JSON/CSV)",
      "Google Drive backup",
    ],
    cta: "Go Premium",
    highlighted: true,
  },
  {
    name: "Premium Yearly",
    price: "₹2,499",
    period: "/year",
    description: "Best value — about ₹208/month billed annually.",
    features: [
      "Everything in Premium",
      "Save vs monthly billing",
      "Ideal for annual trip planning",
    ],
    cta: "Save with yearly",
    highlighted: false,
  },
];

export const pricingNote =
  "India pricing shown. Premium markets (US, UK, EU, etc.) are billed at local premium rates in the app — from $9.99/month.";

export const faqs = [
  {
    q: "What is Trivense?",
    a: "Trivense is a mobile expense tracker designed for trips and shared spending. Create boards, add expenses, invite friends, and see analytics — all in one app.",
  },
  {
    q: "Is my data secure?",
    a: "Yes. Trivense uses Supabase for authentication and storage with row-level security. Only you and people you invite can access your boards.",
  },
  {
    q: "Can I use Trivense for free?",
    a: "Yes. Free includes unlimited personal boards with ads, 1 shared board, settlements, analytics (week, month, year, and all-time), and up to three custom categories. Upgrade to Premium for an ad-free experience, unlimited sharing, export, and more categories.",
  },
  {
    q: "How do I join a shared board?",
    a: "Ask the board owner for their share code or invite link. Open the link on Android to launch Trivense, or open the app, tap Join board, and enter the code. Free accounts can join 1 shared board; unlimited sharing requires Premium.",
  },
  {
    q: "When is the app available?",
    a: "Trivense is available on Android via Google Play. Join the waitlist for iOS launch updates and early access invites.",
  },
];
