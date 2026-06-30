<script lang="ts" setup>
import type { DeviceListItem, DeviceType } from '@/store/device'
import { computed } from 'vue'

interface Props {
  device?: DeviceListItem | null
  open?: boolean
  disabled?: boolean
}

defineOptions({
  name: 'YtDeviceSwitcher',
})

const props = withDefaults(defineProps<Props>(), {
  device: null,
  open: false,
  disabled: false,
})

const emit = defineEmits<{
  switch: []
  add: []
}>()

const hasDevice = computed(() => !!props.device)
const switchButtonDisabled = computed(() => hasDevice.value && props.disabled)
const switchTitle = computed(() => props.device?.name || '添加设备')
const switchSubtitle = computed(() => {
  return props.device
    ? getDeviceTypeName(props.device.deviceType)
    : '连接后查看睡眠与体征数据'
})

function getDeviceTypeName(type?: DeviceType) {
  return type === 'radar' ? '毫米波雷达' : '未知设备'
}

function handleSwitch() {
  if (!props.device) {
    emit('add')
    return
  }

  if (props.disabled) {
    return
  }

  emit('switch')
}
</script>

<template>
  <view class="device-switcher">
    <button
      class="switch-button"
      :class="{ empty: !device }"
      :disabled="switchButtonDisabled"
      @click="handleSwitch"
    >
      <view
        v-if="device"
        class="switch-dot"
        :class="{ active: device.bleConnected || device.mqttOnline }"
      />
      <view v-else class="switch-empty-icon i-carbon-add" />

      <view class="switch-copy">
        <view class="switch-name">
          {{ switchTitle }}
        </view>
        <view class="switch-meta">
          {{ switchSubtitle }}
        </view>
      </view>

      <view v-if="device" class="switch-chevron i-carbon-chevron-down" :class="{ open }" />
    </button>

    <button v-if="device" class="add-button" @click="emit('add')">
      <view class="i-carbon-add" />
    </button>
  </view>
</template>

<style lang="scss" scoped>
.device-switcher {
  display: flex;
  align-items: center;
  gap: 10rpx;
  width: 100%;
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

.switch-button {
  min-width: 0;
  flex: 1;
  min-height: 70rpx;
  padding: 10rpx 14rpx;
  border: 1px solid var(--app-border);
  border-radius: 20rpx;
  background: var(--app-surface);
  box-shadow: 0 8rpx 22rpx var(--app-shadow);
  box-sizing: border-box;
}

.switch-button.empty {
  min-height: 76rpx;
  padding: 10rpx 16rpx;
  border-color: var(--app-primary-soft);
  background: linear-gradient(135deg, var(--app-surface), var(--app-surface-2));
}

.switch-button:active {
  background: var(--app-surface-2);
}

.switch-button[disabled] {
  opacity: 0.68;
}

.switch-dot {
  flex-shrink: 0;
  width: 10rpx;
  height: 10rpx;
  margin-right: 10rpx;
  border-radius: 999rpx;
  background: var(--app-text-subtle);
}

.switch-dot.active {
  background: var(--app-success);
}

.switch-empty-icon {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 42rpx;
  height: 42rpx;
  margin-right: 12rpx;
  border-radius: 14rpx;
  background: var(--app-primary-soft);
  color: var(--app-primary);
  font-size: 26rpx;
}

.switch-copy {
  min-width: 0;
  flex: 1;
  text-align: left;
}

.switch-name {
  overflow: hidden;
  color: var(--app-text);
  font-size: 25rpx;
  font-weight: 760;
  line-height: 32rpx;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.switch-meta {
  overflow: hidden;
  margin-top: 0;
  color: var(--app-text-muted);
  font-size: 19rpx;
  line-height: 26rpx;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.switch-chevron {
  flex-shrink: 0;
  margin-left: 8rpx;
  color: var(--app-text-subtle);
  font-size: 26rpx;
  transition: transform 0.18s ease;
}

.switch-chevron.open {
  transform: rotate(180deg);
}

.add-button {
  flex-shrink: 0;
  width: 70rpx;
  height: 70rpx;
  border: 1px solid var(--app-border);
  border-radius: 20rpx;
  background: var(--app-surface);
  color: var(--app-primary);
  font-size: 34rpx;
  box-shadow: 0 8rpx 22rpx var(--app-shadow);
}

.add-button:active {
  background: var(--app-surface-2);
}
</style>
