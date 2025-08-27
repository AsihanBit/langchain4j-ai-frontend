<template>
  <span :class="cn('tge-root leading-snug', props.class)">
    <span ref="scope">
      <span
        v-for="(token, idx) in tokens"
        :key="idx"
        :class="token.isSpace ? 'tge-space' : 'tge-word'"
        :style="token.isSpace ? undefined : spanStyle"
      >
        {{ token.text }}
      </span>
    </span>
  </span>
</template>

<script setup lang="ts">
import { computed, type HTMLAttributes, onMounted, ref } from "vue";

import { cn } from "@/lib/utils";

const props = withDefaults(
  defineProps<{
    words: string;
    filter?: boolean;
    duration?: number;
    delay?: number;
    step?: number; // 每个词出现的间隔(ms)
    class?: HTMLAttributes["class"];
  }>(),
  { duration: 0.7, delay: 0, filter: true, step: 200 },
);

const scope = ref<HTMLElement | null>(null);

type Token = { text: string; isSpace: boolean };
const tokens = computed<Token[]>(() => {
  const s = props.words ?? ''
  // 按空白或零宽空格分割；过滤掉零宽分隔符本身，从而实现 CJK 逐字动画且无可见空隙
  const parts = s.split(/(\s+|\u200B)/)
  return parts
    .filter(p => p.length > 0 && p !== '\u200B')
    .map(p => ({ text: p, isSpace: /^\s+$/.test(p) }))
});

const spanStyle = computed(() => ({
  opacity: 0,
  filter: props.filter ? 'blur(10px)' : 'none',
  transition: `opacity ${props.duration}s, filter ${props.duration}s`,
}));

onMounted(() => {
  if (scope.value) {
    const spans = scope.value.querySelectorAll<HTMLElement>('.tge-word');

    setTimeout(() => {
      spans.forEach((span, index) => {
        setTimeout(() => {
          span.style.opacity = '1';
          span.style.filter = props.filter ? 'blur(0px)' : 'none';
        }, index * (props.step ?? 200));
      });
    }, props.delay);
  }
});
</script>
