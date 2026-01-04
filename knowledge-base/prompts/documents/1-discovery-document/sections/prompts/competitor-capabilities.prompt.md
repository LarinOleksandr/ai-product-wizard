# Section prompt

## Task

Produce **Competitor Capabilities** grouped by **Capability Group** using this exact JSON structure:

competitor_capabilities: {
Functional: [ ... ],
Technical: [ ... ],
Business: [ ... ]
}

Each capability entry must include:

- capability
- alignment_with_user_needs
- owning_competitors
- gaps_and_limitations

## Workflow

1. Analyze Functional group capabilities.
2. Analyze Technical group capabilities.
3. Analyze Business group capabilities.
4. For each group, list distinct capabilities competitors provide.
   - Expressed as an ability, not a feature
   - Described in neutral, functional terms
5. For each capability, add:
   - Alignment with User Needs: 1-2 sentences tied to existing User Pain Points.
   - Owning Competitors: named products only.
   - Gaps and Limitations: observed capability constraits: delivery, scalability, usability, integration, cost etc. (at least one item required).
6. Validate and filter for relevance and clarity.

## Generation Rules

- Use neutral, functional language.
- Refer only to existing User Pain Points.
- No scoring, ranking, or judgment.
- No invented facts; rely on public information only.
