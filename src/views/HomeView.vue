<template>
  <div class="home-container">
    <!-- 背景 -->
    <FallingStarsBg class="bg-white dark:bg-black" :color="isDark ? '#FFF' : '#555'" />

    <!-- 右上角主题切换按钮 -->
    <div class="theme-toggle-container">
      <ThemeToggle />
    </div>

    <!-- 主内容 -->
    <div class="main-content">
      <!-- 三栏布局 -->
      <div class="three-column-layout">
        <!-- 左侧 - ParticleImage -->
        <div class="left-section">
          <div class="particle-container">
            <ParticleImage
              class="particle-image"
              image-src="/assets/home-text.png"
              :responsive-width="true"
            />
          </div>
        </div>

        <!-- 中间 - 标题和内容 -->
        <div class="center-section">
          <h1 :class="['main-title', { dark: isDark }]">Langchain</h1>
          <p :class="['subtitle', { dark: isDark }]">轻量演示页</p> <!-- 开始新的对话，探索无限可能 -->
          <!-- 底部输入和按钮区域 -->
          <div class="bottom-section">
            <!-- 输入区域 -->
            <div class="input-container">
              <VanishingInput
                v-model="welcomeMessage"
                :placeholders="welcomePlaceholders"
                @submit="handleWelcomeSubmit"
              />
            </div>

            <!-- 按钮组 -->
            <div class="button-group">
              <InteractiveHoverButton text="开始新聊天" @click="handleNewChat" />
              <InteractiveHoverButton text="进入聊天" @click="handleGoToChat" />
            </div>

            <!-- Dock：中间偏下展示 GitHub 链接预览 -->
            <div class="dock-area">
              <Dock class="mb-6" :magnification="40">
                <!-- :distance="10" -->
                <!-- GitHub 主入口 -->
                <DockIcon :disableMagnify="true">
                  <!-- :fixedSize="40" -->
                  <a
                    href="https://github.com/AsihanBit"
                    target="_blank"
                    aria-label="GitHub 主页"
                    class="dock-fill-link"
                  >
                    <Icon icon="mdi:github" class="dock-icon--fill" />
                  </a>
                </DockIcon>
                <DockSeparator />
                <!-- 前端仓库 -->
                <DockIcon style="min-width: 50px;">
                  <a
                    href="https://github.com/AsihanBit/langchain4j-ai-frontend"
                    target="_blank"
                    class="flex items-center justify-center size-full"
                  >
                    演示页
                  </a>
                </DockIcon>
                <!-- 后端仓库 -->
                <DockIcon>
                  <a
                    href="https://github.com/AsihanBit/langchain4j-ai-assistant"
                    target="_blank"
                    class="flex items-center justify-center size-full"
                  >
                    <!--  text-sm sm:text-base -->
                    后端
                  </a>
                </DockIcon>
              </Dock>
            </div>
          </div>
        </div>

        <!-- 右侧 - 空置域 -->
        <div class="right-section">
          <div :class="['placeholder-area', { dark: isDark }]">
            <br/>
            <div class="placeholder-text">
              <p>本页面是</p>
              <strong>主体项目的演示版</strong>，
              <p>仅用于演示.</p>
              <p>了解完整项目请访问</p>
            <br/>

            <LinkPreview
              url="https://github.com/AsihanBit/langchain4j-ai-frontend"
              class="font-bold"
              :width="500"
              :height="250"
            >
              <a href="https://github.com/AsihanBit/langchain4j-ai-frontend" target="_blank">
                演示页
              </a>
            </LinkPreview>
            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
            <LinkPreview
              url="https://github.com/AsihanBit/langchain4j-ai-assistant"
              class="font-bold"
              :width="500"
              :height="250"
            >
            <a href="https://github.com/AsihanBit/langchain4j-ai-assistant" target="_blank">
                后端
              </a>
            </LinkPreview>
            <br/>
            <br/>
            <p style="font-size: 10px;">*目标网站原因，预览框加载较慢</p>
            </div>

          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useColorMode } from '@vueuse/core'
import { FallingStarsBg } from '@/components/ui/bg-falling-stars'
import { VanishingInput } from '@/components/ui/vanishing-input'
import { InteractiveHoverButton } from '@/components/ui/interactive-hover-button'
import { ParticleImage } from '@/components/ui/particle-image'
import { LinkPreview } from '@/components/ui/link-preview'
import { Dock, DockIcon, DockSeparator } from '@/components/ui/dock'
// import { GithubIcon as Github } from 'lucide-vue-next'
import ThemeToggle from '@/components/shadcn/ThemeToggle.vue'
import { useChatStore } from '@/stores/chat'
import { Icon } from '@iconify/vue'
const router = useRouter()
const chatStore = useChatStore()

// 响应式数据
const welcomeMessage = ref('')

// 计算属性 - 先在 setup 中调用 useColorMode，再在 computed 中使用，避免 onMounted 警告
const colorMode = useColorMode()
const isDark = computed(() => colorMode.value === 'dark')

// 欢迎页面的占位符
const welcomePlaceholders = [
  '你好，有什么可以帮助你的吗？',
  '今天想聊什么话题？',
  '开始我们的对话吧！',
]

// 处理欢迎页面输入提交
const handleWelcomeSubmit = async (message: string) => {
  if (!message.trim()) return

  // 创建新对话并跳转到聊天页面
  const memoryId = await chatStore.createConversation()
  if (memoryId) {
    // 将首条消息暂存到 store，不污染 URL
    chatStore.setPendingInitialMessage(message.trim())
    // 若需要也可设置当前会话ID（createConversation 已设置）
    // chatStore.setCurrentMemoryId(memoryId)
    router.push({ name: 'chat' })
  }
}

// 处理新聊天按钮点击
const handleNewChat = async () => {
  // 创建新对话并跳转到聊天页面
  const memoryId = await chatStore.createConversation()
  if (memoryId) {
    router.push({ name: 'chat' })
  }
}

// 处理直接进入聊天按钮点击
const handleGoToChat = async () => {
  // 确保对话列表已加载，然后跳转到聊天页面
  await chatStore.loadConversations()
  router.push({ name: 'chat' })
}
</script>

<style lang="scss" scoped>
// ===== 主页布局样式 =====

// 主容器 - 全屏高度的弹性布局容器
.home-container {
  position: relative;
  height: 100vh;
  display: flex;
  flex-direction: column;
}

// 背景样式现在直接使用Tailwind类：bg-white dark:bg-black

// 右上角主题切换按钮容器
.theme-toggle-container {
  position: absolute;
  top: 1.5rem; // 距离顶部24px
  right: 1.5rem; // 距离右边24px
  z-index: 10; // 确保在其他元素之上
}

// 主内容区域 - 包含三栏布局和底部输入区域
.main-content {
  position: relative;
  z-index: 1;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between; // 上下分布，确保底部内容不超出
  padding: 2rem;
  min-height: 0;
  max-height: calc(100vh - 4rem); // 限制最大高度，防止溢出
  overflow: hidden; // 隐藏溢出内容
}

// ===== 三栏布局区域 =====

// 三栏网格布局 - 左中右三个区域
.three-column-layout {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr; // 三等分布局
  gap: 10rem;
  align-items: center; // 确保所有列都垂直居中对齐
  justify-items: center; // 确保所有列都水平居中对齐
  max-width: 1200px;
  margin: 0 auto; // 水平居中
  flex-shrink: 0; // 防止被压缩
  min-height: 300px; // 给三栏一个最小高度，确保有足够空间对齐
}

// 左侧区域 - 粒子图片容器
.left-section {
  display: flex;
  justify-content: center;
  align-items: center; // 垂直居中对齐
  height: 800px;
  .particle-container {
    // display: flex;
    // justify-content: center;
    // align-items: center;
    max-width: 300px; // 限制粒子图片最大宽度
  }
}

// 中间区域 - 标题和描述文字
.center-section {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  width: 100%; // 确保占满网格列的宽度
  gap: 1rem;

  .main-title {
    font-size: 3rem;
    font-weight: bold;
    color: black;
    margin-bottom: 1rem;
    line-height: 1.2; // 设置行高，避免文字基线对齐问题

    // 暗色主题下的标题颜色
    &.dark {
      color: white;
    }
  }

  .subtitle {
    // margin-top: 2rem; // 在主标题的“内部”底部增加空间
    font-size: 1.25rem;
    color: #6b7280; // 灰色文字
    line-height: 1.4; // 设置行高
    // 暗色主题下的副标题颜色
    &.dark {
      color: #9ca3af;
    }
  }
}

// 右侧区域 - 预留空间
.right-section {
  display: flex;
  justify-content: center;
  align-items: center; // 垂直居中对齐，与左侧保持一致

  .placeholder-area {
    width: 200px;
    height: 200px;
    border: 2px dashed #d1d5db; // 虚线边框
    border-radius: 0.5rem;
    display: inline-block;
    align-items: center;
    justify-content: center;

    // 暗色主题下的边框颜色
    &.dark {
      border-color: #4b5563;
    }

    .placeholder-text {
      color: #908ca3;
      font-size: 0.875rem;
      text-align: center;

      // 暗色主题下的文字颜色
      &.dark {
        color: #465675;
      }
    }
  }
}

// ===== 底部输入和按钮区域 =====

// 底部区域容器 - 包含输入框和按钮
.bottom-section {
  max-width: 600px;
  margin: 0 auto;
  width: 100%;
  flex-shrink: 0; // 防止被压缩
  padding-bottom: 2rem; // 底部留白，防止贴边

  .input-container {
    margin-bottom: 1.5rem; // 输入框与按钮的间距
  }

  .button-group {
    display: flex;
    gap: 1rem; // 按钮之间的间距
    justify-content: center;
    flex-wrap: wrap; // 小屏幕下允许换行
  }
}

// ===== 响应式设计 =====

// 平板设备适配 (1024px以下)
@media (max-width: 1024px) {
  .center-section {
    .main-title {
      font-size: 2.5rem; // 缩小标题字体
    }
  }

  .three-column-layout {
    gap: 1.5rem; // 减少栅格间距
  }

  .right-section {
    .placeholder-area {
      width: 150px; // 缩小预留区域
      height: 150px;
    }
  }
}

// 手机设备适配 (768px以下)
@media (max-width: 768px) {
  .three-column-layout {
    grid-template-columns: 1fr; // 改为单列布局
    gap: 1rem;
    text-align: center;
  }

  .center-section {
    .main-title {
      font-size: 2rem; // 进一步缩小标题
    }

    .subtitle {
      font-size: 1rem; // 缩小副标题
    }
  }

  .main-content {
    padding: 1rem; // 减少内边距
  }
}

// Dock 填充样式：让内容填满 DockIcon 动态尺寸
.dock-icon--fill {
  width: 100%;
  height: 100%;
}
.dock-fill-link {
  display: block;
  width: 100%;
  height: 100%;
}
</style>
