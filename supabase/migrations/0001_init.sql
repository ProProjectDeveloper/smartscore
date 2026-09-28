-- SmartScore initial schema.
--
-- Model: an owner creates an assessment, fills it with questions and options,
-- publishes it, and shares a public link. Respondents submit answers without
-- signing in; scoring happens server-side so the answer key never reaches the
-- browser.

create extension if not exists pgcrypto;

create type assessment_status as enum ('draft', 'published', 'archived');
create type question_kind as enum ('single_choice', 'multi_choice', 'numeric');

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  created_at timestamptz not null default now()
);

-- Keep a profile row in step with auth.users.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- assessments
-- ---------------------------------------------------------------------------

create table public.assessments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (length(trim(title)) > 0),
  description text,
  status assessment_status not null default 'draft',
  -- Percentage a respondent must reach to pass.
  pass_score integer not null default 70 check (pass_score between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index assessments_owner_id_idx on public.assessments (owner_id, created_at desc);

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments (id) on delete cascade,
  prompt text not null check (length(trim(prompt)) > 0),
  kind question_kind not null default 'single_choice',
  points integer not null default 1 check (points > 0),
  position integer not null default 0,
  -- Only used when kind = 'numeric'.
  numeric_answer numeric,
  numeric_tolerance numeric check (numeric_tolerance is null or numeric_tolerance >= 0),
  created_at timestamptz not null default now(),
  constraint numeric_answer_required check (
    kind <> 'numeric' or numeric_answer is not null
  )
);

create index questions_assessment_id_idx on public.questions (assessment_id, position);

create table public.options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions (id) on delete cascade,
  label text not null check (length(trim(label)) > 0),
  is_correct boolean not null default false,
  position integer not null default 0
);

create index options_question_id_idx on public.options (question_id, position);

-- ---------------------------------------------------------------------------
-- submissions
-- ---------------------------------------------------------------------------

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments (id) on delete cascade,
  respondent_name text not null check (length(trim(respondent_name)) > 0),
  respondent_email text,
  total_points numeric not null default 0,
  max_points numeric not null default 0,
  percentage numeric not null default 0,
  passed boolean not null default false,
  submitted_at timestamptz not null default now()
);

create index submissions_assessment_id_idx on public.submissions (assessment_id, submitted_at desc);

create table public.answers (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions (id) on delete cascade,
  question_id uuid not null references public.questions (id) on delete cascade,
  selected_option_ids uuid[] not null default '{}',
  numeric_value numeric,
  awarded_points numeric not null default 0,
  correct boolean not null default false,
  unique (submission_id, question_id)
);

create index answers_submission_id_idx on public.answers (submission_id);

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------

create function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger assessments_touch_updated_at
  before update on public.assessments
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
--
-- Every policy below is owner-scoped: a signed-in user reaches only their own
-- rows. The public assessment-taking flow deliberately gets no anon policy --
-- it runs through the server with the service role key, which lets the server
-- strip `options.is_correct` before the questions reach the browser.
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.assessments enable row level security;
alter table public.questions enable row level security;
alter table public.options enable row level security;
alter table public.submissions enable row level security;
alter table public.answers enable row level security;

create policy "profiles are self-readable"
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

create policy "profiles are self-writable"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "assessments are owner-managed"
  on public.assessments for all
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "questions are owner-managed"
  on public.questions for all
  to authenticated
  using (
    exists (
      select 1 from public.assessments a
      where a.id = questions.assessment_id and a.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.assessments a
      where a.id = questions.assessment_id and a.owner_id = auth.uid()
    )
  );

create policy "options are owner-managed"
  on public.options for all
  to authenticated
  using (
    exists (
      select 1
      from public.questions q
      join public.assessments a on a.id = q.assessment_id
      where q.id = options.question_id and a.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.questions q
      join public.assessments a on a.id = q.assessment_id
      where q.id = options.question_id and a.owner_id = auth.uid()
    )
  );

create policy "submissions are readable by the assessment owner"
  on public.submissions for select
  to authenticated
  using (
    exists (
      select 1 from public.assessments a
      where a.id = submissions.assessment_id and a.owner_id = auth.uid()
    )
  );

create policy "submissions are deletable by the assessment owner"
  on public.submissions for delete
  to authenticated
  using (
    exists (
      select 1 from public.assessments a
      where a.id = submissions.assessment_id and a.owner_id = auth.uid()
    )
  );

create policy "answers are readable by the assessment owner"
  on public.answers for select
  to authenticated
  using (
    exists (
      select 1
      from public.submissions s
      join public.assessments a on a.id = s.assessment_id
      where s.id = answers.submission_id and a.owner_id = auth.uid()
    )
  );
