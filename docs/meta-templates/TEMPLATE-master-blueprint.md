# [Application Name] - Master Blueprint

## 1. Application Overview
- **Mission:** [Briefly describe the main goal of this application. E.g., "A standalone UI to interact with AI profiles and local databases."]
- **Target Audience:** [Who is using this app?]

---

## 2. User Journey & Story Map
Define the high-level flow the user will experience from the moment the app loads.

1. **Boot Sequence:** [e.g., CoreEngine boots -> AppShell loads -> Checks if Vault is locked.]
2. **Onboarding / Unlocking:** [e.g., User is prompted for master password. If unlocked, redirect to dashboard.]
3. **Core Workflows:**
   - [Workflow A: e.g., User navigates to Chat, selects a model, and starts streaming text.]
   - [Workflow B: e.g., User opens Settings to add a new AI Provider API key.]

---

## 3. App-Specific UI Infrastructure
While global rules are in the Playbook, list the specific infrastructure services this app will implement to adhere to those rules.

- **Theme & Layout Manager:** [e.g., `AppShellService` responsible for toggling dark mode and managing sidebar state.]
- **Overlay Implementation:** [e.g., `OverlayManagerService` using Angular CDK to handle all modal popups like `VaultUnlockModal`.]

~~~typescript
// Example of the expected structural layout mapping
export const APP_ROUTES: Routes = [
    { path: 'vault', loadComponent: () => import(...) },
    { path: 'chat', loadComponent: () => import(...) }
];
~~~

---

## 4. Feature Inventory (The Epics)
List all the major independent features (epics) this application requires. Each feature listed here MUST eventually have its own Feature LLD document mapped by a strict naming convention.

### 4.1. Feature: [Feature Name, e.g., Vault Management]
- **LLD File Link:** `docs/features/feature-vault-management.md` *(MUST follow `feature-[kebab-case].md` format)*
- **Responsibility:** [e.g., Handles setup, unlocking, and locking of the master vault.]
- **Key Organisms Needed:** [e.g., `Org-VaultSetupModal`, `Org-VaultUnlockModal`]
- **Core Dependencies (WHAT):** [e.g., Relies on `GetVaultStatusQuery`, `UnlockVaultCommand`]

### 4.2. Feature: [Feature Name, e.g., AI Chat Engine]
- **LLD File Link:** `docs/features/feature-ai-chat-engine.md`
- **Responsibility:** [e.g., Manages user prompts, AI message bubbling, and token stream parsing.]
- **Key Organisms Needed:** [e.g., `Org-ChatWindow`, `Org-MessageList`]
- **Core Dependencies (WHAT):** [e.g., Relies on `AiGatewayService` stream]

---

## 5. Next Steps
Once this blueprint is approved, the development team will create individual Feature LLD documents inside the application's `docs/features/` directory. The filenames MUST exactly match the **LLD File Link** declarations specified in Section 4 above.
