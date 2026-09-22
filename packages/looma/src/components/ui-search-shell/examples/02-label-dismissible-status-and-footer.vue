<script setup lang="ts">
import { computed, ref } from "vue";
import { Button, Input, SearchResultRow, SearchShell } from "@threadlabs/looma/vue";

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
    <Input slot="search" type="search" aria-label="Search documentation"
      :value="query" @input="query = $event.target.value" />
    <div slot="status" aria-live="polite">{{ filtered.length }} results</div>
    <div slot="body">
      <SearchResultRow v-for="result in filtered" :key="result[0]">
        <strong slot="title">{{ result[0] }}</strong>
        <span slot="excerpt">{{ result[1] }}</span>
      </SearchResultRow>
      <p v-if="filtered.length === 0">No matching documentation.</p>
    </div>
    <form slot="footer" method="dialog"><Button type="submit" size="sm">Close</Button></form>
  </SearchShell>
</template>
