"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { NoteStats } from "@/components/blog/NoteStats";
import { ShareLinks } from "@/components/blog/ShareLinks";

/**
 * "The Anatomy of an Intermittent 500" - interactive essay.
 *
 * Same architecture as CaptionLab and LinkerLab: the markup is a static
 * article, and the lab (a response-path tracer for calc_content_return)
 * is wired imperatively in a single effect. A dataset flag guards against
 * double-wiring under dev Strict Mode.
 */
export function FalconLab() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || root.dataset.init) return;
    root.dataset.init = "1";
    initLab(root);
  }, []);

  return (
    <article className="race-lab falcon-lab" ref={rootRef}>
      <div className="wrap">
        <header className="hero">
          <div className="eyebrow">
            <a href="/blog">field notes</a> &middot; CrowdStrike/falconpy &middot; issue #1508
          </div>
          <h1>The Anatomy of an Intermittent 500</h1>
          <div className="byline">Manny Castillo &middot; Senior SDET &middot; August 2026</div>
          <NoteStats slug="anatomy-of-an-intermittent-500" variant="post" />
          <div className="hero-art">
            <Image
              src="/blog/intermittent-500.png"
              alt="Cutaway engineering plate of a brass manifold. Two inlet pipes carry ordered teal blocks, a third carries unformed oxblood material, and all three merge into one outlet stamped 500. Callouts name the code paths."
              width={1447}
              height={1087}
              priority
            />
          </div>
          <p className="lede">
            An SDK reported a 500 that never came from the API. The message was a Python
            exception, the status code was manufactured, and the response header that
            support needed to research the failure had been thrown away. The real fault was
            one line in the error handler, on the only path that never gets exercised when
            things are going well. Budget ~12 minutes.
          </p>
        </header>

        <div className="aside">
          Keep one question in mind through every section:{" "}
          <i>
            &ldquo;when the code that reports failures fails, what does the caller see, and
            can they tell the difference?&rdquo;
          </i>
        </div>

        <h2 id="s1"><span className="num">1.</span> A 500 with no trace ID</h2>
        <div className="time">~2 min &middot; read</div>
        <p>
          <a href="https://github.com/CrowdStrike/falconpy/issues/1508">falconpy#1508</a> is a
          short, unusually well written report. Calls to{" "}
          <code>UserManagement.grant_user_role_ids()</code> were intermittently returning
          this:
        </p>
        <pre className="fp-code">{`{
  "body": {
    "errors": [
      {"message": "'bytes' object has no attribute 'get'", "code": 500}
    ]
  }
}`}</pre>
        <p>
          That message is a Python <code>AttributeError</code>, not an API response.
          Somewhere inside the SDK, code called <code>.get()</code> on a <code>bytes</code>{" "}
          object, the exception was caught by a broad handler, and the string was packed
          into an error envelope that looks exactly like a real server error.
        </p>
        <p>
          The <code>500</code> is a constant. <code>SDKError._code</code> is 500, and the
          catch-all raises it without passing a code through, so whatever the upstream
          actually answered, the caller is handed a 500. A 502 from a gateway, a 503 from a
          load balancer and a 429 from a rate limiter all arrive as the same
          indistinguishable number.
        </p>
        <p>
          The reporter&rsquo;s real complaint was not the crash. It was that{" "}
          <b>a manufactured response carries no <code>X&#8209;Cs&#8209;TraceId</code></b>, so
          CrowdStrike support had no way to look up what happened upstream. The bug destroyed
          the evidence needed to diagnose it.
        </p>

        <h2 id="s2"><span className="num">2.</span> Read the neighbouring patch first</h2>
        <div className="time">~2 min &middot; read</div>
        <p>
          There was already an open pull request touching response handling. Before writing
          a line, I read it.
        </p>
        <p>
          <a href="https://github.com/CrowdStrike/falconpy/pull/1428">PR #1428</a> fixes a
          different issue and edits the same function I would need to change,{" "}
          <code>calc_content_return()</code>. The tempting conclusion is that someone already
          fixed this. The useful move is to measure. I checked the branch out into a git
          worktree and ran my reproduction against it:
        </p>
        <div className="fp-table-wrap">
          <table className="fp-table">
            <thead>
              <tr><th>Trigger condition</th><th>main @ 1.6.5</th><th>PR #1428</th></tr>
            </thead>
            <tbody>
              <tr><td>502, text/html gateway page</td><td className="bad">AttributeError</td><td className="ok">fixed</td></tr>
              <tr><td>429, text/html rate limit page</td><td className="bad">AttributeError</td><td className="ok">fixed</td></tr>
              <tr><td>503, empty body, no Content-Type</td><td className="bad">AttributeError</td><td className="bad">AttributeError</td></tr>
              <tr><td>500, application/octet-stream</td><td className="bad">AttributeError</td><td className="bad">AttributeError</td></tr>
            </tbody>
          </table>
        </div>
        <p>
          Two of four, and incidentally, as a side effect of adding a content-type branch
          rather than by touching the failing line. The root cause survives that patch
          untouched.
        </p>
        <p>
          That table is worth more than the fix itself. It turns &ldquo;these might
          overlap&rdquo; into a specific, checkable claim, which is the difference between a
          competing patch and a complementary one.
        </p>

        <h2 id="s3"><span className="num">3.</span> One line, two ways to reach it</h2>
        <div className="time">~3 min &middot; read</div>
        <p>
          Every response in FalconPy funnels through one function that turns a{" "}
          <code>requests.Response</code> into the SDK&rsquo;s documented dictionary. At the
          end of it sits an error logging block:
        </p>
        <pre className="fp-code">{`# Catch and log API response errors
try:
    if resp.status_code >= 400:
        _message = None
        _errors = returned.get("body", {}).get("errors", [])`}</pre>
        <p>
          <code>returned</code> is only a dictionary on the JSON and <code>text/plain</code>{" "}
          paths. On the binary path it is raw <code>bytes</code>, either{" "}
          <code>resp.content</code> assigned directly when the body is empty, or via{" "}
          <code>Result.full_return</code>, which returns <code>bytes(self.resources)</code>{" "}
          rather than a dictionary whenever the body is binary.
        </p>
        <p>
          So the trigger is a two part condition, and both parts have to hold at once:{" "}
          <b>status &ge; 400</b>, so the error block runs at all, <i>and</i>{" "}
          <b>a body that is not JSON or text/plain</b>, so <code>returned</code> is bytes when
          it gets there.
        </p>
        <p>
          Note the asymmetry, because it is the whole reason this was hard to chase. The
          trigger is any status at or above 400, but the symptom is always precisely 500. Six
          different upstream failures collapse into one error message, and the one number
          that would have told you which failure you hit is the number that gets overwritten.
        </p>
        <p>
          That intersection is also why it is intermittent. It is not the endpoint
          misbehaving. It is a gateway, load balancer or WAF <i>in front of</i> the API
          answering on its behalf with an HTML page or an empty body, which happens on no
          schedule anyone controls.
        </p>

        <h2 id="s4"><span className="num">4.</span> Trace it yourself</h2>
        <div className="time">~2 min &middot; step the response path</div>
        <p>
          Pick a status code and a response shape. The panel shows which branch of the
          normaliser runs, what type <code>returned</code> holds when it reaches the error
          check, and what the caller finally gets, before and after the patch.
        </p>
      </div>

      <div className="wide">
        <div className="lab">
          <div className="bar">
            Lab &middot; trace the response path <span className="grow"></span>
            <span>calc_content_return()</span>
          </div>
          <div className="stage">
            <div className="fp-controls">
              <div className="fp-ctrl">
                <div className="lk-h" id="fp-lbl-status">HTTP status</div>
                <div className="lk-controls" id="fp-status" role="group" aria-labelledby="fp-lbl-status"></div>
              </div>
              <div className="fp-ctrl">
                <div className="lk-h" id="fp-lbl-scen">Response body</div>
                <div className="fp-scen" id="fp-scen" role="group" aria-labelledby="fp-lbl-scen"></div>
              </div>
            </div>

            <div className="fp-branches" id="fp-branches"></div>

            <div className="fp-check">
              at the error check, <code>returned</code> is{" "}
              <span id="fp-check-val">-</span>
            </div>

            <div className="fp-outs">
              <div className="fp-out">
                <div className="lk-h">
                  FalconPy 1.6.5 <span id="fp-badge-before"></span>
                </div>
                <div className="log" id="fp-before"></div>
                <p className="fp-note" id="fp-note-before"></p>
              </div>
              <div className="fp-out">
                <div className="lk-h">
                  With the patch <span id="fp-badge-after"></span>
                </div>
                <div className="log" id="fp-after"></div>
                <p className="fp-note" id="fp-note-after"></p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="wrap">
        <p>
          Three things are worth poking at. Keep the gateway HTML page selected and cycle
          through 403, 429, 500, 502 and 503. The left column reports 500 every time, while
          the right column preserves what actually happened. That flattening is the
          bug&rsquo;s real cost.
        </p>
        <p>
          Then set the status to 200 with a binary payload. Both columns return raw bytes,
          unchanged. That is the file download contract the SDK documents, and any fix that
          breaks it is worse than the bug. Finally, try text/plain with a non-JSON message.
          Neither column crashes, but neither returns anything useful either. That is issue
          #1154, the one PR #1428 exists to fix.
        </p>

        <h2 id="s5"><span className="num">5.</span> Fixing it where the type actually varies</h2>
        <div className="time">~3 min &middot; read</div>
        <p>
          The obvious patch is to coerce every non-JSON body into an error envelope. That is
          also the patch that breaks RTR file downloads, sensor installers and report
          exports, all of which return bytes on purpose.
        </p>
        <p>
          The safety argument turns out to be positional. The failing line already lives
          inside <code>if resp.status_code &gt;= 400</code>. A successful download returns
          2xx and never enters that block. So the guard goes there, and no operation level
          &ldquo;is this endpoint binary?&rdquo; metadata is needed, which is fortunate,
          because the SDK does not cleanly expose any.
        </p>
        <pre className="fp-code">{`     if resp.status_code >= 400:
+        if not isinstance(returned, dict):
+            # An error was returned as content we could not parse as JSON,
+            # leaving us with a binary payload. Normalize it to the standard
+            # error format so the status code and the response headers - which
+            # carry the trace ID needed to research the failure - are retained
+            # instead of being discarded by an unhandled exception. (Issue #1508)
+            returned = Result()(status_code=resp.status_code,
+                                headers=resp.headers,
+                                body=build_error_body_from_payload(returned, resp.status_code)
+                                )
         _message = None
         _errors = returned.get("body", {}).get("errors", [])`}</pre>
        <p>
          <code>isinstance(value, dict)</code> asks whether a value is of a type, and returns
          a boolean. It is the right question here for a reason worth stating: the existing
          code was already defensive. <code>returned.get(&quot;body&quot;, {})</code> supplies
          a default. But <b>that default protects against a missing key, not a wrong type.</b>{" "}
          The call never happens, because <code>bytes</code> has no <code>.get</code> to call.
          Defensive looking code that defends against the wrong thing.
        </p>
        <p>
          It is also deliberately not a <code>try/except AttributeError</code>. That would
          swallow genuine attribute errors raised by deeper code, recreating in miniature the
          exact catch-all problem that made this bug so hard to find. The type check asks
          precisely the question that matters and leaves every other failure mode free to
          surface.
        </p>

        <h3>Why <code>Result()(...)</code> and not <code>Result(...)</code></h3>
        <p>
          Those look like the same thing, and both of them work. The difference is what comes
          out the other side. The constructor sends the body through{" "}
          <code>_parse_body()</code>, which rebuilds it from parsed components and injects a{" "}
          <code>meta</code> key:
        </p>
        <pre className="fp-code">{`body we built   -> ['errors', 'resources']
Result(...)     -> ['errors', 'meta', 'resources']
Result()(...)   -> ['errors', 'resources']`}</pre>
        <p>
          The call form is a legacy passthrough that assembles the dictionary directly and
          hands back exactly what it was given. That matters for one reason:{" "}
          <code>generate_error_result()</code>, the SDK&rsquo;s own error generator twenty
          lines below, produces precisely that shape. Matching it means an error manufactured
          by this patch is indistinguishable from every other error the SDK generates, and no
          synthetic <code>meta</code> appears where the API never sent one.
        </p>

        <h3>The helper cannot throw</h3>
        <pre className="fp-code">{`if isinstance(payload, bytes):
    message = payload.decode("utf-8", errors="replace").strip()
else:
    message = str(payload).strip()
if not message:
    message = "No content was received for this request."
if len(message) > MAX_ERROR_PAYLOAD_LENGTH:
    message = f"{message[:MAX_ERROR_PAYLOAD_LENGTH]}..."

return {"errors": [{"code": status_code, "message": message}], "resources": []}`}</pre>
        <p>
          <code>errors=&quot;replace&quot;</code> is doing real work. A WAF page is not
          guaranteed to be valid UTF&#8209;8, and a bare <code>.decode()</code> would raise{" "}
          <code>UnicodeDecodeError</code>, putting us right back where we started, throwing an
          exception from inside exception handling. The <code>else</code> branch means any
          type at all is handled, so this function is total: there is no input for which it
          raises.
        </p>
        <p>
          The truncation matters more than it looks. Without a cap, a multi-megabyte HTML
          error page gets embedded whole into an error message that may then be logged,
          serialised and shipped somewhere.
        </p>

        <h2 id="s6"><span className="num">6.</span> Proving it without an API key</h2>
        <div className="time">~2 min &middot; read</div>
        <p>
          FalconPy&rsquo;s test suite talks to the live Falcon API. 143 of its 158 test files
          need credentials, and most fail at <i>collection</i> time without them. My first
          instinct was to go get a trial account. That instinct was wrong, and the repo says
          why. Every unit testing workflow is gated on this:
        </p>
        <pre className="fp-code">{`if: |
  github.event_name == 'push' ||
  (github.event_name == 'pull_request' &&
   github.event.pull_request.head.repo.full_name == github.repository)`}</pre>
        <p>
          That last clause skips pull requests from forks. Every outside contribution is a
          fork PR, so the live test suite <b>will not run on it, no matter whose credentials
          exist where</b>. PR #1428 confirms it: cross repository, zero checks reported.
        </p>
        <p>
          Which reframes the question entirely. The job is not to get credentials. It is to
          write tests a maintainer can run in a second and believe. The bug lives in shared
          plumbing, so it mocks cleanly: 14 tests built on real{" "}
          <code>requests.Response</code> objects rather than mocks, which exercises the actual
          case-insensitive header handling that production hits.
        </p>
        <p>
          Then the check that makes the rest of them mean anything. I removed the guard and
          reran. Eight failures, every one an <code>AttributeError</code> on the same line. A
          test that passes both with and without your fix is testing nothing.
        </p>
        <div className="fp-checks">
          <div className="fp-checkcard"><span className="k">New tests</span><span className="v">14 passed</span><span className="d">no credentials, 0.14s</span></div>
          <div className="fp-checkcard"><span className="k">Guard removed</span><span className="v fault">8 failed</span><span className="d">all AttributeError, same line. Failing here is the point</span></div>
          <div className="fp-checkcard"><span className="k">Added lines covered</span><span className="v">100%</span><span className="d">by the new file alone</span></div>
          <div className="fp-checkcard"><span className="k">flake8 src</span><span className="v">0 issues</span><span className="d">CI configuration</span></div>
          <div className="fp-checkcard"><span className="k">Bandit</span><span className="v">0 issues</span><span className="d">all severities</span></div>
          <div className="fp-checkcard"><span className="k">Diff size</span><span className="v">+187 / -1</span><span className="d">three files</span></div>
        </div>
        <p>And the thing the reporter actually asked for, end to end through the exact call from the issue:</p>
        <pre className="fp-code">{`{'status_code': 502,
 'headers': {'Content-Type': 'text/html',
             'X-Cs-Traceid': 'trace-abc-123'},
 'body': {'errors': [{'code': 502,
                      'message': '<html>...502 Bad Gateway...</html>'}],
          'resources': []}}`}</pre>
        <p>
          A real 502 instead of a fabricated 500, the gateway&rsquo;s own text as the message,
          and the trace ID intact, which was the whole point.
        </p>

        <h2 id="s7"><span className="num">7.</span> What generalises</h2>
        <div className="time">~2 min &middot; read</div>
        <p>
          <b>Read the adjacent patch, then measure it.</b> &ldquo;Might be related&rdquo; is a
          hypothesis. A worktree and a reproduction script turn it into a table, and the table
          is what makes a competing PR non-competing.
        </p>
        <p>
          <b>Error handlers are the least tested code you own.</b> This line only executed when
          something had already gone wrong upstream, so it was never exercised in normal
          operation, and its own failure looked like the upstream failure it was trying to
          report. That class of bug hides indefinitely.
        </p>
        <p>
          <b>Catch-all handlers convert bugs into believable lies.</b>{" "}
          <code>except Exception</code> turned an <code>AttributeError</code> into a well
          formed 500 that looked exactly like the API answering. Users escalated to support,
          support had no trace ID, and the loop closed with nobody able to see the real cause.
        </p>
        <p>
          <b>Verify the negative case.</b> Removing the fix and watching the tests fail takes
          thirty seconds and is the only evidence your tests are attached to your change.
        </p>
        <p>
          <b>Read the CI config before optimising for it.</b> An afternoon of chasing
          credentials would have bought nothing, because the workflow that needed them was
          never going to run. Ten lines of YAML said so.
        </p>
        <ShareLinks slug="anatomy-of-an-intermittent-500" />
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* Lab: response path tracer                                           */
/* ------------------------------------------------------------------ */

interface Scenario {
  id: string;
  name: string;
  ct: string | null;
  preview: string;
  kind: "json" | "html" | "empty" | "binary" | "text";
}

interface Outcome {
  state: "ok" | "bad" | "warn";
  body: string;
  note: string;
}

interface Traced {
  branch: string;
  held: "dict" | "bytes" | null;
  before: Outcome;
  after?: Outcome;
}

const STATUSES = [200, 403, 429, 500, 502, 503];

const SCENARIOS: Scenario[] = [
  { id: "json", name: "Falcon JSON envelope", ct: "application/json", preview: '{"meta":{...},"errors":[...]}', kind: "json" },
  { id: "html", name: "Gateway HTML page", ct: "text/html", preview: "<html>...502 Bad Gateway...</html>", kind: "html" },
  { id: "empty", name: "Empty body", ct: null, preview: "(zero bytes)", kind: "empty" },
  { id: "binary", name: "Binary payload", ct: "application/octet-stream", preview: "\\x50\\x4b\\x03\\x04...", kind: "binary" },
  { id: "text", name: "Plain text message", ct: "text/plain", preview: "Remote response feature is not enabled", kind: "text" },
];

const BRANCHES = [
  { id: "json", cond: 'content_type.startswith("application/json")', yields: "dict" },
  { id: "text", cond: 'content_type.startswith("text/plain")', yields: "dict" },
  { id: "binary", cond: "else  # binary response", yields: "bytes" },
];

function branchFor(ct: string | null): string {
  if (!ct) return "binary";
  if (ct.indexOf("application/json") === 0) return "json";
  if (ct.indexOf("text/plain") === 0) return "text";
  return "binary";
}

/** Mirrors calc_content_return() branch for branch. */
function simulate(status: number, scen: Scenario): Traced {
  const branch = branchFor(scen.ct);

  // Branches that parse JSON raise before ever reaching the error check.
  if ((branch === "json" || branch === "text") && scen.kind !== "json") {
    return {
      branch,
      held: null,
      before: {
        state: "warn",
        body: "NoContentWarning\n\n  json.loads() could not parse\n  the body on this path.",
        note: "This is issue #1154, a separate bug on a separate branch, which PR #1428 exists to fix.",
      },
    };
  }

  const held: "dict" | "bytes" = branch === "binary" ? "bytes" : "dict";

  if (status < 400) {
    const okBody =
      held === "bytes"
        ? "b'" + scen.preview + "'"
        : "{'status_code': " + status + ",\n 'headers': {...},\n 'body': {'resources': [...]}}";
    const okNote =
      held === "bytes"
        ? "The documented file download contract. Both versions return raw bytes, untouched."
        : "A normal parsed response.";
    return { branch, held, before: { state: "ok", body: okBody, note: okNote } };
  }

  if (held === "dict") {
    return {
      branch,
      held,
      before: {
        state: "ok",
        body:
          "{'status_code': " + status + ",\n 'headers': {'X-Cs-Traceid': ...},\n 'body': {'errors': [\n   {'code': " +
          status + ",\n    'message': 'access denied'}]}}",
        note: "The API answered in JSON, so the error block finds a dictionary. This path was never broken.",
      },
    };
  }

  // status >= 400 and returned is bytes: the bug.
  return {
    branch,
    held,
    before: {
      state: "bad",
      body:
        "AttributeError:\n  'bytes' object has no\n  attribute 'get'\n\n  caught by except Exception\n  -> SDKError (code defaults to 500)\n\n  " +
        status + "  ->  500",
      note:
        "The upstream " + status +
        " is overwritten with a 500, and every header goes with it, including the trace ID. Try the other status codes: they all collapse to the same 500.",
    },
    after: {
      state: "ok",
      body:
        "{'status_code': " + status + ",\n 'headers': {'X-Cs-Traceid': ...},\n 'body': {'errors': [\n   {'code': " +
        status + ",\n    'message': '" + scen.preview.slice(0, 22) + "...'}],\n  'resources': []}}",
      note: "Real status code, real headers, and the gateway's own text as the message.",
    },
  };
}

function pill(state: string): string {
  if (state === "ok") return '<span class="fp-pill ok">returns cleanly</span>';
  if (state === "bad") return '<span class="fp-pill bad">crashes</span>';
  return '<span class="fp-pill warn">raises warning</span>';
}

function escapeHtml(s: string): string {
  return s.replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function initLab(root: HTMLElement) {
  const state = { status: 502, scen: SCENARIOS[1] };

  const statusWrap = root.querySelector("#fp-status") as HTMLElement | null;
  const scenWrap = root.querySelector("#fp-scen") as HTMLElement | null;
  const branchWrap = root.querySelector("#fp-branches") as HTMLElement | null;
  const checkVal = root.querySelector("#fp-check-val") as HTMLElement | null;
  const beforeEl = root.querySelector("#fp-before") as HTMLElement | null;
  const afterEl = root.querySelector("#fp-after") as HTMLElement | null;
  const noteBefore = root.querySelector("#fp-note-before") as HTMLElement | null;
  const noteAfter = root.querySelector("#fp-note-after") as HTMLElement | null;
  const badgeBefore = root.querySelector("#fp-badge-before") as HTMLElement | null;
  const badgeAfter = root.querySelector("#fp-badge-after") as HTMLElement | null;

  if (!statusWrap || !scenWrap || !branchWrap || !checkVal) return;

  function render() {
    const r = simulate(state.status, state.scen);

    branchWrap!.innerHTML = BRANCHES.map((b) => {
      const active = b.id === r.branch;
      const cls =
        "fp-branch" + (active ? " active" : "") + (active && b.yields === "bytes" ? " is-bytes" : "");
      return (
        '<div class="' + cls + '">' +
        '<span class="fp-dot"></span>' +
        '<span class="fp-cond">' + escapeHtml(b.cond) + "</span>" +
        '<span class="fp-yield">-&gt; ' + b.yields + "</span>" +
        "</div>"
      );
    }).join("");

    if (r.held === null) {
      checkVal!.innerHTML = '<span class="fp-pill warn">never reached</span>';
    } else if (r.held === "bytes" && state.status >= 400) {
      checkVal!.innerHTML = '<span class="fp-pill bad">bytes</span>';
    } else {
      checkVal!.innerHTML = '<span class="fp-pill ok">' + r.held + "</span>";
    }

    if (beforeEl) beforeEl.textContent = r.before.body;
    if (noteBefore) noteBefore.textContent = r.before.note;
    if (badgeBefore) badgeBefore.innerHTML = pill(r.before.state);

    const after = r.after || r.before;
    if (afterEl) afterEl.textContent = after.body;
    if (noteAfter) noteAfter.textContent = r.after ? after.note : "Unchanged by the patch.";
    if (badgeAfter) badgeAfter.innerHTML = pill(after.state);
  }

  statusWrap.innerHTML = STATUSES.map(
    (s) =>
      '<button class="preset' + (s === state.status ? " primary" : "") +
      '" data-status="' + s + '" aria-pressed="' + (s === state.status) + '">' + s + "</button>",
  ).join("");

  statusWrap.addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement).closest("button[data-status]") as HTMLElement | null;
    if (!btn) return;
    state.status = parseInt(btn.getAttribute("data-status") || "200", 10);
    statusWrap.querySelectorAll("button").forEach((b) => {
      const on = b === btn;
      b.setAttribute("aria-pressed", String(on));
      b.className = "preset" + (on ? " primary" : "");
    });
    render();
  });

  scenWrap.innerHTML = SCENARIOS.map((s) => {
    const ctLabel = s.ct ? s.ct : "no Content-Type header";
    return (
      '<button class="fp-scen-btn" data-scen="' + s.id + '" aria-pressed="' + (s.id === state.scen.id) + '">' +
      '<span class="fp-scen-name">' + s.name + "</span>" +
      '<span class="fp-scen-meta">' + ctLabel + "</span>" +
      "</button>"
    );
  }).join("");

  scenWrap.addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement).closest("button[data-scen]") as HTMLElement | null;
    if (!btn) return;
    const id = btn.getAttribute("data-scen");
    const found = SCENARIOS.find((s) => s.id === id);
    if (found) state.scen = found;
    scenWrap.querySelectorAll("button").forEach((b) => {
      b.setAttribute("aria-pressed", String(b === btn));
    });
    render();
  });

  render();
}
