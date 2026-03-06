export interface RemoveObjectPayload {
	imageBlob: Blob;
	maskBlob: Blob;
	aspectRatio: number;
}

export interface RemoveObjectResponse {
	success: boolean;
	variations: Array<{
		strength: number;
		guidance: number;
		image: string;
	}>;
	error?: string;
}

/**
 * Service API pour communiquer avec le serveur de traitement d'images.
 */
class ImageProcessingAPI {
	private readonly workerUrl: string;
	private timeout: number = import.meta.env.VITE_REQUEST_TIMEOUT ? parseInt( import.meta.env.VITE_REQUEST_TIMEOUT as string, 10 ) : 900000;

	constructor( workerUrl: string = import.meta.env.VITE_API_WORKER_URL ) {
		this.workerUrl = workerUrl;
	}

	/**
	 * Envoie une demande de suppression d'objet au serveur.
	 * @param payload Données de l'image et du masque.
	 * @returns Promise avec les variations générées.
	 */
	async removeObject( payload: RemoveObjectPayload ): Promise<RemoveObjectResponse> {
		const { imageBlob, maskBlob } = payload;

		const formData = new FormData();
		formData.append( "image", imageBlob, "image.jpg" );
		formData.append( "mask", maskBlob, "mask.png" );

		try {
			const controller = new AbortController();
			const timeoutId = setTimeout( () => controller.abort(), this.timeout );

			const response = await fetch( this.workerUrl, {
				method: "POST",
				body: formData,
				signal: controller.signal,
			} );

			clearTimeout( timeoutId );

			if (!response.ok) {
				throw new Error( `HTTP error! status: ${ response.status }` );
			}

			const data = await response.json() as RemoveObjectResponse;

			if (!data.success) {
				throw new Error( data.error || "Failed to process image" );
			}

			return data;
		} catch (error) {
			if (error instanceof Error) {
				if (error.name === "AbortError") {
					throw new Error( "Request timeout - server took too long to respond" );
				}
				throw error;
			}
			throw new Error( "Unknown error occurred during image processing" );
		}
	}
}

export const imageProcessingAPI = new ImageProcessingAPI();


