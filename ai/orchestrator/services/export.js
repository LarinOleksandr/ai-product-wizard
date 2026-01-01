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
          const segments = value?.target_segments || [];
          segments.forEach((segment) => {
            parts.push(`- Segment: ${escapeMarkdown(segment.segment_name || "")}`);
            if (segment.business_relevance) {
              parts.push(`  - Business relevance: ${escapeMarkdown(segment.business_relevance)}`);
            }
            if (Array.isArray(segment.user_groups)) {
              segment.user_groups.forEach((group) => {
                parts.push(`  - Group: ${escapeMarkdown(group.name || "")}`);
                const characteristics = formatMarkdownList(group.characteristics || []);
                if (characteristics) {
                  parts.push("    - Characteristics:");
                  parts.push(
                    characteristics
                      .split("\n")
                      .map((line) => `    ${line}`)
                      .join("\n")
                  );
                }
              });
            }
          });
          return;
        }
        if (field.key === "problemUnderstanding.userPainPoints") {
          const themes = value?.pain_point_themes || [];
          themes.forEach((theme) => {
            parts.push(`- Theme: ${escapeMarkdown(theme.theme_name || "")}`);
            (theme.pain_points || []).forEach((pain) => {
              parts.push(`  - Pain point: ${escapeMarkdown(pain.name || "")}`);
              if (pain.description) {
                parts.push(`    - Description: ${escapeMarkdown(pain.description)}`);
              }
              if (Array.isArray(pain.affected_user_groups)) {
                const groups = formatMarkdownList(pain.affected_user_groups);
                if (groups) {
                  parts.push(
                    groups
                      .split("\n")
                      .map((line) => `    ${line}`)
                      .join("\n")
                  );
                }
              }
              parts.push(`    - Severity: ${pain.severity || ""}`);
              parts.push(`    - Frequency: ${pain.frequency || ""}`);
              parts.push(`    - Business importance: ${pain.business_importance || ""}`);
            });
          });
          return;
        }
        if (field.key === "problemUnderstanding.contextConstraints") {
          const contextual = value?.contextual_factors || [];
          if (contextual.length) {
            parts.push("#### Contextual factors");
            contextual.forEach((item) => {
              parts.push(`- ${escapeMarkdown(item.name || "")}`);
              parts.push(`  - Description: ${escapeMarkdown(item.description || "")}`);
              parts.push(
                `  - Impact on user needs: ${escapeMarkdown(item.impact_on_user_needs || "")}`
              );
              parts.push(
                `  - Business implications: ${escapeMarkdown(item.business_implications || "")}`
              );
            });
          }
          const constraints = value?.constraints || [];
          if (constraints.length) {
            parts.push("#### Constraints");
            constraints.forEach((item) => {
              parts.push(`- ${escapeMarkdown(item.name || "")}`);
              parts.push(`  - Description: ${escapeMarkdown(item.description || "")}`);
              parts.push(
                `  - Impact on user needs: ${escapeMarkdown(item.impact_on_user_needs || "")}`
              );
              parts.push(
                `  - Business implications: ${escapeMarkdown(item.business_implications || "")}`
              );
            });
          }
          return;
        }
        if (field.key === "marketAndCompetitorAnalysis.marketLandscape") {
          parts.push(
            `- Market definition: ${escapeMarkdown(value.market_definition?.description || "")}`
          );
          if (Array.isArray(value.market_definition?.excluded_adjacent_spaces)) {
            const excluded = formatMarkdownList(value.market_definition.excluded_adjacent_spaces);
            if (excluded) {
              parts.push("  - Excluded adjacent spaces:");
              parts.push(
                excluded
                  .split("\n")
                  .map((line) => `    ${line}`)
                  .join("\n")
              );
            }
          }
          parts.push(`- Market size: ${escapeMarkdown(value.market_size?.description || "")}`);
          parts.push(
            `- Market maturity: ${escapeMarkdown(value.market_maturity?.classification || "")}`
          );
          if (value.market_maturity?.rationale) {
            parts.push(`  - Rationale: ${escapeMarkdown(value.market_maturity.rationale)}`);
          }
          const listSection = (label, items) => {
            if (!Array.isArray(items) || !items.length) {
              return;
            }
            parts.push(`- ${label}:`);
            items.forEach((item) => {
              parts.push(`  - ${escapeMarkdown(item.name || "")}`);
              if (item.description) {
                parts.push(`    - Description: ${escapeMarkdown(item.description)}`);
              }
              if (item.time_horizon) {
                parts.push(`    - Time horizon: ${item.time_horizon}`);
              }
              if (Array.isArray(item.affected_target_segments)) {
                const segments = formatMarkdownList(item.affected_target_segments);
                if (segments) {
                  parts.push(
                    segments
                      .split("\n")
                      .map((line) => `    ${line}`)
                      .join("\n")
                  );
                }
              }
              if (item.basis) {
                parts.push(`    - Basis: ${item.basis}`);
              }
              if (item.confidence) {
                parts.push(`    - Confidence: ${item.confidence}`);
              }
            });
          };
          listSection("Trends", value.market_trends);
          listSection("Dynamics", value.market_dynamics);
          listSection("Forces", value.market_forces);
          listSection("Adoption drivers", value.adoption_drivers);
          listSection("Adoption barriers", value.adoption_barriers);
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
          const competitors = value?.competitors || [];
          competitors.forEach((competitor) => {
            parts.push(`- Competitor: ${escapeMarkdown(competitor.name || "")}`);
            if (competitor.url) {
              parts.push(`  - URL: ${escapeMarkdown(competitor.url)}`);
            }
            if (competitor.category) {
              parts.push(`  - Category: ${escapeMarkdown(competitor.category)}`);
            }
            if (competitor.description) {
              parts.push(`  - Description: ${escapeMarkdown(competitor.description)}`);
            }
            if (competitor.positioning) {
              parts.push(`  - Positioning: ${escapeMarkdown(competitor.positioning)}`);
            }
            if (competitor.target_audience) {
              parts.push(`  - Target audience: ${escapeMarkdown(competitor.target_audience)}`);
            }
          });
          return;
        }
        if (field.key === "marketAndCompetitorAnalysis.competitorCapabilities") {
          const capabilities = value?.competitor_capabilities || [];
          capabilities.forEach((capability) => {
            parts.push(`- Competitor: ${escapeMarkdown(capability.competitor_name || "")}`);
            pushNamedList(parts, "  Functional capabilities", capability.functional_capabilities);
            pushNamedList(parts, "  Technical capabilities", capability.technical_capabilities);
            pushNamedList(parts, "  Business capabilities", capability.business_capabilities);
            pushNamedList(parts, "  Strengths", capability.strengths);
            pushNamedList(parts, "  Limitations", capability.limitations);
            if (capability.alignment_with_user_needs) {
              parts.push(
                `  - Alignment with user needs: ${escapeMarkdown(
                  capability.alignment_with_user_needs
                )}`
              );
            }
          });
          const patterns = value?.industry_capability_patterns || [];
          if (patterns.length) {
            parts.push("#### Industry capability patterns");
            patterns.forEach((pattern) => {
              parts.push(`- Pattern: ${escapeMarkdown(pattern.pattern_name || "")}`);
              if (pattern.description) {
                parts.push(`  - Description: ${escapeMarkdown(pattern.description)}`);
              }
            });
          }
          return;
        }
        if (field.key === "marketAndCompetitorAnalysis.gapsOpportunities") {
          const gaps = value?.gaps_and_opportunities || {};
          const renderGapList = (label, items) => {
            if (!Array.isArray(items) || !items.length) {
              return;
            }
            parts.push(`#### ${label}`);
            items.forEach((item) => {
              parts.push(`- Gap: ${escapeMarkdown(item.gap_description || "")}`);
              if (Array.isArray(item.affected_user_segments)) {
                const segments = item.affected_user_segments.map((segment) => segment).join(", ");
                if (segments) {
                  parts.push(`  - Affected user segments: ${escapeMarkdown(segments)}`);
                }
              }
              parts.push(
                `  - Opportunity: ${escapeMarkdown(item.opportunity_description || "")}`
              );
              if (item.user_value_potential) {
                parts.push(`  - User value potential: ${item.user_value_potential}`);
              }
              if (item.feasibility) {
                parts.push(`  - Feasibility: ${item.feasibility}`);
              }
            });
          };
          renderGapList("Functional gaps", gaps.functional);
          renderGapList("Technical gaps", gaps.technical);
          renderGapList("Business gaps", gaps.business);
          return;
        }
        if (field.key === "opportunityDefinition.opportunityStatement") {
          if (value.opportunity_statement) {
            parts.push(escapeMarkdown(value.opportunity_statement));
          }
          return;
        }
        if (field.key === "opportunityDefinition.valueDrivers") {
          const drivers = value?.value_drivers || [];
          drivers.forEach((driver) => {
            parts.push(`- Driver: ${escapeMarkdown(driver.name || "")}`);
            if (driver.user_need_or_pain) {
              parts.push(`  - User need or pain: ${escapeMarkdown(driver.user_need_or_pain)}`);
            }
            if (driver.user_value_impact) {
              parts.push(`  - User value impact: ${driver.user_value_impact}`);
            }
            if (driver.business_value_lever) {
              parts.push(`  - Business value lever: ${escapeMarkdown(driver.business_value_lever)}`);
            }
            if (driver.business_value_impact) {
              parts.push(`  - Business value impact: ${driver.business_value_impact}`);
            }
            if (driver.priority) {
              parts.push(`  - Priority: ${driver.priority}`);
            }
          });
          return;
        }
        if (field.key === "opportunityDefinition.marketFitHypothesis") {
          const hypothesis = value?.market_fit_hypothesis || {};
          const renderHypothesis = (label, items) => {
            if (!Array.isArray(items) || !items.length) {
              return;
            }
            parts.push(`#### ${label}`);
            items.forEach((item) => {
              parts.push(`- Hypothesis: ${escapeMarkdown(item.hypothesis || "")}`);
              if (item.rationale) {
                parts.push(`  - Rationale: ${escapeMarkdown(item.rationale)}`);
              }
              if (Array.isArray(item.key_risks_or_unknowns)) {
                const risks = item.key_risks_or_unknowns.map((risk) => risk).join(", ");
                if (risks) {
                  parts.push(`  - Key risks or unknowns: ${escapeMarkdown(risks)}`);
                }
              }
            });
          };
          renderHypothesis("Desirability", hypothesis.desirability);
          renderHypothesis("Viability", hypothesis.viability);
          return;
        }
        if (field.key === "opportunityDefinition.feasibilityAssessment") {
          const assessment = value?.feasibility_assessment || {};
          const renderConstraints = (label, items) => {
            if (!Array.isArray(items) || !items.length) {
              return;
            }
            parts.push(`#### ${label}`);
            items.forEach((item) => {
              parts.push(`- Constraint: ${escapeMarkdown(item.name || "")}`);
              if (item.description) {
                parts.push(`  - Description: ${escapeMarkdown(item.description)}`);
              }
              if (item.readiness) {
                parts.push(`  - Readiness: ${item.readiness}`);
              }
            });
          };
          renderConstraints("Business constraints", assessment.business_constraints);
          renderConstraints("User constraints", assessment.user_constraints);
          renderConstraints("Technical concerns", assessment.technical_concerns);
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
