import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Upload, X, ZoomIn, ZoomOut, Type } from "lucide-react";
import { generateQrCodeUtil } from "@/lib/utils";

interface TextBox {
  id: number;
  x: number;
  y: number;
  text: string;
}

interface ImageEditState {
  previewUrl: string | null;
  imagePosition: { x: number; y: number };
  imageScale: number;
  fitScale: number;
  textBoxes: TextBox[];
  didInit: boolean;
}

interface ImageUploaderProps {
  onImageSelect: (file: File | null) => void;
  onContinue: () => void;
  onBack: () => void;
  imageEditState: ImageEditState;
  setImageEditState: (state: ImageEditState) => void;
  selectedImage: File | null;
  previewQR: string;
  setPreviewQR: (v: string) => void;
}

export default function ImageUploader({
  onImageSelect,
  onContinue,
  onBack,
  imageEditState,
  setImageEditState,
  previewQR,
  setPreviewQR,
}: ImageUploaderProps) {
  //const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [draggingTextId, setDraggingTextId] = useState<number | null>(null);
  const [textDragStart, setTextDragStart] = useState({ x: 0, y: 0 });
  const [editingTextId, setEditingTextId] = useState<number | null>(null);
  //const [previewQR, setPreviewQR] = useState<string>("");

  const { previewUrl, imagePosition, imageScale, fitScale, textBoxes } =
    imageEditState;

  const updateState = (updates: Partial<ImageEditState>) => {
    setImageEditState({ ...imageEditState, ...updates });
  };

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith("image/")) {
      console.log("Invalid file type");
      return;
    }

    //setSelectedImage(file);
    //onImageSelect(file);

    const url = URL.createObjectURL(file);
    updateState({
      previewUrl: url,
      imagePosition: { x: 0, y: 0 },
      imageScale: 1,
      fitScale: 1,
      didInit: false,
    });

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
    //setSelectedImage(null);
    updateState({
      previewUrl: null,
      imagePosition: { x: 0, y: 0 },
      imageScale: 1,
      fitScale: 1,
      textBoxes: [],
      didInit: false,
    });
    //onImageSelect(null);
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

    updateState({
      imagePosition: {
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      },
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const scaleChange = e.deltaY > 0 ? -0.1 : 0.1;
    const minS = fitScale * 0.1;
    const maxS = fitScale * 3;
    const newScale = Math.max(minS, Math.min(maxS, imageScale + scaleChange));
    updateState({ imageScale: newScale });
  };

  const getImageStyle = () => ({
    transform: `translate(-50%, -50%) translate(${imagePosition.x}px, ${imagePosition.y}px) scale(${imageScale})`,
    cursor: isDragging ? "grabbing" : "grab",
  });

  // Text box handlers
  const addTextBox = () => {
    const newId = Date.now();
    updateState({
      textBoxes: [
        ...textBoxes,
        {
          id: newId,
          x: 50,
          y: 50,
          text: "Double click to edit",
        },
      ],
    });
  };

  const handleTextMouseDown = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    setDraggingTextId(id);
    const textBox = textBoxes.find((t) => t.id === id);
    if (textBox) {
      const rect = containerRef.current?.getBoundingClientRect();
      setTextDragStart({
        x: e.clientX - (rect?.left ?? 0) - textBox.x,
        y: e.clientY - (rect?.top ?? 0) - textBox.y,
      });
    }
  };

  const handleTextMouseMove = (e: React.MouseEvent) => {
    if (draggingTextId !== null && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const newX = e.clientX - rect.left - textDragStart.x;
      const newY = e.clientY - rect.top - textDragStart.y;

      updateState({
        textBoxes: textBoxes.map((t) =>
          t.id === draggingTextId ? { ...t, x: newX, y: newY } : t,
        ),
      });
    }
  };

  const handleTextMouseUp = () => {
    setDraggingTextId(null);
  };

  const handleTextDoubleClick = (id: number) => {
    setEditingTextId(id);
  };

  const handleTextChange = (id: number, newText: string) => {
    updateState({
      textBoxes: textBoxes.map((t) =>
        t.id === id ? { ...t, text: newText } : t,
      ),
    });
  };

  const removeTextBox = (id: number) => {
    updateState({
      textBoxes: textBoxes.filter((t) => t.id !== id),
    });
  };

  async function exportCroppedPngFromView(previewUrl: string): Promise<File> {
    console.log("[Export Start] Beginning export process...");
    console.log("[Export State] Text boxes to be rendered:", textBoxes); // IMPORTANT: Check this first

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        console.log("[Export] Image has loaded successfully.");
        const box = containerRef.current?.getBoundingClientRect();
        const bw = Math.round(box?.width ?? 256);
        const bh = Math.round(box?.height ?? 256);
        const dpr = window.devicePixelRatio || 1;

        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.floor(bw * dpr));
        canvas.height = Math.max(1, Math.floor(bh * dpr));
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          console.error("[Export Error] Failed to get 2D context.");
          reject(new Error("No 2D context"));
          return;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // --- 1. Draw Image ---
        ctx.save();
        const tx = (bw / 2 + imagePosition.x) * dpr;
        const ty = (bh / 2 + imagePosition.y) * dpr;
        ctx.setTransform(imageScale * dpr, 0, 0, imageScale * dpr, tx, ty);
        ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
        ctx.restore();
        console.log("[Export] Image drawn to canvas.");

        // --- 2. Draw Text Overlays ---
        if (textBoxes.length === 0) {
          console.warn(
            "[Export] Text box array is empty. No text will be drawn.",
          );
        }

        ctx.save();
        ctx.scale(dpr, dpr); // Scale context to match CSS pixels

        textBoxes.forEach((tb, index) => {
          console.log(`[Export Text Loop ${index}] Processing text box:`, tb);

          const fontPx = 48;
          const fontWeight = 600;
          ctx.font = `${fontWeight} ${fontPx}px system-ui, -apple-system, Segoe UI, Roboto, Arial`;
          ctx.textBaseline = "top";
          const metrics = ctx.measureText(tb.text);
          const textW = Math.ceil(metrics.width);
          const textH = Math.ceil(fontPx * 1.2);
          const padX = 8;
          const padY = 4;
          const boxX = tb.x;
          const boxY = tb.y;
          const boxW = textW + padX * 2;
          const boxH = textH + padY * 2;

          console.log(
            `[Export Text Loop ${index}] Coords: x=${boxX}, y=${boxY}. Drawing text: "${tb.text}"`,
          );

          // Background
          ctx.fillStyle = "rgba(255,255,255,0.9)";
          ctx.fillRect(boxX, boxY, boxW, boxH);

          // Text
          ctx.fillStyle = "#000";
          ctx.fillText(tb.text, boxX + padX, boxY + padY);
        });
        ctx.restore();
        console.log("[Export] Finished processing all text boxes.");

        // --- 3. Export ---
        canvas.toBlob((blob) => {
          if (!blob) {
            console.error(
              "[Export Error] Canvas toBlob failed to produce a blob.",
            );
            reject(new Error("toBlob failed"));
            return;
          }
          console.log(
            "[Export Success] Blob created successfully. Resolving promise.",
          );
          const file = new File([blob], "cropped.png", { type: "image/png" });
          resolve(file);
        }, "image/png");
      };
      img.onerror = () => {
        console.error(
          "[Export Error] Image failed to load from src:",
          previewUrl,
        );
        reject(new Error("Image load error"));
      };
      img.src = previewUrl;
    });
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
                  ref={containerRef}
                >
                  {previewQR ? (
                    <img
                      src={previewQR}
                      alt="Preview QR Code"
                      className="absolute inset-0 w-full h-full object-contain select-none"
                    />
                  ) : (
                    <>
                      <img
                        src={previewUrl}
                        alt="Preview"
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 max-w-none max-h-none select-none"
                        style={getImageStyle()}
                        onLoad={(e) => {
                          const img = e.currentTarget;
                          const nw = img.naturalWidth;
                          const nh = img.naturalHeight;
                          const box =
                            containerRef.current?.getBoundingClientRect();
                          const bw = box?.width ?? 256;
                          const bh = box?.height ?? 256;
                          const scale0 = Math.min(bw / nw, bh / nh);

                          // Only initialize the values when didInit is false
                          if (!imageEditState.didInit) {
                            updateState({
                              fitScale: scale0,
                              imageScale: scale0,
                              imagePosition: { x: 0, y: 0 },
                              didInit: true,
                            });
                          }
                        }}
                        onMouseDown={handleMouseDown}
                        data-testid="image-preview"
                        draggable={false}
                      />

                      {/* Text Overlays */}
                      {textBoxes.map((textBox) => (
                        <div
                          key={textBox.id}
                          className="absolute"
                          style={{
                            left: `${textBox.x}px`,
                            top: `${textBox.y}px`,
                            cursor:
                              draggingTextId === textBox.id
                                ? "grabbing"
                                : "grab",
                          }}
                          onMouseDown={(e) =>
                            handleTextMouseDown(e, textBox.id)
                          }
                          onDoubleClick={() =>
                            handleTextDoubleClick(textBox.id)
                          }
                          data-testid={`text-box-${textBox.id}`}
                        >
                          {editingTextId === textBox.id ? (
                            <input
                              type="text"
                              value={textBox.text}
                              onChange={(e) =>
                                handleTextChange(textBox.id, e.target.value)
                              }
                              onBlur={() => setEditingTextId(null)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") setEditingTextId(null);
                              }}
                              autoFocus
                              className="bg-white/90 text-black px-2 py-1 rounded border-2 border-blue-500 min-w-[100px]"
                              data-testid={`text-input-${textBox.id}`}
                            />
                          ) : (
                            <div className="relative group">
                              <div className="bg-white/90 text-black px-2 py-1 rounded font-medium text-5xl select-none shadow-lg">
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
                    </>
                  )}
                </div>

                {/* Zoom Controls */}
                <div className="flex items-center justify-center gap-2 mb-4">
                  <Button
                    variant="outline"
                    size="icon"
                    className="w-8 h-8 bg-white/10 border-white/30 text-white hover:bg-white/20"
                    onClick={() => {
                      const minS = fitScale * 0.1;
                      const newScale = Math.max(minS, imageScale - 0.1);
                      updateState({ imageScale: newScale });
                    }}
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
                    onClick={() => {
                      const maxS = fitScale * 3;
                      const newScale = Math.min(maxS, imageScale + 0.1);
                      updateState({ imageScale: newScale });
                    }}
                    data-testid="button-zoom-in"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </Button>
                </div>

                {/* Add Text Button */}
                <Button
                  variant="outline"
                  onClick={addTextBox}
                  className="w-full mb-2 bg-white/10 border-white/30 text-white hover:bg-white/20"
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
              {/* <div className="text-center">
                <p className="text-sm font-medium truncate text-white">
                  {selectedImage?.name}
                </p>
                <p className="text-xs text-white/60">
                  {selectedImage && (selectedImage.size / 1024).toFixed(1)} KB
                </p>
              </div> */}
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
          if (!previewUrl) return; // 必须有上传图

          try {
            // ① 从编辑视图导出当前裁剪（含拖拽/缩放/文字；若你有预览滤镜覆盖，这里用“Edit版”的导出函数）
            const file = await exportCroppedPngFromView(previewUrl);
            // 若你还没新建 exportForEdit，也可以用你现有的 exportCroppedPngFromView(previewUrl)

            // ② 回写父层，确保下一页也用这张图
            onImageSelect(file);

            // ③ 生成预览 QR（原来 Preview 按钮的逻辑）
            const base64Image = await generateQrCodeUtil(
              "https://instagram.com",
              file,
            );
            setPreviewQR(base64Image);

            // ④ 跳到下一页（Preview Page）
            onContinue();
          } catch (err) {
            console.error("Continue->Preview failed:", err);
          }
        }}
        className="w-full h-12 bg-white/20 border border-white/30 text-white hover:bg-white/30 rounded-md"
        data-testid="button-continue"
      >
        Continue
      </Button>
    </div>
  );
}
