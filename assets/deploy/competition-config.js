/* SIB × YSP International Youth Essay Competition 2026 — the one place to configure it.
   Every page that mentions the competition reads its status, button and visibility from here. */
window.YSP_COMP = {
  // Go-live switch. While false, the competition page and every link to it stay hidden on the live domain.
  // Set to true only after the organiser confirms the terms (see "Handover - Essay Competition 2026.md").
  published: true,
  liveHosts: ['youthforsustainablepolicy.org', 'www.youthforsustainablepolicy.org'],
  // Singapore time (UTC+8). All page states change at these instants.
  dates: {
    opens: '2026-12-01T00:00:00+08:00',
    closes: '2026-12-31T23:59:59+08:00',
    results: '2027-01-15T00:00:00+08:00'
  },
  formUrl: 'https://forms.gle/jADkhJtDEN1tBQcU7',      // Google Form URL. Required before "Submit Your Essay" can appear.
  resultsUrl: '',   // Published results page or section. Until set, results day reads "Results announcement pending".
  enquiriesEmail: '', // Verified competition inbox. Never fill with a guessed address.
  approved: { rules: false, privacy: false, enquiries: false }, // Turn on each draft link once its content is approved.
  art: {
    hero:   { file: 'Notebook pathways across shared futures.png', src: '', alt: 'Editorial collage of an open notebook whose pages become pathways linking people and places.' },
    p1:     { file: 'Caring hands bridge homes across oceans.png', src: '', alt: 'Editorial collage of a nurse connecting homes and a hospital across an ocean.' },
    p2:     { file: 'Battery above mineral strata and community circle.png', src: '', alt: 'Editorial collage of a battery, mineral layers, a forest and a community discussion.' },
    p3:     { file: 'Island to island, carrying home.png', src: '', alt: 'Editorial collage of a family carrying belongings and a plant between island shores.' },
    p4:     { file: 'Shipping container spills waste toward the coast.png', src: '', alt: 'Editorial collage of discarded clothing and electronics spilling from a shipping container toward a coastal settlement.' },
    p5:     { file: 'Hands behind the AI cloud.png', src: '', alt: 'Editorial collage connecting a worker at a keyboard to a cloud of image tiles.' },
    p6:     { file: 'Young delegate at a paper conference doorway.png', src: '', alt: 'Editorial collage of a young delegate facing a conference doorway across a paper ocean.' },
    footer: { file: 'Hands Passing a Shared Essay.png', src: '', alt: '' }
  }
};

(function () {
  var C = window.YSP_COMP;
  C.isLive = function () { return C.liveHosts.indexOf(location.hostname) > -1; };
  C.visible = function () { return C.published || !C.isLive(); };
  C.state = function () {
    // Preview-only override for testing each state: add ?compState=before|open|closed|results to the URL.
    var o = !C.isLive() && new URLSearchParams(location.search).get('compState');
    if (o) return o;
    var t = Date.now(), d = C.dates;
    if (t < Date.parse(d.opens)) return 'before';
    if (t <= Date.parse(d.closes)) return 'open';
    if (t < Date.parse(d.results)) return 'closed';
    return 'results';
  };
  C.status = function (s) {
    s = s || C.state();
    return { before: 'Entries open 1 December', open: 'Entries open · closes 31 December', closed: 'Entries closed', results: C.resultsUrl ? 'Results published' : 'Results announcement pending' }[s];
  };
  // Returns {label, href} for a live link, or {label} for a non-interactive status.
  C.cta = function (s) {
    s = s || C.state();
    if (s === 'before') return { label: 'Entries Open 1 December' };
    if (s === 'open') return C.formUrl ? { label: 'Submit Your Essay', href: C.formUrl, external: true } : { label: 'Submission Link Coming Soon' };
    if (s === 'closed') return { label: 'Entries Closed' };
    return C.resultsUrl ? { label: 'Results', href: C.resultsUrl } : { label: 'Results announcement pending' };
  };
  function apply() {
    if (document.body.hasAttribute('data-comp-gated') && !C.visible()) { location.replace('/'); return; }
    var st = C.state();
    document.querySelectorAll('[data-comp-discovery]').forEach(function (el) { if (C.visible()) el.removeAttribute('hidden'); else el.remove(); });
    document.querySelectorAll('[data-comp-status]').forEach(function (el) { el.textContent = C.status(st); });
    document.querySelectorAll('[data-comp-cta]').forEach(function (el) {
      var c = C.cta(st), n;
      if (c.href) {
        n = document.createElement('a'); n.href = c.href; n.className = el.getAttribute('data-link-class') || 'btn btn-forest';
        if (c.external) { n.target = '_blank'; n.rel = 'noopener noreferrer'; }
        n.innerHTML = c.label + ' <span class="arr">↗</span>';
      } else {
        n = document.createElement('span'); n.className = el.getAttribute('data-pill-class') || 'ec-pill'; n.setAttribute('role', 'status');
        n.innerHTML = '<span class="dot"></span>' + c.label;
      }
      el.replaceWith(n);
    });
    document.querySelectorAll('[data-comp-art]').forEach(function (el) {
      var a = C.art[el.getAttribute('data-comp-art')];
      if (a && a.src) { var img = new Image(); img.src = a.src; img.alt = el.hasAttribute('data-decorative') ? '' : a.alt; img.loading = el.hasAttribute('data-eager') ? 'eager' : 'lazy'; img.decoding = 'async'; el.innerHTML = ''; el.appendChild(img); el.classList.add('has-art'); }
      else if (C.isLive()) { el.remove(); }
      else { el.classList.add('is-slot'); el.innerHTML = '<span>Artwork pending · ' + a.file + '</span>'; }
    });
    document.querySelectorAll('[data-comp-approved]').forEach(function (el) { if (!C.approved[el.getAttribute('data-comp-approved')]) el.remove(); else el.removeAttribute('hidden'); });
    document.querySelectorAll('[data-comp-email]').forEach(function (el) { if (C.enquiriesEmail) { el.href = 'mailto:' + C.enquiriesEmail; el.textContent = C.enquiriesEmail; el.closest('[data-comp-needs-email]') && el.closest('[data-comp-needs-email]').removeAttribute('hidden'); } else { var w = el.closest('[data-comp-needs-email]'); if (w) w.remove(); } });
    document.querySelectorAll('[data-comp-preview]').forEach(function (el) { if (C.isLive()) el.remove(); else el.removeAttribute('hidden'); });
    document.documentElement.setAttribute('data-comp-state', st);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply); else apply();
})();
