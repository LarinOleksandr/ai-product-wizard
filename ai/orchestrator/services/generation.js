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
    targetUser,
    userNotes,
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
    const safeNotes = Array.isArray(userNotes) ? userNotes : [];
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
      targetUser,
      userNotes: safeNotes.length ? `- ${safeNotes.join("\n- ")}` : "none",
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
      contextConstraints: JSON.stringify(
        getNestedValue(approved, "problemUnderstanding.contextConstraints") || {
          contextual_factors: [],
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
          competitor_capabilities: [],
          industry_capability_patterns: []
        },
        null,
        2
      ),
      gapsOpportunities: JSON.stringify(
        getNestedValue(approved, "marketAndCompetitorAnalysis.gapsOpportunities") || {
          gaps_and_opportunities: {
            functional: [],
            technical: [],
            business: []
          }
        },
        null,
        2
      ),
      opportunityStatement: JSON.stringify(
        getNestedValue(approved, "opportunityDefinition.opportunityStatement") || {
          opportunity_statement: ""
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
      marketFitHypothesis: JSON.stringify(
        getNestedValue(approved, "opportunityDefinition.marketFitHypothesis") || {
          market_fit_hypothesis: {
            desirability: [],
            viability: []
          }
        },
        null,
        2
      ),
      feasibilityAssessment: JSON.stringify(
        getNestedValue(approved, "opportunityDefinition.feasibilityAssessment") || {
          feasibility_assessment: {
            business_constraints: [],
            user_constraints: [],
            technical_concerns: []
          }
        },
        null,
        2
      ),
      outputKey,
      currentDocument: JSON.stringify(currentDocument || {}, null, 2),
      approvedDocument: JSON.stringify(approved, null, 2)
    });
  }

  async function generateFieldValue({ field, productIdea, targetUser, userNotes, currentDocument }) {
    const result = await generateFieldValueWithOutput({
      field,
      productIdea,
      targetUser,
      userNotes,
      currentDocument
    });
    return result.value;
  }

  async function generateFieldValueWithOutput({
    field,
    productIdea,
    targetUser,
    userNotes,
    currentDocument,
    fieldStatus
  }) {
    const promptAssets = await promptService.getDiscoveryPromptAssets();
    const sectionPrompt = promptAssets.sectionPromptMap[field.section] || "";
    const sectionSchema = promptAssets.sectionSchemaMap[field.section] || "";
    const sectionExamples = "";
    const sectionSchemaJson = promptAssets.sectionSchemaJsonMap?.[field.section];
    const approvedDocument = buildApprovedDocument(currentDocument, fieldStatus);
    const promptInputs = `## Inputs (JSON)\n${JSON.stringify(
      promptService.buildIncomingInfoForField({
        fieldKey: field.key,
        productIdea,
        targetUser,
        userNotes,
        currentDocument,
        fieldStatus
      }),
      null,
      2
    )}`;
    const prompt = buildFieldPrompt({
      promptInputs,
      approvedDocument,
      systemPrompt: promptAssets.systemPrompt,
      productIdea,
      targetUser,
      userNotes,
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

    const messages = [
      {
        role: "system",
        content: promptAssets.systemPrompt
      },
      {
        role: "user",
        content: prompt
      }
    ];

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
          if (field.type === "object" && validationService.isPlainObject(parsed) && sectionSchemaJson?.type === "object") {
            const candidate = parsed;
            const validation = validationService.validateAgainstSchema(candidate, sectionSchemaJson);
            if (validation.valid) {
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
              const candidate = value;
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
            const value = parsed[field.outputKey];
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
            const value = parsed[fieldName];
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
            const candidateValue = nested;
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
            const validationValue = sectionSchemaJson?.type === "object"
              ? { [field.outputKey || fieldName || "value"]: normalized }
              : normalized;
            const candidateValue = normalized;
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
    failure.lastOutput = result.lastRawText || null;
    failure.lastOutputFieldKey = field.key;
    failure.validationErrors = result.lastValidationErrors || [];
    throw failure;
  }

  return {
    generateFieldValue,
    generateFieldValueWithOutput
  };
}
