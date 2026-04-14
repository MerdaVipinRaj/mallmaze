-- MallMaze v1 RLS policies (starter set)
-- Review carefully before production.

-- profiles: user can read/write their own profile
create policy "profiles_select_own" on public.profiles
for select using (auth.uid() = user_id);

create policy "profiles_upsert_own" on public.profiles
for insert with check (auth.uid() = user_id);

create policy "profiles_update_own" on public.profiles
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- roles: user can read own role
create policy "roles_select_own" on public.user_roles
for select using (auth.uid() = user_id);

-- catalog: public read-only for active products/stores/malls
create policy "malls_public_read" on public.malls
for select using (true);

create policy "stores_public_read" on public.stores
for select using (true);

create policy "products_public_read" on public.products
for select using (is_active = true);

create policy "inventory_public_read" on public.inventory
for select using (true);

-- NOTE: For v1 dashboard work, keep writes restricted. You can later tighten by store ownership.
create policy "malls_admin_write" on public.malls
for insert with check (exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role = 'admin'));

create policy "malls_admin_update" on public.malls
for update using (exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role = 'admin'))
with check (exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role = 'admin'));

create policy "stores_admin_write" on public.stores
for insert with check (exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role = 'admin'));

create policy "stores_admin_update" on public.stores
for update using (exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role = 'admin'))
with check (exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role = 'admin'));

create policy "products_admin_write" on public.products
for insert with check (exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role = 'admin'));

create policy "products_admin_update" on public.products
for update using (exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role = 'admin'))
with check (exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role = 'admin'));

create policy "inventory_admin_update" on public.inventory
for update using (exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role = 'admin'))
with check (exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role = 'admin'));

-- orders: user can read own orders
create policy "orders_select_own" on public.orders
for select using (auth.uid() = user_id);

create policy "order_items_select_own" on public.order_items
for select using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));

create policy "deliveries_select_own" on public.deliveries
for select using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));

-- support tickets: user can create/read own
create policy "support_select_own" on public.support_tickets
for select using (auth.uid() = user_id);

create policy "support_insert_own" on public.support_tickets
for insert with check (auth.uid() = user_id);

-- support tickets: admin can triage/resolve
create policy "support_admin_select" on public.support_tickets
for select using (exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role = 'admin'));

create policy "support_admin_update" on public.support_tickets
for update using (exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role = 'admin'))
with check (exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role = 'admin'));

-- order events: user can read events for own orders
create policy "order_events_select_own" on public.order_events
for select using (
  exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())
);

-- scan sessions: user can read/write own sessions/items
create policy "scan_sessions_select_own" on public.scan_sessions
for select using (auth.uid() = user_id);

create policy "scan_sessions_insert_own" on public.scan_sessions
for insert with check (auth.uid() = user_id);

create policy "scan_sessions_update_own" on public.scan_sessions
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "scan_items_select_own" on public.scan_items
for select using (
  exists (select 1 from public.scan_sessions s where s.id = session_id and s.user_id = auth.uid())
);

create policy "scan_items_insert_own" on public.scan_items
for insert with check (
  exists (select 1 from public.scan_sessions s where s.id = session_id and s.user_id = auth.uid())
);

-- scan receipts: customer reads own receipt; staff/admin can verify
create policy "scan_receipts_select_own" on public.scan_receipts
for select using (auth.uid() = user_id);

create policy "scan_receipts_select_staff" on public.scan_receipts
for select using (
  exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role in ('store_manager','admin'))
);

create policy "scan_receipts_verify_staff" on public.scan_receipts
for update using (
  exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role in ('store_manager','admin'))
)
with check (
  exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role in ('store_manager','admin'))
);

