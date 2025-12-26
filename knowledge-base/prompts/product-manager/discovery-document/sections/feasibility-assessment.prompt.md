## Objective
Produce a **Feasibility Assessment** that identifies high-level constraints, risks, and readiness factors related to business, user, and technical feasibility.

The goal is to highlight **what could limit or enable progress**, not to design solutions or estimate effort.

## Workflow
1. Identify business feasibility constraints:
   - Based on **Context & Constraints**, **Market Landscape**, and **Value Drivers**, identify high-level constraints related to cost sensitivity, resource availability, organizational readiness, or timing.
2. Identify user feasibility constraints:
   - Based on **Target Users & Segments**, **User Pain Points**, and **Market Fit Hypothesis**, identify factors that could limit adoption, sustained usage, or behavior change.
3. Identify early technical feasibility concerns:
   - Based on **Context & Constraints** and **Competitor Capabilities**, identify high-level technical concerns or uncertainties.
   - Keep these generic (e.g., data availability, system complexity, reliability expectations).
4. Assess readiness:
   - For each constraint or concern, assess overall readiness as: low | medium | high.
   - Readiness reflects current clarity and confidence, not difficulty.

## Rules
- Keep all assessments high-level and qualitative.
- Do NOT introduce architectures, tools, or implementation approaches.
- Do NOT estimate costs, timelines, or staffing.
- Do NOT invent technical details or internal system knowledge.
- Use clear, simple, non-technical language.
- Focus on constraints and risks, not opportunities.

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
    "feasibility_assessment": {
        "business_constraints": [
            {
                "name": "Trust-dependent adoption",
                "description": "Handling sensitive financial information requires a strong baseline of user trust, which can slow early adoption and growth.",
                "readiness": "medium"
            },
            {
                "name": "Sustaining perceived ongoing value",
                "description": "Business viability depends on users perceiving continuous relevance rather than episodic usefulness.",
                "readiness": "medium"
            }
        ],
        "user_constraints": [
            {
                "name": "Resistance to changing financial habits",
                "description": "Users may continue existing review routines even if they are inefficient or fragmented.",
                "readiness": "low"
            },
            {
                "name": "Sensitivity to data sharing",
                "description": "Some users may avoid engagement due to discomfort connecting personal financial accounts.",
                "readiness": "medium"
            }
        ],
        "technical_concerns": [
            {
                "name": "Data completeness and consistency",
                "description": "Financial information from multiple sources may be delayed, missing, or inconsistent, affecting reliability.",
                "readiness": "low"
            },
            {
                "name": "Reliability expectations",
                "description": "Users expect high accuracy and availability when reviewing financial information.",
                "readiness": "medium"
            }
        ]
    }
}