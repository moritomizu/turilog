import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#e8f7f3",
          color: "#17201d",
          padding: 72,
          fontFamily: "sans-serif"
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 34, fontWeight: 800, color: "#0f766e" }}>Personal fishing log</div>
          <div style={{ borderRadius: 999, background: "#ff7a59", color: "white", padding: "14px 24px", fontSize: 28, fontWeight: 800 }}>
            TSURILOGUE
          </div>
        </div>
        <div>
          <div style={{ fontSize: 76, fontWeight: 900, lineHeight: 1.08 }}>心に残る一枚を、釣果データで振り返る。</div>
          <div style={{ marginTop: 28, fontSize: 34, lineHeight: 1.45, color: "#334155" }}>
            写真、潮位、水温、天候、タックル、グループ、大会まで。
          </div>
        </div>
        <div style={{ display: "flex", gap: 18, fontSize: 26, fontWeight: 800, color: "#0f766e" }}>
          <span>釣果ログ</span>
          <span>潮位分析</span>
          <span>釣り仲間</span>
          <span>大会ランキング</span>
        </div>
      </div>
    ),
    size
  );
}
