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

## 3. Data Transfer Objects (DTOs) & Entities

The strict typing contracts for all data passing between the UI client and the Core. UI components must project these interfaces directly. All properties are strictly read-only to enforce the immutability and Signal-First paradigm of the framework.

---
### 3.1. SafeAiProfileDto

* **Purpose:** The primary, safe projection of an AI profile exposed to the UI. It strips out sensitive encryption keys and initialization vectors, ensuring Zero-Knowledge compliance in the client.
* **Interface:**
~~~typescript
export interface SafeAiProfileDto {
    readonly id: string;
    readonly name: string;
    readonly provider: string;
    readonly isActive: boolean;
    readonly selectedModel: string;
}
~~~

---
### 3.2. AiProfileEntity (Internal/Database Entity)

* **Purpose:** Represents the actual stored AI provider configuration within the Core database. 
* **Warning:** This entity contains encrypted cryptographic material (`encryptedApiKey`, `encryptionIv`). It is documented here for architectural context, but the UI should never handle this directly. Consumers will always receive `SafeAiProfileDto` via Queries.
* **Interface:**
~~~typescript
export interface AiProfileEntity {
    readonly profileId: string;
    readonly profileName: string;
    readonly providerId: string;
    readonly encryptedApiKey: string;
    readonly encryptionIv: string;
    readonly selectedModel: string;
    readonly isActive: boolean;
}
~~~

---
### 3.3. AiEventDto (Stream Events)

* **Purpose:** Represents a single unified event emitted during an active Server-Sent Events (SSE) AI connection. It is critical for rendering real-time typing effects and intercepting tool-execution requests mid-stream.
* **Interface:**
~~~typescript
export type AiEventType = 'chunk' | 'tool-call' | 'complete' | 'error';

export interface AiEventDto {
    readonly type: AiEventType;
    readonly content?: string;
    readonly toolCalls?: AiToolCallDto[];
    readonly error?: string;
    readonly tokensUsed?: number;
}
~~~

---
### 3.4. AiRequestDto

* **Purpose:** Standardized payload dispatched to the Core to initiate an AI generation task. It fully supports agentic tools and JSON modes.
* **Interface:**
~~~typescript
export interface AiRequestDto {
    readonly messages: AiMessageDto[];
    readonly model?: string;
    readonly temperature?: number;
    readonly expectJson?: boolean;
    readonly tools?: AiToolDto[];
}
~~~

---
### 3.5. AiResponseDto

* **Purpose:** Standardized response payload returned by any AI adapter after a successful, non-streaming generation.
* **Interface:**
~~~typescript
export interface AiResponseDto {
    readonly content: string;
    readonly tokensUsed?: number;
    readonly providerId: string;
    readonly toolCalls?: AiToolCallDto[];
}
~~~

---
### 3.6. AiMessageDto & AiMessagePartDto

* **Purpose:** Standardized multimodal message format for AI Agent interactions. It uses a robust parts array to support multiple modalities (vision, tools, text) in a single turn.
* **Interface:**
~~~typescript
export type AiMessagePartType = 'text' | 'image' | 'tool-call' | 'tool-result';

export interface AiMessagePartDto {
    readonly type: AiMessagePartType;
    readonly text?: string;
    readonly imageUrl?: string;
    readonly toolCall?: AiToolCallDto;
    readonly toolCallId?: string;
    readonly toolCallName?: string;
    readonly toolResult?: string;
}

export interface AiMessageDto {
    readonly role: 'system' | 'user' | 'assistant' | 'tool';
    readonly parts: AiMessagePartDto[];
}
~~~

---
### 3.7. AiToolDto & AiToolCallDto

* **Purpose:** `AiToolDto` defines callable functions based on JSON Schema specifications. `AiToolCallDto` represents the specific execution request generated by the AI Agent.
* **Interface:**
~~~typescript
export interface AiToolDto {
    readonly name: string;
    readonly description: string;
    readonly parameters: Record<string, any>;
}

export interface AiToolCallDto {
    readonly id: string;
    readonly name: string;
    readonly arguments: Record<string, any>;
}
~~~

---
### 3.8. StructuredToolResultDto

* **Purpose:** The strict return signature required from all registered AI tools to prevent "blind error loops" and explicitly guide the Agent's next reasoning steps.
* **Interface:**
~~~typescript
export interface StructuredToolResultDto {
    readonly status: 'success' | 'retryable_error' | 'fatal_error';
    readonly data?: any;
    readonly errorMessage?: string;
}
~~~

---
### 3.9. AiCapabilitiesDto

* **Purpose:** Defines the specific features a registered AI adapter supports, allowing the UI to gracefully degrade features (e.g., disabling image uploads if vision is not supported).
* **Interface:**
~~~typescript
export interface AiCapabilitiesDto {
    readonly supportsStreaming: boolean;
    readonly supportsTools: boolean;
    readonly supportsVision: boolean;
    readonly supportsJsonMode: boolean;
}
~~~


---
## 4. Core Mediator (CoreBus)

The `CoreBus` is the central nervous system of the framework. UI components and Layer 1 Bridge Services must strictly use this mediator to dispatch commands and queries instead of interacting with repositories or state services directly.

* **`dispatch<TResult>(message: IMessage): Promise<TResult>`**
  * **Description:** Dispatches a securely typed Command or Query to its corresponding registered handler. Wraps the execution in global error handling and process monitoring.
* **`registerHandler(...)`**
  * **Description:** Registers a specific message class to a handler class. Used exclusively by System Plugins during the `CoreEngine` boot sequence.
* **`useMiddleware(middleware: IMiddleware): void`**
  * **Description:** Injects a global middleware (such as Security Guards or Monitors) into the execution pipeline.

---

## 5. AI Gateway & Agent Architecture

This section covers the core capabilities exposed for interacting with large language models, managing continuous agentic loops, and registering callable tools.

### 5.1. AiGatewayService

The primary stateless router for standard AI requests. It automatically resolves the active profile, decrypts API keys securely within the isolated vault, and handles the network communication with the mapped external provider adapter.

* **`dispatch(request: AiRequestDto, targetProfileId?: string, abortSignal?: AbortSignal): Observable<AiResponseDto>`**
  * **Description:** Executes a standard, single-turn full response task. Best suited for non-streaming background data extraction or JSON generation.
* **`dispatchStream(request: AiRequestDto, targetProfileId?: string, abortSignal?: AbortSignal): Observable<AiEventDto>`**
  * **Description:** Initiates a Server-Sent Events (SSE) connection to stream incremental text chunks and explicit tool-call events in real time.
* **`pingProfile(profileId: string): Observable<boolean>`**
  * **Description:** Performs a live network validation of the dynamically decrypted API key against the remote provider's servers.

### 5.2. AgentExecutorService

The advanced cognitive layer responsible for executing multi-step workflows. It actively manages token constraints and automatically orchestrates recursive tool execution loops without exposing intermediate reasoning steps to the UI.

* **`executeTask(request: AiRequestDto, targetProfileId?: string, maxIterations?: number, abortSignal?: AbortSignal): Promise<AiResponseDto>`**
  * **Description:** Executes a fully automated, Promise-based reasoning loop. It intercepts tool requests, safely executes them via the `AiToolRegistryService`, and feeds the structured results back to the model until a final text response is produced or `maxIterations` is hit.
* **`executeStreamTask(request: AiRequestDto, targetProfileId?: string, maxIterations?: number, abortSignal?: AbortSignal): Observable<AiEventDto>`**
  * **Description:** Executes a dynamic streaming agent task. It yields raw text chunks directly to the UI, automatically pauses the observable stream to execute intercepted tool calls behind the scenes, and invisibly resumes text generation.

### 5.3. AiToolRegistryService

The central registry where developer applications expose custom, deterministic local functions to the AI models.

* **`registerTool(definition: AiToolDto, handler: ToolHandler): void`**
  * **Description:** Registers a new tool into the global execution context. Tool names must be globally unique across all loaded plugins to prevent collisions.
* **`getRegisteredTools(): AiToolDto[]`**
  * **Description:** Returns the list of all currently registered tool definitions mapped in standard JSON Schema format.



## 6. Client-Side Security & Vault Management

The `SecurityService` is the sole authority for managing the cryptographic boundary of the application. It operates entirely in memory and exposes synchronous signals to the UI for reactive access control.

* **Signals:**
  * `isVaultUnlocked: Signal<boolean>` - Reflects whether the session master key is currently active in memory.
  * `isVaultConfigured: Signal<boolean>` - Indicates if a vault has been initialized in the database.

* **Methods:**
  * `setupVault(password: string): Promise<void>`
    * **Description:** Initializes the vault for the first time, generating salts and deriving the AES-GCM master key.
  * `unlockVault(password: string): Promise<boolean>`
    * **Description:** Attempts to unlock the vault. Implements an exponential backoff delay for failed attempts. Returns `true` if successful.
  * `lockVault(): void`
    * **Description:** Immediately purges the session master key from memory, broadcasting the locked state to the UI.
  * `destroyVault(): Promise<void>`
    * **Description:** Cryptographically shreds the vault and securely deletes all associated profiles in a single atomic transaction.

---

## 7. Global Infrastructure Services

These services manage the global state of the application ecosystem, providing UI monitoring, network resiliency, and data portability.

### 7.1. SystemMonitorService
Tracks overarching framework activities and catches unhandled asynchronous errors from the `CoreBus`.
* **Signals:**
  * `isProcessing: Signal<boolean>` - Tracks active processes across the `CoreBus`.
  * `latestError: Signal<string | null>` - Contains the most recent system-level error message.
* **Methods:** 
  * `clearError(): void` - Resets the error signal.

### 7.2. AiConnectionMonitorService
Maintains the real-time connection status of registered AI Profiles.
* **Signals:**
  * `connectionStates: Signal<Map<string, ProfileConnectionState>>` - A reactive map of profile IDs to their connection states (`Connected`, `Disconnected`, `InvalidKey`, `Unknown`).
* **Methods:**
  * `getState(profileId: string): ConnectionState` - Synchronously retrieves the current state of a specific profile.

### 7.3. SystemPortabilityService
Handles complete data migration and ecosystem resets within the isolated sandbox.
* **Methods:**
  * `exportEcosystem(): Promise<string>` - Exports all non-system application tables into a portable JSON format.
  * `importEcosystem(jsonString: string): Promise<void>` - Validates and restores ecosystem data from a payload string.
  * `softReset(): Promise<void>` - Clears all user-space application tables while preserving the `os_vault` and OS settings.
  * `factoryReset(): Promise<void>` - Completely deletes the IndexedDB instance and forcefully reloads the client.

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

## 9. Framework Error Codes (V1)

> [!warning]
Error codes in v1 are string literals. They are scheduled to be refactored into a centralized `FrameworkErrorCode` enum/const object in v2. All documented UI integrations should anticipate this structural upgrade.

When the `CoreBus` or AI Executor encounters a failure, a `FrameworkError` is thrown with one of the following predictable codes. The UI orchestrators should map these to localized, actionable feedback.

| Error Code | Description | Retryable |
| :--- | :--- | :--- |
| **`VAULT_LOCKED`** | The action was blocked because the vault is currently locked. | No |
| **`VAULT_MISSING`** | Attempted to unlock or access a vault that does not exist. | No |
| **`WEAK_PASSWORD`** | Provided master password does not meet the security criteria. | No |
| **`INVALID_API_KEY`** | The remote provider rejected the API key during validation. | No |
| **`PROFILE_NOT_FOUND`** | The requested AI profile ID does not exist in the database. | No |
| **`AI_AUTH_FAILED`** | Remote HTTP 401/403 failure during an active AI request. | No |
| **`AI_NETWORK_ERROR`** | Network timeout or 500+ failure from the AI provider. | Yes |
| **`AGENT_MAX_ITERATIONS`** | The AI agent exceeded the maximum allowed tool-call loops. | No |
| **`AGENT_ABORTED`** | The execution stream was manually cancelled by the user. | No |
| **`AGENT_FATAL_TOOL_ERROR`**| The agent halted due to a tool returning a `fatal_error` status. | No |
| **`SECURITY_VIOLATION`** | Detected an attempt to access a protected OS schema from user-space. | No |
| **`DB_SCHEMA_COLLISION`** | An application plugin attempted to register a duplicate table name. | No |
| **`TOOL_NAME_COLLISION`** | Two different plugins attempted to register a tool with the same name. | No |
| **`IMPORT_INVALID_FORMAT`** | The provided import string is not a valid Arena export schema. | No |