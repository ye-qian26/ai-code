export const CodeGenTypeEnum = {
  HTML: 'html',
  MULTI_FILE: 'multi_file',
  VUE_PROJECT: 'vue_project',
}

export const CODE_GEN_TYPE_CONFIG = {
  [CodeGenTypeEnum.HTML]: {
    label: '原生 HTML 模式',
    value: CodeGenTypeEnum.HTML,
  },
  [CodeGenTypeEnum.MULTI_FILE]: {
    label: '原生多文件模式',
    value: CodeGenTypeEnum.MULTI_FILE,
  },
  [CodeGenTypeEnum.VUE_PROJECT]: {
    label: 'Vue 项目模式',
    value: CodeGenTypeEnum.VUE_PROJECT,
  },
}

export const CODE_GEN_TYPE_OPTIONS = Object.values(CODE_GEN_TYPE_CONFIG).map((config) => ({
  label: config.label,
  value: config.value,
}))

export const formatCodeGenType = (type) => {
  if (!type) return '未知类型'

  const config = CODE_GEN_TYPE_CONFIG[type]
  return config ? config.label : type
}

export const getAllCodeGenTypes = () => {
  return Object.values(CodeGenTypeEnum)
}

export const isValidCodeGenType = (type) => {
  return Object.values(CodeGenTypeEnum).includes(type)
}