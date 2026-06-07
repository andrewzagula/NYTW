# Walkthru CLI Guide for Agents

Use `walkthru new-commit` when you are about to create a Git commit and have already generated the commit subject and body from the staged diff.

## Command

```bash
walkthru new-commit "<commit description>" \
  --message "<commit subject>" \
  --commit-id "<correlation id>"
```

`<commit description>` is required. Pass the commit body or expanded description you generated from the diff.

`--message` is optional. Use it for the concise commit subject, for example `feat: add commit registration command`.

`--commit-id` is optional. Use it for a caller-provided correlation id when one is available. This does not need to be a Git commit SHA, because the final SHA usually does not exist before the commit is created.

## Agent Workflow

1. Inspect the staged diff and generate the commit subject and body.
2. Run `walkthru new-commit`, passing the body as `<commit description>` and the subject as `--message`.
3. If you have an external correlation id for this commit attempt, pass it as `--commit-id`.
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
  "commitId": "optional correlation id"
}
```

Expected response:

```json
{
  "url": "https://walkthru.dev/..."
}
```

The backend is still placeholder scaffolding. If Walkthru is unavailable or the response does not include a URL, the CLI exits successfully and writes a non-blocking diagnostic so the commit can proceed.
