# Recruitment Management System

Student-friendly recruitment system using:

- HTML
- CSS
- Vanilla JavaScript
- Supabase
- PostgreSQL
- Visual Studio Code

## Start here

1. Open this folder in VS Code.
2. In `sql/schema.sql`, review the schema and run it in the Supabase SQL Editor.
3. Create a test user in Supabase Authentication.
4. Insert a matching profile row in `public.users` using that Auth user's UUID.
5. Replace `YOUR_SUPABASE_URL` and `YOUR_SUPABASE_ANON_KEY` in `js/config.js`.
6. Run the project with VS Code Live Server (recommended) and open `login.html`.

## Current implementation

- Supabase connection
- Supabase Auth login structure
- Dashboard using real database counts
- Job Posting CRUD
- Search and status filter
- Validation
- Close/Reopen workflow
- Frost UI / Soft Glass design
- Responsive layout
- Future laboratory module placeholders

## Notes

The `users` table intentionally does not store plaintext passwords. Supabase Authentication manages passwords and sessions; `public.users` stores the application role/profile.
