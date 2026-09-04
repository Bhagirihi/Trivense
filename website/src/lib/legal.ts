import { site } from "./content";

export const legalMeta = {
  lastUpdated: "June 27, 2025",
  company: site.name,
  email: site.supportEmail,
  website: site.url,
};

export const privacySections = [
  {
    title: "Overview",
    body: `${site.name} ("we", "us") operates the ${site.name} mobile application and website at ${site.url}. This policy explains what information we collect, how we use it, and your choices.`,
  },
  {
    title: "Information we collect",
    body: [
      "Account information: email address and display name when you register.",
      "Expense data: boards, expenses, categories, budgets, and invitations you create.",
      "Device information: push notification tokens and basic device metadata for app functionality.",
      "Purchase information: subscription status via Google Play / App Store through RevenueCat (we do not store payment card details).",
      "Advertising data: if you use the free plan, Google AdMob may collect advertising identifiers per Google's policies. See our Advertising Policy at /ads for details.",
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
      "Respond to support requests at " + site.supportEmail + ".",
    ],
  },
  {
    title: "Data storage & security",
    body: `Your data is stored in Supabase (PostgreSQL) with row-level security. Only you and users you invite can access a shared board. We use industry-standard encryption in transit (HTTPS/TLS). You may export your data from the app settings. To delete your account, follow the steps in the Account and data deletion section below.`,
  },
  {
    title: "Third-party services",
    body: [
      "Supabase — authentication and database",
      "RevenueCat — subscription management",
      "Google Play / Apple App Store — in-app purchases",
      "Google AdMob — advertising (free plan). See /ads",
      "Google Sign-In / Google Drive — optional backup",
      "Sentry — crash reporting (when enabled)",
    ],
  },
  {
    title: "Account and data deletion",
    id: "account-deletion",
    body: [
      `To request account deletion, email ${site.supportEmail} from the address linked to your ${site.name} account. Use the subject line "Delete my Trivense account" and include the email you use to sign in.`,
      "We will verify ownership and delete your account within 30 days. You will receive a confirmation email when deletion is complete.",
      "When your account is deleted we remove: your profile (name, email, user ID), expense boards you solely own, expenses and categories on those boards, notification preferences, and authentication records.",
      "Data we may retain: anonymized crash logs and aggregated analytics without personal identifiers; billing records required by Google Play or App Store policies (typically up to 7 years); information we must keep for legal or fraud-prevention purposes.",
      "If you shared boards with others, those boards remain for other members; your name may appear as a former participant until they remove you from the board.",
      "You can export a copy of your data from Settings in the app before requesting deletion.",
    ],
  },
  {
    title: "Your rights",
    body: `You may access, correct, export, or delete your account data as described above or by emailing ${site.supportEmail}. Depending on your region you may have additional rights under GDPR, CCPA, or local law.`,
  },
  {
    title: "Children",
    body: `${site.name} is not directed at children under 13. We do not knowingly collect personal information from children.`,
  },
  {
    title: "Changes",
    body: `We may update this policy. We will post the new date at the top of this page. Continued use after changes means you accept the updated policy.`,
  },
  {
    title: "Contact",
    body: `Questions? Email ${site.supportEmail}.`,
  },
];

export const termsSections = [
  {
    title: "Agreement",
    body: `By using ${site.name} you agree to these Terms of Service. If you do not agree, do not use the app.`,
  },
  {
    title: "Service",
    body: `${site.name} helps individuals and groups track shared expenses. Features may change; we strive to maintain reliable sync and security but do not guarantee uninterrupted service.`,
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
    body: `${site.name}, its branding, and software are owned by us. You retain ownership of expense data you create.`,
  },
  {
    title: "Disclaimer",
    body: `${site.name} is provided "as is" without warranties. We are not a bank or financial advisor. Expense splits are informational; verify amounts independently.`,
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
    body: `Questions about these terms: ${site.supportEmail}.`,
  },
];

export const adsSections = [
  {
    title: "Overview",
    body: `${site.name} is free to start. On the Free plan we show advertising to support development and keep core features available at no cost. Premium subscribers receive an ad-free experience. This Advertising Policy explains what ads you may see, who serves them, and your choices.`,
  },
  {
    title: "Who sees ads",
    body: [
      "Free plan: ads may be shown while you use the app.",
      "Premium (monthly or yearly): no ads — ad-free is included with an active subscription.",
      "New users: during an initial grace period, we may limit certain ad formats so you can explore the app first.",
    ],
  },
  {
    title: "Types of ads",
    body: [
      "Banner ads: small ads shown in select screens such as lists and analytics views.",
      "Interstitial ads: full-screen ads shown occasionally after certain actions (for example, after saving several expenses), subject to frequency limits.",
      "App open ads: may appear when you return to the app, limited to once per day.",
      "Rewarded ads (optional): you may choose to watch a video ad in exchange for temporary ad-free time. These are never required to use core features.",
    ],
  },
  {
    title: "Ad partner",
    body: `Ads are served by Google AdMob (Google LLC). AdMob may use your device's advertising identifier and similar signals to show and measure ads, in line with Google's policies. We do not sell your expense data to advertisers. Ad content is selected by Google and its partners, not by ${site.name}.`,
  },
  {
    title: "Data collected for advertising",
    body: [
      "Device advertising ID (e.g. Google Advertising ID on Android)",
      "IP address and general location (country/region level)",
      "Ad interaction data (impressions, clicks) for billing and measurement",
      "App activity related to ad delivery (not the contents of your expense notes or board names for ad targeting by us)",
    ],
  },
  {
    title: "Your choices",
    body: [
      `Upgrade to Premium for an ad-free experience.`,
      "On Android, you can reset or limit ad personalization in Google Settings → Ads.",
      "You may opt out of personalized ads in your device settings; you may still see non-personalized ads on the Free plan.",
      `Questions or concerns: email ${site.supportEmail}.`,
    ],
  },
  {
    title: "Children",
    body: `${site.name} is not directed at children under 13. We do not knowingly serve ads targeted at children. The app is rated for users 13 and older in app stores.`,
  },
  {
    title: "Changes",
    body: "We may update ad formats, partners, or this policy. Material changes will be reflected on this page with an updated date. Continued use of the Free plan after changes means you accept the updated policy.",
  },
  {
    title: "Related policies",
    body: `For how we handle personal data overall, see our Privacy Policy at ${site.url}/privacy. For subscription billing, see Terms of Service at ${site.url}/terms.`,
  },
  {
    title: "Contact",
    body: `Advertising questions: ${site.supportEmail}.`,
  },
];
