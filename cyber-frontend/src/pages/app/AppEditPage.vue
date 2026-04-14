<script setup>
import { ref, reactive, onMounted, onUnmounted, computed, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { appApi } from '../../api/app'
import { useUserStore } from '../../stores/user'
import { formatCodeGenType } from '../../utils/codeGenTypes.js'
import { formatTime } from '../../utils/time.js'
import { getStaticPreviewUrl } from '../../config/env.js'
import { VisualEditor } from '../../utils/visualEditor.js'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const appId = route.params.id
const app = ref(null)
const loading = ref(true)
const saving = ref(false)
const error = ref('')
const previewUrl = ref('')
const previewReady = ref(false)
const showPreview = ref(true)

const form = reactive({
  appName: '',
  cover: '',
  priority: 0,
  initPrompt: '',
  codeGenType: '',
  deployKey: ''
})

const isAdmin = computed(() => {
  return userStore.user?.userRole === 'admin'
})

const isEditMode = ref(false)
const selectedElementInfo = ref(null)
const hoveredElementInfo = ref(null)

const visualEditor = new VisualEditor({
  onElementSelected: (elementInfo) => {
    selectedElementInfo.value = elementInfo
  },
  onElementHover: (elementInfo) => {
    hoveredElementInfo.value = elementInfo
  },
  onElementCleared: () => {
    selectedElementInfo.value = null
    hoveredElementInfo.value = null
  }
})

const fetchApp = async () => {
  try {
    const res = await appApi.getVO(appId)
    app.value = res.data
    form.appName = res.data.appName || ''
    form.cover = res.data.cover || ''
    form.priority = res.data.priority || 0
    form.initPrompt = res.data.initPrompt || ''
    form.codeGenType = res.data.codeGenType || ''
    form.deployKey = res.data.deployKey || ''
    previewUrl.value = getStaticPreviewUrl(res.data.codeGenType || 'html', appId)

    if (!isAdmin.value && app.value.userId !== userStore.user?.id) {
      error.value = '您没有权限编辑此应用'
    }
  } catch (err) {
    error.value = err.message || 'Failed to load application'
  } finally {
    loading.value = false
  }
}

const handleUpdate = async () => {
  if (!form.appName.trim()) {
    error.value = 'Application name is required'
    return
  }

  saving.value = true
  error.value = ''

  try {
    if (isAdmin.value) {
      await appApi.adminUpdate({
        id: Number(appId),
        appName: form.appName,
        cover: form.cover,
        priority: Number(form.priority)
      })
    } else {
      await appApi.update({
        id: Number(appId),
        appName: form.appName
      })
    }
    router.push('/my-apps')
  } catch (err) {
    error.value = err.message || 'Update failed'
  } finally {
    saving.value = false
  }
}

const openPreview = () => {
  if (app.value?.codeGenType && app.value?.id) {
    const url = getStaticPreviewUrl(app.value.codeGenType, String(app.value.id))
    window.open(url, '_blank')
  }
}

const goToChat = () => {
  if (app.value?.id) {
    router.push(`/app/chat/${app.value.id}`)
  }
}

const refreshPreview = () => {
  previewUrl.value = getStaticPreviewUrl(app.value?.codeGenType || 'html', appId) + '?t=' + Date.now()
}

const toggleEditMode = () => {
  if (!previewReady.value) {
    return
  }
  const iframe = document.querySelector('.preview-iframe')
  if (!iframe) return
  const newMode = visualEditor.toggleEditMode()
  isEditMode.value = newMode
}

const clearSelectedElement = () => {
  selectedElementInfo.value = null
  visualEditor.clearSelection()
}

const onIframeLoad = () => {
  previewReady.value = true
  const iframe = document.querySelector('.preview-iframe')
  if (iframe) {
    visualEditor.init(iframe)
    visualEditor.onIframeLoad()
  }
}

const handleWindowMessage = (event) => {
  visualEditor.handleIframeMessage(event)
}

onMounted(() => {
  fetchApp()
  window.addEventListener('message', handleWindowMessage)
})

onUnmounted(() => {
  window.removeEventListener('message', handleWindowMessage)
})
</script>

<template>
  <div class="edit-page">
    <div class="edit-container container-wide">
      <div v-if="loading" class="loading">
        <div class="spinner"></div>
      </div>

      <div v-else-if="error && !app" class="error-state">
        <p class="message message-error">{{ error }}</p>
        <button class="btn" @click="router.push('/my-apps')">Return</button>
      </div>

      <div v-else-if="app" class="edit-layout">
        <!-- Left: Form Panel -->
        <div class="edit-sidebar">
          <header class="edit-header">
            <p class="masthead">Edit Application</p>
            <h1 class="headline">{{ app.appName || 'Untitled' }}</h1>
            <p class="caption">ID: {{ appId }}</p>
          </header>

          <div class="divider-accent"></div>

          <!-- Info Section -->
          <div class="info-section">
            <h3 class="section-title">Details</h3>
            <div class="info-grid">
              <p class="info-item">
                <span class="info-label">Type</span>
                <span class="info-value tag">{{ formatCodeGenType(app.codeGenType) || 'HTML' }}</span>
              </p>
              <p class="info-item">
                <span class="info-label">Status</span>
                <span class="info-value">{{ app.deployKey ? 'Published' : 'Draft' }}</span>
              </p>
              <p class="info-item">
                <span class="info-label">Owner</span>
                <span class="info-value">{{ app.user?.userName || app.userId }}</span>
              </p>
              <p class="info-item">
                <span class="info-label">Created</span>
                <span class="info-value">{{ app.createTime?.slice(0, 10) || '-' }}</span>
              </p>
            </div>
          </div>

          <!-- Cover Preview -->
          <div class="cover-preview" v-if="app.cover">
            <h3 class="section-title">Current Cover</h3>
            <img :src="app.cover" :alt="app.appName" class="cover-image" />
          </div>

          <!-- Form -->
          <form @submit.prevent="handleUpdate" class="edit-form">
            <div class="form-group">
              <label class="form-label">Application Name</label>
              <input
                v-model="form.appName"
                type="text"
                class="form-input"
                placeholder="Enter a name"
              />
            </div>

            <div v-if="isAdmin" class="form-group">
              <label class="form-label">Cover Image URL</label>
              <input
                v-model="form.cover"
                type="text"
                class="form-input"
                placeholder="https://example.com/image.jpg"
              />
              <p class="caption">Provide a URL for the application cover image</p>
            </div>

            <div v-if="isAdmin" class="form-group">
              <label class="form-label">Priority</label>
              <input
                v-model.number="form.priority"
                type="number"
                class="form-input"
                placeholder="0"
                min="0"
              />
              <p class="caption">Higher priority apps appear in featured section (use 99 for featured)</p>
            </div>

            <div class="form-group">
              <label class="form-label">Initial Prompt</label>
              <textarea
                v-model="form.initPrompt"
                class="form-input"
                rows="3"
                disabled
              ></textarea>
              <p class="form-note caption">初始提示词不可修改</p>
            </div>

            <div class="form-group">
              <label class="form-label">Code Gen Type</label>
              <input
                :value="formatCodeGenType(form.codeGenType)"
                type="text"
                class="form-input"
                disabled
              />
              <p class="form-note caption">生成类型不可修改</p>
            </div>

            <div v-if="form.deployKey" class="form-group">
              <label class="form-label">Deploy Key</label>
              <input
                v-model="form.deployKey"
                type="text"
                class="form-input"
                disabled
              />
              <p class="form-note caption">部署密钥不可修改</p>
            </div>

            <div v-if="error" class="message message-error">
              {{ error }}
            </div>

            <div class="form-actions">
              <button type="button" class="btn" @click="router.push('/my-apps')">Cancel</button>
              <button type="submit" class="btn btn-primary" :disabled="saving">
                {{ saving ? 'Saving...' : 'Save Changes' }}
              </button>
              <button type="button" class="btn" @click="goToChat">Enter Chat</button>
            </div>
          </form>

          <!-- Additional Info -->
          <div class="divider"></div>
          <div class="info-section">
            <h3 class="section-title">Additional Info</h3>
            <div class="info-grid">
              <p class="info-item">
                <span class="info-label">Update Time</span>
                <span class="info-value">{{ formatTime(app.updateTime) || '-' }}</span>
              </p>
              <p class="info-item">
                <span class="info-label">Deployed Time</span>
                <span class="info-value">{{ app.deployedTime ? formatTime(app.deployedTime) : 'Not Deployed' }}</span>
              </p>
              <p class="info-item">
                <span class="info-label">Preview</span>
                <span class="info-value">
                  <button v-if="app.deployKey" class="btn-link" @click="openPreview">View Preview</button>
                  <span v-else>Not Deployed</span>
                </span>
              </p>
            </div>
          </div>
        </div>

        <!-- Right: Preview & Visual Editor -->
        <div class="edit-preview-panel" v-if="showPreview">
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
              <button class="btn btn-small" @click="openPreview">新窗口</button>
              <button class="btn btn-small" @click="refreshPreview">Refresh</button>
            </div>
          </header>

          <!-- Selected Element Info -->
          <div v-if="selectedElementInfo" class="selected-element-panel">
            <div class="panel-header">
              <span class="panel-tag">选中元素</span>
              <button class="btn-close" @click="clearSelectedElement">×</button>
            </div>
            <div class="panel-content">
              <div class="element-row">
                <span class="row-label">标签</span>
                <code class="row-value">{{ selectedElementInfo.tagName.toLowerCase() }}</code>
              </div>
              <div v-if="selectedElementInfo.id" class="element-row">
                <span class="row-label">ID</span>
                <code class="row-value">#{{ selectedElementInfo.id }}</code>
              </div>
              <div v-if="selectedElementInfo.textContent" class="element-row">
                <span class="row-label">内容</span>
                <span class="row-value">{{ selectedElementInfo.textContent.substring(0, 80) }}</span>
              </div>
              <div class="element-row">
                <span class="row-label">选择器</span>
                <code class="row-value selector-code">{{ selectedElementInfo.selector }}</code>
              </div>
              <div class="element-row" v-if="selectedElementInfo.rect">
                <span class="row-label">尺寸</span>
                <span class="row-value">{{ selectedElementInfo.rect.width }} × {{ selectedElementInfo.rect.height }}</span>
              </div>
            </div>
          </div>

          <div class="preview-content">
            <iframe
              v-if="previewUrl"
              :src="previewUrl"
              class="preview-iframe"
              sandbox="allow-scripts allow-same-origin"
              @load="onIframeLoad"
            ></iframe>
            <div v-else class="preview-placeholder">
              <p>Preview will appear here</p>
            </div>
          </div>
          <footer class="preview-footer">
            <p class="caption">{{ previewUrl }}</p>
          </footer>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.edit-page {
  padding: var(--space-xl) 0;
  background: var(--off-white);
  min-height: calc(100vh - 80px);
}

.edit-layout {
  display: flex;
  gap: var(--space-lg);
  height: calc(100vh - 100px);
}

.edit-sidebar {
  width: 380px;
  min-width: 340px;
  background: var(--white);
  padding: var(--space-lg);
  border: var(--border-light);
  overflow-y: auto;
}

.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-lg);
}

.edit-header {
  margin-bottom: var(--space-md);
}

.info-section {
  margin-bottom: var(--space-lg);
  padding: var(--space-md);
  background: var(--off-white);
  border: var(--border-light);
}

.info-section .section-title {
  font-size: 0.9rem;
  margin-bottom: var(--space-sm);
}

.info-grid {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-md);
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.info-label {
  font-family: var(--font-body);
  font-size: 0.7rem;
  color: var(--light-gray);
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.info-value {
  font-family: var(--font-serif);
  font-size: 0.85rem;
}

.cover-preview {
  margin-bottom: var(--space-lg);
}

.cover-image {
  max-width: 100%;
  max-height: 150px;
  object-fit: cover;
  border: var(--border-light);
}

.edit-form {
  margin-top: var(--space-md);
}

.form-group {
  margin-bottom: var(--space-md);
}

.form-label {
  display: block;
  font-family: var(--font-body);
  font-size: 0.85rem;
  margin-bottom: var(--space-sm);
  color: var(--dark-gray);
}

.form-input {
  width: 100%;
  padding: var(--space-sm) var(--space-md);
  border: 1px solid var(--pale-gray);
  background: var(--white);
  font-family: var(--font-serif);
  transition: border-color var(--transition);
}

.form-input:focus {
  outline: none;
  border-color: var(--dark-gray);
}

.form-input:disabled {
  background: var(--pale-gray);
  color: var(--light-gray);
}

.form-note {
  margin-top: var(--space-xs);
  font-size: 0.7rem;
  color: var(--light-gray);
}

.form-actions {
  display: flex;
  gap: var(--space-md);
  justify-content: flex-end;
  margin-top: var(--space-md);
}

/* Preview Panel */
.edit-preview-panel {
  flex: 1;
  background: var(--white);
  border: var(--border-light);
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.preview-header {
  padding: var(--space-md);
  border-bottom: var(--border-light);
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--space-sm);
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

/* Selected Element Panel */
.selected-element-panel {
  border-bottom: var(--border-light);
  background: #f0f7ff;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-sm) var(--space-md);
}

.panel-tag {
  font-family: var(--font-display);
  font-size: 0.75rem;
  font-weight: 600;
  color: #1890ff;
  letter-spacing: 0.05em;
}

.btn-close {
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  color: var(--light-gray);
  line-height: 1;
}

.btn-close:hover {
  color: var(--black);
}

.panel-content {
  padding: var(--space-sm) var(--space-md);
}

.element-row {
  display: flex;
  gap: var(--space-sm);
  padding: 4px 0;
  font-size: 0.8rem;
}

.row-label {
  font-family: var(--font-body);
  color: var(--light-gray);
  min-width: 50px;
  font-size: 0.7rem;
  text-transform: uppercase;
}

.row-value {
  font-family: var(--font-serif);
  color: var(--dark-gray);
  word-break: break-all;
}

.row-value code {
  font-family: 'Courier New', monospace;
  font-size: 0.75rem;
  background: var(--pale-gray);
  padding: 1px 4px;
}

.row-value.selector-code {
  font-size: 0.7rem;
}

/* Preview Content */
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
  padding: var(--space-xs) var(--space-md);
  border-top: var(--border-light);
  font-size: 0.7rem;
  color: var(--light-gray);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.btn-link {
  background: none;
  border: none;
  color: var(--accent-red);
  cursor: pointer;
  padding: var(--space-xs) var(--space-sm);
  font-family: var(--font-body);
  font-size: 0.8rem;
  font-weight: 500;
}

.btn-link:disabled {
  color: var(--light-gray);
  cursor: not-allowed;
}

.edit-mode-active {
  color: #ff4d4f;
}

@media (max-width: 900px) {
  .edit-layout {
    flex-direction: column;
    height: auto;
  }

  .edit-sidebar {
    width: 100%;
    min-width: auto;
  }

  .edit-preview-panel {
    height: 500px;
  }
}
</style>
