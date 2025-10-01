import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Share2, Download, RotateCcw } from "lucide-react";
import type { QRStyle } from "./QRModelSelector";

interface QRGeneratorProps {
  url: string;
  style: QRStyle;
  image?: File | null;
  onBack: () => void;
}

declare global {
  interface GenResult {
    success?: boolean;
    error?: string;
    base64EncodedImage?: string;
  }
  interface Window {
    generateQRCode?: (content: string, options?: any) => GenResult;
  }
}

export default function QRGenerator({
  url,
  style,
  image,
  onBack,
}: QRGeneratorProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    generateQRCode();
  }, [url, style, image]);

  const generateQRCode = async () => {
    if (!url) return;

    setIsGenerating(true);
    setError("");

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
        encodeVersion: 0, // 0 = let library choose
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
        setQrCodeUrl(base64Image);
      } else {
        throw new Error("No image returned from QR code generator");
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to generate QR code";
      console.error("Error generating QR code:", errorMessage);
      setError(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShare = async () => {
    if (!qrCodeUrl) return;

    if (navigator.share) {
      try {
        const response = await fetch(qrCodeUrl);
        const blob = await response.blob();
        const file = new File([blob], "qr-code.png", { type: "image/png" });

        await navigator.share({
          title: "QR Code",
          text: `QR code for ${url}`,
          files: [file],
        });
        console.log("QR code shared successfully");
      } catch (error) {
        console.log("Share failed, falling back to download");
        handleDownload();
      }
    } else {
      handleDownload();
    }
  };

  const handleDownload = () => {
    if (!qrCodeUrl) return;

    const link = document.createElement("a");
    link.download = `qr-code-${style.id}.png`;
    link.href = qrCodeUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    console.log("QR code downloaded");
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

      <div className="text-center mb-8">
        <h1
          className="text-2xl font-light mb-2 text-white"
          data-testid="page-title"
        >
          Your QR Code
        </h1>
      </div>

      <Card className="p-6 mb-8 bg-white/10 backdrop-blur-sm border border-white/20">
        <div className="text-center">
          {isGenerating ? (
            <div className="aspect-square w-full max-w-[280px] mx-auto flex items-center justify-center bg-muted rounded-lg">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : error ? (
            <div className="aspect-square w-full max-w-[280px] mx-auto flex items-center justify-center bg-muted rounded-lg">
              <div className="text-center p-4">
                <p className="text-red-500 mb-2">Error</p>
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
            </div>
          ) : qrCodeUrl ? (
            <div className="aspect-square w-full max-w-[280px] mx-auto">
              <img
                src={qrCodeUrl}
                alt="Generated QR Code"
                className="w-full h-full rounded-lg shadow-sm"
                data-testid="generated-qr-code"
              />
            </div>
          ) : (
            <div className="aspect-square w-full max-w-[280px] mx-auto flex items-center justify-center bg-muted rounded-lg">
              <p className="text-muted-foreground">
                Failed to generate QR code
              </p>
            </div>
          )}
        </div>
      </Card>

      <Button
        onClick={handleShare}
        className="w-full h-12 bg-white/20 border border-white/30 text-white hover:bg-white/30"
        disabled={!qrCodeUrl}
        data-testid="button-share"
      >
        <Share2 className="w-4 h-4 mr-2" />
        Share
      </Button>
    </div>
  );
}
