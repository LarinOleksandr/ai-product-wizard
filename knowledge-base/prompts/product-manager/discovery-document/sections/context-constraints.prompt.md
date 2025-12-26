## Objective
Produce a **Context & Constraints** section that identifies contextual factors and constraints influencing the problem space, using only available inputs and broadly accepted domain realities.

## Workflow
1. Identify contextual factors:
   - Extract all explicit contextual factors from the Inputs.
   - Add additional **domain-generic** factors commonly applicable to similar problem spaces (e.g., privacy expectations, operational environments, behavioral norms).
   - Do not introduce named standards, specific technologies, exact numbers, or factual claims that require verification.
2. Identify constraints:
   - Extract explicit constraints from the Inputs.
   - Add high-level, commonly applicable constraints (e.g., regulatory sensitivity, data availability, organizational limitations).
   - Include all relevant items; if none apply, return an empty list.
3. Analyze impact on user needs:
   - For each factor or constraint, describe how it may influence what users expect, require, or find difficult.
   - Keep descriptions intuitive and high-level.
4. Determine business implications:
   - For each factor or constraint, describe potential business impact (risk, cost, effort, limitation, or opportunity).
   - Keep implications broad and reasonable; no speculative detail.

## Rules
- Use clear, simple, non-technical language.
- Draw only from Inputs and generally known domain realities.
- Do NOT invent specific regulations, technologies, metrics, or systems unless explicitly provided.
- Do NOT introduce solutions, features, UX ideas, or architectural concepts.
- Avoid deep psychological or behavioral assumptions.
- Unlimited number of items; include all relevant, omit irrelevant.

## Output contract
- Return **only** the JSON object for this section.
- Do not include schema text or commentary.

## Section examples
- Examples show structure, tone, and specificity.
- Do not copy or paraphrase examples.
- Don not use examples to define scope or number of elements.

### Example 1
{
    "contextual_factors": [
        {
            "name": "Fragmented personal finance environment",
            "description": "Personal financial information is distributed across multiple banks, cards, and financial products.",
            "impact_on_user_needs": "Users need to mentally combine information from different sources to understand their overall financial situation.",
            "business_implications": "Operating with fragmented data increases complexity, risk, and trust requirements."
        },
        {
            "name": "Routine but infrequent financial review behavior",
            "description": "Users tend to review their finances periodically rather than continuously.",
            "impact_on_user_needs": "Users expect clear summaries without frequent attention or effort.",
            "business_implications": "Value delivery depends on limited engagement moments."
        },
        {
            "name": "High sensitivity of financial information",
            "description": "Financial data is considered private and sensitive by users.",
            "impact_on_user_needs": "Users require trust and control over data handling.",
            "business_implications": "Trust concerns can slow adoption and increase compliance effort."
        }
    ],
    "constraints": [
        {
            "name": "Data access limitations",
            "description": "Not all financial information may be consistently available or current.",
            "impact_on_user_needs": "Users may experience gaps or delays that reduce confidence.",
            "business_implications": "Incomplete data limits perceived reliability."
        },
        {
            "name": "Regulatory and compliance sensitivity",
            "description": "Handling financial data involves regulatory considerations.",
            "impact_on_user_needs": "Users expect responsible data handling.",
            "business_implications": "Compliance adds operational overhead and limits flexibility."
        }
    ]
}

### Example 2
{
    "contextual_factors": [
        {
            "name": "Shared household responsibility environment",
            "description": "Household tasks are distributed across people with different routines.",
            "impact_on_user_needs": "Users need clarity on responsibilities without constant coordination.",
            "business_implications": "Multi-user misalignment directly affects perceived value."
        },
        {
            "name": "Informal task management norms",
            "description": "Household work is often managed through memory or casual communication.",
            "impact_on_user_needs": "Users expect coordination to fit existing habits.",
            "business_implications": "Adoption depends on alignment with current behavior."
        },
        {
            "name": "Changing daily schedules",
            "description": "Household routines frequently change due to daily life events.",
            "impact_on_user_needs": "Users require flexibility around task timing.",
            "business_implications": "Rigid systems increase disengagement risk."
        }
    ],
    "constraints": [
        {
            "name": "Dependence on multiple participants",
            "description": "Effective coordination requires engagement from more than one person.",
            "impact_on_user_needs": "Value decreases when participation is uneven.",
            "business_implications": "Partial adoption reduces usefulness."
        },
        {
            "name": "Notification fatigue risk",
            "description": "Frequent reminders can become easy to ignore.",
            "impact_on_user_needs": "Users disengage if coordination creates noise.",
            "business_implications": "Over-communication increases churn risk."
        }
    ]
}

### Example 3
{
    "contextual_factors": [
        {
            "name": "Learning in short time windows",
            "description": "Users learn during brief breaks between activities.",
            "impact_on_user_needs": "Users expect learning to fit into limited time.",
            "business_implications": "Value must be delivered quickly."
        },
        {
            "name": "Self-directed learning environment",
            "description": "Users manage learning without external structure.",
            "impact_on_user_needs": "Users need clarity and momentum without oversight.",
            "business_implications": "Drop-off risk is high without visible progress."
        },
        {
            "name": "Expectation of immediate relevance",
            "description": "Users want to apply skills soon after learning.",
            "impact_on_user_needs": "Users expect clear connection to real situations.",
            "business_implications": "Unclear relevance reduces retention."
        }
    ],
    "constraints": [
        {
            "name": "Limited sustained attention",
            "description": "Users cannot dedicate long uninterrupted periods.",
            "impact_on_user_needs": "Users struggle with extended learning sessions.",
            "business_implications": "Long-form engagement reduces completion."
        },
        {
            "name": "Content credibility dependency",
            "description": "Perceived value depends on content quality.",
            "impact_on_user_needs": "Users disengage if content feels impractical.",
            "business_implications": "Ongoing effort is required to maintain quality."
        }
    ]
}
