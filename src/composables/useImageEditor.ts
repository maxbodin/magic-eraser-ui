import { computed, ref } from "vue";
import type { Variation } from "../types/variation";

/**
 * Composable pour la gestion de l'état global de l'application.
 * Centralise la logique de gestion des images, variations et UI.
 */
export const useImageEditor = () => {
	const imageSrc = ref<string | null>( null );
	const loading = ref( false );
	const variations = ref<Variation[]>( [] );
	const selectedVariation = ref<Variation | null>( null );
	const currentAspectRatio = ref<number | null>( null );
	const error = ref<string | null>( null );

	// Computed properties
	const hasImage = computed( () => imageSrc.value !== null );
	const hasVariations = computed( () => variations.value.length > 0 );
	const hasSelectedVariation = computed( () => selectedVariation.value !== null );
	const isProcessing = computed( () => loading.value );

	/**
	 * Définit une nouvelle image source
	 */
	const setImage = ( src: string | null ) => {
		if (imageSrc.value) {
			URL.revokeObjectURL( imageSrc.value );
		}
		imageSrc.value = src;
		resetVariations();
		error.value = null;
	};

	/**
	 * Réinitialise toutes les variations
	 */
	const resetVariations = () => {
		variations.value = [];
		selectedVariation.value = null;
	};

	/**
	 * Définit les variations de résultats
	 */
	const setVariations = ( vars: Variation[] ) => {
		variations.value = vars;
		if (vars.length > 0) {
			const middleIndex = Math.floor( vars.length / 2 );
			selectedVariation.value = vars[middleIndex] ?? null;
		}
	};

	/**
	 * Définit la variation sélectionnée
	 */
	const selectVariation = ( variation: Variation | null ) => {
		selectedVariation.value = variation;
	};

	/**
	 * Applique la variation sélectionnée comme nouvelle image
	 */
	const applySelectedVariation = () => {
		if (selectedVariation.value) {
			setImage( selectedVariation.value.image );
		}
	};

	/**
	 * Réinitialise l'espace de travail complet
	 */
	const reset = () => {
		setImage( null );
		currentAspectRatio.value = null;
		resetVariations();
		error.value = null;
	};

	/**
	 * Définit l'état de chargement
	 */
	const setLoading = ( isLoading: boolean ) => {
		loading.value = isLoading;
	};

	/**
	 * Définit un message d'erreur
	 */
	const setError = ( message: string | null ) => {
		error.value = message;
	};

	/**
	 * Récupère le ratio d'aspect courant
	 */
	const getAspectRatio = (): number | null => currentAspectRatio.value;

	/**
	 * Définit le ratio d'aspect courant
	 */
	const setAspectRatio = ( ratio: number ) => {
		currentAspectRatio.value = ratio;
	};

	/**
	 * Cleanup function
	 */
	const cleanup = () => {
		if (imageSrc.value) {
			URL.revokeObjectURL( imageSrc.value );
		}
	};

	return {
		// State
		imageSrc,
		loading,
		variations,
		selectedVariation,
		currentAspectRatio,
		error,

		// Computed
		hasImage,
		hasVariations,
		hasSelectedVariation,
		isProcessing,

		// Methods
		setImage,
		resetVariations,
		setVariations,
		selectVariation,
		applySelectedVariation,
		reset,
		setLoading,
		setError,
		getAspectRatio,
		setAspectRatio,
		cleanup,
	};
};

