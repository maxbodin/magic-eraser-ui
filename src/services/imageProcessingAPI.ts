import type { Variation } from "../types/variation.ts";
import type { JobDoneResponse, JobStatusResponse, SubmitJobResponse } from "../types/api.ts";

export interface RemoveObjectPayload {
	imageBlob: Blob;
	maskBlob: Blob;
	aspectRatio: number;
}

export const STRENGTHS = [0.8, 0.9, 1.0];
export const GUIDANCES = [8, 9, 10, 11, 13];

const POLL_INTERVAL_MS = 10000;
const POLL_TIMEOUT_MS = 600_000;

class ImageProcessingAPI {
	private readonly baseUrl: string;

	constructor( baseUrl: string = import.meta.env.VITE_API_WORKER_URL ) {
		this.baseUrl = baseUrl.replace( /\/$/, "" );
	}

	/**
	 * Orchestrates all strength/guidance combinations concurrently.
	 * Calls onProgress as each variation resolves for immediate UI feedback.
	 */
	async generateAllVariations(
		payload: RemoveObjectPayload,
		onProgress: ( variation: Variation ) => void
	): Promise<void> {
		let successCount = 0;

		const tasks = STRENGTHS.flatMap( ( strength ) =>
			GUIDANCES.map( ( guidance ) =>
				this.fetchSingleVariation( payload, strength, guidance )
					.then( ( variation ) => {
						successCount++;
						onProgress( variation );
					} )
					.catch( ( err: Error ) => {
						// Gracefully handle individual variation failures so the grid still loads others.
						console.warn( `Failed S:${ strength } G:${ guidance } —`, err.message );
					} )
			)
		);

		// Wait for all requests to finish (whether resolved or rejected).
		await Promise.all( tasks );

		if (successCount === 0) {
			throw new Error( "All network requests failed. Please check your connection." );
		}
	}

	/**
	 * Submits a single job and polls until done.
	 */
	private async fetchSingleVariation(
		payload: RemoveObjectPayload,
		strength: number,
		guidance: number
	): Promise<Variation> {
		const jobId = await this.submitJob( payload, strength, guidance );
		const result = await this.pollUntilDone( jobId );

		return {
			strength: result.strength,
			guidance: result.guidance,
			image: result.image,
			aspectRatio: payload.aspectRatio,
		};
	}

	/**
	 * POST the job, returns a jobId immediately.
	 */
	private async submitJob(
		payload: RemoveObjectPayload,
		strength: number,
		guidance: number
	): Promise<string> {
		const formData = new FormData();
		formData.append( "image", payload.imageBlob, "image.jpg" );
		formData.append( "mask", payload.maskBlob, "mask.png" );
		formData.append( "strength", strength.toString() );
		formData.append( "guidance", guidance.toString() );

		const response = await fetch( `${ this.baseUrl }/api/erase-object-in-image`, {
			method: "POST",
			body: formData,
		} );

		if (!response.ok) {
			throw new Error( `Submit failed: HTTP ${ response.status }` );
		}

		const { jobId } = await response.json() as SubmitJobResponse;
		return jobId;
	}

	/**
	 * Polls GET /api/job/:jobId every POLL_INTERVAL_MS until status is done or error.
	 */
	private async pollUntilDone( jobId: string ): Promise<JobDoneResponse> {
		const deadline = Date.now() + POLL_TIMEOUT_MS;

		while (Date.now() < deadline) {
			await sleep( POLL_INTERVAL_MS );

			const response = await fetch( `${ this.baseUrl }/api/job/${ jobId }` );

			if (!response.ok) {
				throw new Error( `Poll failed: HTTP ${ response.status }` );
			}

			const data = await response.json() as JobStatusResponse;

			if (data.status === "done") return data;
			if (data.status === "error") throw new Error( data.error || "Job failed on server" );
			// status === "pending" → keep polling
		}

		throw new Error( `Job timed out after ${ POLL_TIMEOUT_MS / 1000 }s` );
	}
}

function sleep( ms: number ): Promise<void> {
	return new Promise( ( resolve ) => setTimeout( resolve, ms ) );
}

export const imageProcessingAPI = new ImageProcessingAPI();