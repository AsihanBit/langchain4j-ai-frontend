import request from '@/utils/request'
import type {
  ConversationsRes,
  CreateNewConversationRes,
  MessagesRes,
  ChatReq,
  ApiResponse,
  GenerateTitleRes,
} from '@/types/chat'

// 获取用户所有对话列表
export const getConversationsByIp = (): Promise<ApiResponse<ConversationsRes>> => {
  return request.get('/conversation/getConversationsByIp')
}

// 创建新对话
export const createNewConversation = (): Promise<ApiResponse<CreateNewConversationRes>> => {
  return request.post('/conversation/createNew')
}

// 生成会话标题（根据第一条消息）
export const generateConversationTitle = (data: {
  memoryId: string
  message: string
}): Promise<ApiResponse<GenerateTitleRes>> => {
  return request.post('/conversation/generateTitle', data)
}

// 根据memoryId获取对话消息
export const getMessagesById = (memoryId: string): Promise<ApiResponse<MessagesRes>> => {
  return request.get('/message/getMessagesById', {
    params: { memoryId },
  })
}

// 发送聊天消息（流式响应）- 必须使用fetch，不能用axios
export const sendChatMessage = async (data: ChatReq) => {
  try {
    console.log('Sending chat message:', data)

    const response = await fetch('/api/chat/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/plain',
      },
      body: JSON.stringify(data),
    })

    console.log('Response status:', response.status)
    console.log('Response headers:', Object.fromEntries(response.headers.entries()))

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Stream API error:', errorText)
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`)
    }

    // 获取memoryId（如果后端通过header传递）
    const memoryId = response.headers.get('X-Memory-Id')
    console.log('Memory ID from header:', memoryId)

    // 检查响应类型
    const contentType = response.headers.get('content-type')
    console.log('Content-Type:', contentType)

    if (!response.body) {
      throw new Error('No response body')
    }

    return {
      stream: response.body,
      memoryId: memoryId || data.memoryId, // 优先使用header中的，否则使用请求中的
    }
  } catch (error) {
    console.error('Failed to send chat message:', error)
    throw error
  }
}
