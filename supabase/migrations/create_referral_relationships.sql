-- First drop existing table if it exists
drop table if exists public.referral_relationships;

-- Create referral relationships table
create table if not exists public.referral_relationships (
    id uuid default uuid_generate_v4() primary key,
    referrer_id uuid not null references public.profiles(id),
    referred_id uuid not null references public.profiles(id),
    level integer default 1,
    status text default 'active',
    created_at timestamp with time zone default timezone('utc'::text, now()),
    updated_at timestamp with time zone default timezone('utc'::text, now()),
    constraint unique_referral unique(referrer_id, referred_id)
);

-- Enable RLS
alter table public.referral_relationships enable row level security;

-- Create policies
create policy "Public referral relationships are viewable by everyone."
  on referral_relationships for select
  using ( true );

create policy "Users can view their own referral relationships."
  on referral_relationships for select
  using ( auth.uid() = referrer_id );

-- Create function to handle new referral relationship
create or replace function public.handle_new_referral()
returns trigger as $$
declare
  referrer_user_id uuid;
begin
  -- Only proceed if there's a referral code
  if new.referred_by is not null then
    -- Find the referrer's ID using the referral code
    select id into referrer_user_id
    from public.profiles
    where referral_code = new.referred_by;
    
    -- If we found a valid referrer, create the relationship
    if referrer_user_id is not null then
      begin
        insert into public.referral_relationships 
          (referrer_id, referred_id, level)
        values 
          (referrer_user_id, new.id, 1);
        
        raise notice 'Created referral relationship: Referrer %, Referred %', referrer_user_id, new.id;
      exception when others then
        raise notice 'Failed to create referral relationship: %', SQLERRM;
      end;
    else
      raise notice 'No referrer found for referral code: %', new.referred_by;
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;

-- Create trigger for new referral relationships
drop trigger if exists on_profile_created on public.profiles;
create trigger on_profile_created
  after insert on public.profiles
  for each row execute procedure public.handle_new_referral();

-- Add indexes for better query performance
create index if not exists idx_referral_relationships_referrer on referral_relationships(referrer_id);
create index if not exists idx_referral_relationships_referred on referral_relationships(referred_id);
