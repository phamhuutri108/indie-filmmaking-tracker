# IFT Data Quality & AI Rollout

## Goal

Improve festival, deadline, and submission-link accuracy without allowing an AI
model or blocked web request to overwrite trusted production data.

## Safety contract

1. AI and web search produce candidates, never authoritative records.
2. Every accepted deadline keeps its type, source URL, evidence, and check time.
3. A blocked page means `blocked` or `unknown`; it never means “no deadline”.
4. Alerts and calendar feeds should eventually include verified deadlines only.
5. Owner-approved values are retained in `data_verifications` and are not
   overwritten by lower-trust automated results.

## Architecture

```text
RSS / official source
        |
        v
deterministic parser and duplicate check
        |
        v
Workers AI classification (Qwen3-30B-A3B-FP8)
        |
        v
data_review_queue (shadow mode)
        |
        +---- owner rejects ----> retained as audit history
        |
        +---- owner approves ---> festivals + data_verifications
```

Direct web fetch is used for link health checks. Cloudflare Browser Run can be
added later as a fallback for JavaScript-rendered pages. It must not be used to
bypass CAPTCHAs, robots rules, authentication, or explicit bot restrictions.

## Rollout stages

### Stage 0 — Data write protection (implemented)

- Deadline web-search results enter `data_review_queue`.
- Early, regular, and late deadlines remain distinct.
- Manual scrape and cron HTTP routes require owner authentication.
- Existing URL checks record `verified`, `broken`, `blocked`, `unsafe`, or
  `unknown` instead of collapsing every failure into empty content.

### Stage 1 — Shadow mode (current default)

`AI_AUTO_PUBLISH=false`

- New RSS candidates are classified by Workers AI.
- No AI candidate is automatically published.
- Owner reviews candidates in Admin > Data Review.
- Audit existing festivals in batches of 10, prioritizing upcoming deadlines.

Run shadow mode until at least 300 labelled examples have accumulated.

### Stage 2 — Measure

Track these metrics by source and model version:

- Festival-call precision: target >= 98%.
- Deadline field exact match: target >= 95%.
- Submission-link validity: target >= 98%.
- Manual-review rate: target <= 20% after tuning.
- False auto-publish count: target 0 during shadow mode.

False positives are more costly than false negatives. A missed candidate can be
reviewed later; a false deadline can cause a filmmaker to miss an opportunity.

### Stage 3 — Limited automatic publishing

Only consider setting `AI_AUTO_PUBLISH=true` after the targets above are met.
Automatic publishing still requires:

- `festival_open_call` classification;
- confidence >= 0.92;
- an explicit evidence excerpt;
- a parsed deadline;
- a valid official or submission URL;
- deterministic validation success.

Keep ambiguous, blocked, conflicting, and source-less candidates in review.

### Stage 4 — Browser fallback

Use Browser Run only when direct fetch identifies a JavaScript-only response.
Cap daily browser time and cache successful renders. A CAPTCHA or bot challenge
must return `blocked` and enter review; do not retry aggressively.

## Cloudflare configuration

The Worker uses the `AI` binding from `wrangler.toml`:

```toml
[ai]
binding = "AI"

[vars]
AI_AUTO_PUBLISH = "false"
```

The deployment schema creates `data_review_queue` and `data_verifications`.
Migration `017_data_quality.sql` contains the same tables for environments that
use Wrangler migrations.

## Operational routine

- Daily: AI classifies only new feed items.
- Weekly: owner reviews pending high-priority candidates.
- Weekly: audit 10–25 existing festivals with upcoming deadlines.
- Monthly: review accuracy metrics and false-positive examples.
- Quarterly: re-check previously verified URLs and deadlines.

## Rollback

Set `AI_AUTO_PUBLISH=false` to stop all automated publishing without disabling
collection or review. Existing review history and verified production records
remain intact.
