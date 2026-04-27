# Security Specification: One-Tap SOS System

## Data Invariants
1. An incident cannot be created without a valid type and location.
2. Only staff can accept or resolve incidents.
3. Only Managers or Security can escalate a 'Threat'.
4. Automatic escalation can be triggered after 10 minutes by any staff if not resolved.
5. All timestamps must be server-generated (`request.time`).
6. Users cannot modify their own `role` in the `staff` collection.

## Dirty Dozen Payloads (Rejection Expected)
1. **Identity Spoofing**: Guest trying to create an incident with `status: 'resolved'`.
2. **Privilege Escalation**: Staff member trying to change their role to 'Manager'.
3. **Invalid Type**: Incident created with `type: 'Party'`.
4. **ID Poisoning**: Request with a 2KB string as `incidentId`.
5. **Malicious Escalation**: Non-security staff trying to escalate a 'Medical' incident manually.
6. **Time Travel**: Attempting to set `createdAt` to a past date manually.
7. **Phantom Update**: Updating an incident without modifying `updatedAt`.
8. **Resource Exhaustion**: Sending a 1MB string in `guestLocation`.
9. **Orphaned Activity**: Creating an activity log for a non-existent incident.
10. **State Skipping**: Moving from 'reported' to 'resolved' without 'accepted' status (if required, though here we allow direct resolution in some cases).
11. **Shadow Field**: Adding `isDeletable: true` to an incident payload.
12. **Unauthorized Read**: Anonymous guest trying to list all staff members.

## Security Rules Draft Strategy
The rules will use the Master Gate pattern.
`isValidIncident`, `isValidStaff`, `isValidActivity` helper functions.
Action-based updates for status changes.
