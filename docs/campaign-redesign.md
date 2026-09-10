# Campaign / character redesign

Branch: `design/campaign-character-redesign`.

## Scope

Campaign-scoped warm charcoal theme; portrait-led party cards; character identity and operational dossier; mobile bottom navigation; retained editing, inventory, spells, notes and role checks. Uploaded portraits take precedence over the Higgsfield fallback. The HP bar now represents current / maximum HP (previously zero HP still filled half the bar).

## Local review

`/campaign/design-preview` shows explicitly illustrative data and uses the production CSS. It is available only in development and returns not-found in production. It makes no campaign writes. The fixture interactions are local; they do not verify authenticated save operations.

The local preview server was started with placeholder Supabase configuration only in its process environment. The user's `.env.local` was not changed. Its Supabase URL must be corrected before testing live campaign access.

## Verification

- TypeScript and production build passed using a syntactically valid placeholder Supabase URL/key. Without that override, the build fails on the existing invalid Supabase URL.
- Browser fixture checked at widths 320, 390, 768, 1024, 1440: no horizontal overflow.
- All five sections, local HP edits at 0%/100%, local notes and options checked; no browser exceptions.
- Desktop and mobile screenshots inspected with standalone Playwright because the integrated browser was unavailable.
- Impeccable's mechanical scan reported the existing width animation on the party health bar; left as the existing health-state transition.

Real authenticated data loading, uploads and persistence still require valid Supabase configuration and a signed-in account. Prior uncommitted Gemini changes are preserved and are not part of this redesign.
