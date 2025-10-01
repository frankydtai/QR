import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Upload, X, ZoomIn, ZoomOut, Type } from "lucide-react";

interface ImageUploaderProps {
  onImageSelect: (file: File | null) => void;
  onContinue: () => void;
  onBack: () => void;
}

export default function ImageUploader({
  onImageSelect,
  onContinue,
  onBack,
}: ImageUploaderProps) {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
  const [imageScale, setImageScale] = useState(1);
  const [contrast, setContrast] = useState([0]);
  const [brightness, setBrightness] = useState([0]);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null); // ← 新增：取得預覽框實際寬高
  const [fitScale, setFitScale] = useState(1);
  
  // Text overlay state
  interface TextBox {
    id: number;
    x: number;
    y: number;
    text: string;
  }
  const [textBoxes, setTextBoxes] = useState<TextBox[]>([]);
  const [draggingTextId, setDraggingTextId] = useState<number | null>(null);
  const [textDragStart, setTextDragStart] = useState({ x: 0, y: 0 });
  const [editingTextId, setEditingTextId] = useState<number | null>(null);

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith("image/")) {
      console.log("Invalid file type");
      return;
    }

    setSelectedImage(file);
    onImageSelect(file);

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    // Reset position and scale when new image is selected
    setImagePosition({ x: 0, y: 0 });
    setImageScale(1);
    setFitScale(1);
    setContrast([0]);
    setBrightness([0]);

    console.log("Image selected:", file.name);
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
    setFitScale(1);
    setContrast([0]);
    setBrightness([0]);
    setTextBoxes([]);
    onImageSelect(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    console.log("Image removed");
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - imagePosition.x,
      y: e.clientY - imagePosition.y,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;

    setImagePosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const scaleChange = e.deltaY > 0 ? -0.1 : 0.1;
    setImageScale((prev) => Math.max(0.1, Math.min(3, prev + scaleChange)));
    setImageScale((prev) => {
      const minS = fitScale * 0.1; // ↓ 下限 = 貼齊後的 50%
      const maxS = fitScale * 3; // ↑ 上限 = 貼齊後的 300%（可改你的 xx%）
      return Math.max(minS, Math.min(maxS, prev + scaleChange));
    });
  };

  const getImageStyle = () => ({
    transform: `translate(-50%, -50%) translate(${imagePosition.x}px, ${imagePosition.y}px) scale(${imageScale})`,
    filter: `contrast(${100 + contrast[0]}%) brightness(${100 + brightness[0]}%)`,
    cursor: isDragging ? "grabbing" : "grab",
  });

  // Text box handlers
  const addTextBox = () => {
    const newId = Date.now();
    setTextBoxes([...textBoxes, {
      id: newId,
      x: 50,
      y: 50,
      text: 'Double click to edit'
    }]);
  };

  const handleTextMouseDown = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    setDraggingTextId(id);
    const textBox = textBoxes.find(t => t.id === id);
    if (textBox) {
      setTextDragStart({
        x: e.clientX - textBox.x,
        y: e.clientY - textBox.y
      });
    }
  };

  const handleTextMouseMove = (e: React.MouseEvent) => {
    if (draggingTextId !== null && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const newX = e.clientX - rect.left - textDragStart.x;
      const newY = e.clientY - rect.top - textDragStart.y;
      
      setTextBoxes(textBoxes.map(t => 
        t.id === draggingTextId ? { ...t, x: newX, y: newY } : t
      ));
    }
  };

  const handleTextMouseUp = () => {
    setDraggingTextId(null);
  };

  const handleTextDoubleClick = (id: number) => {
    setEditingTextId(id);
  };

  const handleTextChange = (id: number, newText: string) => {
    setTextBoxes(textBoxes.map(t => 
      t.id === id ? { ...t, text: newText } : t
    ));
  };

  const removeTextBox = (id: number) => {
    setTextBoxes(textBoxes.filter(t => t.id !== id));
  };

  async function exportCroppedPngFromView(previewUrl: string): Promise<File> {
    // added
    return new Promise((resolve, reject) => {
      // added
      const img = new Image(); // added
      img.crossOrigin = "anonymous"; // added
      img.onload = () => {
        // added
        const box = containerRef.current?.getBoundingClientRect(); // added
        const bw = Math.round(box?.width ?? 256); // added
        const bh = Math.round(box?.height ?? 256); // added
        const dpr = window.devicePixelRatio || 1; // added
        // added
        const canvas = document.createElement("canvas"); // added
        canvas.width = Math.max(1, Math.floor(bw * dpr)); // added
        canvas.height = Math.max(1, Math.floor(bh * dpr)); // added
        const ctx = canvas.getContext("2d"); // added
        if (!ctx) {
          reject(new Error("No 2D context"));
          return;
        } // added
        // added
        // 透明背景                                                                  // added
        ctx.clearRect(0, 0, canvas.width, canvas.height); // added
        // added
        // 將原本 img 的 transform 套到畫布：先以畫布中心為原點，再套位移與縮放             // added
        // 注意：使用「絕對 imageScale」，不是顯示百分比。                                // added
        const tx = (bw / 2 + imagePosition.x) * dpr; // added
        const ty = (bh / 2 + imagePosition.y) * dpr; // added
        ctx.setTransform(imageScale * dpr, 0, 0, imageScale * dpr, tx, ty); // added
        // added
        // 以圖片中心為定位點繪製                                                     // added
        const nw = img.naturalWidth; // added
        const nh = img.naturalHeight; // added
        ctx.drawImage(img, -nw / 2, -nh / 2); // added
        // added
        canvas.toBlob((blob) => {
          // added
          if (!blob) {
            reject(new Error("toBlob failed"));
            return;
          } // added
          const file = new File([blob], "cropped.png", { type: "image/png" }); // added
          resolve(file); // added
        }, "image/png"); // added
      }; // added
      img.onerror = (e) => reject(new Error("Image load error")); // added
      img.src = previewUrl; // added
    }); // added
  }

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
        <h1
          className="text-2xl font-light mb-2 text-white"
          data-testid="page-title"
        >
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
              <p className="text-sm text-white/80">PNG, JPG or SVG files</p>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            <Card className="p-4 bg-white/10 backdrop-blur-sm border border-white/20">
              <div className="relative">
                {/* Image Edit Box */}
                <div
                  className="aspect-square w-64 mx-auto mb-4 overflow-hidden rounded-lg border-2 border-dashed border-white/30 relative bg-white/5"
                  onMouseMove={(e) => {
                    handleMouseMove(e);
                    handleTextMouseMove(e);
                  }}
                  onMouseUp={() => {
                    handleMouseUp();
                    handleTextMouseUp();
                  }}
                  onMouseLeave={() => {
                    handleMouseUp();
                    handleTextMouseUp();
                  }}
                  onWheel={handleWheel}
                  data-testid="image-edit-box"
                  ref={containerRef} // ← patch ③ 會用到
                >
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 max-w-none max-h-none select-none"
                    style={getImageStyle()}
                    onLoad={(e) => {
                      const img = e.currentTarget;
                      const nw = img.naturalWidth;
                      const nh = img.naturalHeight;
                      // 讀容器尺寸（若讀不到就 fallback 到 256×256，因為你是 w-64）
                      const box = containerRef.current?.getBoundingClientRect();
                      const bw = box?.width ?? 256;
                      const bh = box?.height ?? 256;
                      // 以 contain 策略計算初始縮放
                      const scale0 = Math.min(bw / nw, bh / nh);
                      setFitScale(scale0);
                      setImageScale(scale0);
                      setImagePosition({ x: 0, y: 0 });
                    }}
                    onMouseDown={handleMouseDown}
                    data-testid="image-preview"
                    draggable={false}
                  />
                  
                  {/* Text Overlays */}
                  {textBoxes.map(textBox => (
                    <div
                      key={textBox.id}
                      className="absolute"
                      style={{
                        left: `${textBox.x}px`,
                        top: `${textBox.y}px`,
                        cursor: draggingTextId === textBox.id ? 'grabbing' : 'grab'
                      }}
                      onMouseDown={(e) => handleTextMouseDown(e, textBox.id)}
                      onDoubleClick={() => handleTextDoubleClick(textBox.id)}
                      data-testid={`text-box-${textBox.id}`}
                    >
                      {editingTextId === textBox.id ? (
                        <input
                          type="text"
                          value={textBox.text}
                          onChange={(e) => handleTextChange(textBox.id, e.target.value)}
                          onBlur={() => setEditingTextId(null)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') setEditingTextId(null);
                          }}
                          autoFocus
                          className="bg-white/90 text-black px-2 py-1 rounded border-2 border-blue-500 min-w-[100px]"
                          data-testid={`text-input-${textBox.id}`}
                        />
                      ) : (
                        <div className="relative group">
                          <div className="bg-white/90 text-black px-2 py-1 rounded font-medium select-none shadow-lg">
                            {textBox.text}
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeTextBox(textBox.id);
                            }}
                            className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                            data-testid={`button-remove-text-${textBox.id}`}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                  
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
                    onClick={
                      () =>
                        // added
                        setImageScale((prev) => {
                          // added
                          const minS = fitScale * 0.1; // added
                          return Math.max(minS, prev - 0.1); // added
                        }) // added
                    }
                    data-testid="button-zoom-out"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </Button>
                  <span className="text-white/80 text-sm min-w-12 text-center">
                    {Math.round((imageScale / fitScale) * 100)}%
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="w-8 h-8 bg-white/10 border-white/30 text-white hover:bg-white/20"
                    onClick={
                      () =>
                        // added
                        setImageScale((prev) => {
                          // added
                          const maxS = fitScale * 3; // added
                          return Math.min(maxS, prev + 0.1); // added
                        }) // added
                    }
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
                    onValueChange={setContrast}
                    min={-100}
                    max={100}
                    step={10}
                    className="w-full"
                    data-testid="slider-contrast"
                  />
                  <div className="text-center text-white/60 text-xs">
                    {contrast[0] > 0 ? "+" : ""}
                    {contrast[0]}
                  </div>
                </div>

                {/* Brightness Slider */}
                <div className="space-y-2 mb-4">
                  <Label className="text-white/80 text-sm">Brightness</Label>
                  <Slider
                    value={brightness}
                    onValueChange={setBrightness}
                    min={-100}
                    max={100}
                    step={10}
                    className="w-full"
                    data-testid="slider-brightness"
                  />
                  <div className="text-center text-white/60 text-xs">
                    {brightness[0] > 0 ? "+" : ""}
                    {brightness[0]}
                  </div>
                </div>

                {/* Add Text Button */}
                <Button
                  variant="outline"
                  onClick={addTextBox}
                  className="w-full mb-4 bg-white/10 border-white/30 text-white hover:bg-white/20"
                  data-testid="button-add-text"
                >
                  <Type className="w-4 h-4 mr-2" />
                  Text
                </Button>

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
                <p className="text-sm font-medium truncate text-white">
                  {selectedImage?.name}
                </p>
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
        onClick={async () => {
          // added
          try {
            if (!previewUrl) {
              onContinue();
              return;
            }
            const file = await exportCroppedPngFromView(previewUrl);
            onImageSelect(file); // 保留這行 (不要再依賴 previewUrl 判斷)
            // added
            onContinue(); // added
          } catch (err) {
            // added
            console.error("Export failed:", err); // added
            onContinue(); // 若你要失敗也繼續，可保留；要中止則把這行移除                      // added
          } // added
        }}
        className="w-full h-12 bg-white/20 border border-white/30 text-white hover:bg-white/30"
        data-testid="button-continue"
      >
        Continue
      </Button>
    </div>
  );
}
