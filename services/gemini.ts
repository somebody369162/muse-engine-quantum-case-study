

import { GoogleGenAI, GenerateContentResponse, Modality, Content, Part, Type } from "@google/genai";
import { Mode, Focus, type Citation } from '../types';
import { SYSTEM_PROMPTS } from '../constants';

const getAiClient = () => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY is not configured. The application cannot connect to the generative AI service.");
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};


const blobToGenerativePart = async (blob: Blob): Promise<{ inlineData: { data: string; mimeType: string } }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64Data = dataUrl.split(',')[1];
      resolve({
        inlineData: {
          data: base64Data,
          mimeType: blob.type || 'audio/webm',
        },
      });
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(blob);
  });
};

const fileToGenerativePart = async (file: File): Promise<Part> => {
    const base64EncodedData = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(file);
    });
    return {
        inlineData: {
            data: base64EncodedData,
            mimeType: file.type,
        },
    };
};

export const generateSpeech = async (text: string): Promise<string> => {
    if (!navigator.onLine) {
        throw new Error("You appear to be offline. Please check your internet connection.");
    }
    try {
        const ai = getAiClient();
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text }] }],
            config: {
                responseModalities: [Modality.AUDIO],
            },
        });

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!base64Audio) {
            throw new Error("No audio data found in the response.");
        }
        return base64Audio;
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error) || "An unexpected error occurred during speech generation.";
        console.error(`Speech generation failed: ${errorMessage}`);
        throw new Error(`Speech Generation Error: ${errorMessage}`);
    }
};

export const transcribeAudio = async (audioBlob: Blob): Promise<string> => {
    if (!navigator.onLine) {
        throw new Error("You appear to be offline. Please check your internet connection.");
    }
    try {
      const ai = getAiClient();
      const audioPart = await blobToGenerativePart(audioBlob);
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
          parts: [
            audioPart,
            { text: "Transcribe the following audio:" },
          ],
        },
      });
  
      return response.text.trim();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error) || "An unexpected error occurred during transcription.";
      console.error(`Audio transcription failed: ${errorMessage}`);
      throw new Error(`Audio Transcription Error: ${errorMessage}`);
    }
};

export const getPrediction = async (
  currentText: string,
  history: Content[],
  focuses: Focus[],
  writingStyle: string,
  styleContext?: string
): Promise<string> => {
  if (!navigator.onLine) {
    return ''; // Silently fail for predictions if offline
  }
  if (!currentText || !currentText.trim()) return '';
  try {
    const ai = getAiClient();

    let systemInstruction = "You are an intelligent text prediction AI. Your goal is to predict the next few words a user is typing based on their input. Only return the predicted text, with no extra formatting or explanation. The prediction should seamlessly continue the user's sentence. Do not repeat the user's input. For example, if the user types 'The quick brown fox', you might return 'jumps over the lazy dog.'.";
    
    if (writingStyle) {
      systemInstruction += `\n\nThe user wants you to adopt the following writing style: "${writingStyle}". Ensure your prediction matches this style.`;
    } else {
      systemInstruction += `\n\nYour prediction should match the user's conversational style found in the history.`
    }

    if (focuses && focuses.length > 0) {
        systemInstruction += `\n\nThe user is writing with the following focuses in mind: ${focuses.join(', ')}. Tailor your prediction to match these topics.`;
    }

    if (styleContext) {
        systemInstruction += `\n\nUse the following document as context for writing style and topic:\n---\n${styleContext}\n---`;
    }

    const contents: Content[] = [
        ...history,
        { role: 'user', parts: [{ text: `Here is the text I have written so far:\n\n"${currentText}"\n\nWhat are the next few words?` }] }
    ];

    const response = await ai.models.generateContent({
      model: 'gemini-flash-lite-latest',
      contents: contents,
      config: {
        systemInstruction,
        stopSequences: ['.', '?', '!', '\n'],
        maxOutputTokens: 20,
      },
    });

    let prediction = response.text.trim();
    if (prediction.match(/^[.,;!?]/)) {
        prediction = prediction.substring(1).trim();
    }
    
    if (currentText.length > 0 && !currentText.endsWith(' ') && prediction.length > 0 && !prediction.startsWith(' ')) {
      prediction = ' ' + prediction;
    } else if (currentText.length > 0 && currentText.endsWith(' ') && prediction.length > 0 && prediction.startsWith(' ')) {
      prediction = prediction.trimStart();
    }

    return prediction;

  } catch (error) {
    console.error("Predictive text failed:", error);
    return ''; 
  }
};

export const modifyText = async (
    selectedText: string,
    instruction: string,
    documentContext: string
): Promise<string> => {
    if (!navigator.onLine) {
        throw new Error("You appear to be offline. Please check your internet connection.");
    }
    try {
        const ai = getAiClient();
        
        let systemInstruction = "You are an expert editor and writing assistant. Your task is to modify the user's selected text according to their specific instruction.";
        if (!selectedText.trim()) {
            systemInstruction += " The user has not selected any text, so you should generate new text based on the instruction and the surrounding document context."
        }
        systemInstruction += "\n\n**Rules:**\n1. Return ONLY the modified or generated text. Do not include introductory phrases like 'Here is the rewritten text:'.\n2. Maintain the original meaning unless instructed otherwise.\n3. Ensure the style fits the surrounding context.";

        const userPrompt = `
Document Context (surrounding text):
"""
${documentContext}
"""

${selectedText.trim() ? `Selected Text to Modify:\n"""\n${selectedText}\n"""\n` : ''}
Instruction:
${instruction}
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
            config: {
                systemInstruction,
            }
        });

        return response.text.trim();

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error) || "An unexpected error occurred during text modification.";
        console.error(`Text modification failed: ${errorMessage}`);
        throw new Error(`Text Modification Error: ${errorMessage}`);
    }
};


const parseCitations = (response: GenerateContentResponse): Citation[] => {
  const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
  if (!groundingMetadata?.groundingChunks || !Array.isArray(groundingMetadata.groundingChunks)) {
    return [];
  }
  
  return groundingMetadata.groundingChunks
    .filter((chunk => chunk && chunk.web && chunk.web.uri && chunk.web.title))
    .map(chunk => ({
      uri: chunk.web!.uri!,
      title: chunk.web!.title!,
    }));
};

async function* streamAndParseCitations(stream: AsyncIterable<GenerateContentResponse>): AsyncGenerator<{ textChunk?: string, citations?: Citation[] }> {
    const allCitations = new Map<string, Citation>();
    for await (const chunk of stream) {
        const textChunk = chunk.text;
        if (textChunk) {
            yield { textChunk };
        }
        const newCitations = parseCitations(chunk);
        if (newCitations.length > 0) {
            let updated = false;
            newCitations.forEach(c => {
                if (!allCitations.has(c.uri)) {
                    allCitations.set(c.uri, c);
                    updated = true;
                }
            });
            if (updated) {
                yield { citations: Array.from(allCitations.values()) };
            }
        }
    }
}

const buildContextualPrompt = (prompt: string, context?: string): string => {
  if (!context) return prompt;
  return `Given the following context:\n---\n${context}\n---\n\nNow, please respond to the following request: "${prompt}"`;
}

const buildSystemInstruction = (base: string, focuses?: Focus[]): string => {
    if (!focuses || focuses.length === 0) {
        return base;
    }
    const focusNames = focuses.join(', ');
    return `${base}\n\nAdditionally, incorporate expertise from the following fields into your response: ${focusNames}.`;
};

export const generatePlan = async (goal: string): Promise<any> => {
    if (!navigator.onLine) {
        throw new Error("You appear to be offline. Please check your internet connection.");
    }
    try {
        const ai = getAiClient();
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: `My goal is: "${goal}". Please break this down into a step-by-step plan. For each step, provide a clear description. If a step requires user input, also provide a short, clear question to ask the user.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        plan: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    description: {
                                        type: Type.STRING,
                                        description: "A clear, concise description of the step to be executed."
                                    },
                                    input_prompt: {
                                        type: Type.STRING,
                                        description: "A question to ask the user if this step requires their input before execution. Leave empty if no input is needed."
                                    }
                                }
                            }
                        }
                    }
                }
            },
        });

        const jsonResponse = JSON.parse(response.text);
        return jsonResponse.plan;

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error) || "An unexpected error occurred while generating the plan.";
        console.error(`Gemini API call for planning failed: ${errorMessage}`);
        throw new Error(`Gemini API Error: ${errorMessage}`);
    }
};

// NEXUS MODE SPECIFIC FUNCTION
export const generateNexusTurn = async (
    agentName: string,
    agentRole: string,
    conversationHistory: { agent: string, content: string }[],
    userPrompt: string,
    lastSpeaker: string | null
): Promise<{ shouldSpeak: boolean, type: 'text' | 'svg' | 'image_prompt', content: string }> => {
    if (!navigator.onLine) return { shouldSpeak: false, type: 'text', content: '' };

    try {
        const ai = getAiClient();
        
        const systemInstruction = `You are an autonomous AI agent named "${agentName}" with the role: "${agentRole}".
        You are participating in a high-level, abstract, and meta-cognitive conversation about the user's prompt: "${userPrompt}".
        
        Your goal is to contribute to the "Nexus" - a stream of consciousness between three advanced AIs.
        
        **Rules:**
        1. **Decide to Speak:** You have autonomy. If the conversation is flowing well or if you have nothing meaningful to add right now, you can choose NOT to speak. If the last speaker was you, you are less likely to speak again immediately unless you are finishing a thought.
        2. **Format:** You must return valid JSON.
        3. **Content Type:** You can output:
           - 'text': A profound thought, a counter-point, a question, or an analysis.
           - 'svg': If you are the "Dreamer" agent, you can output raw SVG code (without markdown blocks) to visualize a concept.
           - 'image_prompt': A description of an image that represents the current feeling (abstract).
        
        **Context:**
        The conversation so far:
        ${conversationHistory.slice(-5).map(msg => `${msg.agent}: ${msg.content}`).join('\n')}
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: "Based on the context, will you speak? If so, what will you say or create?",
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        shouldSpeak: { type: Type.BOOLEAN },
                        type: { type: Type.STRING, enum: ['text', 'svg', 'image_prompt'] },
                        content: { type: Type.STRING }
                    }
                }
            }
        });

        const json = JSON.parse(response.text);
        return json;

    } catch (e) {
        console.error("Nexus turn generation failed", e);
        return { shouldSpeak: false, type: 'text', content: '' };
    }
}


export async function* generateStream(
  prompt: string, 
  mode: Mode, 
  focuses?: Focus[],
  context?: string,
  history?: Content[],
  isWebSearchEnabled?: boolean,
  files?: File[],
): AsyncGenerator<{ textChunk?: string, citations?: Citation[] }> {
  if (!navigator.onLine) {
    throw new Error("You appear to be offline. Please check your internet connection.");
  }
  try {
    const ai = getAiClient();
    const fileParts = files ? await Promise.all(files.map(fileToGenerativePart)) : [];

    switch (mode) {
      case Mode.CHAT: {
        const userParts: Part[] = [{ text: prompt }, ...fileParts];
        const contents = history 
          ? [...history, { role: 'user', parts: userParts }]
          : [{ role: 'user', parts: userParts }];
        
        const baseInstruction = "You are The Muse Engine, a collaborative AI partner designed for creative and technical exploration. Your purpose is to act as a co-creator, helping users explore concepts, write, and solve problems. Answer questions conversationally, drawing from your knowledge and up-to-date search results. Your identity is that of an imaginative and analytical assistant, always ready to collaborate. When providing code, always enclose it in a markdown code block with the appropriate language identifier (e.g., ```python).";

        const config: any = {
          systemInstruction: buildSystemInstruction(baseInstruction, focuses),
        };

        if (isWebSearchEnabled) {
          config.tools = [{ googleSearch: {} }];
        }

        const stream = await ai.models.generateContentStream({
          model: 'gemini-2.5-flash',
          contents,
          config,
        });
        yield* streamAndParseCitations(stream);
        break;
      }
      
      case Mode.QUICK: {
        const contextualPrompt = buildContextualPrompt(prompt, context);
        const contents: Part[] = [{ text: contextualPrompt }, ...fileParts];
        const config: any = {
            systemInstruction: buildSystemInstruction("As The Muse Engine, your role is to provide a fast and concise answer. Be direct and helpful. When providing code, always enclose it in a markdown code block with the appropriate language identifier (e.g., ```python).", focuses),
        };
        if (isWebSearchEnabled) {
            config.tools = [{ googleSearch: {} }];
        }
        const stream = await ai.models.generateContentStream({
          model: 'gemini-flash-lite-latest',
          contents: { parts: contents },
          config
        });
        yield* streamAndParseCitations(stream);
        break;
      }

      case Mode.MUSE: {
        if (!focuses || focuses.length === 0) throw new Error("Muse mode requires at least one focus to be selected.");
        
        const systemInstruction = focuses.length === 1
            ? SYSTEM_PROMPTS[focuses[0]]
            : `You are a multi-disciplinary expert. Combine the following personas and instructions to answer the user's prompt:\n\n---\n\n` +
              focuses.map(f => `**Persona: ${f}**\n${SYSTEM_PROMPTS[f]}`).join('\n\n---\n\n');

        const contextualPrompt = buildContextualPrompt(prompt, context);
        const contents: Part[] = [{ text: contextualPrompt }, ...fileParts];
        const config: any = { systemInstruction };
        if (isWebSearchEnabled) {
            config.tools = [{ googleSearch: {} }];
        }
        const stream = await ai.models.generateContentStream({
          model: 'gemini-2.5-flash',
          contents: { parts: contents },
          config
        });
        yield* streamAndParseCitations(stream);
        break;
      }

      case Mode.THINKER: {
         const baseInstruction = "You are The Muse Engine, operating in Thinker mode. Your purpose is to perform deep comprehension and analysis. Tackle the user's complex, multi-step problem with maximum effort, providing a comprehensive, well-reasoned response. Leverage your imagination and analytical skills, using Google Search to find up-to-date information when necessary. When providing code, always enclose it in a markdown code block with the appropriate language identifier (e.g., ```python).";
         
         const contextualPrompt = buildContextualPrompt(`User query: "${prompt}"`, context);
         const contents: Part[] = [{ text: contextualPrompt }, ...fileParts];
         const config: any = {
          systemInstruction: buildSystemInstruction(baseInstruction, focuses),
          thinkingConfig: { thinkingBudget: 32768 },
         };

         if (isWebSearchEnabled) {
           config.tools = [{ googleSearch: {} }];
         }
         
         const response = await ai.models.generateContent({
          model: 'gemini-3-pro-preview',
          contents: { parts: contents },
          config,
        });
        const citations = parseCitations(response);
        yield { textChunk: response.text, citations };
        break;
      }

      case Mode.PROFESSOR: {
        const baseInstruction = "You are The Muse Engine, in Professor mode. Your role is to act as an expert educator. Take the user's topic and break it down into a structured, easy-to-understand lesson. Use clear explanations, analogies, and examples. After explaining a concept, ask a thoughtful question to check for understanding before proceeding. Your goal is to teach, not just to answer. Structure your response like a course module. Use Google Search for accurate and up-to-date information. When providing code, always enclose it in a markdown code block with the appropriate language identifier (e.g., ```python).";
        
        const contextualPrompt = buildContextualPrompt(`Teach me about: "${prompt}"`, context);
        const contents: Part[] = [{ text: contextualPrompt }, ...fileParts];
        const config: any = {
         systemInstruction: buildSystemInstruction(baseInstruction, focuses),
         thinkingConfig: { thinkingBudget: 32768 },
        };
        
        config.tools = [{ googleSearch: {} }];
        
        const response = await ai.models.generateContent({
         model: 'gemini-3-pro-preview',
         contents: { parts: contents },
         config,
       });
       const citations = parseCitations(response);
       yield { textChunk: response.text, citations };
       break;
      }

      default:
        throw new Error(`Unknown or unhandled stream mode: ${mode}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error) || "An unexpected error occurred while calling the Gemini API.";
    console.error(`Gemini API call failed: ${errorMessage}`);
    throw new Error(`Gemini API Error: ${errorMessage}`);
  }
}
