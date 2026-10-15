-- Migration: 0004_session_pin.sql
-- Add 4-digit session security PIN storage to user profiles.
-- The PIN is never stored in plaintext — only a cryptographic salt & PBKDF2/scrypt hash.

alter table public.profiles
  add column if not exists session_pin_hash text null,
  add column if not exists session_pin_set boolean not null default false,
  add column if not exists session_pin_updated_at timestamptz null;

comment on column public.profiles.session_pin_hash is 'Cryptographic hash (PBKDF2-HMAC-SHA256) of the 4-digit daily session PIN';
comment on column public.profiles.session_pin_set is 'True when the user has configured their 4-digit session access PIN';
comment on column public.profiles.session_pin_updated_at is 'Timestamp of the last PIN update or reset';
