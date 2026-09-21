import { records, styles } from './declarative/registry.js';
import { registerLoomaPackage } from './declarative';

/** Compatibility loader for consumers that previously called the Stencil loader explicitly. */
export function defineCustomElements(): void {
  registerLoomaPackage('core', records, styles);
}
