/*
 * Public API Surface of arena-core
 */

// 1. Core Engine & Ecosystem
export * from './lib/engine/core-engine.service';
export * from './lib/contracts/interfaces/app-plugin.interface';
export * from './lib/system/system-portability.service';

// 2. Monitoring
export * from './lib/monitor/system-monitor.service';
export * from './lib/monitor/ai-connection-monitor.service';

// 3. Mediator & Database
export * from './lib/mediator/core-bus.service';
export * from './lib/contracts/interfaces/message.interface';
export * from './lib/contracts/interfaces/command.interface';
export * from './lib/contracts/interfaces/query.interface';
export * from './lib/contracts/interfaces/message-handler.interface';
export * from './lib/database/base-repository.class';

// 4. AI Gateway & Contracts
export * from './lib/ai/ai-gateway.service';
export * from './lib/ai/adapters/google-gemini.adapter';
export * from './lib/contracts/interfaces/ai-adapter.interface';
export * from './lib/contracts/dtos/ai-request.dto';
export * from './lib/contracts/dtos/ai-response.dto';
export * from './lib/contracts/dtos/ai-message.dto';
export * from './lib/contracts/dtos/ai-tool.dto';
export * from './lib/contracts/dtos/ai-tool-call.dto';
export * from './lib/contracts/dtos/ai-profile-entity.entity';

// 5. Security
export * from './lib/security/security.service';