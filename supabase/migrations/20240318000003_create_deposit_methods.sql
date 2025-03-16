-- Create deposit methods table
create table if not exists public.deposit_methods (
    id uuid default uuid_generate_v4() primary key,
    method text not null check (method in ('bank_transfer', 'crypto', 'upi')),
    crypto_name text,
    crypto_symbol text,
    network text,
    logo_url text,
    qr_code_url text,
    deposit_address text,
    is_active boolean default true,
    min_amount decimal(20,8) default 0,
    created_at timestamp with time zone default timezone('utc'::text, now()),
    updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Enable RLS
alter table public.deposit_methods enable row level security;

-- Create policy to allow anyone to view deposit methods
create policy "Deposit methods are viewable by everyone" 
    on public.deposit_methods
    for select
    using (true);

-- Insert initial data
insert into public.deposit_methods 
    (method, crypto_name, crypto_symbol, network, logo_url, qr_code_url, deposit_address, is_active, min_amount) 
values
    ('crypto', 'Bitcoin', 'BTC', 'BTC', 'https://cryptologos.cc/logos/bitcoin-btc-logo.png', 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh', 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh', true, 0.001),
    ('crypto', 'Ethereum', 'ETH', 'ERC20', 'https://cryptologos.cc/logos/ethereum-eth-logo.png', 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=0x742d35Cc6634C0532925a3b844Bc454e4438f44e', '0x742d35Cc6634C0532925a3b844Bc454e4438f44e', true, 0.01),
    ('crypto', 'BNB', 'BNB', 'BEP20', 'https://cryptologos.cc/logos/bnb-bnb-logo.png', null, null, true, 0.1),
    ('crypto', 'Solana', 'SOL', 'SOL', 'https://cryptologos.cc/logos/solana-sol-logo.png', null, null, true, 1),
    ('crypto', 'XRP', 'XRP', 'ERC20', 'https://cryptologos.cc/logos/xrp-xrp-logo.png', null, null, true, 10),
    ('crypto', 'XRP', 'XRP', 'BEP20', 'https://cryptologos.cc/logos/xrp-xrp-logo.png', null, null, true, 10),
    ('crypto', 'XRP', 'XRP', 'TRC20', 'https://cryptologos.cc/logos/xrp-xrp-logo.png', null, null, true, 10),
    ('bank_transfer', null, null, null, null, null, null, false, 100),
    ('upi', null, null, null, null, null, null, false, 10);

-- Create indexes
create index if not exists idx_deposit_methods_method on deposit_methods(method);
create index if not exists idx_deposit_methods_crypto_symbol on deposit_methods(crypto_symbol);
