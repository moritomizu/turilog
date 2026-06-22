import type { Metadata } from "next";
import { createPageMetadata, getTournamentMetadata } from "@/lib/metadata";

export async function generateMetadata({ params }: { params: { tournamentId: string } }): Promise<Metadata> {
  const tournament = await getTournamentMetadata(params.tournamentId).catch(() => null);
  return createPageMetadata({
    title: tournament?.title ?? "TSURILOGUE釣り大会",
    description: tournament?.description ?? "期間中の釣果投稿でランキングを競えるTSURILOGUEの釣り大会です。",
    path: `/tournaments/${params.tournamentId}`
  });
}

export default function TournamentDetailLayout({ children }: { children: React.ReactNode }) {
  return children;
}
