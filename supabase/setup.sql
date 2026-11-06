-- 在用户自己的 Supabase 项目中执行；此文件不含项目凭据。
-- 单行快照和修订号用于后续实现带冲突检测的同步，未配置客户端时不会触发同步。
create table if not exists public.learning_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  revision bigint not null default 0 check (revision >= 0),
  snapshot jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint learning_progress_snapshot_size check (pg_column_size(snapshot) <= 3145728)
);
alter table public.learning_progress enable row level security;
revoke all on table public.learning_progress from anon;
grant select, insert, update on table public.learning_progress to authenticated;
create policy "users read own progress" on public.learning_progress for select to authenticated using ((select auth.uid()) = user_id);
create policy "users insert own progress" on public.learning_progress for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "users update own progress" on public.learning_progress for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
