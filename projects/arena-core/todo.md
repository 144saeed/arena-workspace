# Arena Core - Technical Debt & v2.0 Roadmap

## 1. Runtime Validation (Security & Stability)
- **Issue:** Relying solely on TypeScript interfaces leaves the runtime vulnerable to malformed data from plugins, DB, or AI providers.
- **Action:** Integrate `Zod` or `Valibot` to parse and strictly validate all incoming DTOs, Tool Arguments, and Stream Chunks at runtime.

## 2. Advanced Agent Loop Capabilities (AI Logic)
- **Issue:** The current AgentExecutor is a basic "LLM -> Tool -> LLM" loop.
- **Action:** Add memory management, token budgeting, planning/reflection phases, and hallucination protections to the agent runtime.

## 3. Provider-Agnostic Canonical Schema (AI Abstraction)
- **Issue:** The `AiMessageDto` and Tool schemas are subtly influenced by Google Gemini's structure.
- **Action:** Design a fully canonical AI schema that abstracts away the quirks of OpenAI, Claude, and Gemini into a unified cognitive layer.

## 4. Plugin Sandboxing & Capability Model (Ecosystem Security)
- **Issue:** Third-party plugins currently have full trust (access to DB, Vault, AI).
- **Action:** Implement a capability-based security sandbox (e.g., `permissions: ['network', 'db:read']`) to isolate plugins.

## 5. Enterprise Observability (Monitoring)
- **Issue:** Using `console.log` and `console.warn` is insufficient for multi-app debugging.
- **Action:** Build a structured telemetry system (execution spans, tool latency tracking, correlation IDs) instead of primitive logs.

## 6. Vault & DB Migration Strategy (Data Portability)
- **Issue:** Simple `version += 1` in SchemaManager isn't robust for breaking changes.
- **Action:** Develop a production-grade schema migration strategy with rollback plans for Dexie, and a version-check migration path for `os_vault`.

## 7. Comprehensive Unit Testing (QA)
- **Issue:** Core logic lacks automated tests.
- **Action:** Write strict unit tests for `CryptoService`, `AgentExecutor`, and `SchemaManager`.