# KanbanX Constitution

## Core Principles

### I. Single Source of Truth
Every piece of information in KanbanX must have one authoritative source. Task metadata, agent actions, and system state are centralized in the database with immutable audit trails. No duplicate or conflicting data sources are permitted.

### II. Least Privilege Agents
Agents operate under strict role-based permissions with minimal necessary access. Each agent can only perform actions within their designated scope (triage, prep, review, merge). Merge capabilities are disabled by default and require explicit human enablement.

### III. Human-in-Loop Policy (NON-NEGOTIABLE)
Critical decisions require human oversight. Tasks with service_class "MustDoNow" or "FixedDate" cannot be moved to "Done" status without explicit human approval. Agents must request human intervention when confidence thresholds are not met.

### IV. Audit-First Architecture
All actions in the system generate immutable audit records before execution. Every task movement, comment, assignment, and agent interaction is logged with timestamp, actor identification, before/after states, and optional notes. Audit trails are append-only and cannot be modified.

### V. Metrics-Driven Operation
System performance and agent effectiveness are continuously measured. Task throughput, agent success rates, human intervention frequency, and policy compliance metrics drive operational decisions and improvements.

## Architecture Constraints

### Modular Design
The system consists of independent, loosely-coupled components:
- Backend API (Node.js/Express) with clear separation between UI endpoints (`/api/*`) and agent endpoints (`/mcp/*`)
- Frontend React application consuming backend APIs
- Agent orchestration layer with placeholder interfaces for future LangGraph implementation
- Database layer (SQLite for development, PostgreSQL-compatible schema for production)

### API-First Development
All functionality is exposed through well-defined REST APIs with OpenAPI specifications. UI and agents interact exclusively through these APIs. No direct database access outside the backend service layer.

### Security by Design
- JWT-based authentication for humans and token-based authentication for agents
- All agent tokens are short-lived in production with mandatory rotation
- Agent actions are scoped by role-based access control
- Sensitive operations require additional authorization layers

## Development Standards

### Test-First Implementation
Unit tests for all controllers and business logic must be written before implementation. Integration tests verify API contracts and agent interactions. End-to-end tests validate complete user workflows.

### Documentation Requirements
- OpenAPI specifications for all endpoints
- Agent integration guides with LangGraph mapping documentation
- Policy enforcement rules clearly documented
- Local development setup instructions

### Code Quality Gates
- TypeScript for type safety across backend and frontend
- ESLint and Prettier for consistent code formatting
- Automated testing in CI/CD pipeline
- Code review required for all changes

## Governance

This constitution supersedes all other development practices and architectural decisions. Any changes to these principles require:

1. **Impact Assessment**: Document affected systems and migration requirements
2. **Stakeholder Review**: Obtain approval from development team and system administrators
3. **Migration Plan**: Define step-by-step implementation with rollback procedures
4. **Audit Update**: Record constitutional changes in system audit log

All agent actions must be logged in an audit table. Agent roles and permissions can only be modified by human administrators. System errors are logged with sufficient context for debugging.

**Version**: 1.0.0 | **Ratified**: 2025-11-05 | **Last Amended**: 2025-11-05
