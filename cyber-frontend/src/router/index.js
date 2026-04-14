import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '../stores/user'

const routes = [
  {
    path: '/',
    name: 'home',
    component: () => import('../pages/HomePage.vue')
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('../pages/user/LoginPage.vue')
  },
  {
    path: '/register',
    name: 'register',
    component: () => import('../pages/user/RegisterPage.vue')
  },
  {
    path: '/app/create',
    name: 'app-create',
    component: () => import('../pages/app/AppCreatePage.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/app/:id',
    name: 'app-detail',
    component: () => import('../pages/app/AppDetailPage.vue')
  },
  {
    path: '/app/:id/chat',
    name: 'app-chat',
    component: () => import('../pages/app/AppChatPage.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/app/:id/edit',
    name: 'app-edit',
    component: () => import('../pages/app/AppEditPage.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/my-apps',
    name: 'my-apps',
    component: () => import('../pages/app/MyAppsPage.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/admin/users',
    name: 'admin-users',
    component: () => import('../pages/admin/UserManagePage.vue'),
    meta: { requiresAuth: true, requiresAdmin: true }
  },
  {
    path: '/admin/apps',
    name: 'admin-apps',
    component: () => import('../pages/admin/AppManagePage.vue'),
    meta: { requiresAuth: true, requiresAdmin: true }
  },
  {
    path: '/admin/app/:id/edit',
    name: 'admin-app-edit',
    component: () => import('../pages/admin/AdminAppEditPage.vue'),
    meta: { requiresAuth: true, requiresAdmin: true }
  },
  {
    path: '/admin/chats',
    name: 'admin-chats',
    component: () => import('../pages/admin/ChatManagePage.vue'),
    meta: { requiresAuth: true, requiresAdmin: true }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('../pages/NotFoundPage.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach(async (to, from, next) => {
  const userStore = useUserStore()

  if (to.meta.requiresAuth && !userStore.isLoggedIn) {
    next({ name: 'login', query: { redirect: to.fullPath } })
  } else if (to.meta.requiresAdmin && userStore.user?.userRole !== 'admin') {
    next({ name: 'home' })
  } else {
    next()
  }
})

export default router