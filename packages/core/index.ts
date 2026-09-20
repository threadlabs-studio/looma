/**
 * @threadlabs/looma-core
 *
 * Importing this module registers Looma's declarative component definitions and exports shared
 * framework-neutral behavior.
 */

import { records, styles } from '../../tools/migrate-html-next/generated/adoption/core/registry.js';
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
