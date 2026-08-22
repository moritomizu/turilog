"use client";

import Image from "next/image";
import { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import { logShareEvent } from "@/lib/shareEvents";
import {
  getFormatSize,
  getShareOverlayData,
  getTemplateLabel,
  shareOverlayFormats,
  shareOverlayTemplates,
  type ShareOverlayFormat,
  type ShareOverlayTemplate
} from "@/lib/shareOverlay";
import type { Catch } from "@/types";

type OutputMode = "photo" | "transparent";
const SHARE_LOGO_SRC = "/icons/trlg-logo.png";
const MAX_OVERLAY_TEXT_WIDTH = 900;

export function CatchDataOverlay({
  item,
  userId,
  shareUrl,
  onClose
}: {
  item: Catch;
  userId: string;
  shareUrl: string;
  onClose: () => void;
}) {
  const [template, setTemplate] = useState<ShareOverlayTemplate>("simple");
  const [format, setFormat] = useState<ShareOverlayFormat>("story");
  const [outputMode, setOutputMode] = useState<OutputMode>("photo");
  const [backgroundUrl, setBackgroundUrl] = useState(item.imageUrl ?? "");
  const [downloadUrl, setDownloadUrl] = useState("");
  const [message, setMessage] = useState("プレビューを確認して生成してください。");
  const [busy, setBusy] = useState(false);
  const generatedBlobRef = useRef<Blob | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const overlayData = useMemo(() => getShareOverlayData(item), [item]);
  const selectedFormat = getFormatSize(format);

  useEffect(() => {
    logShareEvent(userId, "share_overlay_selected", {
      template,
      share_type: outputMode,
      catch_proof: overlayData.hasCatchProof,
      locale: "ja"
    });
  }, [outputMode, overlayData.hasCatchProof, template, userId]);

  useEffect(() => {
    return () => {
      if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    };
  }, [downloadUrl]);

  useEffect(() => {
    generatedBlobRef.current = null;
    setDownloadUrl("");
    setMessage("プレビューを確認して生成してください。");
  }, [backgroundUrl, format, outputMode, template]);

  function handleBackgroundFile(file: File | null) {
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    setBackgroundUrl((current) => {
      if (current.startsWith("blob:")) URL.revokeObjectURL(current);
      return objectUrl;
    });
    setMessage("端末の写真を背景に設定しました。");
  }

  async function generateImage() {
    setBusy(true);
    setMessage("画像を生成しています。");
    generatedBlobRef.current = null;
    setDownloadUrl("");
    try {
      const blob = await renderShareOverlayImage({
        item,
        template,
        format,
        outputMode,
        backgroundUrl
      });
      generatedBlobRef.current = blob;
      setDownloadUrl((current) => {
        if (current) URL.revokeObjectURL(current);
        return URL.createObjectURL(blob);
      });
      setMessage(outputMode === "transparent" ? "透明PNGを生成しました。" : "シェア画像を生成しました。");
      await logShareEvent(userId, "share_image_generated", {
        template,
        share_type: outputMode,
        catch_proof: overlayData.hasCatchProof,
        locale: "ja"
      });
    } catch (error) {
      generatedBlobRef.current = null;
      setDownloadUrl("");
      setMessage(error instanceof Error ? error.message : "画像を生成できませんでした。");
    } finally {
      setBusy(false);
    }
  }

  async function shareImage() {
    if (!generatedBlobRef.current) {
      await generateImage();
    }
    const blob = generatedBlobRef.current;
    if (!blob) return;

    const file = new File([blob], `tsurilogue-${item.id}-${template}.png`, { type: "image/png" });
    const canShareFile = typeof navigator !== "undefined" && "canShare" in navigator && navigator.canShare?.({ files: [file] });
    if (canShareFile && navigator.share) {
      const sharePayload: ShareData = {
        title: `${overlayData.fishType} ${overlayData.sizeLabel}`,
        text: "TSURILOGUEで釣果を記録しました。",
        files: [file]
      };
      if (item.isPublic) sharePayload.url = shareUrl;
      await navigator.share(sharePayload);
      setMessage("共有を開始しました。");
      await logShareEvent(userId, "share_completed", {
        template,
        share_type: outputMode,
        catch_proof: overlayData.hasCatchProof,
        locale: "ja"
      });
      return;
    }

    setMessage("この端末では画像共有に対応していないため、画像を保存してSNSへ投稿してください。");
  }

  async function handleSaveClick() {
    await logShareEvent(userId, "share_image_saved", {
      template,
      share_type: outputMode,
      catch_proof: overlayData.hasCatchProof,
      locale: "ja"
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 px-3 py-4 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="share-overlay-title">
      <section className="max-h-[92svh] w-full max-w-5xl overflow-y-auto rounded border border-teal-100 bg-white shadow-soft">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-teal-50 bg-white/95 px-4 py-3 backdrop-blur">
          <div>
            <p className="text-xs font-black text-water">DATA OVERLAY</p>
            <h2 id="share-overlay-title" className="text-xl font-black text-ink">釣果データを重ねる</h2>
          </div>
          <button type="button" onClick={onClose} className="tap-target rounded-full border border-slate-300 bg-white px-3 py-2 text-sm font-black text-slate-600" aria-label="閉じる">
            ×
          </button>
        </div>

        <div className="grid gap-5 p-4 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:p-5">
          <div className="space-y-4">
            <OverlayPreview ref={previewRef} item={item} template={template} format={format} outputMode={outputMode} backgroundUrl={backgroundUrl} />
            <p className="rounded bg-foam p-3 text-xs font-bold leading-5 text-slate-600">
              正確なGPS座標や詳細ポイント名はシェア画像に表示しません。エリア情報のみを使用します。
            </p>
          </div>

          <div className="space-y-5">
            <ControlSection title="テンプレート">
              <div className="grid gap-2 sm:grid-cols-3">
                {shareOverlayTemplates.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => {
                      setTemplate(item.key);
                      logShareEvent(userId, "share_template_selected", { template: item.key, share_type: outputMode, catch_proof: overlayData.hasCatchProof, locale: "ja" });
                    }}
                    className={`rounded border p-3 text-left transition ${template === item.key ? "border-water bg-teal-50 text-water" : "border-slate-200 bg-white text-slate-700"}`}
                  >
                    <p className="text-sm font-black">{item.label}</p>
                    <p className="mt-1 text-xs font-bold leading-5">{item.description}</p>
                  </button>
                ))}
              </div>
            </ControlSection>

            <ControlSection title="サイズ">
              <div className="grid gap-2 sm:grid-cols-3">
                {shareOverlayFormats.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setFormat(item.key)}
                    className={`rounded border px-3 py-2 text-sm font-black ${format === item.key ? "border-water bg-water text-white" : "border-slate-200 bg-white text-slate-700"}`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </ControlSection>

            <ControlSection title="出力">
              <div className="grid gap-2 sm:grid-cols-2">
                <button type="button" onClick={() => setOutputMode("photo")} className={`rounded border px-3 py-3 text-sm font-black ${outputMode === "photo" ? "border-water bg-water text-white" : "border-slate-200 bg-white text-slate-700"}`}>
                  写真つき画像
                </button>
                <button type="button" onClick={() => setOutputMode("transparent")} className={`rounded border px-3 py-3 text-sm font-black ${outputMode === "transparent" ? "border-water bg-water text-white" : "border-slate-200 bg-white text-slate-700"}`}>
                  透明PNG
                </button>
              </div>
            </ControlSection>

            <ControlSection title="背景写真">
              <div className="rounded border border-slate-200 bg-foam p-3">
                <p className="text-xs font-bold leading-5 text-slate-600">標準ではこの釣果に登録された写真を使います。端末内の別写真も背景にできます。</p>
                <label className="tap-target mt-3 inline-flex cursor-pointer rounded bg-white px-4 py-2 text-sm font-black text-water ring-1 ring-teal-100">
                  写真を選ぶ
                  <input type="file" accept="image/*" className="sr-only" onChange={(event) => handleBackgroundFile(event.target.files?.[0] ?? null)} />
                </label>
              </div>
            </ControlSection>

            <div className="rounded border border-teal-100 bg-white p-3">
              <p className="text-sm font-black text-ink">生成サイズ</p>
              <p className="mt-1 text-xs font-bold text-slate-600">{selectedFormat.width} × {selectedFormat.height}px / {getTemplateLabel(template)}</p>
              <p className="mt-2 text-xs font-bold leading-5 text-slate-600">{message}</p>
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
              <button type="button" disabled={busy} onClick={generateImage} className="tap-target rounded bg-water px-4 py-3 text-sm font-black text-white disabled:opacity-60">
                {busy ? "生成中..." : "画像生成"}
              </button>
              <button type="button" disabled={busy} onClick={shareImage} className="tap-target rounded bg-coral px-4 py-3 text-sm font-black text-white disabled:opacity-60">
                共有する
              </button>
              {downloadUrl ? (
                <a href={downloadUrl} download={`tsurilogue-${item.id}-${template}.png`} onClick={handleSaveClick} className="tap-target rounded border border-slate-300 px-4 py-3 text-center text-sm font-black text-ink">
                  保存
                </a>
              ) : (
                <button type="button" disabled className="tap-target rounded border border-slate-200 px-4 py-3 text-sm font-black text-slate-400">
                  保存
                </button>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

const OverlayPreview = forwardRef<HTMLDivElement, { item: Catch; template: ShareOverlayTemplate; format: ShareOverlayFormat; outputMode: OutputMode; backgroundUrl: string }>(function OverlayPreview(
  { item, template, format, outputMode, backgroundUrl },
  ref
) {
  const data = getShareOverlayData(item);
  const sizeParts = splitSizeLabel(data.sizeLabel);
  const aspectClass = format === "story" ? "aspect-[9/16]" : format === "feed" ? "aspect-[4/5]" : "aspect-square";
  const overlayToneClass = "text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.65)]";
  return (
    <div className="mx-auto w-full max-w-[360px]">
      <div ref={ref} className={`relative w-full overflow-hidden rounded shadow-soft ${outputMode === "transparent" ? "bg-transparent" : "bg-slate-900"} ${aspectClass}`}>
        {outputMode === "photo" && backgroundUrl ? (
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url("${escapeCssUrl(getCanvasSafeImageUrl(backgroundUrl))}")` }}
            aria-hidden="true"
          />
        ) : (
          <div data-export-hidden="true" className="absolute inset-0 bg-[linear-gradient(135deg,rgba(15,118,110,0.14),rgba(255,255,255,0.04)),linear-gradient(45deg,#e2e8f0_25%,transparent_25%,transparent_75%,#e2e8f0_75%),linear-gradient(45deg,#e2e8f0_25%,transparent_25%,transparent_75%,#e2e8f0_75%)] bg-[length:100%_100%,24px_24px,24px_24px] bg-[position:0_0,0_0,12px_12px]" />
        )}
        {outputMode === "photo" ? <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/10" /> : null}
        <div className={`absolute inset-x-0 ${template === "catch" ? "bottom-8 px-7" : template === "data" ? "bottom-6 px-5" : "bottom-8 px-6"} ${overlayToneClass}`}>
          <Image
            src={SHARE_LOGO_SRC}
            alt="TSURILOGUE"
            width={1000}
            height={401}
            className="h-auto w-32 object-contain brightness-0 invert"
            unoptimized
          />
          <h3 className={`${template === "catch" ? "mt-3 text-5xl" : "mt-2 text-4xl"} font-black leading-none`}>{data.fishType}</h3>
          <p className="mt-2 flex items-baseline gap-2 leading-none" style={{ fontFamily: '"Helvetica Neue Condensed Bold", "HelveticaNeue-CondensedBold", "Arial Narrow", "Bebas Neue", sans-serif' }}>
            <span className="text-[3.75rem] font-bold tracking-normal">{sizeParts.value}</span>
            <span className="text-xl font-bold tracking-normal">{sizeParts.unit}</span>
          </p>
          <div className="mt-4 grid gap-2 text-xs font-black">
            <span>{data.dateLabel}</span>
            <span>{data.areaLabel}</span>
            {template !== "simple" ? <span>{data.methodLabel}</span> : null}
            {template === "data" ? <span>{[data.tideLabel, data.waterTempLabel, data.weatherLabel].filter(Boolean).join(" / ") || "Data logging"}</span> : null}
            {data.hasCatchProof ? <span className="w-fit rounded-full bg-white/20 px-3 py-1 ring-1 ring-white/30">{data.catchProofLabel}</span> : null}
          </div>
        </div>
      </div>
    </div>
  );
});

function ControlSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-sm font-black text-ink">{title}</h3>
      <div className="mt-2">{children}</div>
    </section>
  );
}

async function renderShareOverlayImage({
  item,
  template,
  format,
  outputMode,
  backgroundUrl
}: {
  item: Catch;
  template: ShareOverlayTemplate;
  format: ShareOverlayFormat;
  outputMode: OutputMode;
  backgroundUrl: string;
}) {
  const size = getFormatSize(format);
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("画像を書き出せませんでした。");

  if (outputMode === "photo") {
    await drawBackground(ctx, backgroundUrl, size.width, size.height);
    drawGradient(ctx, size.width, size.height);
  } else {
    ctx.clearRect(0, 0, size.width, size.height);
  }

  await drawOverlay(ctx, getShareOverlayData(item), template, size.width, size.height, outputMode);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("画像を書き出せませんでした。");
  return blob;
}

async function drawBackground(ctx: CanvasRenderingContext2D, imageUrl: string, width: number, height: number) {
  const image = imageUrl ? await loadImage(imageUrl) : null;
  if (!image) {
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, "#082f49");
    gradient.addColorStop(1, "#0f766e");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    return;
  }
  const scale = Math.max(width / image.width, height / image.height);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  const x = (width - drawWidth) / 2;
  const y = (height - drawHeight) / 2;
  ctx.drawImage(image, x, y, drawWidth, drawHeight);
}

function drawGradient(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const gradient = ctx.createLinearGradient(0, height * 0.38, 0, height);
  gradient.addColorStop(0, "rgba(0,0,0,0.08)");
  gradient.addColorStop(0.52, "rgba(0,0,0,0.34)");
  gradient.addColorStop(1, "rgba(0,0,0,0.86)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

async function drawOverlay(ctx: CanvasRenderingContext2D, data: ReturnType<typeof getShareOverlayData>, template: ShareOverlayTemplate, width: number, height: number, outputMode: OutputMode) {
  const scale = width / 360;
  const left = template === "catch" ? 28 * scale : template === "data" ? 20 * scale : 24 * scale;
  const bottom = template === "data" ? 24 * scale : 32 * scale;
  const safeBottom = height - bottom;
  const color = "#ffffff";
  const subColor = "rgba(255,255,255,0.88)";
  const rows = [
    data.dateLabel,
    data.areaLabel,
    template !== "simple" ? data.methodLabel : "",
    template === "data" ? [data.tideLabel, data.waterTempLabel, data.weatherLabel].filter(Boolean).join(" / ") || "Data logging" : ""
  ].filter(Boolean);
  const proofPillHeight = data.hasCatchProof ? 34 * scale : 0;
  const rowHeight = 18 * scale;
  const rowGap = 8 * scale;
  const rowsHeight = rows.length * rowHeight + Math.max(rows.length - 1, 0) * rowGap + (data.hasCatchProof ? rowGap + proofPillHeight : 0);
  const rowsTopY = safeBottom - rowsHeight + rowHeight * 0.78;
  const sizeY = rowsTopY - 28 * scale;
  const fishY = sizeY - 64 * scale;
  const logoWidth = 128 * scale;
  const logoY = fishY - 84 * scale;

  await drawLogo(ctx, SHARE_LOGO_SRC, left, logoY, logoWidth, outputMode);
  drawText(ctx, data.fishType, left, fishY, template === "catch" ? 48 * scale : 36 * scale, "900", color, 0, MAX_OVERLAY_TEXT_WIDTH);
  drawSizeText(ctx, data.sizeLabel, left, sizeY, 60 * scale, color, MAX_OVERLAY_TEXT_WIDTH);

  rows.forEach((row, index) => {
    drawText(ctx, row, left, rowsTopY + index * (rowHeight + rowGap), 12 * scale, "900", index === 1 ? color : subColor, 0, MAX_OVERLAY_TEXT_WIDTH);
  });

  if (data.hasCatchProof) {
    drawPill(ctx, data.catchProofLabel, left, rowsTopY + rows.length * (rowHeight + rowGap) + 2 * scale, outputMode, scale);
  }
}

async function drawLogo(ctx: CanvasRenderingContext2D, logoUrl: string, x: number, y: number, width: number, outputMode: OutputMode) {
  const image = await loadImage(logoUrl).catch(() => null);
  if (!image) {
    drawText(ctx, "TSURILOGUE", x, y + 52, 38, "900", "#ffffff", 0.2);
    return;
  }

  const height = width * (image.height / image.width);
  const logoCanvas = document.createElement("canvas");
  logoCanvas.width = Math.ceil(width);
  logoCanvas.height = Math.ceil(height);
  const logoCtx = logoCanvas.getContext("2d");
  if (!logoCtx) return;

  logoCtx.drawImage(image, 0, 0, width, height);
  logoCtx.globalCompositeOperation = "source-in";
  logoCtx.fillStyle = "#ffffff";
  logoCtx.fillRect(0, 0, width, height);

  ctx.save();
  if (outputMode === "photo") {
    ctx.shadowColor = "rgba(0,0,0,0.55)";
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 4;
  }
  ctx.drawImage(logoCanvas, x, y, width, height);
  ctx.restore();
}

function drawText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, weight: string, color: string, letterSpacing = 0, maxWidth?: number) {
  ctx.save();
  let fontSize = size;
  ctx.font = `${weight} ${fontSize}px system-ui, -apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif`;
  while (maxWidth && ctx.measureText(text).width > maxWidth && fontSize > 28) {
    fontSize -= 4;
    ctx.font = `${weight} ${fontSize}px system-ui, -apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif`;
  }
  ctx.fillStyle = color;
  ctx.shadowColor = color === "#ffffff" ? "rgba(0,0,0,0.66)" : "rgba(255,255,255,0)";
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 3;
  if (!letterSpacing) {
    ctx.fillText(text, x, y);
  } else {
    let currentX = x;
    for (const char of text) {
      ctx.fillText(char, currentX, y);
      currentX += ctx.measureText(char).width + fontSize * letterSpacing;
    }
  }
  ctx.restore();
}

function drawSizeText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, color: string, maxWidth: number) {
  ctx.save();
  let fontSize = size;
  const sizeParts = splitSizeLabel(text);
  const fontStack = '"Helvetica Neue Condensed Bold", "HelveticaNeue-CondensedBold", "Arial Narrow", "Bebas Neue", sans-serif';
  const unitSize = 60;
  const unitGap = 18;
  ctx.font = `700 ${fontSize}px ${fontStack}`;
  while (ctx.measureText(sizeParts.value).width + unitGap + ctx.measureText(sizeParts.unit).width > maxWidth && fontSize > 42) {
    fontSize -= 4;
    ctx.font = `700 ${fontSize}px ${fontStack}`;
  }
  ctx.fillStyle = color;
  ctx.shadowColor = color === "#ffffff" ? "rgba(0,0,0,0.66)" : "rgba(255,255,255,0)";
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 3;
  const scaledX = x;
  ctx.fillText(sizeParts.value, scaledX, y);
  const numberWidth = ctx.measureText(sizeParts.value).width;
  ctx.font = `700 ${unitSize}px ${fontStack}`;
  ctx.fillText(sizeParts.unit, scaledX + numberWidth + unitGap, y - Math.round(fontSize * 0.06));
  ctx.restore();
}

function splitSizeLabel(label: string) {
  const match = label.trim().match(/^(.+?)\s*(cm|mm|kg|g)$/i);
  if (!match) return { value: label, unit: "" };
  return { value: match[1], unit: match[2] };
}

function drawPill(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, outputMode: OutputMode, scale = 1) {
  ctx.save();
  ctx.font = `900 ${12 * scale}px system-ui, -apple-system, BlinkMacSystemFont, sans-serif`;
  const metrics = ctx.measureText(text);
  const width = Math.min(metrics.width + 24 * scale, 760);
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  roundRect(ctx, x, y - 22 * scale, width, 28 * scale, 14 * scale);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.fillText(text, x + 12 * scale, y);
  ctx.restore();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

async function loadImage(url: string) {
  const safeUrl = getCanvasSafeImageUrl(url);
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    const timeoutId = window.setTimeout(() => {
      reject(new Error("背景写真の読み込みに時間がかかっています。通信状況を確認するか、端末内の写真を背景に選び直してください。"));
    }, 20000);
    if (!safeUrl.startsWith("blob:") && !safeUrl.startsWith("data:")) {
      image.crossOrigin = "anonymous";
      image.referrerPolicy = "no-referrer";
    }
    image.onload = () => {
      window.clearTimeout(timeoutId);
      resolve(image);
    };
    image.onerror = () => {
      window.clearTimeout(timeoutId);
      reject(new Error("背景写真を読み込めませんでした。通信状況を確認するか、端末内の写真を背景に選び直してください。"));
    };
    image.src = safeUrl;
  });
}

function getCanvasSafeImageUrl(url: string) {
  if (!url || url.startsWith("blob:") || url.startsWith("data:") || url.startsWith("/")) return url;
  try {
    const parsedUrl = new URL(url);
    if (typeof window !== "undefined" && parsedUrl.origin === window.location.origin) return url;
    return `/api/share-image?url=${encodeURIComponent(url)}`;
  } catch {
    return url;
  }
}

function escapeCssUrl(url: string) {
  return url.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}
