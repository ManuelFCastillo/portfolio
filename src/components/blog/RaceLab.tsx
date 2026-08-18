"use client";

import { useEffect, useRef } from "react";

/**
 * "The Anatomy of a Race Condition" — interactive essay.
 *
 * The markup is a static article; the demos are wired imperatively in one
 * effect (ported from the tested standalone version). React renders this
 * tree exactly once, so direct DOM manipulation inside the labs is safe;
 * a dataset flag guards against double-wiring under dev Strict Mode.
 */
export function RaceLab() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || root.dataset.init) return;
    root.dataset.init = "1";
    initLabs(root);
  }, []);

  return (
    <article className="race-lab" ref={rootRef}>
      <div className="wrap">
        <header className="hero">
          <div className="eyebrow">field notes &middot; sugarlabs/musicblocks &middot; issue #8069</div>
          <h1>The Anatomy of a Race Condition</h1>
          <div className="byline">Manny Castillo &middot; Lead SDET &middot; August 2026</div>
          <p className="lede">
            While contributing to Music Blocks &mdash; Sugar Labs&rsquo; music-education app &mdash; I traced
            a console error to a positioning patch that silently failed on slow loads. Inside that one small
            fix live <b>seven JavaScript mechanisms</b> every working engineer leans on daily. This lab
            teaches each one with code you can poke. Budget 20&ndash;30 minutes.
          </p>
        </header>

        <h2 id="s1"><span className="num">1.</span> The cast of characters</h2>
        <div className="time">~2 min &middot; read</div>
        <p>
          Music Blocks has a <b>search box</b> for finding programming blocks. When you type, a{" "}
          <b>dropdown</b> of suggestions appears. Three facts set up everything that follows:
        </p>
        <p>
          &bull; The dropdown is <b>not inside</b> the search box &mdash; it&rsquo;s a separate element
          attached to the end of the page. Something must calculate where to draw it.
          <br />
          &bull; The search widget is created <b>late</b> in startup, after palettes and instrument sounds
          load &mdash; anywhere from 3 to 60+ seconds in.
          <br />
          &bull; The positioning code lived in a <b>different file</b> that could not know when the widget
          would exist &mdash; so it guessed, with a timer.
        </p>
        <div className="aside">
          Keep one question in mind through every section:{" "}
          <i>&ldquo;how does this code know the thing it needs is ready?&rdquo;</i> That question is the
          whole bug.
        </div>

        <h2 id="s2"><span className="num">2.</span> Measuring the screen: <code>getBoundingClientRect()</code></h2>
        <div className="time">~3 min &middot; drag the box</div>
        <p>
          Every element can tell you where it currently sits <b>in the viewport</b> (the visible window),
          via <code>element.getBoundingClientRect()</code>. The fix calls it on the search box every time
          the dropdown renders, then pins the dropdown to those live numbers.
        </p>
      </div>

      <div className="wide">
        <div className="lab">
          <div className="bar">
            Lab &middot; live rectangle <span className="grow"></span>
            <span>drag the blue box</span>
          </div>
          <div className="stage">
            <div id="rect-arena">
              <div id="rect-box" tabIndex={0}>search box</div>
            </div>
            <div id="rect-read">
              <div><b>left</b><span id="rr-l">&ndash;</span></div>
              <div><b>top</b><span id="rr-t">&ndash;</span></div>
              <div><b>bottom</b><span id="rr-b">&ndash;</span></div>
              <div><b>width</b><span id="rr-w">&ndash;</span></div>
            </div>
            <div className="log">{`// the fix, in miniature:
dropdown.style.left = rect.left + "px";
dropdown.style.top  = rect.bottom + 2 + "px";   // 2px gap below the box
dropdown.style.width = rect.width + "px";`}</div>
          </div>
        </div>
      </div>

      <div className="wrap">
        <p>
          Notice the numbers change <i>as you drag</i>. That&rsquo;s the key property: the rect is a{" "}
          <b>fresh measurement</b>, not a stored value. Code that re-measures can never be stale; code that
          measures once can.
        </p>

        <h2 id="s3"><span className="num">3.</span> Two coordinate systems: <code>absolute</code> vs <code>fixed</code></h2>
        <div className="time">~5 min &middot; scroll inside the frame</div>
        <p>
          CSS gives you two different answers to &ldquo;where should this element go?&rdquo;{" "}
          <code>position:&nbsp;absolute</code> pins it to a spot <b>in the page</b> &mdash; scroll the page,
          and it rides along. <code>position:&nbsp;fixed</code> pins it to a spot <b>on the glass</b> &mdash;
          the page moves underneath it.
        </p>
        <p>
          Music Blocks&rsquo; search palette floats on the glass (like <code>fixed</code>), but jQuery
          UI&rsquo;s default dropdown is positioned in the page (like <code>absolute</code>). While nothing
          moves they agree. The moment the page scrolls or the layout shifts, they disagree &mdash; and the
          dropdown visibly detaches. Try it:
        </p>
      </div>

      <div className="wide">
        <div className="lab">
          <div className="bar">
            Lab &middot; the detaching dropdown
            <span className="grow"></span>
            <span className="mode-switch" role="group" aria-label="positioning strategy">
              <button id="pos-default" className="sel">default (in-page)</button>
              <button id="pos-patched">patched (on-glass)</button>
            </span>
          </div>
          <div className="stage">
            <div id="pos-frame">
              <div id="pos-scroll">
                <div id="pos-page">
                  <div className="ghost"></div><div className="ghost"></div><div className="ghost"></div>
                  <div className="ghost"></div><div className="ghost"></div><div className="ghost"></div>
                  <div className="ghost"></div><div className="ghost"></div>
                </div>
              </div>
              <div id="pos-palette">
                <div className="pal-label">palette (floats on glass)</div>
                <div id="pos-input">pitch</div>
              </div>
            </div>
            <div id="pos-status">
              Dropdown is <b id="pos-drift">0</b>px away from the search box.{" "}
              <span id="pos-verdict" className="tag okt">attached</span>
            </div>
          </div>
        </div>
      </div>

      <div className="wrap">
        <p>
          <b>What you just saw:</b> in default mode the dropdown scrolled away with the page content,
          because its position was computed once in page coordinates. In patched mode it re-measures the box
          on the glass and uses <code>fixed</code>, so scrolling cannot separate them. This is the entire{" "}
          <i>visual</i> payoff of the fix &mdash; and why a previous contributor wrote the patch in the
          first place.
        </p>

        <h2 id="s4"><span className="num">4.</span> jQuery in ten minutes of honesty</h2>
        <div className="time">~4 min &middot; run each snippet</div>
        <p>
          jQuery predates most modern browser APIs. Its core trick: <code>jQuery(&quot;#search&quot;)</code>{" "}
          (or <code>$(&quot;#search&quot;)</code>) finds elements and wraps them in an object bristling with
          methods. jQuery&nbsp;UI adds ready-made <b>widgets</b> &mdash; autocomplete among them &mdash;
          that store their live instance on the element via <code>.data()</code>. The demos below run
          against a <b>20-line reimplementation</b> so you can see there&rsquo;s no magic:
        </p>
      </div>

      <div className="wide">
        <div className="lab">
          <div className="bar">Lab &middot; mini-jQuery playground</div>
          <div className="stage">
            <div id="jq-box">#demo-box</div>
            <div className="snips">
              <div className="snip">
                <code>$(&quot;#demo-box&quot;).length</code>
                <button data-run="1">Run</button>
                <div className="out" id="jq-o1"></div>
              </div>
              <div className="snip">
                <code>$(&quot;#demo-box&quot;).css(&quot;background&quot;, ...)</code>
                <button data-run="2">Run</button>
                <div className="out" id="jq-o2"></div>
              </div>
              <div className="snip">
                <code>$(&quot;#demo-box&quot;).data(&quot;ui-autocomplete&quot;)</code>
                <button data-run="3">Run</button>
                <div className="out" id="jq-o3"></div>
              </div>
              <div className="snip">
                <code>$(&quot;#demo-box&quot;).autocomplete({"{"} source: [...] {"}"})&nbsp;&nbsp;<span className="cm">{"//"} create widget</span></code>
                <button data-run="4">Run</button>
                <div className="out" id="jq-o4"></div>
              </div>
              <div className="snip">
                <code>$(&quot;#nope&quot;).length</code>
                <button data-run="5">Run</button>
                <div className="out" id="jq-o5"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="wrap">
        <p>
          Run snippet 3 <i>before and after</i> snippet 4. Before: <code>undefined</code> &mdash; no widget
          exists yet. After: an object. <b>That exact check</b> &mdash; &ldquo;does{" "}
          <code>.data(&quot;ui-autocomplete&quot;)</code> return anything?&rdquo; &mdash; is what the old
          polling code asked twenty times, and what the fixed function asks once, at the right moment.
          Snippet 5 shows jQuery&rsquo;s quiet failure mode: selecting nothing isn&rsquo;t an error, just an
          empty wrapper &mdash; which is why guard clauses check <code>.length</code>.
        </p>

        <h2 id="s5"><span className="num">5.</span> Monkey-patching &amp; idempotency</h2>
        <div className="time">~4 min &middot; wrap the method</div>
        <p>
          The positioning fix works by <b>replacing a method on the live widget</b>: save the original{" "}
          <code>_renderMenu</code>, substitute a wrapper that calls the original and then adds positioning.
          That&rsquo;s monkey-patching &mdash; powerful, and dangerous in one specific way:{" "}
          <b>wrap twice and your addition runs twice</b>. Every layer of wrapping is another onion skin that
          never comes off.
        </p>
      </div>

      <div className="wide">
        <div className="lab">
          <div className="bar">
            Lab &middot; the wrapping onion
            <span className="grow"></span>
            <button id="on-render" className="primary">renderMenu()</button>
            <button id="on-wrap">patch (no guard)</button>
            <button id="on-wrap-g">patch (guarded)</button>
            <button id="on-reset">reset</button>
          </div>
          <div className="stage">
            <div id="onion">
              <div id="onion-vis"><div id="onion-core">_renderMenu</div></div>
              <div id="onion-info">
                Wrap depth: <b id="on-depth">0</b> &middot; guard flag: <b id="on-flag">unset</b>
              </div>
            </div>
            <div className="log" id="on-log">{`// click "patch", then renderMenu(). Then patch again and re-render.`}</div>
          </div>
        </div>
      </div>

      <div className="wrap">
        <p>
          With no guard, each patch adds a ring, and one render positions the dropdown once <i>per ring</i>{" "}
          &mdash; harmless-looking today, a performance leak and a debugging nightmare later. The guarded
          version stamps a flag on the instance (<code>_mbPositionFixApplied</code>) and refuses to re-wrap:
          call it a hundred times, one ring. A function that&rsquo;s safe to call repeatedly is called{" "}
          <b>idempotent</b> &mdash; and a reviewer on the competing PR asked for precisely this guard.
        </p>

        <h2 id="s6"><span className="num">6.</span> Why <code>setTimeout(..., 0)</code> isn&rsquo;t zero</h2>
        <div className="time">~3 min &middot; run it</div>
        <p>
          Inside the patch there&rsquo;s a strange line: the positioning happens in{" "}
          <code>setTimeout(&hellip;, 0)</code>. Zero milliseconds &mdash; so, immediately? No. JavaScript
          runs one thing at a time; a timeout callback, even at 0ms, is placed in a <b>queue</b> and runs
          only after the current work finishes. That&rsquo;s the point: let jQuery UI completely finish
          laying out the menu, <i>then</i> apply our coordinates so nothing overwrites them.
        </p>
      </div>

      <div className="wide">
        <div className="lab">
          <div className="bar">
            Lab &middot; run to the end, then the queue <span className="grow"></span>
            <button id="el-run" className="primary">Run</button>
          </div>
          <div className="stage">
            <pre><code>{`log("A: draw the suggestion list");
setTimeout(() => log("C: pin dropdown to the box"), 0);
log("B: jQuery UI finishes its own layout");`}</code></pre>
            <div id="el-cols">
              <div className="el-col"><h4>runs now (call stack)</h4><div id="el-now"></div></div>
              <div className="el-col"><h4>queued for after</h4><div id="el-q"></div></div>
            </div>
            <div className="log" id="el-log">{`// output appears here`}</div>
          </div>
        </div>
      </div>

      <div className="wrap">
        <p>
          The order is always A, B, C &mdash; C last, even at &ldquo;0ms.&rdquo; Engineers say the callback
          runs &ldquo;on the next tick.&rdquo; One mechanism, two very different uses in this story: here
          it&rsquo;s used <i>correctly</i> (defer until current work completes); in the next section it was
          used as a <i>guess about the future</i> &mdash; and that&rsquo;s where it breaks.
        </p>

        <h2 id="s7"><span className="num">7.</span> The race, playable</h2>
        <div className="time">~5 min &middot; the centerpiece</div>
        <p>
          The old code needed the widget to exist before patching it. Its strategy: start 1 second after
          page load, check every half-second, give up after 20 tries (~11s total) and log an error. The
          app, meanwhile, creates the widget whenever startup finishes &mdash; 3 seconds on a warm cache,
          40+ on classroom Wi-Fi. Two independent timelines, no coordination: a <b>race condition</b>. Drag
          the slider; press play.
        </p>
      </div>

      <div className="wide">
        <div className="lab">
          <div className="bar">
            Lab &middot; poller vs. startup
            <span className="grow"></span>
            <span className="mode-switch" role="group" aria-label="strategy">
              <button id="race-m-poll" className="sel">old: polling</button>
              <button id="race-m-fix">fix: event-driven</button>
            </span>
          </div>
          <div className="stage">
            <div id="race-controls">
              <label htmlFor="race-slider">
                app startup takes <span id="race-t">12</span>s
              </label>
              <input type="range" id="race-slider" min={2} max={45} defaultValue={12} step={1} aria-label="startup time in seconds" />
              <button className="preset" data-t="3">3s warm cache</button>
              <button className="preset" data-t="12">12s Fast 4G</button>
              <button className="preset" data-t="40">40s cold 3G</button>
              <button id="race-play-btn" className="primary">&#9654; Play</button>
            </div>
            <div id="race-track">
              <div className="lane-label" style={{ top: "18px" }}>poller (checks every 0.5s, 20 tries)</div>
              <div className="lane-label" style={{ top: "68px" }}>app startup &rarr; widget created</div>
              <div id="race-play"></div>
              <div id="race-loadbar"></div>
              <div id="race-widget"></div>
              <div id="race-deadline"></div>
            </div>
            <div id="race-result"></div>
          </div>
        </div>
      </div>

      <div className="wrap">
        <p>
          At 3s the poller wins and everything works &mdash; which is exactly why this bug shipped: it
          passed on every developer&rsquo;s fast machine. At 12s and beyond the poller dies before the
          widget is born, and no code path ever revisits the question. Now switch to{" "}
          <b>fix: event-driven</b> and replay any speed. There is no poller lane at all: the patch is called
          by the same code that creates the widget, so it fires at the exact moment of creation &mdash; the
          race isn&rsquo;t won, it&rsquo;s <i>deleted</i>.
        </p>
        <div className="aside">
          <b>The engineering lesson of the whole lab:</b> when code needs to run after an event, attach it{" "}
          <i>to the event</i>, not to a clock. Timers encode a guess about how fast the world is; guesses
          about speed are the bugs that only appear on someone else&rsquo;s machine.
        </div>

        <h2 id="s8"><span className="num">8.</span> The actual fix, annotated</h2>
        <div className="time">~3 min &middot; read</div>
        <p>Everything above compresses into this diff:</p>
        <pre><code>
          <span className="cm">{"// BEFORE — jquery-setup.js guessed with a timer:"}</span>{"\n"}
          <span className="old-c">{`setTimeout(fixAutocompletePosition, 1000);   // start guessing
// ...checks 20x, every 500ms, then:
console.error("Autocomplete setup failed…");  // gives up forever`}</span>{"\n\n"}
          <span className="cm">{"// AFTER — jquery-setup.js just defines a capability:"}</span>{"\n"}
          <span className="ok-c">{`window.fixSearchAutocompletePosition = function () {
    if (!$search.length || !$search.data("ui-autocomplete")) return false;  // §4 guards
    if (!instance || instance._mbPositionFixApplied) return false;          // §5 idempotency
    instance._renderMenu = function (ul, items) {          // §5 monkey-patch
        originalRenderMenu.call(this, ul, items);
        setTimeout(() => {                                  // §6 next tick
            const rect = searchInput.getBoundingClientRect(); // §2 fresh measure
            dropdown.style.position = "fixed";               // §3 on-glass coords
            ...
        }, 0);
    };
    instance._mbPositionFixApplied = true;
    return true;
};`}</span>{"\n\n"}
          <span className="cm">{"// AFTER — search-controller.js calls it at the birthplace of the widget:"}</span>{"\n"}
          <span className="ok-c">{`$search.autocomplete({ ... });                       // widget is created HERE…
if (typeof window.fixSearchAutocompletePosition === "function") {
    window.fixSearchAutocompletePosition();          // …so patch it HERE — §7, race deleted
}`}</span>
        </code></pre>
        <p>Every line now traces back to a mechanism you&rsquo;ve poked with your own hands.</p>

        <h2 id="s9"><span className="num">9.</span> Check yourself</h2>
        <div className="time">~4 min &middot; answer before revealing</div>
        <details>
          <summary>1 &middot; The dropdown never appeared at all for slow-loading users. True or false?</summary>
          <div className="a">
            False &mdash; and this distinction matters in bug reports. The dropdown always appeared with all
            its items; jQuery UI&rsquo;s default positioning drew it in approximately the right place. What
            failed silently was the <i>re-anchoring patch</i>, so the dropdown could drift once the page
            scrolled or the layout shifted. No feature was lost; a safeguard was.
          </div>
        </details>
        <details>
          <summary>2 &middot; Why not just increase the retries from 20 to 200?</summary>
          <div className="a">
            Because that changes the guess, not the design. Some machine somewhere is always slower than
            your budget (and 200 retries costs 100 seconds of background timers on every fast load, for
            nothing). The categorical fix is to remove the guess: run the patch from the code that creates
            the widget, so timing can&rsquo;t matter at all.
          </div>
        </details>
        <details>
          <summary>3 &middot; What breaks if you call the unguarded patch function twice?</summary>
          <div className="a">
            Each call wraps the current <code>_renderMenu</code> &mdash; including the previous wrapper. Two
            calls means every render runs the positioning logic twice; N calls, N times. The guard
            (<code>_mbPositionFixApplied</code> stamped on the instance) makes the second call return{" "}
            <code>false</code> without touching anything &mdash; idempotency.
          </div>
        </details>
        <details>
          <summary>4 &middot; Why does the patch position the dropdown inside <code>setTimeout(&hellip;, 0)</code>?</summary>
          <div className="a">
            Because when the wrapper runs, jQuery UI hasn&rsquo;t finished its own menu layout yet &mdash;
            set coordinates synchronously and the library&rsquo;s positioning would run after us and
            overwrite them. Queuing at 0ms means &ldquo;after the current work completes,&rdquo; so our
            coordinates land last and stick.
          </div>
        </details>
        <details>
          <summary>5 &middot; A competing PR inlines the same 15 lines in two files instead of sharing one function. Name one cost and one benefit.</summary>
          <div className="a">
            Cost: duplication &mdash; the copies can drift apart under future edits, and one copy patches a
            code path that appears to have no callers (dead code). Benefit: zero coupling &mdash; each init
            site is self-contained with no <code>window</code> global. Neither answer is stupid; engineering
            is choosing which cost you&rsquo;d rather carry. (The fix I submitted &mdash; PR #8099 &mdash;
            chose the single guarded function.)
          </div>
        </details>

        <footer>
          Written from a real contribution:{" "}
          <a href="https://github.com/sugarlabs/musicblocks/issues/8069">issue #8069</a>, which I filed and
          then fixed in <a href="https://github.com/sugarlabs/musicblocks/pull/8099">PR #8099</a> (a
          competing take lives in <a href="https://github.com/sugarlabs/musicblocks/pull/8085">PR #8085</a>{" "}
          &mdash; quiz question 5 weighs the two). Files touched:{" "}
          <code>js/utils/jquery-setup.js</code>, <code>js/activity/search-controller.js</code>.
        </footer>
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* Demo wiring — ported from the tested standalone lab.               */
/* ------------------------------------------------------------------ */

function initLabs(root: HTMLElement) {
  const RM = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $id = (id: string) => root.querySelector<HTMLElement>("#" + id)!;

  /* ---------- §2 rect demo ---------- */
  const arena = $id("rect-arena");
  const box = $id("rect-box");
  let bx = 24;
  let by = 30;
  function placeBox() {
    const aw = arena.clientWidth - box.offsetWidth;
    const ah = arena.clientHeight - box.offsetHeight;
    bx = Math.max(0, Math.min(aw, bx));
    by = Math.max(0, Math.min(ah, by));
    box.style.left = bx + "px";
    box.style.top = by + "px";
    const a = arena.getBoundingClientRect();
    const r = box.getBoundingClientRect();
    $id("rr-l").textContent = Math.round(r.left - a.left) + "px";
    $id("rr-t").textContent = Math.round(r.top - a.top) + "px";
    $id("rr-b").textContent = Math.round(r.bottom - a.top) + "px";
    $id("rr-w").textContent = Math.round(r.width) + "px";
  }
  placeBox();
  let drag: { x: number; y: number } | null = null;
  box.addEventListener("pointerdown", (e) => {
    drag = { x: e.clientX - bx, y: e.clientY - by };
    box.setPointerCapture(e.pointerId);
    e.preventDefault();
  });
  box.addEventListener("pointermove", (e) => {
    if (!drag) return;
    bx = e.clientX - drag.x;
    by = e.clientY - drag.y;
    placeBox();
  });
  box.addEventListener("pointerup", () => { drag = null; });
  box.addEventListener("keydown", (e) => {
    const step = 12;
    if (e.key === "ArrowLeft") bx -= step;
    else if (e.key === "ArrowRight") bx += step;
    else if (e.key === "ArrowUp") by -= step;
    else if (e.key === "ArrowDown") by += step;
    else return;
    e.preventDefault();
    placeBox();
  });
  addEventListener("resize", placeBox);

  /* ---------- §3 positioning demo ---------- */
  const frame = $id("pos-frame");
  const scroller = $id("pos-scroll");
  const page = $id("pos-page");
  const input = $id("pos-input");
  let mode = "default";
  const dd = document.createElement("div");
  dd.className = "dropdown";
  dd.innerHTML = "<div>pitch</div><div>pitch number</div><div>set pitch</div>";
  function openDropdown() {
    if (dd.parentNode) dd.parentNode.removeChild(dd);
    const ir = input.getBoundingClientRect();
    if (mode === "default") {
      const pr = page.getBoundingClientRect();
      dd.style.position = "absolute";
      dd.style.left = ir.left - pr.left + "px";
      dd.style.top = ir.bottom - pr.top + 2 + "px";
      page.appendChild(dd);
    } else {
      const fr = frame.getBoundingClientRect();
      dd.style.position = "absolute";
      dd.style.left = ir.left - fr.left + "px";
      dd.style.top = ir.bottom - fr.top + 2 + "px";
      frame.appendChild(dd);
    }
    updateDrift();
  }
  function updateDrift() {
    const ir = input.getBoundingClientRect();
    const dr = dd.getBoundingClientRect();
    const drift = Math.round(Math.hypot(dr.left - ir.left, dr.top - (ir.bottom + 2)));
    $id("pos-drift").textContent = String(drift);
    const v = $id("pos-verdict");
    if (drift < 4) { v.className = "tag okt"; v.textContent = "attached"; }
    else { v.className = "tag oldt"; v.textContent = "detached!"; }
  }
  scroller.addEventListener("scroll", () => {
    if (mode === "patched") openDropdown(); else updateDrift();
  });
  $id("pos-default").addEventListener("click", function (this: HTMLElement) {
    mode = "default";
    this.classList.add("sel");
    $id("pos-patched").classList.remove("sel");
    openDropdown();
  });
  $id("pos-patched").addEventListener("click", function (this: HTMLElement) {
    mode = "patched";
    this.classList.add("sel");
    $id("pos-default").classList.remove("sel");
    openDropdown();
  });
  openDropdown();

  /* ---------- §4 mini jquery ---------- */
  type WidgetEl = HTMLElement & { _widgetData?: Record<string, unknown> };
  class Mini {
    el: WidgetEl | null;
    length: number;
    constructor(sel: string) {
      this.el = root.querySelector<WidgetEl>(sel);
      this.length = this.el ? 1 : 0;
    }
    css(k: string, v: string) { if (this.el) this.el.style.setProperty(k, v); return this; }
    data(k: string) { return this.el ? (this.el._widgetData || {})[k] : undefined; }
    autocomplete(opts: unknown) {
      if (this.el) {
        this.el._widgetData = this.el._widgetData || {};
        this.el._widgetData["ui-autocomplete"] = { options: opts, _renderMenu: () => {} };
      }
      return this;
    }
  }
  const $mini = (sel: string) => new Mini(sel);
  const out = (id: string, txt: string, cls?: string) => {
    const o = $id(id);
    o.textContent = "→ " + txt;
    o.className = "out " + (cls || "");
  };
  root.querySelectorAll<HTMLElement>("[data-run]").forEach((b) => {
    b.addEventListener("click", () => {
      const n = b.getAttribute("data-run");
      if (n === "1") out("jq-o1", $mini("#jq-box").length + "  (found the element)", "ok");
      if (n === "2") { $mini("#jq-box").css("background", "rgba(76,194,255,.12)"); out("jq-o2", "painted — look at the box above", "ok"); }
      if (n === "3") {
        const d = $mini("#jq-box").data("ui-autocomplete");
        out("jq-o3", d ? "{ options: {…}, _renderMenu: ƒ }  (widget exists!)" : "undefined  (no widget yet — try snippet 4, then run this again)", d ? "ok" : "warn");
      }
      if (n === "4") { $mini("#jq-box").autocomplete({ source: ["pitch", "note"] }); out("jq-o4", "widget created and stored on the element", "ok"); }
      if (n === "5") out("jq-o5", "0  (no error thrown — just an empty wrapper. This is why code must check .length)", "warn");
    });
  });

  /* ---------- §5 onion ---------- */
  let depth = 0;
  let flag = false;
  const vis = $id("onion-vis");
  const olog = $id("on-log");
  const ologLine = (s: string) => {
    olog.textContent += "\n" + s;
    olog.scrollTop = olog.scrollHeight;
  };
  function drawRings() {
    vis.querySelectorAll(".ring").forEach((r) => r.remove());
    for (let i = 1; i <= depth; i++) {
      const r = document.createElement("div");
      r.className = "ring" + (flag && i === depth ? " guarded" : "");
      const w = 86 + i * 26;
      const h = 44 + i * 22;
      r.style.width = w + "px";
      r.style.height = h + "px";
      r.style.left = `calc(50% - ${w / 2}px)`;
      r.style.top = `calc(50% - ${h / 2}px)`;
      vis.appendChild(r);
    }
    $id("on-depth").textContent = String(depth);
    $id("on-flag").textContent = flag ? "set" : "unset";
  }
  $id("on-wrap").addEventListener("click", () => {
    depth++;
    drawRings();
    ologLine("patched: _renderMenu wrapped (no guard) — depth " + depth);
  });
  $id("on-wrap-g").addEventListener("click", () => {
    if (flag) { ologLine("guarded patch: _mbPositionFixApplied already set → returned false, nothing changed"); return; }
    depth++;
    flag = true;
    drawRings();
    ologLine("guarded patch: wrapped once, flag stamped — depth " + depth);
  });
  $id("on-render").addEventListener("click", () => {
    let s = "renderMenu(): draw the list";
    for (let i = 0; i < depth; i++) s += `\n   → position the dropdown   (wrap layer ${i + 1})`;
    if (depth > 1) s += `\n   ⚠ positioned ${depth} times for one render`;
    ologLine(s);
  });
  $id("on-reset").addEventListener("click", () => {
    depth = 0;
    flag = false;
    drawRings();
    olog.textContent = "// fresh widget.";
  });
  drawRings();

  /* ---------- §6 event loop ---------- */
  let elRunning = false;
  $id("el-run").addEventListener("click", () => {
    if (elRunning) return;
    elRunning = true;
    const now = $id("el-now");
    const q = $id("el-q");
    const lg = $id("el-log");
    now.innerHTML = "";
    q.innerHTML = "";
    lg.textContent = "";
    const item = (parent: HTMLElement, txt: string, queued?: boolean) => {
      const d = document.createElement("div");
      d.className = "el-item" + (queued ? " q" : "");
      d.textContent = txt;
      parent.appendChild(d);
      return d;
    };
    const steps = [
      () => { item(now, 'log("A")'); lg.textContent += "A: draw the suggestion list\n"; },
      () => { item(q, '() => log("C")   ⏱ 0ms', true); },
      () => { item(now, 'log("B")'); lg.textContent += "B: jQuery UI finishes its own layout\n"; },
      () => { item(now, "— call stack empty —").style.opacity = ".55"; },
      () => { q.innerHTML = ""; item(now, 'log("C")  (from the queue)', true); lg.textContent += "C: pin dropdown to the box   ← ran LAST despite 0ms\n"; elRunning = false; },
    ];
    if (RM) steps.forEach((s) => s());
    else steps.forEach((s, i) => setTimeout(s, 520 * (i + 1)));
  });

  /* ---------- §7 race sim ---------- */
  let raceMode = "poll";
  let T = 12;
  let playing = false;
  const slider = $id("race-slider") as HTMLInputElement;
  const tOut = $id("race-t");
  const track = $id("race-track");
  const playhead = $id("race-play");
  const widgetDot = $id("race-widget");
  const loadbar = $id("race-loadbar");
  const deadline = $id("race-deadline");
  const result = $id("race-result");
  const totalSec = () => Math.max(T + 4, 14);
  const xPct = (sec: number) => (sec / totalSec()) * 100 + "%";
  function buildTrack() {
    track.querySelectorAll(".tick").forEach((t) => t.remove());
    if (raceMode === "poll") {
      for (let s = 1; s <= 11; s += 0.5) {
        const t = document.createElement("div");
        t.className = "tick";
        t.style.left = xPct(s);
        t.dataset.sec = String(s);
        track.appendChild(t);
      }
      deadline.style.display = "block";
      deadline.style.left = xPct(11);
    } else {
      deadline.style.display = "none";
    }
    widgetDot.style.left = xPct(T);
    widgetDot.classList.remove("born");
    loadbar.style.width = "0";
    playhead.style.left = "0";
    result.className = "";
    result.style.display = "none";
  }
  function setT(v: string | number) {
    T = +v;
    slider.value = String(v);
    tOut.textContent = String(v);
    buildTrack();
  }
  slider.addEventListener("input", function (this: HTMLInputElement) { setT(this.value); });
  root.querySelectorAll<HTMLElement>(".preset").forEach((b) => {
    b.addEventListener("click", () => setT(b.getAttribute("data-t")!));
  });
  $id("race-m-poll").addEventListener("click", function (this: HTMLElement) {
    raceMode = "poll";
    this.classList.add("sel");
    $id("race-m-fix").classList.remove("sel");
    buildTrack();
  });
  $id("race-m-fix").addEventListener("click", function (this: HTMLElement) {
    raceMode = "fix";
    this.classList.add("sel");
    $id("race-m-poll").classList.remove("sel");
    buildTrack();
  });
  function outcome() {
    if (raceMode === "fix") return { ok: true, at: T, msg: `Patch applied at ${T}s — the instant the widget was created. No poller, no race, any speed.` };
    for (let s = 1; s <= 11; s += 0.5) if (s >= T) return { ok: true, at: s, msg: `Poller's check at ${s}s found the widget (created at ${T}s). Patch applied — this time.` };
    return { ok: false, at: 11, msg: `Poller gave up at ~11s. Widget arrived at ${T}s — nobody was listening. Console error logged; patch never applies.` };
  }
  $id("race-play-btn").addEventListener("click", () => {
    if (playing) return;
    playing = true;
    buildTrack();
    const o = outcome();
    const total = totalSec();
    const dur = RM ? 0 : Math.min(4200, total * 160);
    let start: number | null = null;
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      playhead.style.left = xPct(total);
      loadbar.style.width = xPct(T);
      widgetDot.classList.add("born");
      track.querySelectorAll<HTMLElement>(".tick").forEach((t) => {
        if (+t.dataset.sec! <= (o.ok ? o.at : 11)) t.classList.add("hit");
      });
      result.className = o.ok ? "ok" : "bad";
      result.textContent = (o.ok ? "✓ " : "✕ ") + o.msg;
      result.style.display = "block";
      playing = false;
    };
    if (RM || dur === 0) { finish(); return; }
    // rAF is suspended in hidden tabs; a timer backstop guarantees the sim
    // completes (and re-enables Play) even if the reader switches away.
    setTimeout(finish, dur + 200);
    const frameFn = (ts: number) => {
      if (finished) return;
      if (start === null) start = ts;
      const p = Math.min(1, (ts - start) / dur);
      const sec = p * total;
      playhead.style.left = xPct(sec);
      loadbar.style.width = xPct(Math.min(sec, T));
      if (sec >= T) widgetDot.classList.add("born");
      track.querySelectorAll<HTMLElement>(".tick").forEach((t) => {
        if (+t.dataset.sec! <= sec) t.classList.add("hit");
      });
      if (p < 1) requestAnimationFrame(frameFn);
      else finish();
    };
    requestAnimationFrame(frameFn);
  });
  buildTrack();
}
