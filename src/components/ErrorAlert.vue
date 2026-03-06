<script lang="ts" setup>
import { computed, watch } from "vue";

interface Props {
  error: string | null;
  autoHideDuration?: number;
}

const props = withDefaults( defineProps<Props>(), {
  autoHideDuration: 5000,
} );

const emit = defineEmits<{
  ( e: "dismiss" ): void;
}>();

const isVisible = computed( () => props.error !== null );

watch( isVisible, ( visible ) => {
  if (visible && props.autoHideDuration > 0) {
    const timer = setTimeout( () => {
      emit( "dismiss" );
    }, props.autoHideDuration );

    return () => clearTimeout( timer );
  }
} );
</script>

<template>
  <transition
      enter-active-class="transition-all duration-300"
      enter-from-class="opacity-0 translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition-all duration-300"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 translate-y-2"
  >
    <div v-if="isVisible" class="fixed top-4 right-4 z-50 max-w-md" role="alert">
      <div class="bg-rose-50 border border-rose-200 rounded-lg p-4 shadow-lg">
        <div class="flex items-start gap-3">
          <svg class="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path clip-rule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  fill-rule="evenodd"/>
          </svg>
          <div class="flex-1">
            <p class="text-sm font-semibold text-rose-900">{{ error }}</p>
          </div>
          <button
              aria-label="Dismiss error"
              class="text-rose-500 hover:text-rose-700 transition-colors"
              @click="emit('dismiss')"
          >
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path clip-rule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    fill-rule="evenodd"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>

