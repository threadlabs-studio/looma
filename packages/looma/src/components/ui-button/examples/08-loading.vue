<script setup lang="ts">
import { ref } from "vue";
import { Button } from "@threadlabs/looma/vue";

const loading = ref(false);
async function saveChanges() {
  loading.value = true;
  try {
    await new Promise((resolve) => setTimeout(resolve, 1500));
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <Button variant="solid" :loading="loading" @click="saveChanges">Save changes</Button>
</template>
