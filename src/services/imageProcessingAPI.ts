import type { Variation } from "../types/variation.ts";
import type { JobDoneResponse, JobStatusResponse, SubmitJobResponse } from "../types/api.ts";

export interface RemoveObjectPayload {
	imageBlob: Blob;
	maskBlob: Blob;
	aspectRatio: number;
}

export const STRENGTHS = [0.8, 0.9, 1.0];
export const GUIDANCES = [8, 9, 10, 11, 13];

const SUBMIT_DELAY_MS = 500;
const INITIAL_WAIT_MS = 20_000;
const POLL_INTERVAL_MS = 8_000;
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
		const combinations = STRENGTHS.flatMap( ( strength ) =>
			GUIDANCES.map( ( guidance ) => ( { strength, guidance } ) )
		);

		// Phase 1: submit one at a time, avoids concurrent blob uploads and AI rate limits.
		const submitted: { jobId: string; strength: number; guidance: number }[] = [];

		for (const { strength, guidance } of combinations) {
			try {
				const jobId = await this.submitJob( payload, strength, guidance );
				submitted.push( { jobId, strength, guidance } );
				console.log( `Submitted S:${ strength } G:${ guidance } → ${ jobId }` );
			} catch (err: Error | any) {
				console.warn( `Submit failed S:${ strength } G:${ guidance } —`, err.message );
			}

			// Small delay between submissions to avoid overwhelming the Worker.
			await sleep( SUBMIT_DELAY_MS );
		}

		if (submitted.length === 0) {
			throw new Error( "All job submissions failed. Please check your connection." );
		}

		console.log( `${ submitted.length }/${ combinations.length } jobs submitted. Waiting ${ INITIAL_WAIT_MS / 1000 }s before polling…` );

		// Phase 2: let all workers start their background AI inference
		await sleep( INITIAL_WAIT_MS );

		// Phase 3: poll all concurrently, resolve progressively
		let successCount = 0;

		await Promise.all(
			submitted.map( ( { jobId, strength, guidance } ) =>
				this.pollUntilDone( jobId )
					.then( ( result ) => {
						successCount++;
						onProgress( {
							strength: result.strength,
							guidance: result.guidance,
							image: result.image,
							aspectRatio: payload.aspectRatio,
						} );
					} )
					.catch( ( err: Error ) => {
						console.warn( `Poll failed S:${ strength } G:${ guidance } —`, err.message );
					} )
			)
		);

		if (successCount === 0) {
			throw new Error( "All jobs failed to complete. Please try again." );
		}
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

		if (!response.ok) throw new Error( `Submit failed: HTTP ${ response.status }` );

		const { jobId } = await response.json() as SubmitJobResponse;
		return jobId;
	}

	/**
	 * Polls GET /api/job/:jobId every POLL_INTERVAL_MS until status is done or error.
	 */
	private async pollUntilDone( jobId: string ): Promise<JobDoneResponse> {
		const deadline = Date.now() + POLL_TIMEOUT_MS;

		while (Date.now() < deadline) {
			const response = await fetch( `${ this.baseUrl }/api/job/${ jobId }` );

			if (!response.ok) throw new Error( `Poll failed: HTTP ${ response.status }` );

			const data = await response.json() as JobStatusResponse;

			if (data.status === "done") return data;
			if (data.status === "error") throw new Error( data.error || "Job failed on server" );
			// status === "pending" → keep polling

			await sleep( POLL_INTERVAL_MS );
		}

		throw new Error( `Job timed out after ${ POLL_TIMEOUT_MS / 1000 }s` );
	}
}

function sleep( ms: number ): Promise<void> {
	return new Promise( ( resolve ) => setTimeout( resolve, ms ) );
}

export const imageProcessingAPI = new ImageProcessingAPI();