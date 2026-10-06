(() => {
  'use strict';

  const REFRESH_MS = 15000;
  const SEVERITIES = ['critical', 'high', 'medium', 'low'];
  const TYPE_LABELS = {
    HIGH_RESPONSE_TIME: 'Slow response',
    FAILED_REQUEST: 'Failed request',
    NO_RECORDS: 'No records',
    INVALID_DATA: 'Invalid data',
  };
  const SAMPLE = [
    { api_name: 'PatientDataAPI', response_time_ms: 1200, status_code: 200, records_returned: 50 },
    { api_name: 'AppointmentAPI', response_time_ms: 5500, status_code: 500, records_returned: 0 },
  ];

  const $ = (id) => document.getElementById(id);
  const els = {
    live: $('liveStatus'),
    refresh: $('refreshBtn'),
    statActive: $('statActive'),
    statCritical: $('statCritical'),
    statHigh: $('statHigh'),
    statOther: $('statOther'),
    status: $('statusFilter'),
    severity: $('severityFilter'),
    list: $('alertList'),
    empty: $('emptyState'),
    error: $('errorBox'),
    input: $('testInput'),
    send: $('sendBtn'),
    sample: $('loadSampleBtn'),
    sendResult: $('sendResult'),
  };

  // All text goes in through textContent, never innerHTML (alert text comes from outside and from AI)
  function h(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  async function api(path, options) {
    const res = await fetch(path, options);
    let body = null;
    try { body = await res.json(); } catch { /* response had no JSON body */ }
    if (!res.ok) {
      throw new Error(body && body.error ? body.error : `Request failed (${res.status})`);
    }
    return body;
  }

  function timeAgo(value) {
    const seconds = Math.round((Date.now() - new Date(value).getTime()) / 1000);
    if (!Number.isFinite(seconds)) return '';
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} h ago`;
    return new Date(value).toLocaleString();
  }

  function metric(label, value) {
    const wrap = h('div', 'metric');
    wrap.append(h('dt', null, label), h('dd', null, value));
    return wrap;
  }

  function show(value, suffix = '') {
    return value === undefined || value === null ? '—' : `${value}${suffix}`;
  }

  function renderAlert(a) {
    const severity = SEVERITIES.includes(a.severity) ? a.severity : 'low';
    const resolved = a.status === 'resolved';

    const card = h('article', `alert alert--${severity}${resolved ? ' alert--resolved' : ''}`);

    const head = h('div', 'alert__head');
    head.append(h('h2', 'alert__title', a.apiName), h('span', `badge badge--${severity}`, severity));

    const chips = h('div', 'chips');
    for (const type of a.anomalyTypes || []) {
      chips.append(h('span', 'chip', TYPE_LABELS[type] || type));
    }

    const metrics = h('dl', 'metrics');
    metrics.append(
      metric('Status code', show(a.statusCode)),
      metric('Response time', show(a.responseTimeMs, ' ms')),
      metric('Records', show(a.recordsReturned))
    );

    const foot = h('div', 'alert__foot');
    const source = a.aiGenerated ? 'Written by AI' : 'Template message (AI unavailable)';
    foot.append(h('span', null, `${timeAgo(a.createdAt)} · ${source}`));

    if (resolved) {
      foot.append(h('span', null, `Resolved ${timeAgo(a.resolvedAt)}`));
    } else {
      const btn = h('button', 'btn', 'Mark resolved');
      btn.type = 'button';
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        try {
          await api(`/alerts/${encodeURIComponent(a._id)}/resolve`, { method: 'PATCH' });
          await load();
        } catch (err) {
          showError(err.message);
          btn.disabled = false;
        }
      });
      foot.append(btn);
    }

    card.append(head, h('p', 'alert__msg', a.message), chips, metrics, foot);
    return card;
  }

    function renderList(alerts) {
    // Most severe first, newest first inside the same severity
    const rank = (s) => {
      const i = SEVERITIES.indexOf(s);
      return i === -1 ? SEVERITIES.length : i;
    };
    const sorted = [...alerts].sort(
      (a, b) => rank(a.severity) - rank(b.severity) || new Date(b.createdAt) - new Date(a.createdAt)
    );
    els.list.replaceChildren(...sorted.map(renderAlert));
    els.empty.hidden = sorted.length > 0;
  }

  function renderStats(active) {
    const count = (s) => active.filter((a) => a.severity === s).length;
    els.statActive.textContent = active.length;
    els.statCritical.textContent = count('critical');
    els.statHigh.textContent = count('high');
    els.statOther.textContent = count('medium') + count('low');
  }

  function showError(message) {
    els.error.textContent = message;
    els.error.hidden = false;
  }

  function setLive(ok, text) {
    els.live.textContent = text;
    els.live.className = `live ${ok ? 'live--ok' : 'live--bad'}`;
  }

  async function load() {
    const params = new URLSearchParams({ limit: '200', status: els.status.value });
    if (els.severity.value) params.set('severity', els.severity.value);

    try {
      const [filtered, active] = await Promise.all([
        api(`/alerts?${params}`),
        api('/alerts?status=active&limit=500'),
      ]);
      els.error.hidden = true;
      renderStats(active.alerts);
      renderList(filtered.alerts);
      setLive(true, `Live · updated ${new Date().toLocaleTimeString()}`);
    } catch (err) {
      showError(`Could not load alerts: ${err.message}`);
      setLive(false, 'Disconnected');
    }
  }

  async function sendTest() {
    let payload;
    try {
      payload = JSON.parse(els.input.value);
    } catch {
      els.sendResult.textContent = 'That is not valid JSON.';
      return;
    }

    els.send.disabled = true;
    els.send.textContent = 'Analyzing…';
    els.sendResult.textContent = '';

    try {
      const r = await api('/monitor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      els.sendResult.textContent =
        `Processed ${r.processed}: ${r.healthy} healthy, ${r.alertsCreated} alerts created, ` +
        `${r.failed} failed (${(r.durationMs / 1000).toFixed(1)} s).`;
      await load();
    } catch (err) {
      els.sendResult.textContent = err.message;
    } finally {
      els.send.disabled = false;
      els.send.textContent = 'Send to /monitor';
    }
  }

  function resetSample() {
    els.input.value = JSON.stringify(SAMPLE, null, 2);
  }

  els.refresh.addEventListener('click', load);
  els.status.addEventListener('change', load);
  els.severity.addEventListener('change', load);
  els.send.addEventListener('click', sendTest);
  els.sample.addEventListener('click', resetSample);

  resetSample();
  load();
  setInterval(() => { if (!document.hidden) load(); }, REFRESH_MS);
})();