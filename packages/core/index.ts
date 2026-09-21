/**
 * @threadlabs/looma-core
 *
 * Primary browser entry point for declarative core components and the
 * framework-neutral behavior shared by native HTML and generated adapters.
 *
 * Importing it registers the core definition graph and one document-level input
 * modality tracker. Both operations are idempotent across facade/direct imports
 * and no-op safely during SSR. Consumers needing only attachment primitives can
 * use `./declarative` without starting document observation.
 */

import { records, styles } from './src/declarative/registry.js';
import { registerLoomaPackage } from './src/declarative';
import { initializeInputModality } from './src/input-modality';

if (typeof document !== 'undefined') initializeInputModality(document);
registerLoomaPackage('core', records, styles);

export * from './src/overlay/manager';
export * from './src/overlay/positioning';
export * from './src/input-modality';
export * from './src/icons';
export * from './src/utils/drag-drop';

export * from './src/field/combobox';
export * from './src/field/validation';
export * from './src/field/editable';
export * from './src/field/multi-combobox';
export * from './src/declarative';
