<template>
  <div class="h-screen flex bg-white dark:bg-gray-900">
    <!-- 左侧对话列表 -->
    <div
      :class="[
        'h-full border-r border-gray-200 dark:border-gray-700 transition-all duration-300',
        isSidebarCollapsed ? 'w-0 overflow-hidden' : 'w-80'
      ]"
    >
      <ConversationList
        @select-conversation="handleSelectConversation"
        @create-new="handleCreateNew"
      />
    </div>

    <!-- 折叠/展开按钮 -->
    <div
      :class="[
        'absolute top-4 z-20 transition-all duration-300',
        isSidebarCollapsed ? 'left-4' : 'left-[21rem]'
      ]"
    >
      <Button
        @click="isSidebarCollapsed = !isSidebarCollapsed"
        variant="outline"
        size="sm"
        class="rounded-full w-10 h-10 p-0 shadow-lg"
      >
        <Menu v-if="isSidebarCollapsed" class="w-4 h-4" />
        <X v-else class="w-4 h-4" />
      </Button>
    </div>

    <!-- 右侧主聊天区域 -->
    <div class="flex-1 flex flex-col relative">
      <!-- 未选择对话时的欢迎页面 -->
      <div
        v-if="!currentMemoryId"
        class="flex-1 flex items-center justify-center p-8"
      >
        <div class="max-w-2xl w-full">
          <div class="text-center mb-8">
            <h1 class="text-4xl font-light text-gray-900 dark:text-gray-100 mb-4">
              AI 助手
            </h1>
            <p class="text-gray-600 dark:text-gray-400 text-lg">
              开始新的对话，探索无限可能
            </p>
          </div>

          <VanishingInput
            v-model="welcomeMessage"
            :placeholders="welcomePlaceholders"
            @submit="handleWelcomeSubmit"
          />
        </div>
      </div>

      <!-- 聊天界面 -->
      <div v-else class="flex-1 flex flex-col h-full">
        <!-- 聊天消息区域 -->
        <div class="flex-1 min-h-0 relative">
          <ScrollArea ref="scrollAreaRef" class="h-full" @scroll="handleScroll">
            <div class="p-4">
              <div class="max-w-4xl mx-auto space-y-4">
                <!-- 消息按后端返回的倒序遍历，从上到下显示 -->
                <ChatMessage
                  v-for="message in filteredMessages"
                  :key="message.id"
                  :message="message"
                />

                <!-- AI正在输入的消息 -->
                <div v-if="isStreaming" class="flex justify-start">
                  <div class="max-w-[80%] bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-bl-md px-4 py-3">
                    <div class="flex items-center space-x-2">
                      <div class="flex space-x-1">
                        <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.1s"></div>
                        <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
                      </div>
                      <span class="text-sm text-gray-500">AI正在思考...</span>
                    </div>
                    <div v-if="streamingContent" class="mt-2 whitespace-pre-wrap text-sm text-gray-900 dark:text-gray-100">
                      {{ streamingContent }}
                    </div>
                  </div>
                </div>

                <!-- 滚动锚点放在最后（最底部） -->
                <div ref="scrollAnchor" class="h-1"></div>
              </div>
            </div>
          </ScrollArea>

          <!-- 滚动按钮组 - 始终显示用于测试 -->
          <div class="absolute right-4 bottom-20 flex flex-col space-y-2 z-10">
            <!-- 滚动到顶部按钮 -->
            <Button
              @click="() => scrollToTop(true)"
              class="rounded-full shadow-lg w-10 h-10 p-0 bg-white dark:bg-gray-800 border"
              size="sm"
              variant="outline"
            >
              <ChevronUp class="w-4 h-4" />
            </Button>

            <!-- 滚动到底部按钮 -->
            <Button
              @click="() => scrollToBottom(true, true)"
              class="rounded-full shadow-lg w-10 h-10 p-0 bg-white dark:bg-gray-800 border"
              size="sm"
              variant="outline"
            >
              <ChevronDown class="w-4 h-4" />
            </Button>
          </div>
        </div>

        <!-- 输入区域 -->
        <div class="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 p-4">
          <div class="max-w-4xl mx-auto">
            <div class="flex space-x-4">
              <Textarea
                v-model="chatMessage"
                placeholder="输入消息..."
                class="flex-1 min-h-[44px] max-h-32 resize-none"
                @keydown.enter.exact.prevent="handleSendMessage"
                @keydown.enter.shift.exact="() => {}"
              />
              <Button
                @click="handleSendMessage"
                :disabled="!chatMessage.trim() || isStreaming"
                class="px-6"
              >
                <Send class="w-4 h-4" />
              </Button>
            </div>
            <p class="text-xs text-gray-500 mt-2">
              按 Enter 发送，Shift + Enter 换行
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { Send, ChevronDown, ChevronUp, Menu, X } from 'lucide-vue-next'
import { VanishingInput } from '@/components/ui/vanishing-input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import ConversationList from '@/components/ConversationList.vue'
import ChatMessage from '@/components/ChatMessage.vue'
import { useChatStore } from '@/stores/chat'
import { sendChatMessage } from '@/api/chat'
import { MessageType } from '@/types/chat'

const chatStore = useChatStore()

// 响应式数据
const welcomeMessage = ref('')
const chatMessage = ref('')
const isStreaming = ref(false)
const streamingContent = ref('')
const scrollAreaRef = ref()
const scrollAnchor = ref<HTMLElement>()
const autoScrollEnabled = ref(true)
const isUserScrolling = ref(false)
const isSidebarCollapsed = ref(false)

// 计算属性
const currentMemoryId = computed(() => chatStore.currentMemoryId)
const currentMessages = computed(() => chatStore.currentMessages)

// 过滤并排序消息：只显示用户和AI的对话，按turnIndex正序排列
const filteredMessages = computed(() => {
  return currentMessages.value
    .filter(message =>
      message.messageType === MessageType.USER ||
      message.messageType === MessageType.AI
    )
    .sort((a, b) => a.turnIndex - b.turnIndex) // 按turnIndex正序：最早的在上面，最新的在下面
})

// 欢迎页面的占位符
const welcomePlaceholders = [
  '你好，有什么可以帮助你的吗？',
  '今天想聊什么话题？',
  '我可以回答问题、写代码、翻译文本...',
  '开始我们的对话吧！'
]

// 方法
const handleSelectConversation = async (memoryId: string) => {
  await chatStore.loadMessages(memoryId)
  // 加载完消息后立即滚动到底部，不使用动画
  await nextTick()
  scrollToBottomInstant()
}

const handleCreateNew = async () => {
  const memoryId = await chatStore.createConversation()
  if (memoryId) {
    // 创建成功后自动选中新对话
    chatStore.setCurrentMemoryId(memoryId)
  }
}

const handleWelcomeSubmit = async (message: string) => {
  if (!message.trim()) return

  // 创建新对话并发送消息
  const memoryId = await chatStore.createConversation()
  if (memoryId) {
    await sendMessage(message, memoryId)
  }
  welcomeMessage.value = ''
}

const handleSendMessage = async () => {
  if (!chatMessage.value.trim() || !currentMemoryId.value || isStreaming.value) return

  const messageToSend = chatMessage.value.trim()
  chatMessage.value = '' // 立即清空输入框

  try {
    await sendMessage(messageToSend, currentMemoryId.value)
  } catch (error) {
    // 如果发送失败，可以选择恢复输入框内容
    console.error('Send message failed:', error)
    // chatMessage.value = messageToSend // 可选：恢复输入框内容
  }
}

const sendMessage = async (message: string, memoryId: string) => {
  try {
    isStreaming.value = true
    streamingContent.value = ''

    console.log('Sending message:', { message, memoryId })

    // 添加用户消息到界面
    // 计算新的turnIndex：找到当前最大的turnIndex并加1
    const maxTurnIndex = currentMessages.value.length > 0
      ? Math.max(...currentMessages.value.map(m => m.turnIndex))
      : -1
    const userMessage = {
      id: Date.now().toString(),
      memoryId,
      turnIndex: maxTurnIndex + 1,
      messageType: MessageType.USER,
      content: { prompt: message, completion: '' },
      sendTime: new Date().toISOString(),
      model: { name: '', tokensInput: 0, tokensOutput: 0 }
    }
    chatStore.addMessage(userMessage)

    // 发送流式请求
    const { stream, memoryId: responseMemoryId } = await sendChatMessage({ memoryId, message })
    const reader = stream.getReader()
    const decoder = new TextDecoder()

    console.log('Starting to read stream...')
    console.log('Response memoryId:', responseMemoryId)

    while (true) {
      const { done, value } = await reader.read()
      if (done) {
        console.log('Stream reading completed')
        break
      }

      const chunk = decoder.decode(value, { stream: true })
      console.log('Received chunk:', chunk.length > 50 ? chunk.substring(0, 50) + '...' : chunk)
      streamingContent.value += chunk
    }

    // 添加AI回复到消息列表
    if (streamingContent.value) {
      console.log('Adding AI message with content length:', streamingContent.value.length)
      // 计算新的turnIndex：找到当前最大的turnIndex并加1
      const maxTurnIndex = currentMessages.value.length > 0
        ? Math.max(...currentMessages.value.map(m => m.turnIndex))
        : -1
      const aiMessage = {
        id: (Date.now() + 1).toString(),
        memoryId,
        turnIndex: maxTurnIndex + 1,
        messageType: MessageType.AI,
        content: { prompt: '', completion: streamingContent.value },
        sendTime: new Date().toISOString(),
        model: { name: '', tokensInput: 0, tokensOutput: 0 }
      }
      chatStore.addMessage(aiMessage)
    } else {
      console.warn('No streaming content received')
    }

  } catch (error) {
    console.error('Failed to send message:', error)
    // 显示错误消息给用户
    const maxTurnIndex = currentMessages.value.length > 0
      ? Math.max(...currentMessages.value.map(m => m.turnIndex))
      : -1
    const errorMessage = {
      id: (Date.now() + 2).toString(),
      memoryId,
      turnIndex: maxTurnIndex + 1,
      messageType: MessageType.AI,
      content: { prompt: '', completion: '抱歉，发送消息时出现错误，请稍后重试。' },
      sendTime: new Date().toISOString(),
      model: { name: '', tokensInput: 0, tokensOutput: 0 }
    }
    chatStore.addMessage(errorMessage)
  } finally {
    isStreaming.value = false
    streamingContent.value = ''
  }
}

// 检测用户是否在手动滚动
const handleScroll = () => {
  if (!scrollAreaRef.value) return

  const viewport = scrollAreaRef.value.$el?.querySelector('[data-slot="scroll-area-viewport"]')
  if (!viewport) return

  const { scrollTop, scrollHeight, clientHeight } = viewport
  const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10 // 10px容差

  // 如果用户滚动到底部，重新启用自动滚动
  if (isAtBottom) {
    autoScrollEnabled.value = true
    isUserScrolling.value = false
  } else {
    // 用户滚动到其他位置，暂时禁用自动滚动
    autoScrollEnabled.value = false
    isUserScrolling.value = true
  }
}

// 改进的滚动到底部函数
const scrollToBottom = async (smooth = true, force = false) => {
  // 如果用户正在手动滚动且不是强制滚动，则不自动滚动
  if (!force && !autoScrollEnabled.value) {
    return
  }

  await nextTick()

  try {
    // 方法1：使用scrollAnchor滚动到锚点
    if (scrollAnchor.value) {
      scrollAnchor.value.scrollIntoView({
        behavior: smooth ? 'smooth' : 'auto',
        block: 'end'
      })
      return
    }

    // 方法2：直接操作ScrollArea的viewport
    if (scrollAreaRef.value) {
      const viewport = scrollAreaRef.value.$el?.querySelector('[data-slot="scroll-area-viewport"]')
      if (viewport) {
        viewport.scrollTo({
          top: viewport.scrollHeight,
          behavior: smooth ? 'smooth' : 'auto'
        })
        return
      }
    }
  } catch (error) {
    console.warn('滚动到底部失败:', error)
  }
}

// 强制滚动到底部（不使用动画，用于初始加载）
const scrollToBottomInstant = () => scrollToBottom(false, true)

// 滚动到顶部函数
const scrollToTop = async (smooth = true) => {
  await nextTick()

  try {
    if (scrollAreaRef.value) {
      const viewport = scrollAreaRef.value.$el?.querySelector('[data-slot="scroll-area-viewport"]')
      if (viewport) {
        viewport.scrollTo({
          top: 0,
          behavior: smooth ? 'smooth' : 'auto'
        })
        return
      }
    }
  } catch (error) {
    console.warn('滚动到顶部失败:', error)
  }
}

// 监听消息变化，自动滚动到底部
watch(filteredMessages, async (newMessages, oldMessages) => {
  // 如果是新增消息，使用平滑滚动
  if (newMessages.length > (oldMessages?.length || 0)) {
    await nextTick()
    scrollToBottom(true)
  }
}, { deep: true })

// 监听流式内容变化，自动滚动到底部
watch(streamingContent, () => {
  scrollToBottom(true)
})

// 监听当前对话变化，立即滚动到底部
watch(currentMemoryId, async (newMemoryId) => {
  if (newMemoryId) {
    // 等待消息加载完成后立即滚动到底部，不使用动画
    await nextTick()
    scrollToBottomInstant()
  }
})

// 生命周期
onMounted(async () => {
  await chatStore.loadConversations()
})
</script>
