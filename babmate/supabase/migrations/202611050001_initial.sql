-- Run once in a fresh Supabase project. All meal writes use transactional RPCs.
begin;
create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 name text not null check (char_length(name) between 1 and 30),
 major text not null default '' check (char_length(major) <= 60),
 year text not null default '' check (char_length(year) <= 20),
 interests text[] not null default '{}' check (cardinality(interests) <= 20),
 created_at timestamptz not null default now()
);
create table public.meals (
 id uuid primary key default gen_random_uuid(),
 host_id uuid not null references public.profiles(id),
 title text not null check (char_length(title) between 1 and 80),
 location text not null check (location in ('학생회관 · 63동','두레미담','감골식당','샤로수길')),
 meeting_point text not null check (char_length(meeting_point) between 1 and 150),
 starts_at timestamptz not null,
 capacity integer not null check (capacity between 2 and 6),
 description text not null default '' check (char_length(description) <= 1000),
 price text not null default '각자 계산' check (char_length(price) <= 40),
 cancelled boolean not null default false,
 created_at timestamptz not null default now()
);
create table public.meal_participants (
 meal_id uuid not null references public.meals(id) on delete cascade,
 user_id uuid not null references public.profiles(id) on delete cascade,
 confirmed_at timestamptz,
 checked_in_at timestamptz,
 joined_at timestamptz not null default now(),
 primary key(meal_id,user_id)
);
create table public.blocks (
 blocker_id uuid not null references public.profiles(id) on delete cascade,
 blocked_id uuid not null references public.profiles(id) on delete cascade,
 created_at timestamptz not null default now(),
 primary key(blocker_id,blocked_id), check(blocker_id <> blocked_id)
);
create table public.messages (
 id uuid primary key default gen_random_uuid(),
 meal_id uuid not null references public.meals(id) on delete cascade,
 user_id uuid not null references public.profiles(id),
 body text not null check (char_length(btrim(body)) between 1 and 2000),
 created_at timestamptz not null default now()
);
create table public.reports (
 id uuid primary key default gen_random_uuid(),
 reporter_id uuid not null references public.profiles(id),
 reported_id uuid not null references public.profiles(id),
 meal_id uuid references public.meals(id),
 reason text not null check (char_length(btrim(reason)) between 5 and 2000),
 created_at timestamptz not null default now(),
 check(reporter_id <> reported_id)
);
create index meals_starts_at_idx on public.meals(starts_at);
create index participant_user_idx on public.meal_participants(user_id);
create index messages_meal_idx on public.messages(meal_id,created_at);

-- Email suffix alone is insufficient: the authentication identity must be confirmed.
create function public.is_verified_snu() returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from auth.users where id = auth.uid() and email ~* '^[^[:space:]@]+@snu[.]ac[.]kr$' and email_confirmed_at is not null);
$$;
create function public.on_snu_signup() returns trigger language plpgsql security definer set search_path = '' as $$
begin
 if new.email is null or new.email !~* '^[^[:space:]@]+@snu[.]ac[.]kr$' then raise exception '서울대학교 이메일만 가입할 수 있어요.'; end if;
 insert into public.profiles(id,name) values(new.id,left(split_part(new.email,'@',1),30));
 return new;
end; $$;
create trigger on_snu_signup after insert on auth.users for each row execute function public.on_snu_signup();
create function public.is_meal_member(p_meal_id uuid) returns boolean language sql stable security definer set search_path = '' as $$
 select public.is_verified_snu() and exists(select 1 from public.meal_participants where meal_id=p_meal_id and user_id=auth.uid());
$$;
create function public.has_block(p_other uuid) returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.blocks where (blocker_id=auth.uid() and blocked_id=p_other) or (blocked_id=auth.uid() and blocker_id=p_other));
$$;

-- Capacity is enforced at the database boundary even for concurrent transactions.
create function public.enforce_capacity() returns trigger language plpgsql security definer set search_path = '' as $$
declare max_seats integer; is_cancelled boolean;
begin
 select capacity,cancelled into max_seats,is_cancelled from public.meals where id=new.meal_id for update;
 if not found or is_cancelled then raise exception '취소되었거나 존재하지 않는 약속이에요.'; end if;
 if (select count(*) from public.meal_participants where meal_id=new.meal_id) >= max_seats then raise exception '자리가 모두 찼어요.'; end if;
 return new;
end; $$;
create trigger enforce_meal_capacity before insert on public.meal_participants for each row execute function public.enforce_capacity();
create function public.enforce_capacity_update() returns trigger language plpgsql security definer set search_path = '' as $$
begin
 if new.capacity < (select count(*) from public.meal_participants where meal_id=new.id) then raise exception '참여한 인원보다 정원을 줄일 수 없어요.'; end if;
 return new;
end; $$;
create trigger enforce_meal_capacity_update before update of capacity on public.meals for each row execute function public.enforce_capacity_update();

alter table public.profiles enable row level security;
alter table public.meals enable row level security;
alter table public.meal_participants enable row level security;
alter table public.messages enable row level security;
alter table public.blocks enable row level security;
alter table public.reports enable row level security;
create policy profiles_read on public.profiles for select to authenticated using(public.is_verified_snu());
create policy profiles_edit on public.profiles for update to authenticated using(id=auth.uid() and public.is_verified_snu()) with check(id=auth.uid() and public.is_verified_snu());
create policy meals_read on public.meals for select to authenticated using(public.is_verified_snu() and not exists(select 1 from public.meal_participants p where p.meal_id=id and public.has_block(p.user_id)));
create policy participants_read on public.meal_participants for select to authenticated using(public.is_verified_snu());
create policy messages_read on public.messages for select to authenticated using(public.is_meal_member(meal_id) and not public.has_block(user_id));
create policy messages_write on public.messages for insert to authenticated with check(user_id=auth.uid() and public.is_meal_member(meal_id) and exists(select 1 from public.meals m where m.id=meal_id and not m.cancelled));
create policy blocks_read on public.blocks for select to authenticated using(blocker_id=auth.uid() and public.is_verified_snu());
create policy blocks_write on public.blocks for insert to authenticated with check(blocker_id=auth.uid() and public.is_verified_snu());
create policy blocks_delete on public.blocks for delete to authenticated using(blocker_id=auth.uid() and public.is_verified_snu());
create policy reports_write on public.reports for insert to authenticated with check(reporter_id=auth.uid() and public.is_verified_snu() and public.is_meal_member(meal_id) and exists(select 1 from public.meal_participants p where p.meal_id=reports.meal_id and p.user_id=reports.reported_id));
-- Reports are intentionally unreadable to client roles. Review via an operator's trusted console.

create function public.get_meals() returns jsonb language sql stable security definer set search_path = '' as $$
 select coalesce(jsonb_agg(row_data order by starts_at),'[]'::jsonb) from (
 select m.starts_at,jsonb_build_object(
 'id',m.id,'hostId',m.host_id,'title',m.title,'location',m.location,'meetingPoint',m.meeting_point,
 'startsAt',m.starts_at,'capacity',m.capacity,'description',m.description,'price',m.price,
 'tag','가볍게 한 끼','image','/images/lunch.jpg',
 'cancelled',m.cancelled,
 'participants',coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'name',p.name,'major',p.major,'year',p.year,'interests',p.interests,'verified',true) order by mp.joined_at) from public.meal_participants mp join public.profiles p on p.id=mp.user_id where mp.meal_id=m.id),'[]'::jsonb),
 'confirmed',coalesce((select jsonb_agg(user_id) from public.meal_participants where meal_id=m.id and confirmed_at is not null),'[]'::jsonb),
 'checkedIn',coalesce((select jsonb_agg(user_id) from public.meal_participants where meal_id=m.id and checked_in_at is not null),'[]'::jsonb)
 ) as row_data from public.meals m where public.is_verified_snu()
 and (m.starts_at > now()-interval '1 hour' or public.is_meal_member(m.id))
 and (public.is_meal_member(m.id) or not exists(select 1 from public.meal_participants mp where mp.meal_id=m.id and public.has_block(mp.user_id)))
 ) x;
$$;

create function public.create_meal(p_details jsonb) returns uuid language plpgsql security definer set search_path = '' as $$
declare meal_id uuid;
begin
 if not public.is_verified_snu() then raise exception '학생 인증이 필요해요.'; end if;
 if (p_details->>'startsAt')::timestamptz <= now() then raise exception '미래의 시간을 골라 주세요.'; end if;
 insert into public.meals(host_id,title,location,meeting_point,starts_at,capacity,description,price)
 values(auth.uid(),btrim(p_details->>'title'),p_details->>'location',btrim(p_details->>'meetingPoint'),(p_details->>'startsAt')::timestamptz,(p_details->>'capacity')::int,coalesce(p_details->>'description',''),coalesce(p_details->>'price','각자 계산')) returning id into meal_id;
 insert into public.meal_participants(meal_id,user_id) values(meal_id,auth.uid());
 return meal_id;
end; $$;
create function public.edit_meal(p_meal_id uuid,p_details jsonb) returns void language plpgsql security definer set search_path = '' as $$
begin
 if not public.is_verified_snu() then raise exception '학생 인증이 필요해요.'; end if;
 perform 1 from public.meals where id=p_meal_id and host_id=auth.uid() and not cancelled for update;
 if not found then raise exception '수정할 수 없는 약속이에요.'; end if;
 if (p_details->>'startsAt')::timestamptz <= now() then raise exception '미래의 시간을 골라 주세요.'; end if;
 update public.meals set title=btrim(p_details->>'title'),location=p_details->>'location',meeting_point=btrim(p_details->>'meetingPoint'),starts_at=(p_details->>'startsAt')::timestamptz,capacity=(p_details->>'capacity')::int,description=coalesce(p_details->>'description',''),price=coalesce(p_details->>'price','각자 계산') where id=p_meal_id;
 -- A changed plan needs a fresh attendance confirmation.
 update public.meal_participants set confirmed_at=null,checked_in_at=null where meal_id=p_meal_id;
end; $$;
create function public.join_meal(p_meal_id uuid) returns void language plpgsql security definer set search_path = '' as $$
begin
 if not public.is_verified_snu() then raise exception '학생 인증이 필요해요.'; end if;
 perform 1 from public.meals where id=p_meal_id and not cancelled and starts_at>now() for update;
 if not found then raise exception '모집이 끝난 약속이에요.'; end if;
 if exists(select 1 from public.meal_participants where meal_id=p_meal_id and user_id=auth.uid()) then return; end if;
 if exists(select 1 from public.meal_participants where meal_id=p_meal_id and public.has_block(user_id)) then raise exception '이 약속에는 참여할 수 없어요.'; end if;
 insert into public.meal_participants(meal_id,user_id) values(p_meal_id,auth.uid());
end; $$;
create function public.leave_meal(p_meal_id uuid) returns void language plpgsql security definer set search_path = '' as $$
declare host uuid;
begin
 if not public.is_verified_snu() then raise exception '학생 인증이 필요해요.'; end if;
 select host_id into host from public.meals where id=p_meal_id for update;
 if host=auth.uid() then raise exception '호스트는 약속 취소를 이용해 주세요.'; end if;
 delete from public.meal_participants where meal_id=p_meal_id and user_id=auth.uid();
end; $$;
create function public.cancel_meal(p_meal_id uuid) returns void language plpgsql security definer set search_path = '' as $$
begin
 if not public.is_verified_snu() then raise exception '학생 인증이 필요해요.'; end if;
 update public.meals set cancelled=true where id=p_meal_id and host_id=auth.uid();
 if not found then raise exception '호스트만 취소할 수 있어요.'; end if;
end; $$;
create function public.confirm_meal(p_meal_id uuid) returns void language plpgsql security definer set search_path = '' as $$
begin
 if not public.is_meal_member(p_meal_id) then raise exception '참가자만 확인할 수 있어요.'; end if;
 perform 1 from public.meals where id=p_meal_id and not cancelled and starts_at between now()-interval '15 minutes' and now()+interval '30 minutes' for update;
 if not found then raise exception '식사 30분 전부터 시작 후 15분까지만 확인할 수 있어요.'; end if;
 update public.meal_participants set confirmed_at=coalesce(confirmed_at,now()) where meal_id=p_meal_id and user_id=auth.uid();
end; $$;
create function public.checkin_meal(p_meal_id uuid) returns void language plpgsql security definer set search_path = '' as $$
begin
 if not public.is_meal_member(p_meal_id) then raise exception '참가자만 체크인할 수 있어요.'; end if;
 perform 1 from public.meals where id=p_meal_id and not cancelled and starts_at between now()-interval '60 minutes' and now()+interval '15 minutes' for update;
 if not found then raise exception '식사 15분 전부터 시작 후 1시간까지만 체크인할 수 있어요.'; end if;
 update public.meal_participants set checked_in_at=coalesce(checked_in_at,now()) where meal_id=p_meal_id and user_id=auth.uid();
end; $$;

-- Explicit least-privilege grants: clients cannot bypass RPC seat locks.
revoke all on public.profiles,public.meals,public.meal_participants,public.messages,public.blocks,public.reports from anon,authenticated;
grant select on public.profiles,public.meals,public.meal_participants,public.messages,public.blocks to authenticated;
grant update(name,major,year,interests) on public.profiles to authenticated;
grant insert(meal_id,user_id,body) on public.messages to authenticated;
grant insert(blocker_id,blocked_id),delete on public.blocks to authenticated;
grant insert(reporter_id,reported_id,meal_id,reason) on public.reports to authenticated;
revoke execute on all functions in schema public from public,anon,authenticated;
grant execute on function public.is_verified_snu(),public.is_meal_member(uuid),public.has_block(uuid) to authenticated;
grant execute on function public.get_meals() to anon,authenticated;
grant execute on function public.create_meal(jsonb),public.edit_meal(uuid,jsonb),public.join_meal(uuid),public.leave_meal(uuid),public.cancel_meal(uuid),public.confirm_meal(uuid),public.checkin_meal(uuid) to authenticated;
alter publication supabase_realtime add table public.messages;
commit;

