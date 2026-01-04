## Objective

Produce **Competitors** grouped by category (direct, indirect, substitutes) relevant to the problem space, using external research and verifiable public information.

The goal is comprehensive coverage and clear categorization, not competitive evaluation or differentiation.

## Workflow

1. Identify direct competitors based on the Internet Search Results and your knowledge:
   - Find companies or products that address the same core problem for similar target users.
   - Use external sources (official websites, product pages, reputable articles).
2. Identify indirect competitors:
   - Identify solutions that address the same user needs through different approaches or categories.
   - Include adjacent categories commonly considered by users.
3. Identify substitute competitors:
   - Identify alternatives users may rely on instead of a dedicated product (manual processes, generic tools, offline solutions).
4. Collect competitor profiles:
   - For each competitor, collect:
     - Product name (use specific named products only; fill `product_name`)
     - Short description of what it does
     - Primary target audience (high-level)
     - General positioning (how it presents itself, in plain language)
5. Validate completeness:
   - Ensure competitors are relevant to the Problem Statement and Target Users.
   - Exclude irrelevant, outdated, or marginal players.

## Rules

- Actively use external tools and web search to gather information.
- Use only publicly available, verifiable information.
- Use specific product or company names only; do not include generic categories like "Text-to-Speech Software".
- Write product names as proper brand names in `product_name`; if you cannot find a real product name, omit the entry.
- Provide an official product URL for every competitor; do not use app stores, review sites, or third-party articles.
- Do NOT use category labels (e.g., "Assistive Technology Companies", "Learning Management Systems"). Only real product or company names.
- Do NOT invent competitors.
- Unlimited number of competitors; include all relevant, omit irrelevant.
- Ensure that these applications are up-to-date for a current year and have a lot of users.
- Return only unique competitors, avoid including web and mobile versions of one app in the list
- Ensure that URLs you include directly lead to app pages.
- Ensure that URLs you include don't lead to error pages or redirects.
- Eliminate URLS that lead to third-party reviews, articles, app stores, or download pages.

## Output contract

- Return **only** the JSON object for this section.
- Do not include schema text, explanations, or commentary.
- Do not copy example content.

## Anti-copy constraints (hard)

- Generate the output **from scratch** using only the Inputs and domain-generic reasoning.
- Do not reuse any example field values, sentence structures, or named capability labels.
- If you detect you are reproducing any example-like phrasing, rewrite using different wording.
