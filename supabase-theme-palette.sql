create table theme_palette (
  id bigserial primary key,
  mode text not null check (mode in ('light', 'dark')),
  var_name text not null,
  value text not null,
  updated_at timestamp with time zone default now(),
  unique (mode, var_name)
);

-- Optional: Index for faster lookups
create index idx_theme_palette_mode_var on theme_palette(mode, var_name);

-- Insert initial palette values for light mode
insert into theme_palette (mode, var_name, value) values
  ('light', '--background', '0 0% 100%'),
  ('light', '--foreground', '222.2 47.4% 11.2%'),
  ('light', '--primary', '221.2 83.2% 53.3%'),
  ('light', '--primary-foreground', '210 40% 98%'),
  ('light', '--secondary', '210 40% 96.1%'),
  ('light', '--secondary-foreground', '222.2 47.4% 11.2%'),
  ('light', '--card', '0 0% 100%'),
  ('light', '--muted', '210 40% 96.1%'),
  ('light', '--muted-foreground', '215.4 16.3% 46.9%'),
  ('light', '--border', '214.3 31.8% 91.4%'),
  ('light', '--input', '214.3 31.8% 91.4%'),
  ('light', '--ring', '221.2 83.2% 53.3%'),
  ('light', '--shadow', '0 0% 0% / 0.05'),
  ('light', '--scrollbar-thumb', '210 40% 90%'),
  ('light', '--scrollbar-track', '0 0% 100%'),
  ('light', '--warning', '36 100% 50%'),
  ('light', '--warning-foreground', '222.2 47.4% 11.2%'),
  ('light', '--error', '0 84.2% 60.2%'),
  ('light', '--error-foreground', '210 40% 98%'),
  ('light', '--success', '142.1 70.6% 45.3%'),
  ('light', '--success-foreground', '210 40% 98%');

-- Insert initial palette values for dark mode
insert into theme_palette (mode, var_name, value) values
  ('dark', '--background', '222.2 84% 4.9%'),
  ('dark', '--foreground', '210 40% 98%'),
  ('dark', '--primary', '217.2 91.2% 59.8%'),
  ('dark', '--primary-foreground', '222.2 47.4% 11.2%'),
  ('dark', '--secondary', '217.2 32.6% 17.5%'),
  ('dark', '--secondary-foreground', '210 40% 98%'),
  ('dark', '--card', '222.2 84% 4.9%'),
  ('dark', '--muted', '217.2 32.6% 17.5%'),
  ('dark', '--muted-foreground', '215 20.2% 65.1%'),
  ('dark', '--border', '217.2 32.6% 17.5%'),
  ('dark', '--input', '217.2 32.6% 17.5%'),
  ('dark', '--ring', '224.3 76.3% 48%'),
  ('dark', '--shadow', '0 0% 0% / 0.5'),
  ('dark', '--scrollbar-thumb', '217.2 32.6% 25%'),
  ('dark', '--scrollbar-track', '222.2 84% 4.9%'),
  ('dark', '--warning', '36 100% 50%'),
  ('dark', '--warning-foreground', '210 40% 98%'),
  ('dark', '--error', '0 62.8% 30.6%'),
  ('dark', '--error-foreground', '210 40% 98%'),
  ('dark', '--success', '142.1 70.6% 45.3%'),
  ('dark', '--success-foreground', '210 40% 98%');
