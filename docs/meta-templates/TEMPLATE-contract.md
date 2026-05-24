# Application Contract: [Application Name]

## 1. Product Vision & Goals
- **The Problem:** [What specific problem does this application solve for the user?]
- **The Solution:** [How does this application solve the problem using the local core capabilities?]
- **Success Metric:** [How do we know V1 is successful? e.g., "User can successfully chat with an AI and save the conversation locally without network drops."]

---

## 2. Target Users & Context
- **Primary Persona:** [Who is the main user? e.g., "A researcher needing private document analysis."]
- **Execution Environment:** [e.g., "Desktop browser primarily, offline-first environment."]

---

## 3. V1 Functional Scope
Clearly define the boundaries to prevent scope creep during the 10-day delivery cycle.

### 3.1. In Scope for V1
- [ ] [e.g., Secure vault initialization and authentication]
- [ ] [e.g., Markdown-supported AI chat interface]
- [ ] [e.g., Saving chat history to local database]

### 3.2. Out of Scope for V1 (Deferred to V2+)
- [ ] [e.g., Multi-device cloud sync]
- [ ] [e.g., Voice-to-text input]

---

## 4. Core User Flows (The Scenarios)
List the 3 to 5 critical step-by-step journeys the user will take. 
*(Note: According to the App-Docs Guideline, each flow listed here MUST eventually map to a specific 'Epic' in the Master Blueprint).*

### Flow 1: [e.g., First-Time Onboarding]
1. User opens the application.
2. System detects no active vault.
3. User is prompted to create a master password.
4. User enters password, vault is created, and user is redirected to the dashboard.

### Flow 2: [e.g., Executing an AI Prompt]
1. User navigates to the Chat interface.
2. User selects an active AI Profile (e.g., Gemini 1.5).
3. User types a prompt and hits send.
4. System streams the response back into the UI in real-time.

---

## 5. System Requirements & Dependencies

### 5.1. AI Capabilities Required
Check all that apply. This dictates which adapters and core streams the UI will need.
- [ ] Standard Text Generation
- [ ] Live Streaming (SSE)
- [ ] Vision / Image Processing
- [ ] Agentic Tool Calling (Function Execution)

### 5.2. Data Persistence Requirements
What domain-specific data must be saved permanently in the local database? 
*(Note: If the required tables do not exist in the Core OS schemas, a custom Core Plugin will be required).*
- [Entity 1: e.g., `ChatSession` - Stores metadata about a conversation]
- [Entity 2: e.g., `ChatMessage` - Stores individual user/AI messages]