import { useState } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import ThemeToggle from "@/components/ThemeToggle";
import ProgressIndicator from "@/components/ProgressIndicator";
import QRModelSelector, { type QRStyle } from "@/components/QRModelSelector";
import ImageUploader from "@/components/ImageUploader";
import URLInput from "@/components/URLInput";
import QRGenerator from "@/components/QRGenerator";

type Step = 1 | 2 | 3 | 4;

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
  contrast: number[];
  brightness: number[];
  fitScale: number;
  textBoxes: TextBox[];
}

function QRCodeApp() {
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [selectedStyle, setSelectedStyle] = useState<QRStyle | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [url, setUrl] = useState<string>("");
  const [previewQR, setPreviewQR] = useState<string>("");
  const [imageEditState, setImageEditState] = useState<ImageEditState>({
    previewUrl: null,
    imagePosition: { x: 0, y: 0 },
    imageScale: 1,
    contrast: [0],
    brightness: [0],
    fitScale: 1,
    textBoxes: [],
  });

  const stepLabels = ["Style", "Image", "URL", "Generate"];

  const handleStyleSelect = (style: QRStyle) => {
    setSelectedStyle(style);
  };

  const handleImageSelect = (file: File | null) => {
    setSelectedImage(file);
  };

  const handleURLChange = (newUrl: string) => {
    setUrl(newUrl);
  };

  const goToNextStep = () => {
    if (currentStep < 4) {
      setCurrentStep((prev) => (prev + 1) as Step);
    }
  };

  const goToPreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => {
        const next = (prev - 1) as Step;
        if (next === 2) {
          setPreviewQR(""); // 回到 Step 2 时清空 Preview
        }
        return next;
      });
    }
  };

  const startOver = () => {
    setCurrentStep(1);
    setSelectedStyle(null);
    setSelectedImage(null);
    setUrl("");
    setPreviewQR(""); // 新增：把预览也清空
    setImageEditState({
      previewUrl: null,
      imagePosition: { x: 0, y: 0 },
      imageScale: 1,
      contrast: [0],
      brightness: [0],
      fitScale: 1,
      textBoxes: [],
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
      case 2:
        return (
          <ImageUploader
            onImageSelect={handleImageSelect}
            onContinue={goToNextStep}
            onBack={goToPreviousStep}
            imageEditState={imageEditState}
            setImageEditState={setImageEditState}
            selectedImage={selectedImage}
            previewQR={previewQR}
            setPreviewQR={setPreviewQR}
          />
        );
      case 3:
        return (
          <URLInput
            onURLChange={handleURLChange}
            onContinue={goToNextStep}
            onBack={goToPreviousStep}
          />
        );
      case 4:
        return (
          <QRGenerator
            url={url}
            style={selectedStyle!}
            image={selectedImage}
            onBack={goToPreviousStep}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen">
      {/* Main Content */}
      <main className="pt-12 pb-6">
        {/* Current Step Content */}
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
