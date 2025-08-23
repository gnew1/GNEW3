
-- Triggers (only on real Postgres; tests may disable via APPLY_TRIGGERS=false)

-- Ensure period not locked on posting and enforce balance at DB level
create or replace function trg_check_posting()
returns trigger
language plpgsql
as $$
declare
  deb numeric(20,8);
  cred numeric(20,8);
  is_locked boolean;
begin
  if (new.status = 'posted' and old.status <> 'posted') then
    select sum(l.debit), sum(l.credit) into deb, cred
      from gl_entry_lines l where l.entry_id = new.id;
    if deb is null or cred is null or deb <> cred then
      raise exception 'unbalanced_entry';
    end if;
    select locked into is_locked from gl_periods where period_month=new.period_month;
    if coalesce(is_locked,false) then
      raise exception 'period_locked';
    end if;
    new.posted_at := now();
  end if;
  return new;
end $$;

drop trigger if exists t_check_posting on gl_entries;
create trigger t_check_posting
before update on gl_entries
for each row
execute procedure trg_check_posting();

-- Prevent changing lines of posted entries
create or replace function trg_no_mutate_posted()
returns trigger
language plpgsql
as $$
declare
  s text;
begin
  select status into s from gl_entries where id = coalesce(new.entry_id, old.entry_id);
  if s='posted' then
    raise exception 'immutable_posted_entry';
  end if;
  return new;
end $$;

drop trigger if exists t_no_mutate_posted_i on gl_entry_lines;
drop trigger if exists t_no_mutate_posted_u on gl_entry_lines;
drop trigger if exists t_no_mutate_posted_d on gl_entry_lines;
create trigger t_no_mutate_posted_i before insert on gl_entry_lines for each row execute procedure trg_no_mutate_posted();
create trigger t_no_mutate_posted_u before update on gl_entry_lines for each row execute procedure trg_no_mutate_posted();
create trigger t_no_mutate_posted_d before delete on gl_entry_lines for each row execute procedure trg_no_mutate_posted();


