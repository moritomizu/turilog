type Block =
  | { type: "h1" | "h2" | "h3" | "p" | "li"; text: string; id?: string; highlight?: boolean }
  | { type: "note"; children: Array<{ type: "p" | "li"; text: string }> };

export function LegalDocument({ markdown }: { markdown: string }) {
  const blocks = parseMarkdown(markdown);
  const toc = blocks.filter((block) => block.type === "h2" && Boolean(block.id)) as Array<{ type: "h2"; text: string; id: string }>;

  return (
    <div className="space-y-4">
      {toc.length ? (
        <nav className="rounded border border-teal-100 bg-white p-4 shadow-soft dark:border-slate-700 dark:bg-slate-900">
          <p className="text-sm font-black text-water dark:text-teal-300">目次</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {toc.map((item) => (
              <a key={item.id} href={`#${item.id}`} className="rounded bg-foam px-3 py-2 text-sm font-bold leading-5 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                {item.text}
              </a>
            ))}
          </div>
        </nav>
      ) : null}

      <article className="rounded border border-teal-100 bg-white px-5 py-6 shadow-soft dark:border-slate-700 dark:bg-slate-900 sm:px-8 sm:py-8">
        <div className="space-y-5">{blocks.map((block, index) => renderBlock(block, index))}</div>
      </article>
    </div>
  );
}

function parseMarkdown(markdown: string): Block[] {
  const blocks: Block[] = [];
  const lines = markdown.split("\n");
  let note: Extract<Block, { type: "note" }> | null = null;

  function flushNote() {
    if (note) blocks.push(note);
    note = null;
  }

  for (const line of lines) {
    const value = line.trim();
    if (!value || value === "---") {
      flushNote();
      continue;
    }

    if (value === "【補足説明】") {
      flushNote();
      note = { type: "note", children: [] };
      continue;
    }

    if (value.startsWith("# ")) {
      flushNote();
      blocks.push({ type: "h1", text: value.replace("# ", "") });
    } else if (value.startsWith("## ")) {
      flushNote();
      const text = value.replace("## ", "");
      blocks.push({ type: "h2", text, id: createId(text), highlight: isFisheryProtection(text) });
    } else if (value.startsWith("### ")) {
      if (note) note.children.push({ type: "p", text: value.replace("### ", "") });
      else blocks.push({ type: "h3", text: value.replace("### ", "") });
    } else if (value.startsWith("- ")) {
      if (note) note.children.push({ type: "li", text: value.replace("- ", "") });
      else blocks.push({ type: "li", text: value.replace("- ", "") });
    } else {
      if (note) note.children.push({ type: "p", text: value });
      else blocks.push({ type: "p", text: value });
    }
  }

  flushNote();
  return blocks;
}

function renderBlock(block: Block, index: number) {
  if (block.type === "h1") {
    return (
      <h1 key={index} className="text-3xl font-black leading-tight text-ink dark:text-white sm:text-4xl">
        {block.text}
      </h1>
    );
  }
  if (block.type === "h2") {
    const className = block.highlight
      ? "scroll-mt-20 rounded border border-coral/30 bg-orange-50 px-4 py-4 text-xl font-black leading-tight text-coral dark:border-orange-400/40 dark:bg-orange-950/40 dark:text-orange-200"
      : "scroll-mt-20 border-t border-teal-100 pt-5 text-xl font-black leading-tight text-water dark:border-slate-700 dark:text-teal-300";
    return (
      <h2 key={index} id={block.id} className={className}>
        {block.highlight ? "漁場保護について: " : ""}
        {block.text}
      </h2>
    );
  }
  if (block.type === "h3") {
    return (
      <h3 key={index} className="rounded bg-foam px-3 py-2 text-base font-black leading-tight text-ink dark:bg-slate-800 dark:text-white">
        {block.text}
      </h3>
    );
  }
  if (block.type === "li") {
    return (
      <p key={index} className="pl-4 text-sm font-bold leading-7 text-slate-700 before:mr-2 before:content-['・'] dark:text-slate-200">
        {block.text}
      </p>
    );
  }
  if (block.type === "note") {
    return (
      <aside key={index} className="rounded border border-sky-100 bg-sky-50 p-4 dark:border-sky-700/50 dark:bg-sky-950/40">
        <p className="text-xs font-black text-sky-800 dark:text-sky-200">補足説明</p>
        <div className="mt-2 space-y-2">
          {block.children.map((child, childIndex) =>
            child.type === "li" ? (
              <p key={childIndex} className="pl-4 text-sm font-bold leading-7 text-slate-700 before:mr-2 before:content-['・'] dark:text-slate-200">
                {child.text}
              </p>
            ) : (
              <p key={childIndex} className="text-sm leading-7 text-slate-700 dark:text-slate-200">
                {child.text}
              </p>
            )
          )}
        </div>
      </aside>
    );
  }
  return (
    <p key={index} className="text-sm leading-7 text-slate-700 dark:text-slate-200 sm:text-base sm:leading-8">
      {block.text}
    </p>
  );
}

function createId(text: string) {
  return text
    .replace(/[（）()]/g, "-")
    .replace(/[^\p{L}\p{N}-]+/gu, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function isFisheryProtection(text: string) {
  return text.includes("位置情報保護") || text.includes("漁場保護");
}
