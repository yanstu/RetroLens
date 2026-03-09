<template>
  <view class="filter-picker">
    <scroll-view 
      class="scroll-area" 
      scroll-x 
      scroll-with-animation
      :show-scrollbar="false"
      :scroll-into-view="scrollIntoId"
    >
      <view class="filter-list">
        <!-- Spacer elements can be added conceptually, but centering depends on layout. We'll use scroll-into-view to center roughly by index alignment -->
        <view class="spacer"></view>
        <view 
          v-for="(item, index) in items" 
          :key="index"
          :id="'filter-item-' + index"
          class="filter-item"
          :class="{ active: modelValue === item.value }"
          @click="selectFilter(item.value, index)"
        >
          <text class="filter-text">{{ item.label.replace('\n', ' ') }}</text>
          <view class="active-dot" v-if="modelValue === item.value"></view>
        </view>
        <view class="spacer"></view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, nextTick } from 'vue';

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

const scrollIntoId = ref('');

const centerItem = (idx: number) => {
    // To center conceptually, we scroll to an item 2 indices before it if possible
    const targetIdx = Math.max(0, idx - 2);
    scrollIntoId.value = 'filter-item-' + targetIdx;
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
        const activeIdx = props.items.findIndex(i => i.value === props.modelValue);
        if (activeIdx >= 0) {
            centerItem(activeIdx);
        }
    });
});

watch(() => props.modelValue, (newVal) => {
    const activeIdx = props.items.findIndex(i => i.value === newVal);
    if (activeIdx >= 0) {
        centerItem(activeIdx);
    }
});
</script>

<style scoped lang="scss">
.filter-picker {
  width: 100%;
  height: 60px;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(10px);
  border-radius: 30px;
  display: flex;
  align-items: center;
  padding: 0 10px;
  box-shadow: 0 4px 15px rgba(0,0,0,0.5);
}

.scroll-area {
  width: 100%;
  white-space: nowrap;
}

.filter-list {
  display: inline-flex;
  align-items: center;
  height: 60px;
  padding: 0 10px;
}

.filter-item {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0 15px;
  height: 40px;
  transition: all 0.3s ease;
  
  .filter-text {
    color: #888;
    font-size: 13px;
    font-weight: 500;
    transition: color 0.3s;
  }
  
  .active-dot {
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background-color: #ff9d00;
    margin-top: 4px;
    box-shadow: 0 0 4px #ff9d00;
  }
  
  &.active {
    transform: scale(1.1);
    .filter-text {
      color: #ff9d00;
      text-shadow: 0 0 8px rgba(255, 157, 0, 0.4);
    }
  }
}
</style>
