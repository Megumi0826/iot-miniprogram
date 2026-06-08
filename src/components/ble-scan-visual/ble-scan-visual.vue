<script lang="ts" setup>
interface Props {
  /**
   * 是否正在扫描。
   */
  scanning?: boolean

  /**
   * 已发现设备数量。
   *
   * 大于 0 时，波纹会稍微收敛，表现为“已经捕获到信号”。
   */
  foundCount?: number

  /**
   * 禁用点击。
   *
   * 连接设备或页面处于不可操作状态时使用。
   */
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  foundCount: 0,
  scanning: false,
})

const emit = defineEmits<{
  toggle: []
}>()

function handleTap() {
  if (props.disabled) {
    return
  }

  emit('toggle')
}
</script>

<template>
  <view
    class="ble-scan-visual"
    :class="{
      'is-scanning': props.scanning,
      'has-devices': props.foundCount > 0,
      'is-disabled': props.disabled,
    }"
    @click="handleTap"
  >
    <view class="ble-scan-visual__halo" />

    <view class="ble-scan-visual__wave ble-scan-visual__wave--one" />
    <view class="ble-scan-visual__wave ble-scan-visual__wave--two" />
    <view class="ble-scan-visual__wave ble-scan-visual__wave--three" />

    <view
      v-for="index in 9"
      :key="index"
      class="ble-scan-visual__particle"
      :class="`ble-scan-visual__particle--${index}`"
    />

    <view class="ble-scan-visual__core">
      <view class="ble-scan-visual__core-glow" />
      <view class="ble-scan-visual__icon i-carbon-bluetooth" />
    </view>
  </view>
</template>

<style lang="scss" scoped>
.ble-scan-visual {
  position: relative;
  width: 520rpx;
  height: 520rpx;
  margin: 0 auto;
  overflow: visible;
  transform: translateZ(0);
}

.ble-scan-visual.is-disabled {
  opacity: 0.62;
}

.ble-scan-visual__halo {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 250rpx;
  height: 250rpx;
  border-radius: 50%;
  background: var(--app-primary-soft);
  opacity: 0.18;
  transform: translate(-50%, -50%);
  transition:
    opacity 0.24s ease,
    transform 0.24s ease;
}

.ble-scan-visual.is-scanning .ble-scan-visual__halo {
  opacity: 0.34;
  transform: translate(-50%, -50%) scale(1.08);
}

.ble-scan-visual__wave {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 172rpx;
  height: 172rpx;
  border: 3rpx solid var(--app-primary);
  border-radius: 50%;
  opacity: 0;
  transform: translate(-50%, -50%) scale(0.8);
}

.ble-scan-visual.is-scanning .ble-scan-visual__wave {
  animation: ble-wave 2.7s ease-out infinite;
}

.ble-scan-visual.has-devices .ble-scan-visual__wave {
  animation-duration: 3.2s;
  border-color: var(--app-cyan);
}

.ble-scan-visual.is-scanning .ble-scan-visual__wave--one {
  animation-delay: 0s;
}

.ble-scan-visual.is-scanning .ble-scan-visual__wave--two {
  animation-delay: 0.9s;
}

.ble-scan-visual.is-scanning .ble-scan-visual__wave--three {
  animation-delay: 1.8s;
}

.ble-scan-visual__particle {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 8rpx;
  height: 8rpx;
  border-radius: 50%;
  background: var(--app-text-subtle);
  opacity: 0.34;
  transform: translate(var(--particle-x), var(--particle-y)) scale(var(--particle-scale));
  transition:
    background-color 0.2s ease,
    opacity 0.2s ease;
}

.ble-scan-visual.is-scanning .ble-scan-visual__particle {
  background: var(--app-cyan);
  opacity: 0.9;
  animation: ble-particle 3.2s ease-in-out infinite;
}

.ble-scan-visual.has-devices .ble-scan-visual__particle {
  background: var(--app-primary);
}

.ble-scan-visual__particle--1 {
  --particle-dx: 18rpx;
  --particle-dy: -16rpx;
  --particle-scale: 1.2;
  --particle-x: 136rpx;
  --particle-y: -116rpx;

  animation-delay: 0.1s;
}

.ble-scan-visual__particle--2 {
  --particle-dx: -20rpx;
  --particle-dy: 14rpx;
  --particle-scale: 0.82;
  --particle-x: 176rpx;
  --particle-y: 28rpx;

  animation-delay: 0.38s;
}

.ble-scan-visual__particle--3 {
  --particle-dx: 14rpx;
  --particle-dy: 18rpx;
  --particle-scale: 1.35;
  --particle-x: 94rpx;
  --particle-y: 158rpx;

  animation-delay: 0.72s;
}

.ble-scan-visual__particle--4 {
  --particle-dx: -16rpx;
  --particle-dy: -12rpx;
  --particle-scale: 0.74;
  --particle-x: -128rpx;
  --particle-y: 140rpx;

  animation-delay: 1s;
}

.ble-scan-visual__particle--5 {
  --particle-dx: -18rpx;
  --particle-dy: 16rpx;
  --particle-scale: 1.25;
  --particle-x: -176rpx;
  --particle-y: -24rpx;

  animation-delay: 1.28s;
}

.ble-scan-visual__particle--6 {
  --particle-dx: 18rpx;
  --particle-dy: -12rpx;
  --particle-scale: 0.68;
  --particle-x: -90rpx;
  --particle-y: -168rpx;

  animation-delay: 1.58s;
}

.ble-scan-visual__particle--7 {
  --particle-dx: 12rpx;
  --particle-dy: 20rpx;
  --particle-scale: 0.54;
  --particle-x: 28rpx;
  --particle-y: -198rpx;

  animation-delay: 1.9s;
}

.ble-scan-visual__particle--8 {
  --particle-dx: -14rpx;
  --particle-dy: -18rpx;
  --particle-scale: 0.52;
  --particle-x: 206rpx;
  --particle-y: -56rpx;

  animation-delay: 2.18s;
}

.ble-scan-visual__particle--9 {
  --particle-dx: 16rpx;
  --particle-dy: 14rpx;
  --particle-scale: 0.5;
  --particle-x: -210rpx;
  --particle-y: 66rpx;

  animation-delay: 2.42s;
}

.ble-scan-visual__core {
  position: absolute;
  left: 50%;
  top: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 132rpx;
  height: 132rpx;
  border: 1px solid var(--app-border);
  border-radius: 50%;
  background: var(--app-surface-2);
  box-shadow: 0 16rpx 44rpx var(--app-primary-soft);
  transform: translate(-50%, -50%);
  transition:
    background 0.24s ease,
    box-shadow 0.24s ease,
    transform 0.24s ease;
}

.ble-scan-visual.is-scanning .ble-scan-visual__core {
  border-color: rgba(54, 217, 255, 0.5);
  background: var(--app-primary);
  box-shadow:
    0 0 0 18rpx var(--app-primary-soft),
    0 22rpx 58rpx var(--app-primary-soft);
  animation: ble-core 1.9s ease-in-out infinite;
}

.ble-scan-visual__core-glow {
  position: absolute;
  inset: -22rpx;
  border-radius: 50%;
  background: var(--app-primary-soft);
  opacity: 0;
  transform: scale(0.82);
  transition:
    opacity 0.24s ease,
    transform 0.24s ease;
}

.ble-scan-visual.is-scanning .ble-scan-visual__core-glow {
  opacity: 1;
  transform: scale(1);
}

.ble-scan-visual__icon {
  position: relative;
  z-index: 2;
  color: var(--app-text-subtle);
  font-size: 76rpx;
  transition:
    color 0.24s ease,
    transform 0.24s ease;
}

.ble-scan-visual.is-scanning .ble-scan-visual__icon {
  color: #ffffff;
  transform: scale(1.04);
}

@keyframes ble-wave {
  0% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.72);
  }

  12% {
    opacity: 0.58;
  }

  52% {
    opacity: 0.24;
  }

  100% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(2.55);
  }
}

@keyframes ble-core {
  0%,
  100% {
    transform: translate(-50%, -50%) scale(1);
  }

  50% {
    transform: translate(-50%, -50%) scale(1.045);
  }
}

@keyframes ble-particle {
  0%,
  100% {
    opacity: 0.42;
    transform: translate(var(--particle-x), var(--particle-y)) scale(var(--particle-scale));
  }

  50% {
    opacity: 1;
    transform: translate(calc(var(--particle-x) + var(--particle-dx)), calc(var(--particle-y) + var(--particle-dy)))
      scale(calc(var(--particle-scale) + 0.14));
  }
}
</style>
