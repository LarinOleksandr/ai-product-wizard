## Objective
Produce **Gaps & Opportunities** that identify meaningful gaps between user needs and existing competitor capabilities, and translate those gaps into potential functional, technical, and business opportunities.

The goal is to surface **validated opportunity spaces**, not to define solutions or product concepts.

## Workflow
1. Identify unmet or weakly served user needs:
   - Compare **User Pain Points** and **Target Users & Segments** against **Competitor Capabilities**.
   - Identify where user needs are not addressed, partially addressed, or inconsistently addressed.
2. Identify capability gaps:
   - Classify gaps as:
     - functional (what users cannot do or do easily)
     - technical (constraints or limitations implied by current approaches)
     - business (access, reach, incentives, adoption, or sustainability limitations)
3. Translate gaps into opportunity areas:
   - For each gap, describe a corresponding opportunity area in neutral, non-solution language.
   - Focus on *what could be enabled*, not *how*.
4. Evaluate opportunity attractiveness:
   - For each opportunity, assess:
     - potential user value (low | medium | high)
     - feasibility at a high level (low | medium | high)
   - Use qualitative judgment grounded in Inputs and domain-generic realities only.
5. Validate and consolidate:
   - Remove overlaps and merge similar gaps or opportunities.
   - Ensure each item aligns with the Problem Statement and Target Users.
   - Exclude speculative or weakly supported items.

## Rules
- Base all gaps on explicit comparison with competitor capabilities or clearly stated absence.
- Do NOT invent unmet needs not supported by Inputs.
- Do NOT describe features, solutions, architectures, or UX concepts.
- Do NOT reference specific competitors by name in opportunity descriptions.
- Keep language high-level, neutral, and non-technical.
- Use qualitative assessments only; no numbers or forecasts.
- Unlimited number of items; include all relevant, omit irrelevant.

## Anti-copy constraints (hard)
- Generate the output **from scratch** using only the Inputs and domain-generic reasoning.
- The output is **invalid** if it contains **any sequence of 6+ consecutive tokens** appearing anywhere in the example section.
- Do not reuse any example field values, sentence structures, or named capability labels.
- If you detect you are reproducing any example-like phrasing, rewrite using different wording.
- Do not extract product idea from examples.

## Output contract
- Return **only** the JSON object for this section.
- Do not include schema text, explanations, or commentary.

## Section examples
- Examples show structure, tone, and specificity.
- Do not copy or paraphrase examples.
- Do not use examples to define scope or number of elements.
- Do not use examples to define product idea.

### Example 1
{
  "gaps_and_opportunities": {
    "functional": [
      {
        "gap_description": "Existing tools require users to actively review and interpret financial data to understand their current situation.",
        "affected_user_segments": [
          "Individuals tracking personal finances across accounts",
          "Consumers who periodically review spending"
        ],
        "opportunity_description": "Enable clearer understanding of financial status with minimal active interpretation required from users.",
        "user_value_potential": "high",
        "feasibility": "medium"
      },
      {
        "gap_description": "Spending patterns and changes are often visible only after users perform periodic reviews.",
        "affected_user_segments": [
          "Consumers who periodically review spending"
        ],
        "opportunity_description": "Support earlier awareness of meaningful changes in spending behavior without increasing review effort.",
        "user_value_potential": "high",
        "feasibility": "medium"
      }
    ],
    "technical": [
      {
        "gap_description": "Reliance on multiple external data sources leads to gaps, delays, or inconsistencies in financial information.",
        "affected_user_segments": [
          "Individuals tracking personal finances across accounts"
        ],
        "opportunity_description": "Reduce the impact of incomplete or delayed data on users’ ability to trust their financial overview.",
        "user_value_potential": "medium",
        "feasibility": "low"
      }
    ],
    "business": [
      {
        "gap_description": "Trust concerns remain a barrier when users are asked to connect sensitive financial accounts.",
        "affected_user_segments": [
          "Individuals tracking personal finances across accounts"
        ],
        "opportunity_description": "Strengthen user confidence and willingness to engage despite high sensitivity of financial data.",
        "user_value_potential": "high",
        "feasibility": "medium"
      },
      {
        "gap_description": "Many solutions deliver value mainly during infrequent review moments rather than continuously.",
        "affected_user_segments": [
          "Consumers who periodically review spending"
        ],
        "opportunity_description": "Increase perceived ongoing value between review moments without demanding frequent user interaction.",
        "user_value_potential": "medium",
        "feasibility": "medium"
      }
    ]
  }
}