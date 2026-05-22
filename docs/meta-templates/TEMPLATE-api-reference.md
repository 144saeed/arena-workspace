
# Arena Core API Reference

This document serves as the absolute source of truth for the capabilities, commands, queries, and data structures exposed by the `arena-core` local server. 

## 1. Core Commands (State Mutations)
Commands are dispatched via the `CoreBus` to mutate the state of the local system (e.g., database writes, configuration changes). They execute within transaction boundaries.

### 1.1. [CommandName]
- **Description:** [Brief description of what the command does and its business rule]
- **Payload Structure:**
~~~typescript
  // Example of how the payload should be documented
  export class ExampleCommand implements ICommand {
      constructor(public readonly targetId: string) {}
  }
~~~

* **Expected Outcome:** [What state changes in the core]
* **Throws:** [List of FrameworkError codes, e.g., 'VAULT_LOCKED']

*(Duplicate the block above for each command exported in the public API)*

---

## 2. Core Queries (Data Retrieval)

Queries are dispatched via the `CoreBus` to retrieve data safely. They are strictly read-only and guarantee no state mutation.

### 2.1. [QueryName]

* **Description:** [What data it fetches]
* **Payload Structure:** [Input parameters, if any]
* **Returns:** `Promise<[ReturnDtoType]>`
* **Security Constraint:** [e.g., "Requires unlocked vault"]

---

## 3. Data Transfer Objects (DTOs) & Entities

The strict typing contracts for all data passing between the UI client and the Core. UI components must project these interfaces directly.

### 3.1. [DtoName]

* **Purpose:** [Where and why this DTO is used]
* **Interface/Type:**
~~~typescript
// Provide the exact readonly interface
export interface SafeExampleDto {
    readonly id: string;
    readonly isSecured: boolean;
}

~~~



---

## 4. System Events & Live Streams

Streams exposed by the core (primarily for AI communications or critical system events) that the UI must listen to.

### 4.1. [StreamName / EventType]

* **Source:** [e.g., AiGatewayService]
* **Description:** [What triggers the stream]
* **Yields:** `Observable<[EventDto]>`

---

## 5. Registered Plugins & System Adapters

List of native plugins and AI vendor adapters shipped with the core engine.

### 5.1. System Plugins

* **[Plugin Name]:** [e.g., SystemAiProfilePlugin] - [Briefly describe the schemas and handlers it registers during boot].

### 5.2. AI Adapters

* **[Adapter Name]:** [e.g., GoogleGeminiAdapter] - [Supported features like vision, function calling, streaming].

