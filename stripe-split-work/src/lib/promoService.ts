// 优惠码相关服务
import { supabase } from './supabase';

export type PromoCode = {
  id: number;
  code: string;
  discount_percent: number;
  valid_from: string;
  valid_until?: string;
  max_uses?: number;
  times_used: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

// 验证优惠码
export async function validatePromoCode(code: string): Promise<{
  valid: boolean;
  message: string;
  percentOff?: number;
  id?: number;
}> {
  const cleanCode = code.trim().toUpperCase();

  const { data, error } = await supabase
    .from('promo_codes')
    .select('*')
    .eq('code', cleanCode)
    .single();

  if (error || !data) {
    return { valid: false, message: '优惠码不存在' };
  }

  const promo = data as PromoCode;

  // 检查是否激活
  if (!promo.is_active) {
    return { valid: false, message: '优惠码已失效' };
  }

  // 检查有效期
  const now = new Date();
  if (promo.valid_from && new Date(promo.valid_from) > now) {
    return { valid: false, message: '优惠码尚未生效' };
  }
  if (promo.valid_until && new Date(promo.valid_until) < now) {
    return { valid: false, message: '优惠码已过期' };
  }

  // 检查使用次数
  if (promo.max_uses && promo.times_used >= promo.max_uses) {
    return { valid: false, message: '优惠码已达到最大使用次数' };
  }

  return {
    valid: true,
    message: `优惠码已应用 -${promo.discount_percent}%`,
    percentOff: promo.discount_percent,
    id: promo.id,
  };
}

// 获取所有优惠码（管理员）
export async function getAllPromoCodes(): Promise<PromoCode[]> {
  const { data, error } = await supabase
    .from('promo_codes')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as PromoCode[];
}

// 创建优惠码（管理员）
export async function createPromoCode(promo: Omit<PromoCode, 'id' | 'times_used' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('promo_codes')
    .insert({
      ...promo,
      code: promo.code.toUpperCase(),
      times_used: 0,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// 更新优惠码（管理员）
export async function updatePromoCode(id: number, updates: Partial<Omit<PromoCode, 'id' | 'created_at' | 'updated_at'>>) {
  const { data, error } = await supabase
    .from('promo_codes')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// 删除优惠码（管理员）
export async function deletePromoCode(id: number) {
  const { error } = await supabase
    .from('promo_codes')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
