<script lang="ts" setup>
import type { Variation } from "../types/variation.ts";
import { GUIDANCES, STRENGTHS } from "../services/imageProcessingAPI";

const props = defineProps<{
  variations: Variation[];
  selectedVariation: Variation | null;
  isProcessing: boolean;
}>();

const emit = defineEmits<{
  ( e: "update:selectedVariation", val: Variation | null ): void
  ( e: "apply" ): void
}>();

const uniqueStrengths = STRENGTHS;
const uniqueGuidances = GUIDANCES;

const getVariation = ( s: number, g: number ): Variation | undefined => {
  return props.variations.find( v => v.strength === s && v.guidance === g );
};

const downloadImage = () => {
  if (!props.selectedVariation?.image) return;

  const link = document.createElement( "a" );
  link.href = props.selectedVariation.image;
  link.download = `magic-eraser-result-${ Date.now() }.png`;
  document.body.appendChild( link );
  link.click();
  document.body.removeChild( link );
};
</script>

<template>
  <section class="p-6 w-full max-w-4xl flex flex-col mx-auto bg-black/1 backdrop-blur-sm rounded-xl shadow-sm select-none">
    <h3 class="text-xl font-bold text-slate-800 mb-6">
      {{ isProcessing ? "Generating Variations..." : "Select Best Variation" }}
    </h3>

    <div v-if="selectedVariation" class="flex flex-col gap-4 p-4 rounded-xl">
      <div
          :style="{ aspectRatio: selectedVariation.aspectRatio ? `${selectedVariation.aspectRatio}` : 'auto' }"
          class="w-full rounded-lg border-2 border-emerald-500 shadow-sm  flex items-center justify-center overflow-hidden"
      >
        <img
            :src="selectedVariation.image"
            alt="Selected AI generated variation preview"
            class="w-full h-full object-cover"
            loading="lazy"
        />
      </div>
      <div class="text-sm text-slate-500 text-center font-medium">
        Strength: <span class="text-slate-900">{{ selectedVariation.strength }}</span> |
        Guidance: <span class="text-slate-900">{{ selectedVariation.guidance }}</span>
      </div>
      <div class="flex gap-3">
        <button
            class="flex-1 bg-slate-800 text-white border-none py-3 px-6 rounded-lg cursor-pointer font-bold hover:bg-slate-700 transition-colors duration-200 shadow-md focus:ring-4 focus:ring-slate-200"
            @click="emit('apply')"
        >
          Apply & Continue Editing
        </button>
        <button
            aria-label="Download selected variation"
            class="bg-emerald-500 text-white border-none py-3 px-6 rounded-lg cursor-pointer font-bold hover:bg-emerald-600 transition-colors duration-200 shadow-md focus:ring-4 focus:ring-emerald-200 flex items-center gap-2"
            @click="downloadImage"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"
               xmlns="http://www.w3.org/2000/svg">
            <path
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                stroke-linecap="round"
                stroke-linejoin="round"></path>
          </svg>
          Download
        </button>
      </div>
    </div>

    <!-- Matrix Table -->
    <div class="overflow-x-auto pb-4">
      <div class="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-2 ml-20">
        Guidance ➝
      </div>

      <table class="border-separate border-spacing-2 mx-auto">
        <thead>
        <tr>
          <th class="text-xs text-slate-400 font-semibold uppercase tracking-wider text-right pr-2 align-bottom pb-2">
            Strength ↓
          </th>
          <th v-for="g in uniqueGuidances" :key="g" class="text-sm font-bold text-slate-600 pb-2">
            {{ g }}
          </th>
        </tr>
        </thead>
        <tbody>
        <tr v-for="s in uniqueStrengths" :key="s">
          <td class="font-bold text-slate-600 text-sm text-right pr-2 align-middle">{{ s }}</td>
          <td v-for="g in uniqueGuidances" :key="g" class="p-0">
            <div
                :aria-label="`Select variation with strength ${s} and guidance ${g}`"
                :class="[
                    selectedVariation?.strength === s && selectedVariation?.guidance === g
                      ? 'border-emerald-500 scale-110 shadow-lg shadow-emerald-500/30 z-10'
                      : 'border-transparent hover:scale-110 hover:shadow-md hover:z-10',
                    getVariation(s, g) ? 'cursor-pointer' : 'cursor-default opacity-60'
                  ]"
                :style="{ aspectRatio: getVariation(s, g)?.aspectRatio ? `${getVariation(s, g)?.aspectRatio}` : '1' }"
                class="w-16 rounded-xl overflow-hidden border-2 transition-all duration-200 relative group bg-slate-100 flex items-center justify-center"
                role="button"
                @click="getVariation(s, g) && emit('update:selectedVariation', getVariation(s, g) ?? null)"
            >
              <img
                  v-if="getVariation(s, g)"
                  :src="getVariation(s, g)?.image"
                  alt="Variation thumbnail"
                  class="max-w-full max-h-full object-contain"
                  loading="lazy"
              />

              <span v-else class="w-full h-full bg-slate-100 flex items-center justify-center text-slate-300">
                  <svg v-if="isProcessing" class="animate-spin h-5 w-5 text-emerald-500"
                       fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            fill="currentColor"></path>
                  </svg>
                  <span v-else>-</span>
                </span>
            </div>

          </td>
        </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>