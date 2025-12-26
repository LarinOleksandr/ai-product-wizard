## Objective
Produce high-quality **Target Users & Segments** non-overlapping and grounded strictly in the inputs.

## Workflow
1. List all distinct user groups who currently experience the problem from **Problem Statement:** or are directly affected by it.
2. For each user group, describe:
   - Context of use (where/when the problem occurs)
   - At least two observable behaviors related to the problem
3. Cluster user groups into target segments based on shared **underlying needs and contexts**. **If two groups differ only by wording or intent, they must be merged or discarded.**
4. For each target segment, explain its business relevance to the product.

## Rules
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

## Output contract
- Return **only** the JSON object for this section.
- Do not include schema text or commentary.

## Section examples
- Examples show structure, tone, and specificity.
- Do not copy or paraphrase examples.
- Don not use examples to define scope or number of elements.

### Example 1
{
    "target_segments": [
        {
            "segment_name": "Individuals tracking personal finances across accounts",
            "business_relevance": "This segment directly experiences the core problem of fragmented financial visibility and represents the primary scope for understanding everyday financial tracking behaviors.",
            "user_groups": [
                {
                    "name": "Consumers with multiple bank and card accounts",
                    "characteristics": [
                        "Review balances and transactions across more than one financial institution",
                        "Manually switch between apps or statements to understand overall financial status"
                    ]
                },
                {
                    "name": "Consumers who periodically review spending",
                    "characteristics": [
                        "Check transaction history weekly or monthly rather than continuously",
                        "Notice spending patterns only after reviewing past statements"
                    ]
                }
            ]
        }
    ]
}

### Example 2
{
    "target_segments": [
        {
            "segment_name": "Household members coordinating shared responsibilities",
            "business_relevance": "This segment represents the core coordination problem where breakdowns in shared task management create ongoing friction and inefficiency.",
            "user_groups": [
                {
                    "name": "Household members sharing recurring chores",
                    "characteristics": [
                        "Rely on informal agreements or memory to manage recurring tasks",
                        "Miss or delay chores when schedules change"
                    ]
                },
                {
                    "name": "Household members managing shared schedules",
                    "characteristics": [
                        "Coordinate tasks through messages or verbal reminders",
                        "Experience misalignment when one person completes or skips a task"
                    ]
                }
            ]
        }
    ]
}

### Example 3
{
    "target_segments": [
        {
            "segment_name": "Adults engaging in self-directed skill learning with limited time",
            "business_relevance": "This segment directly reflects the problem of inconsistent progress and low application of learning due to time constraints and content structure.",
            "user_groups": [
                {
                    "name": "Adults consuming learning content in short sessions",
                    "characteristics": [
                        "Access learning materials in brief time windows between other activities",
                        "Pause or abandon lessons when sessions exceed available time"
                    ]
                },
                {
                    "name": "Adults attempting to apply new skills shortly after learning",
                    "characteristics": [
                        "Try to use newly learned concepts in real situations soon after exposure",
                        "Discontinue learning when content does not translate into immediate action"
                    ]
                }
            ]
        }
    ]
}
