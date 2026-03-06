<script lang="ts" setup>
import { nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import CanvasEditor from "./components/CanvasEditor.vue";
import ResultsPanel from "./components/ResultsPanel.vue";
import HeroSection from "./components/HeroSection.vue";
import ErrorAlert from "./components/ErrorAlert.vue";
import Footer from "./components/Footer.vue";
import { useImageEditor } from "./composables/useImageEditor";
import { imageProcessingAPI } from "./services/imageProcessingAPI";

const {
  imageSrc,
  loading,
  variations,
  selectedVariation,
  error,
  hasImage,
  hasVariations,
  setImage,
  setVariations,
  applySelectedVariation,
  reset,
  setLoading,
  setError,
  setAspectRatio,
  cleanup,
} = useImageEditor();

const canvasEditorRef = ref<HTMLElement | null>( null );
const resultsPanelRef = ref<HTMLElement | null>( null );
const cursorFollowRef = ref<HTMLElement | null>( null );
const mainRef = ref<HTMLElement | null>( null );

let mouseX = 0;
let mouseY = 0;
let rafId: number | null = null;
let resizeObserver: ResizeObserver | null = null;

onBeforeUnmount( () => {
  cleanup();
  if (rafId !== null) cancelAnimationFrame( rafId );
  if (bgRafId !== null) cancelAnimationFrame( bgRafId );
  if (resizeObserver) resizeObserver.disconnect();

  document.removeEventListener( "mousemove", handleMouseMove );
  document.removeEventListener( "mouseleave", handleMouseLeave );
  window.removeEventListener( "resize", resizeBgCanvas );
} );

onMounted( () => {
  const isTouchDevice = () => window.matchMedia( "(hover: none)" ).matches;

  if (!isTouchDevice()) {
    cursorFollowRef.value = document.getElementById( "cursor-follow" );
    document.addEventListener( "mousemove", handleMouseMove, { passive: true } );
    document.addEventListener( "mouseleave", handleMouseLeave, { passive: true } );
  }

  resizeObserver = new ResizeObserver( () => resizeBgCanvas() );
  if (mainRef.value) {
    resizeObserver.observe( mainRef.value );
  }

  window.addEventListener( "resize", resizeBgCanvas );
  for (let i = 0; i < 18; i++) spawnBubble();
  bgLoop();
} );

/**
 * Handle mouse movement and update cursor position
 */
const handleMouseMove = ( e: MouseEvent ) => {
  mouseX = e.clientX;
  mouseY = e.clientY;

  if (rafId === null) {
    const updateCursor = () => {
      if (cursorFollowRef.value) {
        cursorFollowRef.value.style.left = mouseX + "px";
        cursorFollowRef.value.style.top = mouseY + "px";
      }
      rafId = requestAnimationFrame( updateCursor );
    };
    rafId = requestAnimationFrame( updateCursor );
  }
};

/**
 * Handle mouse leave event
 */
const handleMouseLeave = () => {
  if (rafId !== null) {
    cancelAnimationFrame( rafId );
    rafId = null;
  }
};

/**
 * Handles image upload
 */
const handleUpload = ( e: Event ) => {
  const target = e.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  const src = URL.createObjectURL( file );
  setImage( src );
};

/**
 * Processes object removal request
 */
const removeObject = async ( { imageBlob, maskBlob, aspectRatio }: {
  imageBlob: Blob;
  maskBlob: Blob;
  aspectRatio: number;
} ) => {
  setLoading( true );
  setAspectRatio( aspectRatio );
  setError( null );

  try {
    const response = await imageProcessingAPI.removeObject( {
      imageBlob,
      maskBlob,
      aspectRatio,
    } );

    const mappedVariations = response.variations.map( ( v ) => ( {
      strength: v.strength,
      guidance: v.guidance,
      image: v.image,
      aspectRatio,
    } ) );

    setVariations( mappedVariations );

    await nextTick();
    window.setTimeout( () => {
      resultsPanelRef.value?.scrollIntoView( { behavior: "smooth", block: "start" } );
    }, 100 );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error occurred";
    setError( `Error removing object: ${ message }` );
    console.error( "Image processing error:", err );
  } finally {
    setLoading( false );
  }
};

/**
 * Applies selected variation to canvas
 */
const applyResult = () => {
  applySelectedVariation();
  window.setTimeout( () => {
    canvasEditorRef.value?.scrollIntoView( { behavior: "smooth", block: "start" } );
  }, 100 );
};

/**
 * Scrolls to canvas editor
 */
const scrollToCanvas = () => {
  window.setTimeout( () => {
    canvasEditorRef.value?.scrollIntoView( { behavior: "smooth", block: "start" } );
  }, 100 );
};

// --- BUBBLES BACKGROUND ---
interface BgStroke {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  alpha: number;
}

interface Bubble {
  id: number;
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  color: string;
  alpha: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  color: string;
  alpha: number;
}

const bgCanvasRef = ref<HTMLCanvasElement | null>( null );
const isDrawingBg = ref( false );
const lastBgPoint = ref<{ x: number, y: number } | null>( null );

const bgStrokes: BgStroke[] = [];
const bubbles: Bubble[] = [];
const particles: Particle[] = [];

let bubbleId = 0;
let bgRafId: number | null = null;
let bgWidth = 0, bgHeight = 0;

function randomColor() {
  const colors = ["#a5b4fc", "#6ee7b7", "#fcd34d", "#fca5a5", "#f9a8d4", "#f472b6", "#818cf8", "#34d399", "#fbbf24"];
  return colors[Math.floor( Math.random() * colors.length )];
}

function spawnBubble() {
  const r = 24 + Math.random() * 32;
  const x = r + Math.random() * ( bgWidth - 2 * r );
  const y = bgHeight + r + Math.random() * 100;
  const vx = ( Math.random() - 0.5 ) * 0.5;
  const vy = -0.5 - Math.random() * 1.2;
  bubbles.push( { id: bubbleId++, x, y, r, vx, vy, color: randomColor(), alpha: 0.7 + Math.random() * 0.3 } );
}

function spawnExplosion(x: number, y: number, color: string) {
  const particleCount = 12 + Math.random() * 100;
  for (let i = 0; i < particleCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 10; // Velocity burst.
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      r: 3 + Math.random() * 5,
      color,
      alpha: 1.0
    });
  }
}

function animateBubbles() {
  if (!bgCanvasRef.value) return;
  const ctx = bgCanvasRef.value.getContext( "2d" );
  if (!ctx) return;
  ctx.clearRect( 0, 0, bgWidth, bgHeight );

  // Draw user brush trails.
  if (bgStrokes.length > 0) {
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 30;
    ctx.strokeStyle = "#f87171";

    for (let i = bgStrokes.length - 1; i >= 0; i--) {
      const s = bgStrokes[i];

      ctx.globalAlpha = Math.max( 0, Math.min( 1, s.alpha ) );
      ctx.beginPath();
      ctx.moveTo( s.x1, s.y1 );
      ctx.lineTo( s.x2, s.y2 );
      ctx.stroke();

      // Decrease alpha slowly over time.
      s.alpha -= 0.015;

      // Clean up dead brush strokes.
      if (s.alpha <= 0) {
        bgStrokes.splice( i, 1 );
      }
    }
    ctx.restore();
  }

  // Update and draw explosion particles.
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];

    // Particle Physics.
    p.vx *= 0.92; // Friction
    p.vy += 0.15; // Gravity
    p.x += p.vx;
    p.y += p.vy;
    p.alpha -= 0.02; // Fade out
    p.r *= 0.95; // Shrink radius

    if (p.alpha <= 0 || p.r <= 0.5) {
      particles.splice(i, 1);
      continue;
    }

    ctx.save();
    ctx.globalAlpha = p.alpha;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, 2 * Math.PI);
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 8;
    ctx.fill();
    ctx.restore();
  }

  // Draw bubbles
  for (const b of bubbles) {
    ctx.save();
    ctx.globalAlpha = b.alpha;
    ctx.beginPath();
    ctx.arc( b.x, b.y, b.r, 0, 2 * Math.PI );
    ctx.fillStyle = b.color;
    ctx.shadowColor = b.color;
    ctx.shadowBlur = 16;
    ctx.fill();
    ctx.restore();
  }
}

function updateBubbles() {
  for (const b of bubbles) {
    b.x += b.vx;
    b.y += b.vy;
  }
  // Remove bubbles out of screen.
  for (let i = bubbles.length - 1; i >= 0; i--) {
    if (bubbles[i].y + bubbles[i].r < 0) bubbles.splice( i, 1 );
  }
  // Spawn new bubbles if needed.
  if (bubbles.length < 20 && Math.random() < 0.15) spawnBubble();
}

function bgLoop() {
  updateBubbles();
  animateBubbles();
  bgRafId = requestAnimationFrame( bgLoop );
}

function resizeBgCanvas() {
  if (!bgCanvasRef.value || !mainRef.value) return;
  bgWidth = mainRef.value.scrollWidth;
  bgHeight = mainRef.value.scrollHeight;
  bgCanvasRef.value.width = bgWidth;
  bgCanvasRef.value.height = bgHeight;
}

// --- DRAWING ON BG ---
function getBgPos( e: MouseEvent | TouchEvent ) {
  const rect = bgCanvasRef.value!.getBoundingClientRect();
  let x = 0, y = 0;
  if (e instanceof MouseEvent) {
    x = e.clientX;
    y = e.clientY;
  } else
    if (e.touches && e.touches[0]) {
      x = e.touches[0].clientX;
      y = e.touches[0].clientY;
    }
  return { x: x - rect.left, y: y - rect.top };
}

function checkBubbleCollisions( pt: { x: number, y: number } ) {
  for (let i = bubbles.length - 1; i >= 0; i--) {
    const b = bubbles[i];
    const dist = Math.hypot( pt.x - b.x, pt.y - b.y );
    if (dist < b.r + 16) {
      spawnExplosion(b.x, b.y, b.color);
      bubbles.splice( i, 1 );
    }
  }
}

function handleBgDown( e: MouseEvent | TouchEvent ) {
  // Prevent background drawing if clicking interactive elements or protected areas.
  const target = e.target as HTMLElement | null;
  if (target?.closest( "button, a, input, textarea, select, .disable-bg-draw" )) return;

  isDrawingBg.value = true;
  const pt = getBgPos( e );
  lastBgPoint.value = pt;

  // Render an initial dot to support single-click stamps.
  bgStrokes.push( { x1: pt.x, y1: pt.y, x2: pt.x + 0.1, y2: pt.y, alpha: 1.0 } );
  checkBubbleCollisions( pt );
}

function handleBgDraw( e: MouseEvent | TouchEvent ) {
  if (!isDrawingBg.value) return;
  const pt = getBgPos( e );

  if (lastBgPoint.value) {
    bgStrokes.push( {
      x1: lastBgPoint.value.x,
      y1: lastBgPoint.value.y,
      x2: pt.x,
      y2: pt.y,
      alpha: 1.0
    } );
  }

  checkBubbleCollisions( pt );
  lastBgPoint.value = pt;
}

function handleBgUp() {
  isDrawingBg.value = false;
  lastBgPoint.value = null;
}
</script>

<template>
  <main ref="mainRef"
        class="min-h-screen bg-linear-to-br from-white via-slate-50 to-white text-slate-900 font-sans selection:bg-emerald-200 relative"
        @mousedown="handleBgDown"
        @mouseleave="handleBgUp"
        @mousemove="handleBgDraw"
        @mouseup="handleBgUp"
        @touchend="handleBgUp"
        @touchmove="handleBgDraw"
        @touchstart="handleBgDown">

    <canvas ref="bgCanvasRef"
            class="absolute left-0 top-0 w-full h-full pointer-events-none z-0"
    ></canvas>

    <div id="cursor-follow" class="cursor-follow"/>

    <ErrorAlert
        :error="error"
        @dismiss="setError(null)"
    />

    <HeroSection
        :hasImage="hasImage"
        @upload="handleUpload"
        @scroll-to-canvas="scrollToCanvas"
    />

    <section class="relative py-4 sm:py-6 lg:py-8 overflow-hidden z-10">
      <div class="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex flex-col justify-center gap-6 sm:gap-8 items-start w-full">
          <div class="disable-bg-draw w-full">
            <CanvasEditor
                ref="canvasEditorRef"
                :imageSrc="imageSrc || ''"
                :loading="loading"
                @erase="removeObject"
                @reset="reset"
            />
          </div>
          <ResultsPanel
              v-if="hasVariations"
              ref="resultsPanelRef"
              v-model:selectedVariation="selectedVariation"
              :variations="variations"
              class="disable-bg-draw w-full"
              @apply="applyResult"
          />
        </div>
      </div>
    </section>
    <Footer/>
  </main>
</template>

<style scoped>
html {
  scroll-behavior: smooth;
}
</style>