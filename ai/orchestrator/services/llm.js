import { ChatOllama } from "@langchain/ollama";

export function createLlmService({
  modelName,
  temperature,
  keepAlive,
  format,
  mockDiscovery
}) {
  let chatInstance;

  function getChatModel() {
    if (mockDiscovery) {
      return null;
    }

    if (chatInstance) {
      return chatInstance;
    }

    try {
      chatInstance = new ChatOllama({
        model: modelName,
        temperature,
        keepAlive,
        format
      });
      return chatInstance;
    } catch (error) {
      console.warn(
        "Unable to initialize ChatOllama. Set MOCK_DISCOVERY=true to skip LLM usage."
      );
      console.warn(error);
      chatInstance = null;
      return null;
    }
  }

  async function invokeWithRetries({
    model,
    messages,
    attempts = 3,
    onResponse,
    onError
  }) {
    let lastRawText = "";
    let lastValidationErrors = [];
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      try {
        const activeModel = model || getChatModel();
        if (!activeModel) {
          return { done: false, lastRawText, lastValidationErrors };
        }
        const response = await activeModel.invoke(messages);
        const result = await onResponse(response);
        if (result?.rawText) {
          lastRawText = result.rawText;
        }
        if (Array.isArray(result?.lastValidationErrors)) {
          lastValidationErrors = result.lastValidationErrors;
        }
        if (result?.done) {
          return { ...result, lastRawText, lastValidationErrors };
        }
      } catch (error) {
        if (onError) {
          onError(error, attempt);
        } else {
          console.warn("LLM attempt failed", error);
        }
      }
    }
    return { done: false, lastRawText, lastValidationErrors };
  }

  return {
    getChatModel,
    invokeWithRetries
  };
}
