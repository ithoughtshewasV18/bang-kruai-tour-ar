import {
  FilesetResolver,
  ImageSegmenter
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/+esm";

const SQUARE_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite";
const LANDSCAPE_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter_landscape/float16/latest/selfie_segmenter_landscape.tflite";
const WASM_URL =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm";

const video = document.querySelector("#cameraVideo");
const outputCanvas = document.querySelector("#outputCanvas");
const outputCtx = outputCanvas.getContext("2d", { alpha: false });
const personCanvas = document.querySelector("#personCanvas");
const personCtx = personCanvas.getContext("2d");
const maskCanvas = document.querySelector("#maskCanvas");
const maskCtx = maskCanvas.getContext("2d", { willReadFrequently: true });

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
let personSeen = false;
let savedPhotoUrl = null;
let busySegmenting = false;

function isPortraitDevice() {
  return window.matchMedia("(orientation: portrait)").matches ||
    window.innerHeight > window.innerWidth;
}

function withTimeout(promise, milliseconds, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error(`${label} timed out after ${milliseconds / 1000} seconds.`)),
        milliseconds
      )
    )
  ]);
}

function setLoading(message) {
  loadingMessage.textContent = message;
}

function resizeCanvases() {
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
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

  const width = mask.width;
  const height = mask.height;

  if (maskCanvas.width !== width || maskCanvas.height !== height) {
    maskCanvas.width = width;
    maskCanvas.height = height;
  }

  const imageData = maskCtx.createImageData(width, height);
  let visiblePixels = 0;

  for (let i = 0; i < data.length; i++) {
    const raw = data[i];
    const confidence = raw > 1 ? raw / 255 : raw;

    // Preserve fine hair and ear edges without making the background too noisy.
    const feathered = Math.max(0, Math.min(1, (confidence - 0.06) / 0.52));
    const alpha = Math.round(feathered * 255);

    imageData.data[i * 4] = 255;
    imageData.data[i * 4 + 1] = 255;
    imageData.data[i * 4 + 2] = 255;
    imageData.data[i * 4 + 3] = alpha;

    if (confidence > 0.42) visiblePixels++;
  }

  maskCtx.putImageData(imageData, 0, 0);
  latestPersonMask = maskCanvas;
  personSeen = visiblePixels > data.length * 0.02;
}

async function createSegmenter() {
  const useSquareModel = isPortraitDevice();
  const modelUrl = useSquareModel ? SQUARE_MODEL_URL : LANDSCAPE_MODEL_URL;

  setLoading(
    useSquareModel
      ? "Loading the portrait selfie model…"
      : "Loading the landscape selfie model…"
  );

  const vision = await withTimeout(
    FilesetResolver.forVisionTasks(WASM_URL),
    30000,
    "MediaPipe engine"
  );

  return withTimeout(
    ImageSegmenter.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: modelUrl,
        delegate: "CPU"
      },
      runningMode: "VIDEO",
      outputConfidenceMasks: true,
      outputCategoryMask: false
    }),
    45000,
    "Person segmentation model"
  );
}

async function openCamera() {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("This browser does not support camera access.");
  }

  if (stream) stream.getTracks().forEach(track => track.stop());

  setLoading("Opening your camera…");

  const portrait = isPortraitDevice();

  stream = await withTimeout(
    navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: { ideal: facingMode },
        width: { ideal: portrait ? 720 : 960 },
        height: { ideal: portrait ? 1280 : 540 },
        aspectRatio: { ideal: portrait ? 9 / 16 : 16 / 9 }
      }
    }),
    20000,
    "Camera permission"
  );

  video.srcObject = stream;
  await video.play();
}

async function startExperience() {
  startButton.disabled = true;
  startButton.textContent = "Loading…";
  setLoading("Preparing Wat Chalo AR Photo…");

  try {
    await openCamera();

    await withTimeout(
      backgroundImage.decode().catch(() => undefined),
      10000,
      "Wat Chalo background"
    );

    segmenter = await createSegmenter();

    running = true;
    startScreen.classList.add("hidden");
    topBar.classList.remove("hidden");
    controls.classList.remove("hidden");
    resizeCanvases();
    requestAnimationFrame(renderLoop);
  } catch (error) {
    console.error("AR startup failed:", error);
    stream?.getTracks().forEach(track => track.stop());
    stream = null;
    startButton.disabled = false;
    startButton.textContent = "Try Again";
    setLoading(`Could not start: ${error.message}`);
  }
}

function drawPerson() {
  const width = personCanvas.width;
  const height = personCanvas.height;

  const videoCrop = coverRect(
    video.videoWidth,
    video.videoHeight,
    width,
    height
  );

  const mirror = facingMode === "user";

  personCtx.clearRect(0, 0, width, height);
  personCtx.save();

  if (mirror) {
    personCtx.translate(width, 0);
    personCtx.scale(-1, 1);
  }

  personCtx.drawImage(
    video,
    videoCrop.sx,
    videoCrop.sy,
    videoCrop.sw,
    videoCrop.sh,
    0,
    0,
    width,
    height
  );

  personCtx.restore();

  if (!latestPersonMask) {
    personCtx.clearRect(0, 0, width, height);
    return;
  }

  const normX = videoCrop.sx / video.videoWidth;
  const normY = videoCrop.sy / video.videoHeight;
  const normW = videoCrop.sw / video.videoWidth;
  const normH = videoCrop.sh / video.videoHeight;

  const maskSX = normX * latestPersonMask.width;
  const maskSY = normY * latestPersonMask.height;
  const maskSW = normW * latestPersonMask.width;
  const maskSH = normH * latestPersonMask.height;

  personCtx.globalCompositeOperation = "destination-in";
  personCtx.save();

  if (mirror) {
    personCtx.translate(width, 0);
    personCtx.scale(-1, 1);
  }

  personCtx.imageSmoothingEnabled = true;
  personCtx.filter = "blur(1px)";
  personCtx.drawImage(
    latestPersonMask,
    maskSX,
    maskSY,
    maskSW,
    maskSH,
    0,
    0,
    width,
    height
  );
  personCtx.filter = "none";
  personCtx.restore();
  personCtx.globalCompositeOperation = "source-over";
}

function processFrame() {
  if (
    !segmenter ||
    busySegmenting ||
    video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA ||
    video.currentTime === lastVideoTime
  ) return;

  busySegmenting = true;
  lastVideoTime = video.currentTime;

  try {
    segmenter.segmentForVideo(video, performance.now(), (result) => {
      try {
        const masks = result.confidenceMasks || [];
        const personMask = masks[1] || masks[0];

        if (personMask) updateMask(personMask);

        masks.forEach(mask => {
          if (mask !== personMask && mask.close) mask.close();
        });
      } finally {
        busySegmenting = false;
      }
    });
  } catch (error) {
    console.error("Segmentation frame failed:", error);
    busySegmenting = false;
  }
}

function renderLoop() {
  if (!running) return;

  resizeCanvases();
  processFrame();

  drawBackground(outputCtx, outputCanvas.width, outputCanvas.height);
  drawPerson();
  outputCtx.drawImage(personCanvas, 0, 0);

  statusText.textContent = latestPersonMask
    ? (personSeen ? "Ready for your photo" : "Step into the camera view")
    : "Starting person detection…";

  requestAnimationFrame(renderLoop);
}

async function switchCamera() {
  switchCameraButton.disabled = true;
  const oldMode = facingMode;
  facingMode = facingMode === "user" ? "environment" : "user";

  try {
    await openCamera();
    lastVideoTime = -1;
    latestPersonMask = null;
  } catch {
    facingMode = oldMode;
    await openCamera();
  } finally {
    switchCameraButton.disabled = false;
  }
}

function capturePhoto() {
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
