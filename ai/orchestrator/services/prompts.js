import fs from "fs/promises";
import fsSync from "fs";
import path from "path";

function resolveSchemaRef(schema, rootSchema) {
  if (!schema || typeof schema.$ref !== "string" || !rootSchema) {
    return schema;
  }
  const ref = schema.$ref;
  if (!ref.startsWith("#/")) {
    return schema;
  }
  const pathParts = ref.slice(2).split("/");
  let current = rootSchema;
  for (const part of pathParts) {
    if (!current || typeof current !== "object") {
      return schema;
    }
    current = current[part];
  }
  return current || schema;
}

function formatSchemaType(schema, rootSchema) {
  if (!schema || typeof schema !== "object") {
    return "unknown";
  }
  const resolved = resolveSchemaRef(schema, rootSchema);
  if (resolved !== schema) {
    return formatSchemaType(resolved, rootSchema);
  }
  if (schema.enum) {
    return schema.enum.join("|");
  }
  if (schema.type === "string") {
    return "string";
  }
  if (schema.type === "array") {
    const itemType = formatSchemaType(schema.items || {}, rootSchema);
    return `array<${itemType}>`;
  }
  if (schema.type === "object") {
    const properties = schema.properties || {};
    const requiredKeys = Array.isArray(schema.required) && schema.required.length
      ? schema.required
      : Object.keys(properties);
    if (!requiredKeys.length) {
      return "object";
    }
    const fields = requiredKeys.map((key) => {
      const prop = properties[key] || {};
      const typeLabel = formatSchemaType(prop, rootSchema);
      return `${key} (${typeLabel})`;
    });
    return `object { ${fields.join(", ")} }`;
  }
  return "unknown";
}

export function buildSchemaSketch(schemaJson) {
  if (!schemaJson || typeof schemaJson !== "object") {
    return "### JSON schema (define output format)\n\nSchema missing.";
  }
  const properties = schemaJson.properties || {};
  const requiredKeys = Array.isArray(schemaJson.required) ? schemaJson.required : [];
  const lines = [];
  if (requiredKeys.length) {
    lines.push(`Required keys: ${requiredKeys.join(", ")}.`);
  }
  const keysToDescribe = requiredKeys.length ? requiredKeys : Object.keys(properties);
  keysToDescribe.forEach((key) => {
    if (!properties[key]) {
      return;
    }
    lines.push(`${key}: ${formatSchemaType(properties[key], schemaJson)}`);
  });
  return [
    "### JSON schema (define output format)",
    "",
    ...lines
  ].join("\n");
}

export function extractJsonBlock(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new Error("No JSON object found in response.");
  }
  return text.slice(start, end + 1);
}

export function tryParseJsonText(text) {
  if (typeof text !== "string") {
    return null;
  }
  const cleaned = text.replace(/```json|```/g, "").trim();
  if (!cleaned) {
    return null;
  }
  const candidate = cleaned.startsWith("{") ? cleaned : (() => {
    try {
      return extractJsonBlock(cleaned);
    } catch {
      return "";
    }
  })();
  if (!candidate) {
    return null;
  }
  try {
    return JSON.parse(candidate);
  } catch {
    return null;
  }
}

export function createPromptService({
  promptsDir,
  productManagerDir,
  fieldDefinitions,
  getNestedValue,
  buildApprovedDocument,
  sectionInputsPath
}) {
  let promptCache;
  let sectionInputDependencies = null;
  const fieldDisplayKeyMap = fieldDefinitions.reduce((acc, field) => {
    const displayKey = field.outputKey || field.key.split(".").pop() || field.key;
    acc[displayKey] = field.key;
    return acc;
  }, {});
  const resolvedInputsPath =
    sectionInputsPath || path.join(promptsDir, "sections", "section-inputs.json");

  async function readPromptFile(relativePath) {
    try {
      const filePath = path.join(promptsDir, relativePath);
      return await fs.readFile(filePath, "utf8");
    } catch (error) {
      if (error.code === "ENOENT") {
        console.warn(`Prompt file missing: ${relativePath}`);
        return "";
      }
      throw error;
    }
  }

  async function readProductManagerPromptFile(relativePath) {
    try {
      const filePath = path.join(productManagerDir, relativePath);
      return await fs.readFile(filePath, "utf8");
    } catch (error) {
      if (error.code === "ENOENT") {
        console.warn(`Prompt file missing: ${relativePath}`);
        return "";
      }
      throw error;
    }
  }

  async function getDiscoveryPromptAssets() {
    if (promptCache && Array.isArray(promptCache.sectionSchemas)) {
      return promptCache;
    }

    const systemPrompt = await readProductManagerPromptFile(
      "product-manager-system-prompt.md"
    );
    const finalSchema = await readPromptFile("discovery-document-schema.json");
    const outputRules = await readPromptFile(
      path.join("sections", "section-output-rules.md")
    );

    const sectionPrompts = [];
    const sectionSchemas = [];
    const sectionPromptMap = {};
    const sectionSchemaMap = {};
    const sectionSchemaJsonMap = {};
    for (const definition of fieldDefinitions) {
      const section = definition.section;
      const promptPath = path.join("sections", "prompts", `${section}.prompt.md`);
      const promptContent = await readPromptFile(promptPath);
      if (promptContent) {
        sectionPrompts.push(`Section: ${section}\n${promptContent}`);
        sectionPromptMap[section] = promptContent;
      }
      const schemaPath = path.join("sections", "schemas", `${section}.schema.json`);
      const schemaContent = await readPromptFile(schemaPath);
      if (schemaContent) {
        sectionSchemas.push(`Section: ${section}\n${schemaContent}`);
        sectionSchemaMap[section] = schemaContent;
        try {
          sectionSchemaJsonMap[section] = JSON.parse(schemaContent);
        } catch (error) {
          console.warn(`Invalid JSON schema for section ${section}.`);
        }
      }
    }

    promptCache = {
      systemPrompt:
        systemPrompt ||
        "You are the Discovery Agent. Respond only with JSON that matches the required schema. Do not write prose.",
      outputRules: outputRules || "",
      finalSchema: finalSchema || "",
      sectionPrompts,
      sectionSchemas,
      sectionPromptMap,
      sectionSchemaMap,
      sectionSchemaJsonMap
    };
    return promptCache;
  }

  function buildIncomingInfoForField({
    fieldKey,
    productIdea,
    targetUser,
    userNotes,
    currentDocument,
    fieldStatus
  }) {
    const approvedDocument = buildApprovedDocument(currentDocument, fieldStatus);
    const incomingInfo = {
      productIdea: productIdea || "",
      targetUser: targetUser || "",
      userNotes: Array.isArray(userNotes) ? userNotes : []
    };
    if (!sectionInputDependencies) {
      try {
        const raw = fsSync.readFileSync(resolvedInputsPath, "utf8");
        sectionInputDependencies = JSON.parse(raw);
      } catch (error) {
        console.warn("Unable to load section-inputs.json. Using empty dependencies.");
        sectionInputDependencies = {};
      }
    }
    const dependencies = sectionInputDependencies[fieldKey] || [];
    dependencies.forEach((displayKey) => {
      const fieldKeyForDisplay = fieldDisplayKeyMap[displayKey];
      if (!fieldKeyForDisplay) {
        return;
      }
      let value = getNestedValue(approvedDocument, fieldKeyForDisplay);
      if (typeof value === "undefined") {
        value = getNestedValue(currentDocument || {}, fieldKeyForDisplay);
      }
      incomingInfo[displayKey] = typeof value === "undefined" ? null : value;
    });
    return incomingInfo;
  }

  return {
    getDiscoveryPromptAssets,
    buildIncomingInfoForField
  };
}
