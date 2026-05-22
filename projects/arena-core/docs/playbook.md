# The Arena Core Developer Playbook

## 1. Architecture Manifesto & Philosophy
### 1.1. Core as a Local Server Ecosystem (Single Source of Truth)
### 1.2. Anti-Pattern: Bypassing the Core (Strict Network & Storage Isolation)
### 1.3. Architectural Boundaries: "HOW" vs "WHAT"
### 1.4. Zero-Knowledge Architecture in the Client
### 1.5. The Dumb UI Principle
### 1.6. Signal-First Paradigm & RxJS Boundaries

## 2. Application-Agnostic Service Taxonomy (The 3-Layer Pattern)
### 2.1. Layer 1: Core Bridge Services (Stateless Gateway)
### 2.2. Layer 2: Application State Services (Signal Data Flow)
### 2.3. Layer 3: UI Orchestrator Services (Interaction & Routing)
### 2.4. Global Infrastructure Services (Theme, Feedback, Visuals)
### 2.5. Tight Coupling Red Lines (Anti-Injection Matrix)

## 3. The Enterprise Feature Pattern
### 3.1. Defining an Independent Feature (Module Boundaries)
### 3.2. Feature Lifecycle & Garbage Collection
### 3.3. Standardized Directory Structure

## 4. Atomic Design & Global Infrastructure Governance
### 4.1. Atoms (Level 1: Pure Presentational Elements)
### 4.2. Molecules (Level 2: Compositions & Event Emitters)
### 4.3. Organisms (Level 3: Service-Connected Containers)
### 4.4. Templates & Pages (Content Projection Slots)
### 4.5. Global UI Infrastructure Governance (Centralized Overlay, Focus, and Collision Management)

## 5. State Flow & Synchronization
### 5.1. Managing Asynchronous Commands & Queries
### 5.2. AI Stream Management (Observable to Signal Conversion)
### 5.3. UI Caching Strategies (Transient vs Persistent)

## 6. Client-Side Security Boundaries
### 6.1. Vault Lock Response Protocol
### 6.2. Memory Hygiene & Component Destruction
### 6.3. Markdown Sanitization & XSS Prevention Pipelines

## 7. Disaster Recovery & Error Handling
### 7.1. Framework Error Codes Mapping
### 7.2. Core Fallback Strategies (e.g., IndexedDB Failures)
### 7.3. UI Error Boundaries (Preventing White Screen of Death)

## 8. Naming & Coding Conventions
### 8.1. Prefix and Suffix Rules (Atoms, Organisms, Services)
### 8.2. Strict TypeScript Standards (Immutability & No "any")
### 8.3. Tailwind v4 Standards (Logic vs Style Separation)

## 9. Performance Budgets
### 9.1. Lazy Loading Boundaries (@defer Rules)
### 9.2. Change Detection Optimization & Re-render Limits

## 10. QA & Testing Strategy
### 10.1. UI Unit Testing Mandates
### 10.2. Mocking the CoreBus for UI Tests