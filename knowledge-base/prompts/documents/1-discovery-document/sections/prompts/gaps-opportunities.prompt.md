# Section prompt

## Task
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

## Generation Rules
- Base all gaps on explicit comparison with competitor capabilities or clearly stated absence.
- Do NOT invent unmet needs not supported by Inputs.
- Do NOT describe features, solutions, architectures, or UX concepts.
- Do NOT reference specific competitors by name in opportunity descriptions.
- Keep language high-level, neutral, and non-technical.
- Use qualitative assessments only; no numbers or forecasts.
- Unlimited number of items; include all relevant, omit irrelevant.
- Each gap item must use the exact keys: gap_description, affected_user_segments, opportunity_description, user_value_potential, feasibility.
- Populate affected_user_segments with the relevant target segment names when available in Inputs; do not leave it empty.
- Use only exact segment_name values from Target Users & Segments; no extra labels or paraphrases.
- The output must be an object with gaps_and_opportunities containing functional, technical, and business arrays.
