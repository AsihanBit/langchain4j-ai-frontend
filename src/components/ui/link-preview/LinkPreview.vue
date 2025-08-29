<template>
  <div :class="cn('relative inline-block', props.class)">
    <!-- Trigger -->
    <NuxtLink
      :to="normalizedUrl"
      :class="cn('text-black dark:text-white', props.linkClass)"
      @mousemove="handleMouseMove"
      @mouseenter="showPreview"
      @mouseleave="hidePreview"
    >
      <slot />
    </NuxtLink>

    <!-- Preview -->
    <div
      v-if="isVisible"
      ref="preview"
      class="pointer-events-none absolute z-50"
      :style="previewStyle"
    >
      <div
        class="overflow-hidden rounded-xl shadow-xl"
        :class="[popClass, { 'transform-gpu': !props.isStatic }]"
      >
        <div
          class="block rounded-xl border-2 border-transparent bg-white p-1 shadow-lg dark:bg-gray-900"
        >
          <img
            :src="previewSrc"
            :width="width"
            :height="height"
            class="size-full rounded-lg object-cover"
            :style="imageStyle"
            alt="preview"
            @load="handleImageLoad"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, type CSSProperties } from "vue";
import { cn } from "@/lib/utils";

interface BaseProps {
  class?: string;
  linkClass?: string;
  width?: number;
  height?: number;
}

// Props for static image mode
interface StaticImageProps extends BaseProps {
  isStatic?: true;
  imageSrc?: string;
  url?: string; // optional in static mode
}

// Props for URL preview mode
interface URLPreviewProps extends BaseProps {
  isStatic?: false; // optional but must be false if specified
  imageSrc?: string; // optional in URL mode
  url?: string;
}

// Combined type that enforces the requirements
type Props = StaticImageProps | URLPreviewProps;
const props = withDefaults(defineProps<Props>(), {
  isStatic: false,
  imageSrc: "",
  url: "",
  width: 200,
  height: 125,
});

const isVisible = ref(false);
const isLoading = ref(true);
const preview = ref<HTMLElement | null>(null);
const hasPopped = ref(false);

// Generate preview URL
// 确保 URL 带协议，避免某些站点（如 GitHub 仓库）因缺少协议解析异常
const normalizedUrl = computed(() => {
  const u = props.url?.trim() || ''
  if (!u) return ''
  return /^(https?:)?\/\//i.test(u) ? u : `https://${u}`
})

const previewSrc = computed(() => {
  if (props.isStatic) return props.imageSrc;

  const isGithub = /^(https?:\/\/)?(www\.)?github\.com\//i.test(normalizedUrl.value)

  const params = new URLSearchParams({
    url: normalizedUrl.value,
    screenshot: "true",
    meta: "false",
    embed: "screenshot.url",
    colorScheme: "light",
    // GitHub 在移动视口下可能出现空白，关闭 isMobile 以获得稳定截图
    "viewport.isMobile": isGithub ? "false" : "true",
    "viewport.deviceScaleFactor": "1",
    "viewport.width": String(props.width * 3),
    "viewport.height": String(props.height * 3),
  });

  return `https://api.microlink.io/?${params.toString()}`;
});

// Position tracking
const mousePosition = reactive({
  x: 0,
  y: 0,
});

// Calculate preview position
const previewStyle = computed<CSSProperties>(() => {
  if (!preview.value) return {};

  const offset = 20;
  const previewWidth = props.width;
  const previewHeight = props.height;
  const viewportWidth = window.innerWidth;

  let x = mousePosition.x - previewWidth / 2;
  x = Math.min(Math.max(0, x), viewportWidth - previewWidth);

  const linkRect = preview.value.parentElement?.getBoundingClientRect();
  const y = linkRect ? linkRect.top - previewHeight - offset : 0;

  return {
    position: "fixed",
    left: `${x}px`,
    top: `${y}px`,
    width: `${previewWidth}px`,
    height: `${previewHeight}px`,
  };
});

// Image specific styling
const imageStyle = computed<CSSProperties>(() => ({
  width: `${props.width}px`,
  height: `${props.height}px`,
}));

// Pop animation class
const popClass = computed(() => {
  if (!hasPopped.value) return "";
  return "animate-pop";
});

function handleMouseMove(event: MouseEvent) {
  mousePosition.x = event.clientX;
  mousePosition.y = event.clientY;
}

function showPreview() {
  isVisible.value = true;
  setTimeout(() => {
    hasPopped.value = true;
  }, 50);
}

function hidePreview() {
  isVisible.value = false;
  hasPopped.value = false;
}

function handleImageLoad() {
  isLoading.value = false;
}
</script>

<style scoped>
.transform-gpu {
  transform: scale3d(0, 0, 1);
  transform-origin: center bottom;
  will-change: transform;
  backface-visibility: hidden;
}

.animate-pop {
  animation: pop 1000ms ease forwards;
  will-change: transform;
}

@keyframes pop {
  0% {
    transform: scale3d(0.26, 0.26, 1);
  }
  25% {
    transform: scale3d(1.1, 1.1, 1);
  }
  65% {
    transform: scale3d(0.98, 0.98, 1);
  }
  100% {
    transform: scale3d(1, 1, 1);
  }
}
</style>
