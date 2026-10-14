# Security and known limitations

## Current login and authorization

This is a demo/portfolio project, not a production-ready account system. `AuthContext` sends email/password filters to the `profiles` table, where passwords are stored as plain text. The local session is an editable `trip_planner_user` entry. No Supabase Auth session is created.

The historical custom-auth SQL disables row-level security. The new demo schema mirrors the current client's requirements with anonymous database grants and demo storage policies. Anyone with the browser key can access or change demo data independently of what the UI allows. Admin roles, approval, ownership restrictions, and display-name locks are client-side behavior rather than a server-side security boundary. Login query strings can also expose submitted passwords in network tooling and logs.

Use an isolated backend containing only fictional accounts, throwaway passwords, and public demo media. Never use this flow for real personal information or deploy it as a secure multi-user service.

## Required before production

- Replace custom password lookup with Supabase Auth or a backend authentication service. Remove `profiles.password` and handle migration/reset of existing credentials.
- Validate sessions on the server/database and derive identity from authenticated claims rather than a client-supplied profile ID.
- Enable row-level security and enforce profile, membership, creator, and admin permissions for every table and storage operation.
- Restrict role/approval changes to trusted server-side operations; regular users must not be able to promote themselves.
- Require a verified admin profile in the admin route guard and enforce equivalent backend checks.
- Review storage visibility, file type/size validation, deletion rules, and access to photos and avatars.
- Add validation, abuse controls, and an account recovery flow. Review third-party link handling and dependencies for the intended deployment.

## Repository hygiene

`.gitignore` excludes `.env`, environment variants, `.firebase/`, `.firebaserc`, build/dependency folders, and `out.html` (a captured external-page debug artifact). `.env.example` contains placeholders only. Historical SQL/admin helper account details have been replaced with example values; Firebase configuration now comes from optional environment variables.

A Supabase anonymous key is intended for browser use but only becomes safe for a real app with enforced backend policies. Never publish service-role keys. If original demo credentials were ever published or shared, replace them and review the associated backend before reuse. Ignoring a file does not remove it from existing Git history.

No license has been chosen; no license permissions are implied by this documentation.

## Functional gaps

| Area | Current behavior / limitation |
| --- | --- |
| Expense splitting | Saves payer and participant IDs and displays totals; no balance calculation, settlement, or payment processing |
| Multi-day schema history | Earlier SQL uses `shared_with`, `transport_type`, and `is_packed`; the UI expects `split_with`, `type`, and `is_checked` |
| Historical migration scripts | Some drop profiles, comments, votes, and links; they are not a safe install or upgrade chain |
| Map integrations | Depend on external services; shortened links use a third-party proxy |
| Notifications | Context and panel exist; current pages do not issue automated trip notifications |
| Weather, emergency contacts, groups | Present only in an older schema, with no current UI implementation |
| Membership permissions | UI restrictions cannot secure direct API access |
| Automated validation | No application test suite; lint/build and isolated screenshot rendering were verified |
| Database validation | New demo SQL was reviewed against client queries but not executed against a live Supabase instance |
| Bundle size | Vite warns about a JavaScript chunk larger than 500 kB |
| Dashboard layout | Calendar may overflow at narrower widths; screenshots use a wide desktop viewport |

To report a security issue, use a private channel chosen by the repository owner. No security contact has been configured.
