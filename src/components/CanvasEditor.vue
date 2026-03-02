<script lang="ts" setup>
import { nextTick, onMounted, ref, watch } from "vue";

const props = defineProps<{
  imageSrc: string;
  loading: boolean;
}>();

const emit = defineEmits<{
  ( e: "erase", payload: { imageBlob: Blob; maskBlob: Blob } ): void
  ( e: "reset" ): void
}>();

const CANVAS_WIDTH = 512;
const CANVAS_HEIGHT = 512;
const MASK_COLOR = "rgb(255, 0, 0)";
const BRUSH_SIZE = 30;

const imageCanvasRef = ref<HTMLCanvasElement | null>( null );
const drawingCanvasRef = ref<HTMLCanvasElement | null>( null );
const loadedImage = ref<HTMLImageElement | null>( null );
const isDrawing = ref( false );

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
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
  }

  // Draw the image onto the bottom (image) canvas.
  const imageCtx = imageCanvas.getContext( "2d" );
  if (imageCtx) {
    imageCtx.drawImage( img, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT );
  }

  // Ensure the top (drawing) canvas is clear.
  const drawingCtx = drawingCanvas.getContext( "2d" );
  if (drawingCtx) {
    drawingCtx.clearRect( 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT );
  }
};

/**
 * Clears both canvases.
 */
const clearCanvases = () => {
  loadedImage.value = null;
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
const getCanvasCoordinates = ( e: MouseEvent ) => {
  const canvas = drawingCanvasRef.value;
  if (!canvas) return { x: 0, y: 0 };

  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  return {
    x: ( e.clientX - rect.left ) * scaleX,
    y: ( e.clientY - rect.top ) * scaleY,
  };
};

/**
 * Begins a new drawing path when the user presses the mouse button.
 */
const startDrawing = ( e: MouseEvent ) => {
  const canvas = drawingCanvasRef.value;
  if (!canvas) return;
  const ctx = canvas.getContext( "2d" );
  if (!ctx) return;

  isDrawing.value = true;
  const { x, y } = getCanvasCoordinates( e );
  ctx.beginPath();
  ctx.moveTo( x, y );
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
const draw = ( e: MouseEvent ) => {
  if (!isDrawing.value) return;
  const canvas = drawingCanvasRef.value;
  if (!canvas) return;
  const ctx = canvas.getContext( "2d" );
  if (!ctx) return;

  const { x, y } = getCanvasCoordinates( e );

  ctx.lineWidth = BRUSH_SIZE;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // Set composite operation based on the selected tool.
  if (tool.value === "pen") {
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = MASK_COLOR;
  } else { // eraser
    ctx.globalCompositeOperation = "destination-out";
  }

  ctx.lineTo( x, y );
  ctx.stroke();
};

/**
 * Converts a canvas element to a Blob.
 * @param canvas The HTMLCanvasElement to convert.
 * @returns A Promise that resolves with the Blob or null.
 */
const canvasToBlob = ( canvas: HTMLCanvasElement ): Promise<Blob | null> => {
  return new Promise( ( resolve ) => canvas.toBlob( ( blob ) => resolve( blob ), "image/jpeg", 1 ) );
};

/**
 * Processes the canvases to generate image and mask blobs, then emits the result.
 */
const processAndEmit = async () => {
  if (!drawingCanvasRef.value || !loadedImage.value) return;

  const drawingCanvas = drawingCanvasRef.value;
  const dCtx = drawingCanvas.getContext( "2d", { willReadFrequently: true } );
  if (!dCtx) return;

  const maskCanvas = document.createElement( "canvas" );
  maskCanvas.width = CANVAS_WIDTH;
  maskCanvas.height = CANVAS_HEIGHT;
  const mCtx = maskCanvas.getContext( "2d" );
  if (!mCtx) return;

  mCtx.fillStyle = "black";
  mCtx.fillRect( 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT );

  const drawingData = dCtx.getImageData( 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT );
  const maskData = mCtx.getImageData( 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT );

  let hasMask = false;
  // Iterate over pixels. If alpha on drawing canvas > 0, it's part of the mask.
  for (let i = 0; i < drawingData.data.length; i += 4) {
    // Check the alpha channel (index i + 3).
    if (drawingData.data[i + 3] > 0) {
      // Set pixel to white in the mask data.
      maskData.data.set( [255, 255, 255, 255], i );
      hasMask = true;
    }
  }

  if (!hasMask) {
    alert( "Please draw a mask over an object to remove it first." );
    return;
  }

  mCtx.putImageData( maskData, 0, 0 );

  const originalCanvas = document.createElement( "canvas" );
  originalCanvas.width = CANVAS_WIDTH;
  originalCanvas.height = CANVAS_HEIGHT;
  const oCtx = originalCanvas.getContext( "2d" );
  if (oCtx) {
    oCtx.drawImage( loadedImage.value, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT );
  }

  const imageBlob = await canvasToBlob( originalCanvas );
  const maskBlob = await canvasToBlob( maskCanvas );

  if (imageBlob && maskBlob) {
    emit( "erase", { imageBlob, maskBlob } );
  }
};
</script>

<template>
  <section class="p-6 rounded-2xl shadow-xl flex flex-col w-full max-w-2xl">
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

    <!-- Layered Canvases -->
    <figure
        class="relative mb-6 flex justify-center w-[512px] h-[512px] max-w-full mx-auto border border-slate-200 shadow-inner rounded-xl"
        style="background-image: url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2220%22 height=%2220%22><rect width=%2210%22 height=%2210%22 fill=%22%23e2e8f0%22/><rect x=%2210%22 y=%2210%22 width=%2210%22 height=%2210%22 fill=%22%23e2e8f0%22/></svg>');"
    >
      <canvas
          ref="imageCanvasRef"
          aria-hidden="true"
          class="absolute top-0 left-0 w-full h-full object-contain rounded-xl"
      ></canvas>
      <canvas
          ref="drawingCanvasRef"
          aria-label="Interactive drawing area to mask objects"
          class="absolute top-0 left-0 w-full h-full object-contain rounded-xl cursor-crosshair opacity-50"
          @mousedown="startDrawing"
          @mouseleave="stopDrawing"
          @mousemove="draw"
          @mouseup="stopDrawing"
      ></canvas>
    </figure>

    <div class="mt-auto">
      <button
          :disabled="loading"
          class="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white border-none py-4 px-6 text-lg rounded-xl cursor-pointer font-bold flex justify-center items-center gap-3 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/30"
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