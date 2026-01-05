# Section prompt

## Task

Produce **Competitors** using external research and verifiable public information.

## Workflow

1. Identify direct competitors:
   - analyze segments in direct_competitor_segments from alternatives in marketLandscape.
   - identify relevant companies or products that address the same core problem for similar target users.

2. Identify indirect competitors:
   - analyze segments in indirect_competitor_segments from alternatives in marketLandscape.
   - Find companies or products that address the same user needs through different approaches or categories.

3. Identify substitutes:
   - analyze segments in substitute_segments from alternatives in marketLandscape.
   - Identify alternatives users may rely on instead of a dedicated product (manual processes, generic tools, offline solutions).

4. For each competitor, define the following attributes:
   - url - Official product URL.
   - product_name: specific competitor product or company name.
     If this name is unclear use a domain part of the product or company URL.
     DO NOT use as the product-name a segment name from marketLandscape alternatives.
   - description - 1-2 sentences describing what the product does
   - target_audience - Primary target audience for the product
   - positioning - General positioning: how it presents itself in the market
5. Validate correctness:
   - Exclude irrelevant competitors, too global, outdated, or marginal.

## Generation Rules

- Do not use in the product_name generic terms like "solution", "tool", "platform", "system", "application".
- Do not use in the product_name segments from marketLandscape.
- Use real product or company names only; never use category labels from alternatives.
- Do not use broad, general-purpose platforms (e.g., Google, Facebook, Instagram, X/Twitter, YouTube) unless they are a direct, dedicated competitor in this niche.
