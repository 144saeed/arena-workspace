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

## 8. Vault Auto-Lock (Security Enhancements)
- **Issue:** The OS Vault currently remains unlocked indefinitely until manually locked or a page reload occurs.
- **Action:** Implement a configurable inactivity timeout mechanism (e.g., `vaultTimeoutMs`) within `SecurityService` or `CoreEngineService` to automatically lock the vault and protect AI profiles.

## 9. Developer Data Encryption Service (Plugin Security)
- **Issue:** App plugins currently cannot easily encrypt their own highly sensitive user data without building custom cryptographic implementations.
- **Action:** Expose a secure `DataProtectorService` to allow plugins to encrypt/decrypt strings using the master session key without compromising the OS vault.

## 10. AI Task Scheduler (Proactive Agents)
- **Issue:** The core is entirely reactive, waiting for user interactions to trigger the `CoreBus`.
- **Action:** Implement a background scheduler (Cron-like) to execute predefined agent workflows at specific intervals.

## 11. Vector Embeddings & RAG Support (Semantic Memory)
- **Issue:** `CoreDatabaseService` lacks vector storage, and the `AiGatewayService` does not expose an embedding generation endpoint.
- **Action:** Add an `embeddings` capability to AI adapters and introduce semantic search support in the core database engine.

## 12. Multi-Agent Orchestration (Complex Workflows)
- **Issue:** The system only supports 1-to-1 interactions (User to single AI Agent).
- **Action:** Build an `AgentOrchestrator` to manage sequential and parallel workflows where outputs from one AI model are securely piped to another.

## 13. Session Token Budget Guard (Cost Control)
- **Issue:** There is no hard limit on token consumption during an infinite loop or runaway tool execution.
- **Action:** Implement a token-budget middleware that forcefully aborts a session if it exceeds a predefined developer limit.

## 14. **Refactor Framework Error Codes:** - **Issue:** Error codes like `'VAULT_LOCKED'` and `'AI_AUTH_FAILED'` are currently hardcoded string literals scattered across the core services and exceptions.
    - **Action:** Create a centralized `FrameworkErrorCode` enum or const object (e.g., `export const FrameworkErrorCode = { VAULT_LOCKED: 'VAULT_LOCKED', ... } as const;`) to provide strict type-safety for both the core and consumer UI platforms.