import * as ort from 'onnxruntime-web';

export async function removeBackground(imageFile: File): Promise<string> {
  // Load the image
  const img = await loadImage(imageFile);
  
  // Preprocess image
  const [inputTensor, originalWidth, originalHeight] = await preprocessImage(img);
  
  // Run inference
  const session = await ort.InferenceSession.create('/models/u2net.onnx');
  const feeds = { input: inputTensor };
  const results = await session.run(feeds);
  
  // Get the mask output
  const output = results[Object.keys(results)[0]];
  
  // Postprocess and apply mask
  const resultImageUrl = await applyMask(img, output, originalWidth, originalHeight);
  
  return resultImageUrl;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

async function preprocessImage(img: HTMLImageElement): Promise<[ort.Tensor, number, number]> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  
  const targetSize = 320;
  canvas.width = targetSize;
  canvas.height = targetSize;
  
  // Draw and resize image
  ctx.drawImage(img, 0, 0, targetSize, targetSize);
  
  // Get image data
  const imageData = ctx.getImageData(0, 0, targetSize, targetSize);
  const { data } = imageData;
  
  // Normalize to [-1, 1] and convert to CHW format
  const float32Data = new Float32Array(3 * targetSize * targetSize);
  
  for (let i = 0; i < targetSize * targetSize; i++) {
    float32Data[i] = (data[i * 4] / 255.0 - 0.485) / 0.229; // R
    float32Data[targetSize * targetSize + i] = (data[i * 4 + 1] / 255.0 - 0.456) / 0.224; // G
    float32Data[targetSize * targetSize * 2 + i] = (data[i * 4 + 2] / 255.0 - 0.406) / 0.225; // B
  }
  
  const inputTensor = new ort.Tensor('float32', float32Data, [1, 3, targetSize, targetSize]);
  
  return [inputTensor, img.width, img.height];
}

async function applyMask(
  img: HTMLImageElement,
  maskTensor: ort.Tensor,
  originalWidth: number,
  originalHeight: number
): Promise<string> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  
  canvas.width = originalWidth;
  canvas.height = originalHeight;
  
  // Draw original image
  ctx.drawImage(img, 0, 0, originalWidth, originalHeight);
  const imageData = ctx.getImageData(0, 0, originalWidth, originalHeight);
  
  // Resize mask to match original image size
  const maskSize = Math.sqrt(maskTensor.data.length);
  const maskCanvas = document.createElement('canvas');
  const maskCtx = maskCanvas.getContext('2d')!;
  maskCanvas.width = maskSize;
  maskCanvas.height = maskSize;
  
  const maskImageData = maskCtx.createImageData(maskSize, maskSize);
  const maskData = maskTensor.data as Float32Array;
  
  // Normalize mask values
  let minVal = Infinity;
  let maxVal = -Infinity;
  for (let i = 0; i < maskData.length; i++) {
    minVal = Math.min(minVal, maskData[i]);
    maxVal = Math.max(maxVal, maskData[i]);
  }
  
  for (let i = 0; i < maskData.length; i++) {
    const normalized = ((maskData[i] - minVal) / (maxVal - minVal)) * 255;
    maskImageData.data[i * 4] = normalized;
    maskImageData.data[i * 4 + 1] = normalized;
    maskImageData.data[i * 4 + 2] = normalized;
    maskImageData.data[i * 4 + 3] = 255;
  }
  
  maskCtx.putImageData(maskImageData, 0, 0);
  
  // Resize mask to original dimensions
  const resizedMaskCanvas = document.createElement('canvas');
  const resizedMaskCtx = resizedMaskCanvas.getContext('2d')!;
  resizedMaskCanvas.width = originalWidth;
  resizedMaskCanvas.height = originalHeight;
  resizedMaskCtx.drawImage(maskCanvas, 0, 0, originalWidth, originalHeight);
  
  const resizedMaskData = resizedMaskCtx.getImageData(0, 0, originalWidth, originalHeight);
  
  // Apply mask to alpha channel
  for (let i = 0; i < imageData.data.length / 4; i++) {
    const alpha = resizedMaskData.data[i * 4];
    imageData.data[i * 4 + 3] = alpha;
  }
  
  ctx.putImageData(imageData, 0, 0);
  
  return canvas.toDataURL('image/png');
}
