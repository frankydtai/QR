import { useState } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { useAuth } from "@/hooks/useAuth";
import Landing from "@/pages/Landing";
import NotFound from "@/pages/not-found";
import QRModelSelector, { type QRStyle } from "@/components/QRModelSelector";
import ImageUploader from "@/components/ImageUploader";
import URLInput from "@/components/URLInput";
import QRGenerator from "@/components/QRGenerator";

type Step = 1 | 2 | 3 | 4;

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      {isLoading || !isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <>
          <Route path="/" component={QRCodeApp} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function QRCodeApp() {
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [selectedStyle, setSelectedStyle] = useState<QRStyle | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [url, setUrl] = useState<string>('');

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

  const handleLogout = () => {
    window.location.href = '/api/logout';
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
      {/* Header with logout */}
      <header className="absolute top-4 right-4 z-10">
        <button
          onClick={handleLogout}
          className="text-white/80 hover:text-white text-sm transition-colors"
          data-testid="button-logout"
        >
          Logout
        </button>
      </header>

      {/* Main Content */}
      <main className="pt-12 pb-6">
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
          <Router />
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
