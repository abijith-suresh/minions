# Changesets

Every pull request that changes published Minions behavior must include a changeset:

```sh
npm run changeset
```

While Minions is pre-v1, use only `patch` changesets. Documentation, tests, workflows, and root-only tooling changes do not require a changeset.
