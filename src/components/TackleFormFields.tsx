"use client";

import type { TackleInput } from "@/lib/tackles";
import { fishingGenreOptions } from "@/lib/profileOptions";

export function emptyTackleInput(): TackleInput {
  return { name: "", fishingGenre: "", rod: "", reel: "", line: "", leader: "", lure: "", memo: "", isDefault: false };
}

export function TackleFormFields({ value, onChange }: { value: TackleInput; onChange: (value: TackleInput) => void }) {
  return (
    <div className="space-y-3">
      <TextField label="タックルセット名" value={value.name} onChange={(name) => onChange({ ...value, name })} placeholder="例: タイラバ用メイン" required />
      <label className="block">
        <span className="text-sm font-black text-slate-700">釣りジャンル</span>
        <select value={value.fishingGenre ?? ""} onChange={(event) => onChange({ ...value, fishingGenre: event.target.value })} className="mt-2 w-full rounded border border-slate-300 bg-white p-3 text-base font-bold">
          <option value="">未設定</option>
          {fishingGenreOptions.map((genre) => (
            <option key={genre} value={genre}>
              {genre}
            </option>
          ))}
        </select>
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField label="ロッド" value={value.rod ?? ""} onChange={(rod) => onChange({ ...value, rod })} placeholder="例: 6.9ft M" />
        <TextField label="リール" value={value.reel ?? ""} onChange={(reel) => onChange({ ...value, reel })} placeholder="例: 3000HG" />
        <TextField label="ライン" value={value.line ?? ""} onChange={(line) => onChange({ ...value, line })} placeholder="例: PE1.0号" />
        <TextField label="リーダー" value={value.leader ?? ""} onChange={(leader) => onChange({ ...value, leader })} placeholder="例: フロロ20lb" />
      </div>
      <TextField label="ルアー/仕掛け" value={value.lure ?? ""} onChange={(lure) => onChange({ ...value, lure })} placeholder="例: TGベイト / タイラバ80g" />
      <label className="block">
        <span className="text-sm font-black text-slate-700">メモ</span>
        <textarea value={value.memo ?? ""} onChange={(event) => onChange({ ...value, memo: event.target.value })} className="mt-2 min-h-20 w-full rounded border border-slate-300 bg-white p-3 text-base font-bold" placeholder="用途やよく使う状況など" />
      </label>
      <label className="flex items-center gap-3 rounded bg-foam p-3 text-sm font-bold text-slate-700">
        <input type="checkbox" checked={value.isDefault === true} onChange={(event) => onChange({ ...value, isDefault: event.target.checked })} className="h-5 w-5 accent-teal-700" />
        投稿時に使いやすいよう、よく使うタックルとして扱う
      </label>
    </div>
  );
}

function TextField({ label, value, onChange, placeholder, required }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="text-sm font-black text-slate-700">{label}</span>
      <input required={required} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="mt-2 w-full rounded border border-slate-300 bg-white p-3 text-base font-bold" />
    </label>
  );
}
