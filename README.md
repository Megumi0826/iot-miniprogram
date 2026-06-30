# 智联未来

## 项目简介

智联未来是一款面向 IoT 毫米波雷达设备的微信小程序，主要用于设备接入、实时体征监测、睡眠健康报告和个人设备管理。项目基于 `uni-app`、`Vue 3`、`TypeScript` 与 `unibest` 模板开发，结合 BLE 本地通信、云端 MQTT 实时数据和后端业务接口，形成从设备发现、设备配网、账号绑定到健康数据展示的完整闭环。

小程序当前围绕睡眠健康场景展开，支持通过 BLE 发现并连接雷达设备，读取设备身份与状态，完成 WiFi 配网；设备绑定到用户账号后，可通过云端实时订阅设备状态与体征数据，并展示睡眠报告、历史趋势、空间位置等信息。

## 项目预览

<table>
  <tr>
    <td align="center">
      <img src="docs/preview/56df61396324d774db41e5530b193c19.jpg" width="220" alt="添加设备 / BLE 扫描" />
      <br />
      <sub>添加设备 / BLE 扫描</sub>
    </td>
    <td align="center">
      <img src="docs/preview/76efac948e9bacf0bbf2cb6dc23c1fb3.jpg" width="220" alt="实时监控 / MQTT 数据" />
      <br />
      <sub>实时监控 / MQTT 数据</sub>
    </td>
    <td align="center">
      <img src="docs/preview/babf96834c321bfd979d3cef0d1c238d.jpg" width="220" alt="设备切换 / 多设备管理" />
      <br />
      <sub>设备切换 / 多设备管理</sub>
    </td>
  </tr>
  <tr>
    <td align="center">
      <img src="docs/preview/3e4b9a9bff9964d8d4750c6021710f3d.jpg" width="220" alt="设备配置 / 绑定状态" />
      <br />
      <sub>设备配置 / 绑定状态</sub>
    </td>
    <td align="center">
      <img src="docs/preview/8af3db8d1ecb73879aecdf8d37fe3320.jpg" width="220" alt="睡眠详情 / 健康报告" />
      <br />
      <sub>睡眠详情 / 健康报告</sub>
    </td>
    <td align="center"></td>
  </tr>
</table>

## 核心功能

- 微信登录与用户会话管理：支持微信一键登录、登录态持久化、Token 刷新和路由登录拦截。
- 设备发现与连接：通过 BLE 扫描附近雷达设备，识别支持的设备类型并建立本地蓝牙连接。
- 设备绑定与管理：将设备的 `productKey + dn` 绑定到当前用户账号，合并展示云端设备与本地 BLE 历史设备。
- WiFi 配网：通过 BLE 向设备下发 WiFi 信息，支持附近 WiFi、设备已保存 WiFi 和手动输入 SSID。
- 实时体征监测：支持 BLE 近场数据与云端 MQTT 数据两种监测源，展示心率、呼吸、活动、睡眠状态、情绪、入睡进度等指标。
- 雷达空间位置：展示人体在雷达坐标系中的 X/Y/Z 坐标和距离信息。
- 历史趋势：按时间范围查看心率、呼吸等设备属性的历史趋势。
- 睡眠报告：展示最近睡眠概览、30 天报告列表、睡眠详情、睡眠结构、关键指标和睡眠评分。
- 主题与个人中心：支持亮色/暗色主题切换、头像上传、个人信息展示和退出登录。

## 技术架构

```mermaid
flowchart TD
  MiniProgram["微信小程序端"]

  subgraph Pages["页面层 pages"]
    Home["首页<br/>睡眠概览 / 今日建议"]
    Device["设备<br/>实时监控 / 设备配置"]
    AddDevice["添加设备<br/>BLE 扫描 / 连接"]
    Wifi["WiFi 配网<br/>附近网络 / 手动输入"]
    Sleep["睡眠报告<br/>列表 / 详情"]
    Me["我的<br/>用户资料 / 退出登录"]
  end

  subgraph Components["组件层 components"]
    DeviceComponents["设备卡片 / 设备选择器"]
    MonitorComponents["监测面板 / 指标卡片 / 数据源切换"]
    ChartComponents["趋势图 / 雷达位置面板"]
    SleepComponents["睡眠概览 / 睡眠结构 / 体动环"]
  end

  subgraph Stores["状态层 Pinia stores"]
    TokenStore["token / user"]
    DeviceStore["device"]
    BleStore["ble"]
    CloudMonitorStore["cloudMonitor"]
    ThemeStore["theme"]
  end

  subgraph Communication["通信层"]
    HttpApi["HTTP API<br/>登录 / 设备 / 睡眠报告 / 历史趋势"]
    WebSocket["WebSocket<br/>设备状态 / MQTT 实时属性"]
    BleApp["BLE Application<br/>扫描 / 连接 / 配网 / 监测"]
  end

  subgraph Backend["后端与设备侧"]
    BusinessApi["业务接口服务"]
    MqttData["MQTT 实时数据"]
    RadarDevice["毫米波雷达设备"]
  end

  MiniProgram --> Pages
  Pages --> Components
  Pages --> Stores
  Components --> Stores
  Stores --> Communication
  HttpApi --> BusinessApi
  WebSocket --> MqttData
  BleApp --> RadarDevice
  RadarDevice --> MqttData
```

## BLE 蓝牙架构

```mermaid
flowchart TD
  App["小程序 BLE 客户端"]
  Transport["BLE Transport<br/>uni 蓝牙适配器 / 扫描 / 连接 / 读写 / Notify"]
  Profile["Radar Profile<br/>设备识别 / GATT 通道映射"]
  Protocol["Protocol<br/>Frame / TLV / CRC16 / Command"]
  Application["Application<br/>状态查询 / 实时监测 / WiFi 配网"]
  Device["毫米波雷达设备"]

  subgraph RadarDataService["Radar Data Service<br/>a8c1e5c0-3d5d-4a9d-8d5e-7c8b6a4e2f1a"]
    A1["a1 Stream Characteristic<br/>beb5483e-36e1-4688-b7f5-ea07361b26a1<br/>Notify：连续雷达数据"]
    A2["a2 Status Characteristic<br/>beb5483e-36e1-4688-b7f5-ea07361b26a2<br/>Notify：空间 / 状态数据"]
  end

  subgraph DeviceConfigService["Device Config Service<br/>a8c1e5c0-3d5d-4a9d-8d5e-7c8b6a4e2f1b"]
    B1["b1 Command Characteristic<br/>beb5483e-36e1-4688-b7f5-ea07361b26b1<br/>Write：命令写入"]
    B2["b2 Result Characteristic<br/>beb5483e-36e1-4688-b7f5-ea07361b26b2<br/>Notify：命令响应"]
    B3["b3 Device Info Characteristic<br/>beb5483e-36e1-4688-b7f5-ea07361b26b3<br/>Notify：设备状态主动推送"]
  end

  App --> Application
  Application --> Protocol
  Application --> Profile
  Profile --> Transport
  Protocol --> Transport
  Transport --> Device
  Device --> RadarDataService
  Device --> DeviceConfigService
  RadarDataService --> A1
  RadarDataService --> A2
  DeviceConfigService --> B1
  DeviceConfigService --> B2
  DeviceConfigService --> B3
```

BLE 通信按分层组织：

- `transport`：封装 uni 蓝牙 API，负责适配器、扫描、连接、特征值写入和 Notify 监听。
- `profiles`：描述雷达设备的识别规则、Service UUID、Characteristic UUID 与上层通信角色。
- `protocol`：实现帧格式、TLV 编解码、CRC16 校验、命令码和状态码定义。
- `application`：组织扫描设备、连接设备、查询状态、启动雷达实时监测、扫描 WiFi、下发 WiFi 配网等业务动作。

## 目录结构

```text
src
├─ api                 # HTTP 接口封装，包含登录、设备、睡眠报告、趋势数据等接口
├─ ble                 # BLE 蓝牙通信能力，包含 transport、profiles、protocol、application 分层
├─ components          # 业务组件，包含设备卡片、监测面板、睡眠卡片、趋势图等
├─ http                # 请求封装、响应处理、Token 刷新与错误处理
├─ pages               # 页面入口：首页、设备、添加设备、WiFi 配网、睡眠报告、我的
├─ router              # 路由拦截与登录跳转控制
├─ store               # Pinia 状态管理，包含 token、user、device、ble、cloudMonitor、theme
├─ style               # 全局样式与亮色/暗色主题变量
├─ tabbar              # 自定义 TabBar 配置与状态
├─ utils               # 通用工具函数与睡眠数据格式化
└─ websocket           # 设备实时数据 WebSocket 客户端
```

## 核心业务流程

1. 登录与启动
   用户通过微信一键登录获取 Token，小程序启动后加载已绑定设备，并在存在云端设备时订阅设备在线状态。

2. 添加设备
   小程序开启 BLE 扫描，按照雷达设备 Profile 匹配附近设备；连接成功后查询设备身份与状态，启动雷达实时监测，并把本地 BLE 连接记录保存到设备列表。

3. WiFi 配网
   用户在已连接 BLE 的前提下进入 WiFi 配网页，可扫描附近 WiFi、读取设备已保存 WiFi，或手动输入 SSID 与密码；配网命令通过 BLE 写入设备配置服务。

4. 设备绑定
   小程序读取设备的 `productKey` 与 `dn`，调用后端绑定接口，将本地发现的雷达设备绑定到当前用户账号。

5. 实时监测
   设备页支持 BLE 与 MQTT 两种数据源。BLE 用于近场连接与本地实时数据，MQTT 通过 WebSocket 订阅云端设备属性，页面统一展示心率、呼吸、活动、睡眠状态、情绪、入睡进度和空间位置。

6. 睡眠报告
   首页展示最新睡眠报告摘要，睡眠报告页展示最近 30 天记录，详情页展示评分、总睡眠时长、睡眠效率、睡眠结构、平均心率、平均呼吸、呼吸暂停、入睡耗时、醒来次数和睡眠周期等指标。

## 技术栈

- 框架：`uni-app`、`Vue 3`、`TypeScript`、`Vite`
- 模板基础：`unibest`
- 状态管理：`Pinia`、`pinia-plugin-persistedstate`
- UI 与样式：`wot-ui-v2`、`UnoCSS`、`SCSS`
- 图表：`ECharts`、`lime-echart`
- 网络通信：`uni.request`、自定义 HTTP 封装、WebSocket 实时订阅
- 蓝牙通信：微信小程序 BLE API、GATT Service/Characteristic 映射、自定义 Frame/TLV 协议
- 目标平台：微信小程序
