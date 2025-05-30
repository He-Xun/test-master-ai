import { useState, useEffect, useCallback, useRef } from 'react';
import { storageAdapter } from '../utils/storage-adapter';
import { TestConfigDraft } from '../types';

// 配置暂存Hook
export const useConfigDraft = () => {
  const [hasDraft, setHasDraft] = useState(false);

  // 检查是否有暂存配置
  const checkDraft = useCallback(async () => {
    try {
      const draft = await storageAdapter.getTestConfigDraft();
      setHasDraft(!!draft);
      return !!draft;
    } catch (error) {
      console.error('[useConfigDraft] 检查暂存失败:', error);
      return false;
    }
  }, []);

  // 保存暂存配置
  const saveDraft = useCallback(async (config: TestConfigDraft) => {
    try {
      await storageAdapter.saveTestConfigDraft(config);
      setHasDraft(true);
      console.log('[useConfigDraft] 配置已暂存');
    } catch (error) {
      console.error('[useConfigDraft] 保存暂存失败:', error);
    }
  }, []);

  // 恢复暂存配置
  const restoreDraft = useCallback(async (): Promise<TestConfigDraft | null> => {
    try {
      const draft = await storageAdapter.getTestConfigDraft();
      if (draft) {
        console.log('[useConfigDraft] 配置已恢复:', draft);
      }
      return draft;
    } catch (error) {
      console.error('[useConfigDraft] 恢复暂存失败:', error);
      return null;
    }
  }, []);

  // 清除暂存配置
  const clearDraft = useCallback(async () => {
    try {
      await storageAdapter.clearTestConfigDraft();
      setHasDraft(false);
      console.log('[useConfigDraft] 暂存已清除');
    } catch (error) {
      console.error('[useConfigDraft] 清除暂存失败:', error);
    }
  }, []);

  // 初始化时检查暂存
  useEffect(() => {
    checkDraft();
  }, [checkDraft]);

  return {
    hasDraft,
    saveDraft,
    restoreDraft,
    clearDraft,
    checkDraft,
  };
};

// 自动保存Hook
export const useAutoSave = (
  data: TestConfigDraft | null,
  enabled: boolean = true,
  delay: number = 2000
) => {
  const timeoutRef = useRef<NodeJS.Timeout>();
  const { saveDraft } = useConfigDraft();

  useEffect(() => {
    if (!enabled || !data) return;

    // 清除之前的定时器
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // 设置新的定时器
    timeoutRef.current = setTimeout(() => {
      saveDraft(data);
    }, delay);

    // 清理函数
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [data, enabled, delay, saveDraft]);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
}; 