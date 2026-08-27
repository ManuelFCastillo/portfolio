"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { NoteStats } from "@/components/blog/NoteStats";

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
        <div className="log">{`$ falco -o engine.kind=modern_ebpf
Runtime error: cannot load plugin ... undefined symbol: __res_search. Exiting.

$ LD_PRELOAD=/lib/x86_64-linux-gnu/libresolv.so.2 falco -o engine.kind=modern_ebpf
...
Opening 'syscall' source with modern BPF probe.`}</div>
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
        <div className="log">{`$ readelf -d libcontainer.so | grep NEEDED
 (NEEDED)  Shared library: [libc.so.6]
 (NEEDED)  Shared library: [ld-linux-x86-64.so.2]

$ readelf --dyn-syms -W libcontainer.so | grep -w UND | grep res_search
 113: 0000000000000000  0 NOTYPE  GLOBAL DEFAULT  UND __res_search`}</div>
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
          a fix that can silently fail deserves a warning label. <i>(Status: open, pending maintainer
          review.)</i>
        </p>
        <p>Eleven lines of diff. About four hundred lines of evidence. That ratio is the job.</p>

        <h2 id="s8"><span className="num">8.</span> Check yourself</h2>
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

        <footer>
          The bug hunt happened in my{" "}
          <a href="https://github.com/ManuelFCastillo/kernel-matrix">kernel compatibility matrix</a>,
          a KVM lab that boots real kernels from 3.10 to 6.8 and characterises a security sensor on
          each: which driver it lands on, what it costs at idle, and whether it actually detects. The
          full findings write-up, including four other bugs this investigation shook loose, lives in
          the repo&rsquo;s{" "}
          <a href="https://github.com/ManuelFCastillo/kernel-matrix/blob/main/FINDINGS.md">FINDINGS.md</a>.
        </footer>
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
}
