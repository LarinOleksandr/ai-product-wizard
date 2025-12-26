## Objective
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

## Rules
- Use clear, simple, non-technical language.
- Do NOT invent statistics, growth rates, named regulations, or technologies.
- Do NOT reference specific companies, platforms, or products.
- Do NOT imply solutions, UX ideas, or product strategies.
- All items must be general, defensible, and traceable.

## Anti-copy constraints (hard)
- Generate the output **from scratch** using only the Inputs and domain-generic reasoning.
- The output is **invalid** if it contains **any sequence of 6+ consecutive tokens** appearing anywhere in the example section.
- Do not reuse any example field values, sentence structures, or named segment labels.
- If you detect you are reproducing any example-like phrasing, rewrite using different wording.

## Output contract
- Return **only** the JSON object for this section.
- Do not include schema text or commentary.

## Section examples
- Examples show structure, tone, and specificity.
- Do not copy or paraphrase examples.
- Never reuse any sentence from examples.
- Don not use examples to define scope or number of elements.

### Example 1
{
    "market_definition": {
        "description": "The market covers digital tools that help individuals understand and monitor their personal financial situation by aggregating and presenting everyday financial information to reduce confusion and manual effort.",
        "excluded_adjacent_spaces": [
            "Professional financial advisory services",
            "Enterprise financial management",
            "Investment trading platforms"
        ]
    },
    "market_size": {
        "description": "Broad and fragmented, as many individuals face similar financial visibility issues but use varied and inconsistent approaches to address them."
    },
    "market_maturity": {
        "classification": "fragmented",
        "rationale": "Persistent unmet needs, manual effort, and trust concerns indicate no dominant or fully satisfying approach."
    },
    "market_trends": [
        {
            "name": "Growing expectation of financial clarity",
            "description": "Users increasingly expect to understand their finances without manual reconciliation.",
            "time_horizon": "mid",
            "affected_target_segments": [
                "Individuals tracking personal finances across accounts"
            ],
            "basis": "evidence_from_inputs",
            "confidence": "medium"
        },
        {
            "name": "Heightened sensitivity to personal data handling",
            "description": "Users are more cautious about how financial information is accessed and used.",
            "time_horizon": "long",
            "affected_target_segments": [
                "Individuals tracking personal finances across accounts"
            ],
            "basis": "domain_generic_assumption",
            "confidence": "medium"
        }
    ],
    "market_dynamics": [
        {
            "name": "Intermittent engagement patterns",
            "description": "Users engage periodically, often during specific review moments.",
            "affected_target_segments": [
                "Consumers who periodically review spending"
            ],
            "basis": "evidence_from_inputs",
            "confidence": "high"
        }
    ],
    "market_forces": [
        {
            "name": "Trust as a prerequisite",
            "description": "Users hesitate to engage without confidence in data handling and accuracy.",
            "affected_target_segments": [
                "Individuals tracking personal finances across accounts"
            ],
            "basis": "evidence_from_inputs",
            "confidence": "high"
        },
        {
            "name": "Low switching tolerance",
            "description": "Users resist changing habits unless effort clearly pays off.",
            "affected_target_segments": [
                "Consumers with multiple bank and card accounts"
            ],
            "basis": "domain_generic_assumption",
            "confidence": "medium"
        }
    ],
    "adoption_drivers": [
        {
            "name": "Desire to reduce mental effort",
            "description": "Users want to spend less time understanding finances.",
            "affected_target_segments": [
                "Individuals tracking personal finances across accounts"
            ]
        }
    ],
    "adoption_barriers": [
        {
            "name": "Data completeness concerns",
            "description": "Users doubt accuracy when not all information is visible.",
            "affected_target_segments": [
                "Consumers with multiple bank and card accounts"
            ]
        },
        {
            "name": "Privacy concerns",
            "description": "Reluctance to share sensitive financial data slows adoption.",
            "affected_target_segments": [
                "Individuals tracking personal finances across accounts"
            ]
        }
    ]
}
