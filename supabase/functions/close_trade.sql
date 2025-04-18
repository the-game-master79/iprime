create or replace function close_trade(
  p_trade_id uuid,
  p_close_price decimal,
  p_pnl decimal
) returns json
language plpgsql
security definer
as $$
declare
  v_user_id uuid;
  v_withdrawal_wallet decimal;
begin
  -- Get user_id from trade
  select user_id into v_user_id
  from trades
  where id = p_trade_id;

  -- Verify user owns the trade
  if v_user_id != auth.uid() then
    raise exception 'Unauthorized';
  end if;

  -- Update trade
  update trades
  set status = 'closed',
      close_price = p_close_price,
      pnl = p_pnl,
      closed_at = now()
  where id = p_trade_id;

  -- Update user balance
  update profiles
  set withdrawal_wallet = withdrawal_wallet + p_pnl
  where id = v_user_id
  returning withdrawal_wallet into v_withdrawal_wallet;

  return json_build_object(
    'withdrawal_wallet', v_withdrawal_wallet
  );
end;
$$;
