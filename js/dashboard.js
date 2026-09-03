document.addEventListener('DOMContentLoaded', async () => {
  const session = await requireAuth(); if (!session) return;
  renderShell({ active: 'Dashboard' }); await loadUserProfile();

  const queries = await Promise.all([
    window.rmsSupabase.from('job_postings').select('job_id,status',{count:'exact',head:false}),
    window.rmsSupabase.from('applicants').select('applicant_id',{count:'exact',head:false}),
    window.rmsSupabase.from('applications').select('application_id,status',{count:'exact',head:false}),
    window.rmsSupabase.from('interviews').select('interview_id',{count:'exact',head:false}),
    window.rmsSupabase.from('applications').select('application_id,application_date,status, applicants(first_name,last_name), job_postings(job_title)').order('application_date',{ascending:false}).limit(7)
  ]);

  const [jobs, applicants, applications, interviews, recent] = queries;
  if (jobs.error || applicants.error || applications.error || interviews.error) {
    showToast('Some dashboard data could not be loaded.', 'error');
  }

  const jobData = jobs.data || []; const applicationData = applications.data || [];
  const metrics = [
    ['Total Job Postings', jobData.length, 'All vacancies'],
    ['Open Job Postings', jobData.filter(x=>x.status==='Open').length, 'Currently active'],
    ['Total Applicants', (applicants.data || []).length, 'Active records included'],
    ['Total Applications', applicationData.length, 'All application records'],
    ['Pending Screening', applicationData.filter(x=>x.status==='Screening').length, 'Need review'],
    ['Scheduled Interviews', (interviews.data || []).length, 'Interview records'],
    ['Hired Applicants', applicationData.filter(x=>x.status==='Hired').length, 'Applications marked hired'],
  ];
  document.getElementById('metricGrid').innerHTML = metrics.slice(0,4).map(([label,value,hint])=>`<div class="metric-card glass-panel"><div class="metric-label">${label}</div><div class="metric-value">${value}</div><div class="metric-hint">${hint}</div></div>`).join('');

  document.getElementById('recentApplications').innerHTML = (recent.data || []).length ? recent.data.map(row => `<tr><td><strong>${escapeHtml(`${row.applicants?.first_name||''} ${row.applicants?.last_name||''}`.trim() || 'Unknown')}</strong></td><td>${escapeHtml(row.job_postings?.job_title || '—')}</td><td>${formatDate(row.application_date)}</td><td>${statusBadge(row.status)}</td></tr>`).join('') : `<tr><td colspan="4" class="table-empty">No applications found yet.</td></tr>`;
  const open = jobData.filter(x=>x.status==='Open').length, closed = jobData.filter(x=>x.status==='Closed').length, total = Math.max(jobData.length,1);
  document.getElementById('jobStatusSummary').innerHTML = `<div class="summary-item"><div class="summary-head"><span>Open</span><strong>${open}</strong></div><div class="progress"><span style="width:${Math.round(open/total*100)}%"></span></div></div><div class="summary-item"><div class="summary-head"><span>Closed</span><strong>${closed}</strong></div><div class="progress"><span style="width:${Math.round(closed/total*100)}%"></span></div></div>`;
});
