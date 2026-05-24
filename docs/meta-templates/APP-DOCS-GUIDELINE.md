# Arena Workspace Documentation Guideline

This document defines the canonical directory layout for applications developed within the Arena Monorepo workspace and enforces strict linking conventions between architectural blueprints and low-level designs (LLDs).

## 1. Monorepo Directory Architecture

To preserve isolation, the core framework and consumer applications must segregate their documentation assets exactly as mapped below:

~~~text
arena-workspace/
├── docs/
│   └── meta-templates/             # Global corporate blueprints and templates
│       ├── TEMPLATE-master-blueprint.md
│       ├── TEMPLATE-feature-lld.md
│       ├── TEMPLATE-api-reference.md
│       └── APP-DOCS-GUIDELINE.md
│
├── projects/
│   └── arena-core/                 # The core local server library
│       └── docs/
│           ├── playbook.md         # Framework execution laws
│           └── api-reference.md    # Core capabilities reference catalog
│
└── apps/                           # (Or projects/) Consumer application layer
    └── [your-app-name]/            # e.g., arena-playground
        └── docs/
            ├── contract.md         # Product owner / client agreement
            ├── master-blueprint.md # The application master plan (Epics)
            └── features/           # Dynamic folder for feature-level LLDs
                ├── feature-vault-management.md
                └── feature-chat-engine.md
~~~

## 2. Blueprint-to-LLD Linking Convention

To maintain a traceable, scalable, and audit-ready documentation pipeline that enables rapid 10-day application delivery, developers must follow a strict file-linking contract:

- **The Inventory Mapping:** Every high-level epic registered under Section 4 (Feature Inventory) of an application's `master-blueprint.md` MUST map directly to a standalone LLD file inside the `docs/features/` directory.
    
- **Filename Format Contract:** File names for low-level designs must follow a strict kebab-case pattern prefixed with `feature-` and matching the exact name of the blueprint epic.
    
    - _Example:_ If Epic 4.1 in the blueprint is named `Vault Management`, the corresponding file MUST be named exactly: `docs/features/feature-vault-management.md`.
        

## 3. The 10-Day Delivery Bootstrapping Rule
Before a single line of application code is written, the developer MUST read `projects/arena-core/docs/api-reference.md` to map the application's target product requirements against the Core's existing capabilities.

### 3.1. Mapping Laws: From Contract to Blueprint
To bridge the gap between the Product Vision (`contract.md`) and Architectural Design (`master-blueprint.md`), developers must strictly follow these two translation rules:
- **Translation Rule 1 (The Epic Rule):** Every single "Core User Flow" documented in Section 4 of the `contract.md` MUST be translated into exactly one "Feature (Epic)" in Section 4 of the `master-blueprint.md`.
- **Translation Rule 2 (The Plugin Rule):** If an Epic requires persistent data storage (per `contract.md` Section 5.2) AND that specific table does not exist in the Core OS schemas, that Epic MUST be inherently marked as "Plugin Required" during its LLD generation.

### 3.2. Architectural Feature Decision Flow
When designing a feature, developers must pass their requirements through the following standardized evaluation pipeline:

~~~text
Read api-reference.md
       │
       ├──► Does the required capability/schema exist?
       │     └──► YES: Reference the CoreBus message directly inside your Feature LLD (Section 2.1).
       │               [Plugin Requirement: Checked as "No Plugin Required"]
       │
       └──► Does the capability/schema NOT exist?
             └──► YES: Enable the "Plugin Required" checkbox in your Feature LLD (Section 2.0).
                       Draft the custom IAppPlugin contract under features/[name]/plugins/.
~~~

