import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { RefObject } from "react";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ============================================================================
// WASM Dynamic Loader
// ============================================================================

interface WasmConfig {
  name: string;
  path: string;
  globalFunction: string;
  execJsPath?: string;
}

interface WasmModuleState {
  loading: Promise<void> | null;
  loaded: boolean;
  error: Error | null;
}

// Track all WASM modules
const wasmStates = new Map<string, WasmModuleState>();
let wasmExecLoaded = false;
let wasmExecLoading: Promise<void> | null = null;

// Robust export readiness check with polling
async function waitForExport(
  functionName: string,
  timeout = 1000,
  pollInterval = 20,
): Promise<void> {
  const start = Date.now();
  while (!(window as any)[functionName]) {
    if (Date.now() - start > timeout) {
      throw new Error(
        `Timeout: ${functionName} not available after ${timeout}ms`,
      );
    }
    await new Promise((resolve) => setTimeout(resolve, pollInterval));
  }
}

// Load wasm_exec.js once (single-flight, idempotent)
async function ensureWasmExec(
  execJsPath: string = "/wasm_exec.js",
): Promise<void> {
  if (wasmExecLoaded) return;

  if (wasmExecLoading) {
    return wasmExecLoading;
  }

  wasmExecLoading = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = execJsPath;
    script.onload = () => {
      wasmExecLoaded = true;
      wasmExecLoading = null;
      resolve();
    };
    script.onerror = () => {
      wasmExecLoading = null;
      reject(new Error(`Failed to load ${execJsPath}`));
    };
    // TODO: For future CSP compliance, may need nonce attribute
    document.head.appendChild(script);
  });

  return wasmExecLoading;
}

// Load WASM with all safeguards
export async function loadWasm(
  config: WasmConfig,
  options?: { signal?: AbortSignal },
): Promise<void> {
  // 取出或建立狀態
  const state: WasmModuleState = wasmStates.get(config.name) || {
    loading: null,
    loaded: false,
    error: null,
  };

  // ✅ 以「全域函式是否存在」為主：若已存在，直接視為已載入，並同步校正快取狀態
  const hasFn = !!(window as any)[config.globalFunction];
  if (hasFn) {
    if (!state.loaded) {
      state.loaded = true;
      state.error = null;
      wasmStates.set(config.name, state);
    }
    return; // 已可用，無需再載入
  }

  // 已載入但（理論上不會發生因 hasFn=false）—保險：若 state.loaded 為 true，但 fn 不在，仍需重載
  if (state.loaded && !hasFn) {
    // fall through 進入重載流程
  }

  // 併發去重：若已有載入中，等待同一個 promise
  if (state.loading) {
    return state.loading;
  }

  // 建立新的載入流程
  const loadingPromise = (async () => {
    try {
      // 確保 wasm_exec.js 單例載入
      await ensureWasmExec(config.execJsPath);

      if (!window.Go) {
        throw new Error("Go runtime not available after loading wasm_exec.js");
      }

      // 為此模組建立獨立 Go 執行個體
      const go = new window.Go();

      // 先嘗試 streaming，失敗再退回 arrayBuffer
      let wasmModule: WebAssembly.WebAssemblyInstantiatedSource;
      try {
        wasmModule = await WebAssembly.instantiateStreaming(
          fetch(config.path, { signal: options?.signal }),
          go.importObject,
        );
      } catch (streamError) {
        console.warn(
          `instantiateStreaming failed for ${config.name}, using fallback:`,
          streamError,
        );
        const response = await fetch(config.path, { signal: options?.signal });
        const bytes = await response.arrayBuffer();
        wasmModule = await WebAssembly.instantiate(bytes, go.importObject);
      }

      // 跑 Go 程式（非同步、不 await）
      // Run the Go program (non-blocking)
      console.log(
        "[DEBUG] calling go.run for",
        config.name,
        "at",
        new Date().toISOString(),
      );
      go.run(wasmModule.instance);
      console.log("[DEBUG] finished go.run for", config.name);

      // 等待 Go 端把全域函式掛好
      await waitForExport(config.globalFunction, 10000, 20); // 建議 3s，較保守

      // ✅ 載入成功，回寫狀態（非常重要）
      state.loaded = true;
      state.error = null;
      wasmStates.set(config.name, state);
    } catch (error) {
      // 中止單獨記錄
      if (error instanceof Error && error.name === "AbortError") {
        console.log(`WASM load aborted: ${config.name}`);
      }
      state.error = error instanceof Error ? error : new Error(String(error));
      state.loaded = false; // 失敗狀態
      wasmStates.set(config.name, state);
      throw state.error;
    } finally {
      // 無論成功或失敗，都清除 loading，並回寫狀態
      state.loading = null;
      wasmStates.set(config.name, state);
    }
  })();

  // 將 in-flight promise 存起來以防併發
  state.loading = loadingPromise;
  wasmStates.set(config.name, state);

  // 交還同一個 promise（供併發者 await）
  return loadingPromise;
}



// Retry failed load
export async function retryWasmLoad(
  wasmName: string,
  config: WasmConfig,
): Promise<void> {
  const state = wasmStates.get(wasmName);
  if (state) {
    state.loaded = false;
    state.error = null;
    state.loading = null;
  }
  return loadWasm(config);
}

// Idempotent preload helper (for mobile optimization)
export function preloadWasm(config: WasmConfig): void {
  const state = wasmStates.get(config.name);
  if (state?.loaded || state?.loading) return; // No-op if already done/in-progress

  loadWasm(config).catch((err) => {
    console.error(`Failed to preload ${config.name}:`, err);
  });
}

// ============================================================================
// QR Generation
// ============================================================================

interface QROptions {
  colorHalftone?: boolean;
  noHalftone?: boolean;
  diffuse?: boolean;
  // 之後還可以再加其他選項
}

export async function generateQr(
  url: string,
  image?: File | null,
  opts?: QROptions,
): Promise<string> {
  if (!url) return "";

  try {
    // Dynamically load goqr.wasm on demand
    await loadWasm({
      name: "goqr",
      path: "/goqr.wasm",
      globalFunction: "generateQRCode",
    });

    if (!window.generateQRCode) {
      throw new Error("QR code generator failed to load");
    }

    let halftoneImage: string | undefined;

    if (image) {
      halftoneImage = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const result = e.target?.result;
          if (typeof result === "string") {
            resolve(result.split(",")[1]);
            console.log(
              "[DEBUG] FileReader finished at",
              new Date().toISOString(),
              "for image",
              image.name,
            );
          } else {
            reject(new Error("Failed to read image"));
          }
        };
        reader.onerror = () => reject(new Error("Failed to read image"));
        console.log(
          "[DEBUG] FileReader start at",
          new Date().toISOString(),
          "for image",
          image.name,
        );
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

    const result = window.generateQRCode(url, options);

    if (!result || result.success === false) {
      throw new Error(result?.error || "QR generation failed");
    }

    if (result.base64EncodedImage) {
      const base64Image = `data:image/png;base64,${result.base64EncodedImage}`;
      return base64Image;
    } else {
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
