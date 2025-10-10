import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { generateQr } from "@/lib/utils";
import { filter } from "@/lib/utils";
import { crop } from "@/lib/utils";
import { preloadWasm } from "@/lib/utils"; // ← 新增這行

interface ImageEditState {
  imageURL: string | null;
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
  selectedImageRB: File | null;
  onImageSelect: (file: File | null) => void;
  previewQR: string;
  setPreviewQR: (v: string) => void;
  originalImageRB?: File | null;
  originalImageRBFiltered?: File | null;
  grayImageRB?: File | null;
  grayImageRBFiltered?: File | null;
  isRB: boolean;
  isColor: boolean;
  isNo: boolean;
  isDiffuse: boolean;
  setisRB: (v: boolean) => void;
};

export default function PreviewPage({
  onContinue,
  onBack,
  imageEditState,
  setImageEditState,

  selectedImage,
  selectedImageRB,
  onImageSelect,
  previewQR,
  setPreviewQR,
  originalImageRB,

  grayImageRB,
  originalImageRBFiltered,
  isRB, // ★ 新增：接收父層傳的狀態
  isColor,
  isNo,
  isDiffuse,
  setisRB,
}: Props) {
  if (isRB && !selectedImageRB) {
    return (
      <div className="w-full max-w-md mx-auto p-6 flex flex-col items-center justify-center text-center text-white/80 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
        <h2 className="text-xl font-semibold mb-4">Processing Image</h2>
        <p>
          The background-removed image is being prepared. Please wait a
          moment...
        </p>
        {/* 你也可以在這裡放一個 Spinner 元件 */}
      </div>
    );
  }

  const [isProcessing, setIsProcessing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inFlightRef = useRef(false); // ← 新增這行

  useEffect(() => {
    console.log("[PREVIEW PAGE] useEffect triggered for preloading WASM."); // <-- 新增日誌
    preloadWasm({
      name: "goqr",
      path: "/goqr.wasm",
      globalFunction: "generateQRCode",
    });
  }, []);

  const { imageURL, imagePosition, imageScale, fitScale, textBoxes } =
    imageEditState;
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

  // type ExportWithFiltersOpts = {
  //   container: HTMLDivElement | null; // 前一页的画布容器（用于取导出尺寸）
  //   imagePosition: { x: number; y: number }; // 前一页记录的平移
  //   imageScale: number; // 前一页记录的缩放
  //   contrast: number | number[]; // 预览页的对比度（可传单值或 [value]）
  //   brightness: number | number[]; // 预览页的亮度（可传单值或 [value]）
  //   originalImageRB?: File | null; // ★ 新增
  // };

  /**
   * Export Cropped PNG with Filter
   * 只使用传入的参数与 imageURL；返回套用 contrast/brightness 后的 PNG File
   */
  // 直接替换你刚刚改过的函数（保留单一参数签名，不改调用处）
  // 用「前一页已导出的 File」直接套滤镜并导出（不重做前页逻辑）

  const recompute = async () => {
    if (!imageURL) return;
    if (inFlightRef.current) return; // ← 新增：防重入
    inFlightRef.current = true; // ← 新增

    let file: File | null = null;

    if (isRB && selectedImageRB) {
      // ★ RemoveBackground 狀態 → 先做裁剪/縮放，再套亮度對比
      const croppedImage = await crop(
        URL.createObjectURL(selectedImageRB),
        imagePosition,
        imageScale,
        fitScale,
        textBoxes,
      );

      file = await filter(croppedImage, contrast, brightness);
    } else if (selectedImage) {
      // ★ 原始狀態 → 套亮度對比就好
      const croppedImage = await crop(
        URL.createObjectURL(selectedImage),
        imagePosition,
        imageScale,
        fitScale,
        textBoxes,
      );

      file = await filter(croppedImage, contrast, brightness);
    }

    if (!file) return;

    const base64Image = await generateQr("https://instagram.com", file, {
      colorHalftone: isColor,
      noHalftone: isNo,
      diffuse: isDiffuse,
    });
    setPreviewQR(base64Image);
    inFlightRef.current = false; // ← 新增：釋放
  };

  // useEffect(() => {
  //   recompute();
  // }, [
  //   isRB, // ← 关键
  //   originalImageRB,
  //   selectedImage,
  //   contrast,
  //   brightness,
  //   imagePosition.x,
  //   imagePosition.y,
  //   imageScale,
  //   fitScale,
  //   imageEditState.textBoxes.length,
  // ]);

  const handleRemoveBackground = async () => {
    //const file = originalImageRB;
    if (!selectedImageRB || !imageURL) {
      alert("沒有可用的去背結果。");
      return;
    }

    try {
      const croppedImage = await crop(
        URL.createObjectURL(selectedImageRB),
        imagePosition,
        imageScale,
        fitScale,
        textBoxes,
      );

      const filteredImage = await filter(croppedImage, contrast, brightness);

      const base64Image = await generateQr(
        "https://instagram.com",
        filteredImage,
        { colorHalftone: isColor, noHalftone: isNo, diffuse: isDiffuse },
      );

      setPreviewQR(base64Image);
      setisRB(true); // ★ 設定為已去背
    } catch (err) {
      console.error("處理去背圖失敗:", err);
      alert("處理去背圖時發生錯誤");
    }
    //setisRB(true); // ← 改成只切狀態
  };

  const handleRestoreBackground = async () => {
    if (!selectedImage || !imageURL) {
      alert("沒有原始圖片。");
      return;
    }

    try {
      const croppedImage = await crop(
        URL.createObjectURL(selectedImage),
        imagePosition,
        imageScale,
        fitScale,
        textBoxes,
      );

      const filteredImage = await filter(croppedImage, contrast, brightness);

      const base64Image = await generateQr(
        "https://instagram.com",
        filteredImage,
        { colorHalftone: isColor, noHalftone: isNo, diffuse: isDiffuse },
      );

      setPreviewQR(base64Image);
      setisRB(false); // ★ 恢復為未去背
    } catch (err) {
      console.error("恢復背景失敗:", err);
      alert("恢復背景時發生錯誤");
    }
    //setisRB(false); // ← 改成只切狀態
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

          <div
            ref={containerRef}
            className="aspect-square w-64 mx-auto overflow-hidden rounded-lg border-2 border-dashed border-white/30 relative bg-white/5"
          >
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
              }}
              onValueCommit={() => {
                scheduleRecompute(); // ★ 新增：放開滑桿後再重算
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
              }}
              onValueCommit={() => {
                scheduleRecompute(); // ★ 新增：放開滑桿後再重算
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
            onClick={isRB ? handleRestoreBackground : handleRemoveBackground}
            disabled={isProcessing}
            className="w-full mb-4 bg-white/10 border-white/30 text-white hover:bg-white/20"
            data-testid="button-remove-bg"
          >
            {isRB ? "Restore Background" : "Remove Background"}
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
