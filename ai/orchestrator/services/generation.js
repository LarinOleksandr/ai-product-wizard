import { buildSchemaSketch, tryParseJsonText } from "./prompts.js";

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

function tryParseDiscoveryResponse(response) {
  const rawText = extractTextFromResponse(response);
  const parsed = tryParseJsonText(rawText);
  return parsed || {};
}

function insertSentenceLineBreaks(value) {
  if (typeof value !== "string") {
    return value;
  }
  return value.replace(/([.!?])\s+(?=[A-Z0-9])/g, "$1\n");
}

function formatGeneratedText(value) {
  if (typeof value === "string") {
    return insertSentenceLineBreaks(value);
  }
  if (Array.isArray(value)) {
    return value.map((item) => formatGeneratedText(item));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, val]) => [key, formatGeneratedText(val)])
    );
  }
  return value;
}

function formatScalarMarkdown(value) {
  if (value === null || typeof value === "undefined") {
    return "none";
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? trimmed : "none";
  }
  return String(value);
}

function renderObjectMarkdown(value, indent = 0) {
  const pad = " ".repeat(indent);
  const entries = Object.entries(value || {});
  if (entries.length === 0) {
    return `${pad}none`;
  }
  return entries
    .map(([key, val]) => {
      if (Array.isArray(val)) {
        const rendered = renderArrayMarkdown(val, indent + 2);
        return `${pad}${key}:\n${rendered}`;
      }
      if (val && typeof val === "object") {
        const rendered = renderObjectMarkdown(val, indent + 2);
        return `${pad}${key}:\n${rendered}`;
      }
      return `${pad}${key}: ${formatScalarMarkdown(val)}`;
    })
    .join("\n");
}

function renderArrayMarkdown(value, indent = 0) {
  const pad = " ".repeat(indent);
  if (!Array.isArray(value) || value.length === 0) {
    return `${pad}none`;
  }
  return value
    .map((item) => {
      if (item && typeof item === "object") {
        return renderObjectListItem(item, indent);
      }
      return `${pad}- ${formatScalarMarkdown(item)}`;
    })
    .join("\n");
}

function renderObjectListItem(value, indent = 0) {
  const pad = " ".repeat(indent);
  const childPad = " ".repeat(indent + 2);
  const entries = Object.entries(value || {});
  if (!entries.length) {
    return `${pad}- none`;
  }
  const [firstKey, firstVal] = entries[0];
  const lines = [];
  if (Array.isArray(firstVal)) {
    lines.push(`${pad}- ${firstKey}:`);
    lines.push(renderArrayMarkdown(firstVal, indent + 2));
  } else if (firstVal && typeof firstVal === "object") {
    lines.push(`${pad}- ${firstKey}:`);
    lines.push(renderObjectMarkdown(firstVal, indent + 2));
  } else {
    lines.push(`${pad}- ${firstKey}: ${formatScalarMarkdown(firstVal)}`);
  }
  entries.slice(1).forEach(([key, val]) => {
    if (Array.isArray(val)) {
      lines.push(`${childPad}${key}:`);
      lines.push(renderArrayMarkdown(val, indent + 2));
      return;
    }
    if (val && typeof val === "object") {
      lines.push(`${childPad}${key}:`);
      lines.push(renderObjectMarkdown(val, indent + 2));
      return;
    }
    lines.push(`${childPad}${key}: ${formatScalarMarkdown(val)}`);
  });
  return lines.join("\n");
}

function renderInputsMarkdown(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    if (Array.isArray(value)) {
      return renderArrayMarkdown(value, 0);
    }
    if (value && typeof value === "object") {
      return renderObjectMarkdown(value, 0);
    }
    return `${formatScalarMarkdown(value)}`;
  }
  const entries = Object.entries(value);
  if (!entries.length) {
    return "none";
  }
  return entries
    .map(([key, val]) => {
      let rendered;
      if (Array.isArray(val)) {
        rendered = renderArrayMarkdown(val, 0);
      } else if (val && typeof val === "object") {
        rendered = renderObjectMarkdown(val, 0);
      } else {
        rendered = formatScalarMarkdown(val);
      }
      if (rendered === "none") {
        return "";
      }
      return [`### ${key}`, rendered].join("\n");
    })
    .filter(Boolean)
    .join("\n\n");
}

export function createGenerationService({
  promptService,
  validationService,
  llmService,
  getNestedValue,
  buildApprovedDocument,
  emptyValueForField
}) {
  function buildFieldPrompt({
    promptInputs,
    approvedDocument,
    systemPrompt,
    productIdea,
    outputRules,
    sectionPrompt,
    sectionSchema,
    sectionSchemaJson,
    sectionExamples,
    finalSchema,
    currentDocument,
    fieldKey,
    fieldOutputKey
  }) {
    const fieldName = fieldKey?.split(".").pop() || "field";
    const outputKey = fieldOutputKey || fieldName;
    const schemaBlock = sectionSchemaJson
      ? buildSchemaSketch(sectionSchemaJson)
      : sectionSchema
        ? buildSchemaSketch(tryParseJsonText(sectionSchema))
        : "### JSON schema (define output format)\n\nSchema missing.";
    const prompt = [
      systemPrompt || "You are the Discovery Agent.",
      promptInputs,
      sectionPrompt || "Section prompt missing.",
      outputRules,
      schemaBlock
    ]
      .filter(Boolean)
      .join("\n\n");

    const approved = approvedDocument || {};
    return renderTemplate(prompt, {
      productIdea,
      problemStatement:
        getNestedValue(approved, "problemUnderstanding.problemStatement") || "",
      targetUsersAndSegments: JSON.stringify(
        getNestedValue(approved, "problemUnderstanding.targetUsersSegments") || {},
        null,
        2
      ),
      userPainPoints: JSON.stringify(
        getNestedValue(approved, "problemUnderstanding.userPainPoints") || {},
        null,
        2
      ),
      contextualFactors: JSON.stringify(
        getNestedValue(approved, "problemUnderstanding.contextualFactors") || {
          contextual_factors: []
        },
        null,
        2
      ),
      constraints: JSON.stringify(
        getNestedValue(approved, "problemUnderstanding.constraints") || {
          constraints: []
        },
        null,
        2
      ),
      marketLandscape: JSON.stringify(
        getNestedValue(approved, "marketAndCompetitorAnalysis.marketLandscape") || {},
        null,
        2
      ),
      competitorInventory: JSON.stringify(
        getNestedValue(approved, "marketAndCompetitorAnalysis.competitorInventory") || {
          competitors: []
        },
        null,
        2
      ),
      competitorCapabilities: JSON.stringify(
        getNestedValue(approved, "marketAndCompetitorAnalysis.competitorCapabilities") || {
          competitor_capabilities: []
        },
        null,
        2
      ),
      gapsOpportunities: JSON.stringify(
        getNestedValue(approved, "marketAndCompetitorAnalysis.gapsOpportunities") || {
          opportunities: []
        },
        null,
        2
      ),
      valueDrivers: JSON.stringify(
        getNestedValue(approved, "opportunityDefinition.valueDrivers") || {
          value_drivers: []
        },
        null,
        2
      ),
      feasibilityRisks: JSON.stringify(
        getNestedValue(approved, "opportunityDefinition.feasibilityRisks") || {
          feasibility_risks: []
        },
        null,
        2
      ),
      outputKey,
      currentDocument: JSON.stringify(currentDocument || {}, null, 2),
      approvedDocument: JSON.stringify(approved, null, 2)
    });
  }

  async function generateFieldValue({ field, productIdea, currentDocument }) {
    const result = await generateFieldValueWithOutput({
      field,
      productIdea,
      currentDocument
    });
    return result.value;
  }

  async function generateFieldValueWithOutput({
    field,
    productIdea,
    currentDocument,
    fieldStatus
  }) {
    const promptAssets = await promptService.getDiscoveryPromptAssets();
    const sectionPrompt = promptAssets.sectionPromptMap[field.section] || "";
    const sectionSchema = promptAssets.sectionSchemaMap[field.section] || "";
    const sectionExamples = "";
    const sectionSchemaJson = promptAssets.sectionSchemaJsonMap?.[field.section];
    const approvedDocument = buildApprovedDocument(currentDocument, fieldStatus);
    const promptInputs = `## Inputs\n${renderInputsMarkdown(
      promptService.buildIncomingInfoForField({
        fieldKey: field.key,
        productIdea,
        currentDocument,
        fieldStatus
      })
    )}`;
    const prompt = buildFieldPrompt({
      promptInputs,
      approvedDocument,
      systemPrompt: promptAssets.systemPrompt,
      productIdea,
      outputRules: promptAssets.outputRules,
      sectionPrompt,
      sectionSchema,
      sectionSchemaJson,
      sectionExamples,
      finalSchema: promptAssets.finalSchema,
      currentDocument,
      fieldKey: field.key,
      fieldOutputKey: field.outputKey
    });

    const baseMessages = [
      {
        role: "system",
        content: promptAssets.systemPrompt
      },
      {
        role: "user",
        content: prompt
      }
    ];
    const messages =
      field.key === "marketAndCompetitorAnalysis.competitorInventory"
        ? ({ attempt, lastValidationErrors }) => {
            if (!attempt || !lastValidationErrors.length) {
              return baseMessages;
            }
            return baseMessages.concat([
              {
                role: "user",
                content: [
                  "Your previous output was rejected. Fix only the errors below and regenerate the full JSON output:",
                  ...lastValidationErrors.map((error) => `- ${error}`),
                  "",
                  "Reminder: product_name must be a specific named product/company (no generic categories), and each URL must be an official product URL."
                ].join("\n")
              }
            ]);
          }
        : baseMessages;

    const model = llmService.getChatModel();
    if (!model) {
      if (process.env.MOCK_DISCOVERY === "true") {
        const value = emptyValueForField(field);
        return { value, prompt, rawText: JSON.stringify(value, null, 2) };
      }
      throw new Error("Ollama is not available. Start Ollama and retry.");
    }

    const fieldName = field.key.split(".").pop();
    const result = await llmService.invokeWithRetries({
      model,
      messages,
      attempts: 3,
      onResponse: (response) => {
        const rawText = extractTextFromResponse(response);
        let lastValidationErrors = [];
        try {
          const parsed = validationService.normalizeParsedFieldValue(
            field,
            tryParseDiscoveryResponse(response),
            approvedDocument
          );
          if (
            field.type === "object" &&
            validationService.isPlainObject(parsed) &&
            sectionSchemaJson?.type === "object"
          ) {
            const candidate = formatGeneratedText(parsed);
            const validation = validationService.validateAgainstSchema(candidate, sectionSchemaJson);
            if (validation.valid) {
              if (field.key === "marketAndCompetitorAnalysis.competitorInventory") {
                const competitorErrors =
                  validationService.validateCompetitorInventoryValue(candidate);
                if (competitorErrors.length > 0) {
                  return {
                    done: false,
                    rawText,
                    lastValidationErrors: competitorErrors
                  };
                }
              }
              return {
                done: true,
                value: candidate,
                rawText,
                validationStatus: "valid"
              };
            }
            lastValidationErrors = validation.errors;
          }
          if (field.outputKey && typeof parsed?.[field.outputKey] !== "undefined") {
            if (field.wrapOutputKey) {
              const value = { [field.outputKey]: parsed[field.outputKey] };
              const candidate = formatGeneratedText(value);
              const validation = validationService.validateAgainstSchema(candidate, sectionSchemaJson || null);
              if (!validation.valid) {
                return { done: false, rawText, lastValidationErrors: validation.errors };
              }
              return {
                done: true,
                value: candidate,
                rawText,
                validationStatus: "valid"
              };
            }
            const value = formatGeneratedText(parsed[field.outputKey]);
            const validationValue = sectionSchemaJson?.type === "object"
              ? { [field.outputKey]: value }
              : value;
            const candidateValue = value;
            const candidateForValidation = validationValue;
            const validation = validationService.validateAgainstSchema(
              candidateForValidation,
              sectionSchemaJson || null
            );
            if (!validation.valid) {
              return { done: false, rawText, lastValidationErrors: validation.errors };
            }
            return {
              done: true,
              value: candidateValue,
              rawText,
              validationStatus: "valid"
            };
          }
          if (fieldName && typeof parsed?.[fieldName] !== "undefined") {
            const value = formatGeneratedText(parsed[fieldName]);
            const validationValue = sectionSchemaJson?.type === "object"
              ? { [fieldName]: value }
              : value;
            const candidateValue = value;
            const candidateForValidation = validationValue;
            const validation = validationService.validateAgainstSchema(
              candidateForValidation,
              sectionSchemaJson || null
            );
            if (!validation.valid) {
              return { done: false, rawText, lastValidationErrors: validation.errors };
            }
            return {
              done: true,
              value: candidateValue,
              rawText,
              validationStatus: "valid"
            };
          }
          const nested = getNestedValue(parsed, field.key);
          if (typeof nested !== "undefined") {
          const candidateValue = formatGeneratedText(nested);
          const validation = validationService.validateAgainstSchema(
            candidateValue,
            sectionSchemaJson || null
          );
            if (!validation.valid) {
              return { done: false, rawText, lastValidationErrors: validation.errors };
            }
            return {
              done: true,
              value: candidateValue,
              rawText,
              validationStatus: "valid"
            };
          }
        } catch (parseError) {
          if (rawText) {
            const normalized = validationService.normalizeRawFieldValue(rawText, field.type);
            const formattedNormalized = formatGeneratedText(normalized);
            const validationValue = sectionSchemaJson?.type === "object"
              ? { [field.outputKey || fieldName || "value"]: formattedNormalized }
              : formattedNormalized;
            const candidateValue = formattedNormalized;
            const candidateForValidation = validationValue;
            const validation = validationService.validateAgainstSchema(
              candidateForValidation,
              sectionSchemaJson || null
            );
            if (!validation.valid) {
              return { done: false, rawText, lastValidationErrors: validation.errors };
            }
            return {
              done: true,
              value: candidateValue,
              rawText,
              validationStatus: "valid"
            };
          }
        }
        return { done: false, rawText, lastValidationErrors };
      },
      onError: (error, attempt) => {
        console.warn(`Discovery field ${field.key} attempt ${attempt + 1} failed`, error);
      }
    });

    if (result?.done) {
      return {
        value: result.value,
        prompt,
        rawText: result.rawText,
        validationStatus: result.validationStatus || null
      };
    }

    const failure = new Error(`LLM output invalid for field ${field.key}.`);
    failure.lastPrompt = prompt;
    failure.lastOutput = typeof result.lastRawText === "string" ? result.lastRawText : "";
    failure.lastOutputFieldKey = field.key;
    failure.validationErrors = result.lastValidationErrors || [];
    throw failure;
  }

  return {
    generateFieldValue,
    generateFieldValueWithOutput
  };
}
