import React, { useState } from 'react';
import { Injector } from '@sker/core';
import { Layout } from '../components/Layout';
import { Tool, UIRenderer } from '@sker/prompt-renderer';
import { AuthService } from '../services/auth.service';
import { CredentialStorage } from '../services/credential-storage';

interface LoginPageProps {
  injector: Injector;
}

export async function LoginPageComponent({ injector }: LoginPageProps) {
  const renderer = injector.get(UIRenderer);
  const baseUrl = process.env.API_BASE_URL || 'https://mcp.sker.us';
  const authService = new AuthService({ baseUrl });
  const credentialStorage = new CredentialStorage(baseUrl);

  const handleLogin = async (email: string, password: string) => {
    try {
      const session = await authService.login({ email, password });
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
      <h1>用户登录</h1>

      <Tool
        name="login_with_email"
        description={`使用邮箱登录。
- 参数：email (邮箱), password (密码)
- 功能：验证用户身份并登录系统
- 后置状态：登录成功后跳转到首页`}
        execute={async (params: { email: string; password: string }) => {
          return await handleLogin(params.email, params.password);
        }}
      >
        登录
      </Tool>

      <Tool
        name="navigate_to_register"
        description={`跳转到注册页面。
- 功能：创建新账户
- 后置状态：页面跳转到注册页面`}
        execute={async () => {
          return await renderer.navigate('prompt:///register');
        }}
      >
        注册新账户
      </Tool>

      <h2>登录说明</h2>
      <p>请提供您的邮箱和密码进行登录。</p>
      <p>如果您还没有账户，请点击"注册新账户"。</p>

      <h3>自动登录</h3>
      <p>登录成功后，您的凭证将被安全存储在本地，下次访问时可自动登录。</p>
    </Layout>
  );
}
