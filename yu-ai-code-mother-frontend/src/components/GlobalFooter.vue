<template>
  <a-layout-footer class="footer">
    <div class="footer-content">
      <p class="copyright">
        <a
          href="https://www.codefather.cn"
          target="_blank"
          rel="noopener noreferrer"
          class="author-link"
        >
          编程导航原创项目 by 程序员鱼皮
        </a>
      </p>
    </div>
  </a-layout-footer>
</template>

<script setup lang="ts">
// 无需额外的响应式数据
</script>

<style scoped>
.footer {
  background: linear-gradient(135deg, #fff 0%, #fef9f3 100%);
  text-align: center;
  padding: 20px;
  margin-top: 40px;
  border-top: 2px solid rgba(230, 126, 34, 0.15);
}

.footer-content {
  max-width: 1200px;
  margin: 0 auto;
}

.copyright {
  margin: 0;
  color: #636e72;
  font-size: 14px;
}

.author-link {
  color: #e67e22;
  text-decoration: none;
  transition: color 0.3s;
}

.author-link:hover {
  color: #d35400;
}
</style>
