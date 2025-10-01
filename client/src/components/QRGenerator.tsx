import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Share2, Download, RotateCcw } from 'lucide-react';
import QRCode from 'qrcode';
import type { QRStyle } from './QRModelSelector';

interface QRGeneratorProps {
  url: string;
  style: QRStyle;
  image?: File | null;
  onBack: () => void;
}

export default function QRGenerator({ url, style, image, onBack }: QRGeneratorProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    generateQRCode();
  }, [url, style]);

  const generateQRCode = async () => {
    if (!url) return;
    
    setIsGenerating(true);
    
    try {
      // Generate QR code based on selected style
      let options = {
        width: 280,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      };

      // Customize based on style
      switch (style.id) {
        case 'rounded':
          options = {
            ...options,
            color: {
              dark: '#000000',
              light: '#FFFFFF'
            }
          };
          break;
        case 'gradient':
          options = {
            ...options,
            color: {
              dark: '#4F46E5',
              light: '#FFFFFF'
            }
          };
          break;
        case 'logo':
          options = {
            ...options,
            width: 320, // Larger for logo space
          };
          break;
      }

      const qrUrl = await QRCode.toDataURL(url, options);
      setQrCodeUrl(qrUrl);
      console.log('QR code generated for URL:', url);
    } catch (error) {
      console.error('Error generating QR code:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShare = async () => {
    if (!qrCodeUrl) return;

    if (navigator.share) {
      try {
        // Convert data URL to blob
        const response = await fetch(qrCodeUrl);
        const blob = await response.blob();
        const file = new File([blob], 'qr-code.png', { type: 'image/png' });

        await navigator.share({
          title: 'QR Code',
          text: `QR code for ${url}`,
          files: [file]
        });
        console.log('QR code shared successfully');
      } catch (error) {
        console.log('Share failed, falling back to download');
        handleDownload();
      }
    } else {
      // Fallback for browsers without Web Share API
      handleDownload();
    }
  };

  const handleDownload = () => {
    if (!qrCodeUrl) return;

    const link = document.createElement('a');
    link.download = `qr-code-${style.id}.png`;
    link.href = qrCodeUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    console.log('QR code downloaded');
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
        <h1 className="text-2xl font-light mb-2 text-white" data-testid="page-title">
          Your QR Code
        </h1>
      </div>

      <Card className="p-6 mb-8 bg-white/10 backdrop-blur-sm border border-white/20">
        <div className="text-center">
          {isGenerating ? (
            <div className="aspect-square w-full max-w-[280px] mx-auto flex items-center justify-center bg-muted rounded-lg">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
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
              <p className="text-muted-foreground">Failed to generate QR code</p>
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