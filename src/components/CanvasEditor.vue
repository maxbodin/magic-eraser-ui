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

const canvasRef = ref<HTMLCanvasElement | null>( null );
const isDrawing = ref( false );

watch( () => props.imageSrc, ( newSrc ) => {
  if (newSrc) loadImageToCanvas( newSrc );
} );

onMounted( () => {
  loadImageToCanvas( props.imageSrc );
} );

const loadImageToCanvas = ( src: string ) => {
  const img = new Image();
  img.onload = async () => {
    await nextTick();

    const canvas = canvasRef.value;
    if (!canvas) return;

    const ctx = canvas.getContext( "2d", { willReadFrequently: true } );
    if (!ctx) return;

    canvas.width = 512;
    canvas.height = 512;

    ctx.fillStyle = "white";
    ctx.fillRect( 0, 0, 512, 512 );

    ctx.drawImage( img, 0, 0, 512, 512 );
  };
  img.src = src;
};

const startDrawing = ( e: MouseEvent ) => {
  isDrawing.value = true;
  draw( e );
};

const stopDrawing = () => {
  isDrawing.value = false;
  if (canvasRef.value) canvasRef.value.getContext( "2d" )?.beginPath();
};

const draw = ( e: MouseEvent ) => {
  if (!isDrawing.value || !canvasRef.value) return;
  const ctx = canvasRef.value.getContext( "2d" );
  if (!ctx) return;

  const rect = canvasRef.value.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  ctx.lineWidth = 30;
  ctx.lineCap = "round";
  ctx.strokeStyle = "#FFFFFF";

  ctx.lineTo( x, y );
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo( x, y );
};

const canvasToBlob = ( canvas: HTMLCanvasElement ): Promise<Blob | null> => {
  return new Promise( ( resolve ) => canvas.toBlob( ( blob ) => resolve( blob ), "image/jpeg", 1 ) );
};

const processAndEmit = async () => {
  if (!canvasRef.value) return;

  const canvas = canvasRef.value;
  const maskCanvas = document.createElement( "canvas" );
  maskCanvas.width = 512;
  maskCanvas.height = 512;
  const mCtx = maskCanvas.getContext( "2d" )!;

  mCtx.fillStyle = "black";
  mCtx.fillRect( 0, 0, 512, 512 );

  const originalCanvas = document.createElement( "canvas" );
  originalCanvas.width = 512;
  originalCanvas.height = 512;
  originalCanvas.getContext( "2d" )!.drawImage( canvas, 0, 0, 512, 512 );

  const currentData = canvas.getContext( "2d" )!.getImageData( 0, 0, 512, 512 );
  const maskData = mCtx.getImageData( 0, 0, 512, 512 );

  let hasMask = false;
  // For loop optimized for lower-end devices processing pixel manipulation
  const len = currentData.data.length;
  for (let i = 0; i < len; i += 4) {
    if (currentData.data[i] === 255 && currentData.data[i + 1] === 255 && currentData.data[i + 2] === 255) {
      maskData.data[i] = 255;
      maskData.data[i + 1] = 255;
      maskData.data[i + 2] = 255;
      hasMask = true;
    }
  }

  if (!hasMask) {
    alert( "Please draw over an object to remove first." );
    return;
  }

  mCtx.putImageData( maskData, 0, 0 );

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

    <figure class="mb-6 flex justify-center">
      <canvas
          ref="canvasRef"
          aria-label="Interactive drawing area to mask objects"
          class="w-[512px] h-[512px] max-w-full object-contain rounded-xl cursor-crosshair border border-slate-200 shadow-inner block"
          style="background-image: url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2220%22 height=%2220%22><rect width=%2210%22 height=%2210%22 fill=%22%23e2e8f0%22/><rect x=%2210%22 y=%2210%22 width=%2210%22 height=%2210%22 fill=%22%23e2e8f0%22/></svg>');"
          @mousedown="startDrawing"
          @mousemove="draw"
          @mouseout="stopDrawing"
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
          <path class="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                fill="currentColor"></path>
        </svg>
        <span>{{ loading ? "Generating Variations..." : "Erase Object" }}</span>
      </button>
    </div>
  </section>
</template>