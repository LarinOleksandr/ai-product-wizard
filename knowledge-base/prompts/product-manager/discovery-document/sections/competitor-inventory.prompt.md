## Objective
Produce a **Competitor Inventory** section that identifies and organizes direct, indirect, and substitute competitors relevant to the problem space, using external research and verifiable public information.

The goal is comprehensive coverage and clear categorization, not competitive evaluation or differentiation.

## Workflow
1. Identify direct competitors:
   - Find companies or products that address the same core problem for similar target users.
   - Use external sources (official websites, product pages, reputable articles).
2. Identify indirect competitors:
   - Identify solutions that address the same user needs through different approaches or categories.
   - Include adjacent categories commonly considered by users.
3. Identify substitute competitors:
   - Identify alternatives users may rely on instead of a dedicated product (manual processes, generic tools, offline solutions).
4. Collect competitor profiles:
   - For each competitor, collect:
     - Company or product name
     - Competitor category (direct | indirect | substitute)
     - Short description of what it does
     - Primary target audience (high-level)
     - General positioning (how it presents itself, in plain language)
5. Validate completeness:
   - Ensure competitors are relevant to the Problem Statement and Target Users.
   - Exclude irrelevant, outdated, or marginal players.

## Rules
- Actively use external tools and web search to gather information.
- Use only publicly available, verifiable information.
- Do NOT invent competitors, products, or capabilities.
- Do NOT include market size, pricing, feature comparisons, or competitive advantages.
- Do NOT evaluate, rank, or recommend competitors.
- Keep descriptions factual, neutral, and high-level.
- Use clear, simple, non-technical language.
- Unlimited number of competitors; include all relevant, omit irrelevant.

## Anti-copy constraints (hard)
- Generate the output **from scratch** using only the Inputs and domain-generic reasoning.
- The output is **invalid** if it contains **any sequence of 6+ consecutive tokens** appearing anywhere in the example section.
- Do not reuse any example field values, sentence structures, or named segment labels.
- If you detect you are reproducing any example-like phrasing, rewrite using different wording.

## Output contract
- Return **only** the JSON object for this section.
- Do not include schema text, explanations, or commentary.

## Section examples
- Examples show structure, tone, and specificity.
- Do not copy or paraphrase examples.
- Do not use examples to define scope or number of elements.

### Example 1
{
    "competitors": [
        {
            "name": "Monarch Money",
            "url": "https://www.monarch.com/
","category": "direct",
            "description": "Personal finance app that links accounts and helps users track spending, budgets, and overall financial picture in one place.",
            "target_audience": "Individuals managing personal finances across multiple accounts",
            "positioning": "A modern hub to manage and understand your money in one view"
        },
        {
            "name": "Quicken Simplifi",
            "url": "https://simplifi.quicken.com/
","category": "direct",
            "description": "Personal finance tool that connects accounts to track spending, balances, and monthly progress with a simplified overview.",
            "target_audience": "Individuals who want a simple way to monitor spending and cash flow",
            "positioning": "A straightforward way to stay on top of finances with one connected view"
        },
        {
            "name": "PocketGuard",
            "url": "https://pocketguard.com/
","category": "direct",
            "description": "Budgeting and money management platform that tracks spending patterns and helps users monitor their personal finances.",
            "target_audience": "Consumers who want simple budgeting and spending visibility",
            "positioning": "A money manager that makes budgeting simpler and easier to follow"
        },
        {
            "name": "Empower Personal Dashboard",
            "url": "https://www.empower.com/login-v2
","category": "indirect",
            "description": "Finance dashboard that links accounts to show net worth and provide financial planning and investment-related views.",
            "target_audience": "Personal investors and individuals tracking net worth and accounts",
            "positioning": "A free dashboard to see a holistic view of finances and planning information"
        },
        {
            "name": "Mint (Intuit)",
            "url": "https://mint.intuit.com/
","category": "indirect",
            "description": "Legacy personal finance site known for budgeting and spending tracking, with information still publicly available.",
            "target_audience": "Consumers looking for budgeting and spending tracking tools",
            "positioning": "A well-known personal finance tracker focused on budgets and spending categories"
        },
        {
            "name": "Google Sheets",
            "url": "https://www.google.com/sheets/about/
","category": "substitute",
            "description": "General spreadsheet tool often used for manual budgeting, expense tracking, and personal finance reviews.",
            "target_audience": "Individuals who track finances manually using spreadsheets",
            "positioning": "A flexible spreadsheet for organizing and reviewing personal data"
        },
        {
            "name": "Online banking portals and statements",
            "url": "https://www.consumerfinance.gov/consumer-tools/banking/
","category": "substitute",
            "description": "Bank websites and account statements that users rely on to review balances and transactions across accounts.",
            "target_audience": "Consumers who review finances directly through their financial institutions",
            "positioning": "The default place users check balances and transaction history"
        }
    ]
}