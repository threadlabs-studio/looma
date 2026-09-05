/**
 * @threadlabs/looma-core
 *
 * Importing this module registers components and exports shared overlay behavior.
 */

import { defineCustomElements } from './loader/index.js';
import { initializeInputModality } from './src/input-modality';

if (typeof document !== 'undefined') initializeInputModality(document);
defineCustomElements();

export * from './src/overlay/manager';
export * from './src/overlay/positioning';
export * from './src/input-modality';
export * from './src/icons';
export * from './src/utils/drag-drop';
