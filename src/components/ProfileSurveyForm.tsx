"use client";

import type { AgeRange, FishingFrequency, FishingMotivation, UserProfile } from "@/types";
import {
  ageRangeOptions,
  appPurposeOptions,
  fishingAreaOptions,
  fishingFrequencyOptions,
  fishingGenreOptions,
  fishingMotivationOptions,
  fishingStyleOptions,
  residenceAreaOptions
} from "@/lib/profileOptions";

export type ProfileSurveyState = {
  displayName: string;
  avatarUrl: string;
  ageRange: AgeRange;
  residenceArea: string;
  fishingAreas: string[];
  fishingGenres: string[];
  fishingFrequency: FishingFrequency | "";
  fishingStyle: string;
  appPurposes: string[];
  fishingMotivation: FishingMotivation | "";
};

export function initialProfileSurveyState(profile?: UserProfile | null, fallbackName = ""): ProfileSurveyState {
  return {
    displayName: profile?.displayName || fallbackName,
    avatarUrl: profile?.avatarUrl ?? "",
    ageRange: profile?.ageRange ?? "preferNotToSay",
    residenceArea: profile?.residenceArea || "回答しない",
    fishingAreas: profile?.fishingAreas ?? [],
    fishingGenres: profile?.fishingGenres ?? [],
    fishingFrequency: profile?.fishingFrequency ?? "",
    fishingStyle: profile?.fishingStyle ?? "",
    appPurposes: profile?.appPurposes ?? [],
    fishingMotivation: profile?.fishingMotivation ?? ""
  };
}

export function toProfilePayload(state: ProfileSurveyState) {
  return {
    displayName: state.displayName.trim(),
    avatarUrl: state.avatarUrl,
    ageRange: state.ageRange || undefined,
    residenceArea: state.residenceArea,
    fishingAreas: state.fishingAreas,
    fishingGenres: state.fishingGenres,
    fishingFrequency: state.fishingFrequency || undefined,
    fishingStyle: state.fishingStyle,
    appPurposes: state.appPurposes,
    fishingMotivation: state.fishingMotivation || undefined
  };
}

export function ProfileStepBasic({ state, setState }: { state: ProfileSurveyState; setState: (state: ProfileSurveyState) => void }) {
  return (
    <div className="space-y-4">
      <TextField label="表示名" value={state.displayName} onChange={(displayName) => setState({ ...state, displayName })} placeholder="例: TaPiYoTa" />
      <SelectField label="年代" value={state.ageRange} onChange={(ageRange) => setState({ ...state, ageRange: ageRange as AgeRange })} options={ageRangeOptions.map((item) => ({ value: item.value, label: item.label }))} />
      <SelectField label="居住エリア" value={state.residenceArea} onChange={(residenceArea) => setState({ ...state, residenceArea })} options={residenceAreaOptions.map((value) => ({ value, label: value }))} />
    </div>
  );
}

export function ProfileStepStyle({ state, setState }: { state: ProfileSurveyState; setState: (state: ProfileSurveyState) => void }) {
  return (
    <div className="space-y-5">
      <ChipGroup label="よく行く釣行エリア" values={fishingAreaOptions} selected={state.fishingAreas} onChange={(fishingAreas) => setState({ ...state, fishingAreas })} />
      <ChipGroup label="主な釣りジャンル" values={fishingGenreOptions} selected={state.fishingGenres} onChange={(fishingGenres) => setState({ ...state, fishingGenres })} />
      <SelectField label="釣行頻度" value={state.fishingFrequency} onChange={(fishingFrequency) => setState({ ...state, fishingFrequency: fishingFrequency as FishingFrequency | "" })} options={[{ value: "", label: "選択してください" }, ...fishingFrequencyOptions.map((item) => ({ value: item.value, label: item.label }))]} />
      <SelectField label="主な釣行スタイル" value={state.fishingStyle} onChange={(fishingStyle) => setState({ ...state, fishingStyle })} options={[{ value: "", label: "選択してください" }, ...fishingStyleOptions.map((value) => ({ value, label: value }))]} />
    </div>
  );
}

export function ProfileStepMotivation({ state, setState }: { state: ProfileSurveyState; setState: (state: ProfileSurveyState) => void }) {
  return (
    <div className="space-y-5">
      <ChipGroup label="このアプリでやりたいこと" values={appPurposeOptions} selected={state.appPurposes} onChange={(appPurposes) => setState({ ...state, appPurposes })} />
      <SelectField label="釣りへの熱量" value={state.fishingMotivation} onChange={(fishingMotivation) => setState({ ...state, fishingMotivation: fishingMotivation as FishingMotivation | "" })} options={[{ value: "", label: "選択してください" }, ...fishingMotivationOptions.map((item) => ({ value: item.value, label: item.label }))]} />
    </div>
  );
}

function TextField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <label className="block">
      <span className="text-sm font-black text-slate-700">{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="mt-2 w-full rounded border border-slate-300 bg-white p-3 text-base font-bold" />
    </label>
  );
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: { value: string; label: string }[] }) {
  return (
    <label className="block">
      <span className="text-sm font-black text-slate-700">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded border border-slate-300 bg-white p-3 text-base font-bold">
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function ChipGroup({ label, values, selected, onChange }: { label: string; values: string[]; selected: string[]; onChange: (values: string[]) => void }) {
  function toggle(value: string) {
    onChange(selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value]);
  }

  return (
    <section>
      <p className="text-sm font-black text-slate-700">{label}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {values.map((value) => (
          <button
            type="button"
            key={value}
            onClick={() => toggle(value)}
            className={`tap-target rounded-full border px-4 py-2 text-sm font-black ${selected.includes(value) ? "border-water bg-water text-white" : "border-teal-100 bg-foam text-ink"}`}
          >
            {value}
          </button>
        ))}
      </div>
    </section>
  );
}
