(function(){
  const root = document.getElementById('rs-root');

  let state = {
    view: 'loading',
    hrName: null,
    jobs: [],
    currentJobId: null,
    candidatesByJob: {},
    dragOver: false,
    processing: [],
    detailCandidateId: null,
    showJobModal: false,
    editingJobId: null,
    searchQuery: '',
    filterRecommend: 'All',
    darkMode: localStorage.getItem('rs-theme') !== 'light'   // dark by default
  };

  // Apply stored theme immediately before first render
  function applyTheme() {
    if (state.darkMode) {
      root.setAttribute('data-theme', 'dark');
    } else {
      root.removeAttribute('data-theme');
    }
  }

  function toggleTheme() {
    state.darkMode = !state.darkMode;
    localStorage.setItem('rs-theme', state.darkMode ? 'dark' : 'light');
    applyTheme();
    // Re-render only the toggle button area to avoid full DOM reset
    const btn = document.getElementById('rs-theme-toggle');
    if (btn) {
      btn.innerHTML = themeToggleInner();
    }
  }

  function themeToggleInner() {
    return `
      <div class="rs-theme-toggle-track">
        <div class="rs-theme-toggle-thumb">${state.darkMode ? '🌙' : '☀️'}</div>
      </div>
      <span class="rs-theme-toggle-label">${state.darkMode ? 'Dark Mode' : 'Light Mode'}</span>
    `;
  }

  function uid(prefix){ return prefix + '_' + Math.random().toString(36).slice(2,10); }

  // Local storage only for the HR profile name session
  function getHRName() {
    return localStorage.getItem('hr-name');
  }
  function setHRName(name) {
    localStorage.setItem('hr-name', name);
  }

  // --- API Integrations ---
  async function apiFetch(url, options = {}) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (e) {
      console.error(`API Error fetching ${url}:`, e);
      throw e;
    }
  }

  async function loadJobs() {
    try {
      state.jobs = await apiFetch('/api/jobs');
      if (state.jobs.length && !state.currentJobId) {
        state.currentJobId = state.jobs[0].id;
      }
    } catch (e) {
      console.error("Failed to load jobs from backend:", e);
    }
  }

  async function loadCandidates(jobId) {
    if (!jobId) return;
    try {
      const list = await apiFetch(`/api/jobs/${jobId}/candidates`);
      state.candidatesByJob[jobId] = list || [];
    } catch (e) {
      console.error(`Failed to load candidates for job ${jobId}:`, e);
      state.candidatesByJob[jobId] = [];
    }
  }

  async function init(){
    applyTheme();
    const name = getHRName();
    await loadJobs();
    
    if(name){
      state.hrName = name;
      state.view = 'main';
      if(state.currentJobId){
        await loadCandidates(state.currentJobId);
      }
    } else {
      state.view = 'welcome';
    }
    render();
  }

  function currentCandidates(){
    return state.candidatesByJob[state.currentJobId] || [];
  }
  
  function currentJob(){
    return state.jobs.find(j => j.id === state.currentJobId);
  }

  // ---------------- File upload handling ----------------
  async function handleFiles(fileList){
    const job = currentJob();
    if(!job){ alert('Select or create a job position first.'); return; }
    
    const files = Array.from(fileList).filter(f => /\.(pdf|docx|txt)$/i.test(f.name));
    if(!files.length){ alert('Please drop .pdf, .docx or .txt resume files.'); return; }

    // Add files to the processing queue
    const queueEntries = files.map(f => ({ id: uid('q'), name: f.name, status: 'Uploading...', error: false }));
    state.processing = state.processing.concat(queueEntries);
    render();

    for(let i=0; i<files.length; i++){
      const entry = queueEntries[i];
      const file = files[i];
      
      try{
        entry.status = 'Parsing & AI Scoring...';
        render();

        const formData = new FormData();
        formData.append("file", file);

        const candidate = await apiFetch(`/api/jobs/${job.id}/resume`, {
          method: "POST",
          body: formData
        });

        // Add candidate to front of local list
        if(!state.candidatesByJob[job.id]) state.candidatesByJob[job.id] = [];
        state.candidatesByJob[job.id].unshift(candidate);

        // Update candidate count on job
        const jobItem = state.jobs.find(j => j.id === job.id);
        if (jobItem) jobItem.candidateCount = (jobItem.candidateCount || 0) + 1;

        // Remove from processing queue
        entry.status = 'Done';
        state.processing = state.processing.filter(p => p.id !== entry.id);
        render();
      } catch(err){
        entry.status = err.message || 'Analysis failed';
        entry.error = true;
        render();
        // Remove error item after 6 seconds
        setTimeout(() => {
          state.processing = state.processing.filter(p => p.id !== entry.id);
          render();
        }, 6000);
      }
    }
  }

  // ---------------- Rendering ----------------
  function render(){
    if(state.view === 'loading'){ root.innerHTML = '<div style="padding: 40px; text-align: center; color: var(--muted); font-weight: 500;">Loading screener...</div>'; return; }
    if(state.view === 'welcome'){ renderWelcome(); return; }
    renderMain();
  }

  // Real-time search focus-restore wrapper to prevent losing input focus when rendering
  function renderWithFocusRestore() {
    const activeElId = document.activeElement ? document.activeElement.id : null;
    const activeSelectionStart = document.activeElement ? document.activeElement.selectionStart : null;
    const activeSelectionEnd = document.activeElement ? document.activeElement.selectionEnd : null;
    
    render();
    
    if (activeElId) {
      const el = document.getElementById(activeElId);
      if (el) {
        el.focus();
        if (activeSelectionStart !== null && activeSelectionEnd !== null) {
          try {
            el.setSelectionRange(activeSelectionStart, activeSelectionEnd);
          } catch(e) {}
        }
      }
    }
  }

  function renderWelcome(){
    root.innerHTML = `
      <div class="rs-welcome">
        <div class="rs-welcome-card">
          <div class="rs-eyebrow">Resume Screener &middot; Production</div>
          <h1>Let's get set up</h1>
          <p>Drop resumes in, get AI-scored matches against your job description, and send review emails &mdash; backed by PostgreSQL database storage.</p>
          <div class="rs-field">
            <label>Your name</label>
            <input id="rs-hr-name-input" type="text" placeholder="e.g. Sara Khan" autofocus/>
          </div>
          <button class="rs-btn rs-btn-block" id="rs-welcome-continue">Continue &rarr;</button>
        </div>
      </div>
    `;
    const input = document.getElementById('rs-hr-name-input');
    input.addEventListener('keydown', e => { if(e.key === 'Enter') submitWelcome(); });
    document.getElementById('rs-welcome-continue').addEventListener('click', submitWelcome);
  }

  function submitWelcome(){
    const input = document.getElementById('rs-hr-name-input');
    const name = (input.value || '').trim();
    if(!name){ input.focus(); return; }
    state.hrName = name;
    setHRName(name);
    state.view = 'main';
    render();
  }

  function badgeHtml(rec, label){
    const displayLabel = label || rec;
    let cls = 'rs-badge-review';
    if (rec === 'Shortlist') {
      cls = 'rs-badge-shortlist';
    } else if (rec === 'Reject') {
      cls = 'rs-badge-reject';
    }
    return `<span class="rs-badge ${cls}">${escapeHtml(displayLabel)}</span>`;
  }

  function renderMain(){
    const job = currentJob();
    const candidates = currentCandidates();
    const shortlisted = candidates.filter(c => c.recommendation === 'Shortlist').length;
    const review = candidates.filter(c => c.recommendation === 'Review').length;
    const rejected = candidates.filter(c => c.recommendation === 'Reject').length;

    root.innerHTML = `
      <div class="rs-shell">
        <div class="rs-sidebar">
          <div class="rs-brand">
            <div class="rs-brand-mark">R</div>
            <div>
              <div class="rs-brand-name">Resume Screener</div>
              <div class="rs-brand-sub">HR-first triage</div>
            </div>
          </div>
          <div class="rs-hr-name">Signed in as <strong>${escapeHtml(state.hrName)}</strong></div>
          <div>
            <div class="rs-sidebar-section-label">Job Positions</div>
            <div class="rs-job-list" id="rs-job-list">
              ${state.jobs.map(j => `
                <div class="rs-job-item ${j.id === state.currentJobId ? 'active' : ''}" data-job-id="${j.id}">
                  <div>${escapeHtml(j.title)}</div>
                  <div class="rs-job-count">${j.candidateCount || 0} candidate${j.candidateCount===1?'':'s'}</div>
                </div>
              `).join('') || '<div style="font-size:12.5px;color:var(--muted);padding:6px 2px;">No positions yet</div>'}
            </div>
            <button class="rs-add-job-btn" id="rs-add-job-btn" style="margin-top:8px;">+ Add job position</button>
          </div>
          <div class="rs-sidebar-footer">
            <button id="rs-theme-toggle" class="rs-theme-toggle">
              ${themeToggleInner()}
            </button>
            <div style="margin-top:12px;">Production workflow: HR uploads &rarr; AI scores &rarr; DB saves &rarr; HR sends email drafts.</div>
          </div>
        </div>

        <div class="rs-main">
          ${job ? renderJobHeader(job, shortlisted, review, rejected) : renderNoJobState()}
          ${job ? renderDropzone() : ''}
          ${state.processing.length ? renderQueue() : ''}
          ${job ? renderCandidateDashboardTable(candidates) : ''}
        </div>
      </div>
      ${state.showJobModal ? renderJobModal() : ''}
      ${state.detailCandidateId ? renderDrawer() : ''}
    `;

    attachMainListeners();
  }

  function renderNoJobState(){
    return `
      <div class="rs-header">
        <h2>Welcome, ${escapeHtml(state.hrName.split(' ')[0])}</h2>
        <div class="rs-job-desc">Create your first job position to start screening resumes.</div>
      </div>
      <div class="rs-empty">No job position selected yet. Click "+ Add job position" in the sidebar to begin.</div>
    `;
  }

  function renderJobHeader(job, shortlisted, review, rejected){
    return `
      <div class="rs-header">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:16px; flex-wrap:wrap; margin-bottom:12px;">
          <div>
            <h2 style="margin:0 0 8px;">${escapeHtml(job.title)}</h2>
            <div class="rs-job-desc">${escapeHtml(job.description)}</div>
          </div>
          <div style="display:flex; gap:8px; flex-shrink:0;">
            <button class="rs-btn rs-btn-secondary" id="rs-edit-job-btn" style="padding: 8px 14px; font-size: 13px;">✏️ Edit Position</button>
            <button class="rs-btn rs-btn-danger" id="rs-delete-job-btn" style="padding: 8px 14px; font-size: 13px;">🗑️ Delete Position</button>
          </div>
        </div>
        <div class="rs-stats-row">
          <div class="rs-stat-pill"><span class="rs-stat-dot" style="background:var(--shortlist)"></span>${shortlisted} Shortlist</div>
          <div class="rs-stat-pill"><span class="rs-stat-dot" style="background:var(--review)"></span>${review} Review</div>
          <div class="rs-stat-pill"><span class="rs-stat-dot" style="background:var(--reject)"></span>${rejected} Reject</div>
        </div>
      </div>
    `;
  }

  function renderDropzone(){
    return `
      <div class="rs-dropzone ${state.dragOver ? 'rs-drag-over' : ''}" id="rs-dropzone">
        <div class="rs-dz-icon">📥</div>
        <h3>Drag &amp; drop resumes here</h3>
        <p>PDF, DOCX or TXT &middot; drop one or several at once</p>
        <button class="rs-btn rs-btn-secondary" id="rs-browse-btn">Browse files</button>
        <input type="file" id="rs-file-input" class="rs-file-input" multiple accept=".pdf,.docx,.txt"/>
      </div>
    `;
  }

  function renderQueue(){
    return `
      <div class="rs-queue">
        ${state.processing.map(p => `
          <div class="rs-queue-item">
            ${p.error ? '⚠️' : '<div class="rs-spinner"></div>'}
            <div class="rs-queue-name">${escapeHtml(p.name)}</div>
            <div class="rs-queue-status ${p.error?'err':''}">${escapeHtml(p.status)}</div>
          </div>
        `).join('')}
      </div>
    `;
  }

  function renderCandidateDashboardTable(candidates){
    // 1. Filter local candidates based on Search Query and Status Filters
    let filtered = [...candidates];
    
    if (state.searchQuery) {
      const q = state.searchQuery.toLowerCase().trim();
      filtered = filtered.filter(c => 
        (c.fullName && c.fullName.toLowerCase().includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.appliedPosition && c.appliedPosition.toLowerCase().includes(q))
      );
    }
    
    if (state.filterRecommend && state.filterRecommend !== 'All') {
      filtered = filtered.filter(c => {
        const label = c.recommendationLabel || c.recommendation;
        return label === state.filterRecommend;
      });
    }

    const tableHeaderMarkup = `
      <div class="rs-dashboard-toolbar">
        <div class="rs-search-box">
          <span class="rs-search-icon">🔍</span>
          <input type="text" id="rs-search-input" placeholder="Search by name, email, or position..." value="${escapeAttr(state.searchQuery || '')}"/>
        </div>
        <div class="rs-filter-box">
          <label for="rs-filter-recommend">Recommendation:</label>
          <select id="rs-filter-recommend">
            <option value="All" ${state.filterRecommend === 'All' ? 'selected' : ''}>All Decisions</option>
            <option value="Strong Shortlist" ${state.filterRecommend === 'Strong Shortlist' ? 'selected' : ''}>Strong Shortlist</option>
            <option value="Shortlist" ${state.filterRecommend === 'Shortlist' ? 'selected' : ''}>Shortlist</option>
            <option value="Needs HR Review" ${state.filterRecommend === 'Needs HR Review' ? 'selected' : ''}>Needs HR Review</option>
            <option value="Reject" ${state.filterRecommend === 'Reject' ? 'selected' : ''}>Reject</option>
          </select>
        </div>
      </div>
    `;

    if (!filtered.length) {
      return `
        ${tableHeaderMarkup}
        <div class="rs-table-container">
          <table class="rs-dashboard-table">
            <thead>
              <tr>
                <th>Candidate ID</th>
                <th>Full Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Applied Position</th>
                <th>Upload Date</th>
                <th>Resume Total Score</th>
                <th>Recommendation</th>
                <th>Email Sent</th>
                <th style="text-align: right;">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colspan="10" style="text-align: center; color: var(--muted); padding: 48px 24px; font-weight: 500;">
                  No candidates match your search filters.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      `;
    }

    // Sort by total score descending
    const sorted = filtered.sort((a,b) => b.score - a.score);

    return `
      ${tableHeaderMarkup}
      <div class="rs-table-container">
        <table class="rs-dashboard-table">
          <thead>
            <tr>
              <th>Candidate ID</th>
              <th>Full Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Applied Position</th>
              <th>Upload Date</th>
              <th>Resume Total Score</th>
              <th>Recommendation</th>
              <th>Email Sent</th>
              <th style="text-align: right;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${sorted.map(c => {
              const scoreClass = c.score >= 85 ? 'rs-score-high' : (c.score >= 60 ? 'rs-score-mid' : 'rs-score-low');
              const formattedDate = new Date(c.uploadDate || c.analyzedAt).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              });
              return `
                <tr class="rs-cand-row" data-cand-id="${c.id}">
                  <td class="rs-table-id">#${c.candidateId || c.id}</td>
                  <td class="rs-table-name">${escapeHtml(c.fullName || c.name)}</td>
                  <td class="rs-table-email">${escapeHtml(c.email)}</td>
                  <td style="color: var(--muted); font-size: 13px;">${escapeHtml(c.phone || 'N/A')}</td>
                  <td>${escapeHtml(c.appliedPosition || c.currentTitle)}</td>
                  <td style="color: var(--muted); font-size: 13px;">${formattedDate}</td>
                  <td>
                    <span class="rs-table-score-badge ${scoreClass}">${c.score}</span>
                  </td>
                  <td>${badgeHtml(c.recommendation, c.recommendationLabel)}</td>
                  <td>
                    <span class="rs-sent-badge ${c.sent ? 'yes' : 'no'}">
                      ${c.sent ? '✅ Yes' : '✖ No'}
                    </span>
                  </td>
                  <td>
                    <div class="rs-actions-col">
                       <button class="rs-btn rs-btn-secondary rs-view-details-btn" data-cand-id="${c.id}">Details</button>
                       <button class="rs-btn rs-send-email-btn" data-cand-id="${c.id}">Send Email</button>
                       <button class="rs-btn rs-btn-danger rs-delete-cand-btn" data-cand-id="${c.id}" title="Delete permanently">🗑️ Delete</button>
                    </div>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  const SCORE_CATEGORY_MAX = {
    technicalSkills: 40, experience: 20, education: 10, projects: 15,
    certifications: 5, resumeQuality: 5, bonusSkills: 5
  };
  const SCORE_CATEGORY_LABELS = [
    ['technicalSkills', 'Technical skills match'],
    ['experience', 'Experience'],
    ['education', 'Education'],
    ['projects', 'Projects & portfolio'],
    ['certifications', 'Certifications'],
    ['resumeQuality', 'Resume quality'],
    ['bonusSkills', 'Bonus skills']
  ];

  function renderDrawer(){
    const candidates = currentCandidates();
    const c = candidates.find(x => x.id === state.detailCandidateId);
    if(!c) return '';
    return `
      <div class="rs-overlay" id="rs-drawer-overlay">
        <div class="rs-drawer" id="rs-drawer">
          <div class="rs-drawer-top">
            <div>
              <h2>${escapeHtml(c.fullName || c.name)}</h2>
              <div class="rs-cand-meta">${escapeHtml(c.appliedPosition || c.currentTitle)} &middot; ${escapeHtml(c.yearsExperience)}</div>
              <div class="rs-cand-meta">${escapeHtml(c.email)} &middot; ${escapeHtml(c.phone)}</div>
              <div style="margin-top:10px;">${badgeHtml(c.recommendation, c.recommendationLabel)} <span style="font-family:var(--font-mono);font-weight:700;font-size:13px;margin-left:8px;">${c.score}/100</span></div>
            </div>
            <button class="rs-drawer-close" id="rs-drawer-close">✕</button>
          </div>

          <div class="rs-drawer-section">
            <h4>Why this score</h4>
            <div class="rs-summary-box">${escapeHtml(c.summary || 'No summary available.')}</div>
          </div>

          ${c.scoreBreakdown ? `
          <div class="rs-drawer-section">
            <h4>Score breakdown</h4>
            <div class="rs-breakdown-list">
              ${SCORE_CATEGORY_LABELS.map(([key, label]) => `
                <div class="rs-breakdown-row">
                  <span>${label}</span>
                  <span class="rs-breakdown-val">${c.scoreBreakdown[key] ?? 0}/${SCORE_CATEGORY_MAX[key]}</span>
                </div>
              `).join('')}
            </div>
          </div>` : ''}

          <div class="rs-drawer-section">
            <h4>Strengths</h4>
            <div class="rs-tag-list">
              ${(c.strengths.length ? c.strengths : ['None identified']).map(s => `<span class="rs-tag rs-tag-good">${escapeHtml(s)}</span>`).join('')}
            </div>
          </div>

          <div class="rs-drawer-section">
            <h4>Missing / gaps</h4>
            <div class="rs-tag-list">
              ${(c.missingSkills.length ? c.missingSkills : ['None identified']).map(s => `<span class="rs-tag rs-tag-gap">${escapeHtml(s)}</span>`).join('')}
            </div>
          </div>

          ${c.topSkills.length ? `
          <div class="rs-drawer-section">
            <h4>Key skills on resume</h4>
            <div class="rs-tag-list">
              ${c.topSkills.map(s => `<span class="rs-tag">${escapeHtml(s)}</span>`).join('')}
            </div>
          </div>` : ''}

          <div class="rs-drawer-section">
            <h4>Recommendation Override</h4>
            <div class="rs-recommend-select">
              ${['Shortlist','Review','Reject'].map(r => `
                <button class="rs-btn ${c.recommendation===r ? '' : 'rs-btn-secondary'}" data-set-rec="${r}">${r}</button>
              `).join('')}
            </div>
          </div>

          <div class="rs-drawer-section">
            <h4>Email draft</h4>
            <input type="text" class="rs-subject" id="rs-email-subject" value="${escapeAttr(c.emailSubject)}"/>
            <textarea id="rs-email-body">${escapeHtml(c.emailBody)}</textarea>
            <div class="rs-drawer-actions">
              <button class="rs-btn" id="rs-send-email">Send email</button>
              <button class="rs-btn rs-btn-secondary" id="rs-copy-email">Copy text</button>
            </div>
            ${c.sent ? '<div class="rs-sent-note">✅ Marked as sent</div>' : ''}
          </div>
        </div>
      </div>
    `;
  }

  function renderJobModal(){
    const jobToEdit = state.editingJobId ? state.jobs.find(j => j.id === state.editingJobId) : null;
    return `
      <div class="rs-modal-overlay" id="rs-modal-overlay">
        <div class="rs-modal">
          <h3>${state.editingJobId ? 'Edit job position & requirements' : 'New job position'}</h3>
          <div class="rs-field">
            <label>Job title</label>
            <input type="text" id="rs-job-title" placeholder="e.g. Senior Backend Engineer" value="${escapeAttr(jobToEdit ? jobToEdit.title : '')}"/>
          </div>
          <div class="rs-field">
            <label>Job requirements & description</label>
            <textarea id="rs-job-desc" placeholder="Paste the responsibilities, required skills, and qualifications...">${escapeHtml(jobToEdit ? jobToEdit.description : '')}</textarea>
          </div>
          <div class="rs-modal-actions">
            <button class="rs-btn rs-btn-secondary" id="rs-job-cancel">Cancel</button>
            <button class="rs-btn" id="rs-job-save">${state.editingJobId ? 'Save Changes' : 'Save position'}</button>
          </div>
        </div>
      </div>
    `;
  }

  function escapeHtml(str){
    if(str === undefined || str === null) return '';
    return String(str).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }
  function escapeAttr(str){ return escapeHtml(str); }

  // ---------------- Event wiring ----------------
  function attachMainListeners(){
    document.querySelectorAll('.rs-job-item').forEach(el => {
      el.addEventListener('click', async () => {
        state.currentJobId = el.getAttribute('data-job-id');
        await loadCandidates(state.currentJobId);
        render();
      });
    });

    const addJobBtn = document.getElementById('rs-add-job-btn');
    if(addJobBtn) addJobBtn.addEventListener('click', () => { state.editingJobId = null; state.showJobModal = true; render(); });

    const editJobBtn = document.getElementById('rs-edit-job-btn');
    if(editJobBtn) editJobBtn.addEventListener('click', () => { state.editingJobId = state.currentJobId; state.showJobModal = true; render(); });

    const deleteJobBtn = document.getElementById('rs-delete-job-btn');
    if(deleteJobBtn) deleteJobBtn.addEventListener('click', async () => {
      const job = currentJob();
      if(!job) return;
      if(!confirm(`⚠️ Delete position "${job.title}" and all its candidate evaluations?\n\nThis cannot be undone.`)) return;
      try {
        deleteJobBtn.textContent = 'Deleting...';
        deleteJobBtn.disabled = true;
        await apiFetch(`/api/jobs/${job.id}`, { method: 'DELETE' });
        state.jobs = state.jobs.filter(j => j.id !== job.id);
        delete state.candidatesByJob[job.id];
        state.currentJobId = state.jobs.length ? state.jobs[0].id : null;
        if(state.currentJobId){
          await loadCandidates(state.currentJobId);
        }
        render();
      } catch (e) {
        alert('Failed to delete position: ' + e.message);
        deleteJobBtn.textContent = '🗑️ Delete Position';
        deleteJobBtn.disabled = false;
      }
    });

    const themeToggleBtn = document.getElementById('rs-theme-toggle');
    if(themeToggleBtn) themeToggleBtn.addEventListener('click', toggleTheme);

    const dropzone = document.getElementById('rs-dropzone');
    if(dropzone){
      dropzone.addEventListener('dragover', e => { e.preventDefault(); state.dragOver = true; dropzone.classList.add('rs-drag-over'); });
      dropzone.addEventListener('dragleave', () => { state.dragOver = false; dropzone.classList.remove('rs-drag-over'); });
      dropzone.addEventListener('drop', e => {
        e.preventDefault(); state.dragOver = false;
        handleFiles(e.dataTransfer.files);
      });
      dropzone.addEventListener('click', (e) => {
        if(e.target.tagName !== 'BUTTON' && e.target.tagName !== 'INPUT' && !e.target.closest('.rs-btn')) {
          document.getElementById('rs-file-input').click();
        }
      });
    }
    const browseBtn = document.getElementById('rs-browse-btn');
    const fileInput = document.getElementById('rs-file-input');
    if(browseBtn && fileInput){
      browseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        fileInput.click();
      });
      fileInput.addEventListener('change', e => { if(e.target.files.length) handleFiles(e.target.files); });
    }

    // Search and Filter Listeners
    const searchInput = document.getElementById('rs-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', e => {
        state.searchQuery = e.target.value;
        renderWithFocusRestore();
      });
    }

    const filterRecommend = document.getElementById('rs-filter-recommend');
    if (filterRecommend) {
      filterRecommend.addEventListener('change', e => {
        state.filterRecommend = e.target.value;
        render();
      });
    }

    // Table Candidate Row Clicks
    document.querySelectorAll('.rs-cand-row').forEach(row => {
      row.addEventListener('click', e => {
        if (e.target.closest('button')) return;
        state.detailCandidateId = Number(row.getAttribute('data-cand-id')) || row.getAttribute('data-cand-id');
        render();
      });
    });

    // Action view details button
    document.querySelectorAll('.rs-view-details-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        state.detailCandidateId = Number(btn.getAttribute('data-cand-id')) || btn.getAttribute('data-cand-id');
        render();
      });
    });

    // Action send email button
    document.querySelectorAll('.rs-send-email-btn').forEach(btn => {
      btn.addEventListener('click', async e => {
        e.stopPropagation();
        const candId = Number(btn.getAttribute('data-cand-id')) || btn.getAttribute('data-cand-id');
        const cand = currentCandidates().find(x => x.id === candId);
        if(!cand) return;
        
        try {
          btn.textContent = 'Sending...';
          btn.disabled = true;

          const updated = await apiFetch(`/api/candidates/${candId}/email/send`, {
            method: 'POST'
          });
          
          cand.sent = updated.sent;
          cand.emailSent = updated.emailSent;
          
          // Open local mail editor fallback
          const to = cand.email && cand.email !== 'Not found' ? cand.email : '';
          const mailto = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(cand.emailSubject)}&body=${encodeURIComponent(cand.emailBody)}`;
          window.open(mailto, '_blank');
          
          render();
        } catch (err) {
          alert('Failed to send email: ' + err.message);
          btn.textContent = 'Send Email';
          btn.disabled = false;
        }
      });
    });

    // Delete candidate button
    document.querySelectorAll('.rs-delete-cand-btn').forEach(btn => {
      btn.addEventListener('click', async e => {
        e.stopPropagation();
        const candId = Number(btn.getAttribute('data-cand-id')) || btn.getAttribute('data-cand-id');
        const cand = currentCandidates().find(x => x.id === candId);
        const name = cand ? (cand.fullName || cand.name) : 'this candidate';
        if (!confirm(`⚠️ Permanently delete "${name}"?\n\nThis cannot be undone.`)) return;
        try {
          btn.textContent = 'Deleting...';
          btn.disabled = true;
          await apiFetch(`/api/candidates/${candId}`, { method: 'DELETE' });
          // Remove from local state
          if (state.candidatesByJob[state.currentJobId]) {
            state.candidatesByJob[state.currentJobId] = state.candidatesByJob[state.currentJobId].filter(x => x.id !== candId);
          }
          // Update candidate count on job
          const jobItem = state.jobs.find(j => j.id === state.currentJobId);
          if (jobItem && jobItem.candidateCount > 0) jobItem.candidateCount -= 1;
          render();
        } catch (err) {
          alert('Failed to delete candidate: ' + err.message);
          btn.textContent = '🗑️ Delete';
          btn.disabled = false;
        }
      });
    });

    // Modal Events
    const modalOverlay = document.getElementById('rs-modal-overlay');
    if(modalOverlay){
      modalOverlay.addEventListener('click', e => { if(e.target === modalOverlay){ state.showJobModal = false; state.editingJobId = null; render(); } });
      document.getElementById('rs-job-cancel').addEventListener('click', () => { state.showJobModal = false; state.editingJobId = null; render(); });
      document.getElementById('rs-job-save').addEventListener('click', async () => {
        const title = document.getElementById('rs-job-title').value.trim();
        const desc = document.getElementById('rs-job-desc').value.trim();
        if(!title || !desc){ alert('Please add both a title and description.'); return; }
        
        try {
          if (state.editingJobId) {
            const updatedJob = await apiFetch(`/api/jobs/${state.editingJobId}`, {
              method: 'PUT',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({ title, description: desc })
            });
            const idx = state.jobs.findIndex(j => j.id === state.editingJobId);
            if (idx !== -1) {
              state.jobs[idx].title = updatedJob.title;
              state.jobs[idx].description = updatedJob.description;
            }
          } else {
            const newJob = await apiFetch('/api/jobs', {
              method: 'POST',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({ title, description: desc })
            });
            state.jobs.unshift(newJob);
            state.candidatesByJob[newJob.id] = [];
            state.currentJobId = newJob.id;
          }
          state.showJobModal = false;
          state.editingJobId = null;
          render();
        } catch (e) {
          alert('Failed to save job position: ' + e.message);
        }
      });
    }

    // Drawer Events
    const drawerOverlay = document.getElementById('rs-drawer-overlay');
    if(drawerOverlay){
      drawerOverlay.addEventListener('click', e => { if(e.target === drawerOverlay) closeDrawer(); });
      document.getElementById('rs-drawer-close').addEventListener('click', closeDrawer);

      document.querySelectorAll('[data-set-rec]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const rec = btn.getAttribute('data-set-rec');
          const list = currentCandidates();
          const c = list.find(x => x.id === state.detailCandidateId);
          if(c){
            try {
              const updated = await apiFetch(`/api/candidates/${c.id}/recommendation`, {
                method: 'PUT',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ recommendation: rec })
              });
              c.recommendation = updated.recommendation;
              c.recommendationLabel = updated.recommendationLabel;
              render();
            } catch (e) {
              alert('Failed to update recommendation: ' + e.message);
            }
          }
        });
      });

      const subjectInput = document.getElementById('rs-email-subject');
      const bodyInput = document.getElementById('rs-email-body');
      
      const saveDraftChanges = async () => {
        const c = currentCandidates().find(x => x.id === state.detailCandidateId);
        if (c && (c.emailSubject !== subjectInput.value || c.emailBody !== bodyInput.value)) {
          c.emailSubject = subjectInput.value;
          c.emailBody = bodyInput.value;
          try {
            await apiFetch(`/api/candidates/${c.id}/email`, {
              method: 'PUT',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({ emailSubject: c.emailSubject, emailBody: c.emailBody })
            });
          } catch(e) {
            console.error('Failed to auto-save email changes:', e);
          }
        }
      };

      subjectInput.addEventListener('blur', saveDraftChanges);
      bodyInput.addEventListener('blur', saveDraftChanges);

      document.getElementById('rs-send-email').addEventListener('click', async () => {
        const c = currentCandidates().find(x => x.id === state.detailCandidateId);
        if(!c) return;
        
        // Save current email changes first
        await saveDraftChanges();

        try {
          const updated = await apiFetch(`/api/candidates/${c.id}/email/send`, {
            method: 'POST'
          });
          
          c.sent = updated.sent;
          c.emailSent = updated.emailSent;
          
          // Open standard client mailto fallback as secondary UX convenience
          const to = c.email && c.email !== 'Not found' ? c.email : '';
          const mailto = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(c.emailSubject)}&body=${encodeURIComponent(c.emailBody)}`;
          window.open(mailto, '_blank');
          
          render();
        } catch (e) {
          alert('Failed to send email: ' + e.message);
        }
      });
      
      document.getElementById('rs-copy-email').addEventListener('click', async () => {
        const c = currentCandidates().find(x => x.id === state.detailCandidateId);
        if(!c) return;
        
        await saveDraftChanges();
        try{
          await navigator.clipboard.writeText(`Subject: ${c.emailSubject}\n\n${c.emailBody}`);
          const btn = document.getElementById('rs-copy-email');
          const original = btn.textContent;
          btn.textContent = 'Copied!';
          setTimeout(() => { btn.textContent = original; }, 1500);
        }catch(e){
          console.error("Clipboard copy failed:", e);
        }
      });
    }
  }

  function closeDrawer(){ state.detailCandidateId = null; render(); }

  init();
})();
