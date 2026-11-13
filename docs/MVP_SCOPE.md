# Pilot scope and pricing

> Current scheduling contract: [13 November rules and test evidence](SCHEDULE_RECOVERY_STATUS.md). Automatic fallback may override availability with warnings; other automatic limits stay mandatory. Roles are labels. This supersedes older qualification/absolute availability wording below.

## Product promise

Managers enter who can work, who cannot work and when, required coverage, and rules. One Generate action should produce a usable week with no routine cleanup in supported feasible pilot scenarios. Manual edits handle real exceptions.

The pilot is for shift-based businesses, not only cafés. Use Business, Workspace, Team, Role, and Shift in product language. A business can name its roles and define shift times; that ordinary setup is included. Industry-specific workflows, integrations, and advanced tailoring are future Premium work.

## In scope

| Area | Pilot behavior |
| --- | --- |
| Account | Email OR phone + password signup/login; no confirmation step; restore session/logout |
| Workspace | One business workspace per pilot account, configurable name and timezone |
| Team | Add/edit employees, active status, eligible roles, target hours and shift preference |
| Availability | Repeating weekly time windows; whole-day and partial-day date exceptions |
| Shift setup | Named shifts, overnight times, staffing counts per date/day and role |
| Work rules | Hard maximum hours/rest rules, role qualification, overlap prevention; explicit optional soft preferences |
| Generate | Constraint-aware search, fairness, locked shifts, adjacent-week context and diagnosed gaps |
| Calendar | Weekly employee grid on desktop, day/agenda presentation on mobile, week navigation and filters |
| Adjust | Create/edit/remove, drag move, replace, two-way swap, lock/unlock, cascading actions, undo |
| Save | Durable tenant-scoped writes, clear states, retry and stale-version protection |
| Publish | Validate and publish a revision; retain last published snapshot while editing a draft |
| Share | One stable team URL with published-week navigation; no employee account required |
| Export | Print-friendly weekly view and save as PDF through browser printing |
| Pilot | Test guidance, feedback log, bug triage and reliable live deployment |

The explicit draft/published revision boundary is a new planning decision: unpublished edits do not leak to employees. After a sickness replacement, the manager uses Publish update to expose the corrected version at the same team URL. This replaces the old implementation's automatic exposure of edits to a published schedule.

## Quick replacement interaction

Dragging an employee onto an occupied shift replaces its assignee while preserving role, date, and time. Dragging an existing shift onto another occupied shift offers an explicit Swap or Replace choice; do not silently guess. Dragging to an empty slot moves the shift to that destination and validates it.

The shift's compact action menu offers Replace > eligible employees and Swap > compatible assignments, plus lock/unlock and removal. Display useful hours/availability context and a reason for ineligible options. A locked shift requires an explicit unlock before reassignment. A swap validates both sides against the whole schedule and commits all-or-nothing. Touch/keyboard users get an equivalent menu, not a drag-only interface.

## Sharing semantics

Use a workspace-level opaque link, not a fresh URL per week. Default to the current published week; if absent, say so and offer other published weeks. Only published snapshots are visible. No contact details, absence reasons, internal notes, credentials, target hours, or history are returned. The owner can revoke/rotate the link deliberately; normal weekly publication keeps it stable. A holder of the link can view its limited calendar, so label it accurately as a private team link.

## Pricing

| Offering | Price | Status |
| --- | --- | --- |
| Invited pilot | Free | Evaluation access, no automatic billing |
| Basic | EUR 15 per business/month | Intended entry plan; core automatic generation belongs here |
| Premium | EUR 25 per business/month | Current intended price; business-specific adaptations later |

Do not downgrade the generator or quick swaps to make Premium attractive. Exact Premium entitlements, employee limits, annual pricing, tax treatment, and commercial launch date are not decided. Do not invent them. No checkout, subscription engine, trial countdown, or payment collection in this pilot. A compact About/Plans panel may show the above figures and "Available after the pilot"; no dedicated marketing site is required.

## Deferred

Manager invitations and multi-owner workflows; employee accounts/self-service requests; payroll/time tracking; multi-location planning; bulk operations beyond a two-way swap; external calendars; realtime collaborative editing; automatic conflict merging; advanced dashboards; billing; industry-specific Premium modules. Phone/email linking and passwordless/OTP/social login are excluded.

Initial UI language is Serbian Latin, retaining the original audience; use business-neutral terms. Default workspace timezone is Europe/Belgrade, stored per workspace. Test timezone changes explicitly; do not reinterpret saved shifts silently. A dark theme and PNG export are not release gates for this light-theme pilot.

## Authentication detail

Offer Email / Phone options and password. Normalize phone numbers to international E.164 format with a country selector; do not infer country solely from local digits. Enable the required Auth providers and disable signup confirmation in the intended pilot environment when setup is authorized. Do not require SMS verification, email-link verification, MFA, or OTP to enter the pilot.

Do not automatically combine separately created email and phone accounts. Passwords belong solely to Supabase Auth. For the no-confirmation pilot, do not expose an unverified self-service account-recovery shortcut; document the pilot support route. Recovery/channel linking for a commercial release is a later explicit decision.
