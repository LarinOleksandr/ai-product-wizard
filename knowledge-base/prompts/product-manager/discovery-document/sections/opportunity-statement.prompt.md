## Objective
Produce an **Opportunity Statement** that clearly articulates the core opportunity emerging from discovery by synthesizing insights from the problem, users, and competitive landscape.

The goal is to define **what opportunity exists and why**, not how it should be addressed.

## Workflow
1. Synthesize key discovery findings:
   - Review the **Problem Statement**, **Target Users & Segments**, **User Pain Points**, and **Gaps & Opportunities**.
   - Identify recurring patterns, tensions, or unmet needs that appear across multiple inputs.
2. Identify the core opportunity:
   - Determine the single most meaningful opportunity that emerges from the synthesis.
   - Focus on the intersection of:
     - significant user need
     - insufficiently addressed competitor capabilities
     - plausible business relevance
3. Articulate the opportunity:
   - Describe the opportunity in clear, plain language.
   - Explain *what could be enabled or improved* if the opportunity were addressed.
   - Keep the framing problem- and value-oriented, not solution-oriented.
4. Validate alignment:
   - Ensure the opportunity directly relates to the original Problem Statement.
   - Ensure it is relevant to at least one defined target segment.
   - Exclude secondary or derivative opportunities.

## Rules
- Do NOT describe solutions, features, products, or implementation approaches.
- Do NOT introduce new assumptions not supported by prior sections.
- Do NOT reference specific competitors by name.
- Use neutral, declarative language.
- Keep the statement concise and focused on a single opportunity.
- Avoid market sizing, forecasts, or prioritization language.

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
"opportunity_statement": "There is an opportunity to improve how individuals understand their personal financial situation by reducing the effort required to make sense of scattered and changing financial information. Many users experience limited clarity between periodic reviews, while existing approaches depend on active interpretation and trust in incomplete data. Addressing this gap could enable more consistent awareness and confidence in everyday financial understanding for people managing multiple accounts."
}