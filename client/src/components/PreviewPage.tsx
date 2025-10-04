import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { generateQrCodeUtil } from "@/lib/utils";
import { removeBackground } from "@/lib/removeBG";

interface ImageEditState {
  previewUrl: string | null;
  imagePosition: { x: number; y: number };
  imageScale: number;
  contrast: number;
  brightness: number;
  fitScale: number;
  textBoxes: { id: number; x: number; y: number; text: string }[];
  didInit: boolean;
}

type Props = {
  onContinue: () => void;
  onBack: () => void;
  imageEditState: ImageEditState;
  setImageEditState: React.Dispatch<React.SetStateAction<ImageEditState>>;
  selectedImage: File | null;
  onImageSelect: (file: File | null) => void;
  previewQR: string;
  setPreviewQR: (v: string) => void;
};

export default function PreviewPage({
  onContinue,
  onBack,
  imageEditState,
  setImageEditState,
  selectedImage,
  onImageSelect,
  previewQR,
  setPreviewQR,
}: Props) {
  const [isProcessing, setIsProcessing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { previewUrl, imagePosition, imageScale, fitScale } = imageEditState;
  const brightness = imageEditState.brightness ?? 0;
  const contrast = imageEditState.contrast ?? 0;

  const updateState = (updates: Partial<ImageEditState>) => {
    setImageEditState({ ...imageEditState, ...updates });
  };

  const debounceRef = useRef<number | undefined>(undefined);
  const scheduleRecompute = () => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(recompute, 150);
  };

  // 单一职责：只根据“前一页记录下来的参数”+ 当前预览图，导出套用滤镜后的 PNG
  // 不重新实现前页任何逻辑（拖拽/缩放/文字等），只消费参数并输出 File

  type ExportWithFiltersOpts = {
    container: HTMLDivElement | null; // 前一页的画布容器（用于取导出尺寸）
    imagePosition: { x: number; y: number }; // 前一页记录的平移
    imageScale: number; // 前一页记录的缩放
    contrast: number | number[]; // 预览页的对比度（可传单值或 [value]）
    brightness: number | number[]; // 预览页的亮度（可传单值或 [value]）
  };

  /**
   * Export Cropped PNG with Filter
   * 只使用传入的参数与 previewUrl；返回套用 contrast/brightness 后的 PNG File
   */
  // 直接替换你刚刚改过的函数（保留单一参数签名，不改调用处）
  // 用「前一页已导出的 File」直接套滤镜并导出（不重做前页逻辑）
  async function exportPngWithFiltersFromFile(
    inputFile: File,
    contrastVal: number,
    brightnessVal: number,
  ): Promise<File> {
    const c = contrastVal ?? 0;
    const b = brightnessVal ?? 0;

    const blobUrl = URL.createObjectURL(inputFile);
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const w = img.naturalWidth || 1;
        const h = img.naturalHeight || 1;

        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("No 2D context"));
          return;
        }

        ctx.filter = `contrast(${100 + c}%) brightness(${100 + b}%)`;
        ctx.drawImage(img, 0, 0, w, h);

        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error("toBlob failed"));
            return;
          }
          resolve(new File([blob], "filtered.png", { type: "image/png" }));
          URL.revokeObjectURL(blobUrl);
        }, "image/png");
      };
      img.onerror = () => {
        reject(new Error("Image load error"));
        URL.revokeObjectURL(blobUrl);
      };
      img.src = blobUrl;
    });
  }

  const recompute = async () => {
    if (!previewUrl) return;
    const file = selectedImage
      ? await exportPngWithFiltersFromFile(selectedImage, contrast, brightness)
      : null;
    if (!file) return;

    const base64Image = await generateQrCodeUtil("https://instagram.com", file);
    setPreviewQR(base64Image);
  };

  const handleRemoveBackground = async () => {
    if (!previewUrl) return;

    // 先同步開一個空白頁，避免被瀏覽器阻擋（保留原本行為）
    const w = window.open("", "_blank");
    if (!w) {
      console.warn("Popup blocked: please allow pop-ups for this site.");
      return;
    }
    // 先放暫時畫面
    w.document.write(`
      <!doctype html><html><head><meta charset="utf-8" />
      <title>Before / After</title>
      <style>
        html,body{height:100%;margin:0;background:#111;color:#eee;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial}
        .wrap{min-height:100%;display:flex;flex-direction:column;gap:16px;align-items:center;justify-content:center;padding:24px;box-sizing:border-box}
        .row{display:flex;gap:24px;flex-wrap:wrap;align-items:center;justify-content:center}
        .card{background:#1a1a1a;border:1px solid #ffffff22;border-radius:12px;padding:12px}
        .title{opacity:.85;margin-bottom:8px;text-align:center}
        img{max-width:42vw;max-height:75vh;object-fit:contain;background:transparent;border-radius:8px;display:block}
      </style></head>
      <body>
        <div class="wrap">
          <div id="status">Processing…</div>
        </div>
      </body></html>
    `);
    w.document.close();

    setIsProcessing(true);
    try {
      // 1) 產生「去背前」的輸入檔（套用目前的對比/亮度）
      const file = selectedImage
        ? await exportPngWithFiltersFromFile(
            selectedImage,
            contrast,
            brightness,
          )
        : null;
      if (!file) throw new Error("No input file for removeBackground");

      // 1.1) 把「去背前」讀成 data URL，確保跨視窗可顯示
      const beforeDataUrl: string = await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result as string);
        r.onerror = () => reject(new Error("readAsDataURL failed"));
        r.readAsDataURL(file);
      });

      // 2) 去背（保持你現有流程）
      const resultUrl = await removeBackground(file);

      // 將回傳標準化成可 <img src> 的 URL（支援 data/base64 或 http(s)）
      const afterUrl = /^data:|^blob:|^https?:/.test(resultUrl)
        ? resultUrl
        : `data:image/png;base64,${resultUrl}`;

      // 3) 把「去背前/去背後」一起寫進剛剛開的視窗
      w.document.open();
      w.document.write(`
        <!doctype html><html><head><meta charset="utf-8" />
        <title>Before / After</title>
        <style>
          html,body{height:100%;margin:0;background:#111;color:#eee;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial}
          .wrap{min-height:100%;display:flex;flex-direction:column;gap:16px;align-items:center;justify-content:center;padding:24px;box-sizing:border-box}
          .row{display:flex;gap:24px;flex-wrap:wrap;align-items:center;justify-content:center}
          .card{background:#1a1a1a;border:1px solid #ffffff22;border-radius:12px;padding:12px}
          .title{opacity:.85;margin-bottom:8px;text-align:center}
          img{max-width:42vw;max-height:75vh;object-fit:contain;background:transparent;border-radius:8px;display:block}
        </style></head>
        <body>
          <div class="wrap">
            <div class="row">
              <div class="card">
                <div class="title">Before (input to removeBackground)</div>
                <img src="${beforeDataUrl}" alt="Before" />
              </div>
              <div class="card">
                <div class="title">After (removed background)</div>
                <img src="${afterUrl}" alt="After" />
              </div>
            </div>
          </div>
        </body></html>
      `);
      w.document.close();

      // 4) 後續維持你原本流程：把去背後結果轉成 File → 產生 QR → 更新父層
      const blob = await fetch(afterUrl).then((res) => res.blob());
      const bgRemovedFile = new File([blob], "removed-bg.png", {
        type: "image/png",
      });

      const qrImage = await generateQrCodeUtil(
        "https://instagram.com",
        bgRemovedFile,
      );
      onImageSelect(bgRemovedFile);
      setPreviewQR(qrImage);
    } catch (e) {
      console.error("Remove Background preview failed:", e);
      w.document.open();
      w.document.write(
        `<pre style="color:#eee;background:#111;padding:16px;white-space:pre-wrap;">${String(e)}</pre>`,
      );
      w.document.close();
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-6">
      <button
        onClick={onBack}
        className="mb-6 text-white/80 hover:text-white transition-colors"
        data-testid="button-back"
      >
        ← Back
      </button>

      {/* 去掉外层多余边框：border-0 */}
      <Card className="p-5 bg-white/10 backdrop-blur-sm border-0">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-white text-center">
            Preview
          </h2>

          <div className="aspect-square w-64 mx-auto overflow-hidden rounded-lg border-2 border-dashed border-white/30 relative bg-white/5">
            {previewQR ? (
              <img
                src={previewQR}
                alt="Preview QR"
                className="absolute inset-0 w-full h-full object-contain"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-white/60 text-sm">
                No preview yet
              </div>
            )}
          </div>

          {/* Brightness Slider */}
          <div className="space-y-2 mb-4">
            <Label className="text-white/80 text-sm">Brightness</Label>
            <Slider
              value={[brightness]}
              onValueChange={(value: number[]) => {
                updateState({ brightness: value[0] ?? 0 });
                scheduleRecompute();
              }}
              min={-100}
              max={100}
              step={10}
              className="w-full"
              data-testid="slider-brightness"
            />
            <div className="text-center text-white/60 text-xs">
              {brightness > 0 ? "+" : ""}
              {brightness}
            </div>
          </div>

          {/* Contrast Slider */}
          <div className="space-y-2 mb-4">
            <Label className="text-white/80 text-sm">Contrast</Label>
            <Slider
              value={[contrast]}
              onValueChange={(value: number[]) => {
                updateState({ contrast: value[0] ?? 0 });
                scheduleRecompute();
              }}
              min={-100}
              max={100}
              step={10}
              className="w-full"
              data-testid="slider-contrast"
            />
            <div className="text-center text-white/60 text-xs">
              {contrast > 0 ? "+" : ""}
              {contrast}
            </div>
          </div>

          {/* Remove Background Button */}
          <Button
            variant="outline"
            onClick={handleRemoveBackground}
            disabled={isProcessing}
            className="w-full mb-4 bg-white/10 border-white/30 text-white hover:bg-white/20"
            data-testid="button-remove-bg"
          >
            {isProcessing ? "Processing..." : "Remove Background"}
          </Button>

          <div className="pt-2">
            <Button
              className="w-full h-12 bg-white/20 border border-white/30 text-white hover:bg-white/30 rounded-md"
              onClick={onContinue}
              data-testid="button-continue"
            >
              Continue
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
