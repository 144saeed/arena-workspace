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
class AddAiProfileCommand implements ICommand {
  constructor(
    public readonly name: string,
    public readonly provider: 'google' | 'openai' | 'anthropic',
    public readonly apiKey: string,
    public readonly config: Record<string, any>
  ) {}
}
~~~
* **Security & Constraints:** Requires an unlocked vault state.
* **Potential Error Codes:** * `VAULT_LOCKED`
  * `INVALID_API_KEY`
  * `DUPLICATE_PROFILE_NAME`

### 1.2 UpdateAiProfileCommand
Modifies an existing AI provider profile configuration.
* **Payload Structure:**
~~~typescript
class UpdateAiProfileCommand implements ICommand {
  constructor(
    public readonly id: string,
    public readonly updates: {
      readonly name?: string;
      readonly apiKey?: string;
      readonly config?: Record<string, any>;
    }
  ) {}
}
~~~
* **Security & Constraints:** Requires an unlocked vault state.
* **Potential Error Codes:** * `VAULT_LOCKED`
  * `AI_PROFILE_NOT_FOUND`
  * `INVALID_API_KEY`

### 1.3 SetActiveProfileCommand
Sets a specific AI profile as the globally active provider for immediate dispatch and agentic execution.
* **Payload Structure:**
~~~typescript
class SetActiveProfileCommand implements ICommand {
  constructor(
    public readonly id: string
  ) {}
}
~~~
* **Security & Constraints:** Requires an unlocked vault state.
* **Potential Error Codes:** * `VAULT_LOCKED`
  * `AI_PROFILE_NOT_FOUND`

### 1.4 DeleteAiProfileCommand
Permanently deletes an AI profile configuration from the local backend store.
* **Payload Structure:**
~~~typescript
class DeleteAiProfileCommand implements ICommand {
  constructor(
    public readonly id: string
  ) {}
}
~~~
* **Security & Constraints:** Requires an unlocked vault state.
* **Potential Error Codes:** * `VAULT_LOCKED`
  * `AI_PROFILE_NOT_FOUND`

---

## 2. Core Queries (IQuery)

Queries are read-only operations executed against the local backend server state. They return highly typed data promises.

### 2.1 GetAiProfilesQuery
Retrieves an array of all configured AI profiles available to the dumb client UI.
* **Payload Structure:** Empty constructor.
* **Return Type:** `Promise<SafeAiProfileDto[]>`
* **Security & Constraints:** Requires an unlocked vault. If locked, rejects immediately.
* **Potential Error Codes:** `VAULT_LOCKED`

### 2.2 GetActiveProfileQuery
Retrieves the currently selected and active AI profile metadata.
* **Payload Structure:** Empty constructor.
* **Return Type:** `Promise<SafeAiProfileDto | null>`
* **Security & Constraints:** Requires an unlocked vault.
* **Potential Error Codes:** `VAULT_LOCKED`

---

## 3. Data Transfer Objects (DTOs)

All data structures passing across the process boundary between the UI client and the Core server are strictly immutable, matching the Signal-First paradigm of the frontend layer.

### 3.1 SafeAiProfileDto
Exposes AI profile metadata without leaking sensitive credentials like API keys.
~~~typescript
export interface SafeAiProfileDto {
  readonly id: string;
  readonly name: string;
  readonly provider: 'google' | 'openai' | 'anthropic';
  readonly config: Record<string, any>;
  readonly createdAt: string;
}
~~~

### 3.2 AiRequestDto
The universal payload structure delivered to dispatchers and agentic loop executors.
~~~typescript
export interface AiRequestDto {
  readonly messages: readonly AiMessageDto[];
  readonly systemInstruction?: string;
  readonly tools?: readonly AiToolDto[];
  readonly temperature?: number;
  readonly maxOutputTokens?: number;
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
  readonly role: 'user' | 'model' | 'system' | 'tool';
  readonly parts: readonly AiMessagePartDto[];
}
~~~

### 3.5 AiMessagePartDto
Defines a multimodal or polymorphic unit within a message context.
~~~typescript
export interface AiMessagePartDto {
  readonly text?: string;
  readonly toolCall?: AiToolCallDto;
  readonly toolResult?: StructuredToolResultDto;
}
~~~

### 3.6 AiToolDto
The schema contract passed to the AI adapter specifying an executable application tool capability.
~~~typescript
export interface AiToolDto {
  readonly name: string;
  readonly description: string;
  readonly parameters: Record<string, any>; // JSON Schema object
}
~~~

### 3.7 AiToolCallDto
An invitation from the model layer to execute a local framework capability.
~~~typescript
export interface AiToolCallDto {
  readonly id: string;
  readonly name: string;
  readonly args: Record<string, any>;
}
~~~

### 3.8 StructuredToolResultDto
The return payload containing the localized operational output of an executed tool.
~~~typescript
export interface StructuredToolResultDto {
  readonly callId: string;
  readonly toolName: string;
  readonly result: any;
  readonly isError: boolean;
}
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


## 4. System Events & Live Streams

The AI Engine heavily utilizes reactive streams (RxJS Observables) to emit live token generation events, tool execution statuses, and connection monitors.

### 4.1 AiGatewayService
The primary entry point for dispatching standard AI requests. It handles routing to the active profile's adapter and managing the lifecycle of the request.

~~~typescript
class AiGatewayService {
  /**
   * Dispatches a single-turn request and waits for the complete response.
   */
  public dispatch(
    request: AiRequestDto,
    profileId?: string,
    abortSignal?: AbortSignal
  ): Observable<AiResponseDto>;

  /**
   * Dispatches a request and returns a stream of real-time events (tokens, tool calls).
   */
  public dispatchStream(
    request: AiRequestDto,
    profileId?: string,
    abortSignal?: AbortSignal
  ): Observable<AiEventDto>;

  /**
   * Pings a specific AI profile to verify connection and key validity.
   */
  public pingProfile(profileId: string): Observable<boolean>;
}
~~~
* **Execution Notes:** If `profileId` is omitted, the framework automatically defaults to the globally active profile. The `abortSignal` parameter is critical; it allows the dumb client UI to natively cancel ongoing HTTP requests or streams at the lowest adapter level.

### 4.2 AgentExecutorService
Manages the autonomous agentic loop. It evaluates tool calls from the model, executes them via the local `AiToolRegistryService`, and iteratively feeds the localized results back to the model until a final answer is reached or the safety iteration limit is hit.

~~~typescript
class AgentExecutorService {
  /**
   * Executes an autonomous task and resolves only when the agent completes its loop.
   */
  public executeTask(
    request: AiRequestDto,
    profileId?: string,
    maxIterations?: number,
    abortSignal?: AbortSignal
  ): Promise<AiResponseDto>;

  /**
   * Executes an autonomous task and streams all intermediate thoughts, tool calls, tool results, and final outputs.
   */
  public executeStreamTask(
    request: AiRequestDto,
    profileId?: string,
    maxIterations?: number,
    abortSignal?: AbortSignal
  ): Observable<AiEventDto>;
}
~~~
* **Execution Notes:** The `maxIterations` parameter is a safety mechanism to prevent infinite LLM hallucination loops (usually defaults to 5). Triggering the `abortSignal` will immediately halt the agentic loop, cancel any pending tool executions, and abort active adapter requests.

~~~typescript
class AgentExecutorService {
  /**
   * Executes an autonomous task and resolves only when the agent completes its loop.
   */
  public executeTask(
    request: AiRequestDto,
    profileId?: string,
    maxIterations?: number,
    abortSignal?: AbortSignal
  ): Promise<AiResponseDto>;

  /**
   * Executes an autonomous task and streams all intermediate thoughts, tool calls, tool results, and final outputs.
   */
  public executeStreamTask(
    request: AiRequestDto,
    profileId?: string,
    maxIterations?: number,
    abortSignal?: AbortSignal
  ): Observable<AiEventDto>;
}
~~~
* **Execution Notes:** The `maxIterations` parameter is a safety mechanism to prevent infinite LLM hallucination loops (usually defaults to 5). Triggering the `abortSignal` will immediately halt the agentic loop, cancel any pending tool executions, and abort active adapter requests.

---

## 5. Core Command Bus (CQRS)

The `CoreBus` is the central nervous system of the Arena framework. All UI intents must pass through this bus as either Commands or Queries. Direct service injection from the UI to the Core is strictly prohibited.

### 5.1 CoreBus API
~~~typescript
class CoreBus {
  /**
   * Dispatches a Command or Query and returns the typed promise/result.
   */
  public dispatch<T>(message: ICommand | IQuery): Promise<T>;

  /**
   * Registers a global middleware interceptor for security, logging, or transformation.
   */
  public useMiddleware(middleware: MiddlewareFn): void;

  /**
   * Binds a Command or Query class to its corresponding handler.
   * Typically used during the boot sequence by system plugins.
   */
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
type ToolHandler = (args: Record<string, any>) => Promise<any>;

class AiToolRegistryService {
  /**
   * Registers a new capability that can be dynamically exposed to the active AI adapter.
   */
  public registerTool(definition: AiToolDto, handler: ToolHandler): void;

  /**
   * Retrieves all currently registered tools formatted for AI capability injection.
   */
  public getRegisteredTools(): AiToolDto[];
}
~~~

---

## 7. Core Storage, Security & Portability

The Arena framework operates strictly on a Zero-Knowledge local storage architecture. The UI has absolutely no direct access to unencrypted payloads or cryptographic keys.

### 7.1 SecurityService
Manages the encryption vault and exposes reactive signals for the UI to monitor authentication states.

~~~typescript
class SecurityService {
  // Reactive state signals for UI binding
  public readonly isVaultUnlocked: Signal<boolean>;
  public readonly isVaultConfigured: Signal<boolean>;

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
   * Permanently destroys the vault and all cryptographic material.
   * Requires extreme caution.
   */
  public destroyVault(): Promise<void>;
}
~~~

> [!warning] Security Architecture
> The `getSessionKey` method is strictly internal to the Core Engine and is not exposed to the UI layer to maintain the Zero-Knowledge paradigm.

### 7.2 SystemPortabilityService
Handles the import, export, and lifecycle resets of the local ecosystem.

~~~typescript
class SystemPortabilityService {
  /**
   * Exports the entire configured ecosystem (excluding sensitive vault data) as a serialized string.
   */
  public exportEcosystem(): Promise<string>;

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
Monitors the real-time health and latency of the active AI provider connections.

~~~typescript
class AiConnectionMonitorService {
  /**
   * Emits the current connection health status of the active AI adapter.
   */
  public connectionStatus$: Observable<'connected' | 'disconnected' | 'degraded'>;

  /**
   * Emits the latency in milliseconds for the last API ping.
   */
  public latency$: Observable<number>;
}
~~~

---

## 9. Framework Error Codes Catalog

When a Command or Query fails, it rejects with a specific string literal error code. The dumb client UI must match these exact codes to present localized error messages.

| Error Code               | Thrown By                                                                     | Cause / Meaning                                                     |
| :----------------------- | :---------------------------------------------------------------------------- | :------------------------------------------------------------------ |
| `VAULT_LOCKED`           | Almost all Commands & Queries                                                 | The operation requires the local vault to be unlocked first.        |
| `AI_PROFILE_NOT_FOUND`   | `UpdateAiProfileCommand`, `SetActiveProfileCommand`, `DeleteAiProfileCommand` | The requested profile ID does not exist in the local store.         |
| `INVALID_API_KEY`        | `AddAiProfileCommand`, `UpdateAiProfileCommand`                               | The provided API key format is invalid or rejected by the provider. |
| `DUPLICATE_PROFILE_NAME` | `AddAiProfileCommand`                                                         | A profile with this exact name already exists.                      |
| `AI_AUTH_FAILED`         | `AiGatewayService`                                                            | The AI provider rejected the request due to invalid credentials.    |