import type { FeatureKey, SubscriptionPlan } from "@/types";

export type FeatureDefinition = {
  key: FeatureKey;
  name: string;
  description: string;
  suggestedPlan: SubscriptionPlan;
};

export type PlanDefinition = {
  key: SubscriptionPlan;
  label: string;
  description: string;
  features: FeatureKey[];
};

export const featureDefinitions: Record<FeatureKey, FeatureDefinition> = {
  basicCatchLog: {
    key: "basicCatchLog",
    name: "釣果ログ",
    description: "写真、魚種、サイズ、日時、潮や天候データを記録できます。",
    suggestedPlan: "free"
  },
  basicRanking: {
    key: "basicRanking",
    name: "基本ランキング",
    description: "自分の釣果ランキングを振り返れます。",
    suggestedPlan: "free"
  },
  joinTournament: {
    key: "joinTournament",
    name: "大会参加",
    description: "開催中の大会に参加して釣果を投稿できます。",
    suggestedPlan: "free"
  },
  joinGroup: {
    key: "joinGroup",
    name: "グループ参加",
    description: "釣り仲間のグループへ参加できます。",
    suggestedPlan: "free"
  },
  advancedAnalysis: {
    key: "advancedAnalysis",
    name: "詳細分析",
    description: "潮、天候、月齢、魚種ごとの傾向を詳しく振り返れます。",
    suggestedPlan: "premium"
  },
  groupAnalysis: {
    key: "groupAnalysis",
    name: "グループ分析",
    description: "仲間内の釣果を日別・月別・エリア別に分析できます。",
    suggestedPlan: "groupPro"
  },
  tournamentCreate: {
    key: "tournamentCreate",
    name: "大会作成",
    description: "仲間や参加者を集める釣り大会を作成できます。",
    suggestedPlan: "organizer"
  },
  tournamentAdmin: {
    key: "tournamentAdmin",
    name: "大会管理",
    description: "大会釣果の承認、参加者管理、運営向け確認ができます。",
    suggestedPlan: "organizer"
  },
  paidTournament: {
    key: "paidTournament",
    name: "有料大会設定",
    description: "参加費を設定し、支払い確認後に大会投稿できる大会を運営できます。",
    suggestedPlan: "organizer"
  },
  detailedMap: {
    key: "detailedMap",
    name: "詳細マップ",
    description: "グループマップや釣果マップを拡大し、ポイント周辺の状況を詳しく振り返れます。",
    suggestedPlan: "premium"
  },
  csvExport: {
    key: "csvExport",
    name: "CSV出力",
    description: "釣果データをCSVで出力し、表計算や外部分析に活用できます。",
    suggestedPlan: "organizer"
  },
  proxyPost: {
    key: "proxyPost",
    name: "代理投稿",
    description: "グループ管理者がメンバーの釣果を代理で登録できます。",
    suggestedPlan: "groupPro"
  },
  tackleAnalysis: {
    key: "tackleAnalysis",
    name: "タックル分析",
    description: "タックル別に釣果傾向を振り返れます。",
    suggestedPlan: "premium"
  },
  aiReport: {
    key: "aiReport",
    name: "AIレポート",
    description: "釣果データから次の釣行に役立つ振り返りを作成します。Group Proではグループ釣果を母数にした分析も利用できます。",
    suggestedPlan: "premium"
  },
  catchVerification: {
    key: "catchVerification",
    name: "釣果デジタル証明β",
    description: "写真、位置情報、時刻、潮位、大会条件などをもとに釣果の信頼性を参考スコアとして確認できます。",
    suggestedPlan: "organizer"
  },
  privateGroup: {
    key: "privateGroup",
    name: "非公開グループ",
    description: "仲間内だけで釣果を共有するグループを運用できます。",
    suggestedPlan: "groupPro"
  },
  unlimitedGroups: {
    key: "unlimitedGroups",
    name: "グループ数拡張",
    description: "作成・参加できるグループ数を拡張します。",
    suggestedPlan: "groupPro"
  },
  unlimitedTournaments: {
    key: "unlimitedTournaments",
    name: "大会数拡張",
    description: "作成・運営できる大会数を拡張します。",
    suggestedPlan: "organizer"
  },
  plan_premium: {
    key: "plan_premium",
    name: "Premiumプラン",
    description: "個人の分析と振り返りを深めたい方向けの候補プランです。",
    suggestedPlan: "premium"
  },
  plan_organizer: {
    key: "plan_organizer",
    name: "Organizerプラン",
    description: "大会運営やデータ出力を使いたい方向けの候補プランです。",
    suggestedPlan: "organizer"
  },
  plan_groupPro: {
    key: "plan_groupPro",
    name: "Group Proプラン",
    description: "釣り仲間との共有、代理投稿、グループ分析を強化する候補プランです。",
    suggestedPlan: "groupPro"
  }
};

export const planDefinitions: Record<SubscriptionPlan, PlanDefinition> = {
  free: {
    key: "free",
    label: "Free",
    description: "まずは個人ログ、ランキング、グループ・大会参加を試せる基本プランです。",
    features: ["basicCatchLog", "basicRanking", "joinTournament", "joinGroup"]
  },
  premium: {
    key: "premium",
    label: "Premium",
    description: "個人の振り返りと分析を深めたいユーザー向けです。グループ詳細マップの拡大表示も利用できます。",
    features: ["basicCatchLog", "basicRanking", "joinTournament", "joinGroup", "advancedAnalysis", "tackleAnalysis", "detailedMap", "aiReport"]
  },
  organizer: {
    key: "organizer",
    label: "Organizer",
    description: "大会を作成・運営したい主催者向けです。",
    features: ["basicCatchLog", "basicRanking", "joinTournament", "joinGroup", "tournamentCreate", "tournamentAdmin", "paidTournament", "catchVerification", "detailedMap", "csvExport", "unlimitedTournaments"]
  },
  groupPro: {
    key: "groupPro",
    label: "Group Pro",
    description: "日常の釣り仲間コミュニティを運営したい方向けです。グループ分析、グループ母数のAIレポート、代理投稿、詳細マップ拡大をまとめて使えます。",
    features: ["basicCatchLog", "basicRanking", "joinTournament", "joinGroup", "groupAnalysis", "aiReport", "proxyPost", "privateGroup", "detailedMap", "unlimitedGroups"]
  },
  tester: {
    key: "tester",
    label: "Tester",
    description: "検証用にすべての機能を利用できます。",
    features: Object.keys(featureDefinitions) as FeatureKey[]
  }
};

export function getPlanLabel(plan: SubscriptionPlan) {
  return planDefinitions[plan]?.label ?? "Free";
}
