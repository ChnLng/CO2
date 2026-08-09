// site/src/lib/api.ts
import { supabase } from './supabase';

// 1. 获取所有产品 (公开读取)
export const fetchProducts = async () => {
  const { data, error } = await supabase.from('products').select('*');
  if (error) throw error;
  return data;
};

// 2. 获取当前用户保修信息 (受保护的读取)
export const getMyWarranties = async () => {
  const { data, error } = await supabase.from('warranties').select('*');
  if (error) throw error;
  return data;
};