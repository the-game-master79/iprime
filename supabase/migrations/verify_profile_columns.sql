-- Verify required columns exist
do $$ 
begin
    -- Add columns if they don't exist
    if not exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'first_name') then
        alter table profiles add column first_name text;
    end if;

    if not exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'last_name') then
        alter table profiles add column last_name text;
    end if;

    if not exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'phone') then
        alter table profiles add column phone text;
    end if;

    if not exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'address') then
        alter table profiles add column address text;
    end if;

    if not exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'city') then
        alter table profiles add column city text;
    end if;

    if not exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'country') then
        alter table profiles add column country text;
    end if;
end $$;
