"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { NoteStats } from "@/components/blog/NoteStats";
import { ShareLinks } from "@/components/blog/ShareLinks";

/**
 * "The Anatomy of an Undeclared Caption Track" — interactive essay.
 *
 * Same architecture as LinkerLab: the markup is a static article, and the two
 * labs (a CEA-608 wire decoder and a declaration-vs-presentation matrix) are
 * wired imperatively in a single effect. A dataset flag guards against
 * double-wiring under dev Strict Mode.
 */
export function CaptionLab() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || root.dataset.init) return;
    root.dataset.init = "1";
    initLab(root);
  }, []);

  return (
    <article className="race-lab caption-lab" ref={rootRef}>
      <div className="wrap">
        <header className="hero">
          <div className="eyebrow"><a href="/blog">field notes</a> &middot; video-dev/hls.js &middot; issue #4920</div>
          <h1>The Anatomy of an Undeclared Caption Track</h1>
          <div className="byline">Manny Castillo &middot; Senior SDET &middot; August 2026</div>
          <NoteStats slug="anatomy-of-an-undeclared-caption-track" variant="post" />
          <div className="hero-art">
            <Image
              src="/blog/undeclared-caption.png"
              alt="A chain of blue video frame blocks feeding a gate with one lit slot, while a green path bypasses the gate entirely and arrives at the output beside it"
              width={1774}
              height={887}
              priority
            />
          </div>
          <p className="lede">
            A video stream ships one caption track and the player offers two. The extra one is real,
            decodable, and nowhere in the manifest. Tracing it took me into the bytes hiding inside
            H.264 frames, into a four line gap in <b>hls.js</b>, and eventually into writing a
            CEA&#8209;608 encoder to build a stream that could fail on demand. Budget ~15 minutes.
          </p>
        </header>

        <div className="aside">
          Keep one question in mind through every section:{" "}
          <i>&ldquo;who decides which caption tracks exist, the manifest or the media, and what
          breaks when a player takes the answer from the wrong one?&rdquo;</i>
        </div>

        <h2 id="s1"><span className="num">1.</span> A menu with a language nobody shipped</h2>
        <div className="time">~2 min &middot; read</div>
        <p>
          <a href="https://github.com/video-dev/hls.js/issues/4920">hls.js#4920</a> is four years old,
          two sentences long, and labelled <i>good first issue</i>. A stream declares one closed
          caption rendition, English on CC1. The player presents two, the second one Spanish. The
          reporter attached a test stream and moved on.
        </p>
        <p>
          It reads like a cosmetic complaint. It isn&rsquo;t, and the reason is worth stating before
          any code: <b>a caption menu is a contract, not an inventory.</b> A publisher lists the
          caption tracks they have prepared, reviewed, and are willing to put in front of a viewer.
          A player that lists something else is not being generous, it is breaking the contract on
          the publisher&rsquo;s behalf.
        </p>
        <p>
          What actually shows up in that extra slot, in the wild, is rarely a polished second
          language. It is a stale channel from an old encoder pass, or a technician&rsquo;s
          scratchpad, or bytes that decode into garbage. The player labels it{" "}
          <code>Spanish</code> or <code>Unknown CC</code> because those are its defaults, and now an
          accessibility menu contains an entry nobody wrote, nobody reviewed, and nobody can turn
          off.
        </p>

        <h2 id="s2"><span className="num">2.</span> Where 608 captions actually live</h2>
        <div className="time">~3 min &middot; step the wire yourself</div>
        <p>
          The first surprise for anyone arriving from WebVTT: <b>CEA&#8209;608 captions are not a
          file.</b> There is no sidecar to fetch, no separate playlist, no URL. The caption bytes
          ride inside the video frames themselves, in an H.264 SEI message (the ATSC A/53 flavour),
          two bytes per frame, decoded by the player as it decodes picture.
        </p>
        <p>
          Two bytes per frame is a punishingly small pipe, and the format spends it well. Those two
          bytes carry either a <b>control code</b> or a <b>character pair</b>, and each field of the
          signal multiplexes <b>two independent channels</b>. Field one carries CC1 and CC2. A
          control code with bit 3 set switches the decoder to channel two; everything after it
          belongs to CC2 until something switches it back.
        </p>
        <p>
          Which means a single stream of bytes, with no framing and no table of contents, can hold
          English and Spanish at once. Step through a real one:
        </p>
      </div>

      <div className="wide">
        <div className="lab">
          <div className="bar">
            Lab &middot; decode the 608 wire <span className="grow"></span>
            <span>two bytes per frame, two channels</span>
          </div>
          <div className="stage">
            <div className="cc-wire" id="cc-wire" aria-label="608 byte pairs"></div>
            <div className="lk-controls">
              <button className="preset primary" id="cc-step">step</button>
              <button className="preset" id="cc-run">run all</button>
              <button className="preset ghost" id="cc-reset">reset</button>
            </div>
            <div className="cc-panels">
              <div className="cc-panel" id="cc-p1">
                <div className="lk-h">channel CC1</div>
                <div className="cc-screen" id="cc-s1"><span className="lk-empty">(empty)</span></div>
              </div>
              <div className="cc-panel" id="cc-p2">
                <div className="lk-h">channel CC2</div>
                <div className="cc-screen" id="cc-s2"><span className="lk-empty">(empty)</span></div>
              </div>
            </div>
            <div className="log" id="cc-log">{`// press "step" to walk the byte pairs`}</div>
          </div>
        </div>
      </div>

      <div className="wrap">
        <p>
          <b>What you just saw:</b> one byte stream, no container, no metadata, filling two separate
          caption buffers because a control code said so. Note what is <i>not</i> in there: any
          statement about which of these channels a viewer is supposed to be offered. The wire
          format has no opinion. It carries whatever the encoder put on it, including whatever an
          encoder put on it three years ago and forgot.
        </p>

        <h2 id="s3"><span className="num">3.</span> What the manifest promises</h2>
        <div className="time">~2 min &middot; read</div>
        <p>
          That opinion lives one level up, in the Multivariant Playlist. HLS has a tag for exactly
          this, and its whole job is to name the channels the publisher intends to present:
        </p>
        <div className="log">{`#EXTM3U
#EXT-X-VERSION:6
#EXT-X-MEDIA:TYPE=CLOSED-CAPTIONS,GROUP-ID="cc",NAME="English",LANGUAGE="en",INSTREAM-ID="CC1",DEFAULT=YES,AUTOSELECT=YES
#EXT-X-STREAM-INF:BANDWIDTH=300000,RESOLUTION=640x360,CODECS="avc1.4d401e",CLOSED-CAPTIONS="cc"
v0/index.m3u8`}</div>
        <p>
          One rendition. <code>INSTREAM-ID=&quot;CC1&quot;</code> is the publisher saying: of the
          channels the video may physically contain, this is the one that is yours. The media can
          carry four; this playlist offers one.
        </p>
        <p>
          So the correct behaviour is not ambiguous, and it does not require guessing intent. The
          manifest declares, the media carries, and the manifest wins. Everything below is about a
          player that reads the declaration and then does not use it.
        </p>
      </div>

      <div className="wrap">
        <h2 id="s4"><span className="num">4.</span> Labels, not gates</h2>
        <div className="time">~3 min &middot; read</div>
        <p>
          hls.js keeps four fixed slots for 608, one per channel, built once when its{" "}
          <code>TimelineController</code> is constructed. Each slot starts with a default label and
          language code from config:
        </p>
        <div className="log">{`this.captionsProperties = {
  textTrack1: { label: 'English',    languageCode: 'en' },
  textTrack2: { label: 'Spanish',    languageCode: 'es' },
  textTrack3: { label: 'Unknown CC', languageCode: ''   },
  textTrack4: { label: 'Unknown CC', languageCode: ''   },
};`}</div>
        <p>
          Those defaults are the reason the phantom track in the bug report is named{" "}
          <code>Spanish</code>. Nothing in that stream is Spanish. Slot two is simply called Spanish
          before anyone asks.
        </p>
        <p>Then two things happen, and they never speak to each other.</p>
        <p>
          <b>The playlist arrives.</b> <code>onManifestLoaded</code> walks the CLOSED-CAPTIONS
          renditions, matches each <code>INSTREAM-ID</code> to a slot, and fills in the real label,
          the language, and the rendition object itself:
        </p>
        <div className="log">{`const trackName = 'textTrack' + instreamIdMatch[1];   // "CC1" -> textTrack1
trackProperties.label = captionsTrack.name;            // 'English'
trackProperties.media = captionsTrack;                 // the declaration itself`}</div>
        <p>
          Read that last line again. <code>slot.media</code> is a perfect record of{" "}
          <i>this channel was declared</i>. The information the fix needs is already in the object,
          already populated, already correct.
        </p>
        <p>
          <b>Caption bytes decode.</b> Separately, whenever the 608 parser produces a cue on any
          channel, <code>OutputFilter</code> calls one method:
        </p>
        <div className="log">{`newCue(startTime, endTime, screen) {
  ...
  this.timelineController.createCaptionsTrack(this.trackName);
}`}</div>
        <p>
          And <code>createCaptionsTrack</code> creates the track. It does not look at{" "}
          <code>slot.media</code>. It does not look at the playlist at all. Channel produced bytes,
          therefore track exists.
        </p>
        <p>
          That is the entire bug, and it is not a missing feature: <b>the declaration was parsed,
          stored, and used only for naming.</b> The library had the answer in hand and consulted it
          for the label while ignoring it for the decision. Which is also why the issue sat for four
          years looking cosmetic. Someone reading the code sees <code>INSTREAM-ID</code> handled
          right there in <code>onManifestLoaded</code> and reasonably assumes it is wired up.
        </p>

        <h2 id="s5"><span className="num">5.</span> Making the declaration load bearing</h2>
        <div className="time">~4 min &middot; try the matrix</div>
        <p>
          The fix is a predicate, a derived flag, and two guards. The flag records whether the
          playlist declared <i>anything</i>, because that distinguishes two cases that must behave
          differently: a playlist that declared CC1 and not CC2, versus a playlist that declared no
          captions at all and cannot be used to filter anything.
        </p>
        <div className="log">{`private filterCaptionsTrack(trackName: string): boolean {
  if (this.config.filterUndeclaredClosedCaptions) {
    return !this.captionsProperties[trackName]?.media && this.captionsDeclared;
  }
  return false;    // opted out, nothing to filter against
}

private get captionsDeclared(): boolean {
  return Object.keys(this.captionsProperties).some(
    (trackName) => !!this.captionsProperties[trackName].media,
  );
}`}</div>
        <p>
          That flag is a getter rather than a stored field, and it did not start out that way.
          Section 9 covers why the maintainer asked for the change, because the reason generalises
          well past this file.
        </p>
        <p>
          The obvious guard goes at the top of <code>createCaptionsTrack</code>. The second one is
          the interesting one, and it is not optional. <code>addCues</code> runs for every cue, and
          in native rendering mode it does this:
        </p>
        <div className="log">{`const cache = this.cueCache[trackName];
if (cache) { ... } else {
  const track = this.captionsTracks[trackName].track;   // undefined if never created
}`}</div>
        <p>
          <code>cueCache[trackName]</code> is only ever populated by track creation. Block creation
          and leave this path alone, and the first undeclared cue dereferences <code>undefined</code>{" "}
          and throws inside caption parsing. One decision, enforced at both places a channel can
          become visible.
        </p>
        <p>
          Then a detail that is easy to miss until a second stream loads: <code>captionsProperties</code>{" "}
          lives as long as the player instance, but <code>media</code> belongs to one playlist. Call{" "}
          <code>loadSource()</code> again and yesterday&rsquo;s declarations are still sitting in
          those slots, filtering today&rsquo;s stream. So <code>onManifestLoading</code> clears them.
        </p>
        <p>Set the manifest and the build below and watch what the player ends up offering:</p>
      </div>

      <div className="wide">
        <div className="lab">
          <div className="bar">
            Lab &middot; declaration vs presentation <span className="grow"></span>
            <span>same media, both builds</span>
          </div>
          <div className="stage">
            <div className="cc-matrix">
              <div className="cc-col">
                <div className="lk-h">the playlist declares</div>
                <label className="cc-toggle"><input type="checkbox" id="cc-d1" defaultChecked /> <span><code>INSTREAM-ID=&quot;CC1&quot;</code> English</span></label>
                <label className="cc-toggle"><input type="checkbox" id="cc-d2" /> <span><code>INSTREAM-ID=&quot;CC2&quot;</code> Espanol</span></label>
                <div className="cc-note">the media always carries both</div>
              </div>
              <div className="cc-col">
                <div className="lk-h">library build</div>
                <div className="lk-controls">
                  <button className="preset primary" id="cc-shipped">as shipped</button>
                  <button className="preset" id="cc-patched">with the fix</button>
                </div>
                <div className="cc-note" id="cc-rule"></div>
              </div>
            </div>
            <div className="cc-menu-head lk-h">caption menu the player exposes</div>
            <div className="cc-menu" id="cc-menu"></div>
            <div className="cc-verdict" id="cc-verdict"></div>
          </div>
        </div>
      </div>

      <div className="wrap">
        <p>
          <b>What you just saw:</b> the change bites in exactly one square of that matrix, the one
          where a playlist declares some channels and the media carries more. Declare both and both
          survive. Declare none and the old behaviour stays, because a playlist that declares
          nothing is not evidence that undeclared channels are unwanted, it is the absence of
          evidence. Same for a Media Playlist loaded directly, which has no way to declare
          renditions at all.
        </p>
        <p>
          That third row is why the change ships behind{" "}
          <code>filterUndeclaredClosedCaptions</code>, defaulting to <code>true</code>. Filtering is
          the spec reading and the reported expectation, but somebody out there is quietly relying
          on an undeclared channel today, and a one line escape hatch is cheaper than an argument.
        </p>
      </div>

      <div className="wrap">
        <h2 id="s6"><span className="num">6.</span> The stream that had to be built</h2>
        <div className="time">~3 min &middot; read</div>
        <p>
          Here is where a caption bug stops being like other bugs. I had a fix and a unit test.
          What I did not have was a way to <i>watch it fail</i>, because the test stream in the
          issue had gone offline sometime in the four years since it was filed. No stream, no
          reproduction, no proof. And a fix nobody has seen fail is a fix nobody has seen work.
        </p>
        <p>
          The requirement is specific: video whose manifest declares CC1 only, and whose frames
          carry both CC1 and CC2. Nothing public was going to hand me that, so I built it.
        </p>
        <p>
          <b>Step one is the part I expected to be easy.</b> ffmpeg does not have a CEA&#8209;608
          encoder. It decodes 608 happily, and its <code>-a53cc</code> flag forwards caption side
          data that already exists on decoded frames, but there is no path from a subtitle file to
          608 bytes in an H.264 SEI. So the caption bytes had to be generated by hand: odd parity in
          the top bit of each 7 bit code, preamble address codes for row and style, pop&#8209;on
          sequences (resume caption loading, erase non&#8209;displayed memory, write, end of
          caption), and the channel two variants of every control code with bit 3 set.
        </p>
        <div className="log">{`const parity = (b) => {                 // odd parity in the MSB
  const v = b & 0x7f;
  let ones = 0;
  for (let i = 0; i < 7; i++) if (v & (1 << i)) ones++;
  return ones % 2 ? v : v | 0x80;
};

const MISC    = { 1: 0x14, 2: 0x1c };   // misc control, ch1 / ch2
const PAC_ROW = { 1: { 15: [0x14, 0x60] }, 2: { 15: [0x1c, 0x60] } };
const RCL = 0x20, ENM = 0x2e, EOC = 0x2f;`}</div>
        <p>
          Every pair in the first lab on this page came out of that encoder. It is the reference
          implementation for the thing being tested, which is a slightly uncomfortable place to
          stand, so it gets checked against a decoder that was not written by me: ffmpeg reads the
          finished stream back and prints the captions.
        </p>
        <p>
          <b>Step two: get the bytes into the video.</b> Two bytes per frame, in an SEI NAL, ahead of
          the first slice of each access unit. Encode with access unit delimiters so frame
          boundaries are trivial to find, walk the Annex B stream, and splice:
        </p>
        <div className="log">{`function seiNal(cc1, cc2) {
  const payload = [
    0xb5,                    // itu_t_t35_country_code (US)
    0x00, 0x31,              // provider code (ATSC)
    0x47, 0x41, 0x39, 0x34,  // "GA94"
    0x03,                    // user_data_type_code: cc_data
    0xc0 | 1,                // process flags + cc_count = 1
    0xff,                    // em_data
    0xfc, cc1, cc2,          // marker | cc_valid | cc_type=0 (field 1), the pair
    0xff,                    // marker bits
  ];
  ...                        // payload type 4, length, rbsp trailing, emulation prevention
}`}</div>
        <p>
          Emulation prevention is the part that bites if you skip it: any <code>00 00 0x</code>{" "}
          sequence in the payload has to have a <code>0x03</code> spliced in, or a decoder reading
          the stream finds a start code that was never meant to be there. Then remux to MPEG&#8209;TS,
          segment, and write three master playlists that declare different subsets of the same
          media.
        </p>
        <p>
          Thirty seconds of video, three hundred caption pairs, and the build asserts that every one
          of them landed. The generator lives in the tester repo linked at the bottom, and it is
          reusable for anything else that needs a 608 stream with specific channel content, which
          is a thing I now know is annoyingly hard to find.
        </p>

        <h2 id="s7"><span className="num">7.</span> Proof you can look at</h2>
        <div className="time">~2 min &middot; read</div>
        <p>
          Unit tests prove the predicate. They cannot prove that a browser, a demuxer, a 608 parser,
          and a text track API all end up somewhere different because of it. So the last artifact is
          a page that runs both libraries at once: hls.js at the pinned commit on the left, the same
          commit plus the patch on the right, same manifest, same segments, same wall clock.
        </p>
        <p>
          Building it that way was deliberate. Two builds from one commit means the only variable on
          the page is the diff. If the panes differ, the patch is the reason; there is no other
          candidate.
        </p>
        <p>
          Left pane: two caption tracks, and selecting the second one paints Spanish text over video
          whose manifest declares English and nothing else. Right pane: one track. The scenario
          switcher covers the guardrails too, because the interesting claim is not only that the fix
          filters, it is that the fix filters <i>and nothing else changes</i>.
        </p>
        <p>
          That is the part I care about as a tester. The failing case is easy to demonstrate once
          you have a stream. The four cases that must keep working are the ones that decide whether
          a patch is safe to merge.
        </p>

        <h2 id="s8"><span className="num">8.</span> Shipping it upstream</h2>
        <div className="time">~1 min &middot; read</div>
        <p>
          What went to <a href="https://github.com/video-dev/hls.js">video-dev/hls.js</a>: thirty
          lines in <code>timeline-controller.ts</code>, two in <code>config.ts</code>, five unit
          tests, an <code>API.md</code> entry for the new option, and the regenerated api&#8209;extractor
          report. Two of the five tests fail on master, which is the only way to know a test is
          testing anything.
        </p>
        <p>
          The rest of the work, the encoder, the injector, the split screen page, is not in the pull
          request and should not be. It links from the description instead. A maintainer reviewing
          125 lines of library change should not have to read an ffmpeg pipeline to accept it, but
          they should be able to click through to one if they want to know how the evidence was
          made.
        </p>

        <h2 id="s9"><span className="num">9.</span> What the review changed</h2>
        <div className="time">~2 min &middot; read</div>
        <p>
          The first review came back <b>changes requested</b>, opening with &ldquo;Makes sense.
          Mostly nit-pick change requests.&rdquo; Five comments, every one with the exact diff
          attached. Nothing disputed what the patch did. All five were about its shape.
        </p>
        <p>
          Four were genuine nits: rename a method, update its two call sites, avoid a{" "}
          <code>for...in</code> loop, extract a repeated object literal into a helper. Worth doing,
          not worth writing about.
        </p>
        <p>
          The fifth one was not a nit, and it is the reason this section exists. I had written the
          declaration flag as a field:
        </p>
        <div className="log">{`private captionsDeclared: boolean = false;`}</div>
        <p>
          Set it to <code>true</code> when a rendition is parsed, back to <code>false</code> on
          playlist reset. Two assignment sites, one boolean, perfectly readable. His note:{" "}
          <i>&ldquo;Please remove this flag.&rdquo;</i>
        </p>
        <p>
          The argument is that the fact was already in the object. A track having{" "}
          <code>.media</code> set <b>is</b> the declaration, so a separate boolean recording
          &ldquo;something was declared&rdquo; is a second copy of information the class already
          held. And two copies of one fact can disagree.
        </p>
        <p>
          They disagree quietly, too. Any future code path that populates{" "}
          <code>captionsProperties</code> without remembering to set the flag, or clears one without
          the other, breaks the filter in the direction where nothing throws: captions stop being
          filtered and the phantom track comes back. No error, no test failure unless someone wrote
          exactly the right test, just the original bug wearing a different hat.
        </p>
        <p>
          A getter cannot drift, because there is only one place the answer can come from. That is
          the whole idea, and it cost four lines.
        </p>
        <p>
          The part I did not expect was the compiler doing the demolition. Delete the field, add the
          getter, and TypeScript immediately flags both assignment sites: <code>Cannot assign to
          &lsquo;captionsDeclared&rsquo; because it is a read-only property</code>. It pointed
          straight at every line that had been maintaining the duplicate, which were exactly the
          lines that could have drifted. Then the reset collapsed too, because replacing{" "}
          <code>captionsProperties</code> with a fresh default object clears the declarations and
          the derived flag in one assignment.
        </p>
        <p>
          Net effect of the review round: 16 fewer lines, one less thing that can be wrong, and no
          behaviour change at all. The rename inverted a boolean and rearranged a condition, so I
          checked all four input combinations by hand before agreeing to it; both forms reduce to
          the same expression, and all 1189 unit tests passed unchanged afterwards.
        </p>
        <p>
          Two of the five edits could have compiled clean while behaving wrong: dropping the{" "}
          <code>!</code> from a call site would have inverted the filter, and deleting the flag reset
          without putting the new one in place would have leaked declarations across playlists. Both
          typecheck perfectly. Neither is the kind of thing a compiler has an opinion about.
        </p>

        <h2 id="s10"><span className="num">10.</span> Check yourself</h2>
        <div className="time">~1 min &middot; answer before revealing</div>
        <details>
          <summary>1 &middot; A stream carries CEA&#8209;608 on CC1 and CC2 and its playlist declares neither. How many caption tracks should a conforming player present?</summary>
          <div className="a">
            Unspecified, and that is the point. With no declaration there is nothing to filter
            against, so a player that surfaces both is not wrong. This is why the fix keys on
            &ldquo;did the playlist declare anything at all&rdquo; rather than on each channel
            individually.
          </div>
        </details>
        <details>
          <summary>2 &middot; The player labels an undeclared channel &ldquo;Spanish&rdquo;. Where did that name come from?</summary>
          <div className="a">
            From <code>captionsTextTrack2Label</code>, a config default applied to slot two before
            any manifest is parsed. Nothing in the stream claims to be Spanish. Channels three and
            four get <code>Unknown CC</code> the same way.
          </div>
        </details>
        <details>
          <summary>3 &middot; You gate track creation on a new condition and the caption parser starts throwing on undeclared channels. What did you miss?</summary>
          <div className="a">
            The cue path. Track creation populates the cue cache that cue insertion depends on, so
            blocking one without the other leaves cue insertion dereferencing a track that was never
            made. A gate has to cover every entry point into the state it is guarding.
          </div>
        </details>
        <details>
          <summary>4 &middot; Why does clearing per&#8209;playlist state on MANIFEST_LOADING matter for a single page player?</summary>
          <div className="a">
            Because the controller outlives the playlist. Load a second stream into the same
            instance and the previous playlist&rsquo;s declarations are still in the slots, so the
            new stream gets filtered by the old stream&rsquo;s rules. Long lived objects holding per
            load state is the same bug shape as a stale cache.
          </div>
        </details>

        <footer>
          The fix is{" "}
          <a href="https://github.com/video-dev/hls.js/pull/8020">video-dev/hls.js#8020</a>, open
          against{" "}
          <a href="https://github.com/video-dev/hls.js/issues/4920">issue #4920</a>. The
          split screen tester, the CEA&#8209;608 encoder, and the SEI injector that generates the
          test stream are in{" "}
          <a href="https://github.com/ManuelFCastillo/hlsjs-4920-tester">hlsjs-4920-tester</a>, and
          the page itself is{" "}
          <a href="https://site-gamma-tan-81.vercel.app">running here</a>.
        </footer>
        <ShareLinks slug="anatomy-of-an-undeclared-caption-track" />
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* Lab wiring                                                          */
/* ------------------------------------------------------------------ */

interface Pair {
  hex: string;
  /** channel the pair belongs to, 0 for "inherits the current channel" */
  ch: 0 | 1 | 2;
  kind: "ctrl" | "text" | "repeat";
  note: string;
  /** characters this pair writes, for text pairs */
  text?: string;
  /** end of caption: swap the buffer onto the screen */
  display?: boolean;
}

/** Real bytes, straight out of the encoder that built the test stream. */
const PAIRS: Pair[] = [
  { hex: "9420", ch: 1, kind: "ctrl", note: "RCL, channel 1: start writing a caption off screen" },
  { hex: "9420", ch: 1, kind: "repeat", note: "identical control pair: a decoder drops the duplicate" },
  { hex: "94ae", ch: 1, kind: "ctrl", note: "ENM, channel 1: erase the off screen buffer" },
  { hex: "94e0", ch: 1, kind: "ctrl", note: "PAC, channel 1: row 15, white, no indent" },
  { hex: "45ce", ch: 0, kind: "text", note: "character pair", text: "EN" },
  { hex: "c74c", ch: 0, kind: "text", note: "character pair", text: "GL" },
  { hex: "49d3", ch: 0, kind: "text", note: "character pair", text: "IS" },
  { hex: "c820", ch: 0, kind: "text", note: "character pair", text: "H " },
  { hex: "4343", ch: 0, kind: "text", note: "character pair", text: "CC" },
  { hex: "3180", ch: 0, kind: "text", note: "one character, null padded", text: "1" },
  { hex: "942f", ch: 1, kind: "ctrl", note: "EOC, channel 1: swap the buffer onto the screen", display: true },
  { hex: "1c20", ch: 2, kind: "ctrl", note: "RCL with bit 3 set: everything after this is channel 2" },
  { hex: "1cae", ch: 2, kind: "ctrl", note: "ENM, channel 2" },
  { hex: "1ce0", ch: 2, kind: "ctrl", note: "PAC, channel 2: row 15" },
  { hex: "45d3", ch: 0, kind: "text", note: "character pair", text: "ES" },
  { hex: "d0c1", ch: 0, kind: "text", note: "character pair", text: "PA" },
  { hex: "ce4f", ch: 0, kind: "text", note: "character pair", text: "NO" },
  { hex: "4c20", ch: 0, kind: "text", note: "character pair", text: "L " },
  { hex: "4343", ch: 0, kind: "text", note: "character pair", text: "CC" },
  { hex: "3280", ch: 0, kind: "text", note: "one character, null padded", text: "2" },
  { hex: "1c2f", ch: 2, kind: "ctrl", note: "EOC, channel 2: swap channel 2 onto the screen", display: true },
];

function initLab(root: HTMLElement) {
  const $ = (id: string) => root.querySelector<HTMLElement>("#" + id)!;

  /* ---- lab: decode the 608 wire ---- */
  const wire = $("cc-wire");
  const logEl = $("cc-log");
  const screens: Record<number, HTMLElement> = { 1: $("cc-s1"), 2: $("cc-s2") };
  const panels: Record<number, HTMLElement> = { 1: $("cc-p1"), 2: $("cc-p2") };

  let pos = 0;
  let active: 1 | 2 = 1;
  const buffer: Record<number, string> = { 1: "", 2: "" };
  const shown: Record<number, string> = { 1: "", 2: "" };
  let lines: string[] = [];

  wire.innerHTML = PAIRS.map(
    (p, i) => `<span class="cc-pair" data-i="${i}"><code>${p.hex}</code></span>`,
  ).join("");

  function renderScreens() {
    [1, 2].forEach((ch) => {
      const el = screens[ch];
      const on = shown[ch];
      const pending = buffer[ch];
      if (!on && !pending) {
        el.innerHTML = '<span class="lk-empty">(empty)</span>';
      } else {
        el.innerHTML = on
          ? `<span class="cc-on">${on}</span>`
          : `<span class="cc-pending">${pending}</span>`;
      }
      panels[ch].classList.toggle("cc-active", active === ch);
    });
    logEl.textContent = lines.length ? lines.join("\n") : '// press "step" to walk the byte pairs';
  }

  function reset() {
    pos = 0;
    active = 1;
    buffer[1] = buffer[2] = "";
    shown[1] = shown[2] = "";
    lines = [];
    wire.querySelectorAll(".cc-pair").forEach((el) => {
      el.classList.remove("cc-cur", "cc-done", "cc-drop");
    });
    renderScreens();
  }

  function step() {
    if (pos >= PAIRS.length) return;
    const p = PAIRS[pos];
    wire.querySelectorAll(".cc-pair").forEach((el) => el.classList.remove("cc-cur"));
    const el = wire.querySelector<HTMLElement>(`[data-i="${pos}"]`)!;
    el.classList.add("cc-cur", p.kind === "repeat" ? "cc-drop" : "cc-done");

    if (p.kind === "repeat") {
      lines.push(`${p.hex}  ${p.note}`);
    } else if (p.kind === "ctrl") {
      if (p.ch) active = p.ch;
      if (p.display) {
        shown[active] = buffer[active];
        buffer[active] = "";
        lines.push(`${p.hex}  ${p.note}  -> CC${active} now reads "${shown[active]}"`);
      } else {
        if (p.note.startsWith("ENM")) buffer[active] = "";
        lines.push(`${p.hex}  ${p.note}`);
      }
    } else {
      buffer[active] += p.text ?? "";
      lines.push(`${p.hex}  ${p.note} "${p.text}" -> CC${active} buffer`);
    }

    pos += 1;
    renderScreens();
    if (pos >= PAIRS.length) {
      lines.push("");
      lines.push("// two channels, one byte stream, nothing declaring which is meant to be offered");
      renderScreens();
    }
  }

  $("cc-step").addEventListener("click", step);
  $("cc-run").addEventListener("click", () => {
    reset();
    while (pos < PAIRS.length) step();
  });
  $("cc-reset").addEventListener("click", reset);
  renderScreens();

  /* ---- lab: declaration vs presentation ---- */
  const d1 = root.querySelector<HTMLInputElement>("#cc-d1")!;
  const d2 = root.querySelector<HTMLInputElement>("#cc-d2")!;
  const menu = $("cc-menu");
  const verdict = $("cc-verdict");
  const rule = $("cc-rule");
  const shippedBtn = $("cc-shipped");
  const patchedBtn = $("cc-patched");
  let patched = false;

  /** config defaults hls.js applies to a slot before any manifest is read */
  const DEFAULT_LABEL: Record<number, string> = { 1: "English", 2: "Spanish" };
  const DECLARED_NAME: Record<number, string> = { 1: "English", 2: "Espanol" };
  const LANG: Record<number, string> = { 1: "en", 2: "es" };

  function renderMatrix() {
    const declared = [d1.checked ? 1 : 0, d2.checked ? 2 : 0].filter(Boolean) as number[];
    const captionsDeclared = declared.length > 0;

    // the media always carries both channels; a track appears when a channel
    // decodes data and, on the patched build, survives the declaration check
    const tracks = [1, 2]
      .filter((ch) => !patched || !captionsDeclared || declared.includes(ch))
      .map((ch) => ({
        ch,
        label: declared.includes(ch) ? DECLARED_NAME[ch] : DEFAULT_LABEL[ch],
        lang: LANG[ch],
        ok: declared.includes(ch) || !captionsDeclared,
      }));

    menu.innerHTML = tracks
      .map(
        (t) =>
          `<span class="cc-chip${t.ok ? "" : " cc-chip-bad"}"><i></i>${t.label}` +
          `<small>${t.lang}${t.ok ? "" : " &middot; not declared"}</small></span>`,
      )
      .join("");

    rule.textContent = patched
      ? captionsDeclared
        ? "filterUndeclaredClosedCaptions: true, and the playlist declares " +
          declared.length +
          " rendition" +
          (declared.length > 1 ? "s" : "") +
          ", so the check applies"
        : "filterUndeclaredClosedCaptions: true, but the playlist declares nothing, so there is nothing to filter against"
      : "a channel that decodes data becomes a track, whatever the playlist says";

    const stray = tracks.filter((t) => !t.ok);
    verdict.className = "cc-verdict " + (stray.length ? "cc-bad" : "cc-good");
    verdict.textContent = stray.length
      ? `${tracks.length} caption tracks, ${stray.length} of them never declared in the manifest`
      : captionsDeclared
        ? `${tracks.length} caption track${tracks.length > 1 ? "s" : ""}, exactly what the manifest declares`
        : `${tracks.length} caption tracks, and no declaration to check them against`;

    shippedBtn.classList.toggle("primary", !patched);
    patchedBtn.classList.toggle("primary", patched);
  }

  d1.addEventListener("change", renderMatrix);
  d2.addEventListener("change", renderMatrix);
  shippedBtn.addEventListener("click", () => {
    patched = false;
    renderMatrix();
  });
  patchedBtn.addEventListener("click", () => {
    patched = true;
    renderMatrix();
  });
  renderMatrix();
}
