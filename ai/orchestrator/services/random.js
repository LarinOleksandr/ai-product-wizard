import fs from "fs/promises";
import path from "path";
import { tryParseJsonText } from "./prompts.js";

function renderTemplate(template, values) {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
    return Object.prototype.hasOwnProperty.call(values, key)
      ? String(values[key])
      : "";
  });
}

function extractTextFromResponse(response) {
  if (!response) {
    return "";
  }
  if (typeof response === "string") {
    return response;
  }
  if (typeof response.content === "string") {
    return response.content;
  }
  if (typeof response.text === "string") {
    return response.text;
  }
  if (Array.isArray(response.content)) {
    return response.content
      .map((item) => item?.text || item?.content || "")
      .join("")
      .trim();
  }
  return "";
}

function countSentences(text) {
  if (typeof text !== "string") {
    return 0;
  }
  return text
    .split(/[.!?]+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean).length;
}

export function createRandomService({
  llmService,
  otherPromptsDir,
  domains,
  maxRecentIdeas = 5
}) {
  let lastDomain = "";
  const recentIdeas = [];

  function pickNextDomain() {
    if (!Array.isArray(domains) || domains.length === 0) {
      return "";
    }
    const lastIndex = domains.indexOf(lastDomain);
    const nextIndex = lastIndex >= 0 ? (lastIndex + 1) % domains.length : 0;
    const selected = domains[nextIndex];
    lastDomain = selected;
    return selected;
  }

  async function readPromptFile(filename) {
    const filePath = path.join(otherPromptsDir, filename);
    return await fs.readFile(filePath, "utf8");
  }

  async function generateWithPrompt(promptText) {
    const model = llmService.getChatModel();
    if (!model) {
      if (process.env.MOCK_DISCOVERY === "true") {
        return null;
      }
      throw new Error("Ollama is not available. Start Ollama and retry.");
    }
    const messages = [
      {
        role: "system",
        content: "Return only JSON that matches the prompt."
      },
      {
        role: "user",
        content: promptText
      }
    ];
    const result = await llmService.invokeWithRetries({
      model,
      messages,
      attempts: 3,
      onResponse: (response) => {
        const rawText = extractTextFromResponse(response);
        const parsed = tryParseJsonText(rawText);
        if (parsed && typeof parsed === "object") {
          return { done: true, value: parsed, rawText };
        }
        return { done: false, rawText };
      }
    });
    if (result?.done) {
      return result.value;
    }
    return null;
  }

  async function generateRandomInputs({ currentProductIdea }) {
    const selectedDomain = pickNextDomain();
    const productPromptTemplate = await readPromptFile(
      "random-product-idea.prompt.md"
    );
    const recentBlock = recentIdeas.length
      ? `- ${recentIdeas.join("\n- ")}`
      : "none";
    const productPrompt = renderTemplate(productPromptTemplate, {
      selectedDomain,
      currentProductIdea: currentProductIdea || "none",
      recentProductIdeas: recentBlock
    });

    const productResponse = await generateWithPrompt(productPrompt);
    const productIdea = productResponse?.productIdea;
    if (typeof productIdea !== "string" || countSentences(productIdea) !== 3) {
      throw new Error("Random generation returned incomplete data.");
    }

    const targetPromptTemplate = await readPromptFile(
      "random-target-user.prompt.md"
    );
    const targetPrompt = renderTemplate(targetPromptTemplate, {
      productIdea
    });
    const targetResponse = await generateWithPrompt(targetPrompt);
    const targetUser = targetResponse?.targetUser;
    if (typeof targetUser !== "string" || countSentences(targetUser) !== 1) {
      throw new Error("Random generation returned incomplete data.");
    }

    recentIdeas.unshift(productIdea);
    if (recentIdeas.length > maxRecentIdeas) {
      recentIdeas.length = maxRecentIdeas;
    }

    return { productIdea, targetUser };
  }

  return {
    generateRandomInputs
  };
}
