<template>
  <view class="filter-picker">
    <scroll-view 
      class="scroll-area" 
      scroll-x 
      scroll-with-animation
      :show-scrollbar="false"
      :scroll-left="scrollLeft"
    >
      <view class="filter-list">
        <view 
          v-for="(item, index) in items" 
          :key="index"
          :id="'filter-item-' + index"
          class="filter-item"
          :class="{ active: modelValue === item.value }"
          :style="itemStyle"
          @click="selectFilter(item.value, index)"
        >
          <view class="filter-item-glow"></view>
          <text class="filter-text">{{ item.label.replace('\n', ' ') }}</text>
          <view class="active-bar">
            <view class="active-bar-core"></view>
          </view>
        </view>
      </view>
      <view class="dial-track">
        <view
          v-for="(_, index) in items"
          :key="'tick-' + index"
          class="dial-tick"
          :class="{ active: modelValue === items[index].value }"
          :style="itemStyle"
        >
          <view class="dial-tick-line"></view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, nextTick, computed, getCurrentInstance } from 'vue';

const props = defineProps({
  items: {
    type: Array as () => Array<{ label: string; value: string }>,
    required: true,
    default: () => []
  },
  modelValue: {
    type: String,
    default: ''
  }
});

const emit = defineEmits(['update:modelValue', 'change']);

const ITEM_WIDTH = 96;
const ITEM_GAP = 6;
const LIST_HORIZONTAL_PADDING = 8;

const instance = getCurrentInstance();
const scrollLeft = ref(0);
const containerWidth = ref(0);

const itemStyle = computed(() => ({ width: `${ITEM_WIDTH}px` }));
const contentWidth = computed(() => {
  if (!props.items.length) return 0;
  return props.items.length * ITEM_WIDTH + (props.items.length - 1) * ITEM_GAP + LIST_HORIZONTAL_PADDING * 2;
});

const syncViewport = (callback?: () => void) => {
  if (!instance?.proxy) {
    callback?.();
    return;
  }

  const query = uni.createSelectorQuery().in(instance.proxy);
  query.select('.scroll-area').boundingClientRect((rect: any) => {
    if (rect?.width) {
      containerWidth.value = rect.width;
    }
    callback?.();
  }).exec();
};

const centerItem = (idx: number) => {
  const itemCenter = LIST_HORIZONTAL_PADDING + idx * (ITEM_WIDTH + ITEM_GAP) + ITEM_WIDTH / 2;
  const target = itemCenter - containerWidth.value / 2;
  const maxScroll = Math.max(contentWidth.value - containerWidth.value, 0);
  scrollLeft.value = Math.max(0, Math.min(target, maxScroll));
};

const selectFilter = (value: string, index: number) => {
  if (value !== props.modelValue) {
    emit('update:modelValue', value);
    emit('change', value);
  }
  centerItem(index);
};

// Auto-center on initial mount if item is already active
onMounted(() => {
  nextTick(() => {
    syncViewport(() => {
      const activeIdx = props.items.findIndex(i => i.value === props.modelValue);
      if (activeIdx >= 0) {
        centerItem(activeIdx);
      }
    });
  });
});

watch(() => props.modelValue, (newVal) => {
  nextTick(() => {
    syncViewport(() => {
      const activeIdx = props.items.findIndex(i => i.value === newVal);
      if (activeIdx >= 0) {
        centerItem(activeIdx);
      }
    });
  });
});

watch(() => props.items.length, () => {
  nextTick(() => {
    syncViewport();
  });
});
</script>

<style scoped lang="scss">
.filter-picker {
  width: 100%;
  min-height: 56px;
  background: linear-gradient(180deg, rgba(5, 7, 10, 0.54) 0%, rgba(10, 12, 16, 0.4) 100%);
  backdrop-filter: blur(12px) saturate(120%);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 8px;
  box-sizing: border-box;
  box-shadow:
    0 6px 18px rgba(0,0,0,0.2),
    inset 0 1px 0 rgba(255,255,255,0.04);
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    inset: 1px;
    border-radius: 27px;
    background: linear-gradient(180deg, rgba(255,255,255,0.025), rgba(255,255,255,0));
    pointer-events: none;
  }
}

.scroll-area {
  width: 100%;
  white-space: nowrap;
  position: relative;
  z-index: 1;
  box-sizing: border-box;
}

.filter-list {
  display: inline-flex;
  align-items: center;
  min-height: 56px;
  gap: 6px;
  padding: 0 8px 8px;
}

.filter-item {
  position: relative;
  flex: 0 0 auto;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 36px;
  border-radius: 18px;
  overflow: hidden;
  transition:
    transform 0.26s cubic-bezier(0.22, 1, 0.36, 1),
    opacity 0.24s ease;

  opacity: 0.7;

  .filter-item-glow {
    position: absolute;
    left: 50%;
    top: 50%;
    width: 72px;
    height: 22px;
    border-radius: 999px;
    background: radial-gradient(circle, rgba(255, 246, 227, 0.05) 0%, rgba(255, 233, 188, 0.016) 46%, transparent 72%);
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.88);
    transition: opacity 0.26s ease, transform 0.26s cubic-bezier(0.22, 1, 0.36, 1);
    pointer-events: none;
  }
  
  .filter-text {
    position: relative;
    z-index: 1;
    color: rgba(230, 224, 214, 0.68);
    font-size: 12px;
    font-weight: 500;
    white-space: nowrap;
    text-align: center;
    letter-spacing: 0.2px;
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.42);
    transition:
      color 0.24s ease,
      text-shadow 0.24s ease,
      letter-spacing 0.24s ease,
      transform 0.24s ease;
  }
  
  .active-bar {
    position: absolute;
    left: 50%;
    bottom: 1px;
    width: 24px;
    height: 10px;
    transform: translateX(-50%) scaleX(0.58);
    transform-origin: center;
    opacity: 0.48;
    transition:
      transform 0.3s cubic-bezier(0.22, 1, 0.36, 1),
      opacity 0.24s ease,
      filter 0.26s ease;

    &::before,
    &::after {
      content: '';
      position: absolute;
      bottom: 1px;
      width: 6px;
      height: 2px;
      border-radius: 999px;
      background: rgba(210, 197, 173, 0.26);
      transition: background 0.26s ease, opacity 0.26s ease;
    }

    &::before {
      left: 0;
    }

    &::after {
      right: 0;
    }
  }

  .active-bar-core {
    position: absolute;
    left: 50%;
    bottom: 0;
    width: 5px;
    height: 8px;
    border-radius: 999px 999px 2px 2px;
    background: linear-gradient(180deg, rgba(246, 241, 230, 0.96) 0%, rgba(201, 180, 144, 0.94) 52%, rgba(118, 99, 73, 0.98) 100%);
    box-shadow:
      0 0 0 1px rgba(255, 248, 232, 0.05),
      0 1px 4px rgba(0, 0, 0, 0.18);
    transform: translateX(-50%);
    transition:
      width 0.3s cubic-bezier(0.22, 1, 0.36, 1),
      height 0.3s cubic-bezier(0.22, 1, 0.36, 1),
      box-shadow 0.26s ease,
      background 0.26s ease;
  }
  
  &.active {
    animation: filter-focus-in 0.3s cubic-bezier(0.22, 1, 0.36, 1);
    transform: translateY(-1px) scale(1.012);
    opacity: 1;

    .filter-item-glow {
      opacity: 1;
      transform: translate(-50%, -50%) scale(1);
    }

    .filter-text {
      color: #eee2cb;
      letter-spacing: 0.36px;
      transform: translateY(-1px);
      text-shadow: 0 1px 5px rgba(0, 0, 0, 0.56);
    }

    .active-bar {
      opacity: 1;
      transform: translateX(-50%) scaleX(1);
      filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.14));

      &::before,
      &::after {
        background: rgba(208, 194, 170, 0.46);
      }
    }

    .active-bar-core {
      width: 6px;
      height: 10px;
      box-shadow:
        0 0 0 1px rgba(250, 243, 229, 0.08),
        0 1px 5px rgba(0, 0, 0, 0.2);
    }
  }

  &:active {
    transform: scale(0.98);
  }
}

.dial-track {
  position: absolute;
  left: 8px;
  right: 8px;
  bottom: 5px;
  display: inline-flex;
  align-items: flex-end;
  gap: 6px;
  pointer-events: none;
}

.dial-tick {
  position: relative;
  flex: 0 0 auto;
  display: flex;
  justify-content: center;
  opacity: 0.6;
  transition: opacity 0.24s ease, transform 0.3s cubic-bezier(0.22, 1, 0.36, 1);

  .dial-tick-line {
    width: 1px;
    height: 5px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.06);
    transition: height 0.24s ease, background 0.24s ease, box-shadow 0.24s ease;
  }

  &.active {
    opacity: 1;

    .dial-tick-line {
      height: 7px;
      background: rgba(204, 187, 156, 0.42);
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);
    }
  }
}

@keyframes filter-focus-in {
  0% {
    transform: translateY(3px) scale(0.97);
    opacity: 0.76;
  }
  65% {
    transform: translateY(-2px) scale(1.02);
    opacity: 1;
  }
  100% {
    transform: translateY(-1px) scale(1.015);
    opacity: 1;
  }
}
</style>
