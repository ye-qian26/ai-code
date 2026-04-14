<template>
  <div class="app-chat-page">
    <!-- 顶部栏 -->
    <div class="header-bar">
      <div class="header-left">
        <h1 class="app-name">{{ appInfo?.appName || '网站生成器' }}</h1>
        <a-tag v-if="appInfo?.codeGenType" color="processing">
          {{ formatCodeGenType(appInfo.codeGenType) }}
        </a-tag>
      </div>
      <div class="header-right">
        <a-space>
          <a-button type="text" @click="showAppDetail">
            <template #icon><InfoCircleOutlined /></template>
            详情
          </a-button>
          <a-button
            v-if="isOwner"
            type="default"
            @click="downloadCode"
            :loading="downloading"
          >
            <template #icon><DownloadOutlined /></template>
            源码
          </a-button>
          <a-button type="primary" @click="deployApp" :loading="deploying">
            <template #icon><CloudUploadOutlined /></template>
            发布
          </a-button>
        </a-space>
      </div>
    </div>

    <!-- 主要内容区域 -->
    <div class="main-content">
      <!-- 左侧对话区域 -->
      <div class="chat-section">
        <div class="section-header">
          <h3>AI 助手对话</h3>
          <div class="header-actions">
            <a-tag v-if="isOwner" color="success">所有者模式</a-tag>
          </div>
        </div>
        <div class="chat-card">
          <!-- 消息区域 -->
          <div class="messages-container" ref="messagesContainer">
            <!-- 加载更多按钮 -->
            <div v-if="hasMoreHistory" class="load-more-container">
              <a-button type="link" @click="loadMoreHistory" :loading="loadingHistory" size="small">
                加载更多历史消息
              </a-button>
            </div>
            <div v-for="(message, index) in messages" :key="index" class="message-item">
              <div v-if="message.type === 'user'" class="user-message">
                <div class="message-content">{{ message.content }}</div>
                <div class="message-avatar">
                  <a-avatar :src="loginUserStore.loginUser.userAvatar" />
                </div>
              </div>
              <div v-else class="ai-message">
                <div class="message-avatar">
                  <a-avatar :src="aiAvatar" />
                </div>
                <div class="message-content">
                  <MarkdownRenderer v-if="message.content" :content="message.content" />
                  <div v-if="message.loading" class="loading-indicator">
                    <a-spin size="small" />
                    <span>AI 正在思考...</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 选中元素信息展示 -->
          <a-alert
            v-if="selectedElementInfo"
            class="selected-element-alert"
            type="info"
            closable
            @close="clearSelectedElement"
          >
            <template #message>
              <div class="selected-element-info">
                <div class="element-header">
                  <span class="element-tag">选中：{{ selectedElementInfo.tagName.toLowerCase() }}</span>
                  <span v-if="selectedElementInfo.id" class="element-id">#{{ selectedElementInfo.id }}</span>
                </div>
                <div class="element-details">
                  <code class="element-selector-code">{{ selectedElementInfo.selector }}</code>
                </div>
              </div>
            </template>
          </a-alert>

          <!-- 用户消息输入框 -->
          <div class="input-container">
            <div class="input-wrapper">
              <a-textarea
                v-model:value="userInput"
                :placeholder="getInputPlaceholder()"
                :rows="3"
                :maxlength="1000"
                @keydown.enter.prevent="sendMessage"
                :disabled="isGenerating || (!isOwner && loginUserStore.loginUser.id !== appInfo?.userId)"
              />
              <div class="input-actions">
                <a-button
                  type="primary"
                  shape="circle"
                  @click="sendMessage"
                  :loading="isGenerating"
                  :disabled="!isOwner && loginUserStore.loginUser.id !== appInfo?.userId"
                >
                  <template #icon><SendOutlined /></template>
                </a-button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧网页展示区域 -->
      <div class="preview-section">
        <div class="section-header">
          <h3>生成结果预览</h3>
          <div class="header-actions">
            <a-space size="small">
              <a-button
                v-if="isOwner && previewUrl"
                type="text"
                size="small"
                :danger="isEditMode"
                @click="toggleEditMode"
                :class="{ 'edit-mode-active': isEditMode }"
              >
                <template #icon><EditOutlined /></template>
                {{ isEditMode ? '退出编辑' : '编辑模式' }}
              </a-button>
              <a-button v-if="previewUrl" type="text" size="small" @click="openInNewTab">
                <template #icon><ExportOutlined /></template>
                新窗口
              </a-button>
            </a-space>
          </div>
        </div>
        <div class="preview-card">
          <div v-if="!previewUrl && !isGenerating" class="preview-placeholder">
            <div class="placeholder-icon">🌐</div>
            <p>网站生成后在此预览</p>
          </div>
          <div v-else-if="isGenerating" class="preview-loading">
            <a-spin size="large" />
            <p>正在努力生成中...</p>
          </div>
          <iframe
            v-else
            :src="previewUrl"
            class="preview-iframe"
            frameborder="0"
            @load="onIframeLoad"
          ></iframe>
        </div>
      </div>
    </div>

    <!-- 应用详情弹窗 -->
    <AppDetailModal
        v-model:open="appDetailVisible"
        :app="appInfo"
        :show-actions="isOwner || isAdmin"
        @edit="editApp"
        @delete="deleteApp"
    />

    <!-- 部署成功弹窗 -->
    <DeploySuccessModal
        v-model:open="deployModalVisible"
        :deploy-url="deployUrl"
        @open-site="openDeployedSite"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, onUnmounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { useLoginUserStore } from '@/stores/loginUser'
import {
  getAppVoById,
  deployApp as deployAppApi,
  deleteApp as deleteAppApi,
} from '@/api/appController'
import { listAppChatHistory } from '@/api/chatHistoryController'
import { CodeGenTypeEnum, formatCodeGenType } from '@/utils/codeGenTypes'
import request from '@/request'

import MarkdownRenderer from '@/components/MarkdownRenderer.vue'
import AppDetailModal from '@/components/AppDetailModal.vue'
import DeploySuccessModal from '@/components/DeploySuccessModal.vue'
import aiAvatar from '@/assets/aiAvatar.png'
import { API_BASE_URL, getStaticPreviewUrl } from '@/config/env'
import { VisualEditor, type ElementInfo } from '@/utils/visualEditor'

import {
  CloudUploadOutlined,
  SendOutlined,
  ExportOutlined,
  InfoCircleOutlined,
  DownloadOutlined,
  EditOutlined,
} from '@ant-design/icons-vue'

const route = useRoute()
const router = useRouter()
const loginUserStore = useLoginUserStore()

// 应用信息
const appInfo = ref<API.AppVO>()
const appId = ref<any>()

// 对话相关
interface Message {
  type: 'user' | 'ai'
  content: string
  loading?: boolean
  createTime?: string
}

const messages = ref<Message[]>([])
const userInput = ref('')
const isGenerating = ref(false)
const messagesContainer = ref<HTMLElement>()

// 对话历史相关
const loadingHistory = ref(false)
const hasMoreHistory = ref(false)
const lastCreateTime = ref<string>()
const historyLoaded = ref(false)

// 预览相关
const previewUrl = ref('')
const previewReady = ref(false)

// 部署相关
const deploying = ref(false)
const deployModalVisible = ref(false)
const deployUrl = ref('')

// 下载相关
const downloading = ref(false)

// 可视化编辑相关
const isEditMode = ref(false)
const selectedElementInfo = ref<ElementInfo | null>(null)
const visualEditor = new VisualEditor({
  onElementSelected: (elementInfo: ElementInfo) => {
    selectedElementInfo.value = elementInfo
  },
})

// 权限相关
const isOwner = computed(() => {
  return appInfo.value?.userId === loginUserStore.loginUser.id
})

const isAdmin = computed(() => {
  return loginUserStore.loginUser.userRole === 'admin'
})

// 应用详情相关
const appDetailVisible = ref(false)

// 显示应用详情
const showAppDetail = () => {
  appDetailVisible.value = true
}

// 加载对话历史
const loadChatHistory = async (isLoadMore = false) => {
  if (!appId.value || loadingHistory.value) return
  loadingHistory.value = true
  try {
    const params: API.listAppChatHistoryParams = {
      appId: appId.value,
      pageSize: 10,
    }
    // 如果是加载更多，传递最后一条消息的创建时间作为游标
    if (isLoadMore && lastCreateTime.value) {
      params.lastCreateTime = lastCreateTime.value
    }
    const res = await listAppChatHistory(params)
    if (res.data.code === 0 && res.data.data) {
      const chatHistories = res.data.data.records || []
      if (chatHistories.length > 0) {
        // 将对话历史转换为消息格式，并按时间正序排列（老消息在前）
        const historyMessages: Message[] = chatHistories
            .map((chat) => ({
              type: (chat.messageType === 'user' ? 'user' : 'ai') as 'user' | 'ai',
              content: chat.message || '',
              createTime: chat.createTime,
            }))
            .reverse() // 反转数组，让老消息在前
        if (isLoadMore) {
          // 加载更多时，将历史消息添加到开头
          messages.value.unshift(...historyMessages)
        } else {
          // 初始加载，直接设置消息列表
          messages.value = historyMessages
        }
        // 更新游标
        lastCreateTime.value = chatHistories[chatHistories.length - 1]?.createTime
        // 检查是否还有更多历史
        hasMoreHistory.value = chatHistories.length === 10
      } else {
        hasMoreHistory.value = false
      }
      historyLoaded.value = true
    }
  } catch (error) {
    console.error('加载对话历史失败：', error)
    message.error('加载对话历史失败')
  } finally {
    loadingHistory.value = false
  }
}

// 加载更多历史消息
const loadMoreHistory = async () => {
  await loadChatHistory(true)
}

// 获取应用信息
const fetchAppInfo = async () => {
  const id = route.params.id as string
  if (!id) {
    message.error('应用ID不存在')
    router.push('/')
    return
  }

  appId.value = id

  try {
    const res = await getAppVoById({ id: id as unknown as number })
    if (res.data.code === 0 && res.data.data) {
      appInfo.value = res.data.data

      // 先加载对话历史
      await loadChatHistory()
      // 如果有至少2条对话记录，展示对应的网站
      if (messages.value.length >= 2) {
        updatePreview()
      }
      // 检查是否需要自动发送初始提示词
      // 只有在是自己的应用且没有对话历史时才自动发送
      if (
          appInfo.value.initPrompt &&
          isOwner.value &&
          messages.value.length === 0 &&
          historyLoaded.value
      ) {
        await sendInitialMessage(appInfo.value.initPrompt)
      }
    } else {
      message.error('获取应用信息失败')
      router.push('/')
    }
  } catch (error) {
    console.error('获取应用信息失败：', error)
    message.error('获取应用信息失败')
    router.push('/')
  }
}

// 发送初始消息
const sendInitialMessage = async (prompt: string) => {
  // 添加用户消息
  messages.value.push({
    type: 'user',
    content: prompt,
  })

  // 添加AI消息占位符
  const aiMessageIndex = messages.value.length
  messages.value.push({
    type: 'ai',
    content: '',
    loading: true,
  })

  await nextTick()
  scrollToBottom()

  // 开始生成
  isGenerating.value = true
  await generateCode(prompt, aiMessageIndex)
}

// 发送消息
const sendMessage = async () => {
  if (!userInput.value.trim() || isGenerating.value) {
    return
  }

  let message = userInput.value.trim()
  // 如果有选中的元素，将元素信息添加到提示词中
  if (selectedElementInfo.value) {
    let elementContext = `\n\n选中元素信息：`
    if (selectedElementInfo.value.pagePath) {
      elementContext += `\n- 页面路径: ${selectedElementInfo.value.pagePath}`
    }
    elementContext += `\n- 标签: ${selectedElementInfo.value.tagName.toLowerCase()}\n- 选择器: ${selectedElementInfo.value.selector}`
    if (selectedElementInfo.value.textContent) {
      elementContext += `\n- 当前内容: ${selectedElementInfo.value.textContent.substring(0, 100)}`
    }
    message += elementContext
  }
  userInput.value = ''
  // 添加用户消息（包含元素信息）
  messages.value.push({
    type: 'user',
    content: message,
  })

  // 发送消息后，清除选中元素并退出编辑模式
  if (selectedElementInfo.value) {
    clearSelectedElement()
    if (isEditMode.value) {
      toggleEditMode()
    }
  }

  // 添加AI消息占位符
  const aiMessageIndex = messages.value.length
  messages.value.push({
    type: 'ai',
    content: '',
    loading: true,
  })

  await nextTick()
  scrollToBottom()

  // 开始生成
  isGenerating.value = true
  await generateCode(message, aiMessageIndex)
}

// 生成代码 - 使用 EventSource 处理流式响应
const generateCode = async (userMessage: string, aiMessageIndex: number) => {
  let eventSource: EventSource | null = null
  let streamCompleted = false

  try {
    // 获取 axios 配置的 baseURL
    const baseURL = request.defaults.baseURL || API_BASE_URL

    // 构建URL参数
    const params = new URLSearchParams({
      appId: appId.value || '',
      message: userMessage,
    })

    const url = `${baseURL}/app/chat/gen/code?${params}`

    // 创建 EventSource 连接
    eventSource = new EventSource(url, {
      withCredentials: true,
    })

    let fullContent = ''

    // 处理接收到的消息
    eventSource.onmessage = function (event) {
      if (streamCompleted) return

      try {
        // 解析JSON包装的数据
        const parsed = JSON.parse(event.data)
        const content = parsed.d

        // 拼接内容
        if (content !== undefined && content !== null) {
          fullContent += content
          messages.value[aiMessageIndex].content = fullContent
          messages.value[aiMessageIndex].loading = false
          scrollToBottom()
        }
      } catch (error) {
        console.error('解析消息失败:', error)
        handleError(error, aiMessageIndex)
      }
    }

    // 处理done事件
    eventSource.addEventListener('done', function () {
      if (streamCompleted) return

      streamCompleted = true
      isGenerating.value = false
      eventSource?.close()

      // 延迟更新预览，确保后端已完成处理
      setTimeout(async () => {
        await fetchAppInfo()
        updatePreview()
      }, 1000)
    })

    // 处理business-error事件（后端限流等错误）
    eventSource.addEventListener('business-error', function (event: MessageEvent) {
      if (streamCompleted) return

      try {
        const errorData = JSON.parse(event.data)
        console.error('SSE业务错误事件:', errorData)

        // 显示具体的错误信息
        const errorMessage = errorData.message || '生成过程中出现错误'
        messages.value[aiMessageIndex].content = `❌ ${errorMessage}`
        messages.value[aiMessageIndex].loading = false
        message.error(errorMessage)

        streamCompleted = true
        isGenerating.value = false
        eventSource?.close()
      } catch (parseError) {
        console.error('解析错误事件失败:', parseError, '原始数据:', event.data)
        handleError(new Error('服务器返回错误'), aiMessageIndex)
      }
    })

    // 处理错误
    eventSource.onerror = function () {
      if (streamCompleted || !isGenerating.value) return
      // 检查是否是正常的连接关闭
      if (eventSource?.readyState === EventSource.CONNECTING) {
        streamCompleted = true
        isGenerating.value = false
        eventSource?.close()

        setTimeout(async () => {
          await fetchAppInfo()
          updatePreview()
        }, 1000)
      } else {
        handleError(new Error('SSE连接错误'), aiMessageIndex)
      }
    }
  } catch (error) {
    console.error('创建 EventSource 失败：', error)
    handleError(error, aiMessageIndex)
  }
}

// 错误处理函数
const handleError = (error: unknown, aiMessageIndex: number) => {
  console.error('生成代码失败：', error)
  messages.value[aiMessageIndex].content = '抱歉，生成过程中出现了错误，请重试。'
  messages.value[aiMessageIndex].loading = false
  message.error('生成失败，请重试')
  isGenerating.value = false
}

// 更新预览
const updatePreview = () => {
  if (appId.value) {
    const codeGenType = appInfo.value?.codeGenType || CodeGenTypeEnum.HTML
    const newPreviewUrl = getStaticPreviewUrl(codeGenType, appId.value)
    previewUrl.value = newPreviewUrl
    previewReady.value = true
  }
}

// 滚动到底部
const scrollToBottom = () => {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

// 下载代码
const downloadCode = async () => {
  if (!appId.value) {
    message.error('应用ID不存在')
    return
  }
  downloading.value = true
  try {
    const API_BASE_URL = request.defaults.baseURL || ''
    const url = `${API_BASE_URL}/app/download/${appId.value}`
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
    })
    if (!response.ok) {
      throw new Error(`下载失败: ${response.status}`)
    }
    // 获取文件名
    const contentDisposition = response.headers.get('Content-Disposition')
    const fileName = contentDisposition?.match(/filename="(.+)"/)?.[1] || `app-${appId.value}.zip`
    // 下载文件
    const blob = await response.blob()
    const downloadUrl = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = downloadUrl
    link.download = fileName
    link.click()
    // 清理
    URL.revokeObjectURL(downloadUrl)
    message.success('代码下载成功')
  } catch (error) {
    console.error('下载失败：', error)
    message.error('下载失败，请重试')
  } finally {
    downloading.value = false
  }
}

// 部署应用
const deployApp = async () => {
  if (!appId.value) {
    message.error('应用ID不存在')
    return
  }

  deploying.value = true
  try {
    const res = await deployAppApi({
      appId: appId.value as unknown as number,
    })

    if (res.data.code === 0 && res.data.data) {
      deployUrl.value = res.data.data
      deployModalVisible.value = true
      message.success('部署成功')
    } else {
      message.error('部署失败：' + res.data.message)
    }
  } catch (error) {
    console.error('部署失败：', error)
    message.error('部署失败，请重试')
  } finally {
    deploying.value = false
  }
}

// 在新窗口打开预览
const openInNewTab = () => {
  if (previewUrl.value) {
    window.open(previewUrl.value, '_blank')
  }
}

// 打开部署的网站
const openDeployedSite = () => {
  if (deployUrl.value) {
    window.open(deployUrl.value, '_blank')
  }
}

// iframe加载完成
const onIframeLoad = () => {
  previewReady.value = true
  const iframe = document.querySelector('.preview-iframe') as HTMLIFrameElement
  if (iframe) {
    visualEditor.init(iframe)
    visualEditor.onIframeLoad()
  }
}

// 编辑应用
const editApp = () => {
  if (appInfo.value?.id) {
    router.push(`/app/edit/${appInfo.value.id}`)
  }
}

// 删除应用
const deleteApp = async () => {
  if (!appInfo.value?.id) return

  try {
    const res = await deleteAppApi({ id: appInfo.value.id })
    if (res.data.code === 0) {
      message.success('删除成功')
      appDetailVisible.value = false
      router.push('/')
    } else {
      message.error('删除失败：' + res.data.message)
    }
  } catch (error) {
    console.error('删除失败：', error)
    message.error('删除失败')
  }
}

// 可视化编辑相关函数
const toggleEditMode = () => {
  // 检查 iframe 是否已经加载
  const iframe = document.querySelector('.preview-iframe') as HTMLIFrameElement
  if (!iframe) {
    message.warning('请等待页面加载完成')
    return
  }
  // 确保 visualEditor 已初始化
  if (!previewReady.value) {
    message.warning('请等待页面加载完成')
    return
  }
  const newEditMode = visualEditor.toggleEditMode()
  isEditMode.value = newEditMode
}

const clearSelectedElement = () => {
  selectedElementInfo.value = null
  visualEditor.clearSelection()
}

const getInputPlaceholder = () => {
  if (selectedElementInfo.value) {
    return `正在编辑 ${selectedElementInfo.value.tagName.toLowerCase()} 元素，描述您想要的修改...`
  }
  return '请描述你想生成的网站，越详细效果越好哦'
}

// 页面加载时获取应用信息
onMounted(() => {
  fetchAppInfo()

  // 监听 iframe 消息
  window.addEventListener('message', (event) => {
    visualEditor.handleIframeMessage(event)
  })
})

// 清理资源
onUnmounted(() => {
  // EventSource 会在组件卸载时自动清理
})
</script>

<style scoped>
.app-chat-page {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 72px);
  background-color: var(--bg-color);
  overflow: hidden;
}

.header-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 32px;
  background: white;
  border-bottom: 1px solid var(--border-color);
  z-index: 100;
  height: 64px;
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.app-name {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: var(--text-main);
  letter-spacing: -0.5px;
}

.main-content {
  display: flex;
  flex: 1;
  overflow: hidden;
  background: var(--secondary-bg);
  padding: 20px 24px;
  gap: 24px;
}

.chat-section,
.preview-section {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-width: 0; /* 关键：防止 flex 子元素溢出 */
}

.chat-section {
  flex: 1;
  max-width: 560px;
}

.preview-section {
  flex: 1.8;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding: 0 4px;
  height: 24px;
  flex-shrink: 0;
}

.section-header h3 {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.chat-card,
.preview-card {
  flex: 1;
  background: white;
  border-radius: 20px;
  border: 1px solid var(--border-color);
  box-shadow: var(--card-shadow);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

/* 对话框容器 */
.messages-container {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden; /* 强制隐藏横向滚动 */
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  background: #fafafa;
}

.message-item {
  display: flex;
  flex-direction: column;
  width: 100%;
}

.user-message {
  align-self: flex-end;
  display: flex;
  gap: 12px;
  max-width: 85%;
  flex-direction: row;
}

.user-message .message-content {
  background: var(--primary-color);
  color: white;
  padding: 12px 18px;
  border-radius: 20px 20px 4px 20px;
  font-size: 15px;
  line-height: 1.5;
  box-shadow: 0 4px 12px rgba(0, 102, 255, 0.15);
  word-break: break-word;
}

.ai-message {
  align-self: flex-start;
  display: flex;
  gap: 12px;
  max-width: 95%;
  flex-direction: row;
}

.ai-message .message-content {
  background: white;
  color: var(--text-main);
  padding: 18px;
  border-radius: 20px 20px 20px 4px;
  font-size: 15px;
  line-height: 1.6;
  border: 1px solid var(--border-color);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
  width: 100%;
  overflow-x: hidden; /* 防止 Markdown 内容溢出 */
}

/* 输入区域 */
.input-container {
  padding: 20px 24px;
  background: white;
  border-top: 1px solid var(--border-color);
  flex-shrink: 0;
}

.input-wrapper {
  position: relative;
  background: var(--secondary-bg);
  border-radius: 16px;
  padding: 12px;
  transition: var(--transition-base);
  border: 1px solid transparent;
}

.input-wrapper:focus-within {
  background: white;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 4px rgba(0, 102, 255, 0.05);
}

.input-wrapper :deep(textarea) {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  padding: 4px 40px 4px 8px;
  resize: none;
  font-size: 15px;
  line-height: 1.5;
  color: var(--text-main);
}

.input-actions {
  position: absolute;
  right: 12px;
  bottom: 12px;
}

/* 预览区域 */
.preview-iframe {
  width: 100%;
  height: 100%;
  border: none;
  background: white;
}

.preview-placeholder,
.preview-loading {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  text-align: center;
  padding: 40px;
  background: #fafafa;
}

.placeholder-icon {
  font-size: 64px;
  margin-bottom: 16px;
  opacity: 0.2;
}

.loading-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  color: var(--text-secondary);
  font-size: 13px;
}

.selected-element-alert {
  margin: 0 24px 12px;
  border-radius: 12px;
  border: 1px solid #bae7ff;
  background-color: #e6f7ff;
}

.selected-element-info {
  font-size: 13px;
}

.element-tag {
  font-weight: 700;
  color: var(--primary-color);
  margin-right: 8px;
}

.element-id {
  color: #ff4d4f;
  font-family: monospace;
}

.element-selector-code {
  display: block;
  margin-top: 4px;
  background: rgba(0, 0, 0, 0.04);
  padding: 4px 8px;
  border-radius: 4px;
  font-family: monospace;
  font-size: 11px;
  color: #555;
}

.edit-mode-active {
  background: #fff1f0 !important;
  color: #ff4d4f !important;
  font-weight: 700;
}

.load-more-container {
  text-align: center;
  margin-bottom: 8px;
}
</style>
