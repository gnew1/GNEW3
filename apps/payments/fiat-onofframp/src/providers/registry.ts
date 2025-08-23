
import { RampProvider } from "./base.js";
import { MockProvider } from "./mock.js";

const providers: Record<string, RampProvider> = {
  mock: new MockProvider()
};

export function getProvider(name: string): RampProvider | undefined {
  return providers[name];
}

export function allProviders(): RampProvider[] {
  return Object.values(providers);
}


