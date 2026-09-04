/**
 * @threadlabs/looma-core
 *
 * Importing this module registers components and exports shared overlay behavior.
 */

import { defineCustomElements } from './loader/index.js';
defineCustomElements();

export * from './src/overlay/manager';
export * from './src/overlay/positioning';
