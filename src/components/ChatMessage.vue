<template>
  <div
    :class="[
      'flex w-full mb-4',
      message.messageType === 'USER' ? 'justify-end' : 'justify-start'
    ]"
  >
    <div
      :class="[
        'max-w-[80%] rounded-2xl px-4 py-3 text-sm',
        message.messageType === 'USER'
          ? 'bg-black text-white rounded-br-md'
          : 'bg-gray-100 text-gray-900 rounded-bl-md dark:bg-gray-800 dark:text-gray-100'
      ]"
    >
      <div class="whitespace-pre-wrap">
        {{ getMessageContent() }}
      </div>
      
      <!-- 工具调用显示 -->
      <div v-if="message.toolCalls && message.toolCalls.length > 0" class="mt-2 space-y-1">
        <div
          v-for="toolCall in message.toolCalls"
          :key="toolCall.toolName"
          class="text-xs opacity-75 border-t pt-2"
        >
          <div class="font-medium">🔧 {{ toolCall.toolName }}</div>
          <div class="mt-1">{{ toolCall.result }}</div>
        </div>
      </div>
      
      <!-- 时间戳 -->
      <div
        :class="[
          'text-xs mt-2 opacity-60',
          message.messageType === 'USER' ? 'text-right' : 'text-left'
        ]"
      >
        {{ formatTime(message.sendTime) }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Message } from '@/types/chat'

interface Props {
  message: Message
}

const props = defineProps<Props>()

const getMessageContent = () => {
  if (props.message.messageType === 'USER') {
    return props.message.content.prompt || ''
  } else {
    return props.message.content.completion || ''
  }
}

const formatTime = (timeStr: string) => {
  const date = new Date(timeStr)
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>
