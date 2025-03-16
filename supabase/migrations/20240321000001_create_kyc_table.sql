-- Create KYC table
create table if not exists public.kyc (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references auth.users(id) not null,
    document_front text,
    document_back text,
    status text check (status in ('pending', 'verified', 'rejected')) default 'pending',
    created_at timestamp with time zone default timezone('utc'::text, now()),
    updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Enable RLS
alter table public.kyc enable row level security;

-- Create policies
create policy "Users can view their own KYC"
    on public.kyc for select
    using (auth.uid() = user_id);

create policy "Users can insert their own KYC"
    on public.kyc for insert
    with check (auth.uid() = user_id);

-- Create index
create index idx_kyc_user_id on public.kyc(user_id);
create index idx_kyc_status on public.kyc(status);

-- Create storage bucket for KYC documents
insert into storage.buckets (id, name)
values ('kyc_documents', 'kyc_documents');

-- Set up storage policies
create policy "Users can upload their own KYC documents"
    on storage.objects for insert
    with check (
        bucket_id = 'kyc_documents' and
        auth.uid()::text = (storage.foldername(name))[1]
    );

create policy "Users can view their own KYC documents"
    on storage.objects for select
    using (
        bucket_id = 'kyc_documents' and
        auth.uid()::text = (storage.foldername(name))[1]
    );
