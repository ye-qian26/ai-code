<template>
  <div class="markdown-content" v-html="renderedMarkdown"></div>
</template>

<script setup>
import { computed } from 'vue'
import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js'
import 'highlight.js/styles/github.css'

const props = defineProps({
  content: {
    type: String,
    default: ''
  }
})

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  highlight: function (str, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return (
          '<pre class="hljs"><code>' +
          hljs.highlight(str, { language: lang, ignoreIllegals: true }).value +
          '</code></pre>'
        )
      } catch {
        // Ignore error
      }
    }
    return '<pre class="hljs"><code>' + md.utils.escapeHtml(str) + '</code></pre>'
  }
})

const renderedMarkdown = computed(() => {
  return md.render(props.content)
})
</script>

<style scoped>
.markdown-content {
  line-height: 1.6;
  color: #2d3436;
  word-wrap: break-word;
}

.markdown-content :deep(h1),
.markdown-content :deep(h2),
.markdown-content :deep(h3),
.markdown-content :deep(h4),
.markdown-content :deep(h5),
.markdown-content :deep(h6) {
  margin: 1.5em 0 0.5em 0;
  font-weight: 600;
  line-height: 1.25;
}

.markdown-content :deep(h1) {
  font-size: 1.5em;
  border-bottom: 2px solid rgba(230, 126, 34, 0.2);
  padding-bottom: 0.3em;
}

.markdown-content :deep(h2) {
  font-size: 1.3em;
  border-bottom: 2px solid rgba(230, 126, 34, 0.15);
  padding-bottom: 0.3em;
}

.markdown-content :deep(h3) {
  font-size: 1.1em;
}

.markdown-content :deep(p) {
  margin: 0.8em 0;
}

.markdown-content :deep(ul),
.markdown-content :deep(ol) {
  margin: 0.8em 0;
  padding-left: 1.5em;
}

.markdown-content :deep(li) {
  margin: 0.3em 0;
}

.markdown-content :deep(blockquote) {
  margin: 1em 0;
  padding: 0.5em 1em;
  border-left: 4px solid #e67e22;
  background-color: #fef3e2;
  color: #636e72;
}

.markdown-content :deep(code) {
  background-color: #fef3e2;
  padding: 0.2em 0.4em;
  border-radius: 4px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 0.9em;
  border: 1px solid rgba(230, 126, 34, 0.2);
}

.markdown-content :deep(pre) {
  background-color: #fef9f3;
  border: 2px solid rgba(230, 126, 34, 0.15);
  border-radius: 12px;
  padding: 1em;
  overflow-x: auto;
  margin: 1em 0;
}

.markdown-content :deep(pre code) {
  background-color: transparent;
  padding: 0;
  border-radius: 0;
  border: none;
  font-size: 0.9em;
  line-height: 1.4;
}

.markdown-content :deep(table) {
  border-collapse: collapse;
  margin: 1em 0;
  width: 100%;
}

.markdown-content :deep(table th),
.markdown-content :deep(table td) {
  border: 1px solid rgba(230, 126, 34, 0.2);
  padding: 0.5em 0.8em;
  text-align: left;
}

.markdown-content :deep(table th) {
  background-color: #fef3e2;
  font-weight: 600;
}

.markdown-content :deep(table tr:nth-child(even)) {
  background-color: #fef9f3;
}

.markdown-content :deep(a) {
  color: #e67e22;
  text-decoration: none;
}

.markdown-content :deep(a:hover) {
  text-decoration: underline;
  color: #d35400;
}

.markdown-content :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
  margin: 0.5em 0;
}

.markdown-content :deep(hr) {
  border: none;
  border-top: 2px solid rgba(230, 126, 34, 0.2);
  margin: 1.5em 0;
}

.markdown-content :deep(.hljs) {
  background-color: #fef9f3 !important;
  border-radius: 12px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 0.9em;
  line-height: 1.4;
}

.markdown-content :deep(.hljs-keyword) {
  color: #c0392b;
  font-weight: 600;
}

.markdown-content :deep(.hljs-string) {
  color: #27ae60;
}

.markdown-content :deep(.hljs-comment) {
  color: #636e72;
  font-style: italic;
}

.markdown-content :deep(.hljs-number) {
  color: #e67e22;
}

.markdown-content :deep(.hljs-function) {
  color: #8e44ad;
}

.markdown-content :deep(.hljs-tag) {
  color: #2980b9;
}

.markdown-content :deep(.hljs-attr) {
  color: #8e44ad;
}

.markdown-content :deep(.hljs-title) {
  color: #8e44ad;
  font-weight: 600;
}
</style>