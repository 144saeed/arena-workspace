/*
 * Public API Surface of arena-core
 * CRITICAL: Only export contracts, DTOs, and orchestrator services.
 * Internal infrastructure (e.g., CryptoService, Repositories, SchemaManager) 
 * MUST remain hidden to prevent tight coupling and secure the framework.
 */

// 1. Core Engine & Ecosystem
export * from './lib/engine/core-engine.service';
export * from './lib/contracts/interfaces/app-plugin.interface';
export * from './lib/system/system-portability.service';

// 2. Monitoring & State
export * from './lib/monitor/system-monitor.service';
export * from './lib/monitor/ai-connection-monitor.service';

// 3. Mediator & Database (Public Base Classes)
export * from './lib/mediator/core-bus.service';
export * from './lib/contracts/interfaces/message.interface';
export * from './lib/contracts/interfaces/command.interface';
export * from './lib/contracts/interfaces/query.interface';
export * from './lib/contracts/interfaces/message-handler.interface';
export * from './lib/database/base-repository.class';

// 4. AI Gateway & Agent Architecture
export * from './lib/ai/ai-gateway.service';
export * from './lib/ai/adapters/google-gemini.adapter';
export * from './lib/ai/agent/ai-tool-registry.service';
export * from './lib/ai/agent/agent-executor.service';

// 4.1 AI Interfaces
export * from './lib/contracts/interfaces/ai-adapter.interface';
export * from './lib/contracts/interfaces/tool-execution-context.interface';

// 4.2 AI DTOs
export * from './lib/contracts/dtos/ai-request.dto';
export * from './lib/contracts/dtos/ai-response.dto';
export * from './lib/contracts/dtos/ai-message.dto';
export * from './lib/contracts/dtos/ai-message-part.dto';
export * from './lib/contracts/dtos/ai-tool.dto';
export * from './lib/contracts/dtos/ai-tool-call.dto';
export * from './lib/contracts/dtos/structured-tool-result.dto';
export * from './lib/contracts/dtos/ai-profile-entity.entity';
export * from './lib/contracts/dtos/ai-capabilities.dto';
export * from './lib/contracts/dtos/ai-event.dto';

// 5. Security & Exceptions
export * from './lib/security/security.service';
export * from './lib/exceptions/framework-error.exception';

// 6. wiring
export * from './lib/providers/arena-core.provider';