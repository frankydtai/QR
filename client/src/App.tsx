import { useState } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import ThemeToggle from "@/components/ThemeToggle";
import ProgressIndicator from "@/components/ProgressIndicator";
import QRModelSelector, { type QRStyle } from "@/components/QRModelSelector";
import ImageUploader from "@/components/ImageUploader"; // Step 2: Edit
import PreviewPage from "@/components/PreviewPage"; // Step 3: Preview（新增）
import URLInput from "@/components/URLInput"; // Step 4
import QRGenerator from "@/components/QRGenerator"; // Step 5
import { exportPngWithFiltersFromFile } from "@/lib/utils"; // 路径按你utils实际位置
import { exportCroppedPngFromView } from "@/lib/utils";
import { generateQrCodeUtil } from "@/lib/utils";

type Step = 1 | 2 | 3 | 4 | 5;

interface TextBox {
  id: number;
  x: number;
  y: number;
  text: string;
}

interface ImageEditState {
  previewUrl: string | null;
  imagePosition: { x: number; y: number };
  imageScale: number;
  contrast: number;
  brightness: number;
  fitScale: number;
  textBoxes: TextBox[];
  didInit: boolean;
}

function QRCodeApp() {
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [selectedStyle, setSelectedStyle] = useState<QRStyle | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [url, setUrl] = useState<string>("");
  const [editedOriginal, setEditedOriginal] = useState<File | null>(null);
  const [editedRemoved, setEditedRemoved] = useState<File | null>(null);
  // 预览页使用的 QR 预览（从 ImageUploader 迁移保留）
  const [previewQR, setPreviewQR] = useState<string>("");
  const [removedBase, setRemovedBase] = useState<File | null>(null);
  const [isRemoved, setIsRemoved] = useState(false);

  // Edit 页使用的原图及几何/文字等编辑状态
  const [imageEditState, setImageEditState] = useState<ImageEditState>({
    previewUrl: null,
    imagePosition: { x: 0, y: 0 },
    imageScale: 1,
    contrast: 0,
    brightness: 0,
    fitScale: 1,
    textBoxes: [],
    didInit: false,
  });

  // 更新步名称：Style → Edit → Preview → URL → Generate
  const stepLabels = ["Style", "Edit", "Preview", "URL", "Generate"];

  const handleStyleSelect = (style: QRStyle) => {
    setSelectedStyle(style);
  };

  const handleImageSelect = (file: File | null) => {
    setSelectedImage(file);
  };

  const handleURLChange = (newUrl: string) => {
    setUrl(newUrl);
  };

  const goToNextStep = async () => {
    if (currentStep < 5) {
      const nextStep = (currentStep + 1) as Step;

      if (nextStep === 3 && isRemoved && removedBase) {
        try {
          const cropped = await exportCroppedPngFromView(
            URL.createObjectURL(removedBase),
            imageEditState.imagePosition,
            imageEditState.imageScale,
            imageEditState.fitScale,
            imageEditState.textBoxes,
            null
          );
          const filtered = await exportPngWithFiltersFromFile(
            cropped,
            imageEditState.contrast,
            imageEditState.brightness
          );
          const base64 = await generateQrCodeUtil("https://instagram.com", filtered);
          setPreviewQR(base64);
        } catch (err) {
          console.error("進入 PreviewPage 前重算失敗:", err);
        }
      }

      setCurrentStep(nextStep);
    }
  };

  const goToPreviousStep = async () => {
    if (currentStep > 1) {
      const prevStep = (currentStep - 1) as Step;

      if (prevStep === 3 && isRemoved && removedBase) {
        try {
          const cropped = await exportCroppedPngFromView(
            URL.createObjectURL(removedBase),
            imageEditState.imagePosition,
            imageEditState.imageScale,
            imageEditState.fitScale,
            imageEditState.textBoxes,
            null
          );
          const filtered = await exportPngWithFiltersFromFile(
            cropped,
            imageEditState.contrast,
            imageEditState.brightness
          );
          const base64 = await generateQrCodeUtil("https://instagram.com", filtered);
          setPreviewQR(base64);
        } catch (err) {
          console.error("回到 PreviewPage 前重算失敗:", err);
        }
      }

      setCurrentStep(prevStep);
    }
  };


  const handleContinue = async () => {
    if (!selectedImage) return;

    const outOriginal = await exportPngWithFiltersFromFile(
      selectedImage,
      imageEditState.contrast,
      imageEditState.brightness,
    );
    setEditedOriginal(outOriginal);

    if (removedBase) {
      const outRemoved = await exportPngWithFiltersFromFile(
        removedBase,
        imageEditState.contrast,
        imageEditState.brightness,
      );
      setEditedRemoved(outRemoved);
    } else {
      setEditedRemoved(null);
    }

    setCurrentStep(4);
  };

  const startOver = () => {
    setCurrentStep(1);
    setSelectedStyle(null);
    setSelectedImage(null);
    setUrl("");
    setPreviewQR(""); // 清空预览
    setImageEditState({
      previewUrl: null,
      imagePosition: { x: 0, y: 0 },
      imageScale: 1,
      contrast: 0,
      brightness: 0,
      fitScale: 1,
      textBoxes: [],
      didInit: false,
    });
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <QRModelSelector
            onStyleSelect={(style) => {
              handleStyleSelect(style);
              goToNextStep();
            }}
          />
        );
      case 2: // Edit
        return (
          <ImageUploader
            onImageSelect={handleImageSelect}
            onContinue={goToNextStep} // 进入 Preview（Step 3）
            onBack={goToPreviousStep}
            imageEditState={imageEditState}
            setImageEditState={setImageEditState}
            selectedImage={selectedImage}
            previewQR={previewQR}
            setPreviewQR={setPreviewQR}
            setRemovedBase={setRemovedBase} // ★ 新增
          />
        );
      case 3: // Preview（新增页面：去背/亮度/对比与 QR 生成）
        return (
          <PreviewPage
            onContinue={handleContinue} // ★ 替换
            onBack={goToPreviousStep} // 回 Edit（Step 2）
            imageEditState={imageEditState}
            setImageEditState={setImageEditState} // ← 把這行加回來
            onImageSelect={handleImageSelect} // ← 加這行
            selectedImage={selectedImage}
            previewQR={previewQR}
            setPreviewQR={setPreviewQR}
            editedOriginal={editedOriginal}
            editedRemoved={editedRemoved}
            setEditedOriginal={setEditedOriginal}
            setEditedRemoved={setEditedRemoved}
            setRemovedBase={setRemovedBase}
            removedBase={removedBase} // ★ 加這行
            isRemoved={isRemoved}
            setIsRemoved={setIsRemoved}
          />
        );
      case 4: // URL
        return (
          <URLInput
            onURLChange={handleURLChange}
            onContinue={goToNextStep} // 进入 Generate（Step 5）
            onBack={goToPreviousStep} // 回 Preview（Step 3）
          />
        );
      case 5: // Generate
        return (
          <QRGenerator
            url={url}
            style={selectedStyle!}
            image={selectedImage}
            onBack={goToPreviousStep} // 回 URL（Step 4）
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen">
      {/* 这里可放进度条/主题切换等 UI */}
      {/* <ThemeToggle /> */}
      {/* <ProgressIndicator current={currentStep} labels={stepLabels} /> */}

      <main className="pt-12 pb-6">
        <div className="px-4">{renderCurrentStep()}</div>
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <QRCodeApp />
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
