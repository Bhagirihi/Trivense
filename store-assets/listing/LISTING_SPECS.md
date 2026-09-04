# Trivense — App Store Listing Image System

Complete production specs for Google Play and Apple App Store listing graphics.

**App name:** Trivense: Split expenses, made easy.
**Tagline:** Split expenses, made easy.

## Brand palette

| Token | Hex | Usage |
|-------|-----|-------|
| Primary Navy | `#003D66` | Headers, feature graphic, CTA backgrounds |
| Dark Navy | `#002847` | App icon background, gradient depth |
| Header | `#000000` | Optional high-contrast titles |
| Background | `#FFFFFF` | Cards, clean areas |
| Muted Text | `#888888` | Subheads, captions |
| Gold Accent | `#C9A24E` | Badges, highlights, premium CTAs |

## Global layout rules

- One feature per screenshot; benefit-first copy
- 48px minimum padding (scaled per canvas)
- Headline band ≈19% of canvas height
- Phone mockup centered, 86% canvas width max
- Poppins Bold headlines, Inter Medium subheads
- Never distort logo; 72% fill on icon, 88% on feature graphic

---

## App Icon (512×512)

1. **Title:** App Icon (512×512)
2. **Purpose:** Google Play store icon — primary brand recognition in search and home
3. **Dimensions:** 512 × 512 px PNG, square, no rounded corners
4. **Layout:** Full-bleed Dark Navy (#002847) canvas; logo centered at 72% fill with safe margins
5. **Color palette:** Primary Navy #003D66, Dark Navy #002847, Gold #C9A24E, White #FFFFFF, Muted #888888
6. **Typography:** No text — logo only
7. **Illustration:** Use attached 3D glassmorphism wallet + gold growth arrow logo as-is
8. **Spacing:** 14% safe margin on all sides (logo occupies ~72% of canvas)
9. **UI elements:** Logo mark only on navy background
10. **Headline:** —
11. **Supporting text:** —
12. **CTA:** —
13. **AI prompt:** Premium fintech app icon, dark navy #002847 background, centered glass wallet card with gold upward arrow, 3D glassmorphism, minimal, no text, 512x512, crisp edges, safe margins
14. **Figma notes:** 512×512 frame; logo component locked aspect ratio; export 1x PNG
15. **Developer notes:** Also used as Play Console high-res icon; sync to assets/icon.png via generate-brand-assets.py

**Export path:** `store-assets/listing/app-icon/app_icon_512.png`

---

## Feature Graphic (1024×500)

1. **Title:** Feature Graphic (1024×500)
2. **Purpose:** Play Store banner — first visual above screenshots; drives install intent
3. **Dimensions:** 1024 × 500 px PNG
4. **Layout:** Left: logo + wordmark + tagline + gold CTA pill. Right: phone mockup (dashboard). Bottom: trust pills. Background: navy gradient orbs
5. **Color palette:** Primary Navy #003D66, Dark Navy #002847, Gold #C9A24E, White #FFFFFF, Muted #888888
6. **Typography:** Trivense: Poppins Bold 54px; Tagline: Inter Medium 22px; CTA: Poppins Bold 20px
7. **Illustration:** Subtle team/travel flat accent near phone; gold dot pattern
8. **Spacing:** 44px left margin; CTA 46px below tagline; pills 44px from bottom
9. **UI elements:** Logo, wordmark, tagline, Download Free CTA, phone mockup, trust pills
10. **Headline:** Trivense
11. **Supporting text:** Split expenses, made easy. · Trips · Roommates · Families · Teams
12. **CTA:** Download Free
13. **AI prompt:** Google Play feature graphic 1024x500, premium fintech, navy gradient, Trivense logo left, bold headline Split expenses made easy, gold CTA button, phone mockup right showing expense app, minimal clean whitespace, Splitwise Tricount style
14. **Figma notes:** 1024×500; left text block max 560px; phone frame component right-aligned
15. **Developer notes:** Required for Play Store listing; upload as Feature Graphic

**Export path:** `store-assets/listing/feature-graphic/feature_graphic_1024x500.png`

---

## Phone Screenshot 1 — Split Expenses Easily

1. **Title:** Phone Screenshot 1 — Split Expenses Easily
2. **Purpose:** Play Store screenshot #1 — highlight home feature for ASO conversion
3. **Dimensions:** 1080 × 1920 px (Android); also exported at 1290×2796 (iOS) and 1600×2560 (tablet)
4. **Layout:** Top text block, floating minimalist phone mockup below. Gradient background from light navy to white.
5. **Color palette:** Primary Navy #003D66, Dark Navy #002847, Gold #C9A24E, White #FFFFFF, Muted #888888
6. **Typography:** Headline: Poppins Bold 50–54px; Subhead: Inter Medium 22px; Badge: Inter Medium 15px
7. **Illustration:** Four diverse people collaborating over coins and a rising line graph
8. **Spacing:** 48px edge padding; 64px headline-to-subhead; 19% headline band height
9. **UI elements:** Phone frame, home mock screen, badge pill, gold underline accent
10. **Headline:** Split Expenses Easily
11. **Supporting text:** For groups, travelers, roommates, and more.
12. **CTA:** —
13. **AI prompt:** A premium portrait phone screenshot (1080x1920) for the 'Trivense' app. Large, bold header at the top: 'Split Expenses Easily'. Below it, smaller text: 'For groups, travelers, roommates, and more.' The main area features a clean, white background with a subtle soft blue-to-white gradient at the top. Floating in the center is a modern smartphone mockup showing the main Trivense Home Screen, which displays a balance card ('You are owed ₹1,200') and recent activity. Above and surrounding the phone mockup is a stylized flat illustration of four diverse people happily collaborating over a stack of modern coins and a rising gold line graph. The aesthetic is clean, minimal, and premium, using navy and gold accents. Rounded cards and soft shadows define the UI.
14. **Figma notes:** Auto-layout headline band; component variants for Android/iOS; logo as component; phone frame as component
15. **Developer notes:** Export @1x PNG; no transparency on screenshots; sRGB; optimize with pngquant or Play Console upload

**Export path:** `store-assets/listing/screenshots/android/screenshot_01_split_expenses.png`

---

## Phone Screenshot 2 — Track Every Expense

1. **Title:** Phone Screenshot 2 — Track Every Expense
2. **Purpose:** Play Store screenshot #2 — highlight track feature for ASO conversion
3. **Dimensions:** 1080 × 1920 px (Android); also exported at 1290×2796 (iOS) and 1600×2560 (tablet)
4. **Layout:** Top text block, partial device view showing a complex expense form.
5. **Color palette:** Primary Navy #003D66, Dark Navy #002847, Gold #C9A24E, White #FFFFFF, Muted #888888
6. **Typography:** Headline: Poppins Bold 50–54px; Subhead: Inter Medium 22px; Badge: Inter Medium 15px
7. **Illustration:** Close-up hands holding a phone with floating category icons (Coffee, Taxi, Groceries)
8. **Spacing:** 48px edge padding; 64px headline-to-subhead; 19% headline band height
9. **UI elements:** Phone frame, track mock screen, badge pill, gold underline accent
10. **Headline:** Track Every Expense
11. **Supporting text:** Fast entry, detailed notes, and instant categories.
12. **CTA:** —
13. **AI prompt:** A premium portrait phone screenshot (1080x1920) for the 'Trivense' app. Large, bold header: 'Track Every Expense'. Smaller text: 'Fast entry, detailed notes, and instant categories.' The phone mockup below shows a complex 'New Expense' screen with rounded input fields for Amount, Date, Category (represented by simple outline icons), Notes, and Payer. The UI uses light navy, white, and a touch of gold. Surrounding the phone mockup is a close-up flat illustration of stylized hands holding a mobile device, with various floating category icons (like a coffee cup, a taxi, and a shopping cart) swirling above it, emphasizing the speed and detail. Minimalist and clean.
14. **Figma notes:** Auto-layout headline band; component variants for Android/iOS; logo as component; phone frame as component
15. **Developer notes:** Export @1x PNG; no transparency on screenshots; sRGB; optimize with pngquant or Play Console upload

**Export path:** `store-assets/listing/screenshots/android/screenshot_02_track_expenses.png`

---

## Phone Screenshot 3 — Create Boards

1. **Title:** Phone Screenshot 3 — Create Boards
2. **Purpose:** Play Store screenshot #3 — highlight boards feature for ASO conversion
3. **Dimensions:** 1080 × 1920 px (Android); also exported at 1290×2796 (iOS) and 1600×2560 (tablet)
4. **Layout:** Left-aligned text block, large diagonal grid of phone screens showcasing board lists.
5. **Color palette:** Primary Navy #003D66, Dark Navy #002847, Gold #C9A24E, White #FFFFFF, Muted #888888
6. **Typography:** Headline: Poppins Bold 50–54px; Subhead: Inter Medium 22px; Badge: Inter Medium 15px
7. **Illustration:** Small icons next to board names (Airplane, House, Gear/Team)
8. **Spacing:** 48px edge padding; 64px headline-to-subhead; 19% headline band height
9. **UI elements:** Phone frame, boards mock screen, badge pill, gold underline accent
10. **Headline:** Create Boards
11. **Supporting text:** Organize spending by Trip, Household, or Project.
12. **CTA:** —
13. **AI prompt:** A premium portrait phone screenshot (1080x1920) for the 'Trivense' app. Large, bold header: 'Create Boards'. Smaller text: 'Organize spending by Trip, Household, or Project.' The main area features multiple overlapping phone mockups in a slight diagonal grid. These phone screens each display a list of rounded 'Board' cards, showcasing examples like 'Summer Goa Trip', '9th Street Apartment', and 'Team Project'. The board list uses clear icons (airplane, house, gear) and minimal text. The background is white with subtle depth and clean navy and gold accents. The overall look is clean, efficient, and sophisticated.
14. **Figma notes:** Auto-layout headline band; component variants for Android/iOS; logo as component; phone frame as component
15. **Developer notes:** Export @1x PNG; no transparency on screenshots; sRGB; optimize with pngquant or Play Console upload

**Export path:** `store-assets/listing/screenshots/android/screenshot_03_create_boards.png`

---

## Phone Screenshot 4 — Budgets & Alerts

1. **Title:** Phone Screenshot 4 — Budgets & Alerts
2. **Purpose:** Play Store screenshot #4 — highlight budget feature for ASO conversion
3. **Dimensions:** 1080 × 1920 px (Android); also exported at 1290×2796 (iOS) and 1600×2560 (tablet)
4. **Layout:** Center-aligned text block, large single device showing budget status with notification overlay.
5. **Color palette:** Primary Navy #003D66, Dark Navy #002847, Gold #C9A24E, White #FFFFFF, Muted #888888
6. **Typography:** Headline: Poppins Bold 50–54px; Subhead: Inter Medium 22px; Badge: Inter Medium 15px
7. **Illustration:** Money bag with security lock and exclamation notification rising above it
8. **Spacing:** 48px edge padding; 64px headline-to-subhead; 19% headline band height
9. **UI elements:** Phone frame, budget mock screen, badge pill, gold underline accent
10. **Headline:** Budgets & Alerts
11. **Supporting text:** Set spending limits and receive instant notifications.
12. **CTA:** —
13. **AI prompt:** A premium portrait phone screenshot (1080x1920) for the 'Trivense' app. Large, bold header: 'Budgets & Alerts'. Smaller text: 'Set spending limits and receive instant notifications.' The phone mockup below shows a specific 'Board Budget' screen. The main feature is a clear horizontal progress bar indicating ₹15,000 out of ₹20,000 spent, rendered in white, navy, and accented in gold. Overlaid on the screen is a clean, rounded notification card with an exclamation icon that reads 'Budget Alert: 75% Spent'. The surrounding area features a stylized flat illustration of a secure money bag with a shield and a small floating notification bell. The lighting and design are sophisticated and clean.
14. **Figma notes:** Auto-layout headline band; component variants for Android/iOS; logo as component; phone frame as component
15. **Developer notes:** Export @1x PNG; no transparency on screenshots; sRGB; optimize with pngquant or Play Console upload

**Export path:** `store-assets/listing/screenshots/android/screenshot_04_budgets_alerts.png`

---

## Phone Screenshot 5 — Real-time Sync

1. **Title:** Phone Screenshot 5 — Real-time Sync
2. **Purpose:** Play Store screenshot #5 — highlight sync feature for ASO conversion
3. **Dimensions:** 1080 × 1920 px (Android); also exported at 1290×2796 (iOS) and 1600×2560 (tablet)
4. **Layout:** Symmetrical layout with two interconnected devices and cloud icon between them.
5. **Color palette:** Primary Navy #003D66, Dark Navy #002847, Gold #C9A24E, White #FFFFFF, Muted #888888
6. **Typography:** Headline: Poppins Bold 50–54px; Subhead: Inter Medium 22px; Badge: Inter Medium 15px
7. **Illustration:** Cloud icon connecting two phones with upward arrows and gold data particles
8. **Spacing:** 48px edge padding; 64px headline-to-subhead; 19% headline band height
9. **UI elements:** Phone frame, sync mock screen, badge pill, gold underline accent
10. **Headline:** Real-time Sync
11. **Supporting text:** Instant updates across all your group's devices.
12. **CTA:** —
13. **AI prompt:** A premium portrait phone screenshot (1080x1920) for the 'Trivense' app. Large, bold header: 'Real-time Sync'. Smaller text: 'Instant updates across all your group's devices.' Two minimalist smartphone mockups are shown floating side-by-side. Both devices display identical screens with matching recent activity feeds, emphasizing immediate, seamless updating (e.g., the exact same 'Grocery bill added' entry is visible). A subtle cloud icon is positioned between the two phones, connecting them with subtle golden data streams and upward-pointing arrows, symbolizing live syncing. The overall design is clean, using deep navy, white, and a polished metallic gold accent.
14. **Figma notes:** Auto-layout headline band; component variants for Android/iOS; logo as component; phone frame as component
15. **Developer notes:** Export @1x PNG; no transparency on screenshots; sRGB; optimize with pngquant or Play Console upload

**Export path:** `store-assets/listing/screenshots/android/screenshot_05_realtime_sync.png`

---

## Phone Screenshot 6 — Analytics

1. **Title:** Phone Screenshot 6 — Analytics
2. **Purpose:** Play Store screenshot #6 — highlight analytics feature for ASO conversion
3. **Dimensions:** 1080 × 1920 px (Android); also exported at 1290×2796 (iOS) and 1600×2560 (tablet)
4. **Layout:** Top text, large phone mockup dedicated to data visualization.
5. **Color palette:** Primary Navy #003D66, Dark Navy #002847, Gold #C9A24E, White #FFFFFF, Muted #888888
6. **Typography:** Headline: Poppins Bold 50–54px; Subhead: Inter Medium 22px; Badge: Inter Medium 15px
7. **Illustration:** Abstract flat charts and graphs floating around the phone with gold upward arrow
8. **Spacing:** 48px edge padding; 64px headline-to-subhead; 19% headline band height
9. **UI elements:** Phone frame, analytics mock screen, badge pill, gold underline accent
10. **Headline:** Analytics
11. **Supporting text:** Detailed spending charts and deep category breakdown.
12. **CTA:** —
13. **AI prompt:** A premium portrait phone screenshot (1080x1920) for the 'Trivense' app. Large, bold header: 'Analytics'. Smaller text: 'Detailed spending charts and deep category breakdown.' The phone mockup below is focused on a data visualization dashboard screen. It features a sophisticated, clean pie chart (using navy and white, with gold highlighting key segments) and a minimal bar graph. The screen clearly shows spending categories and trends. Surrounding the phone is a sophisticated flat illustration of abstract, interlocking charts, graphs, and financial data points, all colored in navy and gold. The overall feeling is professional, intelligent, and trustworthy.
14. **Figma notes:** Auto-layout headline band; component variants for Android/iOS; logo as component; phone frame as component
15. **Developer notes:** Export @1x PNG; no transparency on screenshots; sRGB; optimize with pngquant or Play Console upload

**Export path:** `store-assets/listing/screenshots/android/screenshot_06_analytics.png`

---

## Phone Screenshot 7 — Who Owes Whom

1. **Title:** Phone Screenshot 7 — Who Owes Whom
2. **Purpose:** Play Store screenshot #7 — highlight settlements feature for ASO conversion
3. **Dimensions:** 1080 × 1920 px (Android); also exported at 1290×2796 (iOS) and 1600×2560 (tablet)
4. **Layout:** Center-aligned text block, large single device showing a settlement list.
5. **Color palette:** Primary Navy #003D66, Dark Navy #002847, Gold #C9A24E, White #FFFFFF, Muted #888888
6. **Typography:** Headline: Poppins Bold 50–54px; Subhead: Inter Medium 22px; Badge: Inter Medium 15px
7. **Illustration:** Two people shaking hands with simplified arrow and INR currency flow between them
8. **Spacing:** 48px edge padding; 64px headline-to-subhead; 19% headline band height
9. **UI elements:** Phone frame, settlements mock screen, badge pill, gold underline accent
10. **Headline:** Who Owes Whom
11. **Supporting text:** Simplified debt resolution and effortless payments.
12. **CTA:** —
13. **AI prompt:** A premium portrait phone screenshot (1080x1920) for the 'Trivense' app. Large, bold header: 'Who Owes Whom'. Smaller text: 'Simplified debt resolution and effortless payments.' The phone mockup below shows a clean 'Settlements' screen. The screen displays a clear list of rounded cards with user names and profile icons, indicating who owes money. Example entries include 'Sarah owes you ₹850' with green text, and 'You owe Raj ₹1,200' with navy text. The surrounding background features a clean flat illustration of two stylized people reaching an agreement, with a sophisticated arrow and currency flow (showing the INR symbol) between them, rendered in navy and a soft gold. The lighting is bright and clean.
14. **Figma notes:** Auto-layout headline band; component variants for Android/iOS; logo as component; phone frame as component
15. **Developer notes:** Export @1x PNG; no transparency on screenshots; sRGB; optimize with pngquant or Play Console upload

**Export path:** `store-assets/listing/screenshots/android/screenshot_07_who_owes_whom.png`

---

## Phone Screenshot 8 — Premium Features

1. **Title:** Phone Screenshot 8 — Premium Features
2. **Purpose:** Play Store screenshot #8 — highlight premium feature for ASO conversion
3. **Dimensions:** 1080 × 1920 px (Android); also exported at 1290×2796 (iOS) and 1600×2560 (tablet)
4. **Layout:** Top 19% navy gradient headline band with badge + headline + subhead + flat illustration. Center: phone mockup with premium UI
5. **Color palette:** Primary Navy #003D66, Dark Navy #002847, Gold #C9A24E, White #FFFFFF, Muted #888888
6. **Typography:** Headline: Poppins Bold 50–54px; Subhead: Inter Medium 22px; Badge: Inter Medium 15px
7. **Illustration:** Flat premium accent top-right in headline band
8. **Spacing:** 48px edge padding; 64px headline-to-subhead; 19% headline band height
9. **UI elements:** Phone frame, premium mock screen, badge pill, gold underline accent
10. **Headline:** Premium Features
11. **Supporting text:** Unlimited categories, export, and backup
12. **CTA:** —
13. **AI prompt:** App store screenshot 1080x1920, premium minimal fintech, navy header, bold headline Premium Features, subhead Unlimited categories export and backup, phone mockup showing expense app premium, white cream background, gold accents, lots of whitespace
14. **Figma notes:** Auto-layout headline band; component variants for Android/iOS; logo as component; phone frame as component
15. **Developer notes:** Export @1x PNG; no transparency on screenshots; sRGB; optimize with pngquant or Play Console upload

**Export path:** `store-assets/listing/screenshots/android/screenshot_08_premium.png`
