# Walkthru CLI Guide for Agents

Use `walkthru new-commit` when you need to manually register a commit or planned commit with Walkthru. Normal repositories should run `walkthru init` so git hooks register commits automatically.

## Product Direction

Today the hooks register commits with the backend and print the quiz URL returned by `POST /new-commit`. Eventually, the CLI should also be able to render and submit the quiz directly in the terminal while still using the backend as the source of truth. Treat the CLI as another frontend for the same quiz workflow, not as a separate grading system.

Structural expectations for that future:

- Keep commit registration separate from quiz presentation.
- Keep backend APIs responsible for creating questions, accepting answers, grading, and storing attempts.
- Add terminal quiz commands as a second UI over backend quiz/session endpoints.
- Preserve the web URL flow as a fallback when the terminal is non-interactive or a richer web experience is preferred.
- Avoid reintroducing local-only question generation or local-only grading in hooks.

## Command

```bash
walkthru new-commit "<commit description>" \
  --message "<commit subject>" \
  --commit-id "<correlation id>"
```

`<commit description>` is required. Pass the commit body or expanded description you generated from the diff.

`--message` is optional. Use it for the concise commit subject, for example `feat: add commit registration command`.

`--commit-id` is optional. Use it for a caller-provided correlation id or final Git commit SHA when one is available.

## Agent Workflow

1. Run `walkthru init` once in a repository to install `post-commit` and `pre-push` hooks.
2. Let the hooks register commits automatically after commit creation and before push.
3. Use `walkthru new-commit` manually only when a hook is unavailable or an external workflow needs to create a Walkthru quiz URL.
4. If the CLI prints a Walkthru URL, display it to the user exactly in this form:

```text
Walkthru available @ <url>
```

## API Scaffold

The command currently posts to the scaffolded backend endpoint:

```text
POST /new-commit
```

Payload:

```json
{
  "commitDescription": "long body from agent",
  "commitMessage": "optional subject",
  "commitId": "optional correlation id or commit SHA"
}
```

Expected response:

```json
{
  "url": "https://walkthru.dev/..."
}
```

The backend is still placeholder scaffolding. If Walkthru is unavailable or the response does not include a URL, the CLI exits successfully and writes a non-blocking diagnostic so the commit can proceed.
