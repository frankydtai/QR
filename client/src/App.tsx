import { useState, useEffect } from "react";
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
import { filter } from "@/lib/utils"; // 路径按你utils实际位置
import { crop } from "@/lib/utils";
import { generateQr } from "@/lib/utils";
import { convertGray } from "@/lib/utils";

type Step = 1 | 2 | 3 | 4 | 5;

interface TextBox {
  id: number;
  x: number;
  y: number;
  text: string;
}

interface ImageEditState {
  imageURL: string | null;
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
  const [selectedImageRB, setSelectedImageRB] = useState<File | null>(null);
  const [url, setUrl] = useState<string>("");
  const [editedOriginal, setEditedOriginal] = useState<File | null>(null);

  // 预览页使用的 QR 预览（从 ImageUploader 迁移保留）
  const [previewQR, setPreviewQR] = useState<string>("");
  const [isRB, setisRB] = useState(false);
  const [originalImage, setOriginalImage] = useState<File | null>(null);
  const [grayImage, setGrayImage] = useState<File | null>(null);
  const [originalImageRB, setOriginalImageRB] = useState<File | null>(null);
  const [grayImageRB, setGrayImageRB] = useState<File | null>(null);
  const [originalImageRBFiltered, setOriginalImageRBFiltered] =
    useState<File | null>(null);
  const [grayImageRBFiltered, setGrayImageRBFiltered] = useState<File | null>(
    null,
  );

  const [precomputeRB, setPrecomputeRB] = useState(false);
  const [isColor, setIsColor] = useState<boolean>(false);
  // Edit 页使用的原图及几何/文字等编辑状态
  const [imageEditState, setImageEditState] = useState<ImageEditState>({
    imageURL: null,
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
    setIsColor(style.id === "Color");
  };

  const handleImageSelect = async (file: File | null) => {
    if (!file) {
      setSelectedImage(null);
      setSelectedImageRB(null);
      setImageEditState((prev) => ({ ...prev, imageURL: null }));
      return;
    }

    // 第一次上传时，保存一份原始彩色图，不会被覆盖
    setOriginalImage((prev) => prev ?? file);

    // 以 originalImage 为基准派生
    const base = originalImage ?? file;
    const gray = await convertGray(base);
    setGrayImage(gray);

    if (isColor) {
      // 彩色模式 → 直接用原始图
      setSelectedImage(base);
      setImageEditState((prev) => ({
        ...prev,
        imageURL: URL.createObjectURL(base),
      }));
    } else {
      // 非彩色模式 → 生成灰阶图
      //const grayImage = await convertGray(base);
      setSelectedImage(gray);
      setImageEditState((prev) => ({
        ...prev,
        imageURL: URL.createObjectURL(gray),
      }));
    }
  };

  useEffect(() => {
    (async () => {
      if (!originalImage || !selectedStyle) return;

      if (isColor) {
        // 彩色模型：直接用原始图
        setSelectedImage(originalImage);
        setImageEditState((prev) => ({
          ...prev,
          imageURL: URL.createObjectURL(originalImage),
          //didInit: false, // 让编辑页/预览页重算 fitScale
        }));
      } else {
        // 黑白模型：用原始图转灰阶
        const gray = await convertGray(originalImage);
        setSelectedImage(gray);
        setImageEditState((prev) => ({
          ...prev,
          imageURL: URL.createObjectURL(gray),
          //didInit: false,
        }));
      }

      // 切换模型时，重置“已去背”标记，避免误用旧的 originalImageRB
      setisRB(false);
    })();
  }, [selectedStyle, originalImage]);

  useEffect(() => {
    // 样式 or RB 两张素材有变化时，重新选择 selectedImageRB
    if (isColor) {
      // 彩色样式 → 优先用去背彩色
      setSelectedImageRB(originalImageRB ?? null);
    } else {
      // 非彩色样式 → 优先用去背灰阶，没有就回退彩色
      setSelectedImageRB(grayImageRB ?? originalImageRB ?? null);
    }
  }, [isColor, originalImageRB, grayImageRB]);

  useEffect(() => {
    (async () => {
      if (!precomputeRB) return;
      if (!isRB || !originalImageRB) {
        // 不需要预算时也要前进
        setPrecomputeRB(false);
        setCurrentStep(3);
        return;
      }

      try {
        const objURL = URL.createObjectURL(originalImageRB);

        const cropped = await crop(
          objURL,
          imageEditState.imagePosition,
          imageEditState.imageScale,
          imageEditState.fitScale,
          imageEditState.textBoxes,
          null,
        );

        const filtered = await filter(
          cropped,
          imageEditState.contrast,
          imageEditState.brightness,
        );

        const qrBase64 = await generateQr(
          url || "https://instagram.com",
          filtered,
        );
        setPreviewQR(qrBase64);

        URL.revokeObjectURL(objURL);
      } catch (err) {
        console.error("進入 PreviewPage 前重算失敗:", err);
      } finally {
        setPrecomputeRB(false);
        setCurrentStep(3);
      }
    })();
  }, [precomputeRB, isRB, originalImageRB]);

  const handleURLChange = (newUrl: string) => {
    setUrl(newUrl);
  };

  const goToNextStep = async () => {
    if (currentStep < 5) {
      const nextStep = (currentStep + 1) as Step;

      setCurrentStep(nextStep);
    }
  };

  const goToPreviousStep = async () => {
    if (currentStep > 1) {
      const prevStep = (currentStep - 1) as Step;

      // if (prevStep === 2) {
      //   setImageEditState((s) => ({ ...s, didInit: false }));
      // }

      setCurrentStep(prevStep);
    }
  };

  // const handleContinue = async () => {
  //   if (!selectedImage) return;

  //   const outOriginal = await filter(
  //     selectedImage,
  //     imageEditState.contrast,
  //     imageEditState.brightness,
  //   );
  //   setEditedOriginal(outOriginal);

  //   if (originalImageRB) {
  //     const outRemoved = await filter(
  //       originalImageRB,
  //       imageEditState.contrast,
  //       imageEditState.brightness,
  //     );
  //     setOriginalImageRBFiltered(outRemoved);
  //   } else {
  //     setOriginalImageRBFiltered(null);
  //   }

  //   setCurrentStep(4);
  // };

  const startOver = () => {
    setCurrentStep(1);
    setSelectedStyle(null);
    setSelectedImage(null);
    setOriginalImage(null);
    setUrl("");
    setPreviewQR(""); // 清空预览
    setImageEditState({
      imageURL: null,
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
            onStyleSelect={handleStyleSelect}
            onContinue={goToNextStep}
          />
        );
      case 2: // Edit
        return (
          <ImageUploader
            onImageSelect={handleImageSelect}
            onContinue={() => setPrecomputeRB(true)} // 进入 Preview（Step 3）
            onBack={goToPreviousStep}
            imageEditState={imageEditState}
            setImageEditState={setImageEditState}
            selectedImage={selectedImage}
            selectedImageRB={selectedImageRB}
            previewQR={previewQR}
            setPreviewQR={setPreviewQR}
            setOriginalImageRB={setOriginalImageRB} // ★ 新增
            setGrayImageRB={setGrayImageRB} // ★ 新增
            isColor={isColor}
            setSelectedImageRB={setSelectedImageRB}
          />
        );
      case 3: // Preview（新增页面：去背/亮度/对比与 QR 生成）
        return (
          <PreviewPage
            onContinue={goToNextStep} // ★ 替换
            onBack={goToPreviousStep} // 回 Edit（Step 2）
            imageEditState={imageEditState}
            setImageEditState={setImageEditState} // ← 把這行加回來
            onImageSelect={handleImageSelect} // ← 加這行
            selectedImage={selectedImage}
            selectedImageRB={selectedImageRB}
            previewQR={previewQR}
            setPreviewQR={setPreviewQR}
            editedOriginal={editedOriginal}
            originalImageRBFiltered={originalImageRBFiltered}
            setEditedOriginal={setEditedOriginal}
            setOriginalImageRBFiltered={setOriginalImageRBFiltered}
            setOriginalImageRB={setOriginalImageRB}
            originalImageRB={originalImageRB} // ★ 加這行
            isRB={isRB}
            setisRB={setisRB}
            isColor={isColor}
          />
        );
      case 4: // URL
        return (
          <URLInput
            onURLChange={handleURLChange}
            onContinue={goToNextStep} // 进入 Generate（Step 5）
            onBack={() => setPrecomputeRB(true)} // 回 Preview（Step 3）
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
