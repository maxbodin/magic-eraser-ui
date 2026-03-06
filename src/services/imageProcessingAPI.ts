import type { Variation } from "../types/variation.ts";

export interface RemoveObjectPayload {
	imageBlob: Blob;
	maskBlob: Blob;
	aspectRatio: number;
}

export interface SingleVariationResponse {
	success: boolean;
	strength: number;
	guidance: number;
	image: string;
	error?: string;
}

export const STRENGTHS = [0.8, 0.9, 1.0];
export const GUIDANCES = [8, 9, 10, 11, 13];

/**
 * Service API to communicate with the image processing Worker.
 */
class ImageProcessingAPI {
	private readonly workerUrl: string;
	private timeout: number = import.meta.env.VITE_REQUEST_TIMEOUT ? parseInt( import.meta.env.VITE_REQUEST_TIMEOUT as string, 10 ) : 900000;

	constructor( workerUrl: string = import.meta.env.VITE_API_WORKER_URL ) {
		this.workerUrl = workerUrl;
	}

	/**
	 * Orchestrates multiple API calls simultaneously.
	 * Resolves variations progressively via callback for immediate UI feedback.
	 */
	async generateAllVariations(
		payload: RemoveObjectPayload,
		onProgress: ( variation: Variation ) => void
	): Promise<void> {
		const tasks: Promise<void>[] = [];
		let successCount = 0;

		for (const strength of STRENGTHS) {
			for (const guidance of GUIDANCES) {
				const task = this.fetchSingleVariation( payload, strength, guidance )
					.then( ( variation ) => {
						successCount++;
						onProgress( variation );
					} )
					.catch( ( error ) => {
						// Gracefully handle individual variation failures so the grid still loads others.
						console.warn( `Failed S:${ strength } G:${ guidance } -`, error.message );
					} );

				tasks.push( task );
			}
		}

		// Wait for all requests to finish (whether resolved or rejected).
		await Promise.all( tasks );

		if (successCount === 0) {
			throw new Error( "All network requests failed. Please check your connection." );
		}
	}

	/**
	 * Fetches a single combination of strength/guidance.
	 */
	private async fetchSingleVariation(
		payload: RemoveObjectPayload,
		strength: number,
		guidance: number
	): Promise<Variation> {
		const formData = new FormData();
		formData.append( "image", payload.imageBlob, "image.jpg" );
		formData.append( "mask", payload.maskBlob, "mask.png" );
		formData.append( "strength", strength.toString() );
		formData.append( "guidance", guidance.toString() );

		const controller = new AbortController();
		const timeoutId = setTimeout( () => controller.abort(), this.timeout );

		try {
			const response = await fetch( this.workerUrl, {
				method: "POST",
				body: formData,
				signal: controller.signal,
			} );

			if (!response.ok) {
				throw new Error( `HTTP error! status: ${ response.status }` );
			}

			const data = await response.json() as SingleVariationResponse;

			if (!data.success) {
				throw new Error( data.error || "Failed to process image" );
			}

			return {
				strength: data.strength,
				guidance: data.guidance,
				image: data.image,
				aspectRatio: payload.aspectRatio
			};
		} finally {
			clearTimeout( timeoutId );
		}
	}
}

export const imageProcessingAPI = new ImageProcessingAPI();