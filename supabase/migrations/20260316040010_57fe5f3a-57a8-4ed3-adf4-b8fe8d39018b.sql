create or replace function public.initialize_my_account(
  _name text,
  _email text,
  _phone text,
  _avatar_url text,
  _referred_by_code text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  _uid uuid := auth.uid();
  _safe_name text := coalesce(nullif(trim(_name), ''), 'New User');
  _safe_email text := nullif(trim(_email), '');
  _safe_phone text := nullif(trim(_phone), '');
  _safe_avatar text := nullif(trim(_avatar_url), '');
  _normalized_ref text := nullif(upper(trim(coalesce(_referred_by_code, ''))), '');
  _referral_code text;
  _referrer_user_id uuid;
begin
  if _uid is null then
    raise exception 'Authentication required';
  end if;

  -- Create a unique referral code (retry loop to avoid collisions)
  loop
    _referral_code := upper(regexp_replace(substr(_safe_name, 1, 4), '\s+', '', 'g'))
                      || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 4));
    exit when not exists (
      select 1 from public.profiles p where p.referral_code = _referral_code
    );
  end loop;

  insert into public.profiles (
    user_id,
    email,
    name,
    phone,
    avatar_url,
    bio,
    referral_code,
    referred_by_code
  )
  values (
    _uid,
    _safe_email,
    _safe_name,
    _safe_phone,
    coalesce(_safe_avatar, 'https://api.dicebear.com/7.x/avataaars/svg?seed=' || encode(_safe_name::bytea, 'escape')),
    'JobbaWorks Creator',
    _referral_code,
    _normalized_ref
  )
  on conflict (user_id) do update
    set email = coalesce(excluded.email, profiles.email),
        name = coalesce(nullif(excluded.name, ''), profiles.name),
        phone = coalesce(excluded.phone, profiles.phone),
        avatar_url = coalesce(excluded.avatar_url, profiles.avatar_url),
        referred_by_code = coalesce(profiles.referred_by_code, excluded.referred_by_code),
        updated_at = now();

  insert into public.user_roles (user_id, role)
  values (_uid, 'user'::public.app_role)
  on conflict (user_id, role) do nothing;

  perform public.initialize_my_subscription();
  perform public.initialize_my_wallet();

  if _normalized_ref is not null then
    select p.user_id
      into _referrer_user_id
    from public.profiles p
    where p.referral_code = _normalized_ref
      and p.user_id <> _uid
    limit 1;

    if _referrer_user_id is not null then
      insert into public.referrals (referrer_user_id, referred_user_id, referral_code_used)
      values (_referrer_user_id, _uid, _normalized_ref)
      on conflict (referred_user_id) do nothing;
    end if;
  end if;
end;
$$;

revoke all on function public.initialize_my_account(text, text, text, text, text) from public;
grant execute on function public.initialize_my_account(text, text, text, text, text) to authenticated;