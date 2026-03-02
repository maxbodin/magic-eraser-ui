<script lang="ts" setup>
import { ref } from "vue";
import CanvasEditor from "./components/CanvasEditor.vue";
import ResultsPanel from "./components/ResultsPanel.vue";
import type { Variation } from "./types/variation.ts";

const WORKER_URL = "http://localhost:8787/api/erase-object-in-image";

const imageSrc = ref<string | null>( null );
const loading = ref( false );
const variations = ref<Variation[]>( [] );
const selectedVariation = ref<Variation | null>( null );

const handleUpload = ( e: Event ) => {
  const target = e.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = ( event ) => {
    imageSrc.value = event.target?.result as string;
    variations.value = [];
    selectedVariation.value = null;
  };
  reader.readAsDataURL( file );
};

const resetWorkspace = () => {
  imageSrc.value = null;
  variations.value = [];
  selectedVariation.value = null;
};

const removeObject = async ( { imageBlob, maskBlob }: { imageBlob: Blob; maskBlob: Blob } ) => {
  loading.value = true;
  variations.value = [];
  selectedVariation.value = null;

  const formData = new FormData();
  formData.append( "image", imageBlob, "image.jpg" );
  formData.append( "mask", maskBlob, "mask.jpg" );

  try {
    const response = await fetch( WORKER_URL, { method: "POST", body: formData } );
    const data = await response.json();

    if (!response.ok || !data.success) throw new Error( data.error || "Unknown server error" );

    if (data.variations && Array.isArray( data.variations )) {
      variations.value = data.variations;
      // Default select the middle option
      if (variations.value.length > 0) {
        selectedVariation.value = variations.value[Math.floor( variations.value.length / 2 )];
      }
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
};
</script>

<template>
  <main class="min-h-screen text-slate-900 font-sans p-4 md:p-8 lg:p-12 selection:bg-emerald-200">
    <div class="max-w-[1400px] mx-auto">
      <header class="text-center mb-12">
        <h1 class="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-emerald-500 mb-4 tracking-tight drop-shadow-sm">
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
            class="group relative inline-flex cursor-pointer overflow-hidden rounded-xl bg-gradient-to-r from-violet-600 to-emerald-500 p-[2px] transition-transform duration-300 hover:scale-105 active:scale-95 shadow-xl shadow-emerald-500/20">
          <span
              class="flex items-center gap-3 rounded-xl bg-white px-8 py-5 text-lg font-bold text-slate-800 transition-colors duration-300 group-hover:bg-transparent group-hover:text-white">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"
                 xmlns="http://www.w3.org/2000/svg"><path d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" stroke-linecap="round"
                                                          stroke-linejoin="round"></path></svg>
            Upload Image
          </span>
          <input accept="image/*" aria-label="Upload an image to start editing" class="hidden" type="file"
                 @change="handleUpload"/>
        </label>
      </section>

      <div v-else class="flex flex-col justify-center gap-8 items-start">
        <CanvasEditor
            :imageSrc="imageSrc"
            :loading="loading"
            @erase="removeObject"
            @reset="resetWorkspace"
        />
        <ResultsPanel
            v-if="variations.length > 0"
            v-model:selectedVariation="selectedVariation"
            :variations="variations"
            @apply="applyResult"
        />

      </div>
    </div>
  </main>
</template>