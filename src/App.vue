<script setup lang="ts">
import { ref } from 'vue'

const title = ref('Project Health Check')
</script>

<template>
  <div class="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 flex items-center justify-center">
    <h1 class="text-4xl font-bold text-blue-600 dark:text-blue-400">{{ title }}</h1>
  </div>
</template>