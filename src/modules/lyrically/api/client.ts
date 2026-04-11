import type { LyricallySearchResponse, LyricallyTrack } from "../types";

const BASE_URL = "https://lyric-api.paxsenix.biz/api";

// Use public proxies to bypass browser CORS policies for the Lyrically API
const proxiedFetch = async (targetUrl: string): Promise<any> => {
	const proxies = [
		(url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
		(url: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
		(url: string) => `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
		(url: string) => `https://thingproxy.freeboard.io/fetch/${encodeURIComponent(url)}`
	];

	let lastError: Error | null = null;
	for (let i = 0; i < proxies.length; i++) {
		try {
			const proxyUrl = proxies[i](targetUrl);
			const response = await fetch(proxyUrl);
			
			if (!response.ok) {
				lastError = new Error(`Proxy ${i + 1} returned ${response.status}`);
				continue;
			}

			// Some proxies (like allorigins /get) wrap the response in JSON
			if (proxyUrl.includes("allorigins.win/get")) {
				const wrapper = await response.json();
				if (wrapper.contents) {
					// The contents inside allorigins is a stringified JSON
					return typeof wrapper.contents === "string" 
						? JSON.parse(wrapper.contents) 
						: wrapper.contents;
				}
			}

			// Otherwise, it's a direct JSON response
			return await response.json();
		} catch (e) {
			lastError = e as Error;
		}
	}
	throw new Error(`Failed to fetch from Lyrically API via proxies: ${lastError?.message}`);
};

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
			const data = await proxiedFetch(`${BASE_URL}/search?q=${encodeURIComponent(query)}`);
			
			if (data.error) {
				throw new Error("Lyrically API returned an error");
			}

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
			const data = await proxiedFetch(
				`${BASE_URL}/lyrics?name=${encodeURIComponent(name)}&artist=${encodeURIComponent(artist)}`
			);
			return data;
		} catch (error) {
			console.error("Lyrically API Error:", error);
			throw error;
		}
	},
};

