import { GeniusApi } from "$/modules/genius/api/client";
import type { GeniusArtistDetail } from "$/modules/genius/types";
import { LrcLibApi } from "$/modules/lrclib/api/client";
import { lrcToPlainLyrics } from "$/utils/parse-lrc";

export type OnlineImportSource = "lrclib" | "genius";

/** A search hit from an online source. Picking one only fills the text area and metadata. */
export interface ImportTrack {
	source: OnlineImportSource;
	id: string | number;
	name: string;
	artist: string;
	album?: string;
	duration?: number;
	cover?: string;
	synced?: boolean;
	lyrics?: string;
	fetchLyrics?: () => Promise<string>;
	fetchSongwriters?: () => Promise<string[]>;
}

const STAGE_NAME_PREFIXES = ["King ", "The ", "Mr. ", "aka ", "alias ", "DJ "];

/** Best guess at an artist's legal name from their Genius profile. */
export function guessRealName(
	artistName: string,
	detail: Pick<GeniusArtistDetail, "alternate_names" | "description">,
): string {
	const description = detail.description.plain || "";
	const bornMatch = description.match(
		/born\s+([A-Z][a-zA-Z.]+(?:\s[A-Z][a-zA-Z.]+){1,4})/,
	);
	const realNameMatch = description.match(
		/real\s+name\s+(?:is\s+)?([A-Z][a-zA-Z.]+(?:\s[A-Z][a-zA-Z.]+){1,4})/i,
	);
	const lowerArtist = artistName.toLowerCase();
	const candidates = (detail.alternate_names ?? []).filter((name) => {
		const wordCount = name.split(" ").length;
		return (
			!name.toLowerCase().includes(lowerArtist) &&
			!lowerArtist.includes(name.toLowerCase()) &&
			wordCount >= 2 &&
			wordCount <= 4 &&
			!STAGE_NAME_PREFIXES.some((prefix) => name.startsWith(prefix)) &&
			name.split(" ").every((word) => /^[A-Z]/.test(word)) &&
			!name.includes("http") &&
			!name.includes("www.")
		);
	});
	return (
		bornMatch?.[1] ||
		realNameMatch?.[1] ||
		candidates.sort((a, b) => a.length - b.length)[0] ||
		artistName
	);
}

export async function searchOnlineLyrics(
	source: OnlineImportSource,
	query: string,
	geniusApiKey: string,
): Promise<ImportTrack[]> {
	if (source === "lrclib") {
		return (await LrcLibApi.search(query)).map((track) => ({
			source,
			id: track.id,
			name: track.name,
			artist: track.artistName,
			album: track.albumName,
			duration: track.duration,
			synced: !!track.syncedLyrics,
			lyrics:
				track.plainLyrics ||
				(track.syncedLyrics ? lrcToPlainLyrics(track.syncedLyrics) : ""),
		}));
	}
	const { hits } = (await GeniusApi.search(query, geniusApiKey)).response;
	return hits.map(({ result }) => ({
		source,
		id: result.id,
		name: result.title,
		artist: result.primary_artist.name,
		album: result.album?.name,
		cover: result.song_art_image_url || result.song_art_image_thumbnail_url,
		fetchLyrics: () => GeniusApi.getLyrics(result.id),
		fetchSongwriters: async () => {
			const { writer_artists } = (
				await GeniusApi.getSongById(result.id, geniusApiKey)
			).response.song;
			const names: string[] = [];
			for (const artist of writer_artists) {
				try {
					const detail = (
						await GeniusApi.getArtistById(artist.id, geniusApiKey)
					).response.artist;
					names.push(guessRealName(artist.name, detail));
				} catch {
					names.push(artist.name);
				}
			}
			return names;
		},
	}));
}
