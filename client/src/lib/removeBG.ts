import * as ort from "onnxruntime-web";

// Global configuration for ONNX Runtime
ort.env.wasm.wasmPaths = "/ort/";
ort.env.wasm.numThreads = 1; // Use single thread to avoid COOP/COEP issues

// Use a single, shared session to avoid reloading the model
let session: ort.InferenceSession | null = null;

async function ensureSession() {
  // Triple-check we are using the small model
  const modelPath = "/models/u2netp.onnx";

  if (!session) {
    console.log(
      `[DEBUG] Session is null. Creating new session from: ${modelPath}`,
    );
    try {
      session = await ort.InferenceSession.create(modelPath, {
        executionProviders: ["wasm"],
      });
      console.log("[DEBUG] Session created successfully.");
    } catch (e) {
      console.error("[DEBUG] CRITICAL: Failed to create session.", e);
      throw e; // Re-throw the error to be caught by the UI
    }
  } else {
    console.log("[DEBUG] Session already exists. Re-using it.");
  }
}

// In removeBG.ts

export async function removeBackground(imageFile: File): Promise<string> {
  console.log("[DEBUG] --- Starting removeBackground ---");
  try {
    console.log("[DEBUG] Step 1: Ensuring session...");
    await ensureSession();
    console.log("[DEBUG] Step 2: Session ensured.");

    if (!session) {
      throw new Error("Session is null after initialization.");
    }

    console.log("[DEBUG] Step 3: Loading image...");
    const img = await loadImage(imageFile);
    console.log(
      `[DEBUG] Step 4: Image loaded. Dimensions: ${img.width}x${img.height}`,
    );

    console.log("[DEBUG] Step 5: Preprocessing image...");
    const [inputTensor, originalWidth, originalHeight] =
      await preprocessImage(img);
    console.log("[DEBUG] Step 6: Image preprocessed.");

    console.log("[DEBUG] Step 7: Running inference (model.run)...");

    // --- THIS IS THE FIX ---
    const feeds = { "input.1": inputTensor }; // Use the correct input name "input.1"
    // -----------------------

    const results = await session.run(feeds);

    console.log("[DEBUG] Step 8: Inference complete.");

    const output = results[Object.keys(results)[0]];

    console.log("[DEBUG] Step 9: Applying mask to the image...");
    const resultImageUrl = await applyMask(
      img,
      output,
      originalWidth,
      originalHeight,
    );

    console.log("[DEBUG] --- Finished removeBackground Successfully ---");
    return resultImageUrl;
  } catch (error) {
    console.error("[DEBUG] An error occurred in removeBackground:", error);
    throw error;
  }
}
// --- HELPER FUNCTIONS (unchanged) ---

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    console.log("[DEBUG] loadImage: Creating image object.");
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      console.log("[DEBUG] loadImage: Image loaded into object.");
      URL.revokeObjectURL(img.src); // Clean up memory
      resolve(img);
    };
    img.onerror = (err) => {
      console.error("[DEBUG] loadImage: Error loading image.", err);
      reject(err);
    };
    img.src = URL.createObjectURL(file);
    console.log("[DEBUG] loadImage: Set image src to object URL.");
  });
}

async function preprocessImage(
  img: HTMLImageElement,
): Promise<[ort.Tensor, number, number]> {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  const targetSize = 320;
  canvas.width = targetSize;
  canvas.height = targetSize;

  ctx.drawImage(img, 0, 0, targetSize, targetSize);
  const imageData = ctx.getImageData(0, 0, targetSize, targetSize);
  const { data } = imageData;
  const float32Data = new Float32Array(3 * targetSize * targetSize);

  for (let i = 0; i < targetSize * targetSize; i++) {
    float32Data[i] = (data[i * 4] / 255.0 - 0.485) / 0.229; // R
    float32Data[targetSize * targetSize + i] =
      (data[i * 4 + 1] / 255.0 - 0.456) / 0.224; // G
    float32Data[targetSize * targetSize * 2 + i] =
      (data[i * 4 + 2] / 255.0 - 0.406) / 0.225; // B
  }

  const inputTensor = new ort.Tensor("float32", float32Data, [
    1,
    3,
    targetSize,
    targetSize,
  ]);
  return [inputTensor, img.width, img.height];
}

async function applyMask(
  img: HTMLImageElement,
  maskTensor: ort.Tensor,
  originalWidth: number,
  originalHeight: number,
): Promise<string> {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  canvas.width = originalWidth;
  canvas.height = originalHeight;
  ctx.drawImage(img, 0, 0, originalWidth, originalHeight);
  const imageData = ctx.getImageData(0, 0, originalWidth, originalHeight);

  const maskSize = Math.sqrt(maskTensor.data.length);
  const maskCanvas = document.createElement("canvas");
  const maskCtx = maskCanvas.getContext("2d")!;
  maskCanvas.width = maskSize;
  maskCanvas.height = maskSize;

  const maskImageData = maskCtx.createImageData(maskSize, maskSize);
  const maskData = maskTensor.data as Float32Array;

  let minVal = Infinity,
    maxVal = -Infinity;
  maskData.forEach((val) => {
    if (val < minVal) minVal = val;
    if (val > maxVal) maxVal = val;
  });

  const range = maxVal - minVal;
  for (let i = 0; i < maskData.length; i++) {
    const normalized = ((maskData[i] - minVal) / range) * 255;
    maskImageData.data[i * 4 + 0] = normalized;
    maskImageData.data[i * 4 + 1] = normalized;
    maskImageData.data[i * 4 + 2] = normalized;
    maskImageData.data[i * 4 + 3] = 255;
  }
  maskCtx.putImageData(maskImageData, 0, 0);

  const resizedMaskCanvas = document.createElement("canvas");
  const resizedMaskCtx = resizedMaskCanvas.getContext("2d")!;
  resizedMaskCanvas.width = originalWidth;
  resizedMaskCanvas.height = originalHeight;
  resizedMaskCtx.drawImage(maskCanvas, 0, 0, originalWidth, originalHeight);

  const resizedMaskData = resizedMaskCtx.getImageData(
    0,
    0,
    originalWidth,
    originalHeight,
  );
  for (let i = 0; i < imageData.data.length / 4; i++) {
    imageData.data[i * 4 + 3] = resizedMaskData.data[i * 4];
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL("image/png");
}
