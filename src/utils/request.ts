import axios, { type AxiosResponse } from 'axios'
import type { ApiResponse } from '@/types/chat'

const request = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 响应拦截器：自动拆掉一层，返回data
// 说明：Axios 的类型签名要求返回 AxiosResponse，这里刻意返回 response.data
// 为避免 TS 报错，使用类型断言将回调签名放宽（仅影响类型检查，不影响运行时行为）
request.interceptors.response.use(
  ((response: AxiosResponse<ApiResponse>) => {
    return response.data
  }) as any,
  (error) => {
    console.error('Request error:', error)
    return Promise.reject(error)
  },
)

export default request
