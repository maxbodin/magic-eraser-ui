export interface SubmitJobResponse {
	jobId: string;
}

export interface JobPendingResponse {
	status: "pending";
}

export interface JobDoneResponse {
	status: "done";
	success: true;
	strength: number;
	guidance: number;
	image: string;
}

export interface JobErrorResponse {
	status: "error";
	success: false;
	error: string;
}

export type JobStatusResponse = JobPendingResponse | JobDoneResponse | JobErrorResponse;