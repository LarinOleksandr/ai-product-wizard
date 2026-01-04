export function createExportService({
  exportStructure,
  getNestedValue,
  storageService
}) {
  function escapeMarkdown(text) {
    if (typeof text !== "string") {
      return "";
    }
    return text.replace(/\r\n/g, "\n").trim();
  }

  function formatMarkdownList(items) {
    if (!Array.isArray(items) || items.length === 0) {
      return "";
    }
    return items.map((item) => `- ${escapeMarkdown(String(item))}`).join("\n");
  }

  function pushNamedList(parts, label, items) {
    if (!Array.isArray(items) || !items.length) {
      return;
    }
    parts.push(`- ${label}:`);
    items.forEach((item) => {
      parts.push(`  - ${escapeMarkdown(String(item))}`);
    });
  }

  function renderDiscoveryMarkdown(document) {
    const parts = ["# Discovery Document"];

    exportStructure.forEach((section) => {
      parts.push(`\n## ${section.title}`);
      section.fields.forEach((field) => {
        const value = getNestedValue(document, field.key);
        if (!value || (typeof value === "string" && !value.trim())) {
          return;
        }
        parts.push(`\n### ${field.label}`);
        if (typeof value === "string") {
          parts.push(escapeMarkdown(value));
          return;
        }
        if (field.key === "problemUnderstanding.targetUsersSegments") {
          const segments = value?.user_segments || value?.target_segments || [];
          segments.forEach((segment) => {
            parts.push(`- Segment: ${escapeMarkdown(segment.segment_name || "")}`);
            if (segment.segment_type) {
              parts.push(`  - Segment type: ${escapeMarkdown(segment.segment_type)}`);
            }
            const usageContexts = Array.isArray(segment.usage_contexts)
              ? segment.usage_contexts
              : Array.isArray(segment.usage_context)
                ? segment.usage_context
                : [];
            if (usageContexts.length) {
              parts.push(`  - Usage contexts:`);
              usageContexts.forEach((item) => {
                parts.push(`    - ${escapeMarkdown(String(item))}`);
              });
            }
            const segmentCharacteristics = Array.isArray(segment.characteristics)
              ? segment.characteristics
              : Array.isArray(segment.user_groups)
                ? segment.user_groups.flatMap((group) => group?.characteristics || [])
                : [];
            if (Array.isArray(segmentCharacteristics)) {
              const characteristics = formatMarkdownList(segmentCharacteristics);
              if (characteristics) {
                parts.push("  - Characteristics:");
                parts.push(
                  characteristics
                    .split("\n")
                    .map((line) => `    ${line}`)
                    .join("\n")
                );
              }
            }
          });
          return;
        }
        if (field.key === "problemUnderstanding.userPainPoints") {
          const userGroups = Array.isArray(value?.user_segments)
            ? value.user_segments
            : Array.isArray(value?.pain_point_themes)
              ? value.pain_point_themes.map((theme) => ({
                  user_segment: theme?.theme_name || "",
                  pain_points: Array.isArray(theme?.pain_points) ? theme.pain_points : []
                }))
              : [];
          userGroups.forEach((group) => {
            parts.push(`- User segment: ${escapeMarkdown(group.user_segment || "")}`);
            (group.pain_points || []).forEach((pain) => {
              parts.push(`  - Pain point: ${escapeMarkdown(pain.name || "")}`);
              if (pain.description) {
                parts.push(`    - Description: ${escapeMarkdown(pain.description)}`);
              }
              parts.push(`    - Severity: ${pain.severity || ""}`);
              parts.push(`    - Frequency: ${pain.frequency || ""}`);
            });
          });
          return;
        }
        if (field.key === "problemUnderstanding.contextualFactors") {
          const contextualGroups = Array.isArray(value?.contextual_factors)
            ? value.contextual_factors
            : [];
          contextualGroups.forEach((group) => {
            parts.push(`- ${escapeMarkdown(group.factor_group || "")}`);
            (group.factors || []).forEach((item) => {
              parts.push(`  - ${escapeMarkdown(item.name || "")}`);
              parts.push(`    - Description: ${escapeMarkdown(item.description || "")}`);
            });
          });
          return;
        }
        if (field.key === "problemUnderstanding.constraints") {
          const constraintGroups = Array.isArray(value?.constraints)
            ? value.constraints
            : [];
          constraintGroups.forEach((group) => {
            parts.push(`- ${escapeMarkdown(group.constraint_group || "")}`);
            (group.constraints || []).forEach((item) => {
              parts.push(`  - ${escapeMarkdown(item.name || "")}`);
              parts.push(`    - Description: ${escapeMarkdown(item.description || "")}`);
            });
          });
          return;
        }
        if (field.key === "marketAndCompetitorAnalysis.marketLandscape") {
          if (typeof value === "string") {
            parts.push(escapeMarkdown(value));
            return;
          }
          const definition =
            typeof value.market_definition === "string"
              ? value.market_definition
              : value.market_definition?.description || "";
          parts.push(`- Market definition: ${escapeMarkdown(definition)}`);
          if (
            value.alternatives &&
            (value.alternatives.direct_competitor_segments?.length ||
              value.alternatives.indirect_competitor_segments?.length ||
              value.alternatives.substitute_segments?.length)
          ) {
            const addAltList = (label, items) => {
              if (!Array.isArray(items) || !items.length) {
                return;
              }
              parts.push(`  - ${label}:`);
              items.forEach((item) => {
                parts.push(`    - ${escapeMarkdown(String(item))}`);
              });
            };
            parts.push("- Alternatives:");
            addAltList(
              "Direct competitor segments",
              value.alternatives.direct_competitor_segments
            );
            addAltList(
              "Indirect competitor segments",
              value.alternatives.indirect_competitor_segments
            );
            addAltList("Substitutes segments", value.alternatives.substitute_segments);
          }
          pushNamedList(parts, "Market norms", value.market_norms);
          pushNamedList(parts, "Adoption drivers", value.adoption_drivers);
          pushNamedList(parts, "Adoption barriers", value.adoption_barriers);
          return;
        }
        if (field.key === "marketAndCompetitorAnalysis.competitorInventory") {
          if (Array.isArray(value)) {
            const list = formatMarkdownList(value);
            if (list) {
              parts.push(list);
            }
            return;
          }
          const competitors = value?.competitors;
          const renderGroup = (label, items) => {
            if (!Array.isArray(items) || !items.length) {
              return;
            }
            parts.push(`- ${label}:`);
            items.forEach((competitor) => {
              parts.push(
                `  - ${escapeMarkdown(competitor.product_name || competitor.name || "")}`
              );
              if (competitor.url) {
                parts.push(`    - URL: ${escapeMarkdown(competitor.url)}`);
              }
              if (competitor.description) {
                parts.push(`    - Description: ${escapeMarkdown(competitor.description)}`);
              }
              if (competitor.positioning) {
                parts.push(`    - Positioning: ${escapeMarkdown(competitor.positioning)}`);
              }
              if (competitor.target_audience) {
                parts.push(
                  `    - Target audience: ${escapeMarkdown(competitor.target_audience)}`
                );
              }
            });
          };
          renderGroup("Direct competitors", competitors?.direct);
          renderGroup("Indirect competitors", competitors?.indirect);
          renderGroup("Substitutes", competitors?.substitute);
          return;
        }
        if (field.key === "marketAndCompetitorAnalysis.competitorCapabilities") {
          const capabilities = value?.competitor_capabilities || {};
          const renderGroup = (label, items) => {
            if (!Array.isArray(items) || !items.length) {
              return;
            }
            parts.push(`#### ${label}`);
            items.forEach((capability) => {
              parts.push(`- Capability: ${escapeMarkdown(capability.capability || "")}`);
              if (capability.alignment_with_user_needs) {
                parts.push(
                  `  - Alignment with user needs: ${escapeMarkdown(
                    capability.alignment_with_user_needs
                  )}`
                );
              }
              pushNamedList(parts, "  Owning competitors", capability.owning_competitors);
              pushNamedList(parts, "  Gaps and limitations", capability.gaps_and_limitations);
            });
          };
          renderGroup("Functional", capabilities.Functional);
          renderGroup("Technical", capabilities.Technical);
          renderGroup("Business", capabilities.Business);
          return;
        }
        if (field.key === "marketAndCompetitorAnalysis.gapsOpportunities") {
          const opportunities = value?.opportunities || [];
          if (!Array.isArray(opportunities) || opportunities.length === 0) {
            return;
          }
          opportunities.forEach((item) => {
            parts.push(`- Opportunity: ${escapeMarkdown(item.opportunity || "")}`);
            if (item.why_it_remains_unaddressed) {
              parts.push(
                `  - Why it remains unaddressed: ${escapeMarkdown(
                  item.why_it_remains_unaddressed
                )}`
              );
            }
            if (item.user_value_potential) {
              parts.push(`  - User value potential: ${item.user_value_potential}`);
            }
          });
          return;
        }
        if (field.key === "opportunityDefinition.valueDrivers") {
          const drivers = value?.value_drivers || [];
          drivers.forEach((driver) => {
            parts.push(`- ${escapeMarkdown(String(driver || ""))}`);
          });
          return;
        }
        if (field.key === "opportunityDefinition.feasibilityRisks") {
          const risks = value?.feasibility_risks || [];
          if (!Array.isArray(risks) || !risks.length) {
            return;
          }
          risks.forEach((item) => {
            parts.push(`- Risk type: ${escapeMarkdown(item.feasibility_risk_type || "")}`);
            parts.push(`  - Risk: ${escapeMarkdown(item.feasibility_risk || "")}`);
            if (item.why_it_matters) {
              parts.push(
                `  - Why it matters: ${escapeMarkdown(item.why_it_matters)}`
              );
            }
          });
          return;
        }
        parts.push(JSON.stringify(value, null, 2));
      });
    });

    return parts.join("\n");
  }

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function linkifyHtml(text) {
    const escaped = escapeHtml(text);
    return escaped.replace(
      /(https?:\/\/[^\s)]+)|(www\.[^\s)]+)/g,
      (match) => {
        const href = match.startsWith("http") ? match : `https://${match}`;
        return `<a href="${href}">${match}</a>`;
      }
    );
  }

  function markdownToHtml(markdown) {
    const lines = markdown.split("\n");
    const html = [];
    const listStack = [];
    let inSection = false;
    const closeListsTo = (depth) => {
      while (listStack.length > depth) {
        html.push("</ul>");
        listStack.pop();
      }
    };
    const closeAllLists = () => closeListsTo(0);
    const closeSection = () => {
      if (inSection) {
        html.push("</section>");
        inSection = false;
      }
    };
    const openListTo = (depth) => {
      while (listStack.length < depth) {
        html.push("<ul>");
        listStack.push(true);
      }
    };
    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) {
        closeAllLists();
        return;
      }
      if (line.startsWith("#### ")) {
        closeAllLists();
        html.push(`<h4>${escapeHtml(line.slice(5).trim())}</h4>`);
        return;
      }
      if (line.startsWith("### ")) {
        closeAllLists();
        html.push(`<h3>${escapeHtml(line.slice(4).trim())}</h3>`);
        return;
      }
      if (line.startsWith("## ")) {
        closeAllLists();
        closeSection();
        html.push(`<section class="doc-section">`);
        inSection = true;
        html.push(`<h2>${escapeHtml(line.slice(3).trim())}</h2>`);
        return;
      }
      if (line.startsWith("# ")) {
        closeAllLists();
        closeSection();
        html.push(`<h1>${escapeHtml(line.slice(2).trim())}</h1>`);
        return;
      }
      if (trimmed.startsWith("- ")) {
        const indent = line.match(/^\s*/)?.[0].length || 0;
        const depth = Math.floor(indent / 2) + 1;
        closeListsTo(depth);
        openListTo(depth);
        html.push(`<li>${linkifyHtml(trimmed.slice(2).trim())}</li>`);
        return;
      }
      closeAllLists();
      html.push(`<p>${linkifyHtml(trimmed)}</p>`);
    });
    closeAllLists();
    closeSection();
    return html.join("\n");
  }

  function renderDiscoveryHtml(markdown) {
    const body = markdownToHtml(markdown);
    return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Discovery Document</title>
    <style>
      :root {
        --ink: #0f172a;
        --muted: #64748b;
        --rule: #e2e8f0;
        --panel: #f8fafc;
        --accent: #0f172a;
      }
      * { box-sizing: border-box; }
      @page { margin: 12mm; }
      body {
        font-family: "Segoe UI", "Inter", Arial, sans-serif;
        color: var(--ink);
        margin: 24px 24px;
        padding: 12px 0;
        line-height: 1.6;
        background: #ffffff;
      }
      h1 {
        font-size: 28px;
        margin: 0 0 12px;
        letter-spacing: -0.02em;
      }
      h2 {
        font-size: 20px;
        margin: 28px 0 10px;
        padding-bottom: 6px;
        border-bottom: 1px solid var(--rule);
      }
      h3 {
        font-size: 16px;
        margin: 18px 0 6px;
        color: var(--accent);
      }
      h4 {
        font-size: 12px;
        margin: 14px 0 6px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--muted);
      }
      p { margin: 6px 0; }
      ul { margin: 6px 0 12px 20px; padding: 0; }
      li { margin: 4px 0; }
      li ul { margin-top: 4px; }
      hr { border: 0; border-top: 1px solid var(--rule); margin: 24px 0; }
      blockquote {
        margin: 10px 0;
        padding: 8px 12px;
        background: var(--panel);
        border-left: 3px solid var(--rule);
      }
      code, pre {
        font-family: "Consolas", "SFMono-Regular", ui-monospace, monospace;
        background: var(--panel);
      }
      pre {
        padding: 10px 12px;
        border-radius: 6px;
        overflow: auto;
      }
      .doc-section {
        page-break-before: always;
      }
      .doc-section:first-of-type {
        page-break-before: auto;
      }
      a {
        color: #2563eb;
        text-decoration: underline;
      }
    </style>
  </head>
  <body>
    ${body}
  </body>
</html>`;
  }

  async function getExportRecord(versionParam) {
    if (versionParam) {
      const record = await storageService.loadDiscoveryRecord(versionParam);
      if (!record) {
        throw new Error(`Discovery document v${versionParam} was not found.`);
      }
      return record;
    }
    const latest = await storageService.getLatestRecord();
    if (!latest) {
      throw new Error("No discovery document exists yet.");
    }
    return latest;
  }

  async function renderPdfFromHtml(html) {
    let playwright;
    try {
      playwright = await import("playwright");
    } catch (error) {
      throw new Error(
        "Playwright is not installed. Run: npm install playwright && npx playwright install chromium"
      );
    }
    const browser = await playwright.chromium.launch();
    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "networkidle" });
      const buffer = await page.pdf({ format: "A4", printBackground: true });
      await page.close();
      return buffer;
    } finally {
      await browser.close();
    }
  }

  return {
    renderDiscoveryMarkdown,
    renderDiscoveryHtml,
    renderPdfFromHtml,
    getExportRecord
  };
}
