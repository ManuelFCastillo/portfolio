"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { NoteStats } from "@/components/blog/NoteStats";
import { ShareLinks } from "@/components/blog/ShareLinks";
import { UpdatedNote } from "@/components/blog/UpdatedNote";

/**
 * "The Anatomy of a Guard That Never Passed" - interactive essay.
 *
 * Same architecture as the other labs: the markup is a static article and
 * the validation simulator is wired imperatively in a single effect. A
 * dataset flag guards against double-wiring under dev Strict Mode.
 */
export function GuardLab() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || root.dataset.init) return;
    root.dataset.init = "1";
    initLab(root);
  }, []);

  return (
    <article className="race-lab guard-lab" ref={rootRef}>
      <div className="wrap">
        <header className="hero">
          <div className="eyebrow">
            <a href="/blog">field notes</a> &middot; falcosecurity/plugins &middot; issue #1505
          </div>
          <h1>The Anatomy of a Guard That Never Passed</h1>
          <div className="byline">Manny Castillo &middot; Senior SDET &middot; September 2026</div>
          <NoteStats slug="anatomy-of-a-guard-that-never-passed" variant="post" />
          <UpdatedNote slug="anatomy-of-a-guard-that-never-passed" />
          <ShareLinks slug="anatomy-of-a-guard-that-never-passed" placement="top" />
          <div className="hero-art">
            <Image
              src="/blog/guard-never-passed.png"
              alt="Cutaway engineering plate of a brass gatehouse mechanism. A teal channel carrying token 712 passes through an open gate to the outlet; an oxblood channel carrying token 891 is stopped by a dropped detent. A comparator arm reads an open ledger listing 706 to 744, with 712 highlighted and 891 absent. A closed book beside the machine is lettered FORK'S OWN LEDGER, NEVER CONSULTED. Numbered callouts name the code paths."
              width={1536}
              height={1024}
              priority
            />
          </div>
          <p className="lede">
            A security fix hardened a workflow against a real attack, and in doing so
            rejected every outside contributor for six months. Nobody noticed, because the
            only people who could see it working were the people it was never checking.
            This one starts with a CI failure on my own pull request that I nearly ignored.
            Budget ~14 minutes.
          </p>
        </header>

        <div className="aside">
          Keep one question in mind through every section:{" "}
          <i>
            &ldquo;this check is asking the right question of the wrong repository. What
            makes an answer trustworthy in the first place?&rdquo;
          </i>
        </div>

        <h2 id="s1"><span className="num">1.</span> A CI failure worth reading</h2>
        <div className="time">~2 min &middot; read</div>
        <p>
          Two failure emails landed for one pull request. The first was a set of container
          tests failing on arm64 and amd64, which were also failing on other people&rsquo;s
          pull requests and were plainly not mine. The second was smaller and stranger:
        </p>
        <pre className="gl-code">{`Artifact PR number 1501 does not match any PR for commit
d04fb7840b5b322af9012de15cb7d241b270111d.
Aborting to prevent artifact poisoning.`}</pre>
        <p>
          That is not a test failing. That is a workflow refusing to run because it believes
          something is being spoofed. Worth thirty seconds before dismissing it.
        </p>
        <p>
          Thirty seconds was all it took to establish the message was wrong.{" "}
          <code>d04fb784</code> <i>was</i> the head of my pull request. It had not been force
          pushed, nothing had been rebased, and the commit was reachable in the repository.
          Every claim the error made about my branch was false.
        </p>
        <p>
          When an error is confidently wrong about something you can verify in one command,
          the interesting question stops being &ldquo;what did I do&rdquo; and becomes{" "}
          <b>&ldquo;what is this code actually looking at?&rdquo;</b>
        </p>

        <h2 id="s2"><span className="num">2.</span> What the workflow is defending</h2>
        <div className="time">~3 min &middot; read</div>
        <p>
          Before the bug, the threat, because the guard exists for an excellent reason and
          the fix has to preserve it.
        </p>
        <p>
          The workflow posts a bot comment on a pull request. Both the comment body and the
          target pull request number arrive as an <b>artifact</b>, a file uploaded by an
          earlier workflow. That earlier workflow builds the contributor&rsquo;s code. On a
          fork pull request, that means it runs code written by someone who is, from the
          repository&rsquo;s point of view, a stranger.
        </p>
        <p>
          So the artifact is attacker controlled. It contains a file called{" "}
          <code>NR</code> holding a number, and the workflow comments on whatever number it
          finds there.
        </p>
        <pre className="gl-code">{`var issue_number = Number(fs.readFileSync('./NR'));
// ... later
await github.rest.issues.createComment({
  owner: context.repo.owner,
  repo: context.repo.repo,
  issue_number: issue_number,
  body: comment_body.toString('utf8')
});`}</pre>
        <p>
          Write <code>42</code> into that file and the repository&rsquo;s own bot posts your
          text on issue 42. Not your pull request. Any thread in the repository, in the
          voice of <code>github-actions[bot]</code>, which people trust more than a stranger.
        </p>
        <p>
          That is comment injection through artifact poisoning, and{" "}
          <a href="https://github.com/falcosecurity/plugins/pull/1226">PR #1226</a> closed it
          in March with a validation step. The idea is exactly right: before commenting,
          confirm that the number in the artifact really is the pull request this run belongs
          to.
        </p>
        <div className="note">
          <span className="lbl">Worth saying plainly</span>
          <p>
            Nothing that follows is a criticism of that fix. The threat is real, the
            reasoning was sound, and the person who wrote it is the same person who confirmed
            my report within hours and pointed me at the better version. The bug is in one
            argument.
          </p>
        </div>

        <h2 id="s3"><span className="num">3.</span> The wrong repository</h2>
        <div className="time">~2 min &middot; read</div>
        <p>Here is the check as it shipped:</p>
        <pre className="gl-code">{`const head_sha = context.payload.workflow_run.head_sha;
const {data: associated_prs} =
  await github.rest.repos.listPullRequestsAssociatedWithCommit({
    owner: context.repo.owner,   // falcosecurity
    repo: context.repo.repo,     // plugins
    commit_sha: head_sha,
  });
const valid_pr_numbers = associated_prs.map(pr => pr.number);
if (!valid_pr_numbers.includes(issue_number)) {
  core.setFailed(\`Artifact PR number \${issue_number} does not match ...\`);
  return;
}`}</pre>
        <p>
          In English: take the commit this run was for, ask{" "}
          <code>falcosecurity/plugins</code> which of its pull requests contain that commit,
          and require the artifact&rsquo;s number to be one of them.
        </p>
        <p>
          For a pull request from a fork, that commit lives in the{" "}
          <b>contributor&rsquo;s repository</b>. Asking the base repository about it returns
          an empty list. And a number is never a member of an empty list.
        </p>
        <div className="gl-table-wrap">
          <table className="gl-table">
            <thead>
              <tr><th>Lookup</th><th>Returns</th></tr>
            </thead>
            <tbody>
              <tr><td>GET /repos/falcosecurity/plugins/commits/d04fb784.../pulls</td><td className="bad">[]</td></tr>
              <tr><td>GET /repos/ManuelFCastillo/plugins/commits/d04fb784.../pulls</td><td className="ok">[#1501]</td></tr>
            </tbody>
          </table>
        </div>
        <p>
          Same commit, same endpoint, two repositories, opposite answers. The guard could
          never pass for a fork pull request. Not sometimes. Not under load. Never, by
          construction, since 2 March 2026.
        </p>
        <p>
          <b>Why six months of silence.</b> Maintainers push branches directly to the
          repository, so <code>context.repo</code> is the right repository for them and the
          check works perfectly. The only people who could observe the failure were outside
          contributors, who tend to assume a red mark on someone else&rsquo;s CI is their own
          fault and say nothing. The bug was invisible to everyone with the power to fix it
          and unmentionable by everyone who could see it.
        </p>

        <h2 id="s4"><span className="num">4.</span> Trace it yourself</h2>
        <div className="time">~2 min &middot; run the validation</div>
        <p>
          Choose where the pull request comes from, whether the artifact is honest or
          poisoned, and which version of the guard is running. The panel shows which lookup
          executes, what it returns, and whether the comment gets posted.
        </p>
        <p>
          The row worth finding is the last one: a poisoned artifact against the fixed guard.
          A fix that unbreaks contributors by letting attacks through is not a fix.
        </p>
      </div>

      <div className="wide">
        <div className="lab">
          <div className="bar">
            Lab &middot; run the artifact validation <span className="grow"></span>
            <span>create-comment.yaml</span>
          </div>
          <div className="stage">
            <div className="gl-controls">
              <div className="gl-ctrl">
                <div className="lk-h" id="gl-lbl-src">Pull request origin</div>
                <div className="lk-controls" id="gl-src" role="group" aria-labelledby="gl-lbl-src"></div>
              </div>
              <div className="gl-ctrl">
                <div className="lk-h" id="gl-lbl-art">Artifact NR file</div>
                <div className="lk-controls" id="gl-art" role="group" aria-labelledby="gl-lbl-art"></div>
              </div>
              <div className="gl-ctrl">
                <div className="lk-h" id="gl-lbl-ver">Guard version</div>
                <div className="lk-controls" id="gl-ver" role="group" aria-labelledby="gl-lbl-ver"></div>
              </div>
            </div>

            <div className="gl-steps" id="gl-steps"></div>

            <div className="gl-verdict" id="gl-verdict"></div>
            <div className="log" id="gl-log"></div>
          </div>
        </div>
      </div>

      <div className="wrap">
        <p>
          Four things fall out of playing with it. The old guard is correct exactly once, on
          a same-repo pull request, and that is the only case its authors could ever see. It
          blocks the attack, but it also blocks everything else. The new guard blocks the
          attack and passes honest fork contributions. And the reason it can do both is not
          that it checks more carefully. It is that it asks a different question.
        </p>

        <h2 id="s5"><span className="num">5.</span> The fix I proposed, and why it was refused</h2>
        <div className="time">~3 min &middot; read</div>
        <p>
          My report suggested the obvious repair. The lookup fails because it asks the wrong
          repository, so ask the right one:
        </p>
        <pre className="gl-code">{`owner: context.payload.workflow_run.head_repository.owner.login,
repo: context.payload.workflow_run.head_repository.name,`}</pre>
        <p>
          Query the fork instead of the base. It works. I checked it against three real pull
          requests before writing the issue.
        </p>
        <p>
          The maintainer confirmed the diagnosis, then declined the fix, and his reason is
          the most useful thing I took from the whole exercise:
        </p>
        <div className="note">
          <span className="lbl">leogr, on the issue</span>
          <p>
            &ldquo;That endpoint returns PRs whose base is another repo, so AFAIK its results
            are not scoped to the queried repo. That means the returned numbers are not
            guaranteed to be our PR numbers, and we would need to also check{" "}
            <code>base.repo</code> and <code>head.sha</code> for each result to keep the
            property #1226 was protecting.&rdquo;
          </p>
        </div>
        <p>
          He is right, and I had half seen it myself. My own issue text proposed those extra
          checks as belt and braces. What I had not noticed is what needing them means.
        </p>
        <p>
          <b>If a lookup can return an answer you have to filter, the lookup is wrong.</b>{" "}
          Every filter is a rule someone can forget, misread, or delete during a refactor two
          years from now, and if they do, the check silently stops checking. The version that
          needs no filter cannot decay that way.
        </p>

        <h3>The version they already had</h3>
        <p>
          They had also solved this before. <code>falcosecurity/libs</code> hit the identical
          bug a week after #1226 and fixed it there. Nobody propagated it to{" "}
          <code>plugins</code> or <code>rules</code>. The fix never leaves the base repository:
        </p>
        <pre className="gl-code">{`const run_prs = context.payload.workflow_run.pull_requests;
let valid_pr_numbers = run_prs.map(pr => pr.number);

if (valid_pr_numbers.length === 0) {
  // Fork PR: search using the head repo owner and branch from the
  // workflow_run payload (these fields are set by GitHub, not the fork).
  const head_owner = context.payload.workflow_run.head_repository.owner.login;
  const head_branch = context.payload.workflow_run.head_branch;
  const {data: matching_prs} = await github.rest.pulls.list({
    owner: context.repo.owner,
    repo: context.repo.repo,
    state: 'all',
    head: \`\${head_owner}:\${head_branch}\`,
    per_page: 10,
  });
  valid_pr_numbers = matching_prs.map(pr => pr.number);
}`}</pre>
        <p>
          Two paths. Same-repo pull requests get their numbers from{" "}
          <code>workflow_run.pull_requests</code>, which GitHub populates and which needs no
          API call at all. Fork pull requests, where that array is always empty, fall through
          to a different question asked of the base repository:{" "}
          <i>list your own pull requests whose source branch is{" "}
          <code>ManuelFCastillo:fix/container-linux-resolv</code></i>.
        </p>
        <p>
          The base repository knows about its own pull requests no matter where the branch
          physically lives. That is the insight my version missed.
        </p>

        <h3>Two properties, not one</h3>
        <p>
          It is worth separating what makes this safe, because the two halves fail
          differently.
        </p>
        <p>
          <b>The inputs cannot be forged.</b> <code>head_repository.owner.login</code> and{" "}
          <code>head_branch</code> come from the <code>workflow_run</code> payload, which
          GitHub fills in. The fork&rsquo;s code never touches them. Compare that with the
          artifact, which the fork writes freely, and the distinction the whole workflow
          turns on becomes visible: some things in a CI run are stated by the platform and
          some are stated by the code being tested, and only one of those is evidence.
        </p>
        <p>
          <b>The outputs are scoped by construction.</b> <code>pulls.list</code> is called on
          the base repository, so every number it can possibly return is a pull request of
          that repository. There is no filtering step because there is nothing to filter.
        </p>
        <p>
          Mine was safe after checking. Theirs is safe before checking. Those are not the
          same kind of safe, and the difference is entirely in which question gets asked.
        </p>

        <h2 id="s6"><span className="num">6.</span> Shipping it</h2>
        <div className="time">~1 min &middot; read</div>
        <p>
          Three artifacts came out of a CI failure I nearly deleted:{" "}
          <a href="https://github.com/falcosecurity/plugins/issues/1505">plugins#1505</a> for
          the report,{" "}
          <a href="https://github.com/falcosecurity/plugins/pull/1509">plugins#1509</a> and{" "}
          <a href="https://github.com/falcosecurity/rules/pull/383">rules#383</a> for the fix,
          porting the libs logic byte for byte so the three repositories stop drifting.
        </p>
        <p>
          There is a pleasing loop in it. The workflow that #1509 repairs is the same one that
          was failing on my other open pull request. Merging the fix makes my own contribution
          stop erroring, which is a strange and satisfying way to unblock yourself.
        </p>
        <p>
          The diff is 23 lines added and 8 removed, in one file, twice. Most of the work was
          reading.
        </p>

        <h2 id="s7"><span className="num">7.</span> What generalises</h2>
        <div className="time">~2 min &middot; read</div>
        <p>
          <b>Read the CI failure that is not about your code.</b> The container test failures
          on that pull request genuinely were not mine and genuinely were not interesting. The
          other one was eleven words about artifact poisoning, and it was a six month old
          regression affecting every outside contributor. The cost of checking was one API
          call.
        </p>
        <p>
          <b>An error confidently wrong about a verifiable fact is a gift.</b> It told me the
          commit did not belong to the pull request. One command proved otherwise. At that
          point the bug is not in your branch, it is in the thing doing the looking, and you
          have already narrowed it to a single question: what is that code actually reading?
        </p>
        <p>
          <b>Hardening changes need to be tested from outside the walls.</b> This one was
          correct for everybody who could run it and broken for everybody who could not.
          Whenever a change touches permissions, provenance, or trust boundaries, the group
          that can no longer do something is precisely the group least able to report it.
        </p>
        <p>
          <b>If you have to filter the answer, you asked the wrong question.</b> The
          maintainer&rsquo;s objection generalises well past GitHub Actions. A lookup whose
          results must be post-filtered for safety is one refactor away from being unsafe. A
          lookup that cannot return the wrong thing stays correct without anyone maintaining
          it.
        </p>
        <p>
          <b>Check whether the project already solved it.</b> The fix existed in a sibling
          repository for six months. Proposing something novel when a proven version is
          sitting one repository over creates review work for no gain. Ask before inventing.
        </p>

        <h3>A postscript that proved the point</h3>
        <p>
          Question 4 below asks what it means that three repositories carry byte-identical workflow
          logic, and answers: it was copied, not shared, so a fix in one is invisible to the others.
          That was a claim about shape when I wrote it. Days later it produced a second example on
          its own.
        </p>
        <p>
          Watching the pull request land, I noticed the same file fails a different way. The{" "}
          <code>Download artifact</code> step filters run artifacts for one named <code>pr</code> and
          takes <code>[0]</code> without checking anything came back:
        </p>
        <div className="log">{`TypeError: Cannot read properties of undefined (reading 'id')`}</div>
        <p>
          Twelve of the last twenty runs of that workflow had failed on it, all on{" "}
          <code>main</code>. libs guards it, with an early exit when the filter returns nothing.
          Plugins never got that either.
        </p>
        <p>
          So the file had drifted in at least three places, and fixing the one I came for did not
          fix the others, because nothing connects them. That is the difference between a bug and a
          shape: a bug you fix once. A shape keeps producing bugs until someone changes the shape,
          which here means a reusable workflow rather than three copies. I raised it on the pull
          request rather than quietly widening a change a maintainer had already reviewed.
        </p>

        <h2 id="s8"><span className="num">8.</span> Check yourself</h2>
        <div className="time">~1 min &middot; answer before revealing</div>
        <details>
          <summary>1 &middot; The guard was added in March and nobody reported it until September. What property of the bug explains the delay better than &ldquo;nobody was paying attention&rdquo;?</summary>
          <div className="a">
            The population that could observe the failure and the population that could fix
            it did not overlap. Maintainers push branches to the repository itself, where the
            check works, so they never saw it fail. Outside contributors saw nothing but a red
            mark on a workflow they did not understand, on a repository where they had no
            standing, and reasonably assumed it was their own doing.
          </div>
        </details>
        <details>
          <summary>2 &middot; Why is reading <code>NR</code> from an artifact dangerous when reading <code>head_branch</code> from the workflow_run payload is not?</summary>
          <div className="a">
            Provenance. The artifact is produced by a job that executes the contributor&rsquo;s
            code, so its contents are whatever that code chose to write. The workflow_run
            payload is assembled by GitHub from facts about the event itself. Both arrive as
            data in the same job, and only one of them is a claim the platform is making.
          </div>
        </details>
        <details>
          <summary>3 &middot; My fix and the accepted fix both reject a poisoned artifact. On what grounds is one better?</summary>
          <div className="a">
            Mine queried an endpoint whose results are not scoped to any repository, so the
            numbers it returned had to be filtered by base repo and head SHA before they could
            be trusted. The accepted fix queries the base repository directly, so every result
            is a pull request of that repository by construction. Equally safe today; the
            difference is that one of them stays safe when somebody edits it without
            understanding why the filter was there.
          </div>
        </details>
        <details>
          <summary>4 &middot; The same broken workflow exists in three repositories. Two are now fixed. What does that suggest about the shape of the underlying problem?</summary>
          <div className="a">
            It was copied, not shared. Three repositories carrying byte-identical workflow
            logic means a fix in one is invisible to the others, and the libs repair sat
            unpropagated for six months. The durable fix is a reusable workflow, which is a
            larger change than a bug report should try to smuggle in, but worth naming.
          </div>
        </details>

        <footer>
          Reported in{" "}
          <a href="https://github.com/falcosecurity/plugins/issues/1505">falcosecurity/plugins#1505</a>,
          fixed in{" "}
          <a href="https://github.com/falcosecurity/plugins/pull/1509">plugins#1509</a> and{" "}
          <a href="https://github.com/falcosecurity/rules/pull/383">rules#383</a>, porting{" "}
          <a href="https://github.com/falcosecurity/libs/commit/0501075c1fa79f23fb89dbf88140fbae8116a03e">falcosecurity/libs@0501075</a>.
          Found while waiting on{" "}
          <a href="https://github.com/falcosecurity/plugins/pull/1501">plugins#1501</a>, which
          the same workflow was failing.
        </footer>

        <ShareLinks slug="anatomy-of-a-guard-that-never-passed" />
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* Lab: artifact validation simulator                                  */
/* ------------------------------------------------------------------ */

interface Step {
  label: string;
  detail: string;
  state: "run" | "skip" | "fail" | "pass";
}

interface Outcome {
  steps: Step[];
  passed: boolean;
  verdict: string;
  log: string;
}

const SRC = [
  { id: "same", label: "same repo" },
  { id: "fork", label: "fork" },
];
const ART = [
  { id: "honest", label: "honest (1501)" },
  { id: "poison", label: "poisoned (42)" },
];
const VER = [
  { id: "old", label: "as shipped" },
  { id: "new", label: "with the fix" },
];

/** Mirrors the two guard implementations step for step. */
function simulate(src: string, art: string, ver: string): Outcome {
  const nr = art === "honest" ? 1501 : 42;
  const steps: Step[] = [];

  let valid: number[] = [];

  if (ver === "old") {
    // Single path: ask the base repo which PRs contain the head commit.
    const found = src === "same" ? [1501] : [];
    valid = found;
    steps.push({
      label: "listPullRequestsAssociatedWithCommit",
      detail:
        "owner: falcosecurity, repo: plugins, commit_sha: d04fb784" +
        (src === "fork"
          ? "  ->  []   (commit lives in the fork)"
          : "  ->  [1501]"),
      state: src === "fork" ? "fail" : "run",
    });
  } else {
    // Path 1: workflow_run.pull_requests, populated only for same-repo PRs.
    const runPrs = src === "same" ? [1501] : [];
    steps.push({
      label: "workflow_run.pull_requests",
      detail:
        src === "same"
          ? "[1501]   (GitHub populates this for same-repo PRs)"
          : "[]   (always empty for fork PRs)",
      state: src === "same" ? "run" : "skip",
    });
    valid = runPrs;

    if (valid.length === 0) {
      // Path 2: ask the base repo for its own PRs from that head branch.
      valid = [1501];
      steps.push({
        label: "pulls.list on the base repo",
        detail:
          "owner: falcosecurity, repo: plugins, head: ManuelFCastillo:fix/container-linux-resolv  ->  [1501]",
        state: "run",
      });
    } else {
      steps.push({
        label: "pulls.list on the base repo",
        detail: "not needed, the payload already answered",
        state: "skip",
      });
    }
  }

  const passed = valid.includes(nr);
  steps.push({
    label: `valid_pr_numbers.includes(${nr})`,
    detail: `[${valid.join(", ")}] includes ${nr}  ->  ${passed}`,
    state: passed ? "pass" : "fail",
  });

  let verdict: string;
  let log: string;
  if (passed) {
    verdict = "comment posted on #1501";
    log = `github.rest.issues.createComment({\n  issue_number: ${nr},\n  body: "<build results>"\n})\n\n// the bot comments on the right PR`;
  } else if (art === "poison") {
    verdict = "blocked, correctly";
    log = `core.setFailed(\n  "Artifact PR number 42 does not match ..."\n)\n\n// the attack is stopped, which is the point of the guard`;
  } else {
    verdict = "blocked, wrongly";
    log = `core.setFailed(\n  "Artifact PR number 1501 does not match ..."\n)\n\n// an honest contribution is rejected\n// this is the bug: every fork PR since 2026-03-02`;
  }

  return { steps, passed, verdict, log };
}

function initLab(root: HTMLElement) {
  const state = { src: "fork", art: "honest", ver: "old" };

  const elSrc = root.querySelector("#gl-src") as HTMLElement | null;
  const elArt = root.querySelector("#gl-art") as HTMLElement | null;
  const elVer = root.querySelector("#gl-ver") as HTMLElement | null;
  const elSteps = root.querySelector("#gl-steps") as HTMLElement | null;
  const elVerdict = root.querySelector("#gl-verdict") as HTMLElement | null;
  const elLog = root.querySelector("#gl-log") as HTMLElement | null;

  if (!elSrc || !elArt || !elVer || !elSteps || !elVerdict || !elLog) return;

  function esc(s: string) {
    return s.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function render() {
    const r = simulate(state.src, state.art, state.ver);

    elSteps!.innerHTML = r.steps
      .map(
        (s) =>
          `<div class="gl-step gl-${s.state}">` +
          `<span class="gl-dot"></span>` +
          `<span class="gl-step-label">${esc(s.label)}</span>` +
          `<span class="gl-step-detail">${esc(s.detail)}</span>` +
          `</div>`,
      )
      .join("");

    const cls = r.passed ? "ok" : state.art === "poison" ? "ok" : "bad";
    elVerdict!.innerHTML =
      `<span class="gl-pill ${cls}">${esc(r.verdict)}</span>` +
      (!r.passed && state.art === "honest"
        ? `<span class="gl-hint">this is the reported bug</span>`
        : "");
    elLog!.textContent = r.log;
  }

  function seg(el: HTMLElement, opts: { id: string; label: string }[], key: "src" | "art" | "ver") {
    el.innerHTML = opts
      .map(
        (o) =>
          `<button type="button" class="preset${state[key] === o.id ? " primary" : ""}" data-v="${o.id}" aria-pressed="${state[key] === o.id}">${o.label}</button>`,
      )
      .join("");
    el.addEventListener("click", (e) => {
      const btn = (e.target as HTMLElement).closest("button[data-v]") as HTMLElement | null;
      if (!btn) return;
      state[key] = btn.getAttribute("data-v") || opts[0].id;
      el.querySelectorAll("button").forEach((b) => {
        const on = b === btn;
        b.className = "preset" + (on ? " primary" : "");
        b.setAttribute("aria-pressed", String(on));
      });
      render();
    });
  }

  seg(elSrc, SRC, "src");
  seg(elArt, ART, "art");
  seg(elVer, VER, "ver");
  render();
}
