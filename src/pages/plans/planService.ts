import { supabase } from "@/lib/supabase";
import { format } from "date-fns";

export async function getPlans(offset = 0, pageSize = 6) {
  const { data, error } = await supabase
    .from('plans')
    .select('*', { count: 'exact' })
    .eq('status', 'active')
    .order('investment', { ascending: true })
    .range(offset, offset + pageSize - 1);
  if (error) throw error;
  return data || [];
}

export async function getUserProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, withdrawal_wallet, total_invested')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data;
}

export async function getSubscribedPlans(userId: string, offset = 0, pageSize = 6) {
  const { data: subscriptions, error } = await supabase
    .from('plans_subscriptions')
    .select(`
      id,
      plan_id,
      created_at,
      plans (*)
    `)
    .eq('user_id', userId)
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .range(offset, offset + pageSize - 1);
  if (error) throw error;

  const plansWithEarnings = await Promise.all(
    (subscriptions || []).map(async (subscription) => {
      const { data: earnings, error: earningsError } = await supabase
        .from('transactions')
        .select('amount, created_at')
        .eq('user_id', userId)
        .eq('type', 'investment_return')
        .eq('reference_id', subscription.id)
        .eq('status', 'Completed')
        .order('created_at', { ascending: false });
      if (earningsError) throw earningsError;
      const totalEarnings = earnings?.reduce((sum, tx) => sum + (tx.amount || 0), 0) || 0;
      const lastEarningDate = earnings?.[0]?.created_at;
      const daysCredited = earnings?.length || 0;
      return {
        ...subscription.plans,
        subscription_id: subscription.id,
        subscription_date: format(new Date(subscription.created_at), "MMMM d, yyyy"),
        actual_earnings: totalEarnings,
        days_credited: daysCredited,
        last_earning_date: lastEarningDate
      };
    })
  );
  return plansWithEarnings;
}

export async function subscribeToPlan({ userId, plan, withdrawal_wallet, total_invested }: {
  userId: string,
  plan: any,
  withdrawal_wallet: number,
  total_invested: number
}) {
  const { data: subscription, error: subscriptionError } = await supabase
    .from('plans_subscriptions')
    .insert({
      user_id: userId,
      plan_id: plan.id,
      amount: plan.investment,
      status: 'approved'
    })
    .select()
    .single();
  if (subscriptionError) throw subscriptionError;

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ 
      withdrawal_wallet: withdrawal_wallet - plan.investment,
      total_invested: (total_invested || 0) + plan.investment 
    })
    .eq('id', userId);
  if (updateError) throw updateError;

  await supabase.rpc('distribute_business_volume', {
    subscription_id: subscription.id,
    user_id: userId,
    amount: plan.investment
  });

  // Fetch earnings for the new subscription
  const { data: earnings, error: earningsError } = await supabase
    .from('transactions')
    .select('amount, created_at')
    .eq('user_id', userId)
    .eq('type', 'investment_return')
    .eq('reference_id', subscription.id)
    .eq('status', 'Completed')
    .order('created_at', { ascending: false });
  if (earningsError) throw earningsError;
  const totalEarnings = earnings?.reduce((sum, tx) => sum + (tx.amount || 0), 0) || 0;
  const lastEarningDate = earnings?.[0]?.created_at;
  const daysCredited = earnings?.length || 0;
  return {
    ...plan,
    subscription_id: subscription.id,
    subscription_date: format(new Date(subscription.created_at), "MMMM d, yyyy"),
    actual_earnings: totalEarnings,
    days_credited: daysCredited,
    last_earning_date: lastEarningDate
  };
}

export async function cancelPlanSubscription({ subscription_id, userId, refundAmount, withdrawal_wallet }: {
  subscription_id: string,
  userId: string,
  refundAmount: number,
  withdrawal_wallet: number
}) {
  const { error: updateError } = await supabase
    .from('plans_subscriptions')
    .update({ status: 'cancelled' })
    .eq('id', subscription_id);
  if (updateError) throw updateError;

  const { error: walletError } = await supabase
    .from('profiles')
    .update({
      withdrawal_wallet: withdrawal_wallet + refundAmount
    })
    .eq('id', userId);
  if (walletError) throw walletError;
}

export async function getTradingPairs() {
  const { data, error } = await supabase
    .from('trading_pairs')
    .select('id, symbol, image_url, type');
  if (error) throw error;
  return data || [];
}

export async function getTotalInvested(userId: string) {
  const { data, error } = await supabase
    .from('plans_subscriptions')
    .select('amount')
    .eq('user_id', userId)
    .eq('status', 'approved');
  if (error) throw error;
  return data?.reduce((sum, sub) => sum + (sub.amount || 0), 0) || 0;
}
