<script setup>
import { ref, onMounted, onUnmounted, nextTick, watch, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { appApi } from '../../api/app'
import { chatApi } from '../../api/chat'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { useUserStore } from '../../stores/user'
import { formatCodeGenType } from '../../utils/codeGenTypes.js'
import { getStaticPreviewUrl } from '../../config/env.js'
import { VisualEditor } from '../../utils/visualEditor.js'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const appId = route.params.id
const app = ref(null)
const loading = ref(true)
const messages = ref([])
const inputMessage = ref('')
const sending = ref(false)
const eventSource = ref(null)
const chatContainer = ref(null)
const previewUrl = ref('')
const showPreview = ref(true)

const loadingHistory = ref(false)
const hasMoreHistory = ref(false)
const lastCreateTime = ref(null)

const downloading = ref(false)
const deploying = ref(false)
const deployModalVisible = ref(false)
const deployUrl = ref('')
const appDetailVisible = ref(false)

const isEditMode = ref(false)
const selectedElementInfo = ref(null)
const previewReady = ref(false)

const visualEditor = new VisualEditor({
  onElementSelected: (elementInfo) => {
    selectedElementInfo.value = elementInfo
  },
  onElementCleared: () => {
    selectedElementInfo.value = null
  }
})

marked.setOptions({
  breaks: true,
  gfm: true
})

const renderMarkdown = (text) => {
  if (!text) return ''
  return DOMPurify.sanitize(marked(text))
}

const getPreviewUrl = () => {
  if (app.value) {
    const codeGenType = app.value.codeGenType || 'html'
    return getStaticPreviewUrl(codeGenType, appId)
  }
  return ''
}

const fetchApp = async () => {
  try {
    const res = await appApi.getVO(appId)
    app.value = res.data
    previewUrl.value = getPreviewUrl()
  } catch (err) {
    console.error('Failed to fetch app:', err)
  } finally {
    loading.value = false
  }
}

const fetchChatHistory = async (isLoadMore = false) => {
  if (loadingHistory.value) return
  loadingHistory.value = true
  try {
    const res = await chatApi.listByApp(appId, 10, lastCreateTime.value)
    if (res.data?.records) {
      const records = res.data.records
      const historyMessages = records.map(record => ({
        id: record.id,
        type: record.messageType,
        content: record.message,
        createTime: record.createTime
      }))
      if (isLoadMore) {
        messages.value.unshift(...historyMessages)
      } else {
        messages.value = historyMessages
      }
      if (records.length > 0) {
        lastCreateTime.value = records[records.length - 1]?.createTime
      }
      hasMoreHistory.value = records.length === 10
    }
  } catch (err) {
    console.error('Failed to fetch chat history:', err)
  } finally {
    loadingHistory.value = false
  }
}

const loadMoreHistory = async () => {
  await fetchChatHistory(true)
}

const isOwner = computed(() => {
  return app.value?.userId === userStore.user?.id
})

const isAdmin = computed(() => {
  return userStore.user?.userRole === 'admin'
})

const autoSendInitialPrompt = () => {
  if (route.query.new === 'true' && app.value?.initPrompt) {
    inputMessage.value = ''
    sendDirectMessage(app.value.initPrompt)
  }
}

const sendDirectMessage = async (message) => {
  let fullMessage = message
  if (selectedElementInfo.value) {
    let elementContext = `\n\n选中元素信息：`
    if (selectedElementInfo.value.pagePath) {
      elementContext += `\n- 页面路径: ${selectedElementInfo.value.pagePath}`
    }
    elementContext += `\n- 标签: ${selectedElementInfo.value.tagName.toLowerCase()}\n- 选择器: ${selectedElementInfo.value.selector}`
    if (selectedElementInfo.value.textContent) {
      elementContext += `\n- 当前内容: ${selectedElementInfo.value.textContent.substring(0, 100)}`
    }
    fullMessage = message + elementContext
  }

  messages.value.push({
    id: Date.now(),
    type: 'user',
    content: fullMessage,
    createTime: new Date().toISOString()
  })

  sending.value = true

  const aiMessage = {
    id: Date.now() + 1,
    type: 'ai',
    content: '',
    createTime: new Date().toISOString()
  }
  messages.value.push(aiMessage)

  await nextTick()
  scrollToBottom()

  if (selectedElementInfo.value) {
    clearSelectedElement()
    if (isEditMode.value) {
      toggleEditMode()
    }
  }

  try {
    const url = appApi.chatStream(appId, fullMessage)
    eventSource.value = new EventSource(url)

    let fullContent = ''

    eventSource.value.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.d) {
          fullContent += data.d
          aiMessage.content = fullContent
          scrollToBottom()
        }
      } catch (e) {
        fullContent += event.data
        aiMessage.content = fullContent
        scrollToBottom()
      }
    }

    eventSource.value.addEventListener('done', () => {
      eventSource.value?.close()
      sending.value = false
      previewUrl.value = getPreviewUrl() + '?t=' + Date.now()
    })

    eventSource.value.addEventListener('business-error', (event) => {
      try {
        const errorData = JSON.parse(event.data)
        const errorMessage = errorData.message || '生成过程中出现错误'
        aiMessage.content = `❌ ${errorMessage}`
        sending.value = false
        eventSource.value?.close()
      } catch (parseError) {
        aiMessage.content = '抱歉，服务器返回错误'
        sending.value = false
        eventSource.value?.close()
      }
    })

    eventSource.value.onerror = () => {
      eventSource.value?.close()
      sending.value = false
      if (!aiMessage.content) {
        aiMessage.content = 'Request failed. Please try again.'
      }
    }
  } catch (err) {
    sending.value = false
    aiMessage.content = `Error: ${err.message}`
  }
}

const sendMessage = async () => {
  if (!inputMessage.value.trim() || sending.value) return
  const message = inputMessage.value.trim()
  inputMessage.value = ''
  await sendDirectMessage(message)
}

const scrollToBottom = () => {
  if (chatContainer.value) {
    chatContainer.value.scrollTop = chatContainer.value.scrollHeight
  }
}

const handleDeploy = async () => {
  try {
    const res = await appApi.deploy(appId)
    deployUrl.value = res.data
    deployModalVisible.value = true
  } catch (err) {
    alert(`Publish failed: ${err.message}`)
  }
}

const handleDownload = () => {
  const url = appApi.download(appId)
  window.open(url, '_blank')
}

const refreshPreview = () => {
  previewUrl.value = getPreviewUrl() + '?t=' + Date.now()
}

const showAppDetail = () => {
  appDetailVisible.value = true
}

const editApp = () => {
  if (app.value?.id) {
    router.push(`/app/edit/${app.value.id}`)
  }
}

const deleteApp = async () => {
  try {
    await appApi.delete(appId)
    alert('删除成功')
    appDetailVisible.value = false
    router.push('/')
  } catch (err) {
    alert(`删除失败: ${err.message}`)
  }
}

const toggleEditMode = () => {
  if (!previewReady.value) return
  const iframe = document.querySelector('.preview-iframe')
  if (!iframe) return
  const newMode = visualEditor.toggleEditMode()
  isEditMode.value = newMode
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

const openInNewTab = () => {
  if (previewUrl.value) {
    window.open(previewUrl.value, '_blank')
  }
}

const openDeployedSite = () => {
  if (deployUrl.value) {
    window.open(deployUrl.value, '_blank')
  }
}

const onIframeLoad = () => {
  previewReady.value = true
  const iframe = document.querySelector('.preview-iframe')
  if (iframe) {
    visualEditor.init(iframe)
    visualEditor.onIframeLoad()
  }
}

watch(app, (newApp) => {
  if (newApp && route.query.new === 'true') {
    autoSendInitialPrompt()
  }
})

onMounted(() => {
  fetchApp()
  fetchChatHistory()
  window.addEventListener('message', (event) => {
    visualEditor.handleIframeMessage(event)
  })
})

onUnmounted(() => {
  eventSource.value?.close()
  window.removeEventListener('message', (event) => {
    visualEditor.handleIframeMessage(event)
  })
})
</script>

<template>
  <div class="chat-page">
    <div class="chat-container container">
      <div v-if="loading" class="loading">
        <div class="spinner"></div>
      </div>

      <div v-else class="chat-layout">
        <aside class="chat-sidebar">
          <header class="sidebar-header">
            <p class="masthead">Application</p>
            <h2 class="sidebar-title headline">{{ app?.appName || 'Untitled' }}</h2>
            <p class="caption">ID: {{ appId }}</p>
          </header>

          <div class="divider"></div>

          <div class="sidebar-status">
            <p class="status-item">
              <span class="status-label">Status</span>
              <span class="status-value">{{ app?.deployKey ? 'Published' : 'Draft' }}</span>
            </p>
            <p class="status-item">
              <span class="status-label">Type</span>
              <span class="status-value tag">{{ formatCodeGenType(app?.codeGenType) || 'HTML' }}</span>
            </p>
          </div>

          <div class="sidebar-actions">
            <button class="btn" @click="showAppDetail">详情</button>
            <button class="btn btn-primary" @click="handleDeploy" :disabled="!isOwner">Publish</button>
            <button class="btn" @click="handleDownload" :disabled="!isOwner">Download</button>
            <button class="btn" @click="router.push('/my-apps')">Return</button>
          </div>
        </aside>

        <main class="chat-main">
          <header class="chat-header">
            <p class="masthead">Conversation</p>
            <h3 class="chat-title">AI Dialogue</h3>
          </header>

          <div class="messages-area" ref="chatContainer">
            <div v-if="hasMoreHistory" class="load-more-container">
              <button class="btn-link" @click="loadMoreHistory" :disabled="loadingHistory">
                加载更多历史消息
              </button>
            </div>
            <div
              v-for="msg in messages"
              :key="msg.id"
              :class="['message-item', msg.type]"
            >
              <div class="message-meta">
                <span class="message-author">{{ msg.type === 'user' ? 'You' : 'AI' }}</span>
                <span class="message-time caption">{{ msg.createTime?.slice(0, 16) || '' }}</span>
              </div>
              <div class="message-body">
                <div
                  v-if="msg.type === 'ai'"
                  class="markdown-content"
                  v-html="renderMarkdown(msg.content)"
                ></div>
                <p v-else>{{ msg.content }}</p>
              </div>
            </div>

            <div v-if="messages.length === 0" class="empty-state">
              <p>Begin your conversation to generate code.</p>
            </div>
          </div>

          <div class="input-area">
            <div v-if="selectedElementInfo" class="selected-element-alert">
              <div class="selected-element-info">
                <div class="element-header">
                  <span class="element-tag">
                    选中元素：{{ selectedElementInfo.tagName.toLowerCase() }}
                  </span>
                  <span v-if="selectedElementInfo.id" class="element-id">
                    #{{ selectedElementInfo.id }}
                  </span>
                </div>
                <div class="element-details">
                  <div v-if="selectedElementInfo.textContent" class="element-item">
                    内容: {{ selectedElementInfo.textContent.substring(0, 50) }}
                  </div>
                  <div class="element-item">
                    选择器: <code>{{ selectedElementInfo.selector }}</code>
                  </div>
                </div>
              </div>
              <button class="btn-close" @click="clearSelectedElement">×</button>
            </div>
            <form @submit.prevent="sendMessage" class="input-form">
              <textarea
                v-model="inputMessage"
                class="form-input chat-input"
                :placeholder="getInputPlaceholder()"
                rows="3"
                :disabled="sending || !isOwner"
              ></textarea>
              <button
                type="submit"
                class="btn btn-primary send-btn"
                :disabled="sending || !inputMessage.trim() || !isOwner"
              >
                {{ sending ? 'Generating...' : 'Send' }}
              </button>
            </form>
            <p class="input-hint caption">Press Enter to send your message</p>
          </div>
        </main>

        <aside class="preview-panel" v-if="showPreview">
          <header class="preview-header">
            <p class="masthead">Preview</p>
            <h3 class="preview-title">Live Result</h3>
            <div class="preview-actions">
              <button
                class="btn-link"
                :class="{ 'edit-mode-active': isEditMode }"
                :disabled="!previewReady"
                @click="toggleEditMode"
                :title="!previewReady ? '请等待页面加载完成' : ''"
              >
                {{ isEditMode ? '退出编辑' : '编辑模式' }}
              </button>
              <button class="btn btn-small" @click="openInNewTab">新窗口</button>
              <button class="btn btn-small" @click="refreshPreview">Refresh</button>
            </div>
          </header>
          <div class="preview-content">
            <iframe
              v-if="previewUrl"
              :src="previewUrl"
              class="preview-iframe"
              sandbox="allow-scripts allow-same-origin"
              @load="onIframeLoad"
            ></iframe>
            <div v-else class="preview-placeholder">
              <p>Preview will appear here after generation</p>
            </div>
          </div>
          <footer class="preview-footer">
            <p class="caption">{{ previewUrl }}</p>
          </footer>
        </aside>
      </div>
    </div>

    <!-- Deploy Modal -->
    <div v-if="deployModalVisible" class="modal-overlay" @click="deployModalVisible = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>部署成功</h3>
          <button class="btn-close" @click="deployModalVisible = false">×</button>
        </div>
        <div class="modal-body">
          <p>网站已成功部署，可以通过以下链接访问：</p>
          <input :value="deployUrl" readonly class="form-input" />
          <div class="modal-actions">
            <button class="btn btn-primary" @click="openDeployedSite">访问网站</button>
            <button class="btn" @click="deployModalVisible = false">关闭</button>
          </div>
        </div>
      </div>
    </div>

    <!-- App Detail Modal -->
    <div v-if="appDetailVisible" class="modal-overlay" @click="appDetailVisible = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>应用详情</h3>
          <button class="btn-close" @click="appDetailVisible = false">×</button>
        </div>
        <div class="modal-body">
          <div class="detail-item">
            <span class="detail-label">创建者：</span>
            <span>{{ app?.user?.userName || app?.userId }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">创建时间：</span>
            <span>{{ app?.createTime?.slice(0, 19) || '-' }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">生成类型：</span>
            <span class="tag">{{ formatCodeGenType(app?.codeGenType) }}</span>
          </div>
          <div v-if="isOwner || isAdmin" class="modal-actions">
            <button class="btn btn-primary" @click="editApp">修改</button>
            <button class="btn btn-danger" @click="deleteApp">删除</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chat-page {
  padding: var(--space-xl) 0;
  background: var(--off-white);
  height: calc(100vh - 80px);
  display: flex;
}

.chat-container {
  height: 100%;
}

.chat-layout {
  display: flex;
  gap: var(--space-lg);
  height: 100%;
}

.chat-sidebar {
  width: 220px;
  background: var(--white);
  padding: var(--space-lg);
  border: var(--border-light);
}

.sidebar-header {
  margin-bottom: var(--space-md);
}

.sidebar-title {
  font-size: 1.1rem;
}

.sidebar-status {
  margin-bottom: var(--space-lg);
}

.status-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: var(--space-sm);
  font-size: 0.85rem;
}

.status-label {
  font-family: var(--font-body);
  color: var(--light-gray);
}

.status-value {
  font-family: var(--font-serif);
}

.sidebar-actions {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.chat-main {
  flex: 1;
  min-width: 0;
  background: var(--white);
  border: var(--border-light);
  display: flex;
  flex-direction: column;
}

.chat-header {
  padding: var(--space-lg);
  border-bottom: var(--border-light);
}

.chat-title {
  font-size: 1rem;
  margin-top: var(--space-sm);
}

.messages-area {
  flex: 1;
  padding: var(--space-lg);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.load-more-container {
  text-align: center;
  margin-bottom: var(--space-md);
}

.message-item {
  max-width: 85%;
}

.message-item.user {
  align-self: flex-end;
}

.message-item.ai {
  align-self: flex-start;
}

.message-meta {
  display: flex;
  justify-content: space-between;
  margin-bottom: var(--space-sm);
  font-size: 0.75rem;
}

.message-author {
  font-family: var(--font-display);
  font-weight: 600;
}

.message-item.user .message-author {
  color: var(--accent-red);
}

.message-item.ai .message-author {
  color: var(--dark-gray);
}

.message-body {
  padding: var(--space-md);
  background: var(--off-white);
  border-left: 2px solid var(--light-gray);
}

.message-item.user .message-body {
  background: var(--white);
  border-left-color: var(--accent-red);
}

.message-item.user .message-body p {
  font-family: var(--font-serif);
}

.input-area {
  padding: var(--space-lg);
  border-top: var(--border-light);
  background: var(--white);
}

.selected-element-alert {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-md);
  background: #e6f7ff;
  border: 1px solid #91d5ff;
  border-radius: 4px;
  margin-bottom: var(--space-md);
}

.element-header {
  display: flex;
  gap: var(--space-sm);
}

.element-tag {
  font-weight: 600;
  color: #1890ff;
}

.element-id {
  color: #52c41a;
}

.element-details {
  font-size: 0.85rem;
  color: var(--dark-gray);
}

.element-item {
  margin-top: 4px;
}

.btn-close {
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  color: #999;
}

.input-form {
  display: flex;
  gap: var(--space-md);
}

.chat-input {
  flex: 1;
  resize: none;
}

.send-btn {
  min-width: 100px;
}

.input-hint {
  margin-top: var(--space-sm);
}

.preview-panel {
  width: 400px;
  background: var(--white);
  border: var(--border-light);
  display: flex;
  flex-direction: column;
}

.preview-header {
  padding: var(--space-md);
  border-bottom: var(--border-light);
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
}

.preview-title {
  font-size: 0.9rem;
  flex: 1;
  margin-left: var(--space-md);
}

.preview-actions {
  display: flex;
  gap: var(--space-sm);
}

.edit-mode-active {
  color: #ff4d4f;
}

.preview-content {
  flex: 1;
  overflow: hidden;
}

.preview-iframe {
  width: 100%;
  height: 100%;
  border: none;
}

.preview-placeholder {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--pale-gray);
}

.preview-placeholder p {
  font-family: var(--font-serif);
  font-size: 0.9rem;
  color: var(--light-gray);
  font-style: italic;
}

.preview-footer {
  padding: var(--space-sm);
  border-top: var(--border-light);
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: var(--white);
  border-radius: 8px;
  width: 500px;
  max-width: 90%;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-lg);
  border-bottom: var(--border-light);
}

.modal-header h3 {
  margin: 0;
}

.modal-body {
  padding: var(--space-lg);
}

.detail-item {
  display: flex;
  margin-bottom: var(--space-md);
}

.detail-label {
  width: 80px;
  color: var(--light-gray);
}

.modal-actions {
  display: flex;
  gap: var(--space-md);
  margin-top: var(--space-lg);
}

.btn-link {
  background: none;
  border: none;
  color: var(--accent-red);
  cursor: pointer;
  padding: 0;
  font-family: var(--font-body);
  font-size: 0.8rem;
  font-weight: 500;
}

.btn-link:disabled {
  color: var(--light-gray);
  cursor: not-allowed;
}

.btn-default {
  background: var(--white);
  border: 1px solid var(--pale-gray);
  padding: var(--space-sm) var(--space-md);
  cursor: pointer;
}

.btn-danger {
  background: #ff4d4f;
  color: white;
  border: none;
  padding: var(--space-sm) var(--space-md);
  cursor: pointer;
}

@media (max-width: 1200px) {
  .preview-panel {
    width: 300px;
  }
}

@media (max-width: 900px) {
  .chat-layout {
    flex-direction: column;
  }

  .chat-sidebar {
    width: 100%;
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: space-between;
  }

  .sidebar-actions {
    flex-direction: row;
    flex-wrap: wrap;
  }

  .preview-panel {
    width: 100%;
    height: 300px;
  }
}
</style>
