export interface Variation {
	strength: number;
	guidance: number;
	image: string;          // base64
	aspectRatio?: number;   // width / height
}