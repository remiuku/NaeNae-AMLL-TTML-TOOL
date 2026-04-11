import type { LyricallySearchResponse, LyricallyTrack } from "../types";

const BASE_URL = "https://lyric-api.paxsenix.biz/api";

export const LyricallyApi = {
	/**
	 * Search for lyrics using the aggregator API.
	 * This API handles scraping server-side, bypassing browser CORS and blocks.
	 * @param query Search keywords (e.g. "Artist - Song")
	 * @returns A list of potential matches with lyrics already included.
	 */
	async search(query: string): Promise<LyricallyTrack[]> {
		if (!query.trim()) return [];

		try {
			const response = await fetch(
				`${BASE_URL}/search?q=${encodeURIComponent(query)}`,
			);
			if (!response.ok) {
				throw new Error(`Lyrically API Search failed: ${response.statusText}`);
			}
			const data = (await response.json()) as LyricallySearchResponse;
			
			if (data.error) {
				throw new Error("Lyrically API returned an error");
			}

			// The API returns an array of results in 'data'
			return data.data || [];
		} catch (error) {
			console.error("Lyrically API Error:", error);
			throw error;
		}
	},

	/**
	 * Get lyrics directly for a specific song and artist.
	 * @param name Song name
	 * @param artist Artist name
	 */
	async getLyrics(name: string, artist: string): Promise<LyricallyTrack> {
		try {
			const response = await fetch(
				`${BASE_URL}/lyrics?name=${encodeURIComponent(name)}&artist=${encodeURIComponent(artist)}`,
			);
			if (!response.ok) {
				throw new Error(`Lyrically API Fetch failed: ${response.statusText}`);
			}
			return (await response.json()) as LyricallyTrack;
		} catch (error) {
			console.error("Lyrically API Error:", error);
			throw error;
		}
	},
};
