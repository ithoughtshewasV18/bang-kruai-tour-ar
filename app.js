import {
  FilesetResolver,
  ImageSegmenter
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/+esm";

const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter_landscape/float16/latest/selfie_segmenter_landscape.tflite";
const WASM_URL =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/wasm";

const video = document.querySelector("#cameraVideo");
const outputCanvas = document.querySelector("#outputCanvas");
const outputCtx = outputCanvas.getContext("2d", { alpha: false });
const personCanvas = document.querySelector("#personCanvas");
const personCtx = personCanvas.getContext("2d");
const maskCanvas = document.querySelector("#maskCanvas");
const maskCtx = maskCanvas.getContext("2d");

const startScreen = document.querySelector("#startScreen");
const startButton = document.querySelector("#startButton");
const loadingMessage = document.querySelector("#loadingMessage");
const topBar = document.querySelector("#topBar");
const controls = document.querySelector("#controls");
const switchCameraButton = document.querySelector("#switchCameraButton");
const captureButton = document.querySelector("#captureButton");
const statusText = document.querySelector("#statusText");

const modal = document.querySelector("#photoModal");
const photoPreview = document.querySelector("#photoPreview");
const saveButton = document.querySelector("#saveButton");
const retakeButton = document.querySelector("#retakeButton");

const backgroundImage = new Image();
backgroundImage.src = "./wat-chalo-background.jpg";

let segmenter = null;
let stream = null;
let facingMode = "user";
let running = false;
let lastVideoTime = -1;
let latestPersonMask = null;
let maskWidth = 0;
let maskHeight = 0;
let personSeen = false;
let savedPhotoUrl = null;

function resizeCanvases() {
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.max(1, Math.round(window.innerWidth * pixelRatio));
  const height = Math.max(1, Math.round(window.innerHeight * pixelRatio));

  if (outputCanvas.width !== width || outputCanvas.height !== height) {
    outputCanvas.width = width;
    outputCanvas.height = height;
    personCanvas.width = width;
    personCanvas.height = height;
  }
}

function coverRect(sourceWidth, sourceHeight, targetWidth, targetHeight) {
  const sourceRatio = sourceWidth / sourceHeight;
  const targetRatio = targetWidth / targetHeight;

  if (sourceRatio > targetRatio) {
    const sw = sourceHeight * targetRatio;
    return { sx: (sourceWidth - sw) / 2, sy: 0, sw, sh: sourceHeight };
  }

  const sh = sourceWidth / targetRatio;
  return { sx: 0, sy: (sourceHeight - sh) / 2, sw: sourceWidth, sh };
}

function drawBackground(ctx, width, height) {
  if (!backgroundImage.complete || !backgroundImage.naturalWidth) {
    ctx.fillStyle = "#23170f";
    ctx.fillRect(0, 0, width, height);
    return;
  }

  const crop = coverRect(
    backgroundImage.naturalWidth,
    backgroundImage.naturalHeight,
    width,
    height
  );

  ctx.drawImage(
    backgroundImage,
    crop.sx, crop.sy, crop.sw, crop.sh,
    0, 0, width, height
  );
}

function updateMask(mask) {
  const data = mask.getAsFloat32Array
    ? mask.getAsFloat32Array()
    : mask.getAsUint8Array();

  maskWidth = mask.width;
  maskHeight = mask.height;

  if (maskCanvas.width !== maskWidth || maskCanvas.height !== maskHeight) {
    maskCanvas.width = maskWidth;
    maskCanvas.height = maskHeight;
  }

  const imageData = maskCtx.createImageData(maskWidth, maskHeight);
  let visiblePixels = 0;

  for (let i = 0; i < data.length; i++) {
    // Confidence masks are 0..1. Category masks are 0 or 1.
    const raw = data[i];
    const confidence = raw > 1 ? raw / 255 : raw;
    const softened = Math.max(0, Math.min(1, (confidence - 0.18) / 0.65));
    const alpha = Math.round(softened * 255);

    imageData.data[i * 4] = 255;
    imageData.data[i * 4 + 1] = 255;
    imageData.data[i * 4 + 2] = 255;
    imageData.data[i * 4 + 3] = alpha;

    if (confidence > 0.55) visiblePixels++;
  }

  maskCtx.putImageData(imageData, 0, 0);
  latestPersonMask = maskCanvas;
  personSeen = visiblePixels > data.length * 0.025;
}

async function createSegmenter() {
  const vision = await FilesetResolver.forVisionTasks(WASM_URL);

  return ImageSegmenter.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: MODEL_URL,
      delegate: "GPU"
    },
    runningMode: "VIDEO",
    outputConfidenceMasks: true,
    outputCategoryMask: false
  });
}

async function openCamera() {
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
  }

  stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      facingMode: { ideal: facingMode },
      width: { ideal: 1280 },
      height: { ideal: 720 }
    }
  });

  video.srcObject = stream;
  await video.play();
}

async function startExperience() {
  startButton.disabled = true;
  startButton.textContent = "Loading…";
  loadingMessage.textContent = "Loading the person-segmentation model and opening your camera.";

  try {
    await Promise.all([
      backgroundImage.decode().catch(() => undefined),
      (async () => {
        segmenter = await createSegmenter();
      })()
    ]);

    await openCamera();

    running = true;
    startScreen.classList.add("hidden");
    topBar.classList.remove("hidden");
    controls.classList.remove("hidden");
    requestAnimationFrame(renderLoop);
  } catch (error) {
    console.error(error);
    startButton.disabled = false;
    startButton.textContent = "Try Again";
    loadingMessage.textContent =
      "Camera could not start. Use the HTTPS GitHub Pages address and allow camera access.";
  }
}

function drawMirroredVideoWithMask() {
  const width = personCanvas.width;
  const height = personCanvas.height;
  const crop = coverRect(video.videoWidth, video.videoHeight, width, height);
  const mirror = facingMode === "user";

  personCtx.clearRect(0, 0, width, height);
  personCtx.save();

  if (mirror) {
    personCtx.translate(width, 0);
    personCtx.scale(-1, 1);
  }

  personCtx.drawImage(
    video,
    crop.sx, crop.sy, crop.sw, crop.sh,
    0, 0, width, height
  );
  personCtx.restore();

  if (!latestPersonMask) return;

  personCtx.globalCompositeOperation = "destination-in";
  personCtx.save();

  if (mirror) {
    personCtx.translate(width, 0);
    personCtx.scale(-1, 1);
  }

  personCtx.imageSmoothingEnabled = true;
  personCtx.drawImage(latestPersonMask, 0, 0, width, height);
  personCtx.restore();
  personCtx.globalCompositeOperation = "source-over";
}

function compositeFrame() {
  const width = outputCanvas.width;
  const height = outputCanvas.height;

  drawBackground(outputCtx, width, height);
  drawMirroredVideoWithMask();
  outputCtx.drawImage(personCanvas, 0, 0);

  // Gentle foreground shade for better blending.
  const gradient = outputCtx.createLinearGradient(0, height * 0.6, 0, height);
  gradient.addColorStop(0, "rgba(0,0,0,0)");
  gradient.addColorStop(1, "rgba(0,0,0,0.08)");
  outputCtx.fillStyle = gradient;
  outputCtx.fillRect(0, 0, width, height);
}

function renderLoop() {
  if (!running) return;

  resizeCanvases();

  if (
    segmenter &&
    video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
    video.currentTime !== lastVideoTime
  ) {
    lastVideoTime = video.currentTime;

    try {
      const result = segmenter.segmentForVideo(video, performance.now());
      const personMask = result.confidenceMasks?.[1] || result.confidenceMasks?.[0];

      if (personMask) updateMask(personMask);

      result.confidenceMasks?.forEach(mask => {
        if (mask !== personMask && mask.close) mask.close();
      });
    } catch (error) {
      console.error("Segmentation frame failed:", error);
    }
  }

  compositeFrame();
  statusText.textContent = personSeen ? "Ready for your photo" : "Step into the camera view";
  requestAnimationFrame(renderLoop);
}

async function switchCamera() {
  switchCameraButton.disabled = true;
  facingMode = facingMode === "user" ? "environment" : "user";

  try {
    await openCamera();
    lastVideoTime = -1;
  } catch (error) {
    console.error(error);
    facingMode = facingMode === "user" ? "environment" : "user";
    await openCamera();
  } finally {
    switchCameraButton.disabled = false;
  }
}

function capturePhoto() {
  if (!outputCanvas.width || !outputCanvas.height) return;

  outputCanvas.toBlob(blob => {
    if (!blob) return;

    if (savedPhotoUrl) URL.revokeObjectURL(savedPhotoUrl);
    savedPhotoUrl = URL.createObjectURL(blob);
    photoPreview.src = savedPhotoUrl;
    modal.classList.remove("hidden");
  }, "image/jpeg", 0.94);
}

function savePhoto() {
  if (!savedPhotoUrl) return;

  const link = document.createElement("a");
  link.href = savedPhotoUrl;
  link.download = `wat-chalo-ar-${Date.now()}.jpg`;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

startButton.addEventListener("click", startExperience);
switchCameraButton.addEventListener("click", switchCamera);
captureButton.addEventListener("click", capturePhoto);
saveButton.addEventListener("click", savePhoto);
retakeButton.addEventListener("click", () => modal.classList.add("hidden"));

window.addEventListener("resize", resizeCanvases);
window.addEventListener("beforeunload", () => {
  running = false;
  stream?.getTracks().forEach(track => track.stop());
  segmenter?.close();
  if (savedPhotoUrl) URL.revokeObjectURL(savedPhotoUrl);
});
