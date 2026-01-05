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
      const toList = (value) =>
        Array.isArray(value)
          ? value
              .map((item) => {
                if (typeof item === "string") {
                  return item.trim();
                }
                if (item && typeof item === "object") {
                  return (item.name || item.description || "").trim();
                }
                return String(item).trim();
              })
              .filter(Boolean)
          : [];
      const rawDefinition =
        parsed.market_definition ?? parsed.market_landscape ?? parsed.marketLandscape;
      let marketDefinition = "";
      if (typeof rawDefinition === "string") {
        marketDefinition = rawDefinition;
      } else if (rawDefinition && typeof rawDefinition === "object") {
        marketDefinition = rawDefinition.description || "";
      }
      const alternatives = parsed.alternatives || {};
      return {
        market_definition: marketDefinition,
        alternatives: {
          direct_competitor_segments: toList(
            alternatives.direct_competitor_segments ??
              alternatives.direct_competitors ??
              parsed.direct_competitor_segments ??
              parsed.direct_competitors
          ),
          indirect_competitor_segments: toList(
            alternatives.indirect_competitor_segments ??
              alternatives.indirect_competitors ??
              parsed.indirect_competitor_segments ??
              parsed.indirect_competitors
          ),
          substitute_segments: toList(
            alternatives.substitute_segments ??
              alternatives.non_product_substitutes ??
              parsed.substitute_segments ??
              parsed.non_product_substitutes
          )
        },
        market_norms: toList(parsed.market_norms),
        adoption_drivers: toList(parsed.adoption_drivers),
        adoption_barriers: toList(parsed.adoption_barriers)
      };
    }
    const normalizeFactors = (items) =>
      Array.isArray(items)
        ? items.map((item) => ({
            name: item?.name || "",
            description: item?.description || ""
          }))
        : [];
    const normalizeFactorGroups = (groups) =>
      Array.isArray(groups)
        ? groups.map((group) => ({
            factor_group: group?.factor_group || group?.group_name || "",
            factors: normalizeFactors(group?.factors || group?.items || [])
          }))
        : [];
    const normalizeConstraints = (items) =>
      Array.isArray(items)
        ? items.map((item) => ({
            name: item?.name || "",
            description: item?.description || ""
          }))
        : [];
    const normalizeConstraintGroups = (groups) =>
      Array.isArray(groups)
        ? groups.map((group) => ({
            constraint_group: group?.constraint_group || group?.group_name || "",
            constraints: normalizeConstraints(group?.constraints || group?.items || [])
          }))
        : [];
    if (field.key === "problemUnderstanding.contextualFactors") {
      const contextualGroups = Array.isArray(parsed.contextual_factors)
        ? parsed.contextual_factors
        : Array.isArray(parsed.contextualFactors)
          ? parsed.contextualFactors
          : Array.isArray(parsed.contextConstraints?.contextual_factors)
            ? parsed.contextConstraints.contextual_factors
            : [];
      const isLegacyContext =
        contextualGroups.length &&
        contextualGroups.every((item) => !item?.factor_group && !item?.factors);
      return {
        contextual_factors: isLegacyContext
          ? [
              {
                factor_group: "General",
                factors: normalizeFactors(contextualGroups)
              }
            ]
          : normalizeFactorGroups(contextualGroups)
      };
    }
    if (field.key === "problemUnderstanding.constraints") {
      const constraintGroups = Array.isArray(parsed.constraints)
        ? parsed.constraints
        : Array.isArray(parsed.constraintGroups)
          ? parsed.constraintGroups
          : Array.isArray(parsed.contextConstraints?.constraints)
            ? parsed.contextConstraints.constraints
            : [];
      const isLegacyConstraints =
        constraintGroups.length &&
        constraintGroups.every((item) => !item?.constraint_group && !item?.constraints);
      return {
        constraints: isLegacyConstraints
          ? [
              {
                constraint_group: "General",
                constraints: normalizeConstraints(constraintGroups)
              }
            ]
          : normalizeConstraintGroups(constraintGroups)
      };
    }
    if (field.key === "marketAndCompetitorAnalysis.competitorInventory") {
      const isGenericName = (name) => {
        if (typeof name !== "string") {
          return true;
        }
        const lowered = name.toLowerCase();
        return (
          lowered.includes("software") ||
          lowered.includes("platform") ||
          lowered.includes("solution") ||
          lowered.includes("tool") ||
          lowered.includes("service") ||
          lowered.includes("system") ||
          lowered.includes("app") ||
          lowered.includes("product") ||
          lowered.includes("suite")
        );
      };
      const sanitizeList = (items) =>
        Array.isArray(items)
          ? items.filter((item) => {
              const name = item?.product_name || item?.name || "";
              if (!name.trim()) {
                return false;
              }
              if (item?.url) {
                return true;
              }
              return !isGenericName(name);
            })
          : [];
      const normalizeCompetitors = (list) => {
        if (!Array.isArray(list)) {
          return { direct: [], indirect: [], substitute: [] };
        }
        const filtered = sanitizeList(list);
        return filtered.reduce(
          (acc, item) => {
            const category = item?.category || "direct";
          const entry = {
            product_name: item?.product_name || item?.name || "",
            url: item?.url || "",
            description: item?.description || "",
            target_audience: item?.target_audience || "",
            positioning: item?.positioning || ""
          };
            if (category === "indirect") {
              acc.indirect.push(entry);
            } else if (category === "substitute") {
              acc.substitute.push(entry);
            } else {
              acc.direct.push(entry);
            }
            return acc;
          },
          { direct: [], indirect: [], substitute: [] }
        );
      };
      const normalizeGroupItems = (items) =>
        sanitizeList(items).map((item) => ({
          product_name: item?.product_name || item?.name || "",
          url: item?.url || "",
          description: item?.description || "",
          target_audience: item?.target_audience || "",
          positioning: item?.positioning || ""
        }));
      const normalizeGrouped = (grouped) => ({
        direct: normalizeGroupItems(Array.isArray(grouped?.direct) ? grouped.direct : []),
        indirect: normalizeGroupItems(Array.isArray(grouped?.indirect) ? grouped.indirect : []),
        substitute: normalizeGroupItems(Array.isArray(grouped?.substitute) ? grouped.substitute : [])
      });
      if (parsed.competitor_inventory && parsed.competitor_inventory.competitors) {
        return {
          competitors: normalizeGrouped(parsed.competitor_inventory.competitors)
        };
      }
      if (parsed.competitorInventory && parsed.competitorInventory.competitors) {
        return {
          competitors: normalizeGrouped(parsed.competitorInventory.competitors)
        };
      }
      if (Array.isArray(parsed.competitors)) {
        return { competitors: normalizeCompetitors(parsed.competitors) };
      }
      if (Array.isArray(parsed.Competitors)) {
        return { competitors: normalizeCompetitors(parsed.Competitors) };
      }
      if (parsed.competitors && typeof parsed.competitors === "object") {
        return { competitors: normalizeGrouped(parsed.competitors) };
      }
    }
    if (field.key === "problemUnderstanding.userPainPoints") {
      const normalizePoints = (points) =>
        Array.isArray(points)
          ? points.map((point) => ({
              name: point?.name || "",
              description: point?.description || "",
              severity:
                point?.severity === "high" || point?.severity === "low"
                  ? point.severity
                  : "medium",
              frequency:
                point?.frequency === "high" || point?.frequency === "low"
                  ? point.frequency
                  : "medium"
            }))
          : [];
      const normalizeGroups = (groups) =>
        Array.isArray(groups)
          ? groups.map((group) => ({
              user_segment: group?.user_segment || group?.user_group || group?.theme_name || "",
              pain_points: normalizePoints(group?.pain_points)
            }))
          : [];
      if (parsed.user_pain_points) {
        if (parsed.user_pain_points.user_segments) {
          return { user_segments: normalizeGroups(parsed.user_pain_points.user_segments) };
        }
        if (parsed.user_pain_points.user_groups) {
          return { user_segments: normalizeGroups(parsed.user_pain_points.user_groups) };
        }
        if (parsed.user_pain_points.pain_point_themes) {
          return { user_segments: normalizeGroups(parsed.user_pain_points.pain_point_themes) };
        }
      }
      if (parsed.user_segments) {
        return { user_segments: normalizeGroups(parsed.user_segments) };
      }
      if (parsed.user_groups) {
        return { user_segments: normalizeGroups(parsed.user_groups) };
      }
      if (parsed.pain_point_themes) {
        return { user_segments: normalizeGroups(parsed.pain_point_themes) };
      }
    }
    if (field.key === "marketAndCompetitorAnalysis.competitorCapabilities") {
      const normalizeItems = (items) =>
        Array.isArray(items)
          ? items.map((item) => ({
              capability: item?.capability || "",
              alignment_with_user_needs: item?.alignment_with_user_needs || "",
              owning_competitors: Array.isArray(item?.owning_competitors)
                ? item.owning_competitors
                : typeof item?.owning_competitors === "string"
                  ? item.owning_competitors
                      .split("\n")
                      .map((entry) => entry.trim())
                      .filter(Boolean)
                  : item?.competitor_name
                    ? [item.competitor_name]
                    : [],
              gaps_and_limitations: Array.isArray(item?.gaps_and_limitations)
                ? item.gaps_and_limitations
                : typeof item?.gaps_and_limitations === "string"
                  ? item.gaps_and_limitations
                      .split("\n")
                      .map((entry) => entry.trim())
                      .filter(Boolean)
                  : Array.isArray(item?.limitations)
                    ? item.limitations
                    : []
            }))
          : [];
      const normalizeGroup = (value) => ({
        Functional: normalizeItems(value?.Functional),
        Technical: normalizeItems(value?.Technical),
        Business: normalizeItems(value?.Business)
      });
      const wrapGroup = (groupName, items) => ({
        Functional: groupName === "Functional" ? normalizeItems(items) : [],
        Technical: groupName === "Technical" ? normalizeItems(items) : [],
        Business: groupName === "Business" ? normalizeItems(items) : []
      });
      if (parsed.competitorCapabilities && parsed.competitorCapabilities.competitor_capabilities) {
        return {
          competitor_capabilities: normalizeGroup(
            parsed.competitorCapabilities.competitor_capabilities
          )
        };
      }
      if (parsed.competitor_capabilities && !Array.isArray(parsed.competitor_capabilities)) {
        return { competitor_capabilities: normalizeGroup(parsed.competitor_capabilities) };
      }
      if (Array.isArray(parsed.competitor_capabilities)) {
        const grouped = { Functional: [], Technical: [], Business: [] };
        parsed.competitor_capabilities.forEach((item) => {
          const raw = String(item?.capability_group || "").toLowerCase();
          const group = raw.includes("technical")
            ? "Technical"
            : raw.includes("business")
              ? "Business"
              : "Functional";
          grouped[group] = grouped[group].concat(normalizeItems([item]));
        });
        return { competitor_capabilities: grouped };
      }
      if (parsed.competitor_capabilities_by_group) {
        return { competitor_capabilities: normalizeGroup(parsed.competitor_capabilities_by_group) };
      }
      if (parsed.functional_capabilities || parsed.technical_capabilities || parsed.business_capabilities) {
        return {
          competitor_capabilities: {
            Functional: normalizeItems(parsed.functional_capabilities),
            Technical: normalizeItems(parsed.technical_capabilities),
            Business: normalizeItems(parsed.business_capabilities)
          }
        };
      }
      if (parsed.capability_group) {
        return {
          competitor_capabilities: wrapGroup(parsed.capability_group, [parsed])
        };
      }
    }
    if (field.key === "marketAndCompetitorAnalysis.gapsOpportunities") {
      const normalizeOpportunity = (item) => {
        if (!item || typeof item !== "object") {
          return item;
        }
        const opportunity =
          item.opportunity ||
          item.opportunity_description ||
          item.gap_description ||
          item.description ||
          "";
        const why_it_remains_unaddressed =
          item.why_it_remains_unaddressed ||
          item.persistence_reason ||
          item.reason ||
          item.why ||
          "";
        const user_value_potential =
          typeof item.user_value_potential === "string"
            ? item.user_value_potential
            : "";
        return {
          opportunity,
          why_it_remains_unaddressed,
          user_value_potential
        };
      };
      if (Array.isArray(parsed.opportunities)) {
        return { opportunities: parsed.opportunities.map(normalizeOpportunity) };
      }
      if (parsed.gapsOpportunities && parsed.gapsOpportunities.opportunities) {
        return {
          opportunities: parsed.gapsOpportunities.opportunities.map(normalizeOpportunity)
        };
      }
      if (parsed.gaps_and_opportunities && typeof parsed.gaps_and_opportunities === "object") {
        const legacy = parsed.gaps_and_opportunities;
        const merged = [
          ...(Array.isArray(legacy.functional) ? legacy.functional : []),
          ...(Array.isArray(legacy.technical) ? legacy.technical : []),
          ...(Array.isArray(legacy.business) ? legacy.business : [])
        ];
        return { opportunities: merged.map(normalizeOpportunity) };
      }
      if (Array.isArray(parsed)) {
        return { opportunities: parsed.map(normalizeOpportunity) };
      }
    }
    if (field.key === "problemUnderstanding.targetUsersSegments") {
      if (Array.isArray(parsed.user_segments)) {
        parsed.user_segments = parsed.user_segments.map((segment) => {
          if (!segment || typeof segment !== "object") {
            return segment;
          }
          const segment_type =
            segment.segment_type === "primary" ? "primary" : "secondary";
          let usage_contexts = [];
          if (Array.isArray(segment.usage_contexts)) {
            usage_contexts = segment.usage_contexts;
          } else if (Array.isArray(segment.usage_context)) {
            usage_contexts = segment.usage_context;
          } else if (typeof segment.usage_contexts === "string") {
            usage_contexts = segment.usage_contexts
              .split("\n")
              .map((line) => line.trim())
              .filter(Boolean);
          } else if (typeof segment.usage_context === "string") {
            usage_contexts = segment.usage_context
              .split("\n")
              .map((line) => line.trim())
              .filter(Boolean);
          } else if (typeof segment.business_relevance === "string") {
            usage_contexts = segment.business_relevance
              .split("\n")
              .map((line) => line.trim())
              .filter(Boolean);
          }
          let characteristics = [];
          if (Array.isArray(segment.characteristics)) {
            characteristics = segment.characteristics;
          } else if (Array.isArray(segment.user_groups)) {
            characteristics = segment.user_groups
              .flatMap((group) => group?.characteristics || [])
              .filter((item) => typeof item === "string");
          }
          return {
            ...segment,
            segment_type,
            usage_contexts,
            characteristics
          };
        });
        const primaryIndex = parsed.user_segments.findIndex(
          (segment) => segment && segment.segment_type === "primary"
        );
        if (primaryIndex === -1 && parsed.user_segments.length > 0) {
          parsed.user_segments[0].segment_type = "primary";
        }
        parsed.user_segments = [
          ...parsed.user_segments.filter(
            (segment, index) => index === primaryIndex
          ),
          ...parsed.user_segments.filter(
            (segment, index) => index !== primaryIndex
          )
        ].filter(Boolean);
        parsed.user_segments.forEach((segment, index) => {
          if (segment && segment.segment_type !== "primary") {
            segment.segment_type = "secondary";
          }
          if (index === 0 && segment) {
            segment.segment_type = "primary";
          }
        });
      } else if (Array.isArray(parsed.target_segments)) {
        parsed.user_segments = parsed.target_segments;
        delete parsed.target_segments;
        return normalizeParsedFieldValue(field, parsed, currentDocument);
      }
    }
    if (field.key === "opportunityDefinition.valueDrivers") {
      if (parsed.valueDrivers && parsed.valueDrivers.value_drivers) {
        return {
          value_drivers: Array.isArray(parsed.valueDrivers.value_drivers)
            ? parsed.valueDrivers.value_drivers.map((item) => String(item)).filter(Boolean)
            : []
        };
      }
      if (parsed.value_drivers) {
        return {
          value_drivers: Array.isArray(parsed.value_drivers)
            ? parsed.value_drivers.map((item) => String(item)).filter(Boolean)
            : []
        };
      }
      if (Array.isArray(parsed["Value Drivers"])) {
        return {
          value_drivers: parsed["Value Drivers"]
            .map((item) => String(item))
            .filter(Boolean)
        };
      }
    }
    if (field.key === "opportunityDefinition.feasibilityRisks") {
      const raw =
        parsed.feasibility_risks ||
        parsed.feasibilityRisks?.feasibility_risks;
      if (Array.isArray(raw)) {
        const hasGroups = raw.some((item) => Array.isArray(item?.risks));
        if (hasGroups) {
          return { feasibility_risks: raw };
        }
        const riskTypes = ["business", "user", "technical"];
        return {
          feasibility_risks: riskTypes.map((riskType) => ({
            feasibility_risk_type: riskType,
            risks: raw
              .filter((item) => item?.feasibility_risk_type === riskType)
              .map((item) => ({
                feasibility_risk: item?.feasibility_risk || "",
                why_it_matters: item?.why_it_matters || ""
              }))
          }))
        };
      }
    }
    return parsed;
  }

  function isGenericCompetitorName(name) {
    return false;
  }

  function isValidCompetitorUrl(url) {
    if (typeof url !== "string" || !url.trim()) {
      return false;
    }
    try {
      const parsed = new URL(url);
      if (!["http:", "https:"].includes(parsed.protocol)) {
        return false;
      }
      const host = parsed.hostname.toLowerCase();
      if (!host || !host.includes(".")) {
        return false;
      }
      const blockedHosts = [
        "play.google.com",
        "apps.apple.com",
        "itunes.apple.com",
        "g2.com",
        "capterra.com",
        "trustpilot.com"
      ];
      if (blockedHosts.some((blocked) => host === blocked || host.endsWith(`.${blocked}`))) {
        return false;
      }
      if (url.includes("appstore") || url.includes("play.google.com")) {
        return false;
      }
      return true;
    } catch (error) {
      return false;
    }
  }

  function validateCompetitorInventoryValue(value) {
    const errors = [];
    const competitors = value?.competitors;
    if (!competitors || typeof competitors !== "object") {
      return errors;
    }
    const categories = ["direct", "indirect", "substitute"];
    categories.forEach((category) => {
      const items = Array.isArray(competitors[category]) ? competitors[category] : [];
      items.forEach((item, index) => {
        const name = item?.product_name || item?.name || "";
        if (!name.trim() || isGenericCompetitorName(name)) {
          errors.push(
            `competitors.${category}[${index}].product_name: Must be a specific product or company name (no generic categories).`
          );
        }
        if (item?.url && !isValidCompetitorUrl(item?.url)) {
          errors.push(
            `competitors.${category}[${index}].url: Must be a valid official product URL (no app stores/review sites).`
          );
        }
      });
    });
    return errors;
  }

  return {
    isPlainObject,
    validateAgainstSchema,
    normalizeRawFieldValue,
    normalizeParsedFieldValue,
    validateCompetitorInventoryValue
  };
}
