<template>
  <div id="userLoginPage">
    <h2 class="title">鱼皮 AI 应用生成 - 用户登录</h2>
    <div class="desc">不写一行代码，生成完整应用</div>
    <a-form :model="formState" name="basic" autocomplete="off" @finish="handleSubmit">
      <a-form-item name="userAccount" :rules="[{ required: true, message: '请输入账号' }]">
        <a-input v-model:value="formState.userAccount" placeholder="请输入账号" />
      </a-form-item>
      <a-form-item
        name="userPassword"
        :rules="[
          { required: true, message: '请输入密码' },
          { min: 8, message: '密码长度不能小于 8 位' },
        ]"
      >
        <a-input-password v-model:value="formState.userPassword" placeholder="请输入密码" />
      </a-form-item>
      <div class="tips">
        没有账号
        <RouterLink to="/user/register">去注册</RouterLink>
      </div>
      <a-form-item>
        <a-button type="primary" html-type="submit" style="width: 100%">登录</a-button>
      </a-form-item>
    </a-form>
  </div>
</template>
<script lang="ts" setup>
import { reactive } from 'vue'
import { userLogin } from '@/api/userController.ts'
import { useLoginUserStore } from '@/stores/loginUser.ts'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'

const formState = reactive<API.UserLoginRequest>({
  userAccount: '',
  userPassword: '',
})

const router = useRouter()
const loginUserStore = useLoginUserStore()

/**
 * 提交表单
 * @param values
 */
const handleSubmit = async (values: any) => {
  const res = await userLogin(values)
  // 登录成功，把登录态保存到全局状态中
  if (res.data.code === 0 && res.data.data) {
    await loginUserStore.fetchLoginUser()
    message.success('登录成功')
    router.push({
      path: '/',
      replace: true,
    })
  } else {
    message.error('登录失败，' + res.data.message)
  }
}
</script>

<style scoped>
#userLoginPage {
  background: linear-gradient(135deg, #fff 0%, #fef9f3 100%);
  max-width: 480px;
  padding: 32px;
  margin: 80px auto;
  border-radius: 20px;
  box-shadow: 0 8px 30px rgba(230, 126, 34, 0.15);
  border: 2px solid rgba(230, 126, 34, 0.2);
}

.title {
  text-align: center;
  margin-bottom: 16px;
  color: #2d3436;
  font-weight: 600;
}

.desc {
  text-align: center;
  color: #636e72;
  margin-bottom: 24px;
  font-size: 15px;
}

.tips {
  text-align: right;
  color: #636e72;
  font-size: 13px;
  margin-bottom: 16px;
}

.tips a {
  color: #e67e22;
}
</style>
