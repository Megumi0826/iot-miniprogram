<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { ref } from 'vue'
import { useThemeStore } from '@/store/theme'
import FgTabbar from '@/tabbar/index.vue'
import { isPageTabbar } from './tabbar/store'
import { currRoute } from './utils'

const isCurrentPageTabbar = ref(true)
const themeStore = useThemeStore()
const { themeMode, themeClass } = storeToRefs(themeStore)

onShow(() => {
  console.log('App.ku.vue onShow', currRoute())
  const { path } = currRoute()
  // “蜡笔小开心”提到本地是 '/pages/index/index'，线上是 '/' 导致线上 tabbar 不见了
  // 所以这里需要判断一下，如果是 '/' 就当做首页，也要显示 tabbar
  if (path === '/') {
    isCurrentPageTabbar.value = true
  }
  else {
    isCurrentPageTabbar.value = isPageTabbar(path)
  }
})

const exposeRef = ref('this is form app.Ku.vue')

defineExpose({
  exposeRef,
})
</script>

<template>
  <view class="app-root" :class="themeClass">
    <wd-config-provider :theme="themeMode">
      <KuRootView />
      <yt-theme-float />
      <FgTabbar v-if="isCurrentPageTabbar" />
    </wd-config-provider>
  </view>
</template>
