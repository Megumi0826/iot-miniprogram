<script lang="ts" setup>
export type MonitorSource = 'ble' | 'mqtt'

export interface MonitorSourceOption {
  label: string
  value: MonitorSource
  disabled?: boolean
}

interface Props {
  modelValue: MonitorSource
  options?: MonitorSourceOption[]
}

defineOptions({
  name: 'YtMonitorSourceSwitch',
})

const props = withDefaults(defineProps<Props>(), {
  options: () => [
    { label: 'BLE', value: 'ble' },
    { label: 'MQTT', value: 'mqtt' },
  ],
})

const emit = defineEmits<{
  'update:modelValue': [value: MonitorSource]
  'change': [value: MonitorSource]
}>()

function getIconClass(value: MonitorSource) {
  return value === 'ble' ? 'i-carbon-bluetooth' : 'i-carbon-wifi'
}

function selectSource(option: MonitorSourceOption) {
  if (option.disabled || option.value === props.modelValue) {
    return
  }

  emit('update:modelValue', option.value)
  emit('change', option.value)
}
</script>

<template>
  <view class="source-switch">
    <button
      v-for="option in options"
      :key="option.value"
      class="source-option"
      :class="{
        active: option.value === modelValue,
        disabled: option.disabled,
        mqtt: option.value === 'mqtt',
      }"
      :disabled="option.disabled"
      @click="selectSource(option)"
    >
      <view class="source-icon" :class="getIconClass(option.value)" />
      <text>{{ option.label }}</text>
    </button>
  </view>
</template>

<style lang="scss" scoped>
.source-switch {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  width: 320rpx;
  height: 72rpx;
  padding: 6rpx;
  border: 1px solid var(--app-border);
  border-radius: 999rpx;
  background: var(--app-surface-2);
  box-shadow: 0 10rpx 28rpx rgba(15, 23, 42, 0.08);
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

.source-option {
  gap: 9rpx;
  min-width: 0;
  height: 58rpx;
  border-radius: 999rpx;
  color: var(--app-text-muted);
  font-size: 24rpx;
  font-weight: 800;
  letter-spacing: 0;
  transition:
    background-color 0.16s ease,
    box-shadow 0.16s ease,
    color 0.16s ease,
    opacity 0.16s ease,
    transform 0.16s ease;
}

.source-option:not(.active):not([disabled]):active {
  background: var(--app-primary-soft);
  transform: scale(0.98);
}

.source-option.active {
  background: #2587f8;
  color: #fff;
  box-shadow: 0 8rpx 22rpx rgba(37, 135, 248, 0.32);
}

.source-option.active.mqtt {
  background: var(--app-primary);
  box-shadow: 0 8rpx 22rpx var(--app-primary-soft);
}

.source-option[disabled] {
  color: var(--app-text-subtle);
  opacity: 0.52;
}

.source-icon {
  font-size: 30rpx;
}
</style>
