# Section prompt

## Task
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

## Generation Rules
- Use clear, simple, non-technical language.
- Draw only from Inputs and generally known domain realities.
- Do NOT invent specific regulations, technologies, metrics, or systems unless explicitly provided.
- Do NOT introduce solutions, features, UX ideas, or architectural concepts.
- Avoid deep psychological or behavioral assumptions.
- Unlimited number of items; include all relevant, omit irrelevant.