<template>
  <div class="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
    <!-- 头部 -->
    <div class="flex-shrink-0 p-4 border-b border-gray-200 dark:border-gray-700">
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">对话</h2>
        <Button
          @click="handleCreateNew"
          :disabled="isCreatingConversation"
          size="sm"
          class="rounded-full"
        >
          <Plus class="w-4 h-4" />
        </Button>
      </div>
    </div>

    <!-- 对话列表 -->
    <div class="flex-1 min-h-0">
      <ScrollArea class="h-full">
        <div class="p-2 space-y-1">
          <div
            v-for="conversation in conversations"
            :key="conversation.id"
            @click="() => handleSelectConversation(conversation.memoryId)"
            :class="[
              'p-3 rounded-lg cursor-pointer transition-colors duration-200',
              'hover:bg-gray-100 dark:hover:bg-gray-800',
              currentMemoryId === conversation.memoryId
                ? 'bg-gray-200 dark:bg-gray-700'
                : 'bg-white dark:bg-gray-800/50'
            ]"
          >
            <div class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
              对话 {{ conversation.memoryId.slice(-8) }}
            </div>
            <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {{ conversation.lastSendTime ? formatTime(conversation.lastSendTime) : '新对话' }}
            </div>
          </div>

          <!-- 空状态 -->
          <div
            v-if="!isLoading && conversations.length === 0"
            class="text-center py-8 text-gray-500 dark:text-gray-400"
          >
            <MessageCircle class="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p class="text-sm">还没有对话</p>
            <p class="text-xs mt-1">点击 + 开始新对话</p>
          </div>

          <!-- 加载状态 -->
          <div
            v-if="isLoading"
            class="text-center py-8 text-gray-500 dark:text-gray-400"
          >
            <div class="animate-spin w-6 h-6 border-2 border-gray-300 border-t-gray-600 rounded-full mx-auto"></div>
            <p class="text-sm mt-2">加载中...</p>
          </div>
        </div>
      </ScrollArea>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { Plus, MessageCircle } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useChatStore } from '@/stores/chat'

const chatStore = useChatStore()

const conversations = computed(() => chatStore.conversations)
const currentMemoryId = computed(() => chatStore.currentMemoryId)
const isLoading = computed(() => chatStore.isLoading)
const isCreatingConversation = computed(() => chatStore.isCreatingConversation)

const emit = defineEmits<{
  selectConversation: [memoryId: string]
  createNew: []
}>()

const handleSelectConversation = (memoryId: string) => {
  emit('selectConversation', memoryId)
}

const handleCreateNew = () => {
  emit('createNew')
}

// 调试：监听对话数据变化
watch(conversations, (newConversations) => {
  console.log('Conversations updated:', newConversations)
}, { immediate: true })

const formatTime = (timeStr: string) => {
  const date = new Date(timeStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit'
    })
  } else if (diffDays === 1) {
    return '昨天'
  } else if (diffDays < 7) {
    return `${diffDays}天前`
  } else {
    return date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric'
    })
  }
}
</script>
