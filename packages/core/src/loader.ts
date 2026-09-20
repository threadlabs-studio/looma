import { records, styles } from '../../../tools/migrate-html-next/generated/adoption/core/registry.js';
import { registerLoomaPackage } from './declarative';

/** Compatibility loader for consumers that previously called the Stencil loader explicitly. */
export function defineCustomElements(): void {
  registerLoomaPackage('core', records, styles);
}
