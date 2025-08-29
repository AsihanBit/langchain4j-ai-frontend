<template>
  <div
    ref="iconRef"
    class="flex aspect-square cursor-pointer items-center justify-center rounded-full transition-all duration-200 ease-out"
    :style="{
      width: `${iconWidth}px`,
      height: `${iconWidth}px`,
    }"
    :hovered="{
      marginLeft: margin,
      marginRight: margin,
    }"
  >
    <slot />
  </div>
</template>

<script setup lang="ts">
import { ref, inject, computed } from "vue";
import {
  MOUSE_X_INJECTION_KEY,
  MOUSE_Y_INJECTION_KEY,
  MAGNIFICATION_INJECTION_KEY,
  DISTANCE_INJECTION_KEY,
  ORIENTATION_INJECTION_KEY,
} from "./injectionKeys";

// 可选：禁用放大或指定固定尺寸
const props = withDefaults(defineProps<{ disableMagnify?: boolean; fixedSize?: number }>(), {
  disableMagnify: false,
  fixedSize: 40,
});

const iconRef = ref<HTMLDivElement | null>(null);

const mouseX = inject(MOUSE_X_INJECTION_KEY, ref(Infinity));
const mouseY = inject(MOUSE_Y_INJECTION_KEY, ref(Infinity));
const distance = inject(DISTANCE_INJECTION_KEY);
const orientation = inject(ORIENTATION_INJECTION_KEY, "vertical");
const magnification = inject(MAGNIFICATION_INJECTION_KEY);
const isVertical = computed(() => orientation === "vertical");

const margin = ref(0);

function calculateDistance(val: number) {
  if (isVertical.value) {
    const bounds = iconRef.value?.getBoundingClientRect() || {
      y: 0,
      height: 0,
    };
    return val - bounds.y - bounds.height / 2;
  }
  const bounds = iconRef.value?.getBoundingClientRect() || { x: 0, width: 0 };
  return val - bounds.x - bounds.width / 2;
}

const iconWidth = computed(() => {
  // 如果禁用放大，直接返回固定尺寸
  if (props.disableMagnify) return props.fixedSize;

  const distanceCalc = isVertical.value
    ? calculateDistance(mouseY.value)
    : calculateDistance(mouseX.value);
  if (!distance?.value || !magnification?.value) return 40;
  if (Math.abs(distanceCalc) < distance?.value) {
    return (1 - Math.abs(distanceCalc) / distance?.value) * magnification?.value + 40;
  }

  return 40;
});
</script>
