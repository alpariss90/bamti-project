<template>
  <div class="network-badge" :class="{ offline: !isOnline }">
    <span class="dot" />
    <span>{{ isOnline ? 'Connecte au serveur' : 'Mode hors ligne' }}</span>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  isOnline: boolean;
}>();
</script>

<style scoped>
.network-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: 999px;
  background: rgba(30, 136, 229, 0.12);
  color: #0b3861;
  font-size: 12px;
  font-weight: 600;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #1e88e5;
}

.offline {
  background: rgba(0, 0, 0, 0.08);
  color: #121212;
}

.offline .dot {
  background: #121212;
}
</style>
