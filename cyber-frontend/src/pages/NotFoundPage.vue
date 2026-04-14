<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()
</script>

<template>
  <div class="not-found-page">
    <div class="not-found-container container container-narrow">
      <p class="masthead">Error</p>
      <h1 class="headline error-title">Page Not Found</h1>
      <p class="lead error-lead">
        The page you are looking for does not exist or has been removed.
      </p>

      <div class="divider-accent"></div>

      <div class="error-actions">
        <button class="btn btn-primary" @click="router.push('/')">
          Return Home
        </button>
      </div>

      <aside class="error-suggestions">
        <h4 class="suggestions-title">You might try:</h4>
        <ul class="suggestions-list">
          <li>Returning to the <router-link to="/">homepage</router-link></li>
          <li>Browsing the <router-link to="/my-apps">applications</router-link></li>
          <li>Creating a <router-link to="/app/create">new project</router-link></li>
        </ul>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.not-found-page {
  padding: var(--space-4xl) 0;
  background: var(--off-white);
}

.error-title {
  font-size: 2.5rem;
  margin-bottom: var(--space-md);
}

.error-lead {
  margin-bottom: var(--space-xl);
}

.error-actions {
  margin-top: var(--space-xl);
}

.error-suggestions {
  margin-top: var(--space-xl);
  padding: var(--space-lg);
  background: var(--white);
  border: var(--border-light);
}

.suggestions-title {
  font-family: var(--font-display);
  font-size: 1rem;
  margin-bottom: var(--space-md);
}

.suggestions-list {
  list-style: disc;
  padding-left: var(--space-lg);
}

.suggestions-list li {
  font-family: var(--font-serif);
  font-size: 0.9rem;
  color: var(--medium-gray);
  margin-bottom: var(--space-sm);
}

.suggestions-list li a {
  color: var(--accent-red);
}
</style>