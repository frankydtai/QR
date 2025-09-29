import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Check } from 'lucide-react';
import classicQR from '@assets/generated_images/Classic_QR_code_style_3db73b67.png';
import roundedQR from '@assets/generated_images/Rounded_QR_code_style_7a686839.png';
import logoQR from '@assets/generated_images/Logo_center_QR_style_c942c249.png';
import gradientQR from '@assets/generated_images/Gradient_QR_code_style_8eb6a7ac.png';

export interface QRStyle {
  id: string;
  name: string;
  preview: string;
  description: string;
}

const qrStyles: QRStyle[] = [
  {
    id: 'classic',
    name: 'Classic',
    preview: classicQR,
    description: 'Traditional black and white squares'
  },
  {
    id: 'rounded',
    name: 'Rounded',
    preview: roundedQR,
    description: 'Smooth rounded corners'
  },
  {
    id: 'logo',
    name: 'Logo Center',
    preview: logoQR,
    description: 'Space for logo in center'
  },
  {
    id: 'gradient',
    name: 'Gradient',
    preview: gradientQR,
    description: 'Colorful gradient design'
  }
];

interface QRModelSelectorProps {
  onStyleSelect: (style: QRStyle) => void;
  onContinue: () => void;
}

export default function QRModelSelector({ onStyleSelect, onContinue }: QRModelSelectorProps) {
  const [selectedStyle, setSelectedStyle] = useState<QRStyle | null>(null);

  const handleStyleSelect = (style: QRStyle) => {
    setSelectedStyle(style);
    onStyleSelect(style);
    console.log('QR style selected:', style.name);
  };

  return (
    <div className="w-full max-w-md mx-auto p-6">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-semibold mb-2" data-testid="page-title">
          Choose QR Style
        </h1>
        <p className="text-muted-foreground">
          Select a design style for your QR code
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        {qrStyles.map((style) => (
          <Card
            key={style.id}
            className={`p-4 cursor-pointer hover-elevate transition-all duration-200 relative ${
              selectedStyle?.id === style.id 
                ? 'ring-2 ring-primary ring-offset-2' 
                : ''
            }`}
            onClick={() => handleStyleSelect(style)}
            data-testid={`style-option-${style.id}`}
          >
            {selectedStyle?.id === style.id && (
              <div className="absolute -top-2 -right-2 bg-primary rounded-full p-1">
                <Check className="w-4 h-4 text-primary-foreground" />
              </div>
            )}
            
            <div className="aspect-square mb-3 overflow-hidden rounded-md">
              <img 
                src={style.preview} 
                alt={`${style.name} QR style`}
                className="w-full h-full object-cover"
              />
            </div>
            
            <div className="text-center">
              <h3 className="font-medium text-sm mb-1">{style.name}</h3>
              <p className="text-xs text-muted-foreground">{style.description}</p>
            </div>
          </Card>
        ))}
      </div>

      <Button
        onClick={onContinue}
        disabled={!selectedStyle}
        className="w-full h-12"
        data-testid="button-continue"
      >
        Continue
      </Button>
    </div>
  );
}