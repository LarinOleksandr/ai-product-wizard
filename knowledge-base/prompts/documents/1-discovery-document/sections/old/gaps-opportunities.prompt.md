## Task

Produce **Gaps & Opportunities** that identify meaningful gaps between user needs and existing **Competitor Capabilities**, and translate those gaps into potential functional, technical, and business opportunities.

The goal is to surface **validated opportunity spaces**, not to define solutions or product concepts.

## Example (how to use)

- Example shows structure and style only.
- Do not take example as the output.
- Do not use Example to define scope, domain, or number of elements.

### Example (for reference only; do NOT take as output)

{
"gaps_and_opportunities": {
"functional": [
{
"gap_description": "Existing tools require users to actively review and interpret financial data to understand their current situation.",
"affected_user_segments": [
"Segment 1",
"Segment 2"
],
"opportunity_description": "Enable clearer understanding of financial status with minimal active interpretation required from users.",
"user_value_potential": "high",
"feasibility": "medium"
},
{
"gap_description": "Spending patterns and changes are often visible only after users perform periodic reviews.",
"affected_user_segments": [
"Segment 1"
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
"Segment 1",
"Segment 2"
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
"Segment 2"
],
"opportunity_description": "Increase perceived ongoing value between review moments without demanding frequent user interaction.",
"user_value_potential": "medium",
"feasibility": "medium"
}
]
}
}

## Workflow (how to do)

1. For each category (functional, technical, business):
   a. Identify competitor capabilities relevant to the Target Users.
   b. Identify explicit user needs those capabilities do not fully satisfy.

2. For each identified mismatch, populate one item with:
   - gap_description: state the unmet or weakly served need as a capability shortfall.
   - affected_user_segments: list only segments directly impacted by this shortfall.
   - opportunity_description: restate the same shortfall as what could be enabled (no solutions).
   - user_value_potential: qualitative assessment (low | medium | high).
   - feasibility: qualitative assessment (low | medium | high).

3. Validate per item:
   - The gap is derived from a specific competitor capability or its absence.
   - The opportunity does not add scope beyond the gap.
   - The item fits exactly one category.

4. Remove overlaps and return the final JSON object.

## Rules

- Each gap must be derived from a specific **Competitor Capability** that is missing, limited, or inconsistent.
- Describe gaps only in terms of what users cannot do or cannot do reliably due to competitor capabilities.
- Phrase each gap as a contrast between user needs and what competitor capabilities enable or fail to enable.
- Do NOT invent unmet needs not supported by Inputs.
- Do NOT describe features, solutions, architectures, or UX concepts.
- Do NOT reference specific competitors by name in opportunity descriptions.
- Keep language high-level, neutral, and non-technical.
- Unlimited number of items; include all relevant, omit irrelevant.

## Output contract

- Generate the output **from scratch** using only the Inputs and domain-generic reasoning.
- Return **only** the JSON object for this section.
- Do not include schema text, explanations, or commentary.

## Anti-copy constraints (hard)

- Do not use any part of the Example in the output.
- Do not assume any domain, user behavior, or data type unless explicitly present in the Inputs.
