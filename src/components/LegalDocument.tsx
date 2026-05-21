export function LegalDocument({ markdown }: { markdown: string }) {
  return (
    <article className="rounded border border-teal-100 bg-white px-5 py-6 shadow-soft sm:px-8 sm:py-8">
      <div className="space-y-5">
        {markdown.split("\n").map((line, index) => renderLine(line, index))}
      </div>
    </article>
  );
}

function renderLine(line: string, index: number) {
  const value = line.trim();
  if (!value) return null;
  if (value.startsWith("# ")) {
    return (
      <h1 key={index} className="text-3xl font-black leading-tight text-ink sm:text-4xl">
        {value.replace("# ", "")}
      </h1>
    );
  }
  if (value.startsWith("## ")) {
    return (
      <h2 key={index} className="border-t border-teal-100 pt-5 text-xl font-black leading-tight text-water">
        {value.replace("## ", "")}
      </h2>
    );
  }
  if (value.startsWith("### ")) {
    return (
      <h3 key={index} className="rounded bg-foam px-3 py-2 text-base font-black leading-tight text-ink">
        {value.replace("### ", "")}
      </h3>
    );
  }
  if (value.startsWith("- ")) {
    return (
      <p key={index} className="pl-4 text-sm font-bold leading-7 text-slate-700 before:mr-2 before:content-['・']">
        {value.replace("- ", "")}
      </p>
    );
  }
  return (
    <p key={index} className="text-sm leading-7 text-slate-700 sm:text-base sm:leading-8">
      {value}
    </p>
  );
}
