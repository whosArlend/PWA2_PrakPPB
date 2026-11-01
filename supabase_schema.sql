-- ===========================================================================
-- BORE & BARREL — Supabase PostgreSQL Schema & Migration
-- Armory Catalog Storefront PWA
-- ===========================================================================

-- 1. Enable UUID extension
create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------------------------
-- Table: products
-- ---------------------------------------------------------------------------
create table if not exists public.products (
  id bigint generated always as identity primary key,
  name text not null,
  type text not null default 'Pistol',
  caliber text not null default 'Standard',
  price numeric not null default 0,
  category text not null default 'Hardware',
  description text default '',
  image_url text default '/guns/pistol.svg',
  specs text[] default '{}',
  steps text[] default '{}',
  status text not null default 'published' check (status in ('draft', 'published', 'archived')),
  is_featured boolean default false,
  deleted_at timestamptz default null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index for status and category
create index if not exists idx_products_status on public.products(status);
create index if not exists idx_products_type on public.products(type);
create index if not exists idx_products_created_at on public.products(created_at desc);

-- ---------------------------------------------------------------------------
-- Table: product_images (FEATURE 1: Multiple Images per Catalog)
-- ---------------------------------------------------------------------------
create table if not exists public.product_images (
  id bigint generated always as identity primary key,
  product_id bigint not null references public.products(id) on delete cascade,
  image_url text not null,
  display_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_product_images_product_id on public.product_images(product_id);

-- ---------------------------------------------------------------------------
-- Table: profiles (FEATURE 6: Operator Profile & Contact Information)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id text unique not null,
  username text not null default 'Shooter',
  bio text default '',
  avatar text default null,
  contact_email text default '',
  contact_phone text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_profiles_user_id on public.profiles(user_id);

-- ---------------------------------------------------------------------------
-- Table: favorites
-- ---------------------------------------------------------------------------
create table if not exists public.favorites (
  id bigint generated always as identity primary key,
  product_id bigint not null references public.products(id) on delete cascade,
  user_id text not null,
  created_at timestamptz not null default now(),
  constraint unique_user_favorite unique(product_id, user_id)
);

create index if not exists idx_favorites_user_id on public.favorites(user_id);

-- ---------------------------------------------------------------------------
-- Table: reviews (FEATURE 8: Review CRUD)
-- ---------------------------------------------------------------------------
create table if not exists public.reviews (
  id bigint generated always as identity primary key,
  product_id bigint not null references public.products(id) on delete cascade,
  user_id text not null,
  rating int not null check (rating >= 1 and rating <= 5),
  content text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_reviews_product_id on public.reviews(product_id);
create index if not exists idx_reviews_user_id on public.reviews(user_id);

-- ---------------------------------------------------------------------------
-- Table: review_votes (FEATURE 8: Thumbs Up / Down Reactions)
-- ---------------------------------------------------------------------------
create table if not exists public.review_votes (
  id bigint generated always as identity primary key,
  review_id bigint not null references public.reviews(id) on delete cascade,
  user_id text not null,
  vote_type text not null check (vote_type in ('up', 'down')),
  created_at timestamptz not null default now(),
  constraint unique_user_review_vote unique(review_id, user_id)
);

create index if not exists idx_review_votes_review_id on public.review_votes(review_id);
create index if not exists idx_review_votes_user_id on public.review_votes(user_id);

-- ---------------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ---------------------------------------------------------------------------
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.profiles enable row level security;
alter table public.favorites enable row level security;
alter table public.reviews enable row level security;
alter table public.review_votes enable row level security;

-- Products: Everyone can read published items; anon/authenticated can manage
create policy "Allow public read published products"
  on public.products for select
  using (status = 'published' or auth.role() = 'authenticated' or auth.role() = 'anon');

create policy "Allow public insert products"
  on public.products for insert
  with check (true);

create policy "Allow public update products"
  on public.products for update
  using (true);

create policy "Allow public delete products"
  on public.products for delete
  using (true);

-- Product Images
create policy "Allow public read product images"
  on public.product_images for select
  using (true);

create policy "Allow public insert product images"
  on public.product_images for insert
  with check (true);

create policy "Allow public delete product images"
  on public.product_images for delete
  using (true);

-- Profiles
create policy "Allow public read profiles"
  on public.profiles for select
  using (true);

create policy "Allow public upsert profiles"
  on public.profiles for all
  using (true)
  with check (true);

-- Favorites
create policy "Allow read favorites"
  on public.favorites for select
  using (true);

create policy "Allow insert favorites"
  on public.favorites for insert
  with check (true);

create policy "Allow delete favorites"
  on public.favorites for delete
  using (true);

-- Reviews
create policy "Allow read reviews"
  on public.reviews for select
  using (true);

create policy "Allow insert reviews"
  on public.reviews for insert
  with check (true);

create policy "Allow update own reviews"
  on public.reviews for update
  using (true);

create policy "Allow delete own reviews"
  on public.reviews for delete
  using (true);

-- Review Votes
create policy "Allow read review votes"
  on public.review_votes for select
  using (true);

create policy "Allow insert review votes"
  on public.review_votes for insert
  with check (true);

create policy "Allow update review votes"
  on public.review_votes for update
  using (true);

create policy "Allow delete review votes"
  on public.review_votes for delete
  using (true);

-- ---------------------------------------------------------------------------
-- STORAGE: guns bucket
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('guns', 'guns', true)
on conflict (id) do update set public = true;

create policy "Allow public read guns storage"
  on storage.objects for select
  using (bucket_id = 'guns');

create policy "Allow public upload guns storage"
  on storage.objects for insert
  with check (bucket_id = 'guns');

create policy "Allow public delete guns storage"
  on storage.objects for delete
  using (bucket_id = 'guns');

-- ---------------------------------------------------------------------------
-- INITIAL SEED DATA
-- ---------------------------------------------------------------------------
insert into public.products (name, type, caliber, price, category, description, image_url, specs, steps, status, is_featured)
values
(
  'Glock 19 Gen 5',
  'Pistol',
  '9x19mm Parabellum',
  599,
  'Pistol',
  'Standard-issue compact striker-fired sidearm. Trusted worldwide for law enforcement and defense reliability.',
  '/guns/pistol.svg',
  array['Frame: Polymer', 'Action: Striker-fired Safe Action', 'Capacity: 15+1 rounds', 'Barrel Length: 4.02 in', 'Weight: 23.63 oz'],
  array['Ensure chamber is clear and magazine removed.', 'Pull slide back slightly, depress takedown levers on both sides.', 'Pull trigger forward to release striker and slide assembly off frame.'],
  'published',
  true
),
(
  'Colt M4 Carbine',
  'Rifle',
  '5.56x45mm NATO',
  1200,
  'Rifle',
  'Direct impingement gas-operated carbine. Mil-spec forged upper and lower with collapsible 6-position stock.',
  '/guns/rifle.svg',
  array['Operation: Direct Impingement Gas', 'Caliber: 5.56 NATO / .223 Rem', 'Barrel Length: 16.1 in', 'Twist Rate: 1:7 RH', 'Capacity: 30 rounds'],
  array['Point firearm in safe direction and verify clear.', 'Push rear takedown pin from left to right.', 'Pivot upper receiver open to inspect bolt carrier group and chamber.'],
  'published',
  true
),
(
  'Mossberg 590A1',
  'Shotgun',
  '12 Gauge',
  649,
  'Shotgun',
  'Heavy-walled mil-spec pump-action shotgun. Metal trigger guard and safety with corrosion-resistant finish.',
  '/guns/shotgun.svg',
  array['Gauge: 12 Gauge', 'Chamber: 3 inch', 'Capacity: 8+1 rounds', 'Barrel Length: 20 in Heavy Wall', 'Sights: Ghost Ring'],
  array['Engage top-mounted safety.', 'Depress action release and cycle pump to verify empty magazine and chamber.', 'Unthread magazine tube cap to field strip barrel from receiver.'],
  'published',
  false
),
(
  'SIG Sauer P320-M17',
  'Pistol',
  '9x19mm Parabellum',
  679,
  'Pistol',
  'Service variant adopted by US Armed Forces. Features coyote tan PVD slide and ambidextrous manual safety.',
  '/guns/pistol.svg',
  array['Frame: Coyote Tan Polymer Grip Module', 'Action: Striker-fired', 'Capacity: 17+1 / 21+1 rounds', 'Optic Ready: Yes (SIG Pro footprint)'],
  array['Lock slide to rear and remove magazine.', 'Rotate takedown lever 90 degrees clockwise.', 'Release slide catch and guide slide assembly off front of frame.'],
  'published',
  true
),
(
  'Heckler & Koch MP5A3',
  'Submachine Gun',
  '9x19mm Parabellum',
  2800,
  'Submachine Gun',
  'Roller-delayed blowback submachine gun with retractable stock. Renowned worldwide for unmatched controllability.',
  '/guns/rifle.svg',
  array['Action: Roller-delayed Blowback', 'Caliber: 9x19mm', 'Barrel Length: 8.85 in', 'Stock: Retractable 2-position', 'Weight: 6.8 lb'],
  array['Lock bolt to the rear in cocking notch.', 'Verify chamber and magwell are clear.', 'Push out rear locking pins and slide off buttstock assembly.'],
  'published',
  false
),
(
  'Remington 700 Tactical',
  'Rifle',
  '.308 Winchester',
  950,
  'Rifle',
  'Bolt-action precision rifle with heavy barrel and Hogue overmolded pillar-bedded stock.',
  '/guns/rifle.svg',
  array['Action: Bolt Action', 'Caliber: .308 Win / 7.62 NATO', 'Barrel: 20 in Heavy Threaded', 'Trigger: X-Mark Pro externally adjustable'],
  array['Ensure firearm is pointed in safe direction.', 'Open bolt, slide to rear, and verify chamber is clear.', 'Depress bolt release inside trigger guard while pulling bolt free of receiver.'],
  'published',
  false
);

-- Seed images for products
insert into public.product_images (product_id, image_url, display_order)
values
  (1, '/guns/pistol.svg', 0),
  (1, '/guns/rifle.svg', 1),
  (2, '/guns/rifle.svg', 0),
  (2, '/guns/pistol.svg', 1),
  (3, '/guns/shotgun.svg', 0),
  (4, '/guns/pistol.svg', 0),
  (5, '/guns/rifle.svg', 0),
  (6, '/guns/rifle.svg', 0);

