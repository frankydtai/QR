import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check } from "lucide-react";
import BW from "@assets/generated_images/Classic_QR_code_style_3db73b67.png";
import Classic from "@assets/generated_images/Rounded_QR_code_style_7a686839.png";
import Color from "@assets/generated_images/Logo_center_QR_style_c942c249.png";
import Go from "@assets/generated_images/Gradient_QR_code_style_8eb6a7ac.png";

export interface QRStyle {
  id: string;
  name: string;
  preview: string;
  //description: string;
}

const qrStyles: QRStyle[] = [
  {
    id: "1",
    name: "1",
    preview: BW,
    //description: 'Traditional black and white squares'
  },
  {
    id: "2",
    name: "2",
    preview: Classic,
    //description: 'Smooth rounded corners'
  },
  {
    id: "3",
    name: "3",
    preview: Color,
    //description: 'Space for logo in center'
  },
  {
    id: "4",
    name: "4",
    preview: Go,
    //description: 'Colorful gradient design'
  },
  {
    id: "5",
    name: "5",
    preview: Go,
    //description: 'Colorful gradient design'
  },
  {
    id: "6",
    name: "6",
    preview: Go,
    //description: 'Colorful gradient design'
  },
];

interface QRModelSelectorProps {
  onStyleSelect: (style: QRStyle) => void;
  onBack?: () => void;
  onContinue: () => void;
}

export default function QRModelSelector({
  onStyleSelect,
  onBack,
  onContinue,
}: QRModelSelectorProps) {
  const handleStyleSelect = (style: QRStyle) => {
    onStyleSelect(style);
    onContinue(); // ★ 選完樣式後馬上觸發 Continue
    console.log("QR style selected:", style.name);
  };

  return (
    <div className="w-full max-w-md mx-auto p-6">
      {onBack && (
        <button
          onClick={onBack}
          className="mb-6 text-white/80 hover:text-white transition-colors"
          data-testid="button-back"
        >
          ← Back
        </button>
      )}

      <div className="text-center mb-8">
        <h1
          className="text-2xl font-light mb-2 text-white"
          data-testid="page-title"
        >
          Choose Style
        </h1>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        {qrStyles.map((style) => (
          <Card
            key={style.id}
            className="p-4 cursor-pointer hover-elevate transition-all duration-200 relative bg-white/10 backdrop-blur-sm border border-white/20"
            onClick={() => handleStyleSelect(style)}
            data-testid={`style-option-${style.id}`}
          >
            <div className="aspect-square mb-3 overflow-hidden rounded-md">
              <img
                src={style.preview}
                alt={`${style.name} QR style`}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="text-center">
              <h3 className="font-medium text-sm text-white">{style.name}</h3>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
