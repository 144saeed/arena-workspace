# The Arena Core Developer Playbook

## 1. Architecture Manifesto & Philosophy

### 1.1. Core as a Local Server Ecosystem (Single Source of Truth)
The `arena-core` framework is not a traditional state-management library; it is a fully autonomous **Local Backend Server** running entirely within the user's browser sandbox. 
- **Absolute Authority:** The Core is the Single Source of Truth (SSOT). All persistent data modifications, state mutations, cryptographic vault operations, and local AI plugin executions happen strictly within the Core.
- **The Ephemeral UI:** Any UI application built on top of this framework (e.g., Angular SPAs) is treated as a "dumb" client. The UI does not own the data. It requests projections from the Core, displays them, and issues commands back to the local server via the bus.

### 1.2. Anti-Pattern: Bypassing the Core (Strict Isolation)
To maintain the integrity, security, and predictability of the system, bypassing the Core is strictly prohibited.
- **Network Isolation:** The UI MUST NEVER make direct external network requests (e.g., HTTP calls to OpenAI, Gemini, or external databases). All external communications must be routed through Core-managed adapters.
- **Storage Isolation:** The UI MUST NEVER instantiate independent persistent storage (e.g., `IndexedDB`, `localStorage`) to persist business data. All persistence is the sole responsibility of the Core.

### 1.3. Architectural Boundaries: "HOW" vs "WHAT"
This Playbook dictates the **HOW**: how to structure folders, how to manage state, and how to define UI architecture. 
It intentionally omits the **WHAT**. The specific capabilities of the Core (its available Commands, Queries, and DTOs) are dynamic and are documented separately in the `api-reference.md`. Developers must dynamically rely on the API Reference rather than hardcoding assumptions about Core capabilities in the UI.

### 1.4. Zero-Knowledge Architecture in the Client
The UI layer operates on a Zero-Knowledge basis regarding sensitive user credentials.
- Master passwords, raw encryption keys, and unencrypted API tokens MUST NEVER be stored in UI component variables or transient application state.
- The UI only receives cryptographic success/failure confirmations or temporary, safe operational tokens provided by the Core.

### 1.5. The Dumb UI Principle
User Interface components must remain entirely devoid of business logic, database query structures, or AI processing algorithms.
- **Responsibility:** Components only receive data via inputs, render it efficiently, and emit user intents via standard event emitters.
- **Enforcement:** Components must never inject the `CoreBus` directly.

### 1.6. Signal-First Paradigm & RxJS Boundaries
Modern Angular reactive programming dictates our state management rules:
- **Synchronous State (Signals):** `Signal`, `computed`, and `effect` are the absolute standards for maintaining and reacting to UI state.
- **Asynchronous Streams (RxJS):** The use of RxJS `Observable`s is strictly confined to asynchronous system events (e.g., listening to live AI token streams). At the boundary of the component, Observables must be converted to Signals (e.g., using `toSignal`) to prevent memory leaks and eliminate manual subscription management.

---

## 2. Application-Agnostic Service Taxonomy (The 3-Layer Pattern)

To eliminate the "Fat Facade" anti-pattern and ensure total decoupling, every feature must separate its logic using the strict 3-Layer Service Taxonomy.

### 2.1. Layer 1: Core Bridge Services (Stateless Gateway)
- **Role:** The exclusive diplomat to the `arena-core`.
- **Responsibilities:** Dispatches commands/queries to the `CoreBus` and observes system streams.
- **Constraints:** Must be completely stateless. It cannot inject any Angular routing, DOM managers, or Layer 2/3 services.

### 2.2. Layer 2: Application State Services (Signal Data Flow)
- **Role:** The brain of the feature's transient state.
- **Responsibilities:** Ingests raw DTOs from Layer 1, applies runtime UI filters, handles pagination logic, and exposes final read-only Signals for components to consume.
- **Constraints:** Must not trigger visual elements directly (e.g., it cannot open a modal or trigger a toast notification). 

### 2.3. Layer 3: UI Orchestrator Services (Interaction & Routing)
- **Role:** The visual traffic controller.
- **Responsibilities:** Listens to component events and Layer 2 state changes to coordinate user interactions, trigger routing, or command the global infrastructure (e.g., opening overlays).
- **Constraints:** Must not dispatch commands directly to Layer 1. It only coordinates the visual outcome of states.

### 2.4. Global Infrastructure Services (Theme, Feedback, Visuals)
These are app-wide singleton services that enforce consistency across all features.
- **Overlay Manager:** Centralizes the creation and destruction of modals/portals.
- **Feedback Pipeline:** Centralizes Toasts, Snackbars, and system alerts.
- **Theme Manager:** Controls dark/light modes and CSS variable injections.

### 2.5. Tight Coupling Red Lines (Anti-Injection Matrix & Authorized Exceptions)
To prevent circular dependencies and architectural erosion, the following injection matrix is strictly enforced.

#### 2.5.1. Standard Injection Flow
~~~text
[ALLOWED INJECTIONS]
- Organism Components MAY inject Layer 2 (App State) & Layer 3 (Ui Orchestrator).
- Layer 3 (Orchestrator) MAY inject Layer 2 (App State) & Global Infrastructure Services.
- Layer 2 (App State) MAY inject Layer 1 (Bridge).
- Layer 1 (Bridge) MAY inject CoreBus.

[STRICTLY PROHIBITED]
- Components MUST NOT inject Layer 1 Services directly.
- Layer 1 Services MUST NOT inject Layer 2 or Layer 3 Services.
- Layer 2 Services MUST NOT inject Layer 3 or Global Infrastructure Services.
~~~
#### 2.5.2. Authorized Direct Core Injections (Explicit Exceptions)

While Layer 1 (Bridge) services primarily communicate via the `CoreBus`, they are granted explicit, narrow permission to bypass the command/query bus and inject exactly two critical framework-level services directly:

- **`AiGatewayService`:** Authorized strictly for subscribing to live, asynchronous AI token streams. Direct extraction of `GoogleGeminiAdapter.providerId` configuration is permitted here.
    
- **`SecurityService`:** Authorized strictly for reading the `isVaultUnlocked` synchronous signal to enable immediate UI reactions to memory-locking states.
    
- _Constraint:_ Injecting any other internal core registry, service, or database layer remains completely prohibited.

## 3. The Enterprise Feature Pattern

### 3.1. Defining an Independent Feature (Module Boundaries)
A "Feature" in this architecture is a strictly isolated domain of functionality (e.g., `VaultManagement`, `AiChat`). 
- **Isolation:** A feature must be completely self-contained. It contains its own Layer 1, 2, and 3 services, alongside its specific Organisms and Molecules.
- **Cross-Feature Communication:** Features MUST NOT inject services from other features. If Feature A needs data from Feature B, both must rely on the `CoreBus` as the intermediary Single Source of Truth.

### 3.2. Extending Core Capabilities (Plugins & Handlers)
When a UI feature requires a new backend capability (e.g., a new database table, a new AI skill, or a custom command), the UI developer MUST NOT implement this logic in the frontend services. Instead, they must author a Core Plugin.
- **The AppPlugin Contract:** The developer creates a class implementing `IAppPlugin`. This plugin bundles specific `QueryHandlers`, `CommandHandlers`, and Database Schemas required by the feature.
- **The Boot Injection:** These feature-specific plugins are collected at the application level and injected into the Core exactly once during the `CoreEngine.boot(plugins)` sequence in the main `app.config.ts`.
- **Execution:** Once booted, the UI components simply dispatch commands to the `CoreBus`, entirely unaware that the handler was injected by their own application's boot sequence.

### 3.3. Feature Lifecycle & Garbage Collection
Features are strictly ephemeral.
- **Initialization:** Layer 2 (App State) and Layer 3 (Orchestrator) services should ideally be scoped to the Feature's routing module or specific parent Organism (using Component-level providers) to prevent singleton memory bloating.
- **Destruction:** When a user navigates away from a feature, all local Signals must be inherently destroyed, and any active CoreBus subscriptions in Layer 1 must be aggressively terminated.

### 3.4. Standardized Directory Structure
Every feature must adhere to the following physical directory structure to enforce the architectural boundaries visually:

~~~text
features/
└── [feature-name]/
    ├── plugins/               # (Optional) Core extensions & handlers injected at boot
    ├── services/
    │   ├── bridge.service.ts         # Layer 1
    │   ├── app-state.service.ts      # Layer 2
    │   └── orchestrator.service.ts   # Layer 3
    ├── ui/
    │   ├── organisms/
    │   ├── molecules/
    │   └── atoms/
    └── index.ts               # Public API of the feature (strictly exports Organisms & Plugins)

~~~

---

## 4. Atomic Design & Global Infrastructure Governance

### 4.1. Atoms (Level 1: Pure Presentational Elements)

Atoms are the indivisible building blocks of the UI (e.g., Buttons, Inputs, Icons).

* **Rule:** Atoms MUST NOT inject any services. They rely entirely on `@Input()` for data and `@Output()` for interactions.

### 4.2. Molecules (Level 2: Compositions & Event Emitters)

Molecules are simple functional groups combining multiple Atoms (e.g., a Search Bar combining an Input and a Button).

* **Rule:** Like Atoms, Molecules are completely "dumb". They format data for display and bubble up user interactions via event emitters. No service injections are allowed.

### 4.3. Organisms (Level 3: Service-Connected Containers)

Organisms are distinct, complex sections of the interface (e.g., a Chat Window or a Settings Panel).

* **Rule:** Organisms are the **ONLY** components permitted to inject Layer 2 (App State) and Layer 3 (Ui Orchestrator) services. They act as the glue between the dumb components (Atoms/Molecules) and the reactive data flow.

### 4.4. Templates & Pages (Content Projection Slots)

Pages are entirely structural. They do not hold state. They simply define the layout grid and use Angular's `<ng-content>` projection to place Organisms into their designated layout slots.

### 4.5. Global UI Infrastructure Governance (Collision Management)

To prevent z-index wars and overlapping chaos, local components are stripped of floating UI privileges.

* **Centralized Overlays:** Any dropdown, modal, or floating portal must be instantiated via a global `OverlayManagerService` (typically leveraging Angular CDK). This ensures only one critical modal is active, trapping focus properly and preventing visual collision.

---

## 5. State Flow & Synchronization

### 5.1. Managing Asynchronous Commands & Queries

When Layer 1 dispatches a command/query to the `CoreBus`, it typically returns a Promise.

* **Loading States:** Layer 2 (App State) is responsible for explicitly managing `isProcessing` Signals before and after the Promise resolves.
* **Mutation Sync:** UI components do not await these Promises directly. They trigger the action, and Layer 2 updates the UI Signals based on the Core's response.

### 5.2. AI Stream Management (Observable to Signal Conversion)

Handling live AI token streams requires strict reactive boundaries to avoid freezing the UI thread.

* **The Pipeline:** Layer 1 receives the `Observable<AiToken>` from the `AiGateway`. Layer 2 subscribes to this stream, batches the tokens if necessary, and writes the output to a `WritableSignal`.
* **Component Consumption:** The Organism component reads only the Signal. This ensures Angular's Change Detection runs optimally without multiple async pipe evaluations per millisecond.

### 5.3. UI Caching Strategies (Transient vs Persistent)

* **Persistent Data:** The UI MUST NOT cache domain entities (e.g., Chat History, Vault Entries) in local variables long-term. If the Core updates a database record, the UI must re-query it.
* **Transient Data:** The UI is only permitted to cache transient interaction states (e.g., "Which tab is currently open", "Draft text in an input box") within Layer 2 services.


## 6. Client-Side Security Boundaries

Because the UI operates within the browser's memory space alongside the Local Server (Core), strict security protocols must be enforced at the UI layer to prevent data leakage and XSS vulnerabilities.

### 6.1. Vault Lock Response Protocol
The UI must be structurally prepared for the Core to lock the cryptographic vault at any moment (e.g., due to an idle timeout).
- **Reactive Signal Tracking:** The UI shell and core layout layout must reactively monitor the `SecurityService.isVaultUnlocked` read-only signal. Developers MUST NOT listen for a `VAULT_LOCKED` event on the CoreBus, as lock states are maintained exclusively via synchronous framework signals.
- **Immediate Purge:** As soon as the `isVaultUnlocked()` signal evaluates to `false`, a global state purge must be automatically executed via an Angular effect. All Layer 2 App State Services containing decrypted projections must reset their local Signals to empty or null states instantly.
- **Redirection:** The Layer 3 UI Orchestrator must immediately intercept this specific state change to forcefully navigate the user to the Unlock/Onboarding screen, safely bypassing any standard presentation routing guards.

### 6.2. Memory Hygiene & Component Destruction
Garbage collection in a long-running SPA is critical, especially when handling sensitive AI outputs or decrypted strings.
- **Explicit Destruction:** Whenever an Organism containing sensitive data is destroyed (e.g., navigating away from a chat session), its associated Layer 2 App State Service must explicitly zero-out its internal Signals.
- **No Residual Caching:** Developers MUST NOT store decrypted domain data in static variables, browser `localStorage`, or `sessionStorage` under any circumstances.

### 6.3. Markdown Sanitization & XSS Prevention Pipelines
AI models frequently output Markdown containing code blocks, HTML tags, and potentially malicious payloads (e.g., prompt injection rendering `<script>` tags).
- **Mandatory Sanitization:** Before any AI-generated string is rendered into the DOM (e.g., using `innerHTML`), it must pass through a strict, framework-approved sanitization pipeline (e.g., Angular's `DomSanitizer` or a configured `DOMPurify` pipe).
- **Constraint:** Bypassing security trusts (like Angular's `bypassSecurityTrustHtml`) is strictly prohibited for AI-generated content.

---

## 7. Disaster Recovery & Error Handling

A robust enterprise UI does not crash or display a "White Screen of Death" when the backend engine fails. It degrades gracefully and orchestrates recovery.

### 7.1. Framework Error Codes Mapping
The `arena-core` framework emits standardized, predictable string literals as error codes (e.g., `VAULT_LOCKED`, `AI_AUTH_FAILED`, `AI_NETWORK_ERROR`, `SECURITY_VIOLATION`). Note that there are no `CORE_ERR_` prefixes attached to framework exceptions.
- **The UI Dictionary:** The UI layer must maintain an infrastructure mapping dictionary that translates these raw string error codes directly into user-friendly visual orchestrations and localized text.
- **Actionable Feedback:** Instead of displaying raw backend stack traces to the end user, Layer 3 (UI Orchestrator) must intercept these precise error strings and trigger specific infrastructure overlays accompanied by clear recovery options.
- **Future Roadmap Warning:** Note that while error codes in v1 are string literals, they are scheduled to be refactored into a centralized, type-safe `FrameworkErrorCode` enum/const object in v2. All documented UI integrations should anticipate this structural upgrade.

### 7.2. Core Fallback Strategies
In extreme cases (e.g., IndexedDB corruption or complete Core boot failure), the UI must not hang on a loading spinner indefinitely.
- **Boot Timeout:** The UI application bootstrap phase must implement a timeout race condition. If the Core fails to boot within the threshold, the UI must route to an isolated `FatalErrorComponent` (a pure Atom structure) detailing recovery instructions (like hard-reloading or clearing site data).

### 7.3. UI Error Boundaries
Unhandled exceptions within UI components (e.g., undefined variable access in an HTML template) must be caught globally.
- **Global Error Handler:** The application must implement Angular's `ErrorHandler` interface to trap all client-side exceptions, log them safely (without exposing PII), and present a graceful fallback UI to prevent the entire SPA from freezing.

---

## 8. Naming & Coding Conventions

Consistency in a codebase prevents cognitive overload. The following conventions are mandatory for any application built on this framework.

### 8.1. Prefix and Suffix Rules
All generated files and classes must follow explicit naming taxonomies to reveal their architectural role immediately:
- **Atoms:** File: `atom-button.component.ts` | Class: `AtomButtonComponent`
- **Molecules:** File: `mol-search-bar.component.ts` | Class: `MolSearchBarComponent`
- **Organisms:** File: `org-chat-window.component.ts` | Class: `OrgChatWindowComponent`
- **Services (Layer 1):** `[Feature]CoreBridgeService`
- **Services (Layer 2):** `[Feature]AppStateService`
- **Services (Layer 3):** `[Feature]UiOrchestratorService`

### 8.2. Strict TypeScript Standards
We enforce strict, functional-leaning TypeScript paradigms to guarantee state predictability.
- **No `any`:** The `any` type is completely banned. Use `unknown` and perform type narrowing/guards if the payload structure is uncertain.
- **Immutability by Default:** Arrays and Objects in State Services must be typed as `ReadonlyArray<T>` and `Readonly<T>`. 
- **Signal Encapsulation:** Services must encapsulate writable signals internally and only expose them as read-only signals to components:
    ~~~typescript
    // DO THIS
    private readonly _data = signal<ReadonlyArray<string>>([]);
    public readonly data = this._data.asReadonly();
    ~~~

### 8.3. Tailwind v4 Standards (Logic vs Style Separation)

While Tailwind CSS provides rapid styling, it can clutter the DOM and mix logic with presentation if abused.

* **Class Extraction:** Avoid massive inline class strings spanning multiple lines in the HTML. Use Angular's `[class]` bindings to cleanly toggle distinct states.
* **No Business Logic in Templates:** Complex ternary operators determining Tailwind classes based on domain data are prohibited in HTML. Compute the state (e.g., `isWarningMode`) in the TypeScript class as a Signal, and bind the class cleanly in the template.

## 9. Performance Budgets

A high-performance Local Server ecosystem requires a UI that is equally optimized. The UI must never become a bottleneck for the Core Engine.

### 9.1. Lazy Loading Boundaries (@defer Rules)
To ensure the initial Time-to-Interactive (TTI) remains strictly under enterprise budgets, the UI must aggressively chunk its bundles.
- **Route-Level Lazy Loading:** All primary application routes must be lazy-loaded using Angular's `loadComponent` or `loadChildren`.
- **Component-Level Deferral:** Heavy Organisms, especially those containing complex AI rendering logic, chart libraries, or large markdown parsers, MUST be wrapped in Angular's `@defer` blocks. 
- **Trigger Strategies:** Use explicit trigger conditions (e.g., `@defer (on viewport)` or `@defer (on interaction)`) to prevent fetching JavaScript bundles until the user actually needs the feature.

### 9.2. Change Detection Optimization & Re-render Limits
With the adoption of the Signal-First paradigm, the UI must eliminate all wasteful DOM re-renders.
- **OnPush Mandatory:** Every single component (Atom, Molecule, Organism, and Page) MUST be configured with `changeDetection: ChangeDetectionStrategy.OnPush`. There are zero exceptions to this rule.
- **No Template Functions:** Executing complex business logic or array filtering functions directly within HTML templates (e.g., `*ngIf="calculateHeavyThing()"`) is strictly prohibited. All derived state must be pre-calculated in Layer 2 using `computed()` signals.

---

## 10. QA & Testing Strategy

A decoupled architecture is only as strong as its testability. The 3-Layer Taxonomy inherently isolates logic, making unit testing straightforward and highly predictable.

### 10.1. UI Unit Testing Mandates
Testing efforts must be prioritized based on architectural risk:
- **Layer 2 (App State Services):** This is the highest priority. Tests must validate that given a specific input from Layer 1, the signals compute the exact expected output. 
- **Atoms & Molecules:** Must be covered by structural tests ensuring that `@Input()` bindings correctly alter the DOM and interactions correctly emit `@Output()` events.
- **Organisms:** Tests should focus on integration logic—ensuring they properly map component interactions to Layer 3 Orchestrator calls.

### 10.2. Mocking the CoreBus for UI Tests
Because the UI is strictly forbidden from bypassing the Core, testing the UI requires simulating the Local Server.
- **The CoreBus Mock:** In UI unit tests, developers MUST NEVER import or boot the actual `arena-core` engine. 
- **Simulation:** Tests must inject a mock implementation of the `CoreBusService` and `AiGatewayService` (Layer 1 dependencies). These mocks will intercept dispatched commands and synchronously return predictable dummy DTOs to simulate various backend states (e.g., Success, Vault Locked, Network Failure).