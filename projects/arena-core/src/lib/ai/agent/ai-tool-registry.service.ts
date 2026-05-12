import { Injectable } from '@angular/core';
import { AiToolDto } from '../../contracts/dtos/ai-tool.dto';

/**
 * Defines the execution signature for any local tool (function).
 */
export type ToolHandler = (args: Record<string, any>) => Promise<any>;

/**
 * The Central Registry for App-Specific AI Tools.
 * Applications register their callable functions here, allowing the Agent Executor 
 * to securely invoke local business logic based on AI decisions.
 */
@Injectable({
  providedIn: 'root'
})
export class AiToolRegistryService {

  private readonly tools = new Map<string, { definition: AiToolDto, handler: ToolHandler }>();

  /**
   * Registers a new tool that the AI can call.
   * @param definition The strict JSON Schema definition of the tool.
   * @param handler The local TypeScript function to execute when the AI calls this tool.
   */
  registerTool(definition: AiToolDto, handler: ToolHandler): void {
    if (this.tools.has(definition.name)) {
      console.warn(`[Tool Registry] Overwriting existing tool registration for: ${definition.name}`);
    }
    this.tools.set(definition.name, { definition, handler });
    console.log(`[Tool Registry] Tool registered successfully: ${definition.name}`);
  }

  /**
   * Retrieves all registered tool definitions to inject into an AI request.
   */
  getRegisteredTools(): AiToolDto[] {
    return Array.from(this.tools.values()).map(t => t.definition);
  }

  /**
   * Securely executes a registered tool and safely formats the result as a string.
   */
  async executeTool(name: string, args: Record<string, any>): Promise<string> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`[Tool Registry] Critical Error: Tool '${name}' is not registered.`);
    }

    try {
      const result = await tool.handler(args);
      // AI adapters strictly require string responses for tool results
      return typeof result === 'string' ? result : JSON.stringify(result);
    } catch (error) {
      console.error(`[Tool Registry] Tool '${name}' threw an error during execution:`, error);
      return JSON.stringify({ error: String(error) });
    }
  }
}