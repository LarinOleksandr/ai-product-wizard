# Section prompt

## Task
Produce a **Market Landscape** section that defines market boundaries and describes market size, maturity, trends, dynamics, and forces in a **controlled, auditable, and decision-safe way**.

## Workflow
1. Define market boundaries
- Define the market using:
  - Primary domain
  - Problem space addressed
  - Adjacent spaces explicitly excluded
- Use the **narrowest definition** that still fully covers the Problem Statement and Target Users.

2. Describe market size (qualitative)
- Characterize the market using qualitative labels only (e.g., niche, emerging, broad, fragmented).
- Do NOT include numbers, estimates, or forecasts.

3. Classify market maturity
- Classify the market as one of:
  - emerging
  - fragmented
  - consolidating
  - mature
- Provide a short rationale referencing Inputs (phrases, pain points, user contexts).

4. Identify market trends
- Identify major trends shaping the market.
- Trends may be behavioral, operational, regulatory (generic), or structural.
- For each trend:
  - Assign a **time horizon**: short | mid | long
  - Identify **affected target segments**
  - State the **basis** of the trend:
    - evidence_from_inputs
    - domain_generic_assumption

5. Describe market dynamics
- Describe how demand, adoption, or participation typically behaves.
- Keep dynamics descriptive (how things move), not evaluative or prescriptive.
- Avoid competitor or solution references.

6. Identify market forces
- Identify forces that influence the market (e.g., user expectations, switching effort, trust, substitutes, barriers to entry).
- Do NOT reference named frameworks.
- Use plain language only.

7. Identify adoption drivers and barriers
- For each major theme, list:
  - Adoption drivers (what pushes usage or demand)
  - Adoption barriers (what slows or blocks adoption)
- Drivers and barriers must be balanced and expressed at the same level of abstraction.

8. Validate and filter
Exclude any item that:
- Cannot be linked to Inputs or domain-generic realities
- Introduces competitors, solutions, features, or differentiation
- Contains fabricated facts or specific claims

## Generation Rules
- Use clear, simple, non-technical language.
- Do NOT invent statistics, growth rates, named regulations, or technologies.
- Do NOT reference specific companies, platforms, or products.
- Do NOT imply solutions, UX ideas, or product strategies.
- All items must be general, defensible, and traceable.
- Every market trend, dynamic, and force must include a `confidence` field set to low | medium | high.
