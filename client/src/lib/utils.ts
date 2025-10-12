import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { RefObject } from "react";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface QROptions {
  colorHalftone?: boolean;
  noHalftone?: boolean;
  diffuse?: boolean;
  // 之後還可以再加其他選項
}

export async function generateQr(
  url: string,
  image?: File | null,
  opts?: QROptions, // 一個物件，外部傳入
  //opts?: { colorHalftone?: boolean }, // ← 新增：第三个可选参数
  //opts?: { noHalftone?: boolean }, // ← 新增：第三个可选参数
): Promise<string> {
  if (!url) return "";

  try {
    if (!window.generateQRCode) {
      console.error("[GEN][QART] window.generateQart is not defined");
      throw new Error(
        "WASM QR code generator not loaded yet. Please refresh the page.",
      );
    }

    let halftoneImage: string | undefined;

    if (image) {
      halftoneImage = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const result = e.target?.result;
          if (typeof result === "string") {
            resolve(result.split(",")[1]);
          } else {
            reject(new Error("Failed to read image"));
          }
        };
        reader.onerror = () => reject(new Error("Failed to read image"));
        reader.readAsDataURL(image);
      });
    }

    const options: any = {
      // encodeOption
      encodeVersion: 7, // 0 = let library choose
      encodeMode: 0, // 0=auto (可先不傳也行)
      encodeECLevel: "H",
      // outputOption
      outputQrWidth: 280,
      outputMargin: 2,
      outputQrColor: "#000000",
      outputBgColor: "#ffffff",
      outputBgTransparent: false,
      outputCircleShape: false,
      outputImageEncoder: "png",
      colorHalftone: !!opts?.colorHalftone, // ← 改这里：由外部决定（isColor）
      noHalftone: !!opts?.noHalftone, // ← 改这里：由外部决定（isNo）
      diffuse: !!opts?.diffuse, // ← 改这里：由外部决定（isDiffuse）
    };

    if (halftoneImage) {
      options.halftoneBase64 = halftoneImage;
    }
    console.debug("[GEN][QART] calling generateQart", {
      url,
      optionKeys: Object.keys(options),
      hasHalftone: !!options.halftoneBase64,
    });
    const result = window.generateQRCode(url, options);
    console.debug("[GEN][QART] returned", {
      type: typeof result,
      keys: result && Object.keys(result),
    });

    if (!result || result.success === false) {
      console.error("[GEN][QART] generation failed", result);
      throw new Error(result?.error || "QR generation failed");
    }

    if (result.base64EncodedImage) {
      console.debug(
        "[GEN][QART] got image, length:",
        result.base64EncodedImage.length,
      );
      const base64Image = `data:image/png;base64,${result.base64EncodedImage}`;
      return base64Image;
    } else {
      console.error("[GEN][QART] no base64EncodedImage in result", result);
      throw new Error("No image returned from QR code generator");
    }
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Failed to generate QR code";
    console.error("Error generating QR code:", errorMessage);
    throw err;
  }
}

export async function filter(
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

// utils.ts

export async function crop(
  imageURL: string,
  imagePosition: { x: number; y: number },
  imageScale: number,
  fitScale: number,
  textBoxes: { id: number; x: number; y: number; text: string }[],
  //containerRef?: RefObject<HTMLDivElement> | null, // ★ 允許 null/省略
): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      // const box = containerRef?.current?.getBoundingClientRect();
      // const bw = Math.round(box?.width ?? 256);
      // const bh = Math.round(box?.height ?? 256);
      const bw = 256;
      const bh = 256;
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

      // --- Draw Image ---
      ctx.save();
      const tx = (bw / 2 + imagePosition.x) * dpr;
      const ty = (bh / 2 + imagePosition.y) * dpr;
      ctx.setTransform(imageScale * dpr, 0, 0, imageScale * dpr, tx, ty);
      ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
      ctx.restore();

      // --- Draw Text Overlays ---
      ctx.save();
      ctx.scale(dpr, dpr);
      textBoxes.forEach((tb) => {
        const fontPx = 48;
        const fontWeight = 600;
        ctx.font = `${fontWeight} ${fontPx}px system-ui, -apple-system, Segoe UI, Roboto, Arial`;
        ctx.textBaseline = "top";
        const metrics = ctx.measureText(tb.text);
        const textW = Math.ceil(metrics.width);
        const textH = Math.ceil(fontPx * 1.2);
        const padX = 8;
        const padY = 4;
        const boxW = textW + padX * 2;
        const boxH = textH + padY * 2;

        ctx.fillStyle = "rgba(255,255,255,0.9)";
        ctx.fillRect(tb.x, tb.y, boxW, boxH);

        ctx.fillStyle = "#000";
        ctx.fillText(tb.text, tb.x + padX, tb.y + padY);
      });
      ctx.restore();

      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error("toBlob failed"));
          return;
        }
        resolve(new File([blob], "cropped.png", { type: "image/png" }));
      }, "image/png");
    };
    img.onerror = () => reject(new Error("Image load error"));
    img.src = imageURL;
  });
}

export async function convertGray(inputFile: File): Promise<File> {
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

      ctx.drawImage(img, 0, 0, w, h);
      const imageData = ctx.getImageData(0, 0, w, h);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        // 灰階公式（加權平均）
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;
        data[i] = data[i + 1] = data[i + 2] = gray;
      }

      ctx.putImageData(imageData, 0, 0);

      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error("toBlob failed"));
          return;
        }
        resolve(new File([blob], "grayscale.png", { type: "image/png" }));
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
