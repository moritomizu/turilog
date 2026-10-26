import Link from "next/link";
import type { MediaClusterKey } from "@/lib/wordpress";

const ctaByCluster: Record<MediaClusterKey, { title: string; description: string }> = {
  catch_log: {
    title: "今日の釣果を、次の釣行へつなげよう。",
    description: "釣果写真、魚種、サイズ、天候やタックルをまとめて記録し、あとから振り返れます。"
  },
  catch_sharing: {
    title: "釣果を記録して、仲間と共有しよう。",
    description: "自分の釣果ログを残しながら、釣り仲間やグループとの情報共有に活用できます。"
  },
  tournament: {
    title: "釣果を記録して、ランキングを楽しもう。",
    description: "釣果投稿をもとに、仲間内のランキングやオンライン釣り大会を楽しめます。"
  },
  tsurilogue: {
    title: "TSURILOGUEで釣果記録を始めよう。",
    description: "釣果写真や釣行条件をスマートフォンから記録し、自分の釣りログとして残せます。"
  }
};

export function MediaCta({ clusterKey }: { clusterKey: MediaClusterKey }) {
  const content = ctaByCluster[clusterKey];
  return (
    <section className="rounded-[2rem] bg-gradient-to-br from-[#0f766e] via-[#0f766e] to-[#0b4f6c] p-6 text-white shadow-2xl shadow-teal-950/20 sm:p-8">
      <p className="text-xs font-black uppercase tracking-[0.24em] text-orange-200">TSURILOGUE</p>
      <h2 className="mt-3 text-2xl font-black leading-tight sm:text-3xl">{content.title}</h2>
      <p className="mt-4 text-sm font-bold leading-7 text-teal-50 sm:text-base">
        {content.description}
      </p>
      <Link href="/ja/signup" className="mt-6 inline-flex rounded-full bg-orange-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-orange-900/20 transition hover:bg-orange-400">
        無料ではじめる
      </Link>
    </section>
  );
}
