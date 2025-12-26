## Objective
Produce a structured **User Pain Points** section that identifies, groups, and qualitatively assesses user pain points strictly based on existing inputs.

## Workflow
1. Collect evidence of user frustrations and unmet needs:
   - Extract explicit or implied difficulties from the Problem Statement and Target Users & Segments.
   - Use only information available at this stage.
2. Identify individual pain points:
   - Describe each pain point in clear, simple language.
   - Avoid inferred emotions, motivations, or behaviors not supported by Inputs.
   - If evidence is weak, frame the pain point as a high-level assumption to be validated later.
3. Group pain points into themes:
   - Combine related pain points under plain-language themes.
   - Themes should help structure the problem space (e.g., “lack of visibility,” “inefficient process”).
4. Assess each pain point qualitatively:
   - Assign **severity**, **frequency**, and **business importance** as: low | medium | high.
   - Base assessments on relative impact implied by the Inputs only.
5. Validate the final list:
   - Each pain point must align with the Problem Statement.
   - Each pain point must clearly reference affected user groups.
   - No overlap with opportunity, solution, or market-level analysis.

## Rules
- Use plain, easy-to-understand language.
- Do NOT introduce solutions, features, benefits, or design ideas.
- Do NOT invent deep insights beyond what Inputs support.
- Pain points must be specific but appropriate for early discovery.
- Characteristics and assessments must remain qualitative.
- No technical jargon or complex terminology.
- Avoid duplication across themes.

## Output contract
- Return **only** the JSON object for this section.
- Do not include schema text or commentary.

## Section examples
- Examples show structure, tone, and specificity.
- Do not copy or paraphrase examples.
- Don not use examples to define scope or number of elements.

### Example 1
{
    "pain_point_themes": [
        {
            "theme_name": "Lack of financial visibility",
            "pain_points": [
                {
                    "name": "Unclear overall financial picture",
                    "description": "Users cannot easily see their full financial situation at a given moment because balances and transactions are spread across multiple accounts.",
                    "affected_user_groups": [
                        "Consumers with multiple bank and card accounts"
                    ],
                    "severity": "high",
                    "frequency": "high",
                    "business_importance": "high"
                },
                {
                    "name": "Delayed awareness of spending patterns",
                    "description": "Users only recognize spending trends after reviewing past statements rather than during ongoing financial activity.",
                    "affected_user_groups": [
                        "Consumers who periodically review spending"
                    ],
                    "severity": "medium",
                    "frequency": "medium",
                    "business_importance": "high"
                }
            ]
        },
        {
            "theme_name": "Manual effort to understand finances",
            "pain_points": [
                {
                    "name": "Time spent switching between financial sources",
                    "description": "Users must move between multiple apps or statements to understand their current financial status.",
                    "affected_user_groups": [
                        "Consumers with multiple bank and card accounts"
                    ],
                    "severity": "medium",
                    "frequency": "high",
                    "business_importance": "medium"
                },
                {
                    "name": "Effort required to interpret financial data",
                    "description": "Users need to manually review and interpret transaction data to understand where money is going.",
                    "affected_user_groups": [
                        "Consumers who periodically review spending"
                    ],
                    "severity": "medium",
                    "frequency": "medium",
                    "business_importance": "medium"
                }
            ]
        }
    ]
}

### Example 2
{
    "pain_point_themes": [
        {
            "theme_name": "Poor coordination of shared tasks",
            "pain_points": [
                {
                    "name": "Missed or delayed household tasks",
                    "description": "Household members fail to complete chores on time when responsibilities are remembered informally or schedules change.",
                    "affected_user_groups": [
                        "Household members sharing recurring chores"
                    ],
                    "severity": "high",
                    "frequency": "high",
                    "business_importance": "high"
                },
                {
                    "name": "Unclear task ownership",
                    "description": "Household members are unsure who is responsible for a task at a given moment, leading to duplication or inaction.",
                    "affected_user_groups": [
                        "Household members managing shared schedules"
                    ],
                    "severity": "medium",
                    "frequency": "medium",
                    "business_importance": "high"
                }
            ]
        },
        {
            "theme_name": "Inefficient communication around household work",
            "pain_points": [
                {
                    "name": "Reliance on messages and verbal reminders",
                    "description": "Household members depend on chats or verbal cues to coordinate tasks, which are easy to miss or forget.",
                    "affected_user_groups": [
                        "Household members managing shared schedules"
                    ],
                    "severity": "medium",
                    "frequency": "high",
                    "business_importance": "medium"
                },
                {
                    "name": "Lack of awareness when tasks are completed or skipped",
                    "description": "Household members do not have a consistent way to know when a task has been done or intentionally skipped.",
                    "affected_user_groups": [
                        "Household members sharing recurring chores"
                    ],
                    "severity": "medium",
                    "frequency": "medium",
                    "business_importance": "medium"
                }
            ]
        }
    ]
}

### Example 3
{
    "pain_point_themes": [
        {
            "theme_name": "Difficulty maintaining learning progress",
            "pain_points": [
                {
                    "name": "Interrupted learning due to limited time",
                    "description": "Users struggle to continue learning when lessons do not fit into short, available time windows.",
                    "affected_user_groups": [
                        "Adults consuming learning content in short sessions"
                    ],
                    "severity": "high",
                    "frequency": "high",
                    "business_importance": "high"
                },
                {
                    "name": "Abandoned learning sessions",
                    "description": "Users pause or stop learning when content requires longer focus than they can consistently provide.",
                    "affected_user_groups": [
                        "Adults consuming learning content in short sessions"
                    ],
                    "severity": "medium",
                    "frequency": "high",
                    "business_importance": "medium"
                }
            ]
        },
        {
            "theme_name": "Low transfer from learning to real use",
            "pain_points": [
                {
                    "name": "Difficulty applying learned content quickly",
                    "description": "Users find it hard to use what they learn soon after exposure because learning does not translate directly into action.",
                    "affected_user_groups": [
                        "Adults attempting to apply new skills shortly after learning"
                    ],
                    "severity": "high",
                    "frequency": "medium",
                    "business_importance": "high"
                },
                {
                    "name": "Loss of momentum after learning",
                    "description": "Users discontinue learning when they cannot see immediate use of newly learned material.",
                    "affected_user_groups": [
                        "Adults attempting to apply new skills shortly after learning"
                    ],
                    "severity": "medium",
                    "frequency": "medium",
                    "business_importance": "medium"
                }
            ]
        }
    ]
}

