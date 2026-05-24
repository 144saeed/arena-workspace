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

### 3.1. AiProfileEntity

* **Purpose:** Represents a stored AI provider configuration within the Core database. Note that the UI typically receives a mapped safe version without encryption details.
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

### 3.2. AiRequestDto

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

### 3.3. AiResponseDto

* **Purpose:** Standardized response payload returned by any AI adapter after a successful generation.
* **Interface:**
~~~typescript
export interface AiResponseDto {
    readonly content: string;
    readonly tokensUsed?: number;
    readonly providerId: string;
    readonly toolCalls?: AiToolCallDto[];
}
~~~

### 3.4. AiMessageDto & AiMessagePartDto

* **Purpose:** Standardized multimodal message format for AI Agent interactions, replacing legacy flat strings with a robust parts array to support vision, tools, and text.
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

### 3.5. AiToolDto & AiToolCallDto

* **Purpose:** Defines callable functions (tools) based on JSON Schema and represents the AI's request to execute them.
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

### 3.6. StructuredToolResultDto

* **Purpose:** The strict return signature required from all registered AI tools to prevent blind error loops and guide the Agent safely.
* **Interface:**
~~~typescript
export interface StructuredToolResultDto {
    readonly status: 'success' | 'retryable_error' | 'fatal_error';
    readonly data?: any;
    readonly errorMessage?: string;
}
~~~

### 3.7. AiCapabilitiesDto

* **Purpose:** Defines the specific capabilities a registered AI adapter supports, allowing the UI to gracefully degrade features.
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

## 4. System Events & Live Streams

Streams exposed by the core (primarily for AI communications or critical system events) that the UI must listen to. All asynchronous streams utilize RxJS Observables and must be properly managed (or converted to Signals) at the UI boundary.

### 4.1. AI Gateway Stream (`dispatchStream`)

* **Source:** `AiGatewayService`
* **Description:** Initiates a direct Server-Sent Events (SSE) connection to the active AI provider adapter to stream responses in real-time.
* **Yields:** `Observable<AiEventDto>`

### 4.2. AI Agent Executor Stream (`executeStreamTask`)

* **Source:** `AgentExecutorService`
* **Description:** Executes a complex, multi-iteration streaming agent task. It proactively intercepts tool-call requests mid-stream, executes the corresponding tools securely within the core, and seamlessly resumes the text stream invisibly to the UI.
* **Yields:** `Observable<AiEventDto>`

---

## 5. Registered Plugins & System Adapters

List of native plugins and AI vendor adapters shipped with the core engine.

### 5.1. System Plugins

* **SystemAiProfilePlugin:** 
  * **App ID:** `system-ai-profile`
  * **Description:** A core OS plugin injected during the boot sequence. It securely manages the registration, updating, deletion, and selection of AI provider profiles. It inherently registers the `os_ai_profiles` schema and encrypts all API keys using the `CryptoService` before storage.
  * **Registered Handlers:**
    * `AddAiProfileCommand`
    * `UpdateAiProfileCommand`
    * `DeleteAiProfileCommand`
    * `SetActiveProfileCommand`
    * `GetAiProfilesQuery`
    * `GetProviderModelsQuery`
    * `GetModelsByProfileIdQuery`
    * `GetActiveProfileCapabilitiesQuery`

### 5.2. AI Adapters

* **GoogleGeminiAdapter:**
  * **Provider ID:** `google-gemini`
  * **Display Name:** Google Gemini
  * **Description:** The built-in native adapter for the Google Gemini API (`generativelanguage.googleapis.com`).
  * **Capabilities:** 
    * `supportsStreaming`: `true`
    * `supportsTools`: `true` (Full support for function calling schemas)
    * `supportsVision`: `true` (Supports base64 inline image data)
    * `supportsJsonMode`: `true` (Supports `application/json` response MIME type)