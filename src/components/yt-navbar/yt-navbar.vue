<script lang="ts" setup>
interface Props {
  title?: string
  showBack?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  title: '',
  showBack: false,
})

function handleBack() {
  if (!props.showBack)
    return

  const pages = getCurrentPages()
  if (pages.length > 1) {
    uni.navigateBack()
  }
  else {
    uni.switchTab({ url: '/pages/index/index' })
  }
}
</script>

<template>
  <wd-navbar
    :title="props.title"
    :left-arrow="props.showBack"
    :left-disabled="!props.showBack"
    custom-class="yt-navbar"
    safe-area-inset-top
    placeholder
    @click-left="handleBack"
  />
</template>
