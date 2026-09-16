document.addEventListener('DOMContentLoaded', async () => {

    const session = await requireAuth();

    if (!session) {
        return;
    }


    renderShell({
        active: 'Dashboard'
    });


    await loadUserProfile();


    const queries = await Promise.all([

        window.rmsSupabase
            .from('job_postings')
            .select(
                'job_id,status',
                {
                    count: 'exact',
                    head: false
                }
            ),

        window.rmsSupabase
            .from('applicants')
            .select(
                'applicant_id',
                {
                    count: 'exact',
                    head: false
                }
            ),

        window.rmsSupabase
            .from('applications')
            .select(
                'application_id,status',
                {
                    count: 'exact',
                    head: false
                }
            ),

        window.rmsSupabase
            .from('interviews')
            .select(
                'interview_id',
                {
                    count: 'exact',
                    head: false
                }
            ),

        window.rmsSupabase
            .from('applications')
            .select(`
                application_id,
                application_date,
                status,
                applicants(
                    first_name,
                    last_name
                ),
                job_postings(
                    job_title
                )
            `)
            .order(
                'application_date',
                {
                    ascending: false
                }
            )
            .limit(7)

    ]);


    const [
        jobs,
        applicants,
        applications,
        interviews,
        recent
    ] = queries;


    /* =====================================================
       ERROR CHECK
       ===================================================== */

    if (
        jobs.error ||
        applicants.error ||
        applications.error ||
        interviews.error
    ) {

        showToast(
            'Some dashboard data could not be loaded.',
            'error'
        );

    }


    const jobData =
        jobs.data || [];


    const applicationData =
        applications.data || [];


    /* =====================================================
       JOB STATUS NORMALIZATION
       ===================================================== */

    function normalizeJobStatus(status) {

        const value =
            String(
                status || ''
            )
                .trim()
                .toLowerCase();


        if (
            value === 'open' ||
            value === 'active'
        ) {

            return 'Open';

        }


        if (
            value === 'closed' ||
            value === 'inactive'
        ) {

            return 'Closed';

        }


        return (
            value.charAt(0).toUpperCase() +
            value.slice(1)
        );

    }


    /* =====================================================
       JOB COUNTS
       ===================================================== */

    const openJobs =
        jobData.filter(
            job =>
                normalizeJobStatus(
                    job.status
                ) === 'Open'
        );


    const closedJobs =
        jobData.filter(
            job =>
                normalizeJobStatus(
                    job.status
                ) === 'Closed'
        );


    /* =====================================================
       DASHBOARD METRICS
       ===================================================== */

    const metrics = [

        [
            'Total Job Postings',
            jobData.length,
            'All vacancies'
        ],

        [
            'Open Job Postings',
            openJobs.length,
            'Currently active'
        ],

        [
            'Total Applicants',
            (
                applicants.data ||
                []
            ).length,
            'Active records included'
        ],

        [
            'Total Applications',
            applicationData.length,
            'All application records'
        ],

        [
            'Pending Screening',
            applicationData.filter(
                x =>
                    String(
                        x.status || ''
                    )
                        .trim()
                        .toLowerCase() ===
                    'screening'
            ).length,
            'Need review'
        ],

        [
            'Scheduled Interviews',
            (
                interviews.data ||
                []
            ).length,
            'Interview records'
        ],

        [
            'Hired Applicants',
            applicationData.filter(
                x =>
                    String(
                        x.status || ''
                    )
                        .trim()
                        .toUpperCase() ===
                    'HIRED'
            ).length,
            'Applications marked hired'
        ]

    ];


    /* =====================================================
       TOP METRIC CARDS
       ===================================================== */

    const metricGrid =
        document.getElementById(
            'metricGrid'
        );


    if (metricGrid) {

        metricGrid.innerHTML =
            metrics
                .slice(0, 4)
                .map(
                    (
                        [
                            label,
                            value,
                            hint
                        ]
                    ) => `

                        <div
                            class="
                                metric-card
                                glass-panel
                            "
                        >

                            <div class="metric-label">
                                ${label}
                            </div>

                            <div class="metric-value">
                                ${value}
                            </div>

                            <div class="metric-hint">
                                ${hint}
                            </div>

                        </div>

                    `
                )
                .join('');

    }


    /* =====================================================
       RECENT APPLICATIONS
       ===================================================== */

    const recentApplications =
        document.getElementById(
            'recentApplications'
        );


    if (recentApplications) {

        const recentRows =
            recent.data || [];


        if (recentRows.length) {

            recentApplications.innerHTML =
                recentRows
                    .map(
                        row => {

                            const applicantName =
                                `

                                    ${
                                        row
                                            .applicants
                                            ?.first_name ||
                                        ''
                                    }

                                    ${
                                        row
                                            .applicants
                                            ?.last_name ||
                                        ''
                                    }

                                `
                                    .trim();


                            return `

                                <tr>

                                    <td>

                                        <strong>
                                            ${escapeHtml(
                                                applicantName ||
                                                'Unknown'
                                            )}
                                        </strong>

                                    </td>

                                    <td>
                                        ${escapeHtml(
                                            row
                                                .job_postings
                                                ?.job_title ||
                                            '—'
                                        )}
                                    </td>

                                    <td>
                                        ${formatDate(
                                            row
                                                .application_date
                                        )}
                                    </td>

                                    <td>
                                        ${statusBadge(
                                            row.status
                                        )}
                                    </td>

                                </tr>

                            `;

                        }
                    )
                    .join('');

        } else {

            recentApplications.innerHTML = `

                <tr>

                    <td
                        colspan="4"
                        class="table-empty"
                    >
                        No applications found yet.
                    </td>

                </tr>

            `;

        }

    }


    /* =====================================================
       JOB POSTING STATUS SUMMARY
       ===================================================== */

    const total =
        Math.max(
            jobData.length,
            1
        );


    const open =
        openJobs.length;


    const closed =
        closedJobs.length;


    const jobStatusSummary =
        document.getElementById(
            'jobStatusSummary'
        );


    if (jobStatusSummary) {

        jobStatusSummary.innerHTML = `

            <div class="summary-item">

                <div class="summary-head">

                    <span>
                        Open
                    </span>

                    <strong>
                        ${open}
                    </strong>

                </div>

                <div class="progress">

                    <span
                        style="
                            width:${Math.round(
                                open /
                                total *
                                100
                            )}%;
                        "
                    ></span>

                </div>

            </div>


            <div class="summary-item">

                <div class="summary-head">

                    <span>
                        Closed
                    </span>

                    <strong>
                        ${closed}
                    </strong>

                </div>

                <div class="progress">

                    <span
                        style="
                            width:${Math.round(
                                closed /
                                total *
                                100
                            )}%;
                        "
                    ></span>

                </div>

            </div>

        `;

    }

});