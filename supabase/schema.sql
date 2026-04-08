-- Artists
create table artists (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_at timestamptz default now()
);

-- Tours
create table tours (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid references artists(id) on delete cascade,
  name text not null,
  year int not null,
  location text,
  created_at timestamptz default now()
);

-- Songs
create table songs (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid references artists(id) on delete cascade,
  title text not null,
  created_at timestamptz default now(),
  unique(artist_id, title)
);

-- Tour setlists (many-to-many)
create table tour_songs (
  id uuid primary key default gen_random_uuid(),
  tour_id uuid references tours(id) on delete cascade,
  song_id uuid references songs(id) on delete cascade,
  "order" int not null,
  unique(tour_id, song_id)
);

-- User favorites
create table favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  song_id uuid references songs(id) on delete cascade,
  created_at timestamptz default now(),
  unique(user_id, song_id)
);

-- RLS policies
alter table favorites enable row level security;
create policy "Users can manage their own favorites"
  on favorites for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Public read access for tour data
alter table artists enable row level security;
alter table tours enable row level security;
alter table songs enable row level security;
alter table tour_songs enable row level security;

create policy "Public read artists" on artists for select using (true);
create policy "Public read tours" on tours for select using (true);
create policy "Public read songs" on songs for select using (true);
create policy "Public read tour_songs" on tour_songs for select using (true);
