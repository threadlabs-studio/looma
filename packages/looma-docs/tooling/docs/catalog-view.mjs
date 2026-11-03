import { escapeHtml as escape } from './catalog.mjs';

/** Catalog filtering wraps the same server-rendered documentation cards. */
export function catalogResource(groups, base = '/') {
  return `<link rel="component" href="@threadlabs/looma/components/ui-form-field/ui-form-field.html">
<link rel="component" href="@threadlabs/looma/components/ui-input/ui-input.html">
<link rel="component" href="@threadlabs/looma/components/ui-select/ui-select.html">
<link rel="component" href="@threadlabs/looma/components/ui-cluster/ui-cluster.html">
<link rel="component" href="@threadlabs/looma/components/ui-grid/ui-grid.html">
<link rel="component" href="@threadlabs/looma/components/ui-stack/ui-stack.html">
<template component="looma-catalog" module="./catalog-view.js"><defs><prop name="category" type="string" default="">The category represented by this gallery.</prop><prop name="total" type="number" default="0">Number of cards before text filtering.</prop></defs>
<ui-stack gap="xl"><div $ref="filters" hidden><ui-grid columns="2" min="md"><ui-form-field><label slot="label" for="catalog-query">Filter components</label><ui-input id="catalog-query" $ref="query" type="search" placeholder="Name, tag or purpose"></ui-input></ui-form-field><ui-cluster align="end"><ui-form-field><label slot="label" for="catalog-category">Section</label><ui-select id="catalog-category" $ref="category"><option value="" data-href="${escape(base)}components/" from:selected="$category = ''">All sections</option>${groups.map(group => `<option value="${escape(group.id)}" data-href="${escape(base)}components/${escape(group.id)}/" from:selected="${escape(`$category = ${JSON.stringify(group.id)}`)}">${escape(group.label)}</option>`).join('')}</ui-select></ui-form-field></ui-cluster></ui-grid></div><p $ref="count" role="status" aria-live="polite">{$total} components</p><slot></slot></ui-stack></template>`;
}
