import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Share2, Download, RotateCcw } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import type { QRStyle } from './QRModelSelector';
import type { QRGenerationRequest } from '@shared/schema';

interface QRGeneratorProps {
  url: string;
  style: QRStyle;
  image?: File | null;
  contrast: number;
  brightness: number;
  onBack: () => void;
}

export default function QRGenerator({ url, style, image, contrast, brightness, onBack }: QRGeneratorProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const { toast } = useToast();

  // Helper function to convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          // Remove the data URL prefix (data:image/jpeg;base64,)
          const base64 = reader.result.split(',')[1];
          resolve(base64);
        } else {
          reject(new Error('Failed to convert file to base64'));
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Mutation for QR code generation
  const generateQRMutation = useMutation({
    mutationFn: async (data: QRGenerationRequest) => {
      const response = await apiRequest('POST', '/api/qr/generate', data);
      return await response.json();
    },
    onSuccess: (data) => {
      setQrCodeUrl(data.qrCode);
      toast({
        title: "Success",
        description: "QR code generated successfully!",
      });
    },
    onError: (error: Error) => {
      console.error('Error generating QR code:', error);
      toast({
        title: "Error",
        description: "Failed to generate QR code. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Generate QR code when component mounts or parameters change
  useEffect(() => {
    generateQRCode();
  }, [url, contrast, brightness, image]);

  const generateQRCode = async () => {
    if (!url) return;
    
    try {
      let pictureBase64: string | undefined;
      
      // Convert image to base64 if provided
      if (image) {
        pictureBase64 = await fileToBase64(image);
      }

      // Prepare request data
      const requestData: QRGenerationRequest = {
        text: url,
        contrast: contrast !== 0 ? 1 + (contrast / 100) : undefined, // Convert percentage to ratio
        brightness: brightness !== 0 ? 1 + (brightness / 100) : undefined, // Convert percentage to ratio
        picture: pictureBase64,
      };

      generateQRMutation.mutate(requestData);
    } catch (error) {
      console.error('Error preparing QR generation:', error);
      toast({
        title: "Error",
        description: "Failed to prepare QR code generation.",
        variant: "destructive",
      });
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
          {generateQRMutation.isPending ? (
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
              <p className="text-muted-foreground">
                {generateQRMutation.isError ? "Failed to generate QR code" : "Ready to generate QR code"}
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