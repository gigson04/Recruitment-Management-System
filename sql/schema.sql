-- Recruitment Management System
-- Supabase / PostgreSQL schema

create extension if not exists pgcrypto;

-- Supabase Auth owns passwords. This table stores application profile/role data.
create table if not exists public.users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username varchar(100) not null unique,
  role varchar(30) not null default 'Recruiter'
    check (role in ('Administrator','HR Staff','Recruiter','Interviewer')),
  status varchar(20) not null default 'Active'
    check (status in ('Active','Inactive')),
  created_at timestamptz not null default now()
);


create table if not exists public.job_postings (
  job_id uuid primary key default gen_random_uuid(),
  job_code varchar(30) not null unique,
  job_title varchar(150) not null,
  department varchar(100) not null,
  description text not null default '',
  qualifications text not null default '',
  employment_type varchar(30) not null default 'Full-Time'
    check (employment_type in ('Full-Time','Part-Time','Contract','Temporary')),
  posting_date date not null default current_date,
  closing_date date not null,
  vacancies integer not null check (vacancies > 0),
  status varchar(20) not null default 'Open'
    check (status in ('Open','Closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (closing_date >= posting_date)
);

create table if not exists public.applicants (
  applicant_id uuid primary key default gen_random_uuid(),
  applicant_no varchar(30) not null unique,
  first_name varchar(100) not null,
  last_name varchar(100) not null,
  email varchar(255) not null,
  contact_no varchar(50),
  address text,
  education text,
  experience text,
  resume_file text,
  status varchar(20) not null default 'Active'
    check (status in ('Active','Inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.applications (
  application_id uuid primary key default gen_random_uuid(),
  applicant_id uuid not null references public.applicants(applicant_id) on delete restrict,
  job_id uuid not null references public.job_postings(job_id) on delete restrict,
  application_date date not null default current_date,
  cover_letter text,
  status varchar(30) not null default 'Submitted'
    check (status in ('Submitted','Screening','Interview','Hired','Rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (applicant_id, job_id)
);

create table if not exists public.screenings (
  screening_id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(application_id) on delete cascade,
  screening_date date not null default current_date,
  score numeric(5,2) check (score >= 0 and score <= 100),
  result varchar(30) check (result in ('Qualified','Not Qualified')),
  remarks text,
  screened_by uuid references public.users(user_id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.interviews (
  interview_id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(application_id) on delete cascade,
  interview_date date not null,
  interview_time time,
  interviewer varchar(150) not null,
  score numeric(5,2) check (score >= 0 and score <= 100),
  result varchar(20) check (result in ('Passed','Failed')),
  remarks text,
  created_at timestamptz not null default now()
);

create table if not exists public.hiring (
  hiring_id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(application_id) on delete cascade,
  hiring_date date not null default current_date,
  position varchar(150) not null,
  salary_offer numeric(12,2) check (salary_offer >= 0),
  employment_status varchar(50),
  start_date date,
  status varchar(20) not null default 'Hired'
    check (status in ('Hired','Declined')),
  created_at timestamptz not null default now()
);

create index if not exists idx_job_postings_status on public.job_postings(status);
create index if not exists idx_job_postings_title on public.job_postings(job_title);
create index if not exists idx_job_postings_department on public.job_postings(department);
create index if not exists idx_applicants_no on public.applicants(applicant_no);
create index if not exists idx_applicants_email on public.applicants(email);
create index if not exists idx_applications_status on public.applications(status);
create index if not exists idx_applications_job_id on public.applications(job_id);
create index if not exists idx_applications_applicant_id on public.applications(applicant_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_job_postings_updated_at on public.job_postings;
create trigger trg_job_postings_updated_at
before update on public.job_postings
for each row execute function public.set_updated_at();

drop trigger if exists trg_applicants_updated_at on public.applicants;
create trigger trg_applicants_updated_at
before update on public.applicants
for each row execute function public.set_updated_at();

drop trigger if exists trg_applications_updated_at on public.applications;
create trigger trg_applications_updated_at
before update on public.applications
for each row execute function public.set_updated_at();

-- Helper for role checks inside RLS policies.
create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.users where user_id = auth.uid();
$$;

alter table public.job_postings enable row level security;
alter table public.applicants enable row level security;
alter table public.applications enable row level security;
alter table public.screenings enable row level security;
alter table public.interviews enable row level security;
alter table public.hiring enable row level security;
alter table public.users enable row level security;

-- Basic authenticated policies. Tighten further as your later laboratories add module-specific permissions.
drop policy if exists "Authenticated users can read job postings" on public.job_postings;
create policy "Authenticated users can read job postings"
on public.job_postings for select to authenticated using (true);

drop policy if exists "HR roles can manage job postings" on public.job_postings;
create policy "HR roles can manage job postings"
on public.job_postings for all to authenticated
using (public.current_user_role() in ('Administrator','HR Staff','Recruiter'))
with check (public.current_user_role() in ('Administrator','HR Staff','Recruiter'));

drop policy if exists "Authenticated users can read applicants" on public.applicants;
create policy "Authenticated users can read applicants"
on public.applicants for select to authenticated using (true);

drop policy if exists "HR roles can manage applicants" on public.applicants;
create policy "HR roles can manage applicants"
on public.applicants for all to authenticated
using (public.current_user_role() in ('Administrator','HR Staff','Recruiter'))
with check (public.current_user_role() in ('Administrator','HR Staff','Recruiter'));

drop policy if exists "Authenticated users can read applications" on public.applications;
create policy "Authenticated users can read applications"
on public.applications for select to authenticated using (true);

drop policy if exists "HR roles can manage applications" on public.applications;
create policy "HR roles can manage applications"
on public.applications for all to authenticated
using (public.current_user_role() in ('Administrator','HR Staff','Recruiter'))
with check (public.current_user_role() in ('Administrator','HR Staff','Recruiter'));

drop policy if exists "Recruitment roles can read screenings" on public.screenings;
create policy "Recruitment roles can read screenings"
on public.screenings for select to authenticated using (true);

drop policy if exists "Recruitment roles can write screenings" on public.screenings;
create policy "Recruitment roles can write screenings"
on public.screenings for all to authenticated
using (public.current_user_role() in ('Administrator','HR Staff','Recruiter'))
with check (public.current_user_role() in ('Administrator','HR Staff','Recruiter'));

drop policy if exists "Authenticated users can read interviews" on public.interviews;
create policy "Authenticated users can read interviews"
on public.interviews for select to authenticated using (true);

drop policy if exists "Interviewers can manage interviews" on public.interviews;
create policy "Interviewers can manage interviews"
on public.interviews for all to authenticated
using (public.current_user_role() in ('Administrator','HR Staff','Interviewer'))
with check (public.current_user_role() in ('Administrator','HR Staff','Interviewer'));

drop policy if exists "HR roles can read hiring" on public.hiring;
create policy "HR roles can read hiring"
on public.hiring for select to authenticated using (true);

drop policy if exists "HR roles can manage hiring" on public.hiring;
create policy "HR roles can manage hiring"
on public.hiring for all to authenticated
using (public.current_user_role() in ('Administrator','HR Staff'))
with check (public.current_user_role() in ('Administrator','HR Staff'));

drop policy if exists "Users can read their own profile" on public.users;
create policy "Users can read their own profile"
on public.users for select to authenticated using (user_id = auth.uid());

drop policy if exists "Administrators can manage users" on public.users;
create policy "Administrators can manage users"
on public.users for all to authenticated
using (public.current_user_role() = 'Administrator')
with check (public.current_user_role() = 'Administrator');

-- Development seed data. The ON CONFLICT clauses make repeated runs safer.
insert into public.job_postings
(job_code, job_title, department, description, qualifications, employment_type, posting_date, closing_date, vacancies, status)
values
('JOB-001','Software Developer','Information Technology','Develop and maintain software applications.','Bachelor''s degree in IT/CS; programming experience; database knowledge.','Full-Time',current_date,current_date + 28,2,'Open'),
('JOB-002','IT Support Specialist','Information Technology','Provide technical assistance to users and maintain workstations.','ICT/IT background; troubleshooting skills; communication skills.','Full-Time',current_date,current_date + 21,2,'Open'),
('JOB-003','Database Administrator','Information Technology','Maintain database performance, security, backups, and availability.','Database knowledge; SQL skills; analytical and troubleshooting skills.','Full-Time',current_date,current_date + 35,1,'Open'),
('JOB-004','Network Technician','Operations','Install, configure, and troubleshoot network equipment.','Networking fundamentals; hardware knowledge; problem-solving skills.','Contract',current_date,current_date + 14,1,'Open')
on conflict (job_code) do nothing;

insert into public.applicants
(applicant_no, first_name, last_name, email, contact_no, address, education, experience, status)
values
('APP-0001','Juan','Dela Cruz','juan.delacruz@example.com','09171234567','Bayombong, Nueva Vizcaya','BS Information Technology','2 years software development experience','Active'),
('APP-0002','Maria','Santos','maria.santos@example.com','09181234567','Solano, Nueva Vizcaya','BS Computer Science','1 year IT support experience','Active'),
('APP-0003','Daniel','Reyes','daniel.reyes@example.com','09191234567','Bambang, Nueva Vizcaya','BS Information Technology','3 years database experience','Active')
on conflict (applicant_no) do nothing;
