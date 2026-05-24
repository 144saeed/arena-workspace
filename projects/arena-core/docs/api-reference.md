# Arena Core API Reference

---

## 1. Core Commands (ICommand)

Commands represent intent to change the state of the Local Backend Server. All commands are dispatched via the `CoreBus` and process synchronously or asynchronously depending on the domain scope.

> [!warning] Error Codes Literal Warning
> Note: Error codes in v1 are string literals. They are scheduled to be refactored into a centralized FrameworkErrorCode enum/const object in v2.

### 1.1 AddAiProfileCommand
Registers a new AI provider profile configuration into the local storage ecosystem.
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
* **Security & Constraints:** Requires an unlocked vault state.
* **Potential Error Codes:** `VAULT_LOCKED`, `INVALID_API_KEY`, `DUPLICATE_PROFILE_NAME`

### 1.2 UpdateAiProfileCommand
Modifies an existing AI provider profile configuration.
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
* **Security & Constraints:** Requires an unlocked vault state.
* **Potential Error Codes:** `VAULT_LOCKED`, `AI_PROFILE_NOT_FOUND`, `INVALID_API_KEY`

### 1.3 SetActiveProfileCommand
Sets a specific AI profile as the globally active provider for immediate dispatch and agentic execution.
* **Payload Structure:**
~~~typescript
export class SetActiveProfileCommand implements ICommand {
  constructor(
    public readonly id: string
  ) {}
}
~~~
* **Security & Constraints:** Requires an unlocked vault state.
* **Potential Error Codes:** `VAULT_LOCKED`, `AI_PROFILE_NOT_FOUND`

### 1.4 DeleteAiProfileCommand
Permanently deletes an AI profile configuration from the local backend store.
* **Payload Structure:**
~~~typescript
export class DeleteAiProfileCommand implements ICommand {
  constructor(
    public readonly id: string
  ) {}
}
~~~
* **Security & Constraints:** Requires an unlocked vault state.
* **Potential Error Codes:** `VAULT_LOCKED`, `AI_PROFILE_NOT_FOUND`

---

## 2. Core Queries (IQuery)

Queries are read-only operations executed against the local backend server state. They return highly typed data promises.

### 2.1 GetAiProfilesQuery
Retrieves an array of all configured AI profiles available to the dumb client UI.
* **Payload Structure:** Empty constructor.
* **Return Type:** `Promise<SafeAiProfileDto[]>`
* **Security & Constraints:** Requires an unlocked vault.
* **Potential Error Codes:** `VAULT_LOCKED`

### 2.2 GetProviderModelsQuery
Retrieves a list of available models for a specific provider.
* **Payload Structure:**
~~~typescript
export class GetProviderModelsQuery implements IQuery {
  constructor(public readonly providerId: string) {}
}
~~~
* **Return Type:** `Promise<string[]>`
* **Security & Constraints:** Requires an unlocked vault.
* **Potential Error Codes:** `VAULT_LOCKED`

### 2.3 GetModelsByProfileIdQuery
Retrieves a list of available models based on an existing profile's configuration.
* **Payload Structure:**
~~~typescript
export class GetModelsByProfileIdQuery implements IQuery {
  constructor(public readonly profileId: string) {}
}
~~~
* **Return Type:** `Promise<string[]>`
* **Security & Constraints:** Requires an unlocked vault.
* **Potential Error Codes:** `VAULT_LOCKED`, `AI_PROFILE_NOT_FOUND`

### 2.4 GetActiveProfileCapabilitiesQuery
Retrieves the capability matrix for the currently active AI profile.
* **Payload Structure:** Empty constructor.
* **Return Type:** `Promise<AiCapabilitiesDto>`
* **Security & Constraints:** Requires an unlocked vault.
* **Potential Error Codes:** `VAULT_LOCKED`, `AI_PROFILE_NOT_FOUND`

---

## 3. Data Transfer Objects (DTOs)

All data structures passing across the process boundary between the UI client and the Core server are strictly immutable, matching the Signal-First paradigm of the frontend layer.

### 3.1 SafeAiProfileDto
Exposes safe AI profile metadata for UI rendering and active state identification.
~~~typescript
export interface SafeAiProfileDto {
  readonly id: string;
  readonly name: string;
  readonly provider: string;
  readonly isActive: boolean;
  readonly selectedModel: string;
}
~~~

### 3.2 AiRequestDto
The standard request format delivered to dispatchers and agentic loop executors.
~~~typescript
export interface AiRequestDto {
  readonly messages: readonly AiMessageDto[];
  readonly systemInstruction?: string;
  readonly tools?: readonly AiToolDto[];
  readonly temperature?: number;
  readonly maxOutputTokens?: number;
  readonly model?: string;
}
~~~

### 3.3 AiResponseDto
The absolute final response state emitted upon completion of a non-streaming AI process.
~~~typescript
export interface AiResponseDto {
  readonly message: AiMessageDto;
  readonly usage: {
    readonly promptTokens: number;
    readonly completionTokens: number;
    readonly totalTokens: number;
  };
  readonly terminationReason: 'stop' | 'length' | 'tool_calls' | 'content_filter';
}
~~~

### 3.4 AiMessageDto
Represents a structured conversational historical unit or model turn.
~~~typescript
export interface AiMessageDto {
  readonly role: 'user' | 'assistant' | 'system' | 'tool';
  readonly parts: readonly AiMessagePartDto[];
}
~~~

### 3.5 AiMessagePartDto
A discriminated union defining a text fragment, an incoming tool call request, or an executed tool result.
~~~typescript
export type AiMessagePartDto =
  | { readonly type: 'text'; readonly text: string }
  | { readonly type: 'tool-call'; readonly toolCall: AiToolCallDto }
  | { readonly type: 'tool-result'; readonly toolCallId: string; readonly toolCallName: string; readonly toolResult: any };
~~~

### 3.6 AiToolDto
The schema contract passed to the AI adapter specifying an executable application tool capability.
~~~typescript
export interface AiToolDto {
  readonly name: string;
  readonly description: string;
  readonly parameters: Record<string, any>;
}
~~~

### 3.7 AiToolCallDto
An invocation request from the model layer to execute a local framework capability.
~~~typescript
export interface AiToolCallDto {
  readonly id: string;
  readonly name: string;
  readonly arguments: Record<string, any>;
}
~~~

### 3.8 StructuredToolResultDto
A discriminated union containing the localized operational output or error state of an executed tool.
~~~typescript
export type StructuredToolResultDto =
  | { readonly status: 'success'; readonly data: any }
  | { readonly status: 'fatal_error'; readonly errorMessage: string };
~~~

### 3.9 AiCapabilitiesDto
A capability matrix declaring what features the active backend adapter safely supports.
~~~typescript
export interface AiCapabilitiesDto {
  readonly supportsStreaming: boolean;
  readonly supportsTools: boolean;
  readonly supportsSystemInstruction: boolean;
  readonly maxContextWindow: number;
}
~~~

### 3.10 AiEventDto
Represents real-time incremental tokens, intermediary tool execution updates, or complete response objects emitted inside AI live streams.
~~~typescript
export interface AiEventDto {
  readonly type: 'token' | 'tool-call' | 'complete' | 'error';
  readonly text?: string;
  readonly toolCall?: AiToolCallDto;
  readonly response?: AiResponseDto;
  readonly error?: string;
}
~~~

---
## 4. System Events & Live Streams

The AI Engine heavily utilizes reactive streams (RxJS Observables) to emit live token generation events, tool execution statuses, and system monitors.

### 4.1 AiGatewayService
The primary entry point for dispatching standard AI requests. It handles routing to the active profile's adapter and managing the lifecycle of the request.

~~~typescript
export class AiGatewayService {
  public dispatch(
    request: AiRequestDto,
    profileId?: string,
    abortSignal?: AbortSignal
  ): Observable<AiResponseDto>;

  public dispatchStream(
    request: AiRequestDto,
    profileId?: string,
    abortSignal?: AbortSignal
  ): Observable<AiEventDto>;

  public pingProfile(profileId: string): Observable<boolean>;
}
~~~

### 4.2 AgentExecutorService
Manages the autonomous agentic loop. It evaluates tool calls from the model, executes them via the local `AiToolRegistryService`, and iteratively feeds the localized results back to the model.

~~~typescript
export class AgentExecutorService {
  public executeTask(
    request: AiRequestDto,
    profileId?: string,
    maxIterations?: number,
    abortSignal?: AbortSignal
  ): Promise<AiResponseDto>;

  public executeStreamTask(
    request: AiRequestDto,
    profileId?: string,
    maxIterations?: number,
    abortSignal?: AbortSignal
  ): Observable<AiEventDto>;
}
~~~

### 4.3 SystemMonitorService
Provides reactive monitoring for the overall local framework ecosystem and engine status.

~~~typescript
export class SystemMonitorService {
  public getSystemState(): Observable<any>;
}
~~~

---

## 5. Core Command Bus (CQRS)

The `CoreBus` is the central nervous system of the Arena framework. All UI intents must pass through this bus as either Commands or Queries. Direct service injection from the UI to the Core is strictly prohibited.

### 5.1 CoreBus API
~~~typescript
export class CoreBus {
  public dispatch<T>(message: ICommand | IQuery): Promise<T>;

  public useMiddleware(middleware: IBusMiddleware): void;

  public registerHandler(MessageClass: any, HandlerClass: any): void;
}
~~~

> [!warning] Middleware Execution Order
> Middlewares are executed in the exact order they are registered. The Security middleware must always be the first registered interceptor in the boot sequence.

---

## 6. Plugin & Tool System

The Arena framework is designed to be highly extensible. Features are packaged as plugins that register their own Commands, Queries, and AI Tools.

### 6.1 Built-in Plugins
* **SystemAiProfilePlugin:** Registers `AddAiProfileCommand`, `UpdateAiProfileCommand`, `GetAiProfilesQuery`, etc., and manages the foundational AI state.

### 6.2 AiToolRegistryService
The centralized registry where local backend capabilities are exposed as executable tools for the AI agentic loops.

~~~typescript
export type ToolHandler = (
  args: Record<string, any>,
  context: IToolExecutionContext
) => Promise<StructuredToolResultDto>;

export class AiToolRegistryService {
  public registerTool(definition: AiToolDto, handler: ToolHandler): void;

  public getRegisteredTools(): AiToolDto[];
}
~~~

---
## 7. Core Storage, Security & Portability

The Arena framework operates strictly on a Zero-Knowledge local storage architecture. The UI has absolutely no direct access to unencrypted payloads or cryptographic keys.

### 7.1 SecurityService
Manages the encryption vault and exposes reactive signals for the UI to monitor authentication states.

~~~typescript
export class SecurityService {
  // Reactive state signals for UI binding
  public readonly isVaultUnlocked: Signal<boolean>;
  public readonly isVaultConfigured: Signal<boolean>;

  /**
   * Initializes the vault configuration state.
   * Called by the CoreEngine during the boot sequence.
   */
  public initializeState(): Promise<void>;

  /**
   * Creates a new master vault.
   */
  public setupVault(password: string): Promise<void>;

  /**
   * Attempts to unlock the local vault.
   * Returns true if successful, false if the password is incorrect.
   */
  public unlockVault(password: string): Promise<boolean>;

  /**
   * Immediately locks the vault and flushes decrypted keys from memory.
   */
  public lockVault(): void;

  /**
   * Cryptographically shreds the vault and all dead AI profiles.
   * Executed within an ACID transaction to prevent orphaned data.
   */
  public destroyVault(): Promise<void>;
}
~~~

> [!warning] Security Architecture
> The `getSessionKey` method is strictly internal to the Core Engine and is not exposed to the UI layer to maintain the Zero-Knowledge paradigm.

### 7.2 SystemPortabilityService
Handles the import, export, and lifecycle resets of the local ecosystem.

~~~typescript
export class SystemPortabilityService {
  /**
   * Exports the entire configured ecosystem (excluding sensitive vault data) as a serialized string.
   */
  public exportEcosystem(): Promise<string>;

  /**
   * Restores an exported ecosystem payload.
   */
  public importEcosystem(jsonString: string): Promise<void>;

  /**
   * Performs a soft reset, clearing active sessions but retaining the vault and profiles.
   */
  public softReset(): Promise<void>;
  
  /**
   * Performs a complete factory reset, destroying all local data.
   */
  public factoryReset(): Promise<void>;
}
~~~

---

## 8. Connection & Telemetry

### 8.1 AiConnectionMonitorService
Monitors and retains the real-time connection status of all AI Profiles. Utilizes Angular Signals to provide reactive, immediate updates to the UI.

~~~typescript
export type ConnectionState = 'Connected' | 'Disconnected' | 'InvalidKey' | 'Unknown';

export interface ProfileConnectionState {
  profileId: string;
  state: ConnectionState;
  lastChecked: Date;
}

export class AiConnectionMonitorService {
  public readonly connectionStates: Signal<Map<string, ProfileConnectionState>>;

  public updateState(profileId: string, state: ConnectionState): void;

  public getState(profileId: string): ConnectionState;
}
~~~

---

## 9. Framework Error Codes Catalog

When a Command or Query fails, it rejects with a specific string literal error code explicitly thrown by the `FrameworkError` exception. The dumb client UI must match these exact codes to present localized error messages.

| Error Code | Thrown By |
| :--- | :--- |
| `VAULT_LOCKED` | SecurityGuardMiddleware, SecurityService, SystemPortabilityService |
| `VAULT_EXISTS` | SecurityService (setupVault) |
| `VAULT_MISSING` | SecurityService (unlockVault) |
| `NOT_BOOTED` | SecurityService (setupVault) |
| `WEAK_PASSWORD` | SecurityService (setupVault) |
| `INVALID_APP_IDENTITY` | CoreDatabaseService (resolveAndValidateDbPrefix) |
| `SECURITY_VIOLATION` | PublicDataStoreService, SchemaManagerService |
| `DB_SCHEMA_COLLISION` | SchemaManagerService |
| `REGISTRY_COLLISION` | CoreBus |
| `HANDLER_NOT_FOUND` | CoreBus |
| `ADAPTER_COLLISION` | AiRegistryService |
| `ADAPTER_NOT_FOUND` | AiRegistryService |
| `TOOL_NAME_COLLISION` | AiToolRegistryService |
| `PROFILE_NOT_FOUND` | UpdateAiProfileHandler, SetActiveProfileHandler, GetModelsByProfileIdHandler |
| `AI_PROFILE_NOT_FOUND` | AiGatewayService |
| `INVALID_API_KEY` | AddAiProfileHandler, UpdateAiProfileHandler, GetProviderModelsHandler, GetModelsByProfileIdHandler |
| `AI_AUTH_FAILED` | GoogleGeminiAdapter, AiGatewayService |
| `AI_NETWORK_ERROR` | GoogleGeminiAdapter, AiGatewayService |
| `AI_STREAM_ERROR` | AgentExecutorService |
| `STREAM_BODY_MISSING` | GoogleGeminiAdapter |
| `AGENT_ABORTED` | AgentExecutorService |
| `AGENT_EMPTY_RESPONSE` | AgentExecutorService |
| `AGENT_FATAL_TOOL_ERROR` | AgentExecutorService |
| `AGENT_MAX_ITERATIONS` | AgentExecutorService |
| `IMPORT_PARSE_ERROR` | SystemPortabilityService |
| `IMPORT_INVALID_FORMAT` | SystemPortabilityService |
| `IMPORT_STRUCTURAL_ERROR` | SystemPortabilityService |
| `IMPORT_DOS_RISK` | SystemPortabilityService |
| `IMPORT_FAILED` | SystemPortabilityService |
| `FACTORY_RESET_FAILED` | SystemPortabilityService |