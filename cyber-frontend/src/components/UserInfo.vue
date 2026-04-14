<template>
  <div class="user-info">
    <a-avatar :src="user?.userAvatar" :size="size">
      {{ user?.userName?.charAt(0) || 'U' }}
    </a-avatar>
    <span v-if="showName" class="user-name">{{ user?.userName || '未知用户' }}</span>
  </div>
</template>

<script setup>
defineProps({
  user: Object,
  size: [Number, String],
  showName: {
    type: Boolean,
    default: true
  }
})
</script>

<style scoped>
.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.user-name {
  font-size: 14px;
  color: #2d3436;
}
</style>