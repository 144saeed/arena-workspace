import { Injectable, Injector } from '@angular/core';
import { IAiAdapter, AiAdapterConstructor } from '../contracts/interfaces/ai-adapter.interface';
import { FrameworkError } from '../exceptions/framework-error.exception';

/**
 * The Central Registry & Factory for AI Adapters in the Framework.
 * Pure lazy instantiation: Classes are NEVER instantiated until explicitly requested.
 */
@Injectable({
  providedIn: 'root'
})
export class AiRegistryService {

  private readonly adapterClasses = new Map<string, AiAdapterConstructor>();
  private readonly adapterMetadata = new Map<string, string>();

  constructor(private readonly injector: Injector) { }

  /**
   * Registers a new AI adapter class reading purely static metadata.
   */
  registerAdapter(adapterClass: AiAdapterConstructor): void {
    const id = adapterClass.providerId;
    const name = adapterClass.displayName;

    if (this.adapterClasses.has(id)) {
      // SECURITY FIX: Prevent malicious adapter overriding
      throw new FrameworkError(
        'ADAPTER_COLLISION',
        `Critical Error: An AI Adapter with the provider ID '${id}' is already registered. Overriding is strictly prohibited for security reasons.`,
        false
      );
    }

    this.adapterClasses.set(id, adapterClass);
    this.adapterMetadata.set(id, name);
    console.log(`[AI Registry] Successfully registered AI Factory for: ${name}`);
  }

  /**
   * Factory Method: Creates or retrieves the instance of the requested AI Adapter.
   */
  createAdapterInstance(providerId: string): IAiAdapter {
    const AdapterClass = this.adapterClasses.get(providerId);

    if (!AdapterClass) {
      throw new Error(`[AI Registry] Critical Error: No adapter registered for provider '${providerId}'`);
    }
    return this.injector.get(AdapterClass);
  }

  getAvailableProviders(): { id: string; name: string }[] {
    return Array.from(this.adapterMetadata.entries()).map(([id, name]) => ({ id, name }));
  }
}