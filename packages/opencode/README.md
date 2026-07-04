# @minions/opencode

OpenCode adapter for Minions. The current package targets OpenCode v1.

This package is private while the initial plugin behavior is under active development. It is not ready for installation or use.

The adapter currently registers:

- `minions` as a selectable, non-default primary agent
- `minions-worker` as a hidden subagent
- Task permissions that expose only `minions-worker` to the primary
- A task denial that prevents the worker from delegating recursively

Neither role pins a model. OpenCode therefore uses the model selected for the
calling conversation, including when it starts the worker. Foreground and
background execution are owned by OpenCode's task implementation; Minions
does not replace its scheduling behavior.
