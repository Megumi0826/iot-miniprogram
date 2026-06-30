<script lang="ts" setup>
export interface YtSectionTabItem {
  label: string
  value: string
  disabled?: boolean
}

interface Props {
  modelValue: string
  items: YtSectionTabItem[]
}

defineOptions({
  name: 'YtSectionTabs',
})

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'change': [value: string]
}>()

function selectTab(item: YtSectionTabItem) {
  if (item.disabled || item.value === props.modelValue) {
    return
  }

  emit('update:modelValue', item.value)
  emit('change', item.value)
}
</script>

<template>
  <view class="section-tabs">
    <button
      v-for="item in items"
      :key="item.value"
      class="section-tab"
      :class="{
        active: item.value === modelValue,
        disabled: item.disabled,
      }"
      :disabled="item.disabled"
      @click="selectTab(item)"
    >
      <text class="section-tab__label">{{ item.label }}</text>
    </button>
  </view>
</template>

<style lang="scss" scoped>
.section-tabs {
  display: flex;
  align-items: stretch;
  height: 74rpx;
  width: 100%;
  padding: 0;
  border-bottom: 1px solid var(--app-border);
  box-sizing: border-box;
}

button {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  line-height: normal;
}

button::after {
  border: 0;
}

.section-tab {
  flex: 1;
  height: 70rpx;
  color: var(--app-text-muted);
  font-size: 29rpx;
  font-weight: 650;
  letter-spacing: 0;
  transition:
    color 0.16s ease,
    opacity 0.16s ease;
}

.section-tab.active {
  color: var(--app-text);
}

.section-tab__label {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.section-tab__label::after {
  position: absolute;
  bottom: -1px;
  left: 50%;
  width: calc(100% + 44rpx);
  height: 4rpx;
  border-radius: 999rpx;
  background: var(--app-primary);
  content: '';
  opacity: 0;
  transform: translateX(-50%) scaleX(0.42);
  transition:
    opacity 0.16s ease,
    transform 0.16s ease;
}

.section-tab.active .section-tab__label::after {
  opacity: 1;
  transform: translateX(-50%) scaleX(1);
}

.section-tab.disabled {
  opacity: 0.45;
}
</style>
