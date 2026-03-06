<script lang="ts" setup>
import { onBeforeUnmount, ref } from "vue";
import CanvasEditor from "./components/CanvasEditor.vue";
import ResultsPanel from "./components/ResultsPanel.vue";
import type { Variation } from "./types/variation.ts";

const WORKER_URL = import.meta.env.API_WORKER_URL || "http://localhost:8787/api/erase-object-in-image";

const imageSrc = ref<string | null>( null );
const currentAspectRatio = ref<number | null>( null );
const loading = ref( false );
const variations = ref<Variation[]>( [] );
const selectedVariation = ref<Variation | null>( null );
const canvasEditorRef = ref<HTMLElement | null>( null );
const resultsPanelRef = ref<HTMLElement | null>( null );

onBeforeUnmount( () => {
  if (imageSrc.value) URL.revokeObjectURL( imageSrc.value );
} );

const handleUpload = ( e: Event ) => {
  const target = e.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  if (imageSrc.value) URL.revokeObjectURL( imageSrc.value );

  imageSrc.value = URL.createObjectURL( file );
  variations.value = [];
  selectedVariation.value = null;
};

const resetWorkspace = () => {
  if (imageSrc.value) URL.revokeObjectURL( imageSrc.value );
  imageSrc.value = null;
  currentAspectRatio.value = null;
  variations.value = [];
  selectedVariation.value = null;
};

const removeObject = async ( { imageBlob, maskBlob, aspectRatio }: {
  imageBlob: Blob;
  maskBlob: Blob;
  aspectRatio: number
} ) => {
  loading.value = true;
  currentAspectRatio.value = aspectRatio;
  variations.value = [];
  selectedVariation.value = null;

  const formData = new FormData();
  formData.append( "image", imageBlob, "image.jpg" );
  formData.append( "mask", maskBlob, "mask.png" );

  try {
    const response = await fetch( WORKER_URL, { method: "POST", body: formData } );
    const data = await response.json();

    if (!response.ok || !data.success) throw new Error( data.error || "Unknown server error" );

    if (data.variations && Array.isArray( data.variations )) {
      // Attach aspect ratio to each variation.
      variations.value = data.variations.map( ( v: any ): Variation => ( {
        strength: v.strength,
        guidance: v.guidance,
        image: v.image,
        aspectRatio
      } ) );
      // Default select the middle option.
      if (variations.value.length > 0) {
        const middleIndex = Math.floor( variations.value.length / 2 );
        const variation = variations.value[middleIndex];
        if (variation) {
          selectedVariation.value = variation;
        }
      }
      setTimeout( () => {
        resultsPanelRef.value?.scrollIntoView( { behavior: "smooth", block: "start" } );
      }, 100 );
    }
  } catch (err: any) {
    alert( "Error removing object: " + err.message );
  } finally {
    loading.value = false;
  }
};

const applyResult = () => {
  if (!selectedVariation.value) return;
  imageSrc.value = selectedVariation.value.image;
  // Scroll back to canvas.
  setTimeout( () => {
    canvasEditorRef.value?.scrollIntoView( { behavior: "smooth", block: "start" } );
  }, 100 );
};
</script>

<template>
  <main class="min-h-screen text-slate-900 font-sans p-4 md:p-8 lg:p-12 selection:bg-emerald-200">
    <div class="max-w-350 mx-auto">
      <header class="text-center mb-12">
        <h1 class="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-linear-to-r from-violet-600 to-emerald-500 mb-4 tracking-tight drop-shadow-sm">
          Magic Eraser AI
        </h1>
        <p class="text-lg text-slate-500 max-w-2xl mx-auto">
          Draw over an object. AI will generate variations based on <strong class="text-slate-800 font-semibold">Strength</strong>
          and <strong class="text-slate-800 font-semibold">Guidance</strong>.
        </p>
      </header>

      <!-- Upload View -->
      <section v-if="!imageSrc" class="flex justify-center mt-20">
        <label
            class="group relative inline-flex cursor-pointer overflow-hidden rounded-xl bg-linear-to-r from-violet-600 to-emerald-500 p-0.5 transition-transform duration-300 hover:scale-105 active:scale-95 shadow-xl shadow-emerald-500/20">
          <span
              class="flex items-center gap-3 rounded-xl bg-white px-8 py-5 text-lg font-bold text-slate-800 transition-colors duration-300 group-hover:bg-transparent group-hover:text-white">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"
                 xmlns="http://www.w3.org/2000/svg"><path
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                stroke-linecap="round"
                stroke-linejoin="round"></path></svg>
            Upload Image
          </span>
          <input accept="image/*" aria-label="Upload an image to start editing" class="hidden" type="file"
                 @change="handleUpload"/>
        </label>
      </section>

      <div v-else class="flex flex-col justify-center gap-8 items-start">
        <CanvasEditor
            ref="canvasEditorRef"
            :imageSrc="imageSrc"
            :loading="loading"
            @erase="removeObject"
            @reset="resetWorkspace"
        />
        <ResultsPanel
            v-if="variations.length > 0"
            ref="resultsPanelRef"
            v-model:selectedVariation="selectedVariation"
            :variations="variations"
            @apply="applyResult"
        />
      </div>
    </div>
  </main>
</template>