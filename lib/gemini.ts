import { GoogleGenAI, Type, Schema } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export interface KeySignature {
  type: 'sharp' | 'flat' | 'none';
  count: number;
  notes: string[];
}

export interface MusicTheoryResponse {
  root: string;
  type: string;
  category: 'scale' | 'chord' | 'interval' | 'other';
  notes: string[];
  intervals: string[];
  description: string;
  keySignature?: KeySignature;
}

export const analyzeMusicRequest = async (prompt: string): Promise<MusicTheoryResponse> => {
  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      root: {
        type: Type.STRING,
        description: "The root note of the scale or chord (e.g., 'C', 'F#', 'Bb').",
      },
      type: {
        type: Type.STRING,
        description: "The specific name of the scale or chord (e.g., 'Major', 'Minor Harmonic', 'Dominant 7th').",
      },
      category: {
        type: Type.STRING,
        enum: ["scale", "chord", "interval", "other"],
        description: "The category of the musical structure.",
      },
      notes: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "The list of notes in the scale or chord. Normalize sharp/flat spelling to be consistent (e.g., use either Sharps or Flats based on the key signature).",
      },
      intervals: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "The interval structure relative to the root (e.g., ['1', '3', '5', 'b7']).",
      },
      description: {
        type: Type.STRING,
        description: "A concise, 1-2 sentence explanation of this musical structure and its emotional quality or usage.",
      },
      keySignature: {
        type: Type.OBJECT,
        properties: {
          type: {
            type: Type.STRING,
            enum: ["sharp", "flat", "none"],
            description: "Whether the key signature uses sharps, flats, or neither."
          },
          count: {
            type: Type.NUMBER,
            description: "The number of sharps or flats in the key signature."
          },
          notes: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "The specific notes that are altered in the key signature (e.g. ['F#', 'C#'])."
          }
        },
        required: ["type", "count", "notes"],
        description: "The key signature associated with the scale or mode. For chords, provide the key signature of the corresponding major/minor key if applicable, or return type='none' if ambiguous."
      }
    },
    required: ["root", "type", "category", "notes", "intervals", "description", "keySignature"],
  };

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: schema,
      systemInstruction: `You are a music theory expert. Your job is to interpret user requests about scales, chords, and modes, and return structured data for visualization. 
      Always resolve the notes to specific pitches (e.g., C, D, E). 
      If the user asks for a chord like "Cmaj7", provide the notes C, E, G, B. 
      If the user asks for "Eb Minor Scale", provide Eb, F, Gb, Ab, Bb, Cb, Db.
      Ensure note spellings are theoretically correct for the key (use double sharps/flats only if strictly necessary, otherwise enharmonic equivalents are fine for visualization).`
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error("No response from Gemini");
  }

  return JSON.parse(text) as MusicTheoryResponse;
};