# Agentic System Development & Launch – Task List with Deliverables and Quality Requirements

This task list follows the blueprint but expresses each step as a **concrete task** with:
- **Deliverable** (what must be produced)
- **Quality Requirements** (how to know it’s good enough)

---

## Phase 0 — Local Foundations & Tooling

### 0.1 Install Core Tools
**Tasks**
- Install Git, Docker Desktop, Node.js, npm, Python 3.12.
- Verify installations via CLI.

**Deliverables**
- Screenshot of terminal outputs proving versions installed.

**Quality Requirements**
- All tools available globally.
- Able to run Docker containers and Python virtual env without errors.

---

### 0.2 Create Repository
**Tasks**
- Create GitHub repo `agentic-product-system`.
- Clone locally and configure `.gitignore`.

**Deliverables**
- Public GitHub repo link.

**Quality Requirements**
- Repo opens without warnings.
- Clean initial commit with empty structure.

---

### 0.3 Python Environment Setup
**Tasks**
- Create virtual environment.
- Install LangGraph, LangChain, Pydantic, FastAPI/Flask.
- Generate `requirements.txt` or `pyproject.toml`.

**Deliverables**
- `requirements.txt` committed to repo.

**Quality Requirements**
- Running `python -m langgraph` in shell works.
- All imports succeed without error.

---

### 0.4 Local Database + pgvector
**Tasks**
- Create Docker compose file for Postgres + pgvector.
- Start DB and create initial database.

**Deliverables**
- `docker-compose.yml` file.
- Screenshot of pgvector extension enabled.

**Quality Requirements**
- Running `SELECT * FROM pg_extension;` shows pgvector.
- DB accessible from backend.

---

### 0.5 Local LLM Provider
**Tasks**
- Start a dev LLM endpoint: either local Ollama/vLLM or temporary cloud API.
- Add environment variables for LLM base URL.

**Deliverables**
- `.env.example` file with placeholder variables.

**Quality Requirements**
- Test prompt returns response within 3 seconds.

---

### 0.6 Frontend Skeleton
**Tasks**
- Create React+TypeScript+Vite app.
- Add basic layout.

**Deliverables**
- Screenshot of running empty web console.
- `/frontend` folder in repo.

**Quality Requirements**
- Dev server starts without warnings.
- Clean minimal UI loads in browser.

---

---

## Phase 1 — Methodology & Workflow Definition

### 1.1 Define First Workflow
**Tasks**
- Describe steps: Idea → Brief → Stories → Issues.
- Provide inputs, outputs, and constraints.

**Deliverables**
- `workflow_1_methodology.md`.

**Quality Requirements**
- Clear data flow.
- Each step produces a structured output.

---

### 1.2 Define Initial Agents
**Tasks**
- Document PlannerAgent, IssueAgent, ReviewerAgent (optional).
- Provide roles, responsibilities, inputs, outputs.

**Deliverables**
- `agents_definition.md`.

**Quality Requirements**
- Agents have non-overlapping responsibilities.
- Inputs/outputs are well-typed and easy to map to Pydantic models.

---

### 1.3 Workflow Diagram
**Tasks**
- Draw a simple diagram of workflow sequence.

**Deliverables**
- PNG/SVG diagram: `workflow_1_diagram.png`.

**Quality Requirements**
- Agent nodes and flow arrows are clearly visible.
- Can be understood without reading text documentation.

---

---

## Phase 2 — Backend: Schema & Orchestrator

### 2.1 Database Schema & Migrations
**Tasks**
- Create `projects`, `workflows`, `artifacts`, `embeddings`, `traces` tables.
- Add SQL migrations.

**Deliverables**
- ERD diagram (`db_schema.png`).
- SQL migration files in `/db/migrations`.

**Quality Requirements**
- Schema loads cleanly from scratch.
- All tables have primary keys, indexing on embeddings, and foreign key consistency.

---

### 2.2 Implement LangGraph Orchestrator
**Tasks**
- Implement graph with PlannerAgent → IssueAgent → End.
- Add state model.
- Integrate DB + embeddings.

**Deliverables**
- Python file `orchestrator.py` containing LangGraph DAG.
- `state_model.py` with Pydantic types.

**Quality Requirements**
- Running a workflow returns structured outputs without errors.
- State transitions validated with at least one real input.

---

### 2.3 GitHub Integration
**Tasks**
- Implement GitHub tool using REST API.
- Support issue creation.

**Deliverables**
- `github_tool.py` with a “create_issues” function.
- Example output screenshot or JSON.

**Quality Requirements**
- Can create issues in a test repo within 2 seconds.
- Output includes URLs of created issues.

---

---

## Phase 3 — API + Web Console

### 3.1 REST API Implementation
**Tasks**
- Implement endpoints:
  - Create project
  - Start workflow
  - Fetch workflow status
  - Fetch artifacts

**Deliverables**
- `api.py` with FastAPI implementation.
- Screenshot of FastAPI docs.

**Quality Requirements**
- All routes return valid JSON.
- API handles invalid input with meaningful errors.

---

### 3.2 Build Web Console
**Tasks**
- Build UI screens:
  - Project list
  - Idea input + start workflow
  - Workflow status
  - Artifact viewer

**Deliverables**
- Screenshots of UI.
- Source code in `/frontend`.

**Quality Requirements**
- UI loads fast (< 200ms after initial build).
- No unhandled front-end errors in console.

---

---

## Phase 4 — Observability (Minimal)

### 4.1 Trace Logging
**Tasks**
- Log step-by-step workflow events.
- Save traces in `traces` table.

**Deliverables**
- `tracing.py`.
- Sample trace JSON file.

**Quality Requirements**
- Each workflow step produces one trace row.
- Trace viewer in UI displays chronological steps.

---

---

## Phase 5 — Public Deployment

### 5.1 Deploy Managed Postgres
**Tasks**
- Create hosted Postgres instance (Neon/Supabase).
- Run migrations.

**Deliverables**
- Connection string stored in `.env` (not committed).
- Screenshot of DB dashboard.

**Quality Requirements**
- DB responds in <100ms from backend.
- pgvector enabled.

---

### 5.2 Deploy Backend (API + Orchestrator)
**Tasks**
- Build Docker image.
- Deploy to any PaaS (Render, Railway, Fly.io).
- Configure environment variables.

**Deliverables**
- Backend public URL (e.g. https://agent-system-api.fly.dev).

**Quality Requirements**
- API reachable over HTTPS.
- Workflow completes successfully from public deployment.

---

### 5.3 Deploy Web Console
**Tasks**
- Deploy React build to Netlify/Vercel.
- Connect UI to backend URL.

**Deliverables**
- Public UI link (e.g. https://agent-system-console.netlify.app).

**Quality Requirements**
- UI interactive from internet without VPN.
- Starting a workflow works end-to-end via public URL.

---

### 5.4 Optional Domain
**Tasks**
- Buy a domain.
- Connect UI and backend via DNS.

**Deliverables**
- Custom domain URL.

**Quality Requirements**
- HTTPS valid and secure.

---

---

## Phase 6 — Portfolio Packaging

### 6.1 Create Portfolio Docs
**Tasks**
- Consolidate diagrams, screenshots, and explanations.

**Deliverables**
- `/portfolio` folder containing:
  - `architecture_overview.pdf`
  - `workflow_explained.pdf`
  - `deployment_diagram.png`
  - UI screenshots
  - sample trace
  - public demo links

**Quality Requirements**
- All documents readable and well-structured.
- Viewer can understand system within 3–5 minutes.

---

### 6.2 Publish Demo & Repo
**Tasks**
- Ensure everything is accessible online.
- Write a polished README for GitHub.

**Deliverables**
- Final public GitHub repo.
- Live URL of system.
- Demo video (optional).

**Quality Requirements**
- README clearly communicates:
  - What it does
  - Architecture
  - How to run locally
- Live system works reliably for basic flows.

---

# End of Task List
