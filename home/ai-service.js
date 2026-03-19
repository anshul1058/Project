/**
 * Calls the Groq API via a secure Supabase Edge Function to protect the API key.
 */
async function callGroq(prompt) {
  const { data, error } = await window.supabase.functions.invoke('groq-assistant', {
    body: { prompt }
  });

  if (error) {
    console.error("Edge Function error:", error);
    throw new Error(error.message || "Failed to process request via background service.");
  }

  return data.data || "";
}

/**
 * Extract text from PDF using pdf.js (client-side only)
 */
export const extractTextFromPDF = async (file) => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    if (typeof pdfjsLib === "undefined") {
      throw new Error("PDF.js library is not loaded.");
    }
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs";
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = "";
    const maxPages = Math.min(pdf.numPages, 5);
    for (let i = 1; i <= maxPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      fullText += textContent.items.map((item) => item.str).join(" ") + "\n";
    }
    return fullText;
  } catch (error) {
    console.error("Error extracting PDF text:", error);
    throw new Error("Could not read PDF file.");
  }
};

export const generateSummary = async (text) => {
  console.log("generateSummary called, text length:", text?.length || 0);
  const truncated = (text || "").substring(0, 30000);
  const prompt = `You are an expert tutor. Summarize the following study material text. Make it clear, concise, and easy for a student to understand. Keep it under 150 words. Format your response in simple markdown (use **bold** for emphasis).\n\nTEXT:\n${truncated}`;
  return await callGroq(prompt);
};

export const generateNotes = async (text) => {
  console.log("generateNotes called, text length:", text?.length || 0);
  const truncated = (text || "").substring(0, 30000);
  const prompt = `You are an expert tutor. Provide a detailed and comprehensive set of study notes based on the following text. Extract the 8–10 most significant concepts and provide a thorough explanation for each in a clear bulleted format. Ensure the notes are detailed enough for deep study while remaining readable. Format your response in clean markdown with headers for better organization.\n\nTEXT:\n${truncated}`;
  return await callGroq(prompt);
};

export const generateQuestions = async (text) => {
  console.log("generateQuestions called, text length:", text?.length || 0);
  const truncated = (text || "").substring(0, 30000);
  const prompt = `Create a list of 8–10 high-quality short-answer questions based on the key concepts in the following text. Provide a clear, detailed answer directly below each question in *italics*. Format everything in clean markdown with numbers.\n\nTEXT:\n${truncated}`;
  return await callGroq(prompt);
};

export const generateMindMapData = async (text) => {
  console.log("generateMindMapData called, text length:", text?.length || 0);
  const truncated = (text || "").substring(0, 30000);
  const prompt = `Analyze the following study material text and extract exactly 8 key distinct concepts to form a detailed mind map. You must output ONLY raw, valid JSON. Do NOT include markdown backticks or any other text.

The JSON structure MUST exactly match this format:
{"title": "Main Topic","left":[{"title": "Concept 1", "desc": "A detailed 20-30 word description of this concept."},{"title": "Concept 2", "desc": "A detailed 20-30 word description of this concept."},{"title": "Concept 3", "desc": "A detailed 20-30 word description of this concept."},{"title": "Concept 4", "desc": "A detailed 20-30 word description of this concept."}],"right":[{"title": "Concept 5", "desc": "A detailed 20-30 word description of this concept."},{"title": "Concept 6", "desc": "A detailed 20-30 word description of this concept."},{"title": "Concept 7", "desc": "A detailed 20-30 word description of this concept."},{"title": "Concept 8", "desc": "A detailed 20-30 word description of this concept."}]}

Keep "title" short and descriptive (1-3 words). Ensure "desc" is thorough and informative.

TEXT:\n${truncated}`;

  let raw = await callGroq(prompt);
  if (raw.startsWith("```json")) raw = raw.slice(7);
  if (raw.startsWith("```")) raw = raw.slice(3);
  if (raw.endsWith("```")) raw = raw.slice(0, -3);
  raw = raw.trim();
  try {
    return JSON.parse(raw);
  } catch (e) {
    console.error("Failed to parse mind map JSON:", raw);
    throw new Error("AI returned invalid mind map format.");
  }
};

export const askFollowUpQuestion = async (text, question) => {
  console.log("askFollowUpQuestion called, text length:", text?.length || 0, "question:", question);
  const truncated = (text || "").substring(0, 30000);
  const prompt = `You are an AI study assistant helping a student with a PDF they uploaded. Use ONLY the following text content as your source of truth, and then answer the follow-up question. If the answer is unclear from the text, say so honestly.\n\nPDF TEXT:\n${truncated}\n\nSTUDENT QUESTION:\n${question}`;
  return await callGroq(prompt);
};
