# Section prompt

## Task

Produce a structured **User Pain Points** section focused on a single primary user segment, grounded strictly in the inputs.

## Workflow

1. Identify the segment which is primary from User Segments and take this **Segment name** as a `user_segment` for output.
2. List pain points for this segment only:
   - Pain point appears in the Usage Context.
   - Each pain point is a specific, observable friction.
   - For each pain point, write the Description including:
     Triggering situation (when / where it happens)
     User goal at that moment
     Breakdown or friction (what goes wrong)
     Immediate consequence (emotion or cost)
     Why existing solutions fail
     It should be in 3–5 concrete sentences. Avoid abstract words (e.g. “struggle”, “difficulty”, “frustration”) unless tied to a specific situation.
     Do not propose solutions.
3. Rate each pain point:
   - **severity** and **frequency** as: low | medium | high.
4. Rank pain points:
   - Order by severity (high → low), then by frequency (high → low).
5. Validate:
   - Each item aligns with the Problem Statement.
   - No solutions, product features or product names.

## Generation Rules

- Output only one user segment (the primary one) to keep scope clear.
- Use plain language and observable behaviors.
- Dont refer to the pain points which users have with the current solution
- Do NOT invent unsupported behaviors or data.
- Avoid duplication across pain points.
