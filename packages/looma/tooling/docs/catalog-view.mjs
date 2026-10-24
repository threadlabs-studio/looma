import { escapeHtml as escape } from './catalog.mjs';

/** Catalog filtering wraps the same server-rendered documentation cards. */
export function catalogResource(groups) {
  return `<link rel="component" href="@threadlabs/looma/components/ui-form-field/ui-form-field.html">
<link rel="component" href="@threadlabs/looma/components/ui-input/ui-input.html">
<link rel="component" href="@threadlabs/looma/components/ui-select/ui-select.html">
<link rel="component" href="@threadlabs/looma/components/ui-cluster/ui-cluster.html">
<link rel="component" href="@threadlabs/looma/components/ui-stack/ui-stack.html">
<template component="looma-catalog" module="./catalog-view.js"><defs></defs>
<ui-stack gap="xl"><ui-cluster align="end"><ui-form-field><label slot="label" for="catalog-query">Find a component</label><ui-input id="catalog-query" $ref="query" type="search" placeholder="Name, tag or purpose"></ui-input></ui-form-field><ui-form-field><label slot="label" for="catalog-category">Category</label><ui-select id="catalog-category" $ref="category"><option value="">All categories</option>${groups.map(group => `<option value="${escape(group.id)}">${escape(group.label)}</option>`).join('')}</ui-select></ui-form-field></ui-cluster><p $ref="count" role="status" aria-live="polite"></p><slot></slot></ui-stack></template>`;
}
