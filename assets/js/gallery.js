/*
 * Galleria — vanilla JS, zero dipendenze.
 *
 * NASTRO (.carousel): le foto scorrono da sole verso sinistra, due alla volta,
 * in un giro infinito (la lista viene duplicata e il nastro "riparte" senza scatti).
 * - si ferma passandoci sopra col mouse
 * - si può trascinare col dito o col mouse; dopo qualche secondo riparte da solo
 * - con "riduci movimento" attivo nel sistema non scorre da solo
 *
 * SCHERMO INTERO (.lightbox): clic/tocco su una foto la apre ingrandita
 * - frecce ← → della tastiera, Esc per chiudere, swipe su telefono
 * - il tasto "indietro" del telefono chiude la galleria invece di lasciare il sito
 *
 * Senza JavaScript ogni miniatura resta un normale link alla foto grande.
 */
(function () {
  'use strict';

  var carousel = document.querySelector('.carousel');
  var track = document.querySelector('.gallery');
  var box = document.querySelector('.lightbox');
  if (!track || !box) return;

  // Le foto "vere" (prima di duplicarle per il nastro)
  var originals = Array.prototype.slice.call(track.children);
  var links = originals.map(function (li) { return li.querySelector('a'); });
  if (!links.length) return;

  /* ───────────────────────── SCHERMO INTERO ───────────────────────── */

  var img = box.querySelector('.lb-img');
  var caption = box.querySelector('.lb-caption');
  var counter = box.querySelector('.lb-counter');
  var current = 0;
  var lastFocus = null;

  var items = links.map(function (a) {
    var thumb = a.querySelector('img');
    return {
      src: a.getAttribute('href'),
      alt: thumb ? thumb.alt : '',
      caption: a.getAttribute('data-caption') || (thumb ? thumb.alt : '')
    };
  });

  box.classList.toggle('single', items.length < 2);

  function preload(i) {
    var p = new Image();
    p.src = items[(i + items.length) % items.length].src;
  }

  function show(i) {
    current = (i + items.length) % items.length;
    var it = items[current];
    img.style.opacity = '0';
    img.onload = function () { img.style.opacity = '1'; };
    img.src = it.src;
    img.alt = it.alt;
    caption.textContent = it.caption;
    counter.textContent = (current + 1) + ' / ' + items.length;
    preload(current + 1);
    preload(current - 1);
  }

  function open(i, byKeyboard) {
    // il focus si rimette sulla foto alla chiusura solo se l'avevano scelta da tastiera
    lastFocus = byKeyboard ? document.activeElement : null;
    box.hidden = false;
    document.body.classList.add('lb-open');
    show(i);
    history.pushState({ lightbox: true }, '');
    box.querySelector('.lb-close').focus();
  }

  // fromPopstate evita di tornare indietro due volte nella cronologia
  function close(fromPopstate) {
    if (box.hidden) return;
    box.hidden = true;
    document.body.classList.remove('lb-open');
    if (!fromPopstate && history.state && history.state.lightbox) history.back();
    if (lastFocus) lastFocus.focus({ preventScroll: true });
  }

  box.querySelector('.lb-close').addEventListener('click', function () { close(false); });
  box.querySelector('.lb-prev').addEventListener('click', function () { show(current - 1); });
  box.querySelector('.lb-next').addEventListener('click', function () { show(current + 1); });
  box.addEventListener('click', function (e) {
    if (e.target === box || e.target.classList.contains('lb-figure')) close(false);
  });
  window.addEventListener('popstate', function () { close(true); });
  document.addEventListener('keydown', function (e) {
    if (box.hidden) return;
    if (e.key === 'Escape') close(false);
    else if (e.key === 'ArrowRight') show(current + 1);
    else if (e.key === 'ArrowLeft') show(current - 1);
  });

  var lbX = null, lbY = null;
  box.addEventListener('touchstart', function (e) {
    if (e.touches.length !== 1) { lbX = null; return; }
    lbX = e.touches[0].clientX;
    lbY = e.touches[0].clientY;
  }, { passive: true });
  box.addEventListener('touchend', function (e) {
    if (lbX === null) return;
    var dx = e.changedTouches[0].clientX - lbX;
    var dy = e.changedTouches[0].clientY - lbY;
    lbX = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) show(current + (dx < 0 ? 1 : -1));
  }, { passive: true });

  /* ───────────────────────────── NASTRO ───────────────────────────── */

  var dragged = false;   // true se l'ultimo gesto è stato un trascinamento, non un clic

  // Un clic apre la foto originale corrispondente (anche dalle copie del nastro)
  track.addEventListener('click', function (e) {
    var a = e.target.closest('a');
    if (!a) return;
    e.preventDefault();
    var byKeyboard = e.detail === 0;          // Invio sulla foto selezionata
    if (dragged && !byKeyboard) return;       // era un trascinamento, non un clic
    open(Number(a.getAttribute('data-index')), byKeyboard);
  });
  links.forEach(function (a, i) { a.setAttribute('data-index', i); });
  track.addEventListener('dragstart', function (e) { e.preventDefault(); });

  // Tutte le foto servono subito: col nastro entrano in scena di lato
  track.querySelectorAll('img').forEach(function (im) { im.loading = 'eager'; });

  if (!carousel) return;

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var pos = 0;           // di quanti pixel il nastro è spostato a sinistra
  var period = 0;        // larghezza di un giro completo (tutte le foto + spazi)
  var hover = false;
  var resumeAt = 0;      // dopo un trascinamento, quando ripartire da solo
  var SECONDS_PER_PHOTO = 4;

  // Duplica la lista quanto basta per riempire lo schermo durante il giro
  function fill() {
    track.querySelectorAll('[data-clone]').forEach(function (n) { n.remove(); });
    var gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    var first = originals[0];
    period = originals.length * (first.getBoundingClientRect().width + gap);
    var needed = period + carousel.clientWidth * 2;
    var total = period;
    while (total < needed) {
      originals.forEach(function (li) {
        var c = li.cloneNode(true);
        c.setAttribute('data-clone', '');
        c.setAttribute('aria-hidden', 'true');
        var a = c.querySelector('a');
        a.setAttribute('tabindex', '-1');
        var im = c.querySelector('img');
        im.loading = 'eager';
        track.appendChild(c);
      });
      total += period;
    }
  }

  function wrap() {
    if (period > 0) pos = ((pos % period) + period) % period;
  }

  function render() {
    track.style.transform = 'translate3d(' + (-pos) + 'px,0,0)';
  }

  fill();
  window.addEventListener('resize', function () {
    var ratio = period ? pos / period : 0;
    fill();
    pos = ratio * period;
    render();
  });

  // Mouse sopra / foto selezionata da tastiera: il nastro si ferma
  carousel.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') hover = true; });
  carousel.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') hover = false; });
  carousel.addEventListener('focusin', function (e) {
    if (!e.target.matches(':focus-visible')) return;   // solo navigazione da tastiera
    hover = true;
    // porta la foto selezionata dentro lo schermo
    var li = e.target.closest('li');
    if (li) { pos = li.offsetLeft - carousel.clientWidth / 4; wrap(); render(); }
    carousel.scrollLeft = 0;
  });
  carousel.addEventListener('focusout', function () { hover = false; });

  // Trascinamento (dito o mouse)
  var dragId = null, startX = 0, startY = 0, startPos = 0, horizontal = null;
  carousel.addEventListener('pointerdown', function (e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    dragId = e.pointerId;
    startX = e.clientX; startY = e.clientY; startPos = pos;
    horizontal = null;
    dragged = false;
  });
  window.addEventListener('pointermove', function (e) {
    if (e.pointerId !== dragId) return;
    var dx = e.clientX - startX, dy = e.clientY - startY;
    if (horizontal === null && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) {
      horizontal = Math.abs(dx) > Math.abs(dy);
      if (horizontal) { dragged = true; carousel.classList.add('dragging'); }
    }
    if (horizontal) {
      pos = startPos - dx;
      wrap();
      render();
    }
  });
  function endDrag(e) {
    if (e.pointerId !== dragId) return;
    dragId = null;
    carousel.classList.remove('dragging');
    // "dragged" resta vero fino al prossimo tocco: il clic che segue il rilascio non apre la foto
    if (dragged) resumeAt = performance.now() + 2500;
  }
  window.addEventListener('pointerup', endDrag);
  window.addEventListener('pointercancel', endDrag);

  // Scorrimento automatico
  var last = performance.now();
  function tick(now) {
    var dt = Math.min((now - last) / 1000, 0.05);   // tab in background: niente salti
    last = now;
    var moving = !reduceMotion && !hover && dragId === null && box.hidden && now >= resumeAt;
    if (moving && period > 0) {
      var speed = period / originals.length / SECONDS_PER_PHOTO;   // px al secondo
      pos += speed * dt;
      wrap();
      render();
    }
    requestAnimationFrame(tick);
  }
  render();
  requestAnimationFrame(tick);
})();
