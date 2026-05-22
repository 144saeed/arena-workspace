!-- META-INSTRUCTION: This is the organizational master template for "The Arena Core Developer Playbook". It is shipped directly with the core framework to govern how any UI client integrates with arena-core. It must remain 100% application-agnostic. No specific design styles (like glassmorphism, fonts, or colors) or specific app logic are allowed here. -->

# The Arena Core Developer Playbook

## 1. The Local Server Paradigm & Philosophy

### 1.1. Core as a Local Server Ecosystem
`arena-core` is architected and delivered not as a simple frontend state container, but as a sovereign Local Backend Server executing entirely within the client's sandbox.
- **Single Source of Truth:** All persistent data layer changes, state mutations, cryptographic vaults, and local AI pipelines are executed exclusively inside the Core.
- **The UI as a Stateless Client:** Any Angular application built on this framework is treated strictly as an ephemeral SPA client. The UI does not own, alter, or persist data directly; it issues commands and evaluates projections provided by the local server.

### 1.2. Anti-Pattern: Bypassing the Core
To maintain zero-knowledge compliance and systemic security, the UI application is strictly prohibited from bypassing the Core infrastructure.
- **Network Isolation:** The UI MUST NEVER make direct external HTTP/Websocket connections to third-party AI providers or external backend services. All external gateway traffic must flow through the Core's managed adapters.
- **Storage Isolation:** The UI MUST NEVER spin up independent persistent databases or local storage instances to manage application features. All state hydration and persistence belong to the Core.
- **Cryptographic Isolation:** Raw API keys, credentials, and master credentials must never enter the frontend UI component variables or transit through application-level memory.

### 1.3. Architectural Boundaries: "HOW" vs "WHAT"
This Playbook acts as the strategic and operational guide defining **HOW** a developer must construct a UI on top of the framework.
- **Separation of Concerns:** This document does not catalog the capabilities of the Core. The specific Queries, Commands, and Capabilities (the **WHAT**) are maintained dynamically within the `api-reference.md`.
- **Hardcoding Prohibited:** Developers must never hardcode behaviors based on temporary assumptions of Core capabilities. The UI must dynamically inspect the Core's exposed contracts.

---

## 2. Global UI Infrastructure Governance

Every application built on this framework, regardless of its visual identity or specific business logic, must defer global interface interactions to centralized infrastructure services to prevent collision and tightly-coupled spaghetti code:

### 2.1. Centralized Overlay & Collision Management
- UI components are prohibited from rendering floating elements, modals, or dropdown portals directly into their local DOM trees.
- All floating context layers must be registered and spawned via a unified infrastructure overlay service (e.g., using Angular CDK Portal architecture) to handle dynamic multi-layer depth, focus trapping, and collision escape strategies.

### 2.2. Unified System Feedback & Notifications
- Components must remain entirely agnostic of how errors, warning thresholds, or success confirmations are displayed.
- All system actions requiring user-facing notifications must route through a centralized framework feedback pipeline, delegating the rendering mechanism completely to the layout shell.

### 2.3. Keyboard Shortcuts & Global Event Interception
- Individual views or components must not bind global window event listeners or keyboard shortcuts locally.
- Global interactions (such as Command/Control shortcut actions) must be trapped and triaged by a centralized layout infrastructure service to avoid command racing and memory leaks.

---

## 3. Application-Agnostic Service Taxonomy

To eliminate the risk of "Fat Facades", any feature developed in the UI must strictly segregate its business-bridge logic from its presentational coordination using a clean 3-layer decoupled service taxonomy:

~~~text
+-----------------------+      +---------------------------+      +---------------------------+
|  Layer 1: Core Bridge | ---> | Layer 2: Application State| ---> | Layer 3: UI Orchestrator  |
|  (Stateless CoreBus)  |      |   (Signals Data Flow)     |      |  (Visual Portals/Routes)  |
+-----------------------+      +---------------------------+      +---------------------------+
~~~

### 3.1. Layer 1: Core Bridge Services
- **Scope:** Dispatches raw commands and queries directly to the `CoreBus` and reads incoming system message streams.
- **State:** Must remain completely stateless.
- **Boundary:** Possesses zero knowledge of routes, UI states, or layout managers.

### 3.2. Layer 2: Application State Services
- **Scope:** Orchestrates the transient data flow for the current active UI workflow. It ingests raw data from Layer 1, applies runtime client-side filters, and prepares final safe read-only projections.
- **State:** Built exclusively using read-only exposed **Angular Signals**.
- **Boundary:** Prohibited from manipulating the DOM, initiating routing, or opening overlays.

### 3.3. Layer 3: UI Orchestrator Services
- **Scope:** Acts as the contextual traffic controller. It monitors component event emitters and Layer 2 state changes to coordinate user interactions.
- **Boundary:** Prohibited from holding persistent domain data or interacting directly with the `CoreBus`. It only talks to Layer 2 and Global UI Infrastructure.

---

## 4. Component Presentation & State Flow

### 4.1. Presentational Component Dumbness
- UI components must act as pure layout engines. They consume read-only data structures via inputs and stream user intents upward via standard event channels.

### 4.2. Signal-First Paradigm & Reactive Boundaries
- All synchronous data synchronization across components must utilize Angular Signals.
- The use of RxJS Observables is strictly confined to true asynchronous event streams (e.g., streaming live tokens from an AI model). These streams must be safely piped into Signals at the boundary layer using explicit cleanup strategies to prevent memory bloating.