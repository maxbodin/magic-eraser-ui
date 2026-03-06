<script lang="ts" setup>
import { ref } from "vue";

defineProps<{
  hasImage: boolean;
}>();

const emit = defineEmits<{
  ( e: "upload", event: Event ): void;
  ( e: "scroll-to-canvas" ): void;
}>();

const isHovering = ref( false );

const handleUpload = ( e: Event ) => {
  emit( "upload", e );
};
</script>

<template>
  <section class="relative overflow-hidden select-none">
    <div class="relative z-10 max-w-350 mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
      <div class="text-center mb-12 sm:mb-16">
        <h1 class="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-transparent bg-clip-text bg-linear-to-r from-violet-600 via-emerald-600 to-teal-500 mb-6 sm:mb-8 leading-tight tracking-tight">
          Magic Eraser AI
        </h1>

        <p class="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto mb-8 sm:mb-12 leading-relaxed">
          Remove unwanted objects from images effortlessly. Generate multiple variations with AI-powered inpainting. Get
          professional results in seconds.
        </p>

        <div
            class="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8 mb-12 sm:mb-16 bg-black/1 backdrop-blur-sm rounded-xl shadow-sm p-4">
          <div class="flex flex-col items-center group cursor-pointer transition-all duration-300 hover:scale-105">
            <div
                class="w-12 h-12 rounded-lg bg-emerald-100 flex items-center justify-center mb-3 sm:mb-4 ">
              <svg class="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" stroke-width="2"
                   viewBox="0 0 24 24">
                <path d="M13 10V3L4 14h7v7l9-11h-7z" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <h3 class="text-sm sm:text-base font-semibold text-slate-900 mb-1 sm:mb-2">Lightning Fast</h3>
            <p class="text-xs sm:text-sm text-slate-600">Process images in seconds with optimized algorithms</p>
          </div>

          <div class="flex flex-col items-center group cursor-pointer transition-all duration-300 hover:scale-105">
            <div
                class="w-12 h-12 rounded-lg bg-violet-100 flex items-center justify-center mb-3 sm:mb-4 ">
              <svg class="w-6 h-6 text-violet-600" fill="none" stroke="currentColor" stroke-width="2"
                   viewBox="0 0 24 24">
                <path d="M9 19V5m4 14V1m4 18v-6M4.5 8h15" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <h3 class="text-sm sm:text-base font-semibold text-slate-900 mb-1 sm:mb-2">Fine Control</h3>
            <p class="text-xs sm:text-sm text-slate-600">Choose strength and guidance from multiple variations for
              perfect results</p>
          </div>

          <div class="flex flex-col items-center group cursor-pointer transition-all duration-300 hover:scale-105">
            <div
                class="w-12 h-12 rounded-lg bg-teal-100 flex items-center justify-center mb-3 sm:mb-4 ">
              <svg class="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path
                    d="M12 8c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm0 2c-1.657 0-3 1.343-3 3v2h6v-2c0-1.657-1.343-3-3-3zm6 4v-2h1v2h-1zm-8-4v2H3v-2h7zm0-2H3v2h7V8z"
                    fill="currentColor"/>
              </svg>
            </div>
            <h3 class="text-sm sm:text-base font-semibold text-slate-900 mb-1 sm:mb-2">Free</h3>
            <p class="text-xs sm:text-sm text-slate-600">Generation is free using Cloudflare Worker AI free tier</p>
          </div>
        </div>

        <!-- CTA Button -->
        <div class="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <label
              class="group relative inline-flex cursor-pointer overflow-hidden rounded-xl bg-linear-to-r from-violet-600 to-emerald-500 p-0.5 transition-all duration-300 hover:shadow-2xl hover:shadow-emerald-500/50 active:scale-95 shadow-xl shadow-emerald-500/20 w-full sm:w-auto hover:scale-110"
              @mouseenter="isHovering = true"
              @mouseleave="isHovering = false"
          >
            <span
                class="flex items-center justify-center gap-3 rounded-xl bg-white px-8 py-4 text-lg font-bold text-slate-800 transition-colors duration-300 group-hover:bg-transparent w-full sm:w-auto"
            >
              <svg
                  :class="{ 'scale-110 rotate-12': isHovering }"
                  class="w-6 h-6 transition-transform duration-300"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  viewBox="0 0 24 24"
              >
                <path
                    d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                />
              </svg>
              <span>Upload Image</span>
            </span>
            <input accept="image/*" aria-label="Upload an image to start editing" class="hidden" type="file"
                   @change="handleUpload"/>
          </label>
        </div>
      </div>
    </div>
  </section>
</template>