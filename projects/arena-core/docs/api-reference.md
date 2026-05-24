# Arena Core API Reference

This document serves as the absolute source of truth for the capabilities, commands, queries, and data structures exposed by the `arena-core` local server. 

## 1. Core Commands (State Mutations)
Commands are dispatched via the `CoreBus` to mutate the state of the local system (e.g., database writes, configuration changes). They execute within transaction boundaries.

> [!warning]
> Error codes in v1 are string literals. They are scheduled to be refactored into a centralized FrameworkErrorCode enum/const object in v2.

### 1.1. AddAiProfileCommand
* **Description:** Registers a new AI profile and securely encrypts the provided raw API key before storing it in the local vault.
* **Payload Structure:**
~~~typescript
export class AddAiProfileCommand implements ICommand {
    constructor(
        public readonly name: string,
        public readonly provider: string,
        public readonly rawApiKey: string,
        public readonly selectedModel: string
    ) {}
}
~~~
* **Expected Outcome:** A new encrypted `AiProfileEntity` is stored in the database. Returns the generated profile UUID string.
* **Throws:** `INVALID_API_KEY`, `VAULT_LOCKED`

### 1.2. DeleteAiProfileCommand
* **Description:** Permanently removes an existing AI profile from the local database ecosystem.
* **Payload Structure:**
~~~typescript
export class DeleteAiProfileCommand implements ICommand {
    constructor(public readonly id: string) {}
}
~~~
* **Expected Outcome:** The specified profile is deleted from the `os_ai_profiles` system schema.
* **Throws:** `VAULT_LOCKED`

### 1.3. UpdateAiProfileCommand
* **Description:** Updates the properties of an existing AI profile. If a new raw API key is provided, it is dynamically re-validated and re-encrypted.
* **Payload Structure:**
~~~typescript
export class UpdateAiProfileCommand implements ICommand {
    constructor(
        public readonly id: string,
        public readonly name?: string,
        public readonly selectedModel?: string,
        public readonly rawApiKey?: string
    ) {}
}
~~~
* **Expected Outcome:** The targeted AI profile is updated with the new values.
* **Throws:** `PROFILE_NOT_FOUND`, `INVALID_API_KEY`, `VAULT_LOCKED`

### 1.4. SetActiveProfileCommand
* **Description:** Sets a specific AI profile as the global default context for the application instance.
* **Payload Structure:**
~~~typescript
export class SetActiveProfileCommand implements ICommand {
    constructor(public readonly id: string) {}
}
~~~
* **Expected Outcome:** The `isActive` flag for the designated profile becomes `true`, and all others are toggled to `false` within an ACID transaction.
* **Throws:** `PROFILE_NOT_FOUND`, `VAULT_LOCKED`

---

## 2. Core Queries (Data Retrieval)

Queries are dispatched via the `CoreBus` to retrieve data safely. They are strictly read-only and guarantee no state mutation.

### 2.1. GetAiProfilesQuery
* **Description:** Retrieves a safe list of all registered AI profiles without exposing decrypted API keys to the UI.
* **Payload Structure:** *(No arguments required)*
~~~typescript
export class GetAiProfilesQuery implements IQuery<SafeAiProfileDto[]> {}
~~~
* **Returns:** `Promise<SafeAiProfileDto[]>`
* **Security Constraint:** Does not expose raw keys. Requires unlocked vault for execution context mapping.

### 2.2. GetProviderModelsQuery
* **Description:** Fetches available models directly from the remote AI provider using an unencrypted, transient API key.
* **Payload Structure:**
~~~typescript
export class GetProviderModelsQuery implements IQuery<string[]> {
    constructor(
        public readonly providerId: string,
        public readonly rawApiKey: string
    ) {}
}
~~~
* **Returns:** `Promise<string[]>`
* **Security Constraint:** Bypasses local vault decryption; relies entirely on the provided transient key passing through the UI.

### 2.3. GetModelsByProfileIdQuery
* **Description:** Retrieves available models for an existing profile by internally decrypting its stored API key via the OS Vault.
* **Payload Structure:**
~~~typescript
export class GetModelsByProfileIdQuery implements IQuery<string[]> {
    constructor(public readonly profileId: string) {}
}
~~~
* **Returns:** `Promise<string[]>`
* **Security Constraint:** Strictly requires an unlocked vault to retrieve and use the master session key for underlying AES-GCM decryption.

### 2.4. GetActiveProfileCapabilitiesQuery
* **Description:** Retrieves the structural capabilities (e.g., streaming support, vision, tool usage) of the currently active AI adapter context.
* **Payload Structure:** *(No arguments required)*
~~~typescript
export class GetActiveProfileCapabilitiesQuery implements IQuery<AiCapabilitiesDto | undefined> {}
~~~
* **Returns:** `Promise<AiCapabilitiesDto | undefined>`
* **Security Constraint:** Safe read-only check mapping directly to static adapter capabilities.

---
## 3. Data Transfer Objects (DTOs)

The following data structures define the contracts for data passing between the UI layer (dumb client) and the Core server.

### 3.1 System DTOs

**SafeAiProfileDto**
Represents the sanitized profile data for an AI agent. 
*Note: As per the current v1 implementation, this interface does not enforce strict runtime immutability.*
```typescript
export interface SafeAiProfileDto {
    id: string;
    name: string;
    provider: string;
    isActive: boolean;
    selectedModel: string;
}
````

**AiEventDto** Represents a strictly typed stream event emitted from the AI gateway.

TypeScript

```
export interface AiEventDto {
    readonly eventId: string;
    readonly type: 'chunk' | 'tool_call' | 'done' | 'error';
    readonly payload: any;
    readonly timestamp: number;
}
```

## 4. Core Command Bus (CQRS Engine)

The `CoreBus` is the central nervous system of the framework, strictly routing all commands and queries from the UI to their respective internal handlers.

### 4.1 Bus Methods

**dispatch**

TypeScript

```
dispatch<T>(message: ICommand<T> | IQuery<T>): Promise<T>
```

Executes a command or query by resolving and invoking its registered handler.

- **Throws:** `HANDLER_NOT_FOUND` if no matching handler is registered in the system.
    

**useMiddleware**

TypeScript

```
useMiddleware(middleware: IBusMiddleware): void
```

Registers a middleware interceptor into the execution pipeline.

> [!warning] for UI Consumers:
> This method is strictly reserved for internal core orchestration. In the official Playbook, `useMiddleware` is exclusively invoked by the `CoreEngineService` during the boot sequence. UI developers **must not** call this method under any circumstances, as it may permanently destabilize the CQRS pipeline.

---

## 5. System Plugins & Tools

The core exposes a strict registry for injecting dynamic AI tools into the context.

### 5.1 Tool Execution Types

To develop a custom tool, consumers must implement the `ToolHandler` signature and utilize the `IToolExecutionContext`.

**ToolHandler**
The asynchronous function signature required to execute a registered tool.
```typescript
type ToolHandler = (
    args: Record<string, any>, 
    context: IToolExecutionContext
) => Promise<StructuredToolResultDto>;
```

**IToolExecutionContext** Provides isolated dependencies and cancellation tokens to the executing tool.

TypeScript

```
interface IToolExecutionContext {
    readonly injector: Injector;
    readonly abortSignal?: AbortSignal;
}
```

## 6. Security & Vault Constraints

The Core enforces a strictly local encryption paradigm. All sensitive AI profiles and keys are stored in an encrypted vault.

> [!note]
>  Error codes in v1 are string literals. They are scheduled to be refactored into a centralized FrameworkErrorCode enum/const object in v2.

### 6.1 Security Methods

**setupVault**

TypeScript

```
setupVault(password: string): Promise<void>
```

Initializes a new vault with the provided master password.

- **Throws:** - `VAULT_EXISTS`: If a vault is already initialized on the device.
    
    - `WEAK_PASSWORD`: If the provided password does not meet system entropy requirements.
        
    - `NOT_BOOTED`: If the core engine has not completed its initialization sequence.
        

**unlockVault**

TypeScript

```
unlockVault(password: string): Promise<void>
```

Decrypts the local vault into memory for the duration of the current session.

- **Throws:** - `VAULT_MISSING`: If no vault has been created on the device.
---

## 7. Core Storage & Portability

The framework exposes strict APIs for ecosystem state management, data persistence, and portability. 

### 7.2 Connection States

**ProfileConnectionState**
Represents the real-time connectivity status of an AI profile. UI consumers requiring iteration over profile maps must utilize this type.
~~~typescript
export interface ProfileConnectionState {
    readonly status: 'connected' | 'disconnected' | 'error';
    readonly lastChecked: Date;
}
~~~

### 7.3 System Portability

**importEcosystem**
~~~typescript
importEcosystem(payload: any): Promise<void>
~~~
Parses and injects a complete ecosystem backup into the local encrypted storage.
- **Throws:** - `IMPORT_PARSE_ERROR`: If the payload structure is invalid or corrupt.
  - `IMPORT_DOS_RISK`: If the payload exceeds the hard limit.
- **Warning for Consumers:** To prevent browser memory exhaustion, the payload size is strictly capped at **50,000 records**.

**factoryReset**
~~~typescript
factoryReset(): Promise<void>
~~~
Executes a highly destructive operation that permanently wipes the entire local IndexedDB and invalidates the active vault.
- **Throws:** `FACTORY_RESET_FAILED`
- **Side-Effect Warning:** Upon a successful wipe, this method forcefully triggers a `window.location.reload()` to purge all in-memory states. Consumers must prepare for an immediate ungraceful exit.

### 7.4 Data Storage & Repositories

Essential infrastructure services exposed for enterprise plugin developers.


**PublicDataStoreService**
Provides sanitized, raw access to the underlying storage engine (IndexedDB wrappers) for custom table management.
 
 
**BaseRepository< T >**
The abstract repository class enforcing generic CRUD operations (Create, Read, Update, Delete) strictly aligned with the framework's Signal-First and local-only architecture.

---

## 8. Registered Plugins & System Adapters

### 8.1. SystemAiProfilePlugin
* **App ID:** `system-ai-profile`
* **Description:** The core plugin injected during the boot sequence. It handles dynamic configuration of API keys and AI models.
* **Registered Handlers (CQRS):**
  * `AddAiProfileCommand`
  * `UpdateAiProfileCommand`
  * `DeleteAiProfileCommand`
  * `SetActiveProfileCommand`
  * `GetAiProfilesQuery`
  * `GetProviderModelsQuery`
  * `GetModelsByProfileIdQuery`
  * `GetActiveProfileCapabilitiesQuery`

### 8.2. AI Adapters
* **`GoogleGeminiAdapter`:** Native adapter supporting `generativelanguage.googleapis.com` models. Fully supports Streaming, Tools, Vision, and JSON Mode.

---

## 9. System Error Codes Catalog

> **Note:** Error codes in v1 are string literals. They are scheduled to be refactored into a centralized `FrameworkErrorCode` enum/const object in v2.

The Core enforces strict fault isolation. The UI layer must anticipate and gracefully handle the following error strings:

| Error Code | Source / Thrown By | Description |
| :--- | :--- | :--- |
| `VAULT_EXISTS` | `SecurityService.setupVault` | Attempted to initialize a vault when one is already provisioned on the device. |
| `WEAK_PASSWORD` | `SecurityService.setupVault` | The provided master password fails minimum entropy requirements. |
| `NOT_BOOTED` | `SecurityService.setupVault` | Attempted to execute vault operations before the core engine completed its boot sequence. |
| `VAULT_MISSING` | `SecurityService.unlockVault` | Attempted to decrypt a vault that does not exist on the current device. |
| `AI_PROFILE_NOT_FOUND` | `AiGatewayService.prepareSecureContext` | The requested AI profile identity could not be located inside the decrypted vault. |
| `HANDLER_NOT_FOUND` | `CoreBus.dispatch` | No corresponding command or query handler is registered in the CQRS pipeline. |
| `ADAPTER_NOT_FOUND` | `AiRegistryService` | The AI provider adapter specified in the profile is not registered in the system. |
| `INVALID_APP_IDENTITY` | Boot Sequence | The core failed to verify the application's unique signature during bootstrap. |
| `IMPORT_PARSE_ERROR` | `SystemPortabilityService.importEcosystem` | The imported ecosystem payload is structurally invalid or unreadable. |
| `IMPORT_DOS_RISK` | `SystemPortabilityService.importEcosystem` | The import payload exceeds the absolute maximum threshold of 50,000 records. |
| `FACTORY_RESET_FAILED` | `SystemPortabilityService.factoryReset` | The destructive reset process encountered an I/O lock or critical failure. |
| `STREAM_BODY_MISSING` | `GoogleGeminiAdapter` | The AI provider's underlying network stream was absent or malformed. |
| `AGENT_EMPTY_RESPONSE` | `AgentExecutorService.executeTask` | The autonomous agent loop returned an empty or structurally invalid conclusion. |
