## Objective
Produce **Competitor Capabilities** for a Competitor Capabilities section that describes functional, technical, and business capabilities of relevant competitors, based on external research and verifiable public information.

The goal is to understand capability patterns and industry norms, not to benchmark performance or define differentiation.

## Workflow
1. Analyze core functional capabilities:
   - Identify the main functions and feature groups competitors provide.
   - Focus on what problems they enable users to address.
2. Analyze technical capabilities:
   - Identify visible technical characteristics such as platform type, delivery model, integrations, or scalability indicators.
   - Use only information that can be reasonably inferred from public sources.
3. Analyze business capabilities:
   - Identify business-side capabilities such as monetization approach, distribution channels, ecosystem participation, or partnership models.
4. Assess strengths and weaknesses:
   - Describe high-level strengths and limitations implied by the capabilities.
   - Avoid judgments; focus on observable scope and gaps.
5. Compare capabilities to user needs:
   - Relate identified capabilities to user needs and pain points at a general level.
   - Do not claim unmet needs unless clearly implied.
6. Identify competitive patterns and industry standards:
   - Extract recurring capability patterns across competitors.
   - Identify commonly expected capabilities that appear to form an industry baseline.

## Rules
- Actively use external tools and web search to gather information.
- Use only publicly available, verifiable information.
- Do NOT propose solutions or product strategies.
- Keep all descriptions high-level, neutral, and factual.
- Use clear, simple, non-technical language.
- Capabilities must be grounded in observable product or company behavior.

## Anti-copy constraints (hard)
- Generate the output **from scratch** using only the Inputs and domain-generic reasoning.
- The output is **invalid** if it contains **any sequence of 6+ consecutive tokens** appearing anywhere in the example section.
- Do not reuse any example field values, sentence structures, or named capability labels.
- If you detect you are reproducing any example-like phrasing, rewrite using different wording.
- Do not extract product idea from examples.

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
    "competitor_capabilities": [
        {
            "competitor_name": "Monarch Money",
            "functional_capabilities": [
                "Account aggregation across banks and cards",
                "Transaction categorization and review",
                "Budget creation and monitoring",
                "Net worth tracking over time",
                "Financial summaries and reports"
            ],
            "technical_capabilities": [
                "Web and mobile application access",
                "Secure connections to financial institutions",
                "Cloud-based data synchronization across devices"
            ],
            "business_capabilities": [
                "Direct-to-consumer subscription model",
                "Digital distribution through app stores and website",
                "Ongoing product updates and feature expansion"
            ],
            "strengths": [
                "Comprehensive view of personal finances in one place",
                "Consistent cross-device experience"
            ],
            "limitations": [
                "Relies on availability and accuracy of connected account data",
                "Requires ongoing user trust in data handling"
            ],
            "alignment_with_user_needs": "Closely aligned with the need for centralized financial visibility and reduced manual effort when reviewing personal finances."
        },
        {
            "competitor_name": "Rocket Money",
            "functional_capabilities": [
                "Spending and transaction tracking",
                "Recurring expense and subscription monitoring",
                "Bill review and alerts"
            ],
            "technical_capabilities": [
                "Mobile-first application",
                "Linked financial account access",
                "Automated detection of recurring charges"
            ],
            "business_capabilities": [
                "Consumer subscription and service-based monetization",
                "Partnership-based integrations with financial services"
            ],
            "strengths": [
                "Strong focus on recurring expenses and cost awareness",
                "Low-effort setup for basic financial oversight"
            ],
            "limitations": [
                "Less emphasis on holistic long-term financial views",
                "Some insights depend on automated detection accuracy"
            ],
            "alignment_with_user_needs": "Addresses the need to understand ongoing spending but provides a narrower picture of overall financial status."
        },
        {
            "competitor_name": "Copilot Money",
            "functional_capabilities": [
                "Spending organization and categorization",
                "Budget planning and tracking",
                "Financial trend visualization"
            ],
            "technical_capabilities": [
                "Native mobile applications",
                "Automated data syncing from linked accounts",
                "User-controlled data categorization"
            ],
            "business_capabilities": [
                "Subscription-based access",
                "Consumer-focused product positioning"
            ],
            "strengths": [
                "Clear and structured presentation of spending data",
                "Strong emphasis on visual clarity"
            ],
            "limitations": [
                "Primarily mobile-focused, limited desktop emphasis",
                "Dependent on user engagement for ongoing accuracy"
            ],
            "alignment_with_user_needs": "Supports users seeking clearer understanding of spending patterns but still requires active review behavior."
        },
        {
            "competitor_name": "YNAB",
            "functional_capabilities": [
                "Active budgeting framework",
                "Manual and automated transaction entry",
                "Spending planning and adjustment"
            ],
            "technical_capabilities": [
                "Web and mobile applications",
                "Optional bank connection integrations",
                "Cross-platform synchronization"
            ],
            "business_capabilities": [
                "Subscription-based monetization",
                "Education-driven content and community presence"
            ],
            "strengths": [
                "Strong structure for users willing to manage budgets actively",
                "Clear rules guiding spending decisions"
            ],
            "limitations": [
                "Requires sustained user effort and learning",
                "Less suitable for passive financial monitoring"
            ],
            "alignment_with_user_needs": "Partially aligned, as it helps users gain control but increases effort compared to passive visibility needs."
        }
    ],
    "industry_capability_patterns": [
        {
            "pattern_name": "Centralized account aggregation",
            "description": "Most competitors provide a single place to view data from multiple financial accounts to reduce fragmentation."
        },
        {
            "pattern_name": "Automated transaction organization",
            "description": "Automatic categorization and grouping of transactions is a common baseline capability to lower manual review effort."
        },
        {
            "pattern_name": "Subscription-based consumer access",
            "description": "Recurring subscription models are widely used to support ongoing access and product maintenance."
        },
        {
            "pattern_name": "Trust-dependent adoption",
            "description": "All competitors rely on user confidence in data security and accuracy as a prerequisite for sustained use."
        }
    ]
}