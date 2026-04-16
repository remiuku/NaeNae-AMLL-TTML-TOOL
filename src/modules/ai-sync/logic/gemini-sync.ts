import { globalStore } from "$/states/store";
import { aiApiKeyAtom, aiModelAtom, aiProviderAtom, aiEndpointAtom } from "$/modules/settings/states/index";

export interface AlignedWord {
	word: string;
	startTime: number;
	endTime: number;
}

export interface SyncResponse {
	words: AlignedWord[];
	comment: string;
}

export async function alignLyricsWithGemini(
	audioBlob: Blob,
	text: string,
): Promise<SyncResponse> {
	const provider = globalStore.get(aiProviderAtom);
	const model = globalStore.get(aiModelAtom);
	const apiKey = globalStore.get(aiApiKeyAtom);
	const endpoint = globalStore.get(aiEndpointAtom);

	if (!apiKey) {
		throw new Error("AI API Key is not set in settings.");
	}

	const base64Audio = await blobToBase64(audioBlob);

	const prompt = `
You are the world's sassiest, most judgmental, and slightly passive-aggressive lyric-audio sync tool. 
Task: Determine the start and end timestamps (in milliseconds) for each word in the text based on the audio.

Text: "${text}"

Constraint:
1. You MUST return a JSON object with:
   - "words": An array of objects with "word", "startTime", and "endTime" (ms).
   - "comment": A short, sassy, or trolling comment about the lyrics, the singer's performance, or the difficulty of syncing such a "masterpiece". Be mean but funny.

Rules:
1. The timestamps must be in milliseconds relative to the start of the audio.
2. Ensure the word sequence exactly matches "${text}".
3. Output ONLY the JSON object. Don't be "nice", be a troll.
`;

	let url = "";
	const body: Record<string, any> = {};
	const headers: Record<string, string> = {
		"Content-Type": "application/json",
	};

	if (provider === "google") {
		url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
		body.contents = [
			{
				parts: [
					{ text: prompt },
					{
						inline_data: {
							mime_type: "audio/wav",
							data: base64Audio,
						},
					},
				],
			},
		];
		body.generationConfig = {
			response_mime_type: "application/json",
		};
	} else {
		// OpenRouter or other
		url = endpoint || "https://openrouter.ai/api/v1/chat/completions";
		headers.Authorization = `Bearer ${apiKey}`;
		body.model = model;
		body.messages = [
			{
				role: "user",
				content: [
					{ type: "text", text: prompt },
					{
						type: "image_url", // OpenRouter often uses this for multi-modal if supported
						image_url: {
							url: `data:audio/wav;base64,${base64Audio}`,
						},
					},
				],
			},
		];
		body.response_format = { type: "json_object" };
	}

	const response = await fetch(url, {
		method: "POST",
		headers,
		body: JSON.stringify(body),
	});

	if (!response.ok) {
		const err = await response.text();
		throw new Error(`AI Sync failed: ${response.statusText} - ${err}`);
	}

	const data = (await response.json()) as any;
	let content = "";
	if (provider === "google") {
		content = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
	} else {
		content = data.choices?.[0]?.message?.content || "";
	}

	try {
		const result = JSON.parse(content);
		if (result.words && Array.isArray(result.words)) {
			return {
				words: result.words,
				comment: result.comment || "I have no words for this trash."
			};
		}
		if (Array.isArray(result)) {
			return {
				words: result,
				comment: "You didn't give me a comment field, but I'll sync it anyway."
			}
		}
		throw new Error("Invalid response format from AI.");
	} catch (_e) {
		console.error("Failed to parse AI response:", content);
		throw new Error("AI returned invalid JSON.");
	}
}

function blobToBase64(blob: Blob): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onloadend = () => {
			const base64String = (reader.result as string).split(",")[1];
			resolve(base64String);
		};
		reader.onerror = reject;
		reader.readAsDataURL(blob);
	});
}
