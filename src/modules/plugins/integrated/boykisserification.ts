import type { IntegratedPlugin } from "../types";

export const boykisserificationPlugin: IntegratedPlugin = {
    id: "boykisserification",
    name: "Boykisserification",
    description: "Transforms your lyrics into a silly, boykisser-themed masterpiece. Mrow! :3",
    author: "NaeNae",
    version: "1.0.0",
    type: "both",
    isEnabled: true,
    isIntegrated: true,
    techniques: ["State Mutation", "Aggressive UwUification", "Kaomoji Injection"],
    usage: "HOW IT WORKS: Rewrites your entire project's lyrics with extreme uwu-energy. \nHOW TO USE: Tools > Boykisserification.",
    runImporter: async (input: string) => {
        // STRICT TTML ONLY CHECK
        if (!input.includes("<tt") || !input.includes("xmlns=\"http://www.w3.org/ns/ttml\"")) {
             throw new Error("BOYKISSER ERROR: This plugin only accepts HIGH-FIDELITY TTML XML. Legacy LRC files are too stinky! :3 👉👈");
        }
        // Since the tool and exporter handle the transformation, 
        // the importer just validates and passes the TTML through for secondary processing
        return input;
    },
    runTool: async (lines: any[]) => {
        const kaomojis = ["(✿◠‿◠)", "(・`ω´・)", "^w^", ">w<", ";;w;;", "(U w U)"];
        const emojies = ["✨", "🌸", "💖", "💫", "💢", "💞"];
        
        const getRandom = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

        const processText = (text: string) => {
             // Aggressive screenshot-accurate rules
             let processed = text
                .replace(/[rl]/g, "w")
                .replace(/[RL]/g, "W")
                .replace(/n([aeiou])/g, "ny$1")
                .replace(/mine/gi, "minye")
                .replace(/night/gi, "nyight")
                .replace(/dont|don't/gi, "Don't 👉👈")
                .replace(/pranks/gi, "pwanks")
                .replace(/drop/gi, "D-Dwop")
                .replace(/mama/gi, "mama (cutie)")
                .replace(/show/gi, "show >w<");

             if (Math.random() > 0.4) processed += ` ${getRandom(kaomojis)}`;
             if (Math.random() > 0.6) processed += ` ${getRandom(emojies)}`;
             
             return processed;
        };

        return lines.map(line => ({
            ...line,
            words: line.words.map((word: any) => ({
                ...word,
                word: processText(word.word)
            }))
        }));
    },
    runExporter: async (ttmlData: string) => {
        const kaomojis = ["(✿◠‿◠)", "(・`ω´・)", "^w^", ">w<", ";;w;;", "(U w U)"];
        const emojies = ["✨", "🌸", "💖", "💫"];
        const interjections = [";;w;;", "UwUa", "woah", "!! ~ mrow!!", "nyaa~"];

        const getRandom = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

        const escapeXml = (unsafe: string) => {
            return unsafe.replace(/[<>&'"]/g, (c) => {
                switch (c) {
                    case "<": return "&lt;";
                    case ">": return "&gt;";
                    case "&": return "&amp;";
                    case "'": return "&apos;";
                    case "\"": return "&quot;";
                    default: return c;
                }
            });
        };

        const uwuify = (text: string) => {
            let processed = text
                .replace(/[rl]/g, "w")
                .replace(/[RL]/g, "W")
                .replace(/n([aeiou])/g, "ny$1")
                .replace(/mine/gi, "minye")
                .replace(/night/gi, "nyight")
                .replace(/dont|don't/gi, "Don't 👉👈")
                .replace(/pranks/gi, "pwanks")
                .replace(/drop/gi, "D-Dwop")
                .replace(/say/gi, "✨ say 🌸")
                .trim();

            const words = processed.split(" ");
            const newWords = words.map(word => {
                if (Math.random() > 0.6) return `${word} ${getRandom(kaomojis)}`;
                if (Math.random() > 0.8) return `${word} ${getRandom(interjections)}`;
                return word;
            });

            const final = newWords.join(" ") + " " + getRandom(emojies);
            return escapeXml(final);
        };

        let result = ttmlData.replace(/>([^<]+)</g, (match, text) => {
            if (text.trim().length === 0) return match;
            // The text between > and < might be encoded already, but we'll re-encode to be safe
            return `>${uwuify(text)}<`;
        });

        if (result.includes("</body>")) {
            result = result.replace("</body>", "  <p begin=\"00:00:00.000\" end=\"00:00:05.000\" tts:textAlign=\"center\">MROW!! You-You like kissing boys, don't you?? :3 👉👈</p>\n</body>");
        }

        return `<!-- SCREENSHOT-ACCURATE BOYKISSERIFIED OUTPUT -->\n${result}`;
    }
};
