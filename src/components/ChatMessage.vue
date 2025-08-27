<template>
  <div :class="['message-container', messageAlignment]">
    <div :class="['message-bubble', messageStyle]">
      <!-- 消息内容 -->
      <div class="message-content">
        {{ getMessageContent() }}
      </div>

      <!-- 工具调用显示 -->
      <div v-if="message.toolCalls && message.toolCalls.length > 0" class="tool-calls">
        <div
          v-for="toolCall in message.toolCalls"
          :key="toolCall.toolName"
          class="tool-call-item"
        >
          <div class="tool-name">🔧 {{ toolCall.toolName }}</div>
          <div class="tool-result">{{ toolCall.result }}</div>
        </div>
      </div>

      <!-- 时间戳 -->
      <div :class="['timestamp', timestampAlignment]">
        {{ formatTime(message.sendTime) }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Message } from '@/types/chat'

interface Props {
  message: Message
}

const props = defineProps<Props>()

// 获取消息内容
const getMessageContent = () => {
  if (props.message.messageType === 'USER') {
    return props.message.content.prompt || ''
  } else {
    return props.message.content.completion || ''
  }
}

// 格式化时间显示
const formatTime = (timeStr: string) => {
  const date = new Date(timeStr)
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 计算消息对齐方式
const messageAlignment = computed(() => {
  return props.message.messageType === 'USER' ? 'user-message' : 'ai-message'
})

// 计算消息气泡样式
const messageStyle = computed(() => {
  return props.message.messageType === 'USER' ? 'user-bubble' : 'ai-bubble'
})

// 计算时间戳对齐方式
const timestampAlignment = computed(() => {
  return props.message.messageType === 'USER' ? 'timestamp-right' : 'timestamp-left'
})
</script>

<style lang="scss" scoped>
// ===== 聊天消息组件样式 =====

// 消息容器 - 控制消息的整体布局
.message-container {
  display: flex;
  width: 100%;
  margin-bottom: 1rem;

  // 用户消息右对齐
  &.user-message {
    justify-content: flex-end;
  }

  // AI消息左对齐
  &.ai-message {
    justify-content: flex-start;
  }
}

// 消息气泡 - 消息内容的容器
.message-bubble {
  max-width: 80%; // 最大宽度限制
  border-radius: 1rem; // 圆角
  padding: 0.75rem 1rem; // 内边距
  font-size: 0.875rem; // 字体大小

  // 用户消息气泡样式
  &.user-bubble {
    background-color: black; // 黑色背景
    color: white; // 白色文字
    border-bottom-right-radius: 0.375rem; // 右下角小圆角
  }

  // AI消息气泡样式
  &.ai-bubble {
    background-color: #f3f4f6; // 浅灰色背景
    color: #111827; // 深色文字
    border-bottom-left-radius: 0.375rem; // 左下角小圆角

    // 暗色主题下的AI消息样式
    .dark & {
      background-color: #374151; // 深灰色背景
      color: #f9fafb; // 浅色文字
    }
  }
}

// 消息内容 - 保持换行格式
.message-content {
  white-space: pre-wrap; // 保持空格和换行
  word-wrap: break-word; // 长单词换行
}

// 工具调用区域
.tool-calls {
  margin-top: 0.5rem;

  .tool-call-item {
    font-size: 0.75rem; // 小字体
    opacity: 0.75; // 半透明
    border-top: 1px solid rgba(255, 255, 255, 0.2); // 分割线
    padding-top: 0.5rem;
    margin-top: 0.25rem;

    .tool-name {
      font-weight: 500; // 工具名称加粗
    }

    .tool-result {
      margin-top: 0.25rem; // 结果与名称的间距
    }
  }
}

// 时间戳样式
.timestamp {
  font-size: 0.75rem; // 小字体
  margin-top: 0.5rem;
  opacity: 0.6; // 半透明

  // 右对齐（用户消息）
  &.timestamp-right {
    text-align: right;
  }

  // 左对齐（AI消息）
  &.timestamp-left {
    text-align: left;
  }
}
</style>
