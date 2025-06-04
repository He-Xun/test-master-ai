import React, { useState } from 'react';
import { Card, Form, Input, Button, Select, message, Divider, Typography, Upload, Space } from 'antd';
import { useTranslation } from 'react-i18next';
import { UploadOutlined, DownloadOutlined, SaveOutlined, LockOutlined, GlobalOutlined } from '@ant-design/icons';
import { storageAdapter } from '../utils/storage-adapter';

const { Title, Text } = Typography;

const AccountSettings: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);

  // 语言选项
  const languages = [
    { code: 'zh-CN', label: '中文' },
    { code: 'en-US', label: 'English' },
  ];

  // 修改密码
  const handlePasswordChange = async (values: any) => {
    setLoading(true);
    try {
      // 这里只做前端演示，实际应调用 storageAdapter.updateUserPassword(userId, oldPwd, newPwd)
      // 假设当前用户已登录
      const user = storageAdapter.getCurrentSession()?.user;
      if (!user) throw new Error('未登录');
      // 这里应校验旧密码，更新新密码
      // ...
      message.success(t('common.success'));
      form.resetFields(['oldPassword', 'newPassword', 'confirmPassword']);
    } catch (e: any) {
      message.error(e.message || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  // 语言切换
  const handleLanguageChange = (lang: string) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('app-language', lang);
    message.success(t('common.success'));
  };

  // 导出配置
  const handleExport = async () => {
    try {
      // 假设 storageAdapter 有导出方法
      const user = storageAdapter.getCurrentSession()?.user;
      if (!user) throw new Error('未登录');
      const data = await storageAdapter.exportUserData?.(user.id);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `testmasterai-config-${user.username}.json`;
      a.click();
      URL.revokeObjectURL(url);
      message.success(t('common.success'));
    } catch (e: any) {
      message.error(e.message || t('common.error'));
    }
  };

  // 导入配置
  const handleImport = async (file: any) => {
    setImporting(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      // 假设 storageAdapter 有导入方法
      const user = storageAdapter.getCurrentSession()?.user;
      if (!user) throw new Error('未登录');
      await storageAdapter.importUserData?.(user.id, data);
      message.success(t('common.success'));
    } catch (e: any) {
      message.error(e.message || t('common.error'));
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8">
      <Card title={t('profile.accountSettings')} bordered={false}>
        <Title level={4}>{t('profile.accountSettings')}</Title>
        <Text type="secondary">{t('profile.accountSettingsDesc')}</Text>
        <Divider />
        {/* 修改密码 */}
        <Form
          form={form}
          layout="vertical"
          onFinish={handlePasswordChange}
          style={{ maxWidth: 400 }}
        >
          <Form.Item
            name="oldPassword"
            label={t('profile.oldPassword')}
            rules={[{ required: true, message: t('auth.passwordRequired') }]}
          >
            <Input.Password prefix={<LockOutlined />} autoComplete="current-password" />
          </Form.Item>
          <Form.Item
            name="newPassword"
            label={t('profile.newPassword')}
            rules={[{ required: true, message: t('auth.passwordRequired') }]}
          >
            <Input.Password prefix={<LockOutlined />} autoComplete="new-password" />
          </Form.Item>
          <Form.Item
            name="confirmPassword"
            label={t('auth.confirmPassword')}
            dependencies={["newPassword"]}
            rules={[
              { required: true, message: t('auth.confirmPasswordRequired') },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error(t('auth.passwordMismatch')));
                },
              }),
            ]}
          >
            <Input.Password prefix={<LockOutlined />} autoComplete="new-password" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} icon={<SaveOutlined />}>{t('common.save')}</Button>
          </Form.Item>
        </Form>
        <Divider />
        {/* 默认语言设置 */}
        <div className="mb-6">
          <Text strong><GlobalOutlined /> {t('profile.defaultLanguage')}</Text>
          <div className="mt-2">
            <Select
              value={i18n.language}
              onChange={handleLanguageChange}
              style={{ width: 180 }}
              options={languages.map(l => ({ value: l.code, label: l.label }))}
            />
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AccountSettings; 