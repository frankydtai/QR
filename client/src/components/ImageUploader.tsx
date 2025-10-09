import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Upload, X, ZoomIn, ZoomOut, Type } from "lucide-react";
import { generateQr } from "@/lib/utils";
import { removeBackground } from "@/lib/removeBG"; // 路徑依你的檔案放置調整
import { crop } from "@/lib/utils";
import { convertGray } from "@/lib/utils";
import QRModelSelector, { type QRStyle } from "@/components/QRModelSelector";

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
  setOriginalImageRB: (file: File | null) => void; // ← 新增這行
  setGrayImageRB: (file: File | null) => void; // ← 新增這行
  isColor: boolean;
  isNo: boolean;
  isDiffuse: boolean;
  setSelectedImageRB: (file: File | null) => void;
}

export default function ImageUploader({
  onImageSelect,
  onContinue,
  onBack,
  imageEditState,
  setImageEditState,
  previewQR,
  setPreviewQR,
  setOriginalImageRB,
  setGrayImageRB,
  isColor,
  isNo,
  isDiffuse,
  setSelectedImageRB,
  selectedImage, // ★ 補這個
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

  const { imageURL, imagePosition, imageScale, fitScale, textBoxes } =
    imageEditState;

  const updateState = (updates: Partial<ImageEditState>) => {
    setImageEditState({ ...imageEditState, ...updates });
  };

  // ⬇︎ 替換原本的 handleFileSelect
  const handleFileSelect = async (file: File) => {
    if (!file || !file.type.startsWith("image/")) return;

    // 1) 交給 App：它會依 Model 決定彩色/灰階並回傳最終檔案
    //    確保 onImageSelect 回傳 Promise<File>（App 的 handleImageSelect 要 return finalFile）
    const final = await onImageSelect?.(file);
    const target = final instanceof File ? final : file;

    // 2) 只在這個事件中跑一次去背（返回上一頁不會重跑）
    const w = window.open("", "_blank");
    if (w) {
      w.document.write(`<!doctype html><meta charset="utf-8">
        <title>Removed Background</title>
        <style>
          html,body{height:100%;margin:0;background:#111;color:#eee;
          font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial}
          .wrap{min-height:100%;display:flex;align-items:center;justify-content:center;padding:24px}
        </style><div class="wrap">Processing…</div>`);
      w.document.close();
    }

    try {
      const resultUrl: any = await Promise.resolve(removeBackground(target));
      const s = String(resultUrl ?? "");
      const finalUrl = /^data:|^blob:|^https?:/.test(s)
        ? s
        : `data:image/png;base64,${s}`;

      if (w) {
        w.document.open();
        w.document.write(`<!doctype html><meta charset="utf-8">
          <title>Removed Background</title>
          <style>
            html,body{height:100%;margin:0;background:#111}
            img{max-width:100vw;max-height:100vh;object-fit:contain;display:block;margin:auto}
          </style><img src="${finalUrl}" alt="Removed Background">`);
        w.document.close();
      } else {
        window.open(finalUrl, "_blank");
      }

      const blob = await fetch(finalUrl).then((r) => r.blob());
      const f = new File([blob], "removed.png", { type: "image/png" });
      setOriginalImageRB(f);
      const grayRB = await convertGray(f); // ← 把去背图再转成灰阶
      setGrayImageRB(grayRB);
      setSelectedImageRB(isColor ? f : grayRB);
    } catch (err) {
      console.error("auto remove-bg failed:", err);
      if (w) {
        w.document.open();
        w.document.write(
          `<pre style="color:#eee;background:#111;padding:16px;white-space:pre-wrap;">${String(err)}</pre>`,
        );
        w.document.close();
      }
    }
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
      imageURL: null,
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
        {!imageURL ? (
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
                  <>
                    <img
                      src={imageURL}
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
                            draggingTextId === textBox.id ? "grabbing" : "grab",
                        }}
                        onMouseDown={(e) => handleTextMouseDown(e, textBox.id)}
                        onDoubleClick={() => handleTextDoubleClick(textBox.id)}
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
          if (!imageURL) return; // 必须有上传图

          try {
            // ① 從編輯視圖導出裁剪圖（含拖拽/縮放/文字）
            const croppedImage = await crop(
              imageURL,
              imagePosition,
              imageScale,
              fitScale,
              textBoxes,
            );

            // ② 回寫父層，確保下一頁也用這張圖
            //onImageSelect(file);

            // ③ 生成預覽 QR（原來 Preview 的邏輯）
            const base64Image = await generateQr(
              "https://instagram.com",
              croppedImage,
              { colorHalftone: isColor, noHalftone: isNo, diffuse: isDiffuse },
            );
            setPreviewQR(base64Image);

            // ④ 跳到下一頁（Preview Page）
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
