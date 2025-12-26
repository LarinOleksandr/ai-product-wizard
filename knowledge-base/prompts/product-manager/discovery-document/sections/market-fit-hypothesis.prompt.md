## Objective
Produce a **Market Fit Hypothesis** that states clear, preliminary hypotheses about desirability and viability based on discovery insights.

The goal is to articulate **what is believed to be true and why**, not to prove market fit or define solutions.

## Workflow
1. Formulate desirability hypotheses:
   - Based on the **Opportunity Statement**, **User Pain Points**, and **Target Users & Segments**, state hypotheses about whether and why target users would want a solution addressing the opportunity.
   - Ground hypotheses in observable user behaviors or repeated patterns from discovery.
2. Formulate viability hypotheses:
   - Based on **Value Drivers**, **Market Landscape**, and **Competitor Analysis**, state hypotheses about whether the opportunity could sustain business value.
   - Keep viability framed at a high level (e.g., demand persistence, willingness to engage, strategic relevance).
3. Assess alignment:
   - Briefly explain how each hypothesis aligns with:
     - known user behavior patterns
     - market trends or competitive context
4. Identify risks and uncertainties:
   - For each hypothesis, identify key assumptions, risks, or unknowns that could invalidate it.
   - Keep risks explicit and factual, not speculative.

## Rules
- Do NOT assert market fit as fact; all statements must be framed as hypotheses.
- Do NOT introduce solutions, features, pricing, or implementation details.
- Do NOT invent data, metrics, or validation results.
- Use clear, plain language.
- Keep hypotheses concise and testable.
- Limit scope to desirability and viability only.

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
    "market_fit_hypothesis": {
        "desirability": [
            {
                "hypothesis": "Individuals managing multiple financial accounts will want clearer, lower-effort understanding of their overall financial situation.",
                "rationale": "Discovery shows repeated behaviors of manual review, delayed awareness, and confusion caused by scattered financial data.",
                "key_risks_or_unknowns": [
                    "Users may tolerate existing friction more than expected",
                    "Some users may prefer manual control over automated interpretation"
                ]
            },
            {
                "hypothesis": "Users who review finances periodically will value improved awareness between review moments.",
                "rationale": "Pain points indicate uncertainty and reduced confidence outside infrequent review cycles.",
                "key_risks_or_unknowns": [
                    "Users may not perceive interim awareness as meaningful",
                    "Behavioral habits around infrequent reviews may be difficult to change"
                ]
            }
        ],
        "viability": [
            {
                "hypothesis": "Demand for improved personal financial clarity will persist due to ongoing account fragmentation and data complexity.",
                "rationale": "The market landscape shows a fragmented space with recurring unmet needs around visibility and effort reduction.",
                "key_risks_or_unknowns": [
                    "Market may become crowded with similar offerings",
                    "User trust barriers could limit sustained engagement"
                ]
            },
            {
                "hypothesis": "Business value can be sustained through repeated engagement driven by ongoing relevance rather than one-time use.",
                "rationale": "Value drivers indicate alignment between continuous user awareness and retention-oriented business outcomes.",
                "key_risks_or_unknowns": [
                    "Users may only engage during specific financial events",
                    "Ongoing value perception may decline without visible change"
                ]
            }
        ]
    }
}