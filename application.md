Great — below is a ready-to-run, developer-focused **SpecKit instruction package** you can paste into SpecKit (or run with the `specify-cli`) to generate a working scaffold for **KanbanX**: a Jira-like app with a Kanban board and MCP endpoints for agents. The agents are represented as **placeholders**/stubs so you can later implement them in LangGraph (or Langflow / LangChain) without changing the core.

I'll give you:

1. Exact `spec-kit` command sequence to run.
2. A full `/speckit.specify` specification (copy/paste).
3. A `/speckit.plan` technical plan.
4. `/speckit.tasks` to break the work down.
5. Useful artifacts to paste into the generated project: OpenAPI for the MCP surface, DB schema, example Express route stubs (MCP), and small agent placeholder examples (Python + Node) with notes for LangGraph mapping.

Use these in the project directory when running SpecKit.

---

## 1) Run these SpecKit commands (in project root)

(Assumes `specify-cli` is installed as SpecKit docs describe.)

```bash
# initialize project
specify init kanbanx

# create the project constitution (high-level principles)
specify.constitution "KanbanX: single source of truth, least privilege agents, human-in-loop policy, audit-first, metrics-driven."

# create the functional spec (paste the spec below)
specify.specify <<'SPEC'
# (paste the SPEC content from section 2 below here)
SPEC

# create the technical plan (paste / use plan from section 3)
specify.plan <<'PLAN'
# (paste the PLAN content from section 3 below here)
PLAN

# generate tasks from the plan
specify.tasks

# implement (this will scaffold code artifacts – edit as needed)
specify.implement
```

---

## 2) `/speckit.specify` — copy/paste this functional spec

```
Build "KanbanX": a lightweight Jira-like web application for an AI-augmented Kanban workflow.

Goals:
- Provide a web Kanban board with columns: Backlog, To Do, AI Prep, In Progress, Verify, Done.
- Each ticket stores metadata: id, title, description, status, owner_type (Human|Agent), owner_id, service_class (Linear|Intangible|MustDoNow|FixedDate), ai_eligible, tags, links, created_by, created_at, updated_at, audit[].
- Agents are first-class actors but limited by scoped permissions. Agents can query tasks, comment, create subtasks, move tasks, and post artifacts via a Model Context Protocol (MCP)-compatible REST surface.
- Agents are placeholders in the initial implementation. Provide an agent stub interface (register, claim/release tasks, push comments, move tasks). Later agents will be implemented with LangGraph.
- Provide authentication for humans and agents (token-based / JWT).
- Provide CI hooks / webhooks for GitHub PRs/CI events.
- Provide an IDE-friendly API (simple endpoints and a lightweight websocket or SSE for board updates).
- Provide an OpenAPI (or equivalent) schema for the MCP endpoints for agents.

Non-functional:
- Simple, modular, extensible: backend Node.js (Express or Fastify), SQLite for persistence, React + Tailwind frontend (Vite or Next.js).
- All agent actions must be logged in an audit table.
- Provide docker-compose for local dev.
- Provide example placeholder agents: Python and Node.js scripts that use the MCP REST API.
- Provide a small LangGraph mapping document showing nodes and flows to implement the agents later.
```

---

## 3) `/speckit.plan` — technical implementation plan (copy/paste)

```
Stack decisions:
- Backend: Node.js + Express (small team familiarity), TypeScript
- DB: SQLite for local; design schema compatible with PostgreSQL for production
- Frontend: React + Vite + TypeScript + Tailwind CSS
- Auth: JWT tokens (human login via username/password for dev; agent tokens generated via admin panel)
- API contract: OpenAPI v3 for application API and MCP endpoints
- Agent placeholder orchestration: simple lease endpoints (claim/release) and webhook notifications
- CI: GitHub Actions for tests and lint
- Dev environment: docker-compose with backend, frontend, sqlite volume

High-level architecture:
- kanbanx-backend: Express app exposing `/api/*` for UI and `/mcp/*` for agents
- kanbanx-frontend: React app consuming `/api` + realtime updates via SSE
- agent-stubs: `agent-doc` (python), `agent-review` (node) to demonstrate flows
- websockets/SSE for live board updates
- simple admin UI to register agent tokens & roles

Major components & deliverables:
1. OpenAPI file for `/api` and `/mcp`
2. Database schema (tasks, audit, users, agents, agent_roles)
3. Express routes & controllers implementing: task CRUD, move, comment, subtask, audit retrieval, agent registration, agent lease/claim
4. Agent placeholder scripts
5. Frontend Kanban board with drag/drop, filters, card view, comment panel, audit panel
6. Docs: README, run instructions, LangGraph mapping file

Security & governance:
- Agents have role-based capabilities (triage, prep, review, merge - merge disabled by default)
- All actions are logged; tokens short-lived in production
- Human signoff required for MustDoNow → Done or FixedDate → Done
```

---

## 4) `/speckit.tasks` — actionable tasks SpecKit will break into implementation items

```
1. Project scaffold
  - Initialize monorepo with backend and frontend directories
  - Add TypeScript, ESLint, Prettier config
  - Add docker-compose with sqlite volume

2. API & DB
  - Design DB schema (tasks, audit, users, agents, roles)
  - Create OpenAPI spec (api.yaml) covering tasks and MCP endpoints
  - Implement Express server and controllers
  - JWT auth & admin endpoints for registering agents

3. MCP endpoints
  - /mcp/tasks?status=
  - /mcp/tasks/:id/comment
  - /mcp/tasks/:id/move
  - /mcp/tasks/:id/subtask
  - /mcp/agents/register
  - /mcp/agents/:id/claim
  - /mcp/agents/:id/release

4. Audit & Governance
  - Implement audit table and append-on-change middleware
  - Implement policy enforcement: require human approval for MustDoNow and FixedDate finalization

5. Frontend
  - Basic Kanban UI: Backlog, To Do, AI Prep, In Progress, Verify, Done
  - Card modal to show metadata, comments, audit
  - Actions: assign owner (agent or user), move card, add comment
  - SSE for real-time updates

6. Agents (placeholders)
  - Python agent-doc: polls /mcp/tasks?status=AI Prep, posts a comment, moves to Verify
  - Node agent-review: polls /mcp/tasks?status=Verify, posts review, optionally moves to Done (only for ai_eligible docs)
  - Provide README on how to replace placeholders with LangGraph workflows

7. Integrations
  - GitHub webhook listener: update task status on PR open/close
  - CI hook example: when tests pass, agent adds comment and moves task to Verify

8. Tests & CI
  - Unit tests for controllers; integration tests for endpoints
  - GitHub Actions to run tests

9. Documentation
  - README with run instructions and developer guide
  - LangGraph mapping doc for agents (node graphs, data flow, required nodes)
```

---

## 5) Pasteable artifacts

Below are files you can drop into the scaffold SpecKit generates or into the final repo.

### A. OpenAPI (trimmed) — `openapi.yaml`

Use this as basis for the MCP endpoints.

```yaml
openapi: 3.0.3
info:
  title: KanbanX MCP API
  version: 0.1.0
servers:
  - url: http://localhost:3000
paths:
  /mcp/tasks:
    get:
      summary: List tasks (agent view)
      parameters:
        - in: query
          name: status
          schema:
            type: string
        - in: query
          name: ai_eligible
          schema:
            type: boolean
      responses:
        '200':
          description: list of tasks
  /mcp/tasks/{id}/comment:
    post:
      summary: Add a comment to a task
      parameters:
        - in: path
          name: id
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                text:
                  type: string
      responses:
        '200':
          description: success
  /mcp/tasks/{id}/move:
    post:
      summary: Move a task to a new status
      parameters:
        - in: path
          name: id
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                status:
                  type: string
                note:
                  type: string
      responses:
        '200':
          description: success
  /mcp/agents/register:
    post:
      summary: Register an agent
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                name:
                  type: string
                role:
                  type: string
      responses:
        '201':
          description: agent registered
```

---

### B. DB schema (SQLite) — `schema.sql`

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE,
  display_name TEXT,
  password_hash TEXT,
  created_at TEXT
);

CREATE TABLE agents (
  id TEXT PRIMARY KEY,
  name TEXT,
  role TEXT,
  token TEXT,
  created_at TEXT
);

CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT,
  owner_type TEXT,
  owner_id TEXT,
  service_class TEXT,
  ai_eligible INTEGER DEFAULT 0,
  tags TEXT,
  links TEXT,
  created_by TEXT,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id TEXT,
  actor TEXT,
  action TEXT,
  before_state TEXT,
  after_state TEXT,
  note TEXT,
  timestamp TEXT
);
```

---

### C. Express route stubs (TypeScript) — `src/controllers/mcp.ts`

```ts
import { Request, Response } from 'express';
import db from '../db'; // simple wrapper for sqlite

export async function listMcpTasks(req: Request, res: Response) {
  const { status, ai_eligible } = req.query;
  // simple filter implementation
  const rows = await db.all('SELECT * FROM tasks WHERE (? IS NULL OR status = ?) AND (? IS NULL OR ai_eligible = ?)', [status, status, ai_eligible, ai_eligible]);
  res.json(rows);
}

export async function commentOnTask(req: Request, res: Response) {
  const { id } = req.params;
  const { text } = req.body;
  const actor = req.user?.id || req.headers['x-agent-id'] || 'unknown';
  // insert audit record + comment store (store comments into audit for simplicity)
  await db.run('INSERT INTO audit (task_id, actor, action, note, timestamp) VALUES (?, ?, ?, ?, datetime("now"))', [id, actor, 'comment', text]);
  res.json({ ok: true });
}

export async function moveTask(req: Request, res: Response) {
  const { id } = req.params;
  const { status, note } = req.body;
  const actor = req.user?.id || req.headers['x-agent-id'] || 'unknown';
  const before = await db.get('SELECT status FROM tasks WHERE id = ?', [id]);
  await db.run('UPDATE tasks SET status = ?, updated_at = datetime("now") WHERE id = ?', [status, id]);

  await db.run('INSERT INTO audit (task_id, actor, action, before_state, after_state, note, timestamp) VALUES (?, ?, ?, ?, ?, ?, datetime("now"))', [id, actor, 'move', before?.status || null, status, note || null]);
  res.json({ ok: true });
}
```

> Note: add JWT middleware to set `req.user` and add agent token authentication that maps token → agent id.

---

### D. Agent placeholder examples

**Python stub** — `agents/doc_agent.py`

```python
# polls /mcp/tasks?status=AI Prep and creates a comment then moves to Verify
import os, time, requests

BASE = os.getenv("KANBANX_URL", "http://localhost:3000")
TOKEN = os.getenv("AGENT_TOKEN", "agent-doc-token")
HEADERS = {"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"}

def poll():
    r = requests.get(f"{BASE}/mcp/tasks?status=AI Prep", headers=HEADERS)
    tasks = r.json()
    for t in tasks:
        tid = t["id"]
        txt = f"Agent-doc: generated initial docs for '{t['title']}' - please review."
        requests.post(f"{BASE}/mcp/tasks/{tid}/comment", headers=HEADERS, json={"text": txt})
        requests.post(f"{BASE}/mcp/tasks/{tid}/move", headers=HEADERS, json={"status": "Verify", "note": "docs generated"})
        
if __name__ == '__main__':
    while True:
        poll()
        time.sleep(15)
```

**Node.js stub** — `agents/review_agent.js`

```js
// polls Verify tasks, posts a review comment and optionally moves to Done if ai_eligible
const fetch = require('node-fetch');
const BASE = process.env.KANBANX_URL || 'http://localhost:3000';
const TOKEN = process.env.AGENT_TOKEN || 'agent-review-token';
const headers = { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' };

async function poll() {
  const res = await fetch(`${BASE}/mcp/tasks?status=Verify`, { headers });
  const tasks = await res.json();
  for (const t of tasks) {
    const comment = `Agent-review: quick pass completed for ${t.title}.`;
    await fetch(`${BASE}/mcp/tasks/${t.id}/comment`, { method: 'POST', headers, body: JSON.stringify({ text: comment }) });
    if (t.ai_eligible) {
      await fetch(`${BASE}/mcp/tasks/${t.id}/move`, { method: 'POST', headers, body: JSON.stringify({ status: 'Done', note: 'auto-done by review agent' }) });
    }
  }
}

setInterval(poll, 10_000);
```

---

### E. LangGraph mapping doc (for later agents)

Provide a `langgraph.md` file that describes nodes/flows to implement the placeholder agents. Example:

```
LangGraph Agent: "DocPrepAgent"
Nodes:
- Input: Query MCP /mcp/tasks?status=AI Prep
- ForEach Task:
  - Node: Repo Snippet Fetcher (tool) -> fetch relevant files by path in task.links
  - Node: LLM Summarizer -> create documentation draft
  - Node: Artifact Uploader -> store doc in artifacts store and return link
  - Node: MCP Commenter -> post comment with link
  - Node: MCP Mover -> post move to Verify
Edges:
- Error handling: if summarizer confidence < threshold -> MCP comment asking for human input and do not move
- Logging: push events to audit webhook node
```

And for ReviewAgent:

```
LangGraph Agent: "ReviewAgent"
Nodes:
- Input: Query MCP /mcp/tasks?status=Verify
- ForEach Task:
  - Node: Fetch PR Info (GitHub) -> get diff
  - Node: LLM Code Auditor -> run checks and produce a checklist
  - Node: Test Runner (CI tool) -> run unit tests
  - Node: MCP Commenter (post results)
  - Node: Rule Evaluator -> If tests green & no security flags & task.ai_eligible => MCP Mover to Done
  - Else => MCP Mover to In Progress with note
```

This gives a precise mapping you can implement in LangGraph.

---

## 6) Governance & Policies to include in the repo

Create `POLICIES.md` with:

* Agent roles & allowed actions
* Auto-merge guardrails (disabled by default in initial scaffold)
* Human approval steps for MustDoNow and FixedDate
* Token rotation & short-lived tokens for production
* Audit retention policy

---

## 7) Local dev & run instructions (README snippet)

```markdown
# KanbanX — Local dev

## Prereqs
- Node 18+, npm/yarn
- Docker & docker-compose (optional)
- Python 3.10 (for python agent stub)

## Quickstart
1. Install deps:
   - backend: `cd backend && npm install`
   - frontend: `cd frontend && npm install`
2. Start DB and server:
   - `docker-compose up --build` (or run backend and frontend separately)
3. Run migrations:
   - `node ./backend/dist/migrate.js` (or provided script)
4. Start agents (dev):
   - `python agents/doc_agent.py`
   - `node agents/review_agent.js`
```

---

## 8) Next steps I will not do automatically (but you can follow)

* Wire the frontend drag/drop to `/api/tasks/:id/move` and add SSE subscription.
* Implement admin UI to create agent tokens and assign roles.
* Enhance policy enforcement (e.g., check on move: if status=Done and service_class in [MustDoNow, FixedDate] then require existing human_approval flag).
* Add production-ready auth (OAuth + short-lived tokens + rotation).
* Replace placeholder agents with LangGraph flows using the LangGraph mapping doc.

---

## 9) Deliverables I can generate next (if you want)

If you want, I can now:

* Generate the OpenAPI file fully expanded from the trimmed version above.
* Produce a zipped project scaffold implementing the Express controllers and React board boilerplate (TypeScript), including docker-compose and scripts.
* Generate the LangGraph JSON/YAML flow skeletons for the agents so you can import them directly into LangGraph.

Tell me which of those you want next and I’ll produce code & files inline or as downloadable artifacts.
