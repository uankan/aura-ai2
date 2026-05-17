# Aura AI Security Specification

## 1. Data Invariants
- A `User` document must have a `uid` that matches their `request.auth.uid`.
- A `SavedOutfit` document must have an `ownerId` that matches their `request.auth.uid`.
- Only verified users can write to their profiles or save outfits.
- Users cannot modify their `uid` or `email` after creation.
- `createdAt` and `updatedAt` must be server timestamps.

## 2. The "Dirty Dozen" Payloads (Deny Cases)
1. **Identity Spoofing**: User A attempts to create a profile for User B.
2. **Resource Hijacking**: User A attempts to update User B's saved outfit.
3. **Shadow Field Injection**: User A adds `isAdmin: true` to their user profile.
4. **Massive ID Poisoning**: Attempting to use a 2MB string as a document ID.
5. **Orphaned Write**: Saving an outfit referencing a non-existent user.
6. **Immutable Field Attack**: Attempting to change `ownerId` on an existing outfit.
7. **Type Poisoning**: Sending `fashionScore` as a string instead of a number.
8. **PII Leak**: Unauthenticated user attempting to list all emails in the `users` collection.
9. **Bypass Verification**: User with `email_verified: false` attempting to save an outfit.
10. **State Corruption**: Attempting to set an invalid `fashionAesthetic` (e.g. 'hacker').
11. **Cost Attack**: Attempting to list all saved outfits across all users without a filter.
12. **Future Timestamp**: Sending a client-side timestamp in the future for `updatedAt`.

## 3. Test Runner Blueprint
(Conceptual for rules validation)
- `test('spoof user profile') -> expect(PERMISSION_DENIED)`
- `test('inject ghost field') -> expect(PERMISSION_DENIED)`
- `test('verified state check') -> expect(PERMISSION_DENIED if not verified)`
