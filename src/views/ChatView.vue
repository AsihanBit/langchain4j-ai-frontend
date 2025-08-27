<template>
  <div class="chat-view-container">
    <!-- 左侧对话列表 -->
    <div
      :class="[
        'sidebar',
        isSidebarCollapsed ? 'sidebar-collapsed' : 'sidebar-expanded'
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
        'toggle-button',
        isSidebarCollapsed ? 'toggle-button-collapsed' : 'toggle-button-expanded'
      ]"
    >
      <Button
        @click="isSidebarCollapsed = !isSidebarCollapsed"
        variant="outline"
        size="sm"
        class="toggle-btn"
      >
        <Menu v-if="isSidebarCollapsed" class="icon-size" />
        <X v-else class="icon-size" />
      </Button>
    </div>

    <!-- 右侧主聊天区域 -->
    <div class="main-chat-area">
      <!-- 顶部导航栏 -->
      <div class="chat-header">
        <div class="header-center">
          <NavigationMenu>
            <NavigationMenuList>
              <NavigationMenuItem>
                <NavigationMenuTrigger>菜单</NavigationMenuTrigger>
                <NavigationMenuContent>
                  <div class="menu-content">
                    <NavigationMenuLink asChild>
                      <Button
                        variant="ghost"
                        class="menu-button"
                        @click="handleGoHome"
                      >
                        回到主页
                      </Button>
                    </NavigationMenuLink>
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
        </div>

        <!-- 右侧主题切换按钮 -->
        <div class="header-right">
          <ThemeToggle />
        </div>
      </div>

      <!-- 聊天界面 -->
      <div class="chat-interface">
        <!-- 聊天消息区域 -->
        <div class="messages-area">
          <ScrollArea ref="scrollAreaRef" class="scroll-area" @scroll="handleScroll">
            <div class="messages-padding">
              <div class="messages-container">
                <!-- 消息按后端返回的倒序遍历，从上到下显示 -->
                <ChatMessage
                  v-for="message in filteredMessages"
                  :key="message.id"
                  :message="message"
                />

                <!-- AI正在输入的消息 -->
                <div v-if="isStreaming" class="streaming-message">
                  <div class="streaming-bubble">
                    <div class="streaming-header">
                      <div class="ai-thinking-dots">
                        <div class="dot"></div>
                        <div class="dot"></div>
                        <div class="dot"></div>
                      </div>
                      <span class="streaming-text">回复中...</span>
                    </div>
                    <div v-if="streamingContent" class="streaming-content">
                      {{ streamingContent }}
                    </div>
                  </div>
                </div>

                <!-- 滚动锚点放在最后（最底部） -->
                <div ref="scrollAnchor" class="scroll-anchor"></div>
              </div>
            </div>
          </ScrollArea>

          <!-- 滚动按钮组 -->
          <div class="scroll-buttons">
            <!-- 滚动到顶部按钮 -->
            <Button
              @click="() => scrollToTop(true)"
              class="scroll-btn scroll-top-btn"
              size="sm"
              variant="outline"
            >
              <ChevronUp class="icon-size" />
            </Button>

            <!-- 滚动到底部按钮 -->
            <Button
              @click="() => scrollToBottom(true, true)"
              class="scroll-btn scroll-bottom-btn"
              size="sm"
              variant="outline"
            >
              <ChevronDown class="icon-size" />
            </Button>
          </div>
        </div>

        <!-- 输入区域 -->
        <div class="input-area">
          <div class="input-container">
            <div class="input-wrapper">
              <Textarea
                v-model="chatMessage"
                placeholder="输入消息..."
                class="message-input"
                @keydown.enter.exact.prevent="handleSendMessage"
                @keydown.enter.shift.exact="() => {}"
              />
              <Button
                @click="handleSendMessage"
                :disabled="!chatMessage.trim() || isStreaming"
                class="send-button"
              >
                <Send class="icon-size" />
              </Button>
            </div>
            <p class="input-hint">
              按 Enter 发送，Shift + Enter 换行
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onActivated, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Send, ChevronDown, ChevronUp, Menu, X } from 'lucide-vue-next'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@/components/ui/navigation-menu'
import ConversationList from '@/components/ConversationList.vue'
import ChatMessage from '@/components/ChatMessage.vue'
import ThemeToggle from '@/components/shadcn/ThemeToggle.vue'
import { useChatStore } from '@/stores/chat'
import { sendChatMessage, generateConversationTitle } from '@/api/chat'
import { MessageType } from '@/types/chat'

const chatStore = useChatStore()
const route = useRoute()
const router = useRouter()

// 响应式数据
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
const conversations = computed(() => chatStore.conversations)

// 过滤并排序消息：只显示用户和AI的对话，按turnIndex正序排列
const filteredMessages = computed(() => {
  return currentMessages.value
    .filter(message =>
      message.messageType === MessageType.USER ||
      message.messageType === MessageType.AI
    )
    .sort((a, b) => a.turnIndex - b.turnIndex) // 按turnIndex正序：最早的在上面，最新的在下面
})



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

const handleGoHome = () => {
  router.push({ name: 'home' })
}



const handleSendMessage = async () => {
  if (!chatMessage.value.trim() || !currentMemoryId.value || isStreaming.value) return

  const messageToSend = chatMessage.value.trim()
  chatMessage.value = '' // 立即清空输入框

  try {
    const isFirstMessage = currentMessages.value.length === 0
    await sendMessage(messageToSend, currentMemoryId.value)

    // 若是第一条消息，调用生成标题接口
    if (isFirstMessage) {
      try {
        const res = await generateConversationTitle({ memoryId: currentMemoryId.value, message: messageToSend })
        if (res.code === 1 && res.data?.title) {
          const id = res.data.memoryId || currentMemoryId.value
          chatStore.updateConversationTitle(id, res.data.title)
        }
      } catch (e) {
        console.warn('generateConversationTitle failed:', e)
      }
    }
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

// 监听路由变化，确保对话列表已加载
watch(() => route.path, async (newPath) => {
  if (newPath === '/chat' && conversations.value.length === 0) {
    console.log('Route changed to /chat, loading conversations...')
    await chatStore.loadConversations()
  }
}, { immediate: true })

// 生命周期
onMounted(async () => {
  console.log('ChatView mounted, loading conversations...')
  await chatStore.loadConversations()

  // 处理从 Home 页面带来的首条消息（通过 store 暂存，不污染 URL）
  const initialMessage = chatStore.consumePendingInitialMessage()
  const initialMemoryId = currentMemoryId.value
  if (initialMessage && initialMemoryId) {
    const isFirstMessage = currentMessages.value.length === 0
    await sendMessage(initialMessage, initialMemoryId)

    if (isFirstMessage) {
      try {
        const res = await generateConversationTitle({ memoryId: initialMemoryId, message: initialMessage })
        if (res.code === 1 && res.data?.title) {
          const id = res.data.memoryId || initialMemoryId
          chatStore.updateConversationTitle(id, res.data.title)
        }
      } catch (e) {
        console.warn('generateConversationTitle (initial) failed:', e)
      }
    }
  }
})

// 组件激活时也重新加载对话列表（用于路由缓存的情况）
onActivated(async () => {
  console.log('ChatView activated, reloading conversations...')
  // 如果对话列表为空，重新加载
  if (conversations.value.length === 0) {
    await chatStore.loadConversations()
  }
})
</script>

<style lang="scss" scoped>
// ===== 聊天页面样式 =====

// 主容器
.chat-view-container {
  height: 100vh; // 全屏高度
  display: flex; // 水平布局
  background-color: white; // 默认背景色
  overflow: hidden; // 隐藏溢出内容，防止页面滚动条

  .dark & {
    background-color: #111827; // 暗色主题背景
  }
}

// 左侧边栏
.sidebar {
  height: 100%; // 占满父容器高度
  border-right: 1px solid #e5e7eb; // 右边框分隔线
  transition: all 0.3s ease; // 平滑过渡动画

  .dark & {
    border-right-color: #374151; // 暗色主题边框色
  }

  &.sidebar-expanded {
    width: 20rem; // 展开状态宽度 (320px)
  }

  &.sidebar-collapsed {
    width: 0; // 折叠状态宽度
    overflow: hidden; // 隐藏内容
  }
}

// 折叠/展开按钮
.toggle-button {
  position: absolute; // 绝对定位
  top: 1rem; // 距离顶部距离
  z-index: 20; // 层级，确保在最上层
  transition: all 0.3s ease; // 平滑过渡动画

  &.toggle-button-collapsed {
    left: 1rem; // 侧边栏折叠时的左边距
  }

  &.toggle-button-expanded {
    left: 21rem; // 侧边栏展开时的左边距 (336px)
  }

  .toggle-btn {
    border-radius: 50%; // 圆形按钮
    width: 2.5rem; // 按钮宽度
    height: 2.5rem; // 按钮高度
    padding: 0; // 无内边距
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05); // 阴影效果
  }
}

// 右侧主聊天区域
.main-chat-area {
  flex: 1; // 占据剩余空间
  display: flex; // 垂直布局
  flex-direction: column; // 垂直方向
  position: relative; // 相对定位
  height: 100%; // 占满父容器高度
  overflow: hidden; // 隐藏溢出内容
}

// 顶部导航栏样式
.chat-header {
  display: flex; // 水平布局
  align-items: center; // 垂直居中对齐
  justify-content: space-between; // 左右分布
  flex-shrink: 0; // 防止被压缩
  padding: 1rem; // 内边距
  border-bottom: 1px solid #e5e7eb; // 底部边框

  .dark & {
    border-bottom-color: #374151; // 暗色主题边框色
  }

  .header-center {
    flex: 1; // 占据中间空间
    display: flex; // 水平布局
    justify-content: center; // 水平居中
  }

  .header-right {
    display: flex; // 水平布局
    align-items: center; // 垂直居中对齐
  }

  .menu-content {
    padding: 1rem; // 内边距
    width: 12rem; // 菜单宽度 (192px)
  }

  .menu-button {
    width: 100%; // 占满宽度
    justify-content: flex-start; // 左对齐
  }
}

// 聊天界面
.chat-interface {
  flex: 1; // 占据剩余空间
  display: flex; // 垂直布局
  flex-direction: column; // 垂直方向
  min-height: 0; // 允许收缩
  overflow: hidden; // 隐藏溢出内容
}

// 消息区域
.messages-area {
  flex: 1; // 占据剩余空间
  min-height: 0; // 允许收缩
  position: relative; // 相对定位
  overflow: hidden; // 隐藏溢出内容

  .scroll-area {
    height: 100%; // 占满父容器高度
  }

  .messages-padding {
    padding: 1rem; // 消息区域内边距
  }

  .messages-container {
    max-width: 62rem; // 最大宽度 (896px)
    min-width: 35rem; // 最小宽度
    margin: 0 auto; // 水平居中
    display: flex; // 垂直布局
    flex-direction: column; // 垂直方向
    gap: 1rem; // 🎯 消息之间的垂直间距 - 调整此值可改变用户消息和AI回复之间的距离
  }

  .scroll-anchor {
    height: 0.25rem; // 滚动锚点高度
  }
}

// 流式消息样式
.streaming-message {
  display: flex; // 水平布局
  justify-content: flex-start; // 左对齐

  .streaming-bubble {
    max-width: 80%; // 最大宽度限制
    background-color: #f3f4f6; // 背景色
    border-radius: 1rem; // 圆角
    border-bottom-left-radius: 0.375rem; // 左下角小圆角
    padding: 0.75rem 1rem; // 内边距

    .dark & {
      background-color: #374151; // 暗色主题背景
    }

    .streaming-header {
      display: flex; // 水平布局
      align-items: center; // 垂直居中对齐
      gap: 0.5rem; // 元素间距
    }

    .streaming-text {
      font-size: 0.875rem; // 字体大小
      color: #6b7280; // 文字颜色
    }

    .streaming-content {
      margin-top: 0.5rem; // 上边距
      white-space: pre-wrap; // 保留换行和空格
      font-size: 0.875rem; // 字体大小
      color: #111827; // 文字颜色

      .dark & {
        color: #f9fafb; // 暗色主题文字颜色
      }
    }
  }
}

// AI思考动画 - 三个跳动的圆点
.ai-thinking-dots {
  display: flex; // 水平布局
  gap: 0.25rem; // 圆点间距

  .dot {
    width: 0.5rem; // 圆点宽度
    height: 0.5rem; // 圆点高度
    background-color: #9ca3af; // 圆点颜色
    border-radius: 50%; // 圆形
    animation: bounce 1s infinite; // 跳动动画

    &:nth-child(2) {
      animation-delay: 0.1s; // 第二个圆点延迟
    }

    &:nth-child(3) {
      animation-delay: 0.2s; // 第三个圆点延迟
    }
  }
}

// 滚动按钮组
.scroll-buttons {
  position: absolute; // 绝对定位
  right: 1rem; // 距离右边距离
  bottom: 5rem; // 距离底部距离
  display: flex; // 垂直布局
  flex-direction: column; // 垂直方向
  gap: 0.5rem; // 按钮间距
  z-index: 10; // 层级

  .scroll-btn {
    border-radius: 50%; // 圆形按钮
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05); // 阴影效果
    width: 2.5rem; // 按钮宽度
    height: 2.5rem; // 按钮高度
    padding: 0; // 无内边距
    background-color: white; // 背景色
    border: 1px solid #d1d5db; // 边框

    .dark & {
      background-color: #374151; // 暗色主题背景
      border-color: #4b5563; // 暗色主题边框色
    }
  }
}

// 输入区域
.input-area {
  flex-shrink: 0; // 防止被压缩
  border-top: 1px solid #e5e7eb; // 顶部边框
  padding: 1rem; // 内边距

  .dark & {
    border-top-color: #374151; // 暗色主题边框色
  }

  .input-container {
    max-width: 56rem; // 最大宽度 (896px)
    margin: 0 auto; // 水平居中
  }

  .input-wrapper {
    display: flex; // 水平布局
    gap: 1rem; // 元素间距
  }

  .message-input {
    flex: 1; // 占据剩余空间
    min-height: 2.75rem; // 最小高度 (44px)
    max-height: 8rem; // 最大高度 (128px)
    resize: none; // 禁止调整大小
  }

  .send-button {
    padding-left: 1.5rem; // 左内边距
    padding-right: 1.5rem; // 右内边距
  }

  .input-hint {
    font-size: 0.75rem; // 字体大小
    color: #6b7280; // 文字颜色
    margin-top: 0.5rem; // 上边距
  }
}

// 通用图标尺寸
.icon-size {
  width: 1rem; // 图标宽度
  height: 1rem; // 图标高度
}

// 跳动动画关键帧
@keyframes bounce {
  0%, 80%, 100% {
    transform: scale(0); // 缩放为0
  }
  40% {
    transform: scale(1); // 缩放为1
  }
}
</style>
