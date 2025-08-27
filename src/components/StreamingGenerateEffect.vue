<template>
  <span class="sge-root">
    <span class="sge-stable">{{ stableText }}</span>
    <TextGenerateEffect
      v-if="animTextForEffect"
      :key="batchKey"
      :words="animTextForEffect"
      :duration="duration"
      :delay="delay"
      :filter="filter"
      :step="step"
      class="sge-inline-effect"
    />
  </span>
</template>

<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount, type HTMLAttributes } from 'vue'
import { TextGenerateEffect } from '@/components/ui/text-generate-effect'

const emit = defineEmits<{
  (e: 'finished'): void
}>()

const props = withDefaults(defineProps<{
  text: string
  duration?: number
  delay?: number
  filter?: boolean
  step?: number // 每个词/字的间隔（毫秒）
  class?: HTMLAttributes['class']
}>(), {
  duration: 0.4,
  delay: 0,
  filter: true,
  step: 1
})

// 已稳定显示的部分
const stableText = ref('')
// 最近一次输入的全量流式文本
const lastIncoming = ref('')
// 当前正在播放的片段
const animDelta = ref('')
// 等待播放的队列（尚未动画的新增字符）
const pending = ref('')
// 用于强制刷新动画组件
const batchKey = ref(0)
let commitTimer: ReturnType<typeof setTimeout> | null = null

// 在每个“非空白字符”之间插入零宽空格 \u200B，做到真正逐字符动画（中英都适用）
const injectZWSPPerChar = (s: string) => (
  s.replace(/(\S+)/g, (m) => Array.from(m).join('\u200B'))
)

// 提供给 TextGenerateEffect 的字符串
const animTextForEffect = computed(() => {
  const delta = animDelta.value || ''
  if (!delta) return ''
  // 对所有非空白字符逐字插入分隔符（空白保留原样）
  return injectZWSPPerChar(delta)
})

// 启动一批动画（将 lastIncoming 与 stableText 的差值作为本批）
const startBatch = () => {
  if (!lastIncoming.value) return
  if (!lastIncoming.value.startsWith(stableText.value)) {
    // 非前缀增长，直接同步
    stableText.value = lastIncoming.value
    animDelta.value = ''
    return
  }
  let delta = lastIncoming.value.slice(stableText.value.length)
  if (!delta) return

  // 严格顺序：把所有增量都进入等待队列，确保每个字符都经过动画
  const MAX_CHARS = 5 // 每批最多 5 个字符，更频繁的动画
  if (delta.length > MAX_CHARS) {
    // 把超出部分全部放入等待队列，不跳过任何字符
    pending.value += delta.slice(MAX_CHARS)
    delta = delta.slice(0, MAX_CHARS)
  }

  animDelta.value = delta
  batchKey.value++

  // 根据 TextGenerateEffect 的每词延迟（200ms）+ 过渡时长，估算本批完成时间
  // 由于我们用的是 \u200B 拆 CJK，词数近似为字符数
  const perWordDelay = props.step ?? 200
  // 与 TextGenerateEffect 的分词方式保持一致：按空白或零宽空格分隔，空白不计入动画 token
  const parts = animTextForEffect.value
    ? animTextForEffect.value.split(/(\s+|\u200B)/).filter(p => p.length > 0 && p !== '\u200B')
    : []
  const tokensCount = parts.length > 0
    ? parts.filter(p => !/^\s+$/.test(p)).length
    : delta.length // 兜底
  const animDurationMs = Math.max(0, (tokensCount - 1) * perWordDelay) + (props.duration * 1000)
  const commitDelay = animDurationMs + 60

  if (commitTimer) clearTimeout(commitTimer)
  commitTimer = setTimeout(() => {
    // 合并本批
    stableText.value += animDelta.value
    animDelta.value = ''
    commitTimer = null
    // 如果还有等待队列，按顺序继续播；否则检查是否有新的 lastIncoming 增长
    if (pending.value.length > 0) {
      // 取下一批
      const next = pending.value
      pending.value = ''
      // 将下一批拼在 stable 后再启动
      lastIncoming.value = stableText.value + next
      requestAnimationFrame(() => startBatch())
    } else if (lastIncoming.value.length > stableText.value.length) {
      requestAnimationFrame(() => startBatch())
    } else {
      // 队列为空，且没有新增 —— 动画完全结束
      emit('finished')
    }
  }, commitDelay)
}

watch(() => props.text, (val) => {
  lastIncoming.value = val || ''
  if (!lastIncoming.value) {
    stableText.value = ''
    animDelta.value = ''
    if (commitTimer) { clearTimeout(commitTimer); commitTimer = null }
    return
  }
  // 空闲时才启动一批，避免打断现有动画
  if (!animDelta.value) {
    startBatch()
  }
}, { immediate: true })

onBeforeUnmount(() => { if (commitTimer) clearTimeout(commitTimer) })
</script>

<style scoped>
.sge-root {
  display: inline;
  line-height: inherit;
  letter-spacing: inherit;
  white-space: pre-wrap; /* 保留换行 */
}
:deep(.sge-inline-effect) {
  display: inline;
  line-height: inherit;
  letter-spacing: inherit;
}
:deep(.sge-inline-effect span) {
  display: inline; /* 避免 inline-block 带来额外间距与断行 */
  vertical-align: baseline;
}
.sge-stable { white-space: inherit; }
</style>

