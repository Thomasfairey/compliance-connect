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
          background: "transparent",
          position: "relative",
        }}
      >
        {/* Outer ring */}
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: "50%",
            border: "2px solid #0097A7",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "absolute",
          }}
        />
        {/* Inner circle */}
        <div
          style={{
            width: 22,
            height: 22,
            borderRadius: "50%",
            background: "#0097A7",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "absolute",
          }}
        >
          {/* White T */}
          <div
            style={{
              color: "white",
              fontSize: 14,
              fontWeight: 800,
              fontFamily: "sans-serif",
              marginTop: -1,
            }}
          >
            T
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
