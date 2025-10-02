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
  contrast: number[];
  brightness: number[];
  fitScale: number;
  textBoxes: { id: number; x: number; y: number; text: string }[];
  didInit: boolean;
}

type Props = {
  onContinue: () => void;
  onBack: () => void;
  imageEditState: ImageEditState;
  setImageEditState: (state: ImageEditState) => void;
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

  const {
    previewUrl,
    imagePosition,
    imageScale,
    contrast,
    brightness,
    fitScale,
  } = imageEditState;

  const updateState = (updates: Partial<ImageEditState>) => {
    setImageEditState({ ...imageEditState, ...updates });
  };

  async function exportCroppedPngFromView(previewUrl: string): Promise<File> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const box = containerRef.current?.getBoundingClientRect();
        const bw = Math.round(box?.width ?? 256);
        const bh = Math.round(box?.height ?? 256);
        const dpr = window.devicePixelRatio || 1;

        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.floor(bw * dpr));
        canvas.height = Math.max(1, Math.floor(bh * dpr));
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("No 2D context"));
          return;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw Image
        ctx.save();
        const tx = (bw / 2 + imagePosition.x) * dpr;
        const ty = (bh / 2 + imagePosition.y) * dpr;
        ctx.setTransform(imageScale * dpr, 0, 0, imageScale * dpr, tx, ty);
        ctx.filter = `contrast(${100 + (contrast?.[0] ?? 0)}%) brightness(${
          100 + (brightness?.[0] ?? 0)
        }%)`;

        ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
        ctx.restore();

        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error("toBlob failed"));
            return;
          }
          const file = new File([blob], "cropped.png", { type: "image/png" });
          resolve(file);
        }, "image/png");
      };
      img.onerror = () => reject(new Error("Image load error"));
      img.src = previewUrl;
    });
  }

  const handleRemoveBackground = async () => {
    if (!previewUrl) return;

    setIsProcessing(true);
    try {
      // 1) Get cropped image File
      const file = await exportCroppedPngFromView(previewUrl);

      // 2) Remove background and get result URL
      const resultUrl = await removeBackground(file);

      // 3) Convert result URL to File
      const blob = await fetch(resultUrl).then((res) => res.blob());
      const bgRemovedFile = new File([blob], "removed-bg.png", {
        type: "image/png",
      });

      // 4) Generate QR code
      const qrImage = await generateQrCodeUtil(
        "https://instagram.com",
        bgRemovedFile,
      );

      // 5) Update parent state
      onImageSelect(bgRemovedFile);

      // 6) Update preview QR
      setPreviewQR(qrImage);
    } catch (error) {
      console.error("Background removal failed:", error);
      alert("Failed to remove background. Please try again.");
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
              value={brightness}
              onValueChange={async (value) => {
                if (!previewUrl) return;
                try {
                  updateState({ brightness: value });
                  const file = await exportCroppedPngFromView(previewUrl);
                  onImageSelect(file);
                  const base64Image = await generateQrCodeUtil(
                    "https://instagram.com",
                    file,
                  );
                  setPreviewQR(base64Image);
                } catch (err) {
                  console.error("QR re-generate failed (brightness):", err);
                }
              }}
              min={-100}
              max={100}
              step={10}
              className="w-full"
              data-testid="slider-brightness"
            />
            <div className="text-center text-white/60 text-xs">
              {brightness[0] > 0 ? "+" : ""}
              {brightness[0]}
            </div>
          </div>

          {/* Contrast Slider */}
          <div className="space-y-2 mb-4">
            <Label className="text-white/80 text-sm">Contrast</Label>
            <Slider
              value={contrast}
              onValueChange={async (value) => {
                if (!previewUrl) return;
                try {
                  updateState({ contrast: value });
                  const file = await exportCroppedPngFromView(previewUrl);
                  onImageSelect(file);
                  const base64Image = await generateQrCodeUtil(
                    "https://instagram.com",
                    file,
                  );
                  setPreviewQR(base64Image);
                } catch (err) {
                  console.error("QR re-generate failed (contrast):", err);
                }
              }}
              min={-100}
              max={100}
              step={10}
              className="w-full"
              data-testid="slider-contrast"
            />
            <div className="text-center text-white/60 text-xs">
              {contrast[0] > 0 ? "+" : ""}
              {contrast[0]}
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
