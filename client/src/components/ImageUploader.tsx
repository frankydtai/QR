import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Upload, X, ZoomIn, ZoomOut } from 'lucide-react';

interface ImageUploaderProps {
  onImageSelect: (file: File | null, contrast?: number, brightness?: number) => void;
  onContinue: () => void;
  onBack: () => void;
}

export default function ImageUploader({ onImageSelect, onContinue, onBack }: ImageUploaderProps) {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
  const [imageScale, setImageScale] = useState(1);
  const [contrast, setContrast] = useState([0]);
  const [brightness, setBrightness] = useState([0]);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      console.log('Invalid file type');
      return;
    }

    setSelectedImage(file);
    onImageSelect(file, contrast[0], brightness[0]);
    
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
    setImagePosition({ x: 0, y: 0 });
    setImageScale(1);
    setContrast([0]);
    setBrightness([0]);
    onImageSelect(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    console.log('Image removed');
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - imagePosition.x,
      y: e.clientY - imagePosition.y
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    
    setImagePosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const scaleChange = e.deltaY > 0 ? -0.1 : 0.1;
    setImageScale(prev => Math.max(0.5, Math.min(3, prev + scaleChange)));
  };

  const getImageStyle = () => ({
    transform: `translate(${imagePosition.x}px, ${imagePosition.y}px) scale(${imageScale})`,
    filter: `contrast(${100 + contrast[0]}%) brightness(${100 + brightness[0]}%)`,
    cursor: isDragging ? 'grabbing' : 'grab'
  });

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
          Upload and Edit
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
          <div className="space-y-4">
            <Card className="p-4 bg-white/10 backdrop-blur-sm border border-white/20">
              <div className="relative">
                {/* Image Edit Box */}
                <div 
                  className="aspect-square w-64 mx-auto mb-4 overflow-hidden rounded-lg border-2 border-dashed border-white/30 relative bg-white/5"
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  onWheel={handleWheel}
                  data-testid="image-edit-box"
                >
                  <img 
                    src={previewUrl} 
                    alt="Preview"
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 max-w-none select-none"
                    style={getImageStyle()}
                    onMouseDown={handleMouseDown}
                    data-testid="image-preview"
                    draggable={false}
                  />
                  <div className="absolute top-2 left-2 text-white/60 text-xs">
                    Drag to move • Scroll to zoom
                  </div>
                </div>
                
                {/* Zoom Controls */}
                <div className="flex items-center justify-center gap-2 mb-4">
                  <Button
                    variant="outline"
                    size="icon"
                    className="w-8 h-8 bg-white/10 border-white/30 text-white hover:bg-white/20"
                    onClick={() => setImageScale(prev => Math.max(0.5, prev - 0.1))}
                    data-testid="button-zoom-out"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </Button>
                  <span className="text-white/80 text-sm min-w-12 text-center">
                    {Math.round(imageScale * 100)}%
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="w-8 h-8 bg-white/10 border-white/30 text-white hover:bg-white/20"
                    onClick={() => setImageScale(prev => Math.min(3, prev + 0.1))}
                    data-testid="button-zoom-in"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </Button>
                </div>

                {/* Contrast Slider */}
                <div className="space-y-2 mb-4">
                  <Label className="text-white/80 text-sm">Contrast</Label>
                  <Slider
                    value={contrast}
                    onValueChange={(value) => {
                      setContrast(value);
                      if (selectedImage) {
                        onImageSelect(selectedImage, value[0], brightness[0]);
                      }
                    }}
                    min={-100}
                    max={100}
                    step={10}
                    className="w-full"
                    data-testid="slider-contrast"
                  />
                  <div className="text-center text-white/60 text-xs">
                    {contrast[0] > 0 ? '+' : ''}{contrast[0]}
                  </div>
                </div>

                {/* Brightness Slider */}
                <div className="space-y-2 mb-4">
                  <Label className="text-white/80 text-sm">Brightness</Label>
                  <Slider
                    value={brightness}
                    onValueChange={(value) => {
                      setBrightness(value);
                      if (selectedImage) {
                        onImageSelect(selectedImage, contrast[0], value[0]);
                      }
                    }}
                    min={-100}
                    max={100}
                    step={10}
                    className="w-full"
                    data-testid="slider-brightness"
                  />
                  <div className="text-center text-white/60 text-xs">
                    {brightness[0] > 0 ? '+' : ''}{brightness[0]}
                  </div>
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
          </div>
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