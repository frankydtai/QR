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
      <button 
        onClick={onBack}
        className="mb-6 text-white/80 hover:text-white transition-colors"
        data-testid="button-back"
      >
        ← Back
      </button>
      
      <div className="text-center mb-8">
        <h1 className="text-2xl font-light mb-2 text-white" data-testid="page-title">
          Upload Image
        </h1>
      </div>

      <div className="mb-8">
        {!previewUrl ? (
          <Card
            className="border-2 border-dashed border-white/30 p-8 text-center hover-elevate cursor-pointer transition-colors bg-white/10 backdrop-blur-sm"
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
            data-testid="upload-zone"
          >
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mb-4">
                <Upload className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-medium mb-2 text-white">Tap to upload</h3>
              <p className="text-sm text-white/80">
                PNG, JPG or SVG files
              </p>
            </div>
          </Card>
        ) : (
          <Card className="p-4 bg-white/10 backdrop-blur-sm border border-white/20">
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
              <p className="text-sm font-medium truncate text-white">{selectedImage?.name}</p>
              <p className="text-xs text-white/60">
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

      <Button
        onClick={onContinue}
        className="w-full h-12 bg-white/20 border border-white/30 text-white hover:bg-white/30"
        data-testid="button-continue"
      >
        Continue
      </Button>
    </div>
  );
}