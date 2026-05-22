# Feature LLD: [Feature Name]

## 1. Feature Context
- **Blueprint Reference:** [Which Epic/Feature from the Master Blueprint does this fulfill?]
- **Objective:** [What specific user functionality is being built in this branch?]

---

## 2. Service Architecture (The 3 Layers)
Define the exact services that will be created or modified for this feature.

### 2.0. Core Extension Requirement (Plugin Check)
- [ ] **No Plugin Required:** This feature strictly uses existing commands/queries documented in `api-reference.md`.
- [ ] **Plugin Required:** This feature requires new Core backend capabilities. A new `IAppPlugin` must be created in `features/[name]/plugins/` to register new handlers and/or database schemas.

### 2.1. Layer 1: Core Bridge Service
- **Service Name:** `[FeatureName]CoreBridgeService`
- **Injected Core Dependencies:** [e.g., `CoreBus`, `AiGatewayService`]
- **Commands/Queries Dispatched:**
  - `[Command/Query Name]`: [Briefly describe what it does. Specify if it is a pre-existing core message or a new one provided by this feature's plugin.]

### 2.2. Layer 2: Application State Service
- **Service Name:** `[FeatureName]AppStateService`
- **State Properties (Signals):**
  ```typescript
  // List the exact signals that will be maintained
  readonly isProcessing = signal<boolean>(false);
  readonly featureData = signal<ReadonlyArray<SafeDataDto>>([]);
  ```
- **Computed Properties:**
  ```typescript
  readonly activeItem = computed(() => /* logic */);
  ```

### 2.3. Layer 3: UI Orchestrator Service
- **Service Name:** `[FeatureName]UiOrchestratorService`
- **Listens To:** [e.g., Component Emitters, App State Signal changes]
- **Visual Actions Triggered:** [e.g., Calls `OverlayManagerService.open(ModalComponent)`]

---

## 3. Atomic Component Breakdown

List the exact components that will be generated via Angular CLI for this feature.

### 3.1. Organisms (Level 3)

Organisms are the only components allowed to inject Layer 2 and Layer 3 services.

* **Component:** `Org-[ComponentName]`
* **Inputs:** `[List of @Input properties]`
* **Outputs:** `[List of @Output EventEmitters]`
* **Injected Services:** `[FeatureName]AppStateService`, `[FeatureName]UiOrchestratorService`



### 3.2. Molecules & Atoms (Levels 1 & 2)

Pure presentational components. No services allowed.

* **`Mol-[ComponentName]`:** [Purpose, e.g., A composite input field with a validation badge]
* **`Atom-[ComponentName]`:** [Purpose, e.g., A primary styled button]

---

## 4. Execution Flow (Step-by-Step Data Journey)

Trace the path of data and user interaction for the primary happy path.

1. **User Action:** [e.g., User clicks the "Submit" button on `Org-SetupForm`.]
2. **Event Emission:** [e.g., `Org-SetupForm` emits `(formSubmitted)="payload"`.]
3. **Orchestration:** [e.g., `UiOrchestratorService` catches the event, tells `AppStateService` to set `isLoading(true)`.]
4. **Bridge Execution:** [e.g., `CoreBridgeService` dispatches the command to `CoreBus`.]
5. **State Update:** [e.g., Upon success, `AppStateService` updates the signals, UI re-renders automatically.]
6. **Visual Resolution:** [e.g., `UiOrchestratorService` closes the overlay.]

