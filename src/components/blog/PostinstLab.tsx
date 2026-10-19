"use client";

import { useEffect, useRef } from "react";
import { NoteStats } from "@/components/blog/NoteStats";
import { ShareLinks } from "@/components/blog/ShareLinks";
import { UpdatedNote } from "@/components/blog/UpdatedNote";

/**
 * "The Anatomy of a Half-Configured Package" - interactive essay.
 *
 * Same architecture as the other labs: static article markup, with the three
 * labs (a set -e sandbox, a postinst stepper and the 48-cell qualification
 * grid) wired imperatively in one effect. A dataset flag guards against
 * double-wiring under dev Strict Mode.
 */
export function PostinstLab() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || root.dataset.init) return;
    root.dataset.init = "1";
    initErrexit(root);
    initStepper(root);
    initGrid(root);
  }, []);

  return (
    <article className="race-lab postinst-lab" ref={rootRef}>
      <div className="wrap">
        <header className="hero">
          <div className="eyebrow">
            <a href="/blog">field notes</a> &middot; falcosecurity/falco &middot; pull #4037
          </div>
          <h1>The Anatomy of a Half-Configured Package</h1>
          <div className="byline">Manny Castillo &middot; Senior SDET &middot; October 2026</div>
          <NoteStats slug="anatomy-of-a-half-configured-package" variant="post" />
          <UpdatedNote slug="anatomy-of-a-half-configured-package" />
          <ShareLinks slug="anatomy-of-a-half-configured-package" placement="top" />
          <p className="lede">
            Falco 0.45 installs cleanly on modern kernels and leaves Ubuntu 20.04 half-configured
            without printing a single error. I traced it to <b>two lines that are harmless on their
            own</b>, fixed it with two more, and checked the fix on 48 real VMs. Along the way: a
            shell rule most scripts get subtly wrong, a stepper for the real postinst, and the
            qualification grid itself. Budget ~12 minutes.
          </p>
        </header>

        <div className="aside">
          Keep one question in mind through every section:{" "}
          <i>&ldquo;how does a script that stops on every error manage to fail without reporting
          one?&rdquo;</i>
        </div>

        <h2 id="s1"><span className="num">1.</span> One red row on a release candidate</h2>
        <div className="time">~1 min &middot; read</div>
        <p>
          My release-qualification gate,{" "}
          <a href="https://github.com/ManuelFCastillo/kernel-matrix">Kestrel QA</a>, installs
          Falco&rsquo;s real <code>.deb</code> and <code>.rpm</code> packages on 48 VM cells: twelve
          distro and kernel pairs, each with a fresh install on the automatic driver, a fresh install
          forcing the kernel module, a fresh install forcing modern eBPF, and an upgrade from 0.44.1.
          Real VMs, not containers, because a container shares the host&rsquo;s kernel and the whole
          point is to test against many kernels.
        </p>
        <p>
          0.45.1-rc1 came back <b>34 pass, 13 fail, 1 blocked</b>. Most of the red was old news:
          CentOS 7 is below the package&rsquo;s glibc floor, and Ubuntu 18.04 has problems of its
          own. The new red was Ubuntu 20.04 on its stock 5.4 kernel, where every fresh install
          failed. The same cells failed on 0.45.0-rc4 and on 0.45.0, so this had already shipped in
          a stable release.
        </p>
        <p>Two neighbours made it interesting:</p>
        <p>
          &bull; Ubuntu 20.04 on the 5.15 HWE kernel, same distro, same package: <b>all green</b>.
          <br />
          &bull; The <b>upgrade</b> from 0.44.1 on the very same 5.4 host: <b>green</b>.
        </p>
        <p>
          Same distro, same kernel, same package. The upgrade passes and the fresh install fails.
          That pair turned out to contain the whole bug.
        </p>

        <h2 id="s2"><span className="num">2.</span> What &ldquo;half-configured&rdquo; means</h2>
        <div className="time">~2 min &middot; read</div>
        <p>Here is the reproduction, one VM, nothing else installed:</p>
        <div className="log">{`$ sudo apt install -y ./falco-0.45.1-rc1-x86_64.deb
...
Unpacking falco (0.45.1-rc1) ...
Setting up falco (0.45.1-rc1) ...
[POST-INSTALL] Disable all possible 'falco' services:
dpkg: error processing package falco (--configure):
 installed falco package post-installation script subprocess returned error exit status 1
Errors were encountered while processing:
 falco
E: Sub-process /usr/bin/dpkg returned an error code (1)

$ dpkg -s falco | grep Status
Status: install ok half-configured`}</div>
        <p>
          dpkg installs a package in two phases. <b>Unpack</b> puts the files on disk. <b>Configure</b>{" "}
          runs the package&rsquo;s <code>postinst</code> script, which for Falco picks a driver,
          writes falcoctl&rsquo;s config, builds the kernel module if needed, and enables the
          service. If the postinst exits non-zero, dpkg records the package as{" "}
          <code>half-configured</code>: every file is present, and none of that setup happened. No
          driver configured, no service enabled, and later <code>apt</code> runs keep trying to
          configure it and failing the same way until someone steps in.
        </p>
        <p>
          Now look at what the log does <i>not</i> contain. The script prints a progress line
          before each step. It printed the first one, and then it died. No error message, no hint
          which command failed. Whatever went wrong, it went wrong in a place where its output was
          not reaching the terminal.
        </p>

        <h2 id="s3"><span className="num">3.</span> Where <code>set -e</code> fires, and where it does not</h2>
        <div className="time">~3 min &middot; run the snippets</div>
        <p>
          The postinst starts with <code>set -e</code>: exit as soon as any command fails. That
          sounds absolute. It is not. POSIX lists places where a failure is deliberately ignored, and
          most shell scripts lean on them without knowing it. Each snippet below runs under{" "}
          <code>dash</code>, which is <code>/bin/sh</code> on Debian and Ubuntu and therefore what
          runs a <code>.deb</code> postinst. Guess before you press run:
        </p>
      </div>

      <div className="wide">
        <div className="lab">
          <div className="bar">
            Lab &middot; does the script survive? <span className="grow"></span>
            <span>dash, set -e</span>
          </div>
          <div className="stage">
            <div className="pk-snips" id="ee-snips"></div>
            <div className="log" id="ee-cmd">{`// pick a snippet`}</div>
            <div className="pk-verdict" id="ee-verdict"></div>
          </div>
        </div>
      </div>

      <div className="wrap">
        <p>
          <b>What you just saw:</b> a failure inside a command substitution kills the script only
          in one shape. It has to be a <b>bare assignment</b>, <code>x=$(cmd)</code>, outside any{" "}
          <code>if</code>, <code>||</code> or <code>&amp;&amp;</code>, not behind{" "}
          <code>local</code> or <code>export</code>, and not the left side of a pipeline. A
          function called normally inherits the rule; a function called as{" "}
          <code>f || true</code> has it switched off for its entire body.
        </p>
        <p>
          And the substitution swallows the failing command&rsquo;s output. That is the missing
          error message from section 2: whatever the command said went into a variable that the
          script never got to read.
        </p>
        <p>
          The postinst has exactly one line in that shape. It is in a function called{" "}
          <code>package_driver_version</code>:
        </p>
        <div className="log">{`package_driver_version() {
    driver_env=$(falcoctl driver printenv)
    ...`}</div>

        <h2 id="s4"><span className="num">4.</span> Two harmless lines</h2>
        <div className="time">~3 min &middot; step the postinst</div>
        <p>
          Both lines arrived together in{" "}
          <a href="https://github.com/falcosecurity/falco/pull/3994">falco#3994</a>,{" "}
          <i>fix(packaging): restore services and drivers after upgrades</i>. That PR fixed a real
          problem: upgrades were losing the enabled service and any custom driver version pin. To
          keep the pin, it reads the current driver version with{" "}
          <code>falcoctl driver printenv</code> before reconfiguring. And it added{" "}
          <code>set -e</code> at line 20 of the postinst.
        </p>
        <p>
          The second part is the subtle one. 0.44.1&rsquo;s postinst already had a{" "}
          <code>set -e</code>, at line 105, <b>after</b> the block that configures the driver.
          Whether or not that placement was deliberate, it meant the configure block ran with
          errexit off, and a falcoctl failure there was printed and survived. #3994 did not move that
          line. It added a second one at the top. The file now has two, and the first one quietly
          puts the configure block under errexit for the first time.
        </p>
        <p>
          On its own, that is fine as long as nothing in the block fails on a supported host. So
          why does <code>printenv</code> fail? Compare what the two 5.4 cells had on disk when the
          postinst ran:
        </p>
        <div className="pk-pair">
          <div>
            <div className="pk-h">fresh install (postinst died before touching it)</div>
            <div className="log">{`$ cat /etc/falcoctl/falcoctl.yaml
driver:
    type: [modern_ebpf]
    ...

$ falcoctl driver printenv
ERROR no supported driver found for distro:
  ubuntu-generic, kernelrelease 5.4.0-216-generic
[exit 1]`}</div>
          </div>
          <div>
            <div className="pk-h">upgrade from 0.44.1 (captured after install)</div>
            <div className="log">{`$ cat /etc/falcoctl/falcoctl.yaml
driver:
    type:
        - kmod
    ...

$ falcoctl driver printenv
DRIVER="kmod"
...
[exit 0]`}</div>
          </div>
        </div>
        <p>
          The package ships a <code>falcoctl.yaml</code> that allows only <code>modern_ebpf</code>.
          The postinst widens that to <code>modern_ebpf</code> plus <code>kmod</code> a few lines
          later. But <code>package_driver_version</code> runs first, and <code>printenv</code>{" "}
          checks the configured drivers against the running kernel. A 5.4 kernel cannot run modern
          eBPF, so with nothing else allowed, falcoctl exits 1.
        </p>
        <p>
          On an upgrade, <code>falcoctl.yaml</code> is a conffile, so dpkg keeps the one already on
          disk. 0.44.1&rsquo;s postinst had configured it with{" "}
          <code>--type modern_ebpf --type kmod</code>, so <code>kmod</code> is allowed before the
          new postinst touches anything. Same command, same kernel, a driver it can use, exit 0. That is why the upgrade cell was green, and why testing the
          upgrade path, the thing #3994 was about, would not show it.
        </p>
        <p>Step through the script yourself. Change one control at a time:</p>
      </div>

      <div className="wide">
        <div className="lab">
          <div className="bar">
            Lab &middot; step the postinst <span className="grow"></span>
            <span>simplified, real line order</span>
          </div>
          <div className="stage">
            <div className="pk-controls">
              <div className="pk-ctrl">
                <div className="pk-h">package</div>
                <div className="pk-seg" data-key="ver">
                  <button data-v="044">0.44.1</button>
                  <button data-v="rc1" className="on">0.45.1-rc1</button>
                  <button data-v="fix">with the fix</button>
                </div>
              </div>
              <div className="pk-ctrl">
                <div className="pk-h">kernel</div>
                <div className="pk-seg" data-key="kern">
                  <button data-v="54" className="on">5.4 (20.04 stock)</button>
                  <button data-v="68">6.8 (24.04)</button>
                </div>
              </div>
              <div className="pk-ctrl">
                <div className="pk-h">install</div>
                <div className="pk-seg" data-key="inst">
                  <button data-v="fresh" className="on">fresh</button>
                  <button data-v="upgrade">upgrade from 0.44.1</button>
                </div>
              </div>
              <div className="pk-ctrl">
                <div className="pk-h">FALCO_DRIVER_CHOICE</div>
                <div className="pk-seg" data-key="choice">
                  <button data-v="auto" className="on">auto</button>
                  <button data-v="kmod">kmod</button>
                  <button data-v="modern_ebpf">modern_ebpf</button>
                </div>
              </div>
            </div>
            <div className="pk-script" id="st-script"></div>
            <div className="lk-controls pk-run">
              <button className="preset primary" id="st-step">step</button>
              <button className="preset" id="st-run">run all</button>
              <button className="preset ghost" id="st-reset">reset</button>
              <span className="pk-errexit" id="st-errexit"></span>
            </div>
            <div className="log" id="st-log">{`// press "step" to run the first line`}</div>
            <div className="pk-verdict" id="st-verdict"></div>
            <div className="pk-measured" id="st-measured"></div>
          </div>
        </div>
      </div>

      <div className="wrap">
        <p>
          <b>What to try:</b> 0.45.1-rc1, 5.4, fresh, any driver choice: the script dies on the
          third line, before it has even looked at your choice. Switch to <b>upgrade</b> and the same
          line succeeds. Switch to <b>0.44.1</b> with <code>modern_ebpf</code> and the{" "}
          <code>driver config</code> line fails too, but errexit is still off there, so the script
          prints the error and carries on to a configured package whose service cannot start.
        </p>
        <p>
          That last behaviour is worth defending. A package that installs and whose service fails
          says something true and specific: <code>systemctl status</code> will tell you this kernel
          cannot run modern eBPF. A half-configured package says nothing, and it breaks every{" "}
          <code>apt</code> run after it until someone cleans it up by hand.
        </p>

        <h2 id="s5"><span className="num">5.</span> Fixing it twice</h2>
        <div className="time">~2 min &middot; read</div>
        <p>
          My first fix only touched <code>printenv</code>. On the grid, Ubuntu 20.04 auto and kmod
          went green, and the forced <code>modern_ebpf</code> cells were still half-configured.
          Their install log now got one line further:
        </p>
        <div className="log">{`[POST-INSTALL] Update package driver version to 11.0.1-rc1+driver:
[POST-INSTALL] Configure falcoctl 'modern_ebpf' driver type:
ERROR no supported driver found for distro: ubuntu-generic,
  kernelrelease 5.4.0-216-generic ...`}</div>
        <p>
          <code>falcoctl driver config --type modern_ebpf</code> refuses a kernel that cannot run
          it, and that line is now under errexit too. Removing one exit just lets the script run far
          enough to reach the next one. That is a good reason to run the whole matrix after every
          fix rather than the one cell you were looking at.
        </p>
        <p>The full fix is two lines in shared code, plus the same one-line change in the rpm script:</p>
        <div className="log">{`# scripts/packaging/functions.sh.in
-    driver_env=$(falcoctl driver printenv)
+    driver_env=$(falcoctl driver printenv 2>/dev/null) || driver_env=

# scripts/debian/postinst.in and scripts/rpm/postinstall.in
-    falcoctl driver config --version "$driver_version" --type "$chosen_driver"
+    falcoctl driver config --version "$driver_version" --type "$chosen_driver" || true`}</div>
        <p>
          The first line did not need inventing. An empty <code>driver_env</code> already falls
          back to the package&rsquo;s own driver version a few lines further down, and the
          function directly above it, <code>package_save_previous_driver</code>, already calls{" "}
          <code>printenv</code> exactly this way. The codebase had the answer next door. The second
          line restores what 0.44.1 did: configure the package, let the service fail where the
          failure belongs. A maintainer may prefer a different shape, such as checking whether the
          kernel can run modern eBPF before trying, and that is their call to make.
        </p>

        <h3>A test that fails first</h3>
        <p>
          The packaging scripts have a real test suite,{" "}
          <code>scripts/packaging/test_package_scripts.py</code>, which runs the postinst against
          fake <code>falcoctl</code> and <code>systemctl</code> commands. The fake{" "}
          <code>falcoctl driver printenv</code> printed a driver every time. It modelled a machine
          where every driver works, so no test could have caught this.
        </p>
        <p>
          I taught the fake both refusals, behind a <code>modern_ebpf_supported</code> flag, and
          added two tests covering deb and rpm with all three driver choices. Against unpatched
          master, all six new subtests fail with the same{" "}
          <code>no supported driver found</code> error. With the fix, all 16 tests in the file pass.
          A test that has never failed has not yet shown it can.
        </p>

        <h2 id="s6"><span className="num">6.</span> 48 cells, two builds</h2>
        <div className="time">~2 min &middot; explore the grid</div>
        <p>
          Unit tests prove the logic. The grid proves the packages. Here is every cell for
          0.45.1-rc1 and for the same release candidate rebuilt with the fix. Click any cell for
          what happened on that VM.
        </p>
      </div>

      <div className="wide">
        <div className="lab">
          <div className="bar">
            Lab &middot; the qualification grid <span className="grow"></span>
            <span className="pk-seg pk-seg-bar" data-key="build">
              <button data-v="rc1" className="on">0.45.1-rc1</button>
              <button data-v="fix">with the fix</button>
            </span>
          </div>
          <div className="stage">
            <div className="pk-counts" id="gr-counts"></div>
            <div className="pk-grid-wrap">
              <table className="pk-grid" id="gr-table"></table>
            </div>
            <label className="pk-check">
              <input type="checkbox" id="gr-changed" /> outline the cells that change between builds
            </label>
            <div className="pk-detail" id="gr-detail">Click a cell to see what happened on that VM.</div>
          </div>
        </div>
      </div>

      <div className="wrap">
        <p>
          Four cells change verdict and none get worse. Ubuntu 20.04 on 5.4, auto and kmod, go from
          half-configured to passing. The two forced <code>modern_ebpf</code> cells on 18.04 and
          20.04 go from <b>fail</b> to <b>unsupported</b>.
        </p>
        <p>
          If &ldquo;0 unsupported&rdquo; looks better than &ldquo;2 unsupported&rdquo;, it is
          worth slowing down, because I had to as well. Unsupported is not a softer fail. The gate
          only reaches that verdict when three things are true: the scenario forced{" "}
          <code>modern_ebpf</code>, the package configured cleanly, and the kernel cannot run modern
          eBPF. On rc1 the package never configured, so those two cells could only ever be failures.
          No package can make modern eBPF run on a 4.15 or 5.4 kernel. The best possible result
          there is &ldquo;installs, and tells you the driver cannot run&rdquo;, and that is what
          the fix gets.
        </p>
        <p>The nine failures left are identical in both builds, and none of them are this bug:</p>
        <p>
          &bull; <b>CentOS 7</b>: the rpm requires glibc 2.28 and CentOS 7 ships 2.17. Rejected
          before any script runs, and the upgrade cell is blocked because 0.44.1 never installed
          either.
          <br />
          &bull; <b>Ubuntu 18.04 auto, kmod and upgrade</b>: with the fix the package now
          configures, but systemd 237 rejects <code>ExecReload=kill -1 $MAINPID</code> (&ldquo;Executable path is not absolute&rdquo;) and will not load the units. The bundled container
          plugin also needs glibc 2.28, which 18.04 does not have. That floor showed up in{" "}
          <a href="/blog/anatomy-of-an-undefined-symbol">the undefined symbol post</a> too.
          <br />
          &bull; <b>kmod on Debian 12, Ubuntu 22.04 and Rocky 9</b>: the kernel module build fails
          inside <code>falcoctl driver install</code>. That step sat after 0.44.1&rsquo;s{" "}
          <code>set -e</code> as well, so a failed module build has always failed the install.
          Whether it should is a separate question.
        </p>
        <p>
          The grid checks install, driver, service, and one detection. For depth I also ran a
          61-test sensor suite (detections, containers, outputs, load, lifecycle) on nine cells with
          the first, printenv-only build. Stock Ubuntu 20.04 went from <b>0 of 61</b> passing,
          nearly all skipped because there was no running sensor to test, to <b>58 of 61</b>. The
          other eight cells gave identical results before and after.
        </p>

        <h2 id="s7"><span className="num">7.</span> Why it got through</h2>
        <div className="time">~1 min &middot; read</div>
        <p>
          Nobody did anything careless here. #3994 fixed a real upgrade bug, had tests, and was
          reviewed. Three ordinary things lined up:
        </p>
        <p>
          &bull; <b>The fake modelled a kernel where everything works.</b> The shim&rsquo;s{" "}
          <code>printenv</code> could not fail, so the tests could not see what happens when it
          does. A fixture contains only what you thought to put in it.
          <br />
          &bull; <b>The natural test of an upgrade fix is an upgrade</b>, and the upgrade passed,
          even on the exact host where fresh installs failed.
          <br />
          &bull; <b>The failing kernel is the one nobody develops on.</b> Ubuntu 20.04 is still
          in production in a lot of places under extended support, but anyone running it on the HWE
          kernel is on 5.15, where modern eBPF works and the bug cannot appear.
        </p>
        <p>
          <b>The lesson is not about falcoctl.</b> Adding <code>set -e</code> to an existing script
          is not adding a check. It changes the meaning of every line that was already there,
          including lines the diff does not show. The useful review question is not &ldquo;is this
          line correct?&rdquo; but <b>&ldquo;which commands are now under errexit that were not
          before, and can any of them fail on a host we support?&rdquo;</b>
        </p>

        <h2 id="s8"><span className="num">8.</span> Shipping it upstream</h2>
        <div className="time">~1 min &middot; read</div>
        <p>
          I opened{" "}
          <a href="https://github.com/falcosecurity/falco/pull/4037">falcosecurity/falco#4037</a>{" "}
          against master, with the reproduction above, the regression traced to #3994, the grid
          results, and a note that <code>release/0.45.x</code> carries the same line. The out of
          scope problems on 18.04 are in the PR as separate items, offered as their own issue rather
          than folded in. A fix that quietly changes three unrelated things is harder to review and
          harder to revert.
        </p>
        <p>
          Four lines of diff, two new tests, and 48 VMs of evidence. The ratio is the job.
        </p>

        <h2 id="s9"><span className="num">9.</span> Check yourself</h2>
        <div className="time">~1 min &middot; answer before revealing</div>
        <details>
          <summary>1 &middot; Under <code>set -e</code>, which of these exits: <code>x=$(false)</code>, <code>local x=$(false)</code>, <code>x=$(false | cat)</code>?</summary>
          <div className="a">
            Only the first. <code>local</code> returns its own status, 0, which hides the
            substitution&rsquo;s. A pipeline&rsquo;s status is its last command&rsquo;s, and{" "}
            <code>cat</code> succeeds. Without <code>set -o pipefail</code>, which this postinst does
            not set, the failure on the left is invisible.
          </div>
        </details>
        <details>
          <summary>2 &middot; Why did the upgrade from 0.44.1 pass on the same 5.4 host where fresh installs failed?</summary>
          <div className="a">
            <code>/etc/falcoctl/falcoctl.yaml</code> is a conffile. On upgrade dpkg keeps the one on
            disk, which 0.44.1 had set to <code>kmod</code>, so <code>printenv</code> succeeds. A
            fresh install gets the shipped file, which allows only <code>modern_ebpf</code>.
          </div>
        </details>
        <details>
          <summary>3 &middot; The postinst failed with no error message. Where did the message go?</summary>
          <div className="a">
            Into the command substitution. <code>driver_env=$(falcoctl driver printenv)</code>{" "}
            captures what the command prints, and errexit fires before anything reads{" "}
            <code>driver_env</code>. When a script dies without a word, look for a capture.
          </div>
        </details>
        <details>
          <summary>4 &middot; A cell moved from fail to unsupported. Better, worse, or the same?</summary>
          <div className="a">
            Better. Unsupported means the package installed cleanly and the kernel cannot run the
            driver that was forced. That is the best possible result on that kernel. The fail
            before it was a real packaging bug that hid the kernel question entirely.
          </div>
        </details>
        <details>
          <summary>5 &middot; You are reviewing a PR that adds <code>set -e</code> to the top of a 150-line script. What do you check?</summary>
          <div className="a">
            Every command between the new line and wherever errexit was already on. For each one:
            can it fail on a host we support, and if it does, should that fail the whole script? The
            diff shows one added line. The behaviour change covers everything below it.
          </div>
        </details>

        <footer>
          The grid runs in{" "}
          <a href="https://github.com/ManuelFCastillo/kernel-matrix">Kestrel QA</a>, my release
          qualification gate for Falco: real VMs from kernel 3.10 to 6.19, the real packages from
          download.falco.org, and a verdict per cell for install, driver, service and detection. It
          runs nightly against every new release candidate and fails only on new red.
        </footer>
        <ShareLinks slug="anatomy-of-a-half-configured-package" />
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* Lab 1: set -e sandbox. Every outcome below was run under dash.      */
/* ------------------------------------------------------------------ */

const SNIPPETS: { code: string; exits: boolean; why: string }[] = [
  {
    code: "x=$(false)",
    exits: true,
    why: "A bare assignment takes the exit status of its command substitution. 1, so errexit fires.",
  },
  {
    code: "x=$(false) || x=",
    exits: false,
    why: "Anything on the left of || is exempt from errexit. This is the shape of the fix.",
  },
  {
    code: "x=$(false | cat)",
    exits: false,
    why: "A pipeline's status is its last command's. cat succeeds, so the failure on the left is invisible. This is why the second printenv in the postinst, piped through grep and cut, never tripped.",
  },
  {
    code: "f() { local x=$(false); }; f",
    exits: false,
    why: "local returns its own status, 0, which replaces the substitution's. A very common way to hide a failure by accident.",
  },
  {
    code: "export x=$(false)",
    exits: false,
    why: "Same as local: export succeeds, and that is the status errexit sees.",
  },
  {
    code: "if x=$(false); then :; fi",
    exits: false,
    why: "The condition of an if is exempt. That is what lets you test a command at all.",
  },
  {
    code: "f() { x=$(false); }; f",
    exits: true,
    why: "A function called normally runs under errexit too. This is package_driver_version's exact shape.",
  },
  {
    code: "f() { x=$(false); }; f || true",
    exits: false,
    why: "Call a function on the left of || and errexit is off for its entire body, not just its return value.",
  },
];

function initErrexit(root: HTMLElement) {
  const $ = (id: string) => root.querySelector<HTMLElement>("#" + id)!;
  const snips = $("ee-snips");
  const cmd = $("ee-cmd");
  const verdict = $("ee-verdict");

  SNIPPETS.forEach((s, i) => {
    const b = document.createElement("button");
    b.className = "preset pk-snip";
    b.textContent = s.code;
    b.addEventListener("click", () => {
      snips.querySelectorAll(".pk-snip").forEach((el) => el.classList.remove("on"));
      b.classList.add("on");
      cmd.textContent =
        `$ dash -c 'set -e; ${s.code}; echo CONTINUED'\n` +
        (s.exits ? "(no output)\n[exit 1]" : "CONTINUED");
      verdict.className = "pk-verdict " + (s.exits ? "pk-bad" : "pk-good");
      verdict.textContent = (s.exits ? "Exits. " : "Survives. ") + s.why;
    });
    b.dataset.i = String(i);
    snips.appendChild(b);
  });
}

/* ------------------------------------------------------------------ */
/* Lab 2: postinst stepper. A model of the real script's line order,   */
/* checked against the grid cells it maps to (see MEASURED).           */
/* ------------------------------------------------------------------ */

type Ver = "044" | "rc1" | "fix";
type Kern = "54" | "68";
type Inst = "fresh" | "upgrade";
type Choice = "auto" | "kmod" | "modern_ebpf";
interface Cfg {
  ver: Ver;
  kern: Kern;
  inst: Inst;
  choice: Choice;
}

interface Ctx {
  cfg: Cfg;
  errexit: boolean;
  driver: Choice | "";
  unit: string;
}

interface Step {
  line: number;
  code: string;
  /** Runs the line: exit status, output, and whether a failure is guarded. */
  run: (c: Ctx) => { status: number; out: string; guarded?: boolean };
}

const NO_DRIVER =
  "ERROR no supported driver found for distro: ubuntu-generic,\n      kernelrelease 5.4.0-216-generic";
const KREL = { "54": "5.4.0-216-generic", "68": "6.8.0-generic" };

function modernOk(k: Kern) {
  return k === "68";
}

/** What /etc/falcoctl/falcoctl.yaml allows when the postinst starts. */
function initialTypes(cfg: Cfg): Choice[] {
  if (cfg.inst === "fresh") return ["modern_ebpf"];
  // dpkg keeps the conffile, which 0.44.1's postinst already configured
  // with `--type modern_ebpf --type kmod`.
  return ["modern_ebpf", "kmod"];
}

function printenv(types: Choice[], k: Kern): Choice | null {
  if (types.includes("modern_ebpf") && modernOk(k)) return "modern_ebpf";
  if (types.includes("kmod")) return "kmod";
  return null;
}

/** Real line numbers in scripts/debian/postinst.in for each version. */
const LINES: Record<Ver, Record<string, number>> = {
  "044": { stop: 27, auto: 77, chosen: 79, config: 81, sete: 105, install: 115, enable: 127, start: 129 },
  rc1: { top: 20, stop: 31, printenv: 78, auto: 82, chosen: 84, config: 86, sete: 110, install: 120, enable: 132, start: 134 },
  fix: { top: 20, stop: 31, printenv: 78, auto: 82, chosen: 84, config: 88, sete: 112, install: 122, enable: 134, start: 136 },
};

function buildSteps(cfg: Cfg): Step[] {
  const v045 = cfg.ver !== "044";
  const L = LINES[cfg.ver];
  const ver = v045 ? ` --version "$driver_version"` : "";
  const steps: Step[] = [];

  if (v045) {
    steps.push({
      line: L.top,
      code: "set -e",
      run: (c) => {
        c.errexit = true;
        return { status: 0, out: "errexit on (added by #3994)" };
      },
    });
  }
  steps.push({
    line: L.stop,
    code: "systemctl --system stop 'falco-kmod.service' || true",
    run: () => ({ status: 0, out: "[POST-INSTALL] Disable all possible 'falco' services:" }),
  });
  if (v045) {
    const fixed = cfg.ver === "fix";
    steps.push({
      line: L.printenv,
      code: fixed
        ? "package_driver_version: driver_env=$(falcoctl driver printenv 2>/dev/null) || driver_env="
        : "package_driver_version: driver_env=$(falcoctl driver printenv)",
      run: (c) => {
        const got = printenv(initialTypes(c.cfg), c.cfg.kern);
        if (got) {
          return {
            status: 0,
            out: `(captured) DRIVER="${got}" DRIVER_VERSION="11.0.1-rc1+driver"\n[POST-INSTALL] Update package driver version to 11.0.1-rc1+driver:`,
          };
        }
        if (fixed) {
          return {
            status: 1,
            guarded: true,
            out:
              "printenv exits 1, || driver_env= catches it\n" +
              "driver_env is empty, falls back to the package driver version\n" +
              "[POST-INSTALL] Update package driver version to 11.0.1-rc1+driver:",
          };
        }
        return {
          status: 1,
          out: `(captured, never printed) ${NO_DRIVER.replace(/\n\s+/, " ")}`,
        };
      },
    });
  }
  if (cfg.choice === "auto") {
    steps.push({
      line: L.auto,
      code: `falcoctl driver config${ver} --type "modern_ebpf" --type "kmod"`,
      run: (c) => {
        c.driver = "auto";
        return { status: 0, out: "[POST-INSTALL] Configure falcoctl 'auto' driver type:" };
      },
    });
    steps.push({
      line: L.chosen,
      code: `chosen_driver=$(falcoctl driver printenv | grep DRIVER= | cut -d'"' -f2)`,
      run: (c) => {
        const got = printenv(["modern_ebpf", "kmod"], c.cfg.kern)!;
        c.driver = got;
        return { status: 0, out: `chosen_driver=${got}  (pipeline: status is cut's)` };
      },
    });
  } else {
    const guard = cfg.ver === "fix" ? " || true" : "";
    steps.push({
      line: L.config,
      code: `falcoctl driver config${ver} --type "${cfg.choice}"${guard}`,
      run: (c) => {
        c.driver = c.cfg.choice;
        const head = `[POST-INSTALL] Configure falcoctl '${c.cfg.choice}' driver type:`;
        if (c.cfg.choice === "modern_ebpf" && !modernOk(c.cfg.kern)) {
          return {
            status: 1,
            guarded: c.cfg.ver === "fix",
            out: `${head}\n${NO_DRIVER}`,
          };
        }
        return { status: 0, out: head };
      },
    });
  }
  steps.push({
    line: L.sete,
    code: "set -e",
    run: (c) => {
      const was = c.errexit;
      c.errexit = true;
      return { status: 0, out: was ? "errexit already on" : "errexit on (from here down, in every version)" };
    },
  });
  steps.push({
    line: L.install,
    code: 'case "$chosen_driver" in kmod) falcoctl driver install ...',
    run: (c) => {
      if (c.driver === "kmod") {
        c.unit = "kmod";
        return {
          status: 0,
          out: `[POST-INSTALL] Call 'falcoctl driver install for kmod:\n[POST-INSTALL] Install kmod '11.0.1-rc1+driver' for ${KREL[c.cfg.kern]}:`,
        };
      }
      c.unit = "modern-bpf";
      return { status: 0, out: "modern_ebpf: nothing to build" };
    },
  });
  steps.push({
    line: L.enable,
    code: 'systemctl --system enable "falco-$chosen_unit.service" || true',
    run: (c) => ({
      status: 0,
      out: `[POST-INSTALL] Enable 'falco-${c.unit}.service':\nCreated symlink /etc/systemd/system/falco.service -> falco-${c.unit}.service`,
    }),
  });
  steps.push({
    line: L.start,
    code: 'systemctl --system start "falco-$chosen_unit.service" || true',
    run: (c) => {
      const head = `[POST-INSTALL] Start 'falco-${c.unit}.service':`;
      if (c.unit === "modern-bpf" && !modernOk(c.cfg.kern)) {
        return {
          status: 1,
          guarded: true,
          out: `${head}\nfalco-modern-bpf.service fails: this kernel cannot run modern eBPF (|| true)`,
        };
      }
      return { status: 0, out: head };
    },
  });
  return steps;
}

/** Grid cells a configuration maps to, so the model can be checked. */
function measured(cfg: Cfg): string | null {
  if (cfg.ver === "044") return null;
  if (cfg.inst === "upgrade" && cfg.choice !== "auto") return null;
  const distro = cfg.kern === "54" ? "ubuntu-20.04" : "ubuntu-24.04";
  const kernel = cfg.kern === "54" ? "5.4" : "6.8";
  const scen = cfg.inst === "upgrade" ? "upgrade" : `fresh-${cfg.choice}`;
  const row = CELLS.find((r) => r[0] === distro && r[1] === kernel && r[2] === scen);
  if (!row) return null;
  const st = cfg.ver === "rc1" ? row[3] : row[5];
  const build = cfg.ver === "rc1" ? "0.45.1-rc1" : "0.45.1-rc1 with the fix";
  return `Measured on the grid: ${distro} (${kernel}), ${scen}, ${build}: ${STATUS_LABEL[st]}.`;
}

function initStepper(root: HTMLElement) {
  const $ = (id: string) => root.querySelector<HTMLElement>("#" + id)!;
  const scriptEl = $("st-script");
  const logEl = $("st-log");
  const verdictEl = $("st-verdict");
  const measuredEl = $("st-measured");
  const errEl = $("st-errexit");

  const cfg: Cfg = { ver: "rc1", kern: "54", inst: "fresh", choice: "auto" };
  let steps: Step[] = [];
  let pos = 0;
  let done = false;
  let ctx: Ctx;
  let lines: string[] = [];

  function renderErrexit() {
    errEl.textContent = `errexit: ${ctx.errexit ? "on" : "off"}`;
    errEl.className = "pk-errexit " + (ctx.errexit ? "pk-on" : "pk-off");
  }

  function reset() {
    steps = buildSteps(cfg);
    pos = 0;
    done = false;
    lines = [];
    ctx = { cfg: { ...cfg }, errexit: false, driver: "", unit: "" };
    scriptEl.innerHTML = steps
      .map(
        (s, i) =>
          `<div class="pk-line" data-i="${i}"><span class="pk-ln">${s.line}</span><code>${esc(s.code)}</code><span class="pk-st"></span></div>`,
      )
      .join("");
    logEl.textContent = '// press "step" to run the first line';
    verdictEl.className = "pk-verdict";
    verdictEl.textContent = "";
    const m = measured(cfg);
    measuredEl.textContent = m
      ? m
      : cfg.ver === "044"
        ? "Modelled from the 0.44.1 script. The grid upgrades from 0.44.1 but does not qualify it."
        : "Modelled only: the grid's upgrade cells use the default automatic choice.";
    renderErrexit();
    // An upgrade from 0.44.1 to 0.44.1 is not a thing.
    root
      .querySelector<HTMLButtonElement>('.pk-seg[data-key="inst"] [data-v="upgrade"]')!
      .toggleAttribute("disabled", cfg.ver === "044");
  }

  function lineEl(i: number) {
    return scriptEl.querySelector<HTMLElement>(`.pk-line[data-i="${i}"]`)!;
  }

  function finish(aborted: boolean) {
    done = true;
    if (aborted) {
      lines.push(
        "dpkg: error processing package falco (--configure):",
        " installed falco package post-installation script subprocess returned error exit status 1",
        "E: Sub-process /usr/bin/dpkg returned an error code (1)",
      );
      verdictEl.className = "pk-verdict pk-bad";
      verdictEl.textContent =
        "Status: install ok half-configured. No driver configured, no service enabled.";
    } else if (ctx.unit === "modern-bpf" && !modernOk(cfg.kern)) {
      verdictEl.className = "pk-verdict pk-warn";
      verdictEl.textContent =
        "Status: install ok installed. The service fails to start because this kernel cannot run modern eBPF, which is where that failure belongs.";
    } else {
      verdictEl.className = "pk-verdict pk-good";
      verdictEl.textContent = `Status: install ok installed. falco-${ctx.unit}.service running.`;
    }
    logEl.textContent = lines.join("\n");
  }

  function step() {
    if (done) return;
    const s = steps[pos];
    const el = lineEl(pos);
    scriptEl.querySelectorAll(".pk-line").forEach((l) => l.classList.remove("pk-cur"));
    el.classList.add("pk-cur");
    const r = s.run(ctx);
    const st = el.querySelector<HTMLElement>(".pk-st")!;
    st.textContent = `exit ${r.status}`;
    lines.push(r.out);
    if (r.status === 0) {
      el.classList.add("pk-ok");
    } else if (r.guarded) {
      el.classList.add("pk-guard");
      st.textContent = `exit ${r.status}, guarded`;
    } else if (ctx.errexit) {
      el.classList.add("pk-dead");
      lines.push("set -e: exit 1");
      renderErrexit();
      finish(true);
      return;
    } else {
      el.classList.add("pk-guard");
      st.textContent = `exit ${r.status}, errexit off`;
      lines.push("(errexit is off here: the script carries on)");
    }
    renderErrexit();
    pos++;
    if (pos >= steps.length) finish(false);
    else logEl.textContent = lines.join("\n");
  }

  root.querySelectorAll<HTMLElement>(".pk-controls .pk-seg").forEach((seg) => {
    seg.addEventListener("click", (e) => {
      const b = (e.target as HTMLElement).closest("button");
      if (!b || b.hasAttribute("disabled")) return;
      seg.querySelectorAll("button").forEach((x) => x.classList.remove("on"));
      b.classList.add("on");
      const key = seg.dataset.key as keyof Cfg;
      (cfg as unknown as Record<string, string>)[key] = b.dataset.v!;
      if (cfg.ver === "044" && cfg.inst === "upgrade") {
        cfg.inst = "fresh";
        const instSeg = root.querySelector<HTMLElement>('.pk-seg[data-key="inst"]')!;
        instSeg.querySelectorAll("button").forEach((x) =>
          x.classList.toggle("on", x.dataset.v === "fresh"),
        );
      }
      reset();
    });
  });
  $("st-step").addEventListener("click", step);
  $("st-run").addEventListener("click", () => {
    while (!done) step();
  });
  $("st-reset").addEventListener("click", reset);
  reset();
}

/* ------------------------------------------------------------------ */
/* Lab 3: the grid. Exported from Kestrel QA's per-cell JSON for       */
/* 0.45.1-rc1 and 0.45.1-rc1+fix-postinst-modern-ebpf, 2026-10-18.     */
/* ------------------------------------------------------------------ */

type St = "p" | "f" | "u" | "b";
type Cell = [string, string, string, St, string, St, string];

const STATUS_LABEL: Record<St, string> = {
  p: "pass",
  f: "fail",
  u: "unsupported",
  b: "blocked",
};

const SCENARIOS = ["fresh-auto", "fresh-kmod", "fresh-modern_ebpf", "upgrade"];
const SCEN_LABEL: Record<string, string> = {
  "fresh-auto": "fresh auto",
  "fresh-kmod": "fresh kmod",
  "fresh-modern_ebpf": "fresh modern_ebpf",
  upgrade: "upgrade",
};

const CELLS: Cell[] = [
  ["almalinux-9", "5.14", "fresh-auto", "p", "installed, modern_ebpf loaded, service active, detection fired", "p", "installed, modern_ebpf loaded, service active, detection fired"],
  ["almalinux-9", "5.14", "fresh-kmod", "p", "installed, kmod loaded, service active, detection fired", "p", "installed, kmod loaded, service active, detection fired"],
  ["almalinux-9", "5.14", "fresh-modern_ebpf", "p", "installed, modern_ebpf loaded, service active, detection fired", "p", "installed, modern_ebpf loaded, service active, detection fired"],
  ["almalinux-9", "5.14", "upgrade", "p", "installed, modern_ebpf loaded, service active, detection fired", "p", "installed, modern_ebpf loaded, service active, detection fired"],
  ["centos-7", "3.10", "fresh-auto", "f", "rpm refuses the package: it requires glibc 2.28 and CentOS 7 ships 2.17", "f", "rpm refuses the package: it requires glibc 2.28 and CentOS 7 ships 2.17"],
  ["centos-7", "3.10", "fresh-kmod", "f", "rpm refuses the package: it requires glibc 2.28 and CentOS 7 ships 2.17", "f", "rpm refuses the package: it requires glibc 2.28 and CentOS 7 ships 2.17"],
  ["centos-7", "3.10", "fresh-modern_ebpf", "f", "rpm refuses the package: it requires glibc 2.28 and CentOS 7 ships 2.17", "f", "rpm refuses the package: it requires glibc 2.28 and CentOS 7 ships 2.17"],
  ["centos-7", "3.10", "upgrade", "b", "baseline 0.44.1 never installed (rpm needs glibc 2.28), so there is nothing to upgrade from", "b", "baseline 0.44.1 never installed (rpm needs glibc 2.28), so there is nothing to upgrade from"],
  ["debian-11", "5.10", "fresh-auto", "p", "installed, modern_ebpf loaded, service active, detection fired", "p", "installed, modern_ebpf loaded, service active, detection fired"],
  ["debian-11", "5.10", "fresh-kmod", "p", "installed, kmod loaded, service active, detection fired", "p", "installed, kmod loaded, service active, detection fired"],
  ["debian-11", "5.10", "fresh-modern_ebpf", "p", "installed, modern_ebpf loaded, service active, detection fired", "p", "installed, modern_ebpf loaded, service active, detection fired"],
  ["debian-11", "5.10", "upgrade", "p", "installed, modern_ebpf loaded, service active, detection fired", "p", "installed, modern_ebpf loaded, service active, detection fired"],
  ["debian-12", "6.1", "fresh-auto", "p", "installed, modern_ebpf loaded, service active, detection fired", "p", "installed, modern_ebpf loaded, service active, detection fired"],
  ["debian-12", "6.1", "fresh-kmod", "f", "half-configured: kmod build failed against the downloaded kernel headers", "f", "half-configured: kmod build failed against the downloaded kernel headers"],
  ["debian-12", "6.1", "fresh-modern_ebpf", "p", "installed, modern_ebpf loaded, service active, detection fired", "p", "installed, modern_ebpf loaded, service active, detection fired"],
  ["debian-12", "6.1", "upgrade", "p", "installed, modern_ebpf loaded, service active, detection fired", "p", "installed, modern_ebpf loaded, service active, detection fired"],
  ["fedora-44", "6.19", "fresh-auto", "p", "installed, modern_ebpf loaded, service active, detection fired", "p", "installed, modern_ebpf loaded, service active, detection fired"],
  ["fedora-44", "6.19", "fresh-kmod", "p", "installed, kmod loaded, service active, detection fired", "p", "installed, kmod loaded, service active, detection fired"],
  ["fedora-44", "6.19", "fresh-modern_ebpf", "p", "installed, modern_ebpf loaded, service active, detection fired", "p", "installed, modern_ebpf loaded, service active, detection fired"],
  ["fedora-44", "6.19", "upgrade", "p", "installed, modern_ebpf loaded, service active, detection fired", "p", "installed, modern_ebpf loaded, service active, detection fired"],
  ["rocky-8", "4.18", "fresh-auto", "p", "installed, modern_ebpf loaded, service active, detection fired", "p", "installed, modern_ebpf loaded, service active, detection fired"],
  ["rocky-8", "4.18", "fresh-kmod", "p", "installed, kmod loaded, service active, detection fired", "p", "installed, kmod loaded, service active, detection fired"],
  ["rocky-8", "4.18", "fresh-modern_ebpf", "p", "installed, modern_ebpf loaded, service active, detection fired", "p", "installed, modern_ebpf loaded, service active, detection fired"],
  ["rocky-8", "4.18", "upgrade", "p", "installed, modern_ebpf loaded, service active, detection fired", "p", "installed, modern_ebpf loaded, service active, detection fired"],
  ["rocky-9", "5.14", "fresh-auto", "p", "installed, modern_ebpf loaded, service active, detection fired", "p", "installed, modern_ebpf loaded, service active, detection fired"],
  ["rocky-9", "5.14", "fresh-kmod", "f", "rpm %posttrans failed: kmod install failed on this Secure Boot host", "f", "rpm %posttrans failed: kmod install failed on this Secure Boot host"],
  ["rocky-9", "5.14", "fresh-modern_ebpf", "p", "installed, modern_ebpf loaded, service active, detection fired", "p", "installed, modern_ebpf loaded, service active, detection fired"],
  ["rocky-9", "5.14", "upgrade", "p", "installed, modern_ebpf loaded, service active, detection fired", "p", "installed, modern_ebpf loaded, service active, detection fired"],
  ["ubuntu-18.04", "4.15", "fresh-auto", "f", "half-configured: postinst exited at the bare falcoctl driver printenv", "f", "package configured, service never starts: systemd 237 will not load the units (ExecReload=kill -1 $MAINPID)"],
  ["ubuntu-18.04", "4.15", "fresh-kmod", "f", "half-configured: postinst exited at the bare falcoctl driver printenv", "f", "package configured, service never starts: systemd 237 will not load the units (ExecReload=kill -1 $MAINPID)"],
  ["ubuntu-18.04", "4.15", "fresh-modern_ebpf", "f", "half-configured: postinst exited at the bare falcoctl driver printenv", "u", "package configured cleanly; this kernel cannot run modern eBPF, so the service does not start"],
  ["ubuntu-18.04", "4.15", "upgrade", "f", "package configured, service never starts: systemd 237 will not load the units (ExecReload=kill -1 $MAINPID)", "f", "package configured, service never starts: systemd 237 will not load the units (ExecReload=kill -1 $MAINPID)"],
  ["ubuntu-20.04", "5.15-hwe", "fresh-auto", "p", "installed, modern_ebpf loaded, service active, detection fired", "p", "installed, modern_ebpf loaded, service active, detection fired"],
  ["ubuntu-20.04", "5.15-hwe", "fresh-kmod", "p", "installed, kmod loaded, service active, detection fired", "p", "installed, kmod loaded, service active, detection fired"],
  ["ubuntu-20.04", "5.15-hwe", "fresh-modern_ebpf", "p", "installed, modern_ebpf loaded, service active, detection fired", "p", "installed, modern_ebpf loaded, service active, detection fired"],
  ["ubuntu-20.04", "5.15-hwe", "upgrade", "p", "installed, modern_ebpf loaded, service active, detection fired", "p", "installed, modern_ebpf loaded, service active, detection fired"],
  ["ubuntu-20.04", "5.4", "fresh-auto", "f", "half-configured: postinst exited at the bare falcoctl driver printenv", "p", "installed, kmod loaded, service active, detection fired"],
  ["ubuntu-20.04", "5.4", "fresh-kmod", "f", "half-configured: postinst exited at the bare falcoctl driver printenv", "p", "installed, kmod loaded, service active, detection fired"],
  ["ubuntu-20.04", "5.4", "fresh-modern_ebpf", "f", "half-configured: postinst exited at the bare falcoctl driver printenv", "u", "package configured cleanly; this kernel cannot run modern eBPF, so the service does not start"],
  ["ubuntu-20.04", "5.4", "upgrade", "p", "installed, kmod loaded, service active, detection fired", "p", "installed, kmod loaded, service active, detection fired"],
  ["ubuntu-22.04", "5.15", "fresh-auto", "p", "installed, modern_ebpf loaded, service active, detection fired", "p", "installed, modern_ebpf loaded, service active, detection fired"],
  ["ubuntu-22.04", "5.15", "fresh-kmod", "f", "half-configured: kmod build failed against the downloaded kernel headers", "f", "half-configured: kmod build failed against the downloaded kernel headers"],
  ["ubuntu-22.04", "5.15", "fresh-modern_ebpf", "p", "installed, modern_ebpf loaded, service active, detection fired", "p", "installed, modern_ebpf loaded, service active, detection fired"],
  ["ubuntu-22.04", "5.15", "upgrade", "p", "installed, modern_ebpf loaded, service active, detection fired", "p", "installed, modern_ebpf loaded, service active, detection fired"],
  ["ubuntu-24.04", "6.8", "fresh-auto", "p", "installed, modern_ebpf loaded, service active, detection fired", "p", "installed, modern_ebpf loaded, service active, detection fired"],
  ["ubuntu-24.04", "6.8", "fresh-kmod", "p", "installed, kmod loaded, service active, detection fired", "p", "installed, kmod loaded, service active, detection fired"],
  ["ubuntu-24.04", "6.8", "fresh-modern_ebpf", "p", "installed, modern_ebpf loaded, service active, detection fired", "p", "installed, modern_ebpf loaded, service active, detection fired"],
  ["ubuntu-24.04", "6.8", "upgrade", "p", "installed, modern_ebpf loaded, service active, detection fired", "p", "installed, modern_ebpf loaded, service active, detection fired"],
];

function initGrid(root: HTMLElement) {
  const $ = (id: string) => root.querySelector<HTMLElement>("#" + id)!;
  const table = $("gr-table");
  const counts = $("gr-counts");
  const detail = $("gr-detail");
  const changed = $("gr-changed") as HTMLInputElement;
  const seg = root.querySelector<HTMLElement>('.pk-seg[data-key="build"]')!;
  let build: "rc1" | "fix" = "rc1";
  let selected = -1;

  const pairs: string[] = [];
  CELLS.forEach((c) => {
    const k = `${c[0]}|${c[1]}`;
    if (!pairs.includes(k)) pairs.push(k);
  });

  function stOf(c: Cell): St {
    return build === "rc1" ? c[3] : c[5];
  }

  function render() {
    const head =
      "<thead><tr><th>distro (kernel)</th>" +
      SCENARIOS.map((s) => `<th>${SCEN_LABEL[s]}</th>`).join("") +
      "</tr></thead>";
    const body = pairs
      .map((p) => {
        const [distro, kernel] = p.split("|");
        const tds = SCENARIOS.map((s) => {
          const i = CELLS.findIndex((c) => c[0] === distro && c[1] === kernel && c[2] === s);
          const c = CELLS[i];
          const st = stOf(c);
          const diff = c[3] !== c[5] ? " pk-diff" : "";
          const sel = i === selected ? " pk-sel" : "";
          return `<td><button class="pk-cell pk-${st}${diff}${sel}" data-i="${i}" aria-label="${distro} ${kernel} ${SCEN_LABEL[s]}: ${STATUS_LABEL[st]}">${STATUS_LABEL[st]}</button></td>`;
        }).join("");
        return `<tr><th scope="row">${distro} <span>(${kernel})</span></th>${tds}</tr>`;
      })
      .join("");
    table.innerHTML = head + "<tbody>" + body + "</tbody>";
    table.classList.toggle("pk-show-diff", changed.checked);

    const n: Record<St, number> = { p: 0, f: 0, u: 0, b: 0 };
    CELLS.forEach((c) => n[stOf(c)]++);
    counts.innerHTML = (["p", "f", "u", "b"] as St[])
      .map((s) => `<span class="pk-count pk-${s}"><b>${n[s]}</b> ${STATUS_LABEL[s]}</span>`)
      .join("");
    if (selected >= 0) showDetail(selected);
  }

  function showDetail(i: number) {
    const c = CELLS[i];
    const row = (label: string, st: St, why: string) =>
      `<div class="pk-drow"><span class="pk-tag pk-${st}">${STATUS_LABEL[st]}</span><span class="pk-dlabel">${label}</span><span>${esc(why)}</span></div>`;
    detail.innerHTML =
      `<div class="pk-dhead">${c[0]} (${c[1]}), ${SCEN_LABEL[c[2]]}</div>` +
      row("0.45.1-rc1", c[3], c[4]) +
      row("with the fix", c[5], c[6]);
  }

  table.addEventListener("click", (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>(".pk-cell");
    if (!b) return;
    selected = Number(b.dataset.i);
    render();
  });
  seg.addEventListener("click", (e) => {
    const b = (e.target as HTMLElement).closest("button");
    if (!b) return;
    seg.querySelectorAll("button").forEach((x) => x.classList.remove("on"));
    b.classList.add("on");
    build = b.dataset.v as "rc1" | "fix";
    render();
  });
  changed.addEventListener("change", render);
  render();
}

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
