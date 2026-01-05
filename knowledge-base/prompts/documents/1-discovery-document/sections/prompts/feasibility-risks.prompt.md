# Section prompt

## Task

Produce **Feasibility Risks** grouped by **risk type**, with each risk type containing a list of risks.

Each risk item must include:
- feasibility_risk
- why_it_matters

The goal is to flag **where progress could break down**, not to assess effort, design solutions, or make go / no-go decisions.

---

## Workflow

1. Identify business feasibility risks:
   - Based on **Contextual Factors**, **Constraints**, **Market Landscape**, and **Value Drivers**, identify risks related to incentives, timing, organizational alignment, or sustainability.
   - Focus only on risks that could materially block progress.

2. Identify user feasibility risks:
   - Based on **User Segments**, **User Pain Points**, and **Opportunities**, identify risks that could prevent adoption, trust, or sustained use.
   - Include behavioral, perceptual, or habit-related risks.

3. Identify technical feasibility risks:
   - Based on **Constraints**, **Contextual Factors**, and **Competitor Capabilities**, identify unknowns or dependencies that could block execution.
   - Keep risks generic (e.g. data availability, reliability expectations, integration dependencies).

4. Consolidate and filter:
   - Remove minor or speculative risks.
   - Keep only risks that could realistically invalidate or delay progress.

---

## Generation Rules

- Frame all items as **risks or uncertainties**, not assessments or conclusions.
- Keep **feasibility_risk** concise; move important detail into **why_it_matters**.
- Do NOT introduce solutions, architectures, tools, or mitigation plans.
- Do NOT estimate effort, cost, or timelines.
- Do NOT assume internal capabilities beyond what is explicitly stated.
- Use clear, neutral, non-technical language.
- Prefer omission over weak or generic risks.
