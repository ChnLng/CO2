// 路径: src/lib/productService.ts
import { supabase } from './supabase';

// 工具 1: 获取所有商品
export async function getProducts() {
  const { data, error } = await supabase.from('products').select('*');
  if (error) {
    console.error("获取数据失败:", error);
    return [];
  }
  return data || [];
}

// 工具 2: 添加商品
export async function addProduct(name: string, price: number) {
  const { data, error } = await supabase
    .from('products')
    .insert([{ name, price }])
    .select();

  if (error) {
    console.error("添加商品失败:", error);
    throw error;
  }
  return data;
}

// 工具 3: 更新商品价格
export async function updateProductPrice(id: number, price: number) {
  const { error } = await supabase
    .from('products')
    .update({ price: price })
    .eq('id', id);

  if (error) {
    console.error("更新价格失败:", error);
    throw error;
  }
  return true;
}

// 工具 4: 删除商品
export async function deleteProduct(id: number) {
  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', id);

  if (error) {
    console.error("删除商品失败:", error);
    throw error;
  }
  return true;
}

// 工具 5: 获取当前用户的保修信息
// 注意：因为你配置了 RLS 策略，此函数仅在用户登录后有效
export async function getMyWarranties() {
  const { data, error } = await supabase.from('warranties').select('*');
  
  if (error) {
    console.error("获取保修信息失败:", error);
    throw error; // 这里抛出错误，方便前端捕获并处理
  }
  
  return data || [];
}