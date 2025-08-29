<template>
  <div class="conversation-list-container">
    <!-- 头部 -->
    <div class="header">
      <div class="header-content">
        <div class="title">对话</div>
        <Button
          @click="handleCreateNew"
          :disabled="isCreatingConversation"
          size="sm"
          class="create-button"
        >
          <Plus class="w-4 h-4" />
        </Button>
      </div>
    </div>

    <!-- 对话列表 -->
    <div class="list-container">
      <ScrollArea class="h-full">
        <div class="list-content">
          <!-- 对话项列表 -->
          <div
            v-for="conversation in conversations"
            :key="conversation.id"
            @click="() => handleSelectConversation(conversation.memoryId)"
            :class="[
              'conversation-item',
              currentMemoryId === conversation.memoryId ? 'active' : ''
            ]"
          >
            <div class="conversation-title">
              {{ conversation.title || `对话 ${conversation.memoryId.slice(-8)}` }}
            </div>
            <div class="conversation-time">
              {{ conversation.lastSendTime ? formatTime(conversation.lastSendTime) : '新对话' }}
            </div>
          </div>

          <!-- 空状态 -->
          <div
            v-if="!isLoading && conversations.length === 0"
            class="empty-state"
          >
            <MessageCircle class="empty-icon" />
            <p class="empty-title">还没有对话</p>
            <p class="empty-subtitle">点击 + 开始新对话</p>
          </div>

          <!-- 加载状态 -->
          <div
            v-if="isLoading"
            class="loading-state"
          >
            <div class="loading-spinner"></div>
            <p class="loading-text">加载中...</p>
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

<style lang="scss" scoped>
// ===== 对话列表组件样式 =====

// 主容器 - 全高度弹性布局
.conversation-list-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: #f9fafb; // 浅灰色背景

  // 暗色主题下的背景
  .dark & {
    background-color: #111827; // 深色背景
  }
}

// 头部区域 - 标题和新建按钮
.header {
  flex-shrink: 0; // 防止被压缩
  padding: 1rem;
  border-bottom: 1px solid #e5e7eb; // 底部边框

  // 暗色主题下的边框
  .dark & {
    border-bottom-color: #374151;
  }

  .header-content {
    display: flex;
    align-items: center;
    justify-content: space-between;

    .title{
      min-width: 100px;
      font-size: 1.125rem; // 18px
      font-weight: 600; // 半粗体
      color: #111827; // 深色文字

      // 暗色主题下的文字颜色
      .dark & {
        color: #f9fafb;
      }
    }

    .create-button {
      border-radius: 50%; // 圆形按钮
    }
  }
}

// 列表容器 - 滚动区域
.list-container {
  flex: 1;
  min-height: 0; // 允许收缩

  .list-content {
    padding: 0.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.25rem; // 项目间距
  }
}

// 对话项样式
.conversation-item {
  padding: 0.75rem;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.2s ease; // 平滑过渡动画
  background-color: white;

  // 暗色主题下的默认背景
  .dark & {
    background-color: rgba(55, 65, 81, 0.5); // 半透明深灰色
  }

  // 悬停效果
  &:hover {
    background-color: #f3f4f6; // 浅灰色

    .dark & {
      background-color: #374151; // 深灰色
    }
  }

  // 激活状态（当前选中的对话）
  &.active {
    background-color: #e5e7eb; // 更深的灰色

    .dark & {
      background-color: #4b5563; // 更深的深灰色
    }
  }

  .conversation-title {
    font-size: 0.875rem; // 14px
    font-weight: 500; // 中等粗体
    color: #111827; // 深色文字
    white-space: nowrap; // 不换行
    overflow: hidden; // 隐藏溢出
    text-overflow: ellipsis; // 显示省略号

    // 暗色主题下的文字颜色
    .dark & {
      color: #f9fafb;
    }
  }

  .conversation-time {
    font-size: 0.75rem; // 12px
    color: #6b7280; // 灰色文字
    margin-top: 0.25rem;

    // 暗色主题下的文字颜色
    .dark & {
      color: #9ca3af;
    }
  }
}

// 空状态样式
.empty-state {
  min-width: 100px; // 0也好像管用
  text-align: center;
  padding: 2rem 0;
  color: #6b7280; // 灰色文字

  // 暗色主题下的文字颜色
  .dark & {
    color: #9ca3af;
  }

  .empty-icon {
    width: 3rem; // 48px
    height: 3rem;
    margin: 0 auto 0.5rem;
    opacity: 0.5; // 半透明
  }

  .empty-title {
    font-size: 0.875rem; // 14px
    margin-bottom: 0.25rem;
  }

  .empty-subtitle {
    font-size: 0.75rem; // 12px
  }
}

// 加载状态样式
.loading-state {
  text-align: center;
  padding: 2rem 0;
  color: #6b7280; // 灰色文字

  // 暗色主题下的文字颜色
  .dark & {
    color: #9ca3af;
  }

  .loading-spinner {
    width: 1.5rem; // 24px
    height: 1.5rem;
    border: 2px solid #d1d5db; // 浅灰色边框
    border-top-color: #4b5563; // 深灰色顶部边框
    border-radius: 50%;
    margin: 0 auto;
    animation: spin 1s linear infinite; // 旋转动画
  }

  .loading-text {
    font-size: 0.875rem; // 14px
    margin-top: 0.5rem;
  }
}

// 旋转动画关键帧
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
