import { computed, onMounted, onUnmounted, ref } from 'vue';

const isOnline = ref(navigator.onLine);

function updateOnlineState(): void {
  isOnline.value = navigator.onLine;
}

export function useNetworkStatus() {
  onMounted(() => {
    window.addEventListener('online', updateOnlineState);
    window.addEventListener('offline', updateOnlineState);
  });

  onUnmounted(() => {
    window.removeEventListener('online', updateOnlineState);
    window.removeEventListener('offline', updateOnlineState);
  });

  const statusLabel = computed(() => (isOnline.value ? 'Connecte au serveur' : 'Mode hors ligne'));

  return {
    isOnline: computed(() => isOnline.value),
    statusLabel,
  };
}
