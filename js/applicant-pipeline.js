/* =========================================================
   RECRUITMENT MANAGEMENT SYSTEM
   LABORATORY ACTIVITY 21
   RECRUITMENT PIPELINE REPORT
   ========================================================= */


/* =========================================================
   DATA
   ========================================================= */

let pipelineData = {

    applicants: [],

    applications: [],

    jobs: [],

    screenings: [],

    interviews: [],

    hiring: [],

    positions: []

};


let pipelineEventsBound = false;


/* =========================================================
   INITIALIZE
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        initRecruitmentPipeline();

    }
);


async function initRecruitmentPipeline() {

    /*
     * IMPORTANT:
     * This must match the navigation label
     * used in components.js.
     */

    renderShell({
        active: "Recruitment Pipeline"
    });


    /*
     * Authentication
     */

    if (
        typeof requireAuth === "function"
    ) {

        const authenticated =
            await requireAuth();


        if (!authenticated) {
            return;
        }

    }


    /*
     * Bind buttons only once.
     */

    if (!pipelineEventsBound) {

        bindPipelineEvents();

        pipelineEventsBound = true;

    }


    /*
     * Load user profile.
     */

    if (
        typeof loadUserProfile === "function"
    ) {

        try {

            await loadUserProfile();

        } catch (error) {

            console.warn(
                "Unable to load user profile:",
                error
            );

        }

    }


    /*
     * Load report.
     */

    await loadRecruitmentPipeline();

}


/* =========================================================
   SUPABASE CLIENT
   ========================================================= */

function getPipelineSupabase() {

    if (
        window.rmsSupabase &&
        typeof window.rmsSupabase.from === "function"
    ) {

        return window.rmsSupabase;

    }


    if (
        window.supabaseClient &&
        typeof window.supabaseClient.from === "function"
    ) {

        return window.supabaseClient;

    }


    throw new Error(
        "Supabase client was not found. Check js/supabase.js."
    );

}


/* =========================================================
   LOAD DATA
   ========================================================= */

async function loadRecruitmentPipeline() {

    showPipelineLoading();


    try {

        const supabase =
            getPipelineSupabase();


        /* =================================================
           APPLICANTS
           ================================================= */

        const applicantsResult =
            await supabase
                .from("applicants")
                .select(`
                    applicant_id,
                    applicant_no,
                    first_name,
                    last_name,
                    email,
                    status
                `);


        if (
            applicantsResult.error
        ) {

            throw new Error(
                "Applicants: " +
                applicantsResult.error.message
            );

        }


        pipelineData.applicants =
            applicantsResult.data || [];


        /* =================================================
           APPLICATIONS
           ================================================= */

        const applicationsResult =
            await supabase
                .from("applications")
                .select(`
                    application_id,
                    applicant_id,
                    job_id,
                    application_date,
                    status,
                    created_at
                `);


        if (
            applicationsResult.error
        ) {

            throw new Error(
                "Applications: " +
                applicationsResult.error.message
            );

        }


        pipelineData.applications =
            applicationsResult.data || [];


        /* =================================================
           JOB POSTINGS
           ================================================= */

        const jobsResult =
            await supabase
                .from("job_postings")
                .select(`
                    job_id,
                    job_code,
                    job_title,
                    department,
                    vacancies,
                    status,
                    posting_date,
                    closing_date
                `);


        if (
            jobsResult.error
        ) {

            throw new Error(
                "Job Postings: " +
                jobsResult.error.message
            );

        }


        pipelineData.jobs =
            jobsResult.data || [];


        /* =================================================
           SCREENINGS
           ================================================= */

        const screeningsResult =
            await supabase
                .from("screenings")
                .select(`
                    screening_id,
                    application_id,
                    screening_date,
                    score,
                    result,
                    screened_by,
                    created_at
                `);


        if (
            screeningsResult.error
        ) {

            throw new Error(
                "Screenings: " +
                screeningsResult.error.message
            );

        }


        pipelineData.screenings =
            screeningsResult.data || [];


        /* =================================================
           INTERVIEWS
           ================================================= */

        const interviewsResult =
            await supabase
                .from("interviews")
                .select(`
                    interview_id,
                    application_id,
                    interview_date,
                    interview_time,
                    interviewer,
                    status,
                    score,
                    result,
                    remarks,
                    created_at,
                    updated_at
                `);


        if (
            interviewsResult.error
        ) {

            throw new Error(
                "Interviews: " +
                interviewsResult.error.message
            );

        }


        pipelineData.interviews =
            interviewsResult.data || [];


        /* =================================================
           HIRING
           ================================================= */

        const hiringResult =
            await supabase
                .from("hiring")
                .select(`
                    hiring_id,
                    application_id,
                    hiring_date,
                    position,
                    salary_offer,
                    employment_status,
                    start_date,
                    status,
                    created_at,
                    updated_at
                `);


        if (
            hiringResult.error
        ) {

            throw new Error(
                "Hiring: " +
                hiringResult.error.message
            );

        }


        pipelineData.hiring =
            hiringResult.data || [];


        /*
         * Build position pipeline.
         */

        buildPipelinePositions();


        /*
         * Render everything.
         */

        renderPipeline();


        setText(
            "pipelineUpdated",
            `Updated ${new Date().toLocaleString(
                "en-US",
                {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit"
                }
            )}`
        );


        showPipelineToast(
            "Recruitment pipeline loaded successfully.",
            "success"
        );


    } catch (error) {

        console.error(
            "Recruitment Pipeline Error:",
            error
        );


        renderPipelineError(
            error.message ||
            "Unable to load recruitment pipeline."
        );


        showPipelineToast(
            error.message ||
            "Unable to load recruitment pipeline.",
            "error"
        );

    }

}


/* =========================================================
   BUILD POSITION PIPELINE
   ========================================================= */

function buildPipelinePositions() {

    const jobs =
        pipelineData.jobs || [];


    const applications =
        pipelineData.applications || [];


    const positions = [];


    jobs.forEach(job => {

        const jobApplications =
            applications.filter(
                application =>
                    String(
                        application.job_id
                    ) === String(
                        job.job_id
                    )
            );


        /*
         * If a job has no applications,
         * it is still displayed because
         * it is a recruitment position.
         */

        const applicantIds =
            new Set();


        const screenedApplicantIds =
            new Set();


        const qualifiedApplicantIds =
            new Set();


        const interviewedApplicantIds =
            new Set();


        const selectedApplicantIds =
            new Set();


        const hiredApplicantIds =
            new Set();


        /*
         * Applications / applicants
         */

        jobApplications.forEach(
            application => {

                if (
                    application.applicant_id
                ) {

                    applicantIds.add(
                        String(
                            application.applicant_id
                        )
                    );

                }


                const status =
                    normalizeStatus(
                        application.status
                    );


                /*
                 * Qualified
                 */

                if (
                    status === "QUALIFIED"
                ) {

                    if (
                        application.applicant_id
                    ) {

                        qualifiedApplicantIds.add(
                            String(
                                application.applicant_id
                            )
                        );

                    }

                }


                /*
                 * Selected
                 */

                if (
                    status === "SELECTED FOR HIRING"
                ) {

                    if (
                        application.applicant_id
                    ) {

                        selectedApplicantIds.add(
                            String(
                                application.applicant_id
                            )
                        );

                    }

                }


                /*
                 * Hired
                 */

                if (
                    status === "HIRED"
                ) {

                    if (
                        application.applicant_id
                    ) {

                        hiredApplicantIds.add(
                            String(
                                application.applicant_id
                            )
                        );

                    }

                }

            }
        );


        /*
         * Screened
         *
         * A screening record means the
         * application has gone through
         * screening.
         */

        const jobApplicationIds =
            new Set(
                jobApplications.map(
                    application =>
                        String(
                            application.application_id
                        )
                )
            );


        pipelineData.screenings
            .forEach(screening => {

                if (
                    jobApplicationIds.has(
                        String(
                            screening.application_id
                        )
                    )
                ) {

                    const application =
                        jobApplications.find(
                            item =>
                                String(
                                    item.application_id
                                ) ===
                                String(
                                    screening.application_id
                                )
                        );


                    if (
                        application &&
                        application.applicant_id
                    ) {

                        screenedApplicantIds.add(
                            String(
                                application.applicant_id
                            )
                        );

                    }

                }

            });


        /*
         * Interviewed
         *
         * An interview record means
         * the applicant reached the
         * interview stage.
         */

        pipelineData.interviews
            .forEach(interview => {

                if (
                    jobApplicationIds.has(
                        String(
                            interview.application_id
                        )
                    )
                ) {

                    const application =
                        jobApplications.find(
                            item =>
                                String(
                                    item.application_id
                                ) ===
                                String(
                                    interview.application_id
                                )
                        );


                    if (
                        application &&
                        application.applicant_id
                    ) {

                        interviewedApplicantIds.add(
                            String(
                                application.applicant_id
                            )
                        );

                    }

                }

            });


        positions.push({

            job_id:
                job.job_id,

            job_code:
                job.job_code || "—",

            job_title:
                job.job_title || "Untitled Position",

            department:
                job.department || "—",

            vacancies:
                Number(
                    job.vacancies || 0
                ),

            status:
                job.status || "—",

            applicants:
                applicantIds.size,

            screened:
                screenedApplicantIds.size,

            qualified:
                qualifiedApplicantIds.size,

            interviewed:
                interviewedApplicantIds.size,

            selected:
                selectedApplicantIds.size,

            hired:
                hiredApplicantIds.size

        });

    });


    /*
     * Also handle applications whose job
     * does not currently appear in
     * job_postings.
     */

    const existingJobIds =
        new Set(
            jobs.map(
                job =>
                    String(
                        job.job_id
                    )
            )
        );


    const orphanJobIds =
        [
            ...new Set(
                applications
                    .map(
                        application =>
                            application.job_id
                    )
                    .filter(
                        jobId =>
                            jobId &&
                            !existingJobIds.has(
                                String(jobId)
                            )
                    )
            )
        ];


    orphanJobIds.forEach(
        jobId => {

            const jobApplications =
                applications.filter(
                    application =>
                        String(
                            application.job_id
                        ) === String(
                            jobId
                        )
                );


            const applicantIds =
                new Set();


            const qualifiedIds =
                new Set();


            const selectedIds =
                new Set();


            const hiredIds =
                new Set();


            jobApplications.forEach(
                application => {

                    if (
                        application.applicant_id
                    ) {

                        applicantIds.add(
                            String(
                                application.applicant_id
                            )
                        );

                    }


                    const status =
                        normalizeStatus(
                            application.status
                        );


                    if (
                        status === "QUALIFIED" &&
                        application.applicant_id
                    ) {

                        qualifiedIds.add(
                            String(
                                application.applicant_id
                            )
                        );

                    }


                    if (
                        status === "SELECTED FOR HIRING" &&
                        application.applicant_id
                    ) {

                        selectedIds.add(
                            String(
                                application.applicant_id
                            )
                        );

                    }


                    if (
                        status === "HIRED" &&
                        application.applicant_id
                    ) {

                        hiredIds.add(
                            String(
                                application.applicant_id
                            )
                        );

                    }

                }
            );


            const applicationIds =
                new Set(
                    jobApplications.map(
                        application =>
                            String(
                                application.application_id
                            )
                    )
                );


            const screenedIds =
                getApplicantIdsFromRecords(
                    pipelineData.screenings,
                    applicationIds
                );


            const interviewedIds =
                getApplicantIdsFromRecords(
                    pipelineData.interviews,
                    applicationIds
                );


            positions.push({

                job_id:
                    jobId,

                job_code:
                    "—",

                job_title:
                    "Position unavailable",

                department:
                    "—",

                vacancies:
                    0,

                status:
                    "—",

                applicants:
                    applicantIds.size,

                screened:
                    screenedIds.size,

                qualified:
                    qualifiedIds.size,

                interviewed:
                    interviewedIds.size,

                selected:
                    selectedIds.size,

                hired:
                    hiredIds.size

            });

        }
    );


    /*
     * Sort alphabetically.
     */

    positions.sort(
        (a, b) =>
            a.job_title.localeCompare(
                b.job_title
            )
    );


    pipelineData.positions =
        positions;

}


/* =========================================================
   GET APPLICANT IDS FROM RECORDS
   ========================================================= */

function getApplicantIdsFromRecords(
    records,
    applicationIds
) {

    const ids =
        new Set();


    records.forEach(record => {

        if (
            !applicationIds.has(
                String(
                    record.application_id
                )
            )
        ) {

            return;

        }


        const application =
            pipelineData.applications.find(
                item =>
                    String(
                        item.application_id
                    ) ===
                    String(
                        record.application_id
                    )
            );


        if (
            application &&
            application.applicant_id
        ) {

            ids.add(
                String(
                    application.applicant_id
                )
            );

        }

    });


    return ids;

}


/* =========================================================
   RENDER EVERYTHING
   ========================================================= */

function renderPipeline() {

    renderOverallSummary();

    renderOverallPipeline();

    renderPositionPipelines();

    renderStageSummary();

}


/* =========================================================
   OVERALL SUMMARY
   ========================================================= */

function renderOverallSummary() {

    const applicants =
        getUniqueApplicantIds(
            pipelineData.applications
        );


    const screened =
        getScreenedApplicantIds();


    const qualified =
        getApplicantsByApplicationStatus(
            "QUALIFIED"
        );


    const interviewed =
        getInterviewedApplicantIds();


    const selected =
        getApplicantsByApplicationStatus(
            "SELECTED FOR HIRING"
        );


    const hired =
        getApplicantsByApplicationStatus(
            "HIRED"
        );


    setText(
        "totalPipelineApplicants",
        applicants.size
    );


    setText(
        "totalPipelineScreened",
        screened.size
    );


    setText(
        "totalPipelineQualified",
        qualified.size
    );


    setText(
        "totalPipelineInterviewed",
        interviewed.size
    );


    setText(
        "totalPipelineSelected",
        selected.size
    );


    setText(
        "totalPipelineHired",
        hired.size
    );

}


/* =========================================================
   OVERALL PIPELINE
   ========================================================= */

function renderOverallPipeline() {

    const container =
        document.getElementById(
            "overallPipelineFlow"
        );


    if (!container) {
        return;
    }


    const stages = [

        {
            number: 1,
            label: "Applicants",
            value:
                getUniqueApplicantIds(
                    pipelineData.applications
                ).size
        },

        {
            number: 2,
            label: "Screened",
            value:
                getScreenedApplicantIds()
                    .size
        },

        {
            number: 3,
            label: "Qualified",
            value:
                getApplicantsByApplicationStatus(
                    "QUALIFIED"
                ).size
        },

        {
            number: 4,
            label: "Interviewed",
            value:
                getInterviewedApplicantIds()
                    .size
        },

        {
            number: 5,
            label: "Selected",
            value:
                getApplicantsByApplicationStatus(
                    "SELECTED FOR HIRING"
                ).size
        },

        {
            number: 6,
            label: "Hired",
            value:
                getApplicantsByApplicationStatus(
                    "HIRED"
                ).size
        }

    ];


    container.innerHTML =
        stages.map(
            stage => {

                return `
                    <div class="pipeline-flow-stage">

                        <div class="pipeline-stage-number">
                            ${stage.number}
                        </div>

                        <small>
                            ${escapeHtml(
                                stage.label
                            )}
                        </small>

                        <strong>
                            ${stage.value}
                        </strong>

                        <span>
                            applicant${stage.value === 1 ? "" : "s"}
                        </span>

                    </div>
                `;

            }
        ).join("");

}


/* =========================================================
   POSITION PIPELINES
   ========================================================= */

function renderPositionPipelines() {

    const container =
        document.getElementById(
            "pipelinePositions"
        );


    if (!container) {
        return;
    }


    const searchInput =
        document.getElementById(
            "pipelineSearch"
        );


    const search =
        String(
            searchInput?.value || ""
        )
            .trim()
            .toLowerCase();


    const filtered =
        pipelineData.positions.filter(
            position => {

                const text = [

                    position.job_title,

                    position.job_code,

                    position.department,

                    position.status

                ]
                    .join(" ")
                    .toLowerCase();


                return (
                    !search ||
                    text.includes(search)
                );

            }
        );


    setText(
        "pipelinePositionCount",
        `${filtered.length} position${filtered.length === 1 ? "" : "s"}`
    );


    if (!filtered.length) {

        container.innerHTML = `

            <div class="pipeline-empty">

                <strong>
                    No positions found
                </strong>

                <span>
                    Try another search.
                </span>

            </div>

        `;

        return;
    }


    container.innerHTML =
        filtered.map(
            position =>
                renderPositionCard(
                    position
                )
        ).join("");

}


/* =========================================================
   POSITION CARD
   ========================================================= */

function renderPositionCard(
    position
) {

    const stages = [

        {
            label: "Applicants",
            value: position.applicants
        },

        {
            label: "Screened",
            value: position.screened
        },

        {
            label: "Qualified",
            value: position.qualified
        },

        {
            label: "Interviewed",
            value: position.interviewed
        },

        {
            label: "Selected",
            value: position.selected
        },

        {
            label: "Hired",
            value: position.hired
        }

    ];


    /*
     * Hired / applicants percentage.
     */

    const progress =
        position.applicants > 0
            ? Math.min(
                100,
                Math.round(
                    (
                        position.hired /
                        position.applicants
                    ) * 100
                )
            )
            : 0;


    return `

        <article class="pipeline-position-card">


            <div class="pipeline-position-header">


                <div class="pipeline-position-title">

                    <h4>
                        ${escapeHtml(
                            position.job_title
                        )}
                    </h4>

                    <p>
                        ${escapeHtml(
                            position.department
                        )}
                    </p>

                </div>


                <div class="pipeline-job-code">

                    ${escapeHtml(
                        position.job_code
                    )}

                </div>


            </div>


            <div class="position-pipeline">

                ${stages.map(
                    stage => `

                        <div class="position-stage">

                            <strong>
                                ${stage.value}
                            </strong>

                            <span>
                                ${stage.label}
                            </span>

                        </div>

                    `
                ).join("")}

            </div>


            <div class="pipeline-position-footer">

                <span class="pipeline-progress-text">

                    ${position.hired}
                    of
                    ${position.applicants}
                    hired

                </span>


                <div
                    class="pipeline-progress"
                    title="${progress}% hired"
                >

                    <div
                        class="pipeline-progress-bar"
                        style="width: ${progress}%"
                    ></div>

                </div>

            </div>


        </article>

    `;

}


/* =========================================================
   STAGE SUMMARY
   ========================================================= */

function renderStageSummary() {

    const container =
        document.getElementById(
            "stageSummary"
        );


    if (!container) {
        return;
    }


    const stages = [

        {
            label: "Applicants",
            value:
                getUniqueApplicantIds(
                    pipelineData.applications
                ).size
        },

        {
            label: "Screened",
            value:
                getScreenedApplicantIds()
                    .size
        },

        {
            label: "Qualified",
            value:
                getApplicantsByApplicationStatus(
                    "QUALIFIED"
                ).size
        },

        {
            label: "Interviewed",
            value:
                getInterviewedApplicantIds()
                    .size
        },

        {
            label: "Selected",
            value:
                getApplicantsByApplicationStatus(
                    "SELECTED FOR HIRING"
                ).size
        },

        {
            label: "Hired",
            value:
                getApplicantsByApplicationStatus(
                    "HIRED"
                ).size
        }

    ];


    container.innerHTML =
        stages.map(
            stage => `

                <div class="stage-summary-item">

                    <span>
                        ${escapeHtml(
                            stage.label
                        )}
                    </span>

                    <strong>
                        ${stage.value}
                    </strong>

                </div>

            `
        ).join("");

}


/* =========================================================
   GET UNIQUE APPLICANTS
   ========================================================= */

function getUniqueApplicantIds(
    applications
) {

    const ids =
        new Set();


    (applications || [])
        .forEach(
            application => {

                if (
                    application.applicant_id
                ) {

                    ids.add(
                        String(
                            application.applicant_id
                        )
                    );

                }

            }
        );


    return ids;

}


/* =========================================================
   GET APPLICANTS BY APPLICATION STATUS
   ========================================================= */

function getApplicantsByApplicationStatus(
    wantedStatus
) {

    const ids =
        new Set();


    pipelineData.applications
        .forEach(
            application => {

                if (
                    normalizeStatus(
                        application.status
                    ) !== wantedStatus
                ) {

                    return;

                }


                if (
                    application.applicant_id
                ) {

                    ids.add(
                        String(
                            application.applicant_id
                        )
                    );

                }

            }
        );


    return ids;

}


/* =========================================================
   GET SCREENED APPLICANTS
   ========================================================= */

function getScreenedApplicantIds() {

    return getApplicantIdsFromRecords(
        pipelineData.screenings,
        new Set(
            pipelineData.applications.map(
                application =>
                    String(
                        application.application_id
                    )
            )
        )
    );

}


/* =========================================================
   GET INTERVIEWED APPLICANTS
   ========================================================= */

function getInterviewedApplicantIds() {

    return getApplicantIdsFromRecords(
        pipelineData.interviews,
        new Set(
            pipelineData.applications.map(
                application =>
                    String(
                        application.application_id
                    )
            )
        )
    );

}


/* =========================================================
   EVENTS
   ========================================================= */

function bindPipelineEvents() {

    /*
     * Refresh
     */

    const refreshButton =
        document.getElementById(
            "refreshPipeline"
        );


    if (refreshButton) {

        refreshButton.addEventListener(
            "click",
            async () => {

                await loadRecruitmentPipeline();

            }
        );

    }


    /*
     * Print
     */

    const printButton =
        document.getElementById(
            "printPipeline"
        );


    if (printButton) {

        printButton.addEventListener(
            "click",
            () => {

                window.print();

            }
        );

    }


    /*
     * Search
     */

    const searchInput =
        document.getElementById(
            "pipelineSearch"
        );


    if (searchInput) {

        searchInput.addEventListener(
            "input",
            () => {

                renderPositionPipelines();

            }
        );

    }

}


/* =========================================================
   LOADING
   ========================================================= */

function showPipelineLoading() {

    setText(
        "totalPipelineApplicants",
        "..."
    );


    setText(
        "totalPipelineScreened",
        "..."
    );


    setText(
        "totalPipelineQualified",
        "..."
    );


    setText(
        "totalPipelineInterviewed",
        "..."
    );


    setText(
        "totalPipelineSelected",
        "..."
    );


    setText(
        "totalPipelineHired",
        "..."
    );


    setText(
        "pipelineUpdated",
        "Loading pipeline..."
    );


    const container =
        document.getElementById(
            "pipelinePositions"
        );


    if (container) {

        container.innerHTML = `

            <div class="pipeline-empty">

                <strong>
                    Loading recruitment pipeline...
                </strong>

                <span>
                    Please wait.
                </span>

            </div>

        `;

    }

}


/* =========================================================
   ERROR
   ========================================================= */

function renderPipelineError(
    message
) {

    setText(
        "pipelineUpdated",
        "Unable to load pipeline."
    );


    const container =
        document.getElementById(
            "pipelinePositions"
        );


    if (container) {

        container.innerHTML = `

            <div class="pipeline-empty">

                <strong>
                    Unable to load recruitment pipeline
                </strong>

                <span>
                    ${escapeHtml(
                        message
                    )}
                </span>

            </div>

        `;

    }

}


/* =========================================================
   NORMALIZE STATUS
   ========================================================= */

function normalizeStatus(
    status
) {

    return String(
        status || ""
    )
        .trim()
        .toUpperCase()
        .replace(/_/g, " ")
        .replace(/\s+/g, " ");

}


/* =========================================================
   SET TEXT
   ========================================================= */

function setText(
    id,
    value
) {

    const element =
        document.getElementById(
            id
        );


    if (element) {

        element.textContent =
            value;

    }

}


/* =========================================================
   ESCAPE HTML
   ========================================================= */

function escapeHtml(
    value
) {

    return String(
        value ?? ""
    )
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );

}


/* =========================================================
   TOAST
   ========================================================= */

function showPipelineToast(
    message,
    type = "info"
) {

    /*
     * Use shared toast if available.
     */

    if (
        typeof showToast === "function"
    ) {

        showToast(
            message,
            type
        );

        return;

    }


    const root =
        document.getElementById(
            "toastRoot"
        );


    if (!root) {
        return;
    }


    const toast =
        document.createElement(
            "div"
        );


    toast.className =
        `toast toast-${type}`;


    toast.textContent =
        message;


    root.appendChild(
        toast
    );


    setTimeout(
        () => {

            toast.remove();

        },
        3500
    );

}