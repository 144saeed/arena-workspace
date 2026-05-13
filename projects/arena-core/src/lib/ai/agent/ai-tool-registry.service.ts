import { Injectable, Injector } from '@angular/core';
import { AiToolDto } from '../../contracts/dtos/ai-tool.dto';
import { StructuredToolResultDto } from '../../contracts/dtos/structured-tool-result.dto';
import { IToolExecutionContext } from '../../contracts/interfaces/tool-execution-context.interface';
import { FrameworkError } from '../../exceptions/framework-error.exception';

export type ToolHandler = (args: Record<string, any>, context: IToolExecutionContext) => Promise<StructuredToolResultDto>;

@Injectable({
  providedIn: 'root'
})
export class AiToolRegistryService {

  private readonly tools = new Map<string, { definition: AiToolDto, handler: ToolHandler }>();

  constructor(private readonly injector: Injector) { }

  registerTool(definition: AiToolDto, handler: ToolHandler): void {
    if (this.tools.has(definition.name)) {
      throw new FrameworkError(
        'TOOL_NAME_COLLISION',
        `Critical Error: A tool with the name '${definition.name}' is already registered. Tool names must be globally unique across all plugins.`,
        false
      );
    }
    this.tools.set(definition.name, { definition, handler });
    console.log(`[Tool Registry] Tool registered successfully: ${definition.name}`);
  }

  getRegisteredTools(): AiToolDto[] {
    return Array.from(this.tools.values()).map(t => t.definition);
  }

  async executeTool(name: string, args: Record<string, any>, abortSignal?: AbortSignal): Promise<StructuredToolResultDto> {
    const tool = this.tools.get(name);
    if (!tool) {
      return { status: 'fatal_error', errorMessage: `Critical Error: Tool '${name}' is not registered.` };
    }

    try {
      const context: IToolExecutionContext = { injector: this.injector, abortSignal };
      return await tool.handler(args, context);
    } catch (error) {
      console.error(`[Tool Registry] Tool '${name}' threw an unhandled exception.`);
      return { status: 'fatal_error', errorMessage: 'An internal error occurred while executing this tool.' };
    }
  }
}