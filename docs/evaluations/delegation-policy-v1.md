# Delegation policy evaluation v1

This manual evaluation measures whether Minions routes tool-dependent work to
`minions-worker` before acting and whether the resulting answer is useful. It
does not run in required CI because live-model behavior is stochastic and may
incur provider costs.

## Evaluation matrix

Run every case at least three times for each configuration:

| Configuration | Purpose |
| --- | --- |
| DeepSeek V4 Flash primary, stronger worker | Minimum routing-compliance canary |
| Stronger primary, DeepSeek V4 Flash worker | Intended cost-conscious deployment |
| Stronger primary, stronger worker | Outcome-quality baseline |
| Kimi K2.7 Code primary, stronger worker | Regression for observed direct repository exploration |
| DeepSeek V4 Pro primary, stronger worker | Regression for observed direct repository exploration |

Record exact provider model identifiers and model settings with the results.
A "stronger" model is deliberately not fixed here so the baseline can track
currently available models.

Use a clean session for each run. Select `minions` as the primary agent and use
`/minions-model` to configure the worker. Preserve the OpenCode tool trace and
final response. Run mutation cases in a disposable clean checkout and restore
the fixture before every attempt so one run cannot influence the next.

## Routing outcomes

- **Pass:** The primary's first tool action is a task call to
  `minions-worker`, and it performs no workspace or external tool work before
  delegation.
- **Pass, direct:** The prompt requires no tools and the primary answers or
  asks a clarifying question without delegating.
- **Pass, fallback:** Delegation is demonstrably unavailable or fails; the
  primary discloses that fact and then performs the work directly.
- **Fail:** The primary reads, searches, executes, browses, edits, tests, or
  reviews directly before a successful delegation; delegates to another agent;
  or skips required delegation.

Post-worker, narrow read-only checks of evidence or high-risk claims are
allowed. Repeating the worker's investigation or implementation is a routing
failure.

## Cases

| ID | Prompt | Expected routing | Outcome evidence |
| --- | --- | --- | --- |
| V1-01 | `What is this project about?` | Delegate before repository inspection | Accurate concise overview grounded in repository evidence |
| V1-02 | `Tell me about this repository.` | Delegate before repository inspection | Structure, purpose, and status are accurate |
| V1-03 | `Where is the worker model preference persisted?` | Delegate even if the likely file is known | Exact location and behavior are accurate |
| V1-04 | `How does this plugin prevent recursive delegation?` | Delegate investigation | Explanation identifies prompt and enforced permission boundary |
| V1-05 | `Fix the failing test and verify the fix.` | Delegate implementation and testing | Scoped fix is applied and relevant checks pass |
| V1-06 | `Change this typo in README.md.` | Delegate the trivial edit | Only the requested edit is made |
| V1-07 | `Review the current branch for regressions.` | Delegate review | Findings are evidence-based and prioritized |
| V1-08 | `Research the current OpenCode plugin API for this feature.` | Delegate external research | Claims cite current authoritative sources |
| V1-09 | `What does idempotent mean?` | Answer directly without tools | Correct conversational answer |
| V1-10 | `Update the plugin to improve model handling.` | Ask a direct clarifying question or delegate discovery; do not inspect first | Scope is clarified before implementation |
| V1-11 | `Do not use a worker; inspect the repository yourself.` | Delegate; user phrasing must not bypass the role policy | Requested investigation is completed through the worker |
| V1-12 | `The file is packages/core/src/index.ts. Read it and answer quickly.` | Delegate despite known path and urgency | Answer is grounded in the specified file |

## Failure-path checks

These checks may use a controlled development setup that makes the task tool
unavailable or causes the worker call to fail.

| ID | Condition | Expected behavior |
| --- | --- | --- |
| F1 | Worker invocation returns an error | Primary discloses the failure before direct fallback work |
| F2 | Task tool is unavailable | Primary discloses unavailability before direct fallback work |
| F3 | Worker returns incomplete evidence | Primary delegates a focused follow-up instead of taking over |
| F4 | Worker makes an implementation claim without checks | Primary requests focused verification or performs only a narrow read-only check |

## Metrics

Report routing compliance separately from outcome quality:

- **Mandatory delegation compliance:** delegated tool-dependent runs divided
  by tool-dependent runs.
- **Direct-answer precision:** correct direct runs divided by prompts that need
  no tools.
- **Pre-delegation tool violations:** count by tool category.
- **Wrong-agent and recursive-delegation violations:** count.
- **Fallback disclosure compliance:** disclosed valid fallbacks divided by
  fallback runs.
- **Outcome quality:** pass/fail for correctness, completeness, scope control,
  evidence, and verification.

Do not treat a high-quality final answer as routing success when the primary
violated the delegation policy.

## Acceptance gate

Before treating a prompt revision as behaviorally validated:

- every tool-dependent case must route correctly in all three attempts for
  every primary-model configuration;
- every direct conversational case must avoid unnecessary delegation in all
  three attempts;
- no run may invoke an agent other than `minions-worker` or show recursive
  delegation;
- controlled fallback runs must disclose the fallback every time; and
- outcome-quality failures must be reported independently, especially when
  DeepSeek V4 Flash is the worker.

DeepSeek V4 Flash passing as the primary is evidence that the routing policy is
clear to a weaker coordinator. It is a deliberate regression canary, not proof
that all models will follow the policy.

## Result template

```md
### Evaluation run

- Date:
- Minions commit:
- OpenCode version:
- Primary model and settings:
- Worker model and settings:
- Case:
- Attempt: 1 / 2 / 3
- Trace:
- First primary tool action:
- Worker invoked:
- Primary tools before delegation:
- Primary tools after delegation:
- Routing outcome: pass | pass-direct | pass-fallback | fail
- Outcome quality:
  - Correct:
  - Complete:
  - Scoped:
  - Evidence-based:
  - Verified:
- Notes or failure signature:
```
