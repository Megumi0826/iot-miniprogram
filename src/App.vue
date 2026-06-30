<script setup lang="ts">
import { onHide, onLaunch, onShow } from '@dcloudio/uni-app'
import { navigateToInterceptor } from '@/router/interceptor'
import { useCloudMonitorStore, useDeviceStore } from '@/store'

onLaunch((options) => {
  console.log('App.vue onLaunch', options)
})
onShow((options) => {
  console.log('App.vue onShow', options)
  // 处理直接进入页面路由的情况：如h5直接输入路由、微信小程序分享后进入等
  // https://github.com/unibest-tech/unibest/issues/192
  if (options?.path) {
    navigateToInterceptor.invoke({ url: `/${options.path}`, query: options.query })
  }
  else {
    navigateToInterceptor.invoke({ url: '/' })
  }

  void startCloudDeviceStatus()
})
onHide(() => {
  console.log('App Hide')
  useCloudMonitorStore().disconnect()
})

async function startCloudDeviceStatus() {
  const deviceStore = useDeviceStore()
  const cloudMonitorStore = useCloudMonitorStore()

  try {
    const devices = await deviceStore.loadBoundDevices()
    if (devices.length) {
      await cloudMonitorStore.subscribeDeviceStatus()
    }
  }
  catch (error) {
    console.warn('启动设备云端状态订阅失败:', error)
  }
}
</script>

<style lang="scss">

</style>
