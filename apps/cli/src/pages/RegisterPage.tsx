import React from 'react';
import { Injector } from '@sker/core';
import { Layout } from '../components/Layout';
import { Tool, UIRenderer } from '@sker/prompt-renderer';
import { AuthService } from '../services/auth.service';
import { CredentialStorage } from '../services/credential-storage';

interface RegisterPageProps {
  injector: Injector;
}

export async function RegisterPageComponent({ injector }: RegisterPageProps) {
  const renderer = injector.get(UIRenderer);
  const baseUrl = process.env.API_BASE_URL || 'https://mcp.sker.us';
  const authService = new AuthService({ baseUrl });
  const credentialStorage = new CredentialStorage(baseUrl);

  const handleRegister = async (
    email: string,
    password: string,
    name: string
  ) => {
    try {
      const session = await authService.register({ email, password, name });
      // Save credentials
      credentialStorage.saveCredentials('default', {
        email,
        password,
        baseUrl,
        lastLogin: new Date().toISOString(),
      });
      // Navigate to dashboard
      await renderer.navigate('prompt:///');
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  };

  return (
    <Layout injector={injector}>
      <h1>用户注册</h1>

      <Tool
        name="register_user"
        description={`注册新用户。
- 参数：email (邮箱), password (密码，至少6位), name (用户名)
- 功能：创建新账户并自动登录
- 后置状态：注册成功后跳转到首页`}
        execute={async (params: {
          email: string;
          password: string;
          name: string;
        }) => {
          return await handleRegister(params.email, params.password, params.name);
        }}
      >
        注册
      </Tool>

      <Tool
        name="navigate_to_login"
        description={`跳转到登录页面。
- 功能：使用已有账户登录
- 后置状态：页面跳转到登录页面`}
        execute={async () => {
          return await renderer.navigate('prompt:///login');
        }}
      >
        已有账户？去登录
      </Tool>

      <h2>注册说明</h2>
      <p>请提供以下信息创建新账户：</p>
      <ul>
        <li>邮箱 - 用于登录和接收通知</li>
        <li>密码 - 至少6个字符</li>
        <li>用户名 - 显示名称</li>
      </ul>

      <h3>账户安全</h3>
      <p>您的密码将被安全加密存储。</p>
      <p>注册成功后，您将自动登录并跳转到首页。</p>
    </Layout>
  );
}
