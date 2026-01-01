export function createValidationService({ getNestedValue }) {
  function isPlainObject(value) {
    return (
      Boolean(value) &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      !(value instanceof Date)
    );
  }

  function validateAgainstSchema(value, schema, path = "") {
    if (!schema || typeof schema !== "object") {
      return { valid: true, errors: [] };
    }

    if (schema.anyOf) {
      const errors = schema.anyOf
        .map((option) => validateAgainstSchema(value, option, path))
        .filter((result) => !result.valid)
        .flatMap((result) => result.errors);
      return { valid: errors.length === 0, errors };
    }

    if (schema.oneOf) {
      const results = schema.oneOf.map((option) =>
        validateAgainstSchema(value, option, path)
      );
      const validCount = results.filter((result) => result.valid).length;
      const errors = results.flatMap((result) => result.errors);
      return { valid: validCount === 1, errors };
    }

    if (schema.enum) {
      if (!schema.enum.includes(value)) {
        return {
          valid: false,
          errors: [
            `${path ? `${path}: ` : ""}Value must be one of ${schema.enum.join(", ")}.`
          ]
        };
      }
      return { valid: true, errors: [] };
    }

    const errors = [];
    const pushError = (message) => {
      errors.push(path ? `${path}: ${message}` : message);
    };

    const type = schema.type;
    if (type === "string") {
      if (typeof value !== "string") {
        pushError("Expected string.");
        return { valid: false, errors };
      }
      if (typeof schema.minLength === "number" && value.length < schema.minLength) {
        pushError(`String length must be >= ${schema.minLength}.`);
      }
      return { valid: errors.length === 0, errors };
    }

    if (type === "array") {
      if (!Array.isArray(value)) {
        pushError("Expected array.");
        return { valid: false, errors };
      }
      if (typeof schema.minItems === "number" && value.length < schema.minItems) {
        pushError(`Array length must be >= ${schema.minItems}.`);
      }
      if (schema.items) {
        value.forEach((item, index) => {
          const result = validateAgainstSchema(item, schema.items, `${path}[${index}]`);
          if (!result.valid) {
            errors.push(...result.errors);
          }
        });
      }
      return { valid: errors.length === 0, errors };
    }

    if (type === "object") {
      if (!isPlainObject(value)) {
        pushError("Expected object.");
        return { valid: false, errors };
      }
      const properties = schema.properties || {};
      const required = schema.required || [];
      required.forEach((key) => {
        if (!(key in value)) {
          errors.push(`${path ? `${path}.` : ""}${key}: Missing required property.`);
        }
      });
      if (schema.additionalProperties === false) {
        Object.keys(value).forEach((key) => {
          if (!Object.prototype.hasOwnProperty.call(properties, key)) {
            errors.push(`${path ? `${path}.` : ""}${key}: Additional property not allowed.`);
          }
        });
      }
      Object.keys(properties).forEach((key) => {
        if (Object.prototype.hasOwnProperty.call(value, key)) {
          const result = validateAgainstSchema(
            value[key],
            properties[key],
            path ? `${path}.${key}` : key
          );
          if (!result.valid) {
            errors.push(...result.errors);
          }
        }
      });
      return { valid: errors.length === 0, errors };
    }

    return { valid: true, errors };
  }

  function normalizeRawFieldValue(text, fieldType) {
    if (fieldType === "array") {
      const items = text
        .split("\n")
        .map((line) => line.replace(/^[-*]\s*/, "").trim())
        .filter(Boolean);
      return items.length ? items : [text.trim()];
    }
    if (fieldType === "object") {
      try {
        return JSON.parse(text);
      } catch (error) {
        return {};
      }
    }
    return text.trim();
  }

  function normalizeParsedFieldValue(field, parsed, approvedDocument) {
    if (!isPlainObject(parsed)) {
      return parsed;
    }
    if (field.key === "marketAndCompetitorAnalysis.marketLandscape") {
      if (Array.isArray(parsed.market_trends)) {
        parsed.market_trends = parsed.market_trends.map((item) =>
          item && typeof item === "object" && !item.confidence
            ? { ...item, confidence: "medium" }
            : item
        );
      }
      if (Array.isArray(parsed.market_dynamics)) {
        parsed.market_dynamics = parsed.market_dynamics.map((item) =>
          item && typeof item === "object" && !item.confidence
            ? { ...item, confidence: "medium" }
            : item
        );
      }
      if (Array.isArray(parsed.market_forces)) {
        parsed.market_forces = parsed.market_forces.map((item) =>
          item && typeof item === "object" && !item.confidence
            ? { ...item, confidence: "medium" }
            : item
        );
      }
      if (parsed.market_landscape && !parsed.market_definition) {
        const { market_landscape, ...rest } = parsed;
        return { ...rest, market_definition: market_landscape };
      }
      if (parsed.marketLandscape && !parsed.market_definition) {
        const { marketLandscape, ...rest } = parsed;
        return { ...rest, market_definition: marketLandscape };
      }
    }
    if (field.key === "marketAndCompetitorAnalysis.competitorInventory") {
      if (parsed.competitor_inventory && parsed.competitor_inventory.competitors) {
        return parsed.competitor_inventory;
      }
      if (parsed.competitorInventory && parsed.competitorInventory.competitors) {
        return parsed.competitorInventory;
      }
      if (Array.isArray(parsed.competitors)) {
        return { competitors: parsed.competitors };
      }
      if (Array.isArray(parsed["Competitor Inventory"])) {
        return { competitors: parsed["Competitor Inventory"] };
      }
    }
    if (field.key === "problemUnderstanding.userPainPoints") {
      if (parsed.user_pain_points && parsed.user_pain_points.pain_point_themes) {
        return parsed.user_pain_points;
      }
    }
    if (field.key === "marketAndCompetitorAnalysis.competitorCapabilities") {
      if (parsed.competitorCapabilities && parsed.competitorCapabilities.competitor_capabilities) {
        return parsed.competitorCapabilities;
      }
    }
    if (field.key === "marketAndCompetitorAnalysis.gapsOpportunities") {
      const validSegmentNames = (() => {
        const segments = getNestedValue(
          approvedDocument,
          "problemUnderstanding.targetUsersSegments"
        )?.target_segments;
        if (!Array.isArray(segments)) {
          return null;
        }
        const names = segments
          .map((segment) => segment?.segment_name)
          .filter((name) => typeof name === "string" && name.trim().length > 0);
        return names.length ? new Set(names) : null;
      })();
      const normalizeGap = (item) => {
        if (!item || typeof item !== "object") {
          return item;
        }
        const gap_description = item.gap_description || item.description || "";
        const opportunity_description =
          item.opportunity_description || item.opportunity_area || "";
        const affected_user_segments = Array.isArray(item.affected_user_segments)
          ? item.affected_user_segments
          : [];
        return {
          ...item,
          gap_description,
          opportunity_description,
          affected_user_segments
        };
      };
      const filterSegments = (item) => {
        if (!item || typeof item !== "object") {
          return item;
        }
        if (!validSegmentNames) {
          return item;
        }
        const filtered = (item.affected_user_segments || []).filter((segment) =>
          validSegmentNames.has(segment)
        );
        const normalizedSegments = filtered.length
          ? filtered
          : Array.from(validSegmentNames);
        return {
          ...item,
          affected_user_segments: normalizedSegments
        };
      };
      if (parsed.gapsOpportunities && parsed.gapsOpportunities.gaps_and_opportunities) {
        const normalized = parsed.gapsOpportunities;
        ["functional", "technical", "business"].forEach((key) => {
          if (Array.isArray(normalized.gaps_and_opportunities?.[key])) {
            normalized.gaps_and_opportunities[key] =
              normalized.gaps_and_opportunities[key]
                .map(normalizeGap)
                .map(filterSegments);
          }
        });
        return normalized;
      }
      if (parsed.gaps_and_opportunities) {
        const normalized = { gaps_and_opportunities: parsed.gaps_and_opportunities };
        ["functional", "technical", "business"].forEach((key) => {
          if (Array.isArray(normalized.gaps_and_opportunities?.[key])) {
            normalized.gaps_and_opportunities[key] =
              normalized.gaps_and_opportunities[key]
                .map(normalizeGap)
                .map(filterSegments);
          }
        });
        return normalized;
      }
    }
    if (field.key === "opportunityDefinition.valueDrivers") {
      if (parsed.valueDrivers && parsed.valueDrivers.value_drivers) {
        return parsed.valueDrivers;
      }
      if (parsed.value_drivers) {
        return { value_drivers: parsed.value_drivers };
      }
      if (Array.isArray(parsed["Value Drivers"])) {
        return { value_drivers: parsed["Value Drivers"] };
      }
    }
    if (field.key === "opportunityDefinition.marketFitHypothesis") {
      if (parsed.market_fit_hypothesis) {
        return { market_fit_hypothesis: parsed.market_fit_hypothesis };
      }
    }
    if (field.key === "opportunityDefinition.feasibilityAssessment") {
      if (parsed.feasibility_assessment) {
        return { feasibility_assessment: parsed.feasibility_assessment };
      }
    }
    return parsed;
  }

  return {
    isPlainObject,
    validateAgainstSchema,
    normalizeRawFieldValue,
    normalizeParsedFieldValue
  };
}
