# Arena Core API Reference

> [!warning] Architecture Notice
> Note: Error codes in v1 are string literals. They are scheduled to be refactored into a centralized FrameworkErrorCode enum/const object in v2.

## 1. Core Commands (ICommand)

Commands represent intent to change the state of the Local Backend Server. All commands are dispatched via the `CoreBus` and process asynchronously.

### 1.1 AddAiProfileCommand
Registers a new AI provider profile configuration into the local storage ecosystem.

**Payload Structure:**
```typescript
export class AddAiProfileCommand implements ICommand {
  constructor(
    public readonly name: string,
    public readonly provider: string,
    public readonly rawApiKey: string,
    public readonly selectedModel: string
  ) {}
}
```
* **Return Type:** `Promise<string>` (Returns the generated UUID of the new profile)
* **Security & Constraints:** Requires an unlocked vault state.
* **Potential Error Codes:** `VAULT_LOCKED`, `INVALID_API_KEY`

### 1.2 UpdateAiProfileCommand
Modifies an existing AI provider profile configuration.

**Payload Structure:**
```typescript
export class UpdateAiProfileCommand implements ICommand {
  constructor(
    public readonly id: string,
    public readonly name?: string,
    public readonly selectedModel?: string,
    public readonly rawApiKey?: string
  ) {}
}
```
* **Return Type:** `Promise<void>`
* **Security & Constraints:** Requires an unlocked vault state.
* **Potential Error Codes:** `VAULT_LOCKED`, `PROFILE_NOT_FOUND`, `INVALID_API_KEY`

### 1.3 SetActiveProfileCommand
Sets a specific AI profile as the globally active provider for immediate dispatch and agentic execution.

**Payload Structure:**
```typescript
export class SetActiveProfileCommand implements ICommand {
  constructor(
    public readonly id: string
  ) {}
}
```
* **Return Type:** `Promise<void>`
* **Security & Constraints:** Requires an unlocked vault state.
* **Potential Error Codes:** `VAULT_LOCKED`, `PROFILE_NOT_FOUND`

### 1.4 DeleteAiProfileCommand
Permanently deletes an AI profile configuration from the local backend store.

**Payload Structure:**
```typescript
export class DeleteAiProfileCommand implements ICommand {
  constructor(
    public readonly id: string
  ) {}
}
```
* **Return Type:** `Promise<void>`
* **Security & Constraints:** Requires an unlocked vault state.
* **Potential Error Codes:** `VAULT_LOCKED`

---

## 2. Core Queries (IQuery)

Queries are read-only operations executed against the local backend server state. They return highly typed data promises.

### 2.1 GetAiProfilesQuery
Retrieves an array of all configured AI profiles available to the client UI.
* **Payload Structure:** Empty constructor.
* **Return Type:** `Promise<SafeAiProfileDto[]>`
* **Security & Constraints:** Requires an unlocked vault.
* **Potential Error Codes:** `VAULT_LOCKED`

### 2.2 GetProviderModelsQuery
Retrieves a list of available models for a specific provider.
* **Payload Structure:**
```typescript
export class GetProviderModelsQuery implements IQuery {
  constructor(
    public readonly providerId: string,
    public readonly rawApiKey: string
  ) {}
}
```
* **Return Type:** `Promise<string[]>`
* **Security & Constraints:** Designed for pre-flight testing. Bypasses the vault constraint.
* **Potential Error Codes:** `INVALID_API_KEY`, `ADAPTER_NOT_FOUND`

### 2.3 GetModelsByProfileIdQuery
Retrieves a list of available models based on an existing profile's configuration.
* **Payload Structure:**
```typescript
export class GetModelsByProfileIdQuery implements IQuery {
  constructor(public readonly profileId: string) {}
}
```
* **Return Type:** `Promise<string[]>`
* **Security & Constraints:** Requires an unlocked vault.
* **Potential Error Codes:** `VAULT_LOCKED`, `PROFILE_NOT_FOUND`, `INVALID_API_KEY`

### 2.4 GetActiveProfileCapabilitiesQuery
Retrieves the capability matrix for the currently active AI profile.
* **Payload Structure:** Empty constructor.
* **Return Type:** `Promise<AiCapabilitiesDto | undefined>`
* **Security & Constraints:** Requires an unlocked vault.
* **Potential Error Codes:** `VAULT_LOCKED`

---

## 3. Data Transfer Objects (DTOs)

All data structures passing across the process boundary between the UI client and the Core server are strictly immutable, matching the Signal-First paradigm of the frontend layer.

### 3.1 SafeAiProfileDto
Exposes safe AI profile metadata for UI rendering and active state identification.

```typescript
export interface SafeAiProfileDto {
  id: string;
  name: string;
  provider: string;
  isActive: boolean;
  selectedModel: string;
}
```

### 3.2 AiRequestDto
The standard request format delivered to dispatchers and agentic loop executors.

```typescript
export interface AiRequestDto {
  readonly messages: readonly AiMessageDto[];
  readonly tools?: readonly AiToolDto[];
  readonly temperature?: number;
  readonly model?: string;
  readonly expectJson?: boolean;
}
```

### 3.3 AiResponseDto
The absolute final response state emitted upon completion of a non-streaming AI process.

```typescript
export interface AiResponseDto {
  readonly content: string;
  readonly tokensUsed?: number;
  readonly providerId: string;
  readonly toolCalls?: AiToolCallDto[];
}
```

### 3.4 AiMessageDto
Represents a structured conversational historical unit or model turn. (System instructions should be passed using `role: 'system'`).

```typescript
export interface AiMessageDto {
  readonly role: 'user' | 'assistant' | 'system' | 'tool';
  readonly parts: readonly AiMessagePartDto[];
}
```

### 3.5 AiMessagePartDto
A flat interface defining a text fragment, an image element, an incoming tool call request, or an executed tool result.

```typescript
export interface AiMessagePartDto {
  readonly type: AiMessagePartType; // 'text' | 'image' | 'tool-call' | 'tool-result'
  readonly text?: string;
  readonly imageUrl?: string;
  readonly toolCall?: AiToolCallDto;
  readonly toolCallId?: string;
  readonly toolCallName?: string;
  readonly toolResult?: string;
}
```

### 3.6 AiToolDto, AiToolCallDto & StructuredToolResultDto

```typescript
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

export interface StructuredToolResultDto {
  readonly status: 'success' | 'retryable_error' | 'fatal_error';
  readonly data?: any;
  readonly errorMessage?: string;
}
```

### 3.7 AiCapabilitiesDto
A capability matrix declaring what features the active backend adapter safely supports.

```typescript
export interface AiCapabilitiesDto {
  readonly supportsStreaming: boolean;
  readonly supportsTools: boolean;
  readonly supportsVision: boolean;
  readonly supportsJsonMode: boolean;
}
```

### 3.8 AiEventDto
Represents real-time incremental tokens, intermediary tool execution updates, or complete response objects emitted inside AI live streams.

```typescript
export type AiEventType = 'chunk' | 'tool-call' | 'complete' | 'error';

export interface AiEventDto {
  readonly type: AiEventType;
  readonly content?: string;
  readonly toolCalls?: AiToolCallDto[];
  readonly error?: string;
  readonly tokensUsed?: number;
}
```

---

## 4. System Events & Live Streams

### 4.1 AiGatewayService
The primary entry point for dispatching standard AI requests. It handles routing to the active profile's adapter and managing the lifecycle of the request.

```typescript
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
```
**Execution Notes:** If `profileId` is omitted, the service defaults to the globally active profile. `abortSignal` can be used to terminate ongoing streams or requests.

### 4.2 AgentExecutorService
Manages the autonomous agentic loop. Evaluates tool calls, executes them locally, and iterates.

```typescript
export class AgentExecutorService {
  public executeTask(
    request: AiRequestDto,
    profileId?: string,
    maxIterations?: number, // Defaults to 5
    abortSignal?: AbortSignal
  ): Promise<AiResponseDto>;

  public executeStreamTask(
    request: AiRequestDto,
    profileId?: string,
    maxIterations?: number, // Defaults to 5
    abortSignal?: AbortSignal
  ): Observable<AiEventDto>;
}
```

### 4.3 SystemMonitorService
Provides reactive monitoring for the overall local framework ecosystem and engine status.

```typescript
export class SystemMonitorService {
  public readonly isProcessing: Signal<boolean>;
  public readonly latestError: Signal<string | null>;
}
```

---

## 5. Core Command Bus (CQRS)

The `CoreBus` is the central nervous system. All UI intents must pass through this bus as either Commands or Queries. Direct service injection from the UI to the Core is strictly prohibited.

```typescript
export class CoreBus {
  public dispatch<T>(message: ICommand | IQuery): Promise<T>;
  public useMiddleware(middleware: IBusMiddleware): void;
  public registerHandler(MessageClass: any, HandlerClass: any): void;
}
```
*Middleware Execution Order: Middlewares are executed in the exact order they are registered. The Security middleware must always be the first registered interceptor.*

---

## 6. Plugin, Tool & Database System

The Arena framework is designed to be highly extensible. Features are packaged as plugins that register their own Commands, Queries, AI Tools, and Database Schemas.

### 6.1 IAppPlugin & IDbSchema
To create a plugin, implement the `IAppPlugin` interface and define your custom database tables via `IDbSchema`.

```typescript
export interface IDbSchema {
  // Schema definition structure
}

export interface IAppPlugin {
  readonly appId: string;
  readonly requiredDbSchemas: IDbSchema[];
  registerHandlers(coreBus: CoreBus): void;
}
```

### 6.2 Public Database Access
Plugins and Custom Handlers must interact with the database exclusively through `PublicDataStoreService` and the `BaseRepository` architecture.

```typescript
export class BaseRepository<T, TKey> {
  public getAll(): Promise<T[]>;
  public getById(id: TKey): Promise<T | undefined>;
  public create(entity: T): Promise<TKey>;
  public update(id: TKey, changes: Partial<T>): Promise<number>;
  public delete(id: TKey): Promise<void>;
  public bulkPut(entities: T[]): Promise<void>;
}

export class PublicDataStoreService {
  public getTable<TEntity, TKey>(tableName: string): Table<TEntity, TKey>;
}
```

### 6.3 Built-in Plugins & Adapters
* **SystemAiProfilePlugin**: Automatically registers base commands (`AddAiProfileCommand`, `GetAiProfilesQuery`, etc.).
* **GoogleGeminiAdapter**: The built-in AI Adapter, exposing `capabilities` (Streaming, Vision, Tools).

### 6.4 AiToolRegistryService & Execution Context
The centralized registry where local backend capabilities are exposed as executable tools for the AI agentic loops.

```typescript
export interface IToolExecutionContext {
  readonly injector: Injector;
  readonly abortSignal?: AbortSignal;
}

export type ToolHandler = (
  args: Record<string, any>,
  context: IToolExecutionContext
) => Promise<StructuredToolResultDto>;

export class AiToolRegistryService {
  public registerTool(definition: AiToolDto, handler: ToolHandler): void;
  public getRegisteredTools(): AiToolDto[];
}
```

---

## 7. Core Storage, Security & Portability

The Arena framework operates strictly on a Zero-Knowledge local storage architecture.

### 7.1 SecurityService
Manages the encryption vault and exposes reactive signals for the UI to monitor authentication states.

```typescript
export class SecurityService {
  public readonly isVaultUnlocked: Signal<boolean>;
  public readonly isVaultConfigured: Signal<boolean>;

  public initializeState(): Promise<void>;
  public setupVault(password: string): Promise<void>;
  public unlockVault(password: string): Promise<boolean>;
  public lockVault(): void;
  public destroyVault(): Promise<void>;
}
```

### 7.2 SystemPortabilityService
Handles the import, export, and lifecycle resets of the local ecosystem.

```typescript
export class SystemPortabilityService {
  public exportEcosystem(): Promise<string>;
  public importEcosystem(jsonString: string): Promise<void>;
  public softReset(): Promise<void>;
  public factoryReset(): Promise<void>;
}
```

---

## 8. Connection & Telemetry

### 8.1 AiConnectionMonitorService
Monitors and retains the real-time connection status of all AI Profiles using Angular Signals.

```typescript
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
```

---

## 9. Framework Error Codes Catalog

When a Command or Query fails, it rejects with a specific string literal error code explicitly thrown by the `FrameworkError` exception. 

| Error Code                | Thrown By                                                | Description                                                                         |
| :------------------------ | :------------------------------------------------------- | :---------------------------------------------------------------------------------- |
| `VAULT_LOCKED`            | Security Middleware, SecurityService, PortabilityService | Thrown when attempting to execute a secure command/query while the vault is locked. |
| `VAULT_EXISTS`            | SecurityService (`setupVault`)                           | Thrown when attempting to setup a vault that is already configured.                 |
| `VAULT_MISSING`           | SecurityService (`unlockVault`)                          | Thrown when unlocking is attempted but no vault exists.                             |
| `NOT_BOOTED`              | SecurityService (`setupVault`)                           | Thrown when operations are called before core boot completes.                       |
| `WEAK_PASSWORD`           | SecurityService (`setupVault`)                           | Thrown when the provided master password fails strength constraints.                |
| `INVALID_APP_IDENTITY`    | CoreDatabaseService                                      | Thrown when the application identity prefix is invalid.                             |
| `SECURITY_VIOLATION`      | PublicDataStoreService, SchemaManagerService             | Thrown when a system table is accessed illegally.                                   |
| `DB_SCHEMA_COLLISION`     | SchemaManagerService                                     | Thrown when plugins attempt to register overlapping table names.                    |
| `REGISTRY_COLLISION`      | CoreBus                                                  | Thrown when registering a handler for a command that already has one.               |
| `HANDLER_NOT_FOUND`       | CoreBus                                                  | Thrown when dispatching a message with no registered handler.                       |
| `ADAPTER_COLLISION`       | AiRegistryService                                        | Thrown when registering an AI adapter with a duplicate ID.                          |
| `ADAPTER_NOT_FOUND`       | AiRegistryService, `GetProviderModelsHandler`            | Thrown when requesting an unregistered AI provider adapter.                         |
| `TOOL_NAME_COLLISION`     | AiToolRegistryService                                    | Thrown when registering a tool name that is already taken.                          |
| `PROFILE_NOT_FOUND`       | Update/SetActive/GetModels Handlers                      | Thrown when referencing an AI profile ID that does not exist.                       |
| `AI_PROFILE_NOT_FOUND`    | AiGatewayService                                         | Thrown when dispatching a request without a valid active profile.                   |
| `INVALID_API_KEY`         | Adapter Handlers, Profile Handlers                       | Thrown when the provided API key is rejected by the provider.                       |
| `AI_AUTH_FAILED`          | GoogleGeminiAdapter, AiGatewayService                    | Thrown when provider authentication fails during execution.                         |
| `AI_NETWORK_ERROR`        | GoogleGeminiAdapter, AiGatewayService                    | Thrown on network timeout or unreachable provider endpoint.                         |
| `AI_STREAM_ERROR`         | AgentExecutorService                                     | Thrown when an active streaming response abruptly terminates.                       |
| `STREAM_BODY_MISSING`     | GoogleGeminiAdapter                                      | Thrown when the provider returns an empty stream payload.                           |
| `AGENT_ABORTED`           | AgentExecutorService                                     | Thrown when the agent execution is cancelled via `AbortSignal`.                     |
| `AGENT_EMPTY_RESPONSE`    | AgentExecutorService                                     | Thrown when the agent loop completes without producing content.                     |
| `AGENT_FATAL_TOOL_ERROR`  | AgentExecutorService                                     | Thrown when a tool execution returns a `fatal_error` status.                        |
| `AGENT_MAX_ITERATIONS`    | AgentExecutorService                                     | Thrown when the agent exceeds the `maxIterations` limit.                            |
| `IMPORT_PARSE_ERROR`      | SystemPortabilityService                                 | Thrown when the imported JSON payload is malformed.                                 |
| `IMPORT_INVALID_FORMAT`   | SystemPortabilityService                                 | Thrown when the JSON structure does not match the ecosystem schema.                 |
| `IMPORT_STRUCTURAL_ERROR` | SystemPortabilityService                                 | Thrown when database schemas clash during import.                                   |
| `IMPORT_DOS_RISK`         | SystemPortabilityService                                 | Thrown when the import payload exceeds safe size limits.                            |
| `IMPORT_FAILED`           | SystemPortabilityService                                 | Thrown on general import failure.                                                   |
| `FACTORY_RESET_FAILED`    | SystemPortabilityService                                 | Thrown when the database deletion fails during a factory reset.                     |