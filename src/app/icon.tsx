import { ImageResponse } from "next/og";

export const size = {
  width: 32,
  height: 32,
};
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "white",
        }}
      >
        {/* Outer ring */}
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            border: "2px solid #0097A7",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Inner teal circle */}
          <div
            style={{
              width: 20,
              height: 20,
              borderRadius: "50%",
              background: "#0097A7",
              position: "absolute",
            }}
          />
          {/* White T crossbar */}
          <div
            style={{
              width: 14,
              height: 4,
              background: "white",
              position: "absolute",
              top: 6,
            }}
          />
          {/* White T stem - extends through bottom to white ring */}
          <div
            style={{
              width: 4,
              height: 18,
              background: "white",
              position: "absolute",
              top: 6,
            }}
          />
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
