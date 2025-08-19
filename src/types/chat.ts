export interface Conversation {
  id: string
  memoryId: string
  userIp: string
  createdTime?: string
  lastSendTime?: string
}

export interface ConversationsRes {
  conversations: Conversation[]
  totalCount: number
}

export interface CreateNewConversationRes {
  memoryId: string
  message: string
}

export interface Message {
  id: string
  memoryId: string
  turnIndex: number
  messageType: MessageType
  content: Content
  sendTime: string
  model: ModelInfo
  metadata?: Record<string, any>
  toolCalls?: ToolCall[]
}

export interface MessagesRes {
  memoryId: string
  messages: Message[]
  totalCount: number
}

export interface Content {
  prompt: string
  completion: string
}

export interface ModelInfo {
  name: string
  tokensInput: number
  tokensOutput: number
}

export interface ToolCall {
  toolName: string
  result: string
  timestamp: string
}

export enum MessageType {
  USER = 'USER',
  AI = 'AI',
  TOOL_CALL = 'TOOL_CALL',
  TOOL_RESULT = 'TOOL_RESULT',
  SYSTEM = 'SYSTEM',
}

export interface ChatReq {
  memoryId: string
  message: string
}

export interface ChatStreamRes {
  memoryId: string
  contentStream: ReadableStream<string>
}

export interface ApiResponse<T = any> {
  code: number
  data: T
  msg: string
}
