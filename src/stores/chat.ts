import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Conversation, Message } from '@/types/chat'
import { getConversationsByIp, getMessagesById, createNewConversation } from '@/api/chat'

export const useChatStore = defineStore('chat', () => {
  // 状态
  const conversations = ref<Conversation[]>([])
  const currentMemoryId = ref<string>('')
  const currentMessages = ref<Message[]>([])
  const isLoading = ref(false)
  const isCreatingConversation = ref(false)

  // 计算属性
  const currentConversation = computed(() => {
    return conversations.value.find((conv) => conv.memoryId === currentMemoryId.value)
  })

  const hasConversations = computed(() => {
    return conversations.value.length > 0
  })

  // 方法
  const loadConversations = async () => {
    try {
      isLoading.value = true
      const response = await getConversationsByIp()
      console.log('API Response:', response)
      if (response.code === 1) {
        conversations.value = response.data.conversations
        console.log('Conversations loaded:', conversations.value)
      } else {
        console.log('API returned non-success code:', response.code)
      }
    } catch (error) {
      console.error('Failed to load conversations:', error)
    } finally {
      isLoading.value = false
    }
  }

  const loadMessages = async (memoryId: string) => {
    try {
      isLoading.value = true
      const response = await getMessagesById(memoryId)
      if (response.code === 1) {
        // 直接使用后端返回的消息顺序（turnIndex从大到小）
        // 页面会从下到上显示，方便以后实现分页加载
        currentMessages.value = response.data.messages
        currentMemoryId.value = memoryId
      }
    } catch (error) {
      console.error('Failed to load messages:', error)
    } finally {
      isLoading.value = false
    }
  }

  const createConversation = async () => {
    try {
      isCreatingConversation.value = true
      const response = await createNewConversation()
      if (response.code === 1) {
        currentMemoryId.value = response.data.memoryId
        currentMessages.value = []
        // 重新加载对话列表
        await loadConversations()
        return response.data.memoryId
      }
    } catch (error) {
      console.error('Failed to create conversation:', error)
    } finally {
      isCreatingConversation.value = false
    }
  }

  const setCurrentMemoryId = (memoryId: string) => {
    currentMemoryId.value = memoryId
  }

  const clearCurrentConversation = () => {
    currentMemoryId.value = ''
    currentMessages.value = []
  }

  const addMessage = (message: Message) => {
    // 简单地添加到数组末尾，让页面显示时再处理顺序
    currentMessages.value.push(message)
  }

  return {
    // 状态
    conversations,
    currentMemoryId,
    currentMessages,
    isLoading,
    isCreatingConversation,

    // 计算属性
    currentConversation,
    hasConversations,

    // 方法
    loadConversations,
    loadMessages,
    createConversation,
    setCurrentMemoryId,
    clearCurrentConversation,
    addMessage,
  }
})
