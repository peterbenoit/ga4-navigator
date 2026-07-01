# Issues

## HIGH PRIORITY: Onboarding / OAuth setup is completely opaque to new users

### Problem

A new user (e.g. a coworker connecting a work GA4 property) hits a wall the
first time they try to connect the extension to a GA4 property they don't
already have working access to. The failure shows up as a generic Google
OAuth consent-screen block, with no indication of what's actually wrong or
what to do about it.

The extension already knows how to detect "no properties returned" — but it
has no way to detect "this user has never been through OAuth setup before,"
which is a completely different problem requiring a completely different
message.

Root cause: the extension's OAuth client is in Google Cloud "Testing"
publishing status, which means only emails explicitly added as **Test
users** on the OAuth consent screen can authorize the app. Nothing in the
extension UI communicates this requirement. A new user has no way to know:

- that this restriction exists at all
- that someone (an admin) has to manually add their email before they can
  connect
- which Google account they need to be signed into in Chrome when they try

### Two distinct flows that need to be documented and/or surfaced in-product

**New user flow (before they ever click "Connect"):**

1. Confirm they already have a GA4 account/property. If not, this is a GA4
   setup problem, not an extension problem — stop here and point them to
   GA4, not the extension.
2. Confirm an admin has added their email as a Test user on the OAuth
   consent screen (Google Auth Platform → Audience → Test users). This is
   the invisible step. Nothing in the current UI signals this is a
   prerequisite.
3. Confirm they're signed into the correct Google account in the Chrome
   profile they're using — the one with GA4 access. This may not be their
   default/personal profile.
4. Install the extension.
5. Connect.

**Admin flow (adding a new user's access):**

1. Go to Google Cloud Console → the project owning the extension's OAuth
   client → Google Auth Platform → Audience.
2. Under Test users, click Add users, enter their email.
3. Save.
4. Tell the user they're clear to connect.

### Proposed fixes

- [ ] **First-run checklist screen.** Before any GA4 API call, show a short
      static checklist: "Before you connect: (1) You need a GA4 property
      (2) You need to be added as a test user by an admin (3) You need to
      be signed into the right Google account." Cheap to build, solves
      most of the confusion.
- [ ] **Friendlier OAuth error handling.** Catch the specific Google error
      response that fires when a user isn't an approved test user, and
      show a plain-language message like "Your account isn't approved to
      use this extension yet — ask your admin to add you as a test user"
      instead of surfacing Google's raw consent-screen block.
- [ ] **Admin-facing README/onboarding doc.** Step-by-step Cloud Console
      instructions (see Admin flow above) so this doesn't have to be
      repeated by hand for every new user. Should live in the repo, not
      tribal knowledge.
- [ ] Consider whether the OAuth client should eventually move out of
      Testing mode (Google app verification) to remove this restriction
      entirely, if usage grows beyond a small known group.
