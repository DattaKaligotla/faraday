# Changesets

This folder is used by [Changesets](https://github.com/changesets/changesets) to track unreleased changes to published
packages in this repo.

## When to add a changeset

Add a changeset whenever a PR makes a user-visible change to `@faraday-stack/forge` (the only currently published
package). Demo apps and the webapp are private and never get versioned.

## How

```bash
pnpm changeset
```

Pick `patch`, `minor`, or `major`, write a one-line summary aimed at consumers, and commit the generated
`.changeset/*.md` file with your PR.

## What happens after merge

1. The Changesets GitHub Action opens (or updates) a "Version Packages" PR that bumps `package/package.json` and
   rewrites `CHANGELOG.md`.
2. Merging that PR triggers a publish to npm with provenance, and a corresponding GitHub Release.
