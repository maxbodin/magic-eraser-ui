import type { Variation } from "../types/variation.ts";
import type { JobDoneResponse, JobStatusResponse, SubmitJobResponse } from "../types/api.ts";

export interface RemoveObjectPayload {
	imageBlob: Blob;
	maskBlob: Blob;
	aspectRatio: number;
}

export const STRENGTHS = [0.8, 0.9, 1.0];
export const GUIDANCES = [8, 9, 10, 11, 13];

const SUBMIT_DELAY_MS = 2_000;
const INITIAL_WAIT_MS = 20_000;
const POLL_INTERVAL_MS = 20_000;
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
		const startTime = performance.now();
		const totalCombinations = STRENGTHS.length * GUIDANCES.length;
		
		console.log(
			`[IMAGE_PROCESSING] Starting variation generation - ${ totalCombinations } combinations.`,
			{
				strengths: STRENGTHS,
				guidances: GUIDANCES,
				imageBlobSize: `${ (payload.imageBlob.size / 1024).toFixed(2) } KB`,
				maskBlobSize: `${ (payload.maskBlob.size / 1024).toFixed(2) } KB`,
				aspectRatio: payload.aspectRatio,
			}
		);

		const combinations = STRENGTHS.flatMap( ( strength ) =>
			GUIDANCES.map( ( guidance ) => ( { strength, guidance } ) )
		);

		// Phase 1: submit one at a time, avoids concurrent blob uploads and AI rate limits.
		const submitted: { jobId: string; strength: number; guidance: number }[] = [];
		const submissionStartTime = performance.now();

		console.log( `[PHASE_1_SUBMISSION] Submitting ${ combinations.length } jobs...` );

		for (const { strength, guidance } of combinations) {
			try {
				const jobId = await this.submitJob( payload, strength, guidance );
				submitted.push( { jobId, strength, guidance } );
				console.log(
					`✅ [SUBMISSION_SUCCESS] Job submitted.`,
					{
						jobId,
						strength,
						guidance,
						submissionProgress: `${ submitted.length }/${ combinations.length }`,
					}
				);
			} catch (err: Error | any) {
				console.warn(
					`❌ [SUBMISSION_FAILED] Job submission failed.`,
					{
						strength,
						guidance,
						error: err.message,
						submitted: submitted.length,
						failed: combinations.length - submitted.length,
					}
				);
			}

			// Small delay between submissions to avoid overwhelming the Worker.
			await sleep( SUBMIT_DELAY_MS );
		}

		const submissionDuration = performance.now() - submissionStartTime;

		if (submitted.length === 0) {
			console.error( `💥 [CRITICAL_ERROR] All job submissions failed.` );
			throw new Error( "All job submissions failed. Please check your connection." );
		}

		console.log(
			`[PHASE_1_COMPLETE] Submission phase completed.`,
			{
				successful: submitted.length,
				failed: combinations.length - submitted.length,
				successRate: `${ ((submitted.length / combinations.length) * 100).toFixed(1) }%`,
				duration: `${ submissionDuration.toFixed(2) } ms`,
				jobs: submitted.map( j => `${ j.jobId } (S:${ j.strength } G:${ j.guidance })` ),
			}
		);

		const initialWaitStartTime = performance.now();
		console.log(
			`[PHASE_2_WAITING] Waiting for server processing to start.`,
			{
				waitDuration: `${ (INITIAL_WAIT_MS / 1000).toFixed(1) }s`,
				startTime: new Date().toISOString(),
			}
		);

		// Phase 2: let all workers start their background AI inference
		await sleep( INITIAL_WAIT_MS );

		const initialWaitDuration = performance.now() - initialWaitStartTime;
		console.log(
			`[PHASE_2_COMPLETE] Initial wait period completed.`,
			{
				duration: `${ initialWaitDuration.toFixed(2) } ms`,
			}
		);

		// Phase 3: poll all concurrently, resolve progressively
		const pollingStartTime = performance.now();
		let successCount = 0;
		let failureCount = 0;

		console.log(
			`🔄 [PHASE_3_POLLING] Starting concurrent polling for ${ submitted.length } jobs.`,
			{
				pollInterval: `${ POLL_INTERVAL_MS }ms`,
				pollTimeout: `${ (POLL_TIMEOUT_MS / 1000).toFixed(1) }s`,
				startTime: new Date().toISOString(),
			}
		);

		await Promise.all(
			submitted.map( ( { jobId, strength, guidance } ) =>
				this.pollUntilDone( jobId, strength, guidance )
					.then( ( result ) => {
						successCount++;
						console.log(
							`[VARIATION_COMPLETE] Variation processed successfully.`,
							{
								jobId,
								strength: result.strength,
								guidance: result.guidance,
								imageUrlLength: result.imageUrl.length,
								completionProgress: `${ successCount }/${ submitted.length }`,
								elapsedTime: `${ (performance.now() - pollingStartTime).toFixed(2) } ms`,
							}
						);
						onProgress( {
							strength: result.strength,
							guidance: result.guidance,
							image: result.imageUrl,
							aspectRatio: payload.aspectRatio,
						} );
					} )
					.catch( ( err: Error ) => {
						failureCount++;
						console.warn(
							`❌ [VARIATION_FAILED] Variation processing failed.`,
							{
								jobId,
								strength,
								guidance,
								error: err.message,
								failureProgress: `${ failureCount }/${ submitted.length }`,
								successProgress: `${ successCount }/${ submitted.length }`,
							}
						);
					} )
			)
		);

		const pollingDuration = performance.now() - pollingStartTime;

		if (successCount === 0) {
			console.error(
				`💥 [CRITICAL_ERROR] All jobs failed to complete.`,
				{
					totalFailed: failureCount,
					duration: `${ pollingDuration.toFixed(2) } ms`,
				}
			);
			throw new Error( "All jobs failed to complete. Please try again." );
		}

		const totalDuration = performance.now() - startTime;
		console.log(
			`[PROCESSING_COMPLETE] Image processing workflow completed successfully.`,
			{
				successCount,
				failureCount,
				successRate: `${ ((successCount / submitted.length) * 100).toFixed(1) }%`,
				phase1Duration: `${ submissionDuration.toFixed(2) } ms`,
				phase2Duration: `${ initialWaitDuration.toFixed(2) } ms`,
				phase3Duration: `${ pollingDuration.toFixed(2) } ms`,
				totalDuration: `${ totalDuration.toFixed(2) } ms`,
				averageTimePerVariation: `${ (totalDuration / successCount).toFixed(2) } ms`,
			}
		);
	}

	/**
	 * POST the job, returns a jobId immediately.
	 */
	private async submitJob(
		payload: RemoveObjectPayload,
		strength: number,
		guidance: number
	): Promise<string> {
		const submitStartTime = performance.now();

		console.log(
			`[SUBMIT_START] Preparing job submission.`,
			{
				strength,
				guidance,
				imageBlobSize: `${ (payload.imageBlob.size / 1024).toFixed(2) } KB`,
				maskBlobSize: `${ (payload.maskBlob.size / 1024).toFixed(2) } KB`,
				totalSize: `${ ((payload.imageBlob.size + payload.maskBlob.size) / 1024).toFixed(2) } KB`,
				aspectRatio: payload.aspectRatio,
			}
		);

		const formData = new FormData();
		formData.append( "image", payload.imageBlob, "image.jpg" );
		formData.append( "mask", payload.maskBlob, "mask.png" );
		formData.append( "strength", strength.toString() );
		formData.append( "guidance", guidance.toString() );

		const uploadStartTime = performance.now();

		try {
			const response = await fetch( `${ this.baseUrl }/api/erase-object-in-image`, {
				method: "POST",
				body: formData,
			} );

			const uploadDuration = performance.now() - uploadStartTime;

			if (!response.ok) {
				console.error(
					`❌ [SUBMIT_HTTP_ERROR] Failed to submit job.`,
					{
						strength,
						guidance,
						statusCode: response.status,
						statusText: response.statusText,
						uploadDuration: `${ uploadDuration.toFixed(2) } ms`,
					}
				);
				throw new Error( `Submit failed: HTTP ${ response.status }` );
			}

			const submitData = await response.json() as SubmitJobResponse;
			const totalDuration = performance.now() - submitStartTime;

			console.log(
				`[SUBMIT_SUCCESS] Job submitted to server.`,
				{
					jobId: submitData.jobId,
					strength,
					guidance,
					uploadDuration: `${ uploadDuration.toFixed(2) } ms`,
					totalDuration: `${ totalDuration.toFixed(2) } ms`,
				}
			);

			return submitData.jobId;
		} catch (err: Error | any) {
			const totalDuration = performance.now() - submitStartTime;
			console.error(
				`❌ [SUBMIT_ERROR] Error during job submission.`,
				{
					strength,
					guidance,
					error: err.message,
					totalDuration: `${ totalDuration.toFixed(2) } ms`,
				}
			);
			throw err;
		}
	}

	/**
	 * Polls GET /api/job/:jobId every POLL_INTERVAL_MS until status is done or error.
	 */
	private async pollUntilDone( jobId: string, strength: number, guidance: number ): Promise<JobDoneResponse> {
		const deadline = Date.now() + POLL_TIMEOUT_MS;
		let pollAttempt = 0;
		const pollStartTime = performance.now();

		console.log(
			`[POLL_START] Starting to poll job.`,
			{
				jobId,
				strength,
				guidance,
				timeout: `${ (POLL_TIMEOUT_MS / 1000).toFixed(1) }s`,
				pollInterval: `${ POLL_INTERVAL_MS }ms`,
			}
		);

		while (Date.now() < deadline) {
			pollAttempt++;
			const currentAttemptTime = performance.now();

			try {
				const response = await fetch( `${ this.baseUrl }/api/job/${ jobId }` );

				if (!response.ok) {
					console.warn(
						`⚠️  [POLL_HTTP_ERROR] HTTP error during poll.`,
						{
							jobId,
							strength,
							guidance,
							attempt: pollAttempt,
							statusCode: response.status,
							statusText: response.statusText,
						}
					);
					throw new Error( `Poll failed: HTTP ${ response.status }` );
				}

				const data = await response.json() as JobStatusResponse;
				const attemptDuration = performance.now() - currentAttemptTime;

				if (data.status === "done") {
					const totalDuration = performance.now() - pollStartTime;
					console.log(
						`✅ [POLL_SUCCESS] Job completed.`,
						{
							jobId,
							strength,
							guidance,
							totalAttempts: pollAttempt,
							totalPollDuration: `${ totalDuration.toFixed(2) } ms`,
							lastRequestDuration: `${ attemptDuration.toFixed(2) } ms`,
							averageRequestDuration: `${ (totalDuration / pollAttempt).toFixed(2) } ms`,
							imageUrl: data.imageUrl.substring( 0, 50 ) + "...",
						}
					);
					return data;
				}

				if (data.status === "error") {
					console.error(
						`❌ [POLL_JOB_ERROR] Job failed on server.`,
						{
							jobId,
							strength,
							guidance,
							attempt: pollAttempt,
							error: data.error || "Unknown error",
							totalDuration: `${ (performance.now() - pollStartTime).toFixed(2) } ms`,
						}
					);
					throw new Error( data.error || "Job failed on server" );
				}

				// status === "pending" → keep polling
				console.log(
					`[POLL_PENDING] Job still processing.`,
					{
						jobId,
						strength,
						guidance,
						attempt: pollAttempt,
						requestDuration: `${ attemptDuration.toFixed(2) } ms`,
						elapsedSincePollStart: `${ (performance.now() - pollStartTime).toFixed(2) } ms`,
						remainingTime: `${ ((deadline - Date.now()) / 1000).toFixed(1) }s`,
					}
				);
			} catch (err: Error | any) {
				console.error(
					`❌ [POLL_REQUEST_ERROR] Error during poll request.`,
					{
						jobId,
						strength,
						guidance,
						attempt: pollAttempt,
						error: err.message,
						elapsedTime: `${ (performance.now() - pollStartTime).toFixed(2) } ms`,
					}
				);
				// Re-throw to let the caller handle it
				throw err;
			}

			await sleep( POLL_INTERVAL_MS );
		}

		console.error(
			`💥 [POLL_TIMEOUT] Job polling timed out.`,
			{
				jobId,
				strength,
				guidance,
				totalAttempts: pollAttempt,
				timeout: `${ (POLL_TIMEOUT_MS / 1000).toFixed(1) }s`,
				totalDuration: `${ (performance.now() - pollStartTime).toFixed(2) } ms`,
			}
		);
		throw new Error( `Job timed out after ${ POLL_TIMEOUT_MS / 1000 }s` );
	}
}

function sleep( ms: number ): Promise<void> {
	return new Promise( ( resolve ) => setTimeout( resolve, ms ) );
}

export const imageProcessingAPI = new ImageProcessingAPI();