<script lang="ts" setup>
const currentYear = new Date().getFullYear();
</script>

<template>
  <footer class="relative py-8 overflow-hidden bg-black/1 backdrop-blur-sm">
    <div class="absolute inset-0 overflow-hidden pointer-events-none">
      <div class="absolute bottom-0 right-0 w-96 h-96 bg-white-500/10 rounded-full blur-3xl"/>
      <div class="absolute top-0 left-0 w-96 h-96 bg-white-500/10 rounded-full blur-3xl"/>
    </div>
    <div class="relative z-10 max-w-350 mx-auto px-4 sm:px-6 lg:px-8">
      <div class="grid gap-8 mb-2 py-4">
        <div class="col-span-1">
          <h3 class="text-2xl font-extrabold bg-linear-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent mb-2">
            Magic Eraser AI
          </h3>
          <p class="text-sm">
            AI-powered image editing tool for removing unwanted objects.
          </p>
        </div>
      </div>
      <div class="border-t border-slate-800 my-4"/>
      <div class="flex flex-col sm:flex-row justify-between items-center gap-4">
        <p class="text-sm">
          &copy; {{ currentYear }} Magic Eraser AI. All rights reserved.
        </p>
        <p class="text-sm">
          Made with <span class="text-emerald-400">❤</span> by <a
            class="text-emerald-400 hover:text-emerald-300 transition-colors font-semibold"
            href="https://maximebodin.com">@MaxBodin</a>
        </p>
      </div>
    </div>
  </footer>
</template>

<style scoped>
a {
  position: relative;
  display: inline-block;
}

a::after {
  content: '';
  position: absolute;
  width: 0;
  height: 2px;
  bottom: -4px;
  left: 0;
  background: linear-gradient(to right, #10b981, #14b8a6);
  transition: width 0.3s ease;
}

a:hover::after {
  width: 100%;
}
</style>