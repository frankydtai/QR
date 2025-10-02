import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export async function generateQrCodeUtil(
  url: string,
  image?: File | null,
): Promise<string> {
  if (!url) return "";

  try {
    if (!window.generateQRCode) {
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
