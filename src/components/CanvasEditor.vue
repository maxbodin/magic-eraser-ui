<script lang="ts" setup>
import { nextTick, onMounted, ref, watch } from "vue";

const props = defineProps<{
  imageSrc: string;
  loading: boolean;
}>();

const emit = defineEmits<{
  ( e: "erase", payload: { imageBlob: Blob; maskBlob: Blob; aspectRatio: number } ): void
  ( e: "reset" ): void
}>();

const OPTIMIZED_MAX_DIMENSION = 1080;
const MASK_COLOR = "rgb(255, 0, 0)";
const BRUSH_SIZE_BASE = 30;

const imageCanvasRef = ref<HTMLCanvasElement | null>( null );
const drawingCanvasRef = ref<HTMLCanvasElement | null>( null );
const loadedImage = ref<HTMLImageElement | null>( null );
const isDrawing = ref( false );

const intrinsicSize = ref( { width: 0, height: 0 } );
const aspectRatio = ref<number | null>( null );

type Tool = "pen" | "eraser";
const tool = ref<Tool>( "pen" );

watch( () => props.imageSrc, ( newSrc ) => {
  if (newSrc) {
    loadImage( newSrc );
  } else {
    clearCanvases();
  }
} );

onMounted( () => {
  if (props.imageSrc) {
    loadImage( props.imageSrc );
  }
} );

/**
 * Loads an image from a source URL.
 * @param src The source URL of the image.
 */
const loadImage = ( src: string ) => {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = () => {
    intrinsicSize.value = { width: img.naturalWidth, height: img.naturalHeight };
    aspectRatio.value = img.naturalWidth / img.naturalHeight;
    loadedImage.value = img;
    // Wait for the DOM to update before drawing to the canvas.
    nextTick( () => drawImageToCanvas( img ) );
  };
  img.src = src;
};

/**
 * Clears and draws the loaded image onto the base canvas, and clears the drawing canvas.
 * @param img The HTMLImageElement to draw.
 */
const drawImageToCanvas = ( img: HTMLImageElement ) => {
  const imageCanvas = imageCanvasRef.value;
  const drawingCanvas = drawingCanvasRef.value;
  if (!imageCanvas || !drawingCanvas) return;

  for (const canvas of [imageCanvas, drawingCanvas]) {
    canvas.width = intrinsicSize.value.width;
    canvas.height = intrinsicSize.value.height;
  }

  // Draw the image onto the bottom (image) canvas.
  const imageCtx = imageCanvas.getContext( "2d" );
  if (imageCtx) {
    imageCtx.drawImage( img, 0, 0, imageCanvas.width, imageCanvas.height );
  }

  // Ensure the top (drawing) canvas is clear.
  const drawingCtx = drawingCanvas.getContext( "2d" );
  if (drawingCtx) {
    drawingCtx.clearRect( 0, 0, drawingCanvas.width, drawingCanvas.height );
  }
};

/**
 * Clears both canvases.
 */
const clearCanvases = () => {
  loadedImage.value = null;
  intrinsicSize.value = { width: 0, height: 0 };
  aspectRatio.value = null;
  const canvases = [imageCanvasRef.value, drawingCanvasRef.value];
  for (const canvas of canvases) {
    if (canvas) {
      const ctx = canvas.getContext( "2d" );
      ctx?.clearRect( 0, 0, canvas.width, canvas.height );
    }
  }
};

/**
 * Calculates the mouse coordinates relative to the canvas, scaling for display size.
 * @param e The MouseEvent.
 * @returns The {x, y} coordinates on the canvas.
 */
const getCanvasCoordinates = ( e: MouseEvent | TouchEvent ) => {
  const canvas = drawingCanvasRef.value;
  if (!canvas) return { x: 0, y: 0 };

  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  let clientX = 0;
  let clientY = 0;

  if (e instanceof MouseEvent) {
    clientX = e.clientX;
    clientY = e.clientY;
  } else {
    const touch = e.touches[0];
    if (touch) {
      clientX = touch.clientX;
      clientY = touch.clientY;
    }
  }

  return {
    x: ( clientX - rect.left ) * scaleX,
    y: ( clientY - rect.top ) * scaleY,
  };
};

const setupBrush = ( ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement ) => {
  const scaleRatio = canvas.width / canvas.clientWidth;
  ctx.lineWidth = BRUSH_SIZE_BASE * scaleRatio;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (tool.value === "pen") {
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = MASK_COLOR;
  } else {
    ctx.globalCompositeOperation = "destination-out";
  }
};

/**
 * Begins a new drawing path when the user presses the mouse button.
 */
const startDrawing = ( e: MouseEvent | TouchEvent ) => {
  const canvas = drawingCanvasRef.value;
  if (!canvas) return;
  const ctx = canvas.getContext( "2d" );
  if (!ctx) return;

  isDrawing.value = true;
  setupBrush( ctx, canvas );
  const { x, y } = getCanvasCoordinates( e );
  ctx.beginPath();
  ctx.moveTo( x, y );

  ctx.lineTo( x, y );
  ctx.stroke();
};

/**
 * Stops the drawing process when the user releases the mouse button or leaves the canvas.
 */
const stopDrawing = () => {
  isDrawing.value = false;
};

/**
 * Draws a line segment on the drawing canvas as the user moves the mouse.
 */
const draw = ( e: MouseEvent | TouchEvent ) => {
  if (!isDrawing.value) return;
  const canvas = drawingCanvasRef.value;
  if (!canvas) return;
  const ctx = canvas.getContext( "2d" );
  if (!ctx) return;

  const { x, y } = getCanvasCoordinates( e );
  ctx.lineTo( x, y );
  ctx.stroke();
};

/**
 * Converts a canvas element to a Blob.
 * @param canvas The HTMLCanvasElement to convert.
 * @param mimeType
 * @param quality
 * @returns A Promise that resolves with the Blob or null.
 */
const canvasToBlob = ( canvas: HTMLCanvasElement, mimeType = "image/jpeg", quality = 0.8 ): Promise<Blob | null> => {
  return new Promise( ( resolve ) => canvas.toBlob( ( blob ) => resolve( blob ), mimeType, quality ) );
};

/**
 * Processes the canvases to generate image and mask blobs, then emits the result.
 */
const processAndEmit = async () => {
  if (!drawingCanvasRef.value || !loadedImage.value || !imageCanvasRef.value) return;

  const drawingCanvas = drawingCanvasRef.value;
  const origWidth = drawingCanvas.width;
  const origHeight = drawingCanvas.height;

  const scale = Math.min( OPTIMIZED_MAX_DIMENSION / origWidth, OPTIMIZED_MAX_DIMENSION / origHeight, 1 );
  const optWidth = Math.round( ( origWidth * scale ) / 8 ) * 8;
  const optHeight = Math.round( ( origHeight * scale ) / 8 ) * 8;

  const dCtx = drawingCanvas.getContext( "2d", { willReadFrequently: true } );
  if (!dCtx) return;

  const drawingData = dCtx.getImageData( 0, 0, origWidth, origHeight );
  let hasMask = false;
  // Iterate over pixels. If alpha on drawing canvas > 0, it's part of the mask.
  const drawingDataArray = drawingData.data;
  if (drawingDataArray && drawingDataArray.length > 0) {
    for (let i = 3; i < drawingDataArray.length; i += 4) {
      // Check the alpha channel (index i + 3).
      if (drawingDataArray[i]! > 0) {
        hasMask = true;
        break;
      }
    }
  }

  if (!hasMask) {
    alert( "Please draw a mask over an object to remove it first." );
    return;
  }

  const maskCanvas = document.createElement( "canvas" );
  maskCanvas.width = optWidth;
  maskCanvas.height = optHeight;
  const mCtx = maskCanvas.getContext( "2d" );
  if (!mCtx) return;

  // Start with black background (areas to keep).
  mCtx.fillStyle = "black";
  mCtx.fillRect( 0, 0, optWidth, optHeight );

  // Draw the resized drawing canvas.
  mCtx.drawImage( drawingCanvas, 0, 0, origWidth, origHeight, 0, 0, optWidth, optHeight );

  // Extract the mask: convert red strokes to white, keep everything else black.
  const maskImageData = mCtx.getImageData( 0, 0, optWidth, optHeight );
  const maskData = maskImageData.data;

  for (let i = 0; i < maskData.length; i += 4) {
    const r = maskData[i] ?? 0;
    const g = maskData[i + 1] ?? 0;
    const b = maskData[i + 2] ?? 0;

    // If pixel is red (drawn area), make it white.
    // Red means: R high, G low, B low.
    if (r > 200 && g < 100 && b < 100) {
      maskData[i] = 255;     // R
      maskData[i + 1] = 255; // G
      maskData[i + 2] = 255; // B
      maskData[i + 3] = 255; // A
    } else {
      // Keep everything else black (areas to preserve).
      maskData[i] = 0;
      maskData[i + 1] = 0;
      maskData[i + 2] = 0;
      maskData[i + 3] = 255;
    }
  }

  mCtx.putImageData( maskImageData, 0, 0 );

  const originalCanvas = document.createElement( "canvas" );
  originalCanvas.width = optWidth;
  originalCanvas.height = optHeight;
  const oCtx = originalCanvas.getContext( "2d" );
  if (oCtx) {
    oCtx.drawImage( loadedImage.value, 0, 0, optWidth, optHeight );
  }

  const imageBlob = await canvasToBlob( originalCanvas, "image/jpeg", 0.8 );
  const maskBlob = await canvasToBlob( maskCanvas, "image/png" );

  if (imageBlob && maskBlob && aspectRatio.value) {
    emit( "erase", { imageBlob, maskBlob, aspectRatio: aspectRatio.value } );
  }
};
</script>

<template>
  <section class="p-6 rounded-2xl shadow-xl flex flex-col w-full max-w-2xl mx-auto">
    <header class="flex justify-between items-center mb-4 w-full">
      <h3 class="text-xl font-bold text-slate-800">Mask Object</h3>
      <button
          aria-label="Reset workspace"
          class="text-sm text-slate-400 hover:text-rose-500 font-medium transition-colors"
          @click="emit('reset')"
      >
        ✕ Reset
      </button>
    </header>

    <!-- Tool Controls -->
    <div aria-label="Drawing Tools" class="flex justify-center items-center gap-4 mb-4" role="toolbar">
      <button
          :aria-pressed="tool === 'pen'"
          class="px-5 py-2 rounded-lg font-semibold transition-colors aria-pressed:bg-emerald-500 aria-pressed:text-white bg-slate-200 text-slate-700 hover:bg-slate-300"
          @click="tool = 'pen'"
      >
        Pen
      </button>
      <button
          :aria-pressed="tool === 'eraser'"
          class="px-5 py-2 rounded-lg font-semibold transition-colors aria-pressed:bg-emerald-500 aria-pressed:text-white bg-slate-200 text-slate-700 hover:bg-slate-300"
          @click="tool = 'eraser'"
      >
        Eraser
      </button>
    </div>

    <figure
        :style="{
          aspectRatio: aspectRatio ? `${aspectRatio}` : 'auto',
          maxWidth: '100%',
        }"
        class="relative mb-6 w-full mx-auto border border-slate-200 shadow-inner rounded-xl overflow-hidden shrink-0 bg-slate-50"
        style="background-image: url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2220%22 height=%2220%22><rect width=%2210%22 height=%2210%22 fill=%22%23e2e8f0%22/><rect x=%2210%22 y=%2210%22 width=%2210%22 height=%2210%22 fill=%22%23e2e8f0%22/></svg>')"
    >
      <canvas
          ref="imageCanvasRef"
          aria-hidden="true"
          class="absolute top-0 left-0 w-full h-full rounded-xl"
      ></canvas>
      <canvas
          ref="drawingCanvasRef"
          aria-label="Interactive drawing area to mask objects"
          class="absolute top-0 left-0 w-full h-full cursor-crosshair opacity-50 touch-none rounded-xl"
          @mousedown="startDrawing"
          @mouseleave="stopDrawing"
          @mousemove="draw"
          @mouseup="stopDrawing"
          @touchstart.prevent="startDrawing"
          @touchmove.prevent="draw"
          @touchend.prevent="stopDrawing"
      ></canvas>
    </figure>

    <div class="mt-auto">
      <button
          :disabled="loading"
          class="w-full bg-linear-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white border-none py-4 px-6 text-lg rounded-xl cursor-pointer font-bold flex justify-center items-center gap-3 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/30"
          @click="processAndEmit"
      >
        <svg v-if="loading" class="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"
             xmlns="http://www.w3.org/2000/svg">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                fill="currentColor"></path>
        </svg>
        <span>{{ loading ? "Generating Variations..." : "Erase Object" }}</span>
      </button>
    </div>
  </section>
</template>