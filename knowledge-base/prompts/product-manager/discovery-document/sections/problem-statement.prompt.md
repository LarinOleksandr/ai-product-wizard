## Objective
Produce a **Problem Statement** in exactly 3 sentences.

## Workflow 
1. Gather initial insights about the problem space.
2. Formulate core problem themes.
3. Identify the underlying issues implied by the Inputs. 
4. Formulate **Problem Statement** in exactly 3 sentences:
  4.1. Who has the problem and what is its essence - specific pain or friction.
  4.2. Why the problem appears.
  4.3. Measurable value that could be achieved by the problem resolvement.

## Rules
- Fully reflects the Inputs.
- Broad enough to guide discovery, specific enough to define scope.
- No invented facts or assumptions.
- No solutions for the problem.
- No market assumptions.

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
  "problemStatement": "Everyday consumers lack a clear, up-to-date understanding of their financial situation, experiencing friction in seeing where money comes from, where it goes, and how it changes over time. This problem appears because financial data is scattered across accounts and presented in complex or inconsistent ways that require manual effort to interpret. Resolving this could be measured by reduced time spent reviewing finances, increased accuracy of spending awareness, and more consistent tracking of income, expenses, and savings."
}

### Example 2
{
  "problemStatement": "Households struggle to consistently coordinate everyday tasks and responsibilities, leading to missed chores, duplicated effort, and ongoing friction between members. This problem appears because household activities are managed across fragmented tools, informal communication, or memory, which do not stay synchronized as plans change. Resolving this could be measured by fewer missed tasks, reduced time spent coordinating, and more consistent completion of recurring household activities."
}

### Example 3
{
  "problemStatement": "Adults who want to learn practical skills struggle to make consistent progress and apply what they learn within limited available time. This problem appears because learning content is often lengthy, theory-heavy, and disconnected from immediate real-world action. Resolving this could be measured by shorter time to skill application, higher lesson completion rates, and increased frequency of skill use in daily or work contexts."
}






