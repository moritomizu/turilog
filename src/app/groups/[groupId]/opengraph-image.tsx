import { ImageResponse } from "next/og";
import { getGroupOgSummary } from "@/lib/metadata";

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: { groupId: string } }) {
  const summary = await getGroupOgSummary(params.groupId).catch(() => null);
  const name = summary?.name ?? "TsuriLogグループ";
  const description = summary?.description ?? "釣り仲間で釣果を共有中";
  const monthCount = summary?.monthCount ?? 0;
  const monthMax = summary?.monthMax ?? 0;
  const topFish = summary?.topFish || "これから";
  const catchCount = summary?.catchCount ?? 0;
  const biggest = summary?.biggest;

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
          padding: 64,
          fontFamily: "sans-serif"
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 30, fontWeight: 900, color: "#0f766e" }}>TsuriLog GROUP</div>
          <div style={{ borderRadius: 999, background: "#f97316", color: "white", padding: "12px 22px", fontSize: 24, fontWeight: 900 }}>
            釣果共有中
          </div>
        </div>

        <div>
          <div style={{ fontSize: 66, fontWeight: 900, lineHeight: 1.05, maxWidth: 980 }}>{name}</div>
          <div style={{ marginTop: 20, fontSize: 27, lineHeight: 1.35, color: "#334155", maxWidth: 980 }}>
            {description.length > 70 ? `${description.slice(0, 70)}...` : description}
          </div>
        </div>

        <div style={{ display: "flex", gap: 18 }}>
          <Stat label="今月の釣果" value={`${monthCount}件`} accent />
          <Stat label="今月最大" value={monthMax ? `${monthMax}cm` : "記録待ち"} />
          <Stat label="最多魚種" value={topFish} />
          <Stat label="総釣果" value={`${catchCount}件`} />
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "#0f766e", fontSize: 24, fontWeight: 900 }}>
          <div>{biggest ? `最大記録: ${biggest.fishType} ${biggest.sizeCm}cm` : "仲間の釣果、ランキング、マップを共有"}</div>
          <div>心に残る一枚のために。</div>
        </div>
      </div>
    ),
    size
  );
}

function Stat({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div
      style={{
        flex: 1,
        borderRadius: 18,
        background: accent ? "#0f766e" : "white",
        color: accent ? "white" : "#17201d",
        padding: "24px 22px",
        boxShadow: "0 14px 32px rgba(15, 118, 110, 0.14)"
      }}
    >
      <div style={{ fontSize: 22, fontWeight: 800, color: accent ? "#dff7f0" : "#64748b" }}>{label}</div>
      <div style={{ marginTop: 8, fontSize: 38, fontWeight: 900, lineHeight: 1.05 }}>{value}</div>
    </div>
  );
}
