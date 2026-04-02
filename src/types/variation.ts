export interface Variation {
	strength: number;
	guidance: number;
	image: string;          // Image URL (Vercel blob url)
	aspectRatio?: number;   // width / height
}