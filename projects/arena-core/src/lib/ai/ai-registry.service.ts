import { Injectable, Injector } from '@angular/core';
import { IAiAdapter, AiAdapterConstructor } from '../contracts/interfaces/ai-adapter.interface';
import { FrameworkError } from '../exceptions/framework-error.exception';

@Injectable({
  providedIn: 'root'
})
export class AiRegistryService {

  private readonly adapterClasses = new Map<string, AiAdapterConstructor>();
  private readonly adapterMetadata = new Map<string, string>();

  constructor(private readonly injector: Injector) { }

  registerAdapter(adapterClass: AiAdapterConstructor): void {
    const id = adapterClass.providerId;
    const name = adapterClass.displayName;

    if (this.adapterClasses.has(id)) {
      throw new FrameworkError('ADAPTER_COLLISION', `An AI Adapter with ID '${id}' is already registered.`, false);
    }

    this.adapterClasses.set(id, adapterClass);
    this.adapterMetadata.set(id, name);
  }

  createAdapterInstance(providerId: string): IAiAdapter {
    const AdapterClass = this.adapterClasses.get(providerId);

    if (!AdapterClass) {
      throw new FrameworkError('ADAPTER_NOT_FOUND', `No adapter registered for provider '${providerId}'.`, false);
    }
    return this.injector.get(AdapterClass);
  }

  getAvailableProviders(): { id: string; name: string }[] {
    return Array.from(this.adapterMetadata.entries()).map(([id, name]) => ({ id, name }));
  }
}