# Pilot guide and feedback

This guide is prepared for the invited pilot. Replace the live URL after deployment. Do not send invitations as part of writing this file.

## Pilot terms

Invited testing is free; there is no automatic conversion or payment collection. Planned commercial prices are Basic EUR 15/business/month and Premium EUR 25/business/month. Premium adaptations and commercial launch timing remain undecided.

Live app: [to be supplied after deployment]
Support/feedback route: reply to the pilot invitation using the template below. The inviter must provide a working reply address before sending invitations. Urgent data-loss or privacy reports should be marked `HITNO` in the reply subject.

## Tester journey

1. Sign up with email OR phone number and a password. No confirmation email/SMS step is required during the pilot. Phone entry needs a country code.
2. Set the business name, timezone, roles, shifts and staffing requirements.
3. Add employees, target hours and shift preferences. Roles are job labels. Generate first follows availability; if needed, it fills using availability deviations with warnings while preserving overlap, rest and hour limits. A manager can still override scheduling rules with a manual change.
4. Enter regular availability, then date-specific whole-day/partial-day unavailability.
5. Select a week and click Generate. Check coverage, hours and any reported problems. A normal feasible week should not need manual cleanup.
6. Mark an employee unavailable for a shift and use Replace or drag to make a change. Verify that the time/date stays the same.
7. Try a two-way swap. Manual changes can override availability, overlap, rest and hour rules, but still preserve the shift date/time and must use employees from the same business.
8. Publish the week and open the team link in a signed-out browser. Confirm that it shows only the published calendar.
9. Change the draft, verify the shared calendar is unchanged, then Publish update and refresh the same link.
10. Reload, sign out/in, and confirm the saved schedule remains. Try mobile viewing and print/PDF.

Employees receive one team link; no employee account is needed. If there is no published schedule for the selected week, the page should say so. Do not share the owner password.

## Feedback template

- Business type and approximate team size:
- Device/browser and viewport:
- Screen/week involved:
- What you were trying to do:
- Steps:
- Expected result:
- Actual result:
- Did you need manual cleanup after Generate? Why?
- Approximate generation time:
- Did reload change the result?
- Screenshot with personal data and private links removed:
- Severity: blocked / wrong result / confusing / cosmetic.

Never request a password, full private team token, or unnecessary employee contact/absence details in feedback.

## Triage order

1. Data loss, cross-business access, invalid assignments, broken login or misleading saved/publication states.
2. Generator misses feasible coverage, unfair distribution, unusable replacements, severe performance.
3. Navigation/accessibility/mobile problems.
4. Visual polish and later-feature requests.

If private data exposure or corrupt saves occur, stop adding testers and resolve the issue before continuing. Record the affected release and recovery action.

## Product measures

Track through pilot feedback/test evidence: time to first generated week, feasible cases completed without edits, manual corrections required, generation time, replacement effort, publish success and shared-view clarity. Do not install analytics or collect personal data merely to fill this table.

## Launch handover

Provide the live URL, tested build, known limitations, account-support route, how to revoke a team link, how to export/print, and what to do when a save fails. Never describe a preview build as production-ready without the release checks.
