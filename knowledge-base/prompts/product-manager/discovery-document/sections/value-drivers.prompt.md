## Objective
Produce **Value Drivers** that describe the primary sources of user value and business value emerging from discovery, and how they reinforce each other.

The goal is to clarify **why the opportunity matters** for users and the business, not to define solutions or metrics.

## Workflow
1. Identify potential sources of user value:
   - Review the **Opportunity Statement**, **User Pain Points**, and **Target Users & Segments**.
   - Identify ways in which addressing the opportunity could reduce friction, improve outcomes, or enable progress for users.
2. Identify potential sources of business value:
   - Identify high-level business value levers such as engagement, retention, reach, operational efficiency, or strategic positioning.
   - Use only generic, widely applicable business value concepts.
3. Map value drivers:
   - For each value driver, clearly link:
     - the primary user need or pain it addresses
     - the corresponding business value lever it supports
4. Assess impact qualitatively:
   - For each value driver, assess:
     - user value impact (low | medium | high)
     - business value impact (low | medium | high)
   - Base assessments on relative importance implied by the Inputs.
5. Prioritize value drivers:
   - Rank value drivers from most to least important based on combined user and business impact.
   - Resolve ties using qualitative judgment; do not use numeric scoring.

## Rules
- Do NOT introduce features, solutions, or design ideas.
- Do NOT invent metrics, revenue models, or financial estimates.
- Keep all value descriptions high-level and non-technical.
- Use neutral, declarative language.
- Value drivers must be grounded in prior discovery outputs.
- Unlimited number of value drivers; include all relevant, omit irrelevant.

## Anti-copy constraints (hard)
- Generate the output **from scratch** using only the Inputs and synthesized insights.
- The output is **invalid** if it contains **any sequence of 6+ consecutive tokens** appearing anywhere in example sections.
- Do not reuse example phrasing, sentence structures, or labels.
- If repetition is detected, rewrite using different wording.

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
    "value_drivers": [
        {
            "name": "Reduced cognitive effort in financial understanding",
            "user_need_or_pain": "Users struggle to mentally combine scattered financial information and interpret it accurately.",
            "user_value_impact": "high",
            "business_value_lever": "Sustained engagement through perceived ease and clarity",
            "business_value_impact": "high",
            "priority": "high"
        },
        {
            "name": "Continuous sense of financial awareness",
            "user_need_or_pain": "Users lack confidence in their financial status between infrequent review moments.",
            "user_value_impact": "high",
            "business_value_lever": "Retention driven by ongoing relevance",
            "business_value_impact": "high",
            "priority": "high"
        },
        {
            "name": "Improved trust in financial information",
            "user_need_or_pain": "Users are uncertain whether available financial data is complete or reliable.",
            "user_value_impact": "high",
            "business_value_lever": "Lower adoption friction and stronger long-term relationships",
            "business_value_impact": "medium",
            "priority": "high"
        },
        {
            "name": "Lower time investment for routine financial checks",
            "user_need_or_pain": "Users spend unnecessary time switching between sources to review finances.",
            "user_value_impact": "medium",
            "business_value_lever": "Increased frequency of lightweight usage",
            "business_value_impact": "medium",
            "priority": "medium"
        },
        {
            "name": "Clear perception of ongoing value",
            "user_need_or_pain": "Users perceive limited benefit outside of periodic financial reviews.",
            "user_value_impact": "medium",
            "business_value_lever": "Stronger justification for continued use",
            "business_value_impact": "medium",
            "priority": "medium"
        }
    ]
}