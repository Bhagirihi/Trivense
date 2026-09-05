import { ImageResponse } from "next/og";

import { site } from "@/lib/content";

export const alt = `${site.name} — ${site.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          background:
            "linear-gradient(165deg, #000810 0%, #001a2e 35%, #003d66 70%, #002847 100%)",
          color: "#ffffff",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
          }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 18,
              background:
                "linear-gradient(135deg, #c9a227 0%, #e8c547 50%, #b8960c 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#001525",
              fontSize: 36,
              fontWeight: 800,
            }}
          >
            T
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            <div style={{ display: "flex", fontSize: 34, fontWeight: 800 }}>
              {site.name}
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 20,
                color: "rgba(255,255,255,0.7)",
              }}
            >
              Split trip & group expenses
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 18,
          }}
        >
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              fontSize: 64,
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: -1.5,
              maxWidth: 900,
            }}
          >
            <span style={{ display: "flex" }}>Split expenses,&nbsp;</span>
            <span style={{ display: "flex", color: "#e8c547" }}>made easy.</span>
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 26,
              color: "rgba(255,255,255,0.75)",
              maxWidth: 820,
              lineHeight: 1.4,
            }}
          >
            Boards, real-time sync, analytics, and smart budgets — built for
            India and beyond.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: 22,
            color: "rgba(255,255,255,0.65)",
          }}
        >
          <div style={{ display: "flex" }}>Android on Google Play</div>
          <div style={{ display: "flex", color: "#e8c547", fontWeight: 700 }}>
            trivense.vercel.app
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
