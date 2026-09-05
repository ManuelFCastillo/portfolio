"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { NoteStats } from "@/components/blog/NoteStats";
import { ShareLinks } from "@/components/blog/ShareLinks";
import { UpdatedNote } from "@/components/blog/UpdatedNote";

/**
 * "The Anatomy of an Undefined Symbol" — interactive essay.
 *
 * Same architecture as RaceLab: the markup is a static article, and the one
 * interactive lab (a step-through GNU ld simulation) is wired imperatively
 * in a single effect. React renders this tree exactly once; a dataset flag
 * guards against double-wiring under dev Strict Mode.
 */
export function LinkerLab() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || root.dataset.init) return;
    root.dataset.init = "1";
    initLab(root);
  }, []);

  return (
    <article className="race-lab linker-lab" ref={rootRef}>
      <div className="wrap">
        <header className="hero">
          <div className="eyebrow"><a href="/blog">field notes</a> &middot; falcosecurity/plugins &middot; issue #1500</div>
          <h1>The Anatomy of an Undefined Symbol</h1>
          <div className="byline">Manny Castillo &middot; Lead SDET &middot; August 2026</div>
          <NoteStats slug="anatomy-of-an-undefined-symbol" variant="post" />
          <UpdatedNote slug="anatomy-of-an-undefined-symbol" />
          <ShareLinks slug="anatomy-of-an-undefined-symbol" placement="top" />
          <div className="hero-art">
            <Image
              src="/blog/undefined-symbol.png"
              alt="A chain of linked blue blocks reaching toward a missing dashed block, while an unused green block sits off to the side"
              width={1779}
              height={887}
              priority
            />
          </div>
          <p className="lede">
            A security sensor that works everywhere modern silently refuses to start on half of
            enterprise Linux. Traced from a red dashboard to a <b>two-line fix</b>, now submitted
            upstream. Along the way: one cheap experiment, four lines of <code>readelf</code>, and a
            linker you can step through yourself. Budget ~15 minutes.
          </p>
        </header>

        <div className="aside">
          Keep one question in mind through every section:{" "}
          <i>&ldquo;how can a binary that links successfully still be broken, and where does the
          breakage hide until it&rsquo;s on a customer&rsquo;s machine?&rdquo;</i>
        </div>

        <h2 id="s1"><span className="num">1.</span> A dashboard full of red</h2>
        <div className="time">~1 min &middot; read</div>
        <p>
          I run a home lab that boots real VMs with real kernels, 3.10 through 6.8, and installs{" "}
          <a href="https://falco.org">Falco</a> (
          <a href="https://github.com/falcosecurity/falco">falcosecurity/falco</a>), the CNCF runtime
          security sensor, on each one. Not
          containers: containers share the host kernel, and when the thing you&rsquo;re testing is
          kernel-dependent, a container is just the host wearing a costume. The lab measures what a
          customer would actually get. Does the package install? Does the service start? Which eBPF
          driver does it pick? Does it actually detect anything?
        </p>
        <p>
          One night the legacy tier came back all red. Five distros (Debian 11, Rocky 8, Ubuntu
          20.04, Ubuntu 18.04, CentOS 7) and Falco running on <b>zero</b> of them.
        </p>
        <p>
          The obvious read: old kernels, unsupported, done. That read was wrong on every single row.
          This post is about the most interesting one.
        </p>

        <h2 id="s2"><span className="num">2.</span> Read the journal, not the summary</h2>
        <div className="time">~2 min &middot; read</div>
        <p>
          On a kept-alive Debian 11 VM, <code>journalctl</code> showed Falco crash-looping. systemd
          restarted it every 15 seconds, forever. The actual error, identical every cycle:
        </p>
        <div className="log">{`Runtime error: cannot load plugin /usr/share/falco/plugins/libcontainer.so:
can't load plugin dynamic library: /usr/share/falco/plugins/libcontainer.so:
undefined symbol: __res_search. Exiting.`}</div>
        <p>Two things worth noticing before touching anything:</p>
        <p>
          &bull; <b>This happens before any engine opens.</b> Falco can run on modern eBPF, legacy
          eBPF, or a kernel module, and this failure kills all three identically, because plugin
          loading precedes engine selection. Which is exactly why it looks like &ldquo;this kernel is
          unsupported&rdquo; on a matrix.
          <br />
          &bull; <b>The default ruleset requires this plugin.</b> So the failure mode isn&rsquo;t
          &ldquo;container metadata unavailable.&rdquo; It&rsquo;s the sensor failing to start at
          all, with stock configuration, on Debian 11, RHEL/Rocky/Alma 8, and Ubuntu 20.04. Distros
          the package installs on without complaint.
        </p>
        <p>
          <code>__res_search</code> is a glibc resolver symbol, DNS-lookup plumbing. Why would a
          container-metadata plugin need DNS? Because it embeds a Go library (built with{" "}
          <code>-buildmode=c-archive</code>) that talks to Docker/containerd/CRI-O, and Go&rsquo;s{" "}
          <code>net</code> package, since Go 1.20, calls <code>res_search</code> from libresolv
          through cgo.
        </p>
        <p>
          So the plugin genuinely uses the symbol. The question is why the loader can&rsquo;t find
          it, and why only on some machines.
        </p>

        <h2 id="s3"><span className="num">3.</span> The one-variable experiment</h2>
        <div className="time">~2 min &middot; read</div>
        <p>
          Before reading a single line of build code, there&rsquo;s a cheap experiment that tests the
          whole hypothesis. If the problem is that a library containing <code>__res_search</code>{" "}
          never gets loaded, then forcing that library into the process should flip the result, with
          zero other changes:
        </p>
      </div>

      <div className="wide">
        <div className="lab">
          <div className="bar">
            Lab &middot; run the experiment yourself <span className="grow"></span>
            <span>same binary, one variable</span>
          </div>
          <div className="stage">
            <div className="lk-controls">
              <button className="preset primary" id="xp-stock">$ falco</button>
              <button className="preset" id="xp-preload">$ LD_PRELOAD=libresolv.so.2 falco</button>
              <button className="preset ghost" id="xp-clear">clear</button>
            </div>
            <div className="log xp-log" id="xp-out">{`// choose a command to run`}</div>
          </div>
        </div>
      </div>

      <div className="wrap">
        <p>Same binary. Same config. One environment variable. Broken to working.</p>
        <p>
          <b>What you just saw:</b> the symbol exists on this system, in{" "}
          <code>libresolv.so.2</code>, sitting right there in <code>/lib</code>. The dynamic loader
          simply never had a reason to load it. Which means the bug isn&rsquo;t in the code.
          It&rsquo;s in the binary&rsquo;s declared dependencies.
        </p>
        <p>
          (That <code>LD_PRELOAD</code> line is also a legitimate stopgap: one systemd drop-in and a
          stock broken install runs. But a workaround is a tourniquet, not a fix.)
        </p>

        <h2 id="s4"><span className="num">4.</span> Reading the binary&rsquo;s dependency list</h2>
        <div className="time">~2 min &middot; read</div>
        <p>
          Every ELF shared object carries a list of libraries it needs, the <code>DT_NEEDED</code>{" "}
          entries, which is what the dynamic loader walks at <code>dlopen</code> time. Here&rsquo;s
          the shipped plugin&rsquo;s:
        </p>
      </div>

      <div className="wide">
        <div className="lab">
          <div className="bar">
            Lab &middot; inspect the binary <span className="grow"></span>
            <span>readelf, both worlds</span>
          </div>
          <div className="stage">
            <div className="lk-controls">
              <button className="preset primary" id="re-shipped">shipped .so</button>
              <button className="preset" id="re-fixed">patched .so</button>
            </div>
            <div className="log" id="re-out"></div>
          </div>
        </div>
      </div>

      <div className="wrap">
        <p>
          There&rsquo;s the whole bug in four lines: the binary says &ldquo;I need{" "}
          <code>__res_search</code>&rdquo; and simultaneously says &ldquo;I depend on nothing that
          provides it.&rdquo; <code>libresolv</code> isn&rsquo;t in the list.
        </p>
        <p>So why does this same binary work fine on Ubuntu 24.04?</p>
        <p>
          <b>Because glibc 2.34 merged libresolv into libc.</b> On any glibc newer than 2.34,{" "}
          <code>libc.so.6</code> itself exports <code>__res_search</code> as a compatibility symbol,
          and libc is always loaded. The missing dependency is invisibly papered over on every modern
          machine. On glibc 2.28 through 2.33 (Debian 11, RHEL 8, Ubuntu 20.04), the symbol lives
          only in <code>libresolv.so.2</code>, which nobody asked for. <code>dlopen</code> fails.
        </p>
      </div>

      <div className="wide">
        <div className="lab">
          <div className="bar">
            Lab &middot; where does <code>__res_search</code> live?
            <span className="grow"></span>
            <span>drag through glibc history</span>
          </div>
          <div className="stage">
            <input
              type="range"
              id="gl-range"
              min={0}
              max={4}
              step={1}
              defaultValue={2}
              aria-label="glibc version"
            />
            <div className="gl-head" id="gl-head"></div>
            <div className="gl-boxes" id="gl-boxes"></div>
            <div className="gl-verdict" id="gl-verdict"></div>
          </div>
        </div>
      </div>

      <div className="wrap">
        <p>
          This is why the bug survived in shipped releases for a year, and why two earlier bug
          reports went stale without a fix: <b>everyone who could reproduce it was on old glibc;
          everyone who could fix it was on new.</b> Their CI even builds on Debian bullseye
          specifically to keep old-glibc compatibility, and this one missing link flag defeats the
          entire effort.
        </p>

        <h2 id="s5"><span className="num">5.</span> The mechanism: how the linker walks the line</h2>
        <div className="time">~4 min &middot; step the linker yourself</div>
        <p>
          The plugin&rsquo;s CMake, it turns out, knows about the Go resolver requirement. It even
          cites the Go release notes. And then it handles it for macOS only:
        </p>
        <div className="log">{`if(APPLE)
    find_library(RESOLV resolv REQUIRED)
    ...
    set(WORKER_DEP \${SECURITY_FRAMEWORK} \${RESOLV} \${CORE})
endif()`}</div>
        <p>
          No Linux branch. Half of a correct fix, shipped for the platform where the bug barely
          matters.
        </p>
        <p>
          So the fix is obvious: add <code>set(WORKER_DEP resolv)</code> for Linux. I did exactly
          that, rebuilt, watched the build succeed with exit code zero, and checked the result:
          <b> nothing changed.</b> The fix compiled, linked, and silently didn&rsquo;t take.
        </p>
        <p>
          To see why, you have to walk the link line the way GNU ld does: <b>a single pass, left to
          right</b>, carrying a running list of &ldquo;symbols someone needs that nobody has provided
          yet.&rdquo; Try it yourself:
        </p>
      </div>

      <div className="wide">
        <div className="lab">
          <div className="bar">
            Lab &middot; step the linker <span className="grow"></span>
            <span className="mode-switch">
              <button className="preset" id="lk-mode" data-mode="gnu">mode: GNU ld</button>
            </span>
          </div>
          <div className="stage">
            <div id="lk-line" className="lk-line" aria-label="link command line">
              <span className="lk-tok lk-fixed" data-tok="objs"><code>[plugin .o files]</code></span>
              <span className="lk-tok" data-tok="resolv"><code>-lresolv</code></span>
              <span className="lk-tok" data-tok="worker"><code>libworker.a</code></span>
            </div>
            <div className="lk-controls">
              <button className="preset primary" id="lk-step">step</button>
              <button className="preset" id="lk-run">run all</button>
              <button className="preset" id="lk-swap">swap order</button>
              <button className="preset ghost" id="lk-reset">reset</button>
            </div>
            <div className="lk-panels">
              <div className="lk-panel">
                <div className="lk-h">needed symbols</div>
                <div id="lk-needs" className="lk-list"><span className="lk-empty">(empty)</span></div>
              </div>
              <div className="lk-panel">
                <div className="lk-h">DT_NEEDED (output .so)</div>
                <div id="lk-needed" className="lk-list"><span className="lk-empty">(none yet)</span></div>
              </div>
            </div>
            <div className="log" id="lk-log">{`// press "step" to start the walk`}</div>
            <div id="lk-verdict" className="lk-verdict"></div>
          </div>
        </div>
      </div>

      <div className="wrap">
        <p>
          <b>What you just saw</b> (in the default order): the linker reaches{" "}
          <code>-lresolv</code> while the needed-list is still empty, discards it, and never goes
          back. Then <code>libworker.a</code> announces <code>__res_search</code>, too late. And
          because unresolved symbols are <b>allowed by design</b> in shared libraries (they&rsquo;re
          assumed to resolve at load time), the link exits zero and the broken artifact ships. Now
          press <b>swap order</b> and run it again. Same two ingredients, opposite outcome. Then flip
          the mode to Apple&rsquo;s ld64, where order doesn&rsquo;t matter, and you&rsquo;ll see why
          upstream never noticed: the ordering bug was unobservable on the platform the code was
          written for.
        </p>
        <p>The actual fix is therefore two lines, and the second one is the load-bearing one:</p>
        <div className="log">{`# 1. declare the dependency on Linux (mirroring the APPLE branch)
elseif(CMAKE_HOST_SYSTEM_NAME STREQUAL "Linux")
    set(WORKER_DEP resolv)

# 2. and link it AFTER the archive that needs it
-target_link_libraries(container PRIVATE ... \${WORKER_DEP} \${WORKER_LIB})
+target_link_libraries(container PRIVATE ... \${WORKER_LIB} \${WORKER_DEP})`}</div>
        <p>
          Needs before provides. Objects and archives first, the libraries that satisfy them after.
          The one-line verification that separates believing from knowing:
        </p>
        <div className="log">{`$ readelf -d libcontainer.so | grep resolv
 (NEEDED)  Shared library: [libresolv.so.2]`}</div>

        <h2 id="s6"><span className="num">6.</span> Trust, but verify, on three axes</h2>
        <div className="time">~2 min &middot; read</div>
        <p>
          A fix that changes linkage metadata touches every platform, so the verification matrix has
          to say more than &ldquo;works on my repro box&rdquo;:
        </p>
        <p>
          &bull; <b>Debian 11 (glibc 2.31):</b> was a crash loop on boot. Now: stock config runs
          under systemd, default rules load, detections fire, events are enriched.
          <br />
          &bull; <b>Ubuntu 24.04 (glibc 2.39):</b> already worked. After the patch: identical
          behavior, no regression.
          <br />
          &bull; <b>Linux aarch64:</b> builds clean, same <code>NEEDED</code> entry, symbol correctly
          versioned <code>@GLIBC_2.17</code>.
          <br />
          &bull; <b>macOS / Windows:</b> untouched by construction. The APPLE branch is unchanged and{" "}
          <code>WORKER_DEP</code> is never set on Windows.
        </p>
        <p>
          The strongest argument is structural: <b>the patch changes zero lines of code.</b> The
          plugin always called <code>res_search</code>; the fix only writes down the dependency it
          always had. The kernel-matrix lab that found the bug became the test rig that proved the
          fix. Every row above is a real VM, not a container.
        </p>
        <p>
          One honest boundary surfaced during verification: on Ubuntu 18.04 (glibc 2.27) the plugin
          fails for a different reason, <code>version &lsquo;GLIBC_2.28&rsquo; not found</code>.
          That&rsquo;s the plugin&rsquo;s build-baseline floor, and no link flag lowers it. Knowing
          exactly where a fix stops working is part of the fix.
        </p>

        <h2 id="s7"><span className="num">7.</span> Shipping it upstream</h2>
        <div className="time">~1 min &middot; read</div>
        <p>
          The failure had been reported twice before, as{" "}
          <a href="https://github.com/falcosecurity/falco/issues/3719">falco#3719</a> and{" "}
          <a href="https://github.com/falcosecurity/falco/issues/3728">falco#3728</a>, and both went
          stale and closed unfixed. Fair enough: a symptom report without a mechanism is easy to
          lose. What I filed instead:
        </p>
        <p>
          &bull; <a href="https://github.com/falcosecurity/plugins/issues/1500">falcosecurity/plugins#1500</a>:
          the mechanism (missing <code>-lresolv</code>, so no <code>DT_NEEDED</code>), the{" "}
          <code>readelf</code> receipts, the <code>LD_PRELOAD</code> experiment, the affected-distro
          list, and the stopgap.
          <br />
          &bull; <a href="https://github.com/falcosecurity/plugins/pull/1501">falcosecurity/plugins#1501</a>:
          the two-line CMake fix, DCO-signed, with a reviewer note about the link-order trap, because
          a fix that can silently fail deserves a warning label. <i>(Merged 3 September 2026.)</i>
        </p>
        <p>Eleven lines of diff. About four hundred lines of evidence. That ratio is the job.</p>

        <h2 id="s8"><span className="num">8.</span> The test that could not have existed</h2>
        <div className="time">~2 min &middot; read</div>
        <p>
          The fix merged, and the maintainer added two notes that were more interesting than the
          merge. The first explained why this bug reached a release at all:
        </p>
        <div className="note">
          <span className="lbl">leogr, on the pull request</span>
          <p>
            &ldquo;None of our CI jobs load <code>libcontainer.so</code> on a glibc &lt; 2.34 host
            (<code>build-linux</code> builds on bullseye but never dlopens the result, and
            falco-tests runs inside <code>falcosecurity/falco:master-debian</code>, i.e. Debian 12
            with glibc 2.36), so CI could not catch this.&rdquo;
          </p>
        </div>
        <p>
          Read that carefully, because it is a precise description of a blind spot rather than an
          apology. Two jobs touch this library. One <b>builds</b> it on Debian 11, glibc 2.31, old
          enough to have the bug, and never loads it. The other <b>loads</b> it, inside Debian 12,
          glibc 2.36, new enough that the bug cannot appear. Each job holds one half of the
          condition and neither holds both.
        </p>
        <p>
          That is the same shape as the bug itself. Section 5 argued that glibc 2.34 papers over the
          missing dependency wherever modern tooling runs, so the fault only surfaces where the fix
          authors are not standing. Their CI was standing in exactly the same place.
        </p>

        <h3>Making it un-reintroducible</h3>
        <p>
          A merged fix removes the bug. It does not stop the next Go or CMake change from dropping{" "}
          <code>-lresolv</code> again, silently, on a build machine where nothing will notice. So
          the follow-up matters more than the fix:{" "}
          <a href="https://github.com/falcosecurity/plugins/pull/1513">plugins#1513</a> adds two
          checks to <code>build-linux</code>, the job that was already running on bullseye and
          already had everything needed.
        </p>
        <pre className="log">{`readelf -d libcontainer.so | grep -q 'NEEDED.*libresolv\\.so\\.2'`}</pre>
        <p>
          That asserts the dependency is recorded. It is fast and its failure names the cause. But
          it only ever catches this one symptom, so the second check does the thing CI was never
          doing: compiles a small harness and <code>dlopen</code>s the built library with{" "}
          <code>RTLD_NOW</code>, on glibc 2.31, in the job that just produced it.
        </p>
        <p>
          <code>RTLD_NOW</code> rather than <code>RTLD_LAZY</code> is the whole point. Lazy binding
          defers function symbol resolution until first call, so a library missing{" "}
          <code>res_search</code> would load cleanly and fail later, somewhere less obvious. Binding
          everything at load time is what turns a latent fault into a red build.
        </p>
        <p>
          Before opening it I checked the guard rather than assuming. Built a probe library calling{" "}
          <code>res_search</code> two ways inside <code>debian:bullseye</code>:
        </p>
        <div className="log">{`glibc: ldd (Debian GLIBC 2.31-13+deb11u14) 2.31

--- built with -lresolv ---
  readelf guard: PASS
  dlopen guard : PASS

--- built without -lresolv ---
  readelf guard: FAIL
  dlopen guard : FAIL`}</div>
        <p>
          The second case is this entire post reproduced in four lines of shell. A shared object
          links happily without <code>-lresolv</code>, because undefined symbols are permitted at
          link time, and then refuses to load anywhere <code>res_search</code> still lives in
          libresolv.
        </p>
        <p>
          I wrote &ldquo;proved&rdquo; in the first version of this section. It was not proved, and
          the next section is about how I found that out.
        </p>

        <h3>Where that verification was hollow</h3>
        <p>
          The review came back <b>changes requested</b>, and it opened with something I had not
          done:
        </p>
        <div className="note">
          <span className="lbl">leogr, on the pull request</span>
          <p>
            &ldquo;I ran the two new steps against the real <code>libcontainer-amd64</code> artifact
            built from main inside <code>debian:bullseye</code>. The readelf step passes, but the
            dlopen step fails with <code>undefined symbol: pthread_mutex_trylock</code>. As is, this
            would turn the next <code>plugins/container/**</code> PR red.&rdquo;
          </p>
        </div>
        <p>
          The probe was linked with <code>-ldl</code> alone. The real plugin embeds a Go runtime that
          calls <code>pthread_*</code> and <code>dl*</code>, but declares no dependency on the
          libraries those live in. Its whole <code>DT_NEEDED</code> list is{" "}
          <code>libresolv.so.2</code>, <code>libc.so.6</code> and the loader. On glibc &lt; 2.34
          those functions sit in <code>libpthread</code> and <code>libdl</code>, exactly as{" "}
          <code>res_search</code> sat in <code>libresolv</code>.
        </p>
        <p>
          It works in production because <b>Falco already links both</b> through libsinsp, so a
          plugin loaded into that process resolves them from the global scope. My probe was a bare
          program that linked almost nothing. It handed the plugin an emptier world than it ever
          ships into, and demanded self-sufficiency the library has never needed.
        </p>
        <p>
          So the guard would have failed <i>every healthy build</i>. Not the bug it was written to
          catch. Every other one.
        </p>
        <div className="note">
          <span className="lbl">What the table above was actually worth</span>
          <p>
            Both rows are true, and together they establish half of what matters. They show the guard
            rejects a broken library. They say nothing about whether it accepts a working one,
            because the only library I ever pointed it at was one I had written to be broken.
          </p>
          <p>
            For a gate, that is the cheaper half. A check that misses a regression costs you the
            regression. A check that fires on healthy builds blocks everyone until somebody deletes
            it, and then you have neither the check nor the regression caught.
          </p>
        </div>
        <p>
          The fixture was the trap. My test object was two lines of C. The real one is 37MB with a
          language runtime inside it. <b>A fixture you build yourself contains only what you thought
          to put in it</b>, which means it can only ever test the failure you already imagined.
        </p>
        <p>
          The fix links the probe the way Falco links, so it loads the plugin under the conditions
          the plugin actually ships into:
        </p>
        <div className="log">{`-gcc -o /tmp/dlopen_check /tmp/dlopen_check.c -ldl
+gcc -o /tmp/dlopen_check /tmp/dlopen_check.c -Wl,--no-as-needed -lpthread -ldl`}</div>
        <p>
          <code>--no-as-needed</code> is load bearing. Linkers drop libraries the program does not
          itself call, and the probe never calls <code>pthread_create</code>, so a plain{" "}
          <code>-lpthread</code> would be discarded and nothing would change.
        </p>
        <p>
          Then the verification I should have run the first time, against the real artifact from the
          main branch and against the regression, using the workflow&rsquo;s steps extracted from the
          YAML rather than my approximation of them:
        </p>
        <div className="log">{`real libcontainer.so, old probe   readelf PASS   dlopen FAIL   <- false positive
real libcontainer.so, fixed probe  readelf PASS   dlopen PASS
.so missing -lresolv, fixed probe  readelf FAIL   dlopen FAIL   <- #1500 still caught`}</div>
        <p>
          The middle row is the one that was missing. The bottom row is the one that matters after
          loosening a check, because a guard relaxed until it stops crying wolf can quietly stop
          catching wolves.
        </p>
        <p>
          One more thing fell out of the review. The workflow only triggered on{" "}
          <code>plugins/container/**</code>, so the steps I added <b>never ran on the pull request
          that added them</b>. The green checks came from unrelated workflows, and I had read them as
          evidence. Adding the workflow to its own path filter fixed that, and{" "}
          <code>build-linux</code> now runs on changes to itself, which is how the corrected probe
          came to be tested on amd64 and arm64 in their CI rather than only in my container.
        </p>
        <p>
          <b>The lesson is not about linkers.</b> When a bug survives a test suite, the useful
          question is not &ldquo;why did nobody write this test&rdquo; but{" "}
          <b>&ldquo;what would this test have had to run on?&rdquo;</b> The answer here was an
          environment the project builds on constantly and never executes in. Finding a bug is
          worth something. Removing the conditions that let it hide is worth more.
        </p>
        <p>
          The question turned out to cut both ways. Their test suite never ran on an old glibc with
          the library actually loaded. My test of that suite never ran on a real library. Same
          question, one level up, and I did not think to ask it of my own work until somebody else
          did. That is the part I would keep if I could only keep one thing from this.
        </p>

        <h2 id="s9"><span className="num">9.</span> Check yourself</h2>
        <div className="time">~1 min &middot; answer before revealing</div>
        <details>
          <summary>1 &middot; A shared library links with an unresolved symbol and exit code 0. Bug or feature?</summary>
          <div className="a">
            Feature, by design, for shared objects: their symbols are assumed to resolve at load
            time. Which is exactly what makes it a great place for bugs to hide. For an executable,
            the same situation is a hard link error you&rsquo;d catch immediately.
          </div>
        </details>
        <details>
          <summary>2 &middot; <code>gcc ... -lfoo bar.a</code> where <code>bar.a</code> needs symbols from <code>libfoo</code>. What happens on GNU ld, and on Apple&rsquo;s ld64?</summary>
          <div className="a">
            GNU ld: <code>foo</code> is discarded before <code>bar.a</code> announces its needs.
            Broken output, clean exit. ld64: fine, it resolves across the whole input set regardless
            of order. Same command line, different linkers, opposite results.
          </div>
        </details>
        <details>
          <summary>3 &middot; Your fix adds a library to the link line and the build passes. What single command tells you whether the fix actually took?</summary>
          <div className="a">
            <code>readelf -d out.so | grep NEEDED</code>. Trust the dynamic table, not the exit
            code. The build system will happily produce a byte-for-byte equally broken binary with a
            green checkmark on it.
          </div>
        </details>
        <details>
          <summary>4 &middot; Why did this bug reproduce for users but never for maintainers?</summary>
          <div className="a">
            glibc 2.34 merged libresolv into libc, so every modern build and test machine papers
            over the missing dependency automatically. The bug only exists where the fix authors
            aren&rsquo;t standing.
          </div>
        </details>
        <details>
          <summary>5 &middot; A CI guard passes every test its author runs and is still wrong. What was not tested?</summary>
          <div className="a">
            That it accepts a healthy build. Testing that a check catches the bad case is the
            instinct, because that is what the check is for. The other direction is the expensive
            one: a check that misses a regression costs you the regression, while a check that
            fires on good builds blocks everyone until someone deletes it, and then you have
            neither. The trap here was the fixture. A two line shared object written to be broken
            cannot exhibit the properties of a 37MB library with a language runtime in it.
          </div>
        </details>

        <footer>
          The bug hunt happened in my{" "}
          <a href="https://github.com/ManuelFCastillo/kernel-matrix">kernel compatibility matrix</a>,
          a KVM lab that boots real kernels from 3.10 to 6.8 and characterises a security sensor on
          each: which driver it lands on, what it costs at idle, and whether it actually detects. The
          full findings write-up, including four other bugs this investigation shook loose, lives in
          the repo&rsquo;s{" "}
          <a href="https://github.com/ManuelFCastillo/kernel-matrix/blob/main/FINDINGS.md">FINDINGS.md</a>.
        </footer>
        <ShareLinks slug="anatomy-of-an-undefined-symbol" />
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* Lab wiring                                                          */
/* ------------------------------------------------------------------ */

interface Tok {
  key: string;
  label: string;
  /** symbols this input needs */
  needs: string[];
  /** symbols this input provides (shared libraries) */
  provides: string[];
  /** shared library? (eligible for DT_NEEDED / discard) */
  isLib: boolean;
}

const TOKENS: Record<string, Tok> = {
  objs: { key: "objs", label: "[plugin .o files]", needs: [], provides: [], isLib: false },
  resolv: { key: "resolv", label: "-lresolv", needs: [], provides: ["__res_search"], isLib: true },
  worker: { key: "worker", label: "libworker.a", needs: ["__res_search"], provides: [], isLib: false },
};

function initLab(root: HTMLElement) {
  const $ = (id: string) => root.querySelector<HTMLElement>("#" + id)!;
  const line = $("lk-line");
  const logEl = $("lk-log");
  const needsEl = $("lk-needs");
  const neededEl = $("lk-needed");
  const verdictEl = $("lk-verdict");
  const modeBtn = $("lk-mode");

  const order: string[] = ["objs", "resolv", "worker"];
  let pos = 0;
  let needs: string[] = [];
  let dtNeeded: string[] = [];
  let lines: string[] = [];
  let mode: "gnu" | "ld64" = "gnu";

  function tokEls(): HTMLElement[] {
    return Array.from(line.querySelectorAll<HTMLElement>(".lk-tok"));
  }

  function renderLine() {
    // reorder DOM to match `order`
    order.forEach((key) => {
      const el = line.querySelector<HTMLElement>(`[data-tok="${key}"]`);
      if (el) line.appendChild(el);
    });
  }

  function renderState() {
    needsEl.innerHTML = needs.length
      ? needs.map((n) => `<span class="lk-chip lk-und">${n}</span>`).join("")
      : '<span class="lk-empty">(empty)</span>';
    neededEl.innerHTML = dtNeeded.length
      ? dtNeeded.map((n) => `<span class="lk-chip lk-ok">${n}</span>`).join("")
      : '<span class="lk-empty">(none yet)</span>';
    logEl.textContent = lines.length ? lines.join("\n") : '// press "step" to start the walk';
  }

  function reset() {
    pos = 0;
    needs = [];
    dtNeeded = [];
    lines = [];
    verdictEl.innerHTML = "";
    tokEls().forEach((t) => t.classList.remove("lk-cur", "lk-kept", "lk-dropped"));
    renderState();
  }

  function finish() {
    const unresolved = needs.filter((n) => {
      if (mode === "ld64") {
        // ld64 resolves across the whole input set regardless of order
        return !order.some((k) => TOKENS[k].provides.includes(n));
      }
      return !dtNeeded.includes("libresolv.so.2");
    });
    if (mode === "ld64" && unresolved.length === 0 && !dtNeeded.includes("libresolv.so.2")) {
      dtNeeded.push("libresolv.so.2");
      lines.push("ld64: order-insensitive resolve pass -> libresolv KEPT");
    }
    lines.push("link complete, exit code 0   // always, for a shared object");
    renderState();
    const broken = unresolved.length > 0;
    verdictEl.innerHTML = broken
      ? `<span class="lk-v lk-bad">dlopen on glibc &lt; 2.34: FAILS &mdash; undefined symbol: __res_search</span>
         <span class="lk-v lk-warn">dlopen on glibc &ge; 2.34: works &mdash; libc's compat exports hide the hole</span>`
      : `<span class="lk-v lk-good">dlopen everywhere: works &mdash; DT_NEEDED brings libresolv.so.2 in</span>`;
  }

  function step() {
    if (pos >= order.length) return;
    tokEls().forEach((t) => t.classList.remove("lk-cur"));
    const key = order[pos];
    const tok = TOKENS[key];
    const el = line.querySelector<HTMLElement>(`[data-tok="${key}"]`)!;
    el.classList.add("lk-cur");

    if (tok.isLib) {
      const satisfies = tok.provides.filter((p) => needs.includes(p));
      if (mode === "gnu" && satisfies.length === 0) {
        el.classList.add("lk-dropped");
        lines.push(`${tok.label}: satisfies nothing on the needed-list -> DISCARDED`);
      } else {
        el.classList.add("lk-kept");
        needs = needs.filter((n) => !tok.provides.includes(n));
        if (!dtNeeded.includes("libresolv.so.2")) dtNeeded.push("libresolv.so.2");
        lines.push(
          mode === "gnu"
            ? `${tok.label}: provides __res_search (needed) -> KEPT, DT_NEEDED recorded`
            : `${tok.label}: ld64 defers judgement -> kept for final resolve`,
        );
      }
    } else if (tok.needs.length) {
      needs = [...new Set([...needs, ...tok.needs])];
      lines.push(`${tok.label}: references ${tok.needs.join(", ")} -> added to needed-list (UND)`);
    } else {
      lines.push(`${tok.label}: no resolver references -> needed-list unchanged`);
    }

    pos += 1;
    renderState();
    if (pos >= order.length) finish();
  }

  $("lk-step").addEventListener("click", step);
  $("lk-run").addEventListener("click", () => {
    reset();
    while (pos < order.length) step();
  });
  $("lk-swap").addEventListener("click", () => {
    const i = order.indexOf("resolv");
    const j = order.indexOf("worker");
    [order[i], order[j]] = [order[j], order[i]];
    renderLine();
    reset();
  });
  $("lk-reset").addEventListener("click", reset);
  modeBtn.addEventListener("click", () => {
    mode = mode === "gnu" ? "ld64" : "gnu";
    modeBtn.textContent = mode === "gnu" ? "mode: GNU ld" : "mode: Apple ld64";
    reset();
  });

  renderLine();
  renderState();

  /* ---- lab: the LD_PRELOAD experiment, runnable ---- */
  const xpOut = root.querySelector<HTMLElement>("#xp-out");
  let xpBusy = false;
  const XP: Record<string, { cmd: string; lines: [string, string][] }> = {
    stock: {
      cmd: "$ falco -o engine.kind=modern_ebpf",
      lines: [
        ["Falco version: 0.44.1 (x86_64)", ""],
        ["Falco initialized with configuration files:", ""],
        ["   /etc/falco/falco.yaml | schema validation: ok", ""],
        ["Loading rules from: /etc/falco/falco_rules.yaml | ok", ""],
        [
          "Runtime error: cannot load plugin /usr/share/falco/plugins/libcontainer.so: undefined symbol: __res_search. Exiting.",
          "xp-bad",
        ],
        ["[exit code 1]", "xp-bad"],
      ],
    },
    preload: {
      cmd: "$ LD_PRELOAD=/lib/x86_64-linux-gnu/libresolv.so.2 falco -o engine.kind=modern_ebpf",
      lines: [
        ["Falco version: 0.44.1 (x86_64)", ""],
        ["Falco initialized with configuration files:", ""],
        ["   /etc/falco/falco.yaml | schema validation: ok", ""],
        ["Loading rules from: /etc/falco/falco_rules.yaml | ok", ""],
        ["Loaded event sources: syscall", ""],
        ["Opening 'syscall' source with modern BPF probe.", "xp-good"],
        ["[running]", "xp-good"],
      ],
    },
  };
  function runXp(which: string) {
    if (xpBusy || !xpOut) return;
    xpBusy = true;
    const job = XP[which];
    xpOut.innerHTML = `<span class="kw">${job.cmd}</span>\n`;
    job.lines.forEach(([line, cls], i) => {
      setTimeout(() => {
        const span = document.createElement("span");
        if (cls) span.className = cls;
        span.textContent = line + "\n";
        xpOut!.appendChild(span);
        if (i === job.lines.length - 1) xpBusy = false;
      }, 240 * (i + 1));
    });
  }
  root.querySelector("#xp-stock")?.addEventListener("click", () => runXp("stock"));
  root.querySelector("#xp-preload")?.addEventListener("click", () => runXp("preload"));
  root.querySelector("#xp-clear")?.addEventListener("click", () => {
    if (!xpBusy && xpOut) xpOut.textContent = "// choose a command to run";
  });

  /* ---- lab: readelf inspector ---- */
  const reOut = root.querySelector<HTMLElement>("#re-out");
  function renderRe(fixed: boolean) {
    if (!reOut) return;
    reOut.innerHTML = [
      '<span class="kw">$ readelf -d libcontainer.so | grep NEEDED</span>',
      fixed
        ? ' <span class="re-add">(NEEDED)  Shared library: [libresolv.so.2]</span>'
        : null,
      " (NEEDED)  Shared library: [libc.so.6]",
      " (NEEDED)  Shared library: [ld-linux-x86-64.so.2]",
      "",
      '<span class="kw">$ readelf --dyn-syms -W libcontainer.so | grep res_search</span>',
      fixed
        ? ' 34: 0000000000000000  0 FUNC  GLOBAL DEFAULT  UND <span class="re-add">__res_search@GLIBC_2.2.5</span>'
        : ' 113: 0000000000000000  0 NOTYPE  GLOBAL DEFAULT  UND __res_search',
      fixed
        ? '<span class="re-note">// dependency declared, symbol versioned: dlopen resolves it anywhere</span>'
        : '<span class="re-note">// needs the symbol, depends on nothing that provides it</span>',
    ]
      .filter((l) => l !== null)
      .join("\n");
    root.querySelector("#re-shipped")?.classList.toggle("primary", !fixed);
    root.querySelector("#re-fixed")?.classList.toggle("primary", fixed);
  }
  renderRe(false);
  root.querySelector("#re-shipped")?.addEventListener("click", () => renderRe(false));
  root.querySelector("#re-fixed")?.addEventListener("click", () => renderRe(true));

  /* ---- lab: glibc timeline ---- */
  const STOPS = [
    { v: "2.27", d: "Ubuntu 18.04" },
    { v: "2.28", d: "RHEL 8 · Rocky 8 · Alma 8" },
    { v: "2.31", d: "Debian 11 · Ubuntu 20.04" },
    { v: "2.35", d: "Ubuntu 22.04" },
    { v: "2.39", d: "Ubuntu 24.04" },
  ];
  const glHead = root.querySelector<HTMLElement>("#gl-head");
  const glBoxes = root.querySelector<HTMLElement>("#gl-boxes");
  const glVerdict = root.querySelector<HTMLElement>("#gl-verdict");
  function renderGl(i: number) {
    if (!glHead || !glBoxes || !glVerdict) return;
    const stop = STOPS[i];
    const merged = parseFloat(stop.v) >= 2.34;
    glHead.innerHTML = `glibc <b>${stop.v}</b> &nbsp;·&nbsp; ${stop.d}`;
    glBoxes.innerHTML = `
      <div class="gl-box">
        <div class="gl-t">libresolv.so.2</div>
        <span class="gl-chip">__res_search</span>
        <div class="gl-note">${merged ? "kept as a compat stub" : "the only home of the symbol"}</div>
      </div>
      <div class="gl-box${merged ? " gl-hot" : ""}">
        <div class="gl-t">libc.so.6 <span class="gl-always">always loaded</span></div>
        ${merged ? '<span class="gl-chip">__res_search</span>' : '<span class="gl-none">(no resolver symbols)</span>'}
        <div class="gl-note">${merged ? "libresolv was merged in with 2.34" : "resolver not merged yet"}</div>
      </div>`;
    glVerdict.innerHTML = merged
      ? '<span class="xp-good">dlopen(libcontainer.so): works — libc papers over the missing dependency</span>'
      : '<span class="xp-bad">dlopen(libcontainer.so): FAILS — undefined symbol: __res_search</span>';
  }
  const glRange = root.querySelector<HTMLInputElement>("#gl-range");
  glRange?.addEventListener("input", () => renderGl(Number(glRange.value)));
  renderGl(2);
}
