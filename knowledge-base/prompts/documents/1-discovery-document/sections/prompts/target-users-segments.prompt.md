# Section prompt

## Task
Produce high-quality **Target Users & Segments** non-overlapping and grounded strictly in the inputs.

## Workflow
1. List all distinct user groups who currently experience the problem from **Problem Statement:** or are directly affected by it.
2. For each user group, describe:
   - Context of use (where/when the problem occurs)
   - At least two observable behaviors related to the problem
3. Cluster user groups into target segments based on shared **underlying needs and contexts**. **If two groups differ only by wording or intent, they must be merged or discarded.**
4. For each target segment, explain its business relevance to the product.

## Generation Rules
- User groups must be derived directly from the Inputs and the Problem Statement.
- Do NOT restate the same user group using different wording.
- Segmentation must be user-need-driven, not feature- or solution-driven.
- No invented personas, market sizes, or demographics unless explicitly provided in Inputs.
- Each target segment must contain at least one clearly distinct user group.
- Characteristics must be observable or verifiable behaviors, not motivations alone.
- Do NOT describe solutions, features, or benefits.
- If two groups differ only linguistically, merge or discard them.
- Outputs containing synonym-based user groups without distinct behaviors must be rejected and regenerated.
- Use industry-standard product and UX terminology only.