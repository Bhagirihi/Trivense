const SUPPORT_EMAIL = "support@trivense.app";
const WEBSITE = "https://trivense.vercel.app";
const APP_NAME = "Trivense";

export const LEGAL_URLS = {
  website: WEBSITE,
  terms: `${WEBSITE}/terms`,
  privacy: `${WEBSITE}/privacy`,
  advertising: `${WEBSITE}/ads`,
};

export const LEGAL_META = {
  lastUpdated: "June 27, 2025",
  company: APP_NAME,
  email: SUPPORT_EMAIL,
  website: WEBSITE,
};

/** Key points shown on mobile — aligned with trivense.vercel.app/terms */
export const TERMS_MAIN_POINTS = [
  "By using Trivense you agree to these Terms of Service.",
  "Trivense helps groups track shared expenses; features may change over time.",
  "You are responsible for your account credentials and all activity on your account.",
  "Premium is billed via Google Play or the App Store; cancel anytime in store settings.",
  "You own the expense data you create; Trivense owns the app and branding.",
  "Trivense is not a bank or financial advisor — splits are informational only.",
  "Governed by the laws of India.",
];

/** Key points shown on mobile — aligned with trivense.vercel.app/privacy */
export const PRIVACY_MAIN_POINTS = [
  "We collect account info, expense data, device tokens, and optional ad/crash data.",
  "Data is stored in Supabase with row-level security — only you and invitees see your boards.",
  "Used to sync boards, process subscriptions, and send alerts you opt into.",
  "Free plan may show Google AdMob ads; Premium subscribers get an ad-free experience.",
  "You can export or delete your data from Settings or by emailing support@trivense.app.",
  "Not directed at children under 13.",
];

/** Full sections for optional deep-dive modal (kept in sync with website/src/lib/legal.ts). */
export const TERMS_SECTIONS = [
  {
    title: "Agreement",
    body: `By using ${APP_NAME} you agree to these Terms of Service. If you do not agree, do not use the app.`,
  },
  {
    title: "Service",
    body: `${APP_NAME} helps individuals and groups track shared expenses. Features may change; we strive to maintain reliable sync and security but do not guarantee uninterrupted service.`,
  },
  {
    title: "Accounts",
    body: "You are responsible for your login credentials and activity on your account. You must provide accurate information and keep your account secure.",
  },
  {
    title: "Subscriptions & billing",
    body: [
      "Premium features require an active subscription via Google Play or the App Store.",
      "Billing is handled by the store provider. Refunds follow store policies.",
      "Prices may vary by region and are shown at purchase time.",
      "You can cancel anytime in your store subscription settings; access continues until the period ends.",
    ],
  },
  {
    title: "Acceptable use",
    body: "Do not misuse the service, attempt unauthorized access, upload unlawful content, or interfere with other users.",
  },
  {
    title: "Intellectual property",
    body: `${APP_NAME}, its branding, and software are owned by us. You retain ownership of expense data you create.`,
  },
  {
    title: "Disclaimer",
    body: `${APP_NAME} is provided "as is" without warranties. We are not a bank or financial advisor. Expense splits are informational; verify amounts independently.`,
  },
  {
    title: "Limitation of liability",
    body: "To the maximum extent permitted by law, we are not liable for indirect or consequential damages arising from use of the service.",
  },
  {
    title: "Governing law",
    body: "These terms are governed by the laws of India, without regard to conflict-of-law principles.",
  },
  {
    title: "Contact",
    body: `Questions about these terms: ${SUPPORT_EMAIL}.`,
  },
];

export const PRIVACY_SECTIONS = [
  {
    title: "Overview",
    body: `${APP_NAME} ("we", "us") operates the ${APP_NAME} mobile application and website at ${WEBSITE}. This policy explains what information we collect, how we use it, and your choices.`,
  },
  {
    title: "Information we collect",
    body: [
      "Account information: email address and display name when you register.",
      "Expense data: boards, expenses, categories, budgets, and invitations you create.",
      "Device information: push notification tokens and basic device metadata for app functionality.",
      "Purchase information: subscription status via Google Play / App Store through RevenueCat (we do not store payment card details).",
      "Advertising data: if you use the free plan, Google AdMob may collect advertising identifiers per Google's policies.",
      "Crash diagnostics: if enabled, anonymized crash reports via Sentry.",
    ],
  },
  {
    title: "How we use information",
    body: [
      "Provide and sync your expense boards across devices.",
      "Authenticate you and enforce row-level security on your data.",
      "Process premium subscriptions and restore purchases.",
      "Send budget alerts and board notifications you opt into.",
      "Show ads to free-tier users and improve app stability.",
      `Respond to support requests at ${SUPPORT_EMAIL}.`,
    ],
  },
  {
    title: "Data storage & security",
    body: "Your data is stored in Supabase (PostgreSQL) with row-level security. Only you and users you invite can access a shared board. We use industry-standard encryption in transit (HTTPS/TLS). You may export your data from the app settings.",
  },
  {
    title: "Third-party services",
    body: [
      "Supabase — authentication and database",
      "RevenueCat — subscription management",
      "Google Play / Apple App Store — in-app purchases",
      "Google AdMob — advertising (free plan)",
      "Google Sign-In / Google Drive — optional backup",
      "Sentry — crash reporting (when enabled)",
    ],
  },
  {
    title: "Account and data deletion",
    body: [
      `To request account deletion, email ${SUPPORT_EMAIL} from the address linked to your ${APP_NAME} account.`,
      "We will verify ownership and delete your account within 30 days.",
      "You can export a copy of your data from Settings before requesting deletion.",
    ],
  },
  {
    title: "Your rights",
    body: `You may access, correct, export, or delete your account data by emailing ${SUPPORT_EMAIL}.`,
  },
  {
    title: "Children",
    body: `${APP_NAME} is not directed at children under 13. We do not knowingly collect personal information from children.`,
  },
  {
    title: "Changes",
    body: "We may update this policy. Continued use after changes means you accept the updated policy.",
  },
  {
    title: "Contact",
    body: `Questions? Email ${SUPPORT_EMAIL}.`,
  },
];
