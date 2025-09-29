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

function QRCodeApp() {
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [selectedStyle, setSelectedStyle] = useState<QRStyle | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [url, setUrl] = useState<string>('');

  const stepLabels = ['Style', 'Image', 'URL', 'Generate'];

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
      setCurrentStep((prev) => (prev - 1) as Step);
    }
  };

  const startOver = () => {
    setCurrentStep(1);
    setSelectedStyle(null);
    setSelectedImage(null);
    setUrl('');
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <QRModelSelector
            onStyleSelect={handleStyleSelect}
            onContinue={goToNextStep}
          />
        );
      case 2:
        return (
          <ImageUploader
            onImageSelect={handleImageSelect}
            onContinue={goToNextStep}
            onBack={goToPreviousStep}
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
            onStartOver={startOver}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="flex justify-between items-center p-4 border-b">
        <h1 className="text-lg font-semibold" data-testid="app-title">
          QR Generator
        </h1>
        <ThemeToggle />
      </header>

      {/* Main Content */}
      <main className="pb-6">
        {/* Progress Indicator */}
        <div className="pt-6">
          <ProgressIndicator
            currentStep={currentStep}
            totalSteps={4}
            stepLabels={stepLabels}
          />
        </div>

        {/* Current Step Content */}
        <div className="px-4">
          {renderCurrentStep()}
        </div>
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
