
drop policy if exists "Avatar owner read" on storage.objects;
drop policy if exists "Avatar owner write" on storage.objects;
drop policy if exists "Avatar owner update" on storage.objects;
drop policy if exists "Avatar owner delete" on storage.objects;

create policy "Avatar owner read" on storage.objects
  for select to authenticated using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Avatar owner write" on storage.objects
  for insert to authenticated with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Avatar owner update" on storage.objects
  for update to authenticated using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Avatar owner delete" on storage.objects
  for delete to authenticated using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
