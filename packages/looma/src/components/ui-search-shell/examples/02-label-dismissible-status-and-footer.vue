<script setup lang="ts">
import { computed, ref } from "vue";
import { UiButton as Button, UiInput as Input, UiSearchResultRow as SearchResultRow, UiSearchShell as SearchShell } from "@threadlabs/looma";

const query = ref("");
const results = [
  ["Design tokens", "Color, type, spacing, and motion."],
  ["Token overrides", "Customize shared and component tokens."],
  ["Button variants", "Choose solid, outline, ghost, or danger."]
];
const filtered = computed(() => results.filter((result) =>
  result.join(" ").toLowerCase().includes(query.value.toLowerCase())
));
</script>

<template>
  <SearchShell open dismissible label="Search documentation">
    <template #search>
      <Input type="search" aria-label="Search documentation"
        :value="query" @input="query = $event.target.value" />
    </template>
    <template #status><div aria-live="polite">{{ filtered.length }} results</div></template>
    <template #body>
      <SearchResultRow v-for="result in filtered" :key="result[0]">
        <template #title><strong>{{ result[0] }}</strong></template>
        <template #excerpt><span>{{ result[1] }}</span></template>
      </SearchResultRow>
      <p v-if="filtered.length === 0">No matching documentation.</p>
    </template>
    <template #footer><form method="dialog"><Button type="submit" size="sm">Close</Button></form></template>
  </SearchShell>
</template>
