# Prompts Library

This folder stores all prompts and schemas used by the agentic subsystem.

Rules:
- One folder per agent (example: `discovery/`).
- Each agent folder includes:
  - `agent-system.md`
  - `output-rules.md`
  - `placeholders.md`
  - `sections/` with a prompt and schema per section
  - `final.schema.json` for the full document
  - `examples/` with valid JSON samples

All prompts must be plain text and easy to read.
