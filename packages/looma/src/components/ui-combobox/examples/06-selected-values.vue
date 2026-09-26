<script setup lang="ts">
import { ref } from "vue";
import { Combobox } from "@threadlabs/looma/vue";

const regions = [
  { value: "north", label: "North" },
  { value: "south", label: "South" },
  { value: "east", label: "East" },
  { value: "west", label: "West" }
];
const selected = ref<readonly string[]>(["north", "west"]);
</script>

<template>
  <Combobox v-model:selected-values="selected" label="Regions" name="regions" multiple required disclosure>
    <option v-for="region in regions" :key="region.value" :value="region.value">{{ region.label }}</option>
  </Combobox>
</template>
