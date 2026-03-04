import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = {
  width: 1200,
  height: 630,
};
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
          justifyContent: "center",
          padding: "56px 72px",
          color: "#ffffff",
          background:
            "radial-gradient(circle at 20% 20%, #2d5bff 0%, #0d1220 55%, #06080f 100%)",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
        }}
      >
        <div
          style={{
            fontSize: 28,
            letterSpacing: 1.2,
            opacity: 0.85,
            textTransform: "uppercase",
          }}
        >
          OldPhotoLive AI
        </div>
        <div
          style={{
            marginTop: 20,
            fontSize: 68,
            fontWeight: 800,
            lineHeight: 1.05,
            maxWidth: 920,
          }}
        >
          Restore. Colorize. Animate.
        </div>
        <div
          style={{
            marginTop: 20,
            fontSize: 30,
            lineHeight: 1.35,
            opacity: 0.9,
            maxWidth: 980,
          }}
        >
          Bring old photos back to life in minutes.
        </div>
      </div>
    ),
    size
  );
}
