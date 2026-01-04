## Objective

Produce high-quality **User Segments** non-overlapping and grounded strictly in the inputs.

## Workflow

1. List distinct user segments who currently experience the problem from **Problem Statement:** or are directly affected by it.
2. For each segment, define usage context as the conditions under which a user encounters the problem.
3. Assign a segment_type:
   - Exactly one segment must be `primary`.
   - All others must be `secondary`.
   - The primary segment must appear first in the list.
4. Confirm each segment is distinct based on its usage context.
5. For each segment define 3-7 **Characteristics** as observable behaviors that are directly related to the problem.

## Rules

- Characteristics must be derived directly from the Inputs and the Problem Statement.
- Do NOT restate the same segment using different wording.
- Segmentation must be user-need-driven, not feature- or solution-driven.
- No invented personas, market sizes, or demographics unless explicitly provided in Inputs.
- Each segment must include characteristics that are observable behaviors.
- Characteristics must be observable or verifiable behaviors, not motivations alone.
- Do NOT describe solutions, features, or benefits.
- If two segments differ only linguistically, merge or discard them.
- Outputs containing synonym-based segments without distinct behaviors must be rejected and regenerated.
- Use industry-standard product and UX terminology only.

## Output contract

- Return **only** the JSON object for this section.
- Do not include schema text, explanations, or commentary.
- Do not copy example content.

## Anti-copy constraints (hard)

- Generate the output **from scratch** using only the Inputs and domain-generic reasoning.
- Do not reuse any example field values, sentence structures, or named capability labels.
- If you detect you are reproducing any example-like phrasing, rewrite using different wording.
