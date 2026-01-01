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

  function markdownToHtml(markdown) {
    const lines = markdown.split("\n");
    const html = [];
    let inList = false;
    const closeList = () => {
      if (inList) {
        html.push("</ul>");
        inList = false;
      }
    };
    lines.forEach((line) => {
      if (!line.trim()) {
        closeList();
        return;
      }
      if (line.startsWith("#### ")) {
        closeList();
        html.push(`<h4>${escapeHtml(line.slice(5).trim())}</h4>`);
        return;
      }
      if (line.startsWith("### ")) {
        closeList();
        html.push(`<h3>${escapeHtml(line.slice(4).trim())}</h3>`);
        return;
      }
      if (line.startsWith("## ")) {
        closeList();
        html.push(`<h2>${escapeHtml(line.slice(3).trim())}</h2>`);
        return;
      }
      if (line.startsWith("# ")) {
        closeList();
        html.push(`<h1>${escapeHtml(line.slice(2).trim())}</h1>`);
        return;
      }
      if (line.startsWith("- ")) {
        if (!inList) {
          html.push("<ul>");
          inList = true;
        }
        html.push(`<li>${escapeHtml(line.slice(2).trim())}</li>`);
        return;
      }
      closeList();
      html.push(`<p>${escapeHtml(line.trim())}</p>`);
    });
    closeList();
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
      body {
        font-family: "Inter", "Segoe UI", Arial, sans-serif;
        color: #0f172a;
        margin: 40px;
        line-height: 1.5;
      }
      h1 { font-size: 24px; margin-bottom: 16px; }
      h2 { font-size: 18px; margin-top: 24px; }
      h3 { font-size: 16px; margin-top: 16px; }
      h4 { font-size: 14px; margin-top: 12px; text-transform: uppercase; color: #64748b; }
      ul { margin: 8px 0 12px 20px; }
      li { margin: 4px 0; }
      p { margin: 6px 0; }
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
