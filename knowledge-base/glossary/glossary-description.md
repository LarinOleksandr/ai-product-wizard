# AI Product Wizard — Glossary Schema (Markdown)

This schema defines the structure of the internal Glossary used by the AI Product Wizard.
It is optimized for:

- deterministic LLM usage
- consistent agent reasoning
- clear human understanding

---

## Domain

Represents a **product lifecycle area**.
Domains define the top-level structure of the Glossary and align with the methodology phases.

### Fields

- **id**  
  Unique domain identifier.  
  Format: `D<number>`  
  Example: `D1`

- **name**  
  Human-readable name of the domain.  
  Example: `Discovery`, `Product Definition`

- **description**  
  Short explanation of what this domain covers in the methodology.  
  Written for humans, not LLM logic.

---

## Term

Represents a **single, unambiguous concept** used in the Product Development workflow.

Each term belongs to exactly one Domain and must not duplicate the meaning of any other term.

### Fields

- **id**  
  Unique term identifier.  
  Format: `T<domain_number>.<term_number>`  
  Example: `T1.3`

- **name**  
  Canonical name of the term.  
  Must be unique across the entire Glossary.

- **domain_id**  
  Reference to the Domain this term belongs to.  
  Must match an existing Domain `id`.

- **definition**  
  Technical, precise definition used by LLMs and agents.  
  Describes what the term _is_ in a formal, implementation-oriented way.  
  No examples, no metaphors, no storytelling.

- **description**  
  Human-oriented explanation of the term.  
  Explains purpose, internal structure, and role in the methodology.  
  Must NOT repeat the term name (do not start with “The …”).  
  Should start with an action verb or explanatory phrase (e.g. “Describes…”, “Defines…”, “Represents…”).

- **relates_to**  
  Explicit list of other Term IDs this term depends on or is logically connected to.  
  Used to enforce vocabulary consistency and prevent isolated concepts.  
  May be empty.

- **produces**  
  Describes the primary outcome of applying or defining this term in the workflow.  
  Allowed values:
  - `artifact` — produces a concrete document or object
  - `decision` — results in a choice or alignment
  - `structure` — defines organization or hierarchy
  - `constraint` — imposes a rule or limitation

---

## Structural Rules (implicit, enforced by usage)

- One term = one meaning
- No synonyms or duplicate concepts
- Terms in later domains may reference earlier domains, never the reverse
- Definitions must be understandable without reading descriptions
- Descriptions must not redefine the term, only elaborate its role and usage
- Domains do not reference each other directly; terms do

---

This schema is the **single source of truth** for vocabulary across:

- documents
- agents
- workflows
- validation logic
