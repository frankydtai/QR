import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Upload, X, Image as ImageIcon } from 'lucide-react';

interface ImageUploaderProps {
  onImageSelect: (file: File | null) => void;
  onContinue: () => void;
  onBack: () => void;
}

export default function ImageUploader({ onImageSelect, onContinue, onBack }: ImageUploaderProps) {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      console.log('Invalid file type');
      return;
    }

    setSelectedImage(file);
    onImageSelect(file);
    
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    console.log('Image selected:', file.name);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    if (files[0]) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files?.[0]) {
      handleFileSelect(files[0]);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setPreviewUrl(null);
    onImageSelect(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    console.log('Image removed');
  };

  return (
    <div className="w-full max-w-md mx-auto p-6">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-semibold mb-2" data-testid="page-title">
          Upload Image
        </h1>
        <p className="text-muted-foreground">
          Add an image to include in your QR code
        </p>
      </div>

      <div className="mb-8">
        {!previewUrl ? (
          <Card
            className="border-2 border-dashed border-muted-foreground/25 p-8 text-center hover-elevate cursor-pointer transition-colors"
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
            data-testid="upload-zone"
          >
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-4">
                <Upload className="w-6 h-6 text-muted-foreground" />
              </div>
              <h3 className="font-medium mb-2">Tap to upload</h3>
              <p className="text-sm text-muted-foreground mb-4">
                PNG, JPG or SVG files
              </p>
              <p className="text-xs text-muted-foreground">
                Or drag and drop files here
              </p>
            </div>
          </Card>
        ) : (
          <Card className="p-4">
            <div className="relative">
              <div className="aspect-square w-32 mx-auto mb-4 overflow-hidden rounded-lg">
                <img 
                  src={previewUrl} 
                  alt="Preview"
                  className="w-full h-full object-cover"
                  data-testid="image-preview"
                />
              </div>
              <Button
                variant="destructive"
                size="icon"
                className="absolute -top-2 -right-2 w-6 h-6"
                onClick={removeImage}
                data-testid="button-remove-image"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium truncate">{selectedImage?.name}</p>
              <p className="text-xs text-muted-foreground">
                {selectedImage && (selectedImage.size / 1024).toFixed(1)} KB
              </p>
            </div>
          </Card>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileInput}
          className="hidden"
          data-testid="file-input"
        />
      </div>

      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={onBack}
          className="flex-1 h-12"
          data-testid="button-back"
        >
          Back
        </Button>
        <Button
          onClick={onContinue}
          className="flex-1 h-12"
          data-testid="button-continue"
        >
          Continue
        </Button>
      </div>
    </div>
  );
}