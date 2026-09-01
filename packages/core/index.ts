/**
 * @threadlabs/looma-core
 *
 * Importing this module registers components and exports the overlay manager.
 */

import { defineCustomElements } from './loader/index.js';
defineCustomElements();

export * from './src/overlay/manager';
