export const CodeGenTypeEnum = {
  HTML: 'html',
  MULTI_FILE: 'multi_file',
  VUE_PROJECT: 'vue_project',
}

export const DEPLOY_DOMAIN = 'http://localhost'

export const API_BASE_URL = 'http://localhost:8123/api'

export const STATIC_BASE_URL = `${API_BASE_URL}/static`

export const getDeployUrl = (deployKey) => `${DEPLOY_DOMAIN}/${deployKey}`

export const getStaticPreviewUrl = (codeGenType, appId) => {
  const baseUrl = `${STATIC_BASE_URL}/${codeGenType}_${appId}/`
  return codeGenType === CodeGenTypeEnum.VUE_PROJECT
    ? `${baseUrl}dist/index.html`
    : baseUrl
}