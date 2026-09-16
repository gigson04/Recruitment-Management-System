/* =========================================================
   APPLICANT REPORTS
   LABORATORY ACTIVITY 20
   ========================================================= */


let applicants = [];

let applications = [];

let jobs = [];

let screenings = [];

let hiringRecords = [];

let applicantReportRows = [];

let positionReportRows = [];

let statusReportRows = [];

let qualifiedRows = [];

let rejectedRows = [];

let hiredRows = [];


/* =========================================================
   INITIALIZE
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    init
);


async function init() {

    /*
     * Use the SAME application shell.
     */
    renderShell({
        active: "Reports"
    });


    /*
     * Require authenticated user.
     */
    const session = await requireAuth();


    if (!session) {
        return;
    }


    /*
     * Load profile.
     */
    loadUserProfile()
        .catch(console.warn);


    /*
     * Setup page events.
     */
    setupEvents();


    /*
     * Load all report data.
     */
    await loadAllReports();

}


/* =========================================================
   EVENTS
   ========================================================= */

function setupEvents() {

    document
        .getElementById(
            "refreshApplicantReports"
        )
        ?.addEventListener(
            "click",
            loadAllReports
        );


    document
        .getElementById(
            "printApplicantReports"
        )
        ?.addEventListener(
            "click",
            () => {
                window.print();
            }
        );


    document
        .getElementById(
            "applicantReportSearch"
        )
        ?.addEventListener(
            "input",
            renderMasterList
        );


    document
        .getElementById(
            "applicantStatusFilter"
        )
        ?.addEventListener(
            "change",
            renderMasterList
        );

}


/* =========================================================
   LOAD EVERYTHING
   ========================================================= */

async function loadAllReports() {

    setLoadingState();


    try {

        await Promise.all([
            loadApplicants(),
            loadApplications(),
            loadJobs(),
            loadScreenings(),
            loadHiring()
        ]);


        buildReportData();


        renderAllReports();


    } catch (error) {

        console.error(
            "Applicant reports error:",
            error
        );


        showToast(
            "Unable to load applicant reports.",
            "error"
        );

    }

}


/* =========================================================
   LOAD APPLICANTS
   ========================================================= */

async function loadApplicants() {

    const {
        data,
        error
    } = await window.rmsSupabase

        .from("applicants")

        .select(`
            applicant_id,
            applicant_no,
            first_name,
            last_name,
            email,
            contact_no,
            address,
            education,
            experience,
            skills,
            resume_file,
            status
        `)

        .order(
            "last_name",
            {
                ascending: true
            }
        );


    if (error) {
        throw error;
    }


    applicants =
        Array.isArray(data)
            ? data
            : [];

}


/* =========================================================
   LOAD APPLICATIONS
   ========================================================= */

async function loadApplications() {

    const {
        data,
        error
    } = await window.rmsSupabase

        .from("applications")

        .select(`
            application_id,
            applicant_id,
            job_id,
            application_date,
            cover_letter,
            status
        `)

        .order(
            "application_date",
            {
                ascending: false
            }
        );


    if (error) {
        throw error;
    }


    applications =
        Array.isArray(data)
            ? data
            : [];

}


/* =========================================================
   LOAD JOBS
   ========================================================= */

async function loadJobs() {

    const {
        data,
        error
    } = await window.rmsSupabase

        .from("job_postings")

        .select(`
            job_id,
            job_code,
            job_title,
            department,
            vacancies,
            status
        `);


    if (error) {
        throw error;
    }


    jobs =
        Array.isArray(data)
            ? data
            : [];

}


/* =========================================================
   LOAD SCREENINGS
   ========================================================= */

async function loadScreenings() {

    const {
        data,
        error
    } = await window.rmsSupabase

        .from("screenings")

        .select(`
            screening_id,
            application_id,
            screening_date,
            score,
            result,
            remarks,
            screened_by
        `)

        .order(
            "screening_date",
            {
                ascending: false
            }
        );


    if (error) {
        throw error;
    }


    screenings =
        Array.isArray(data)
            ? data
            : [];

}


/* =========================================================
   LOAD HIRING
   ========================================================= */

async function loadHiring() {

    const {
        data,
        error
    } = await window.rmsSupabase

        .from("hiring")

        .select(`
            hiring_id,
            application_id,
            hiring_date,
            position,
            salary_offer,
            employment_status,
            start_date,
            status
        `)

        .order(
            "hiring_date",
            {
                ascending: false
            }
        );


    if (error) {
        throw error;
    }


    hiringRecords =
        Array.isArray(data)
            ? data
            : [];

}


/* =========================================================
   BUILD REPORT DATA
   ========================================================= */

function buildReportData() {

    applicantReportRows =
        applicants.map(
            applicant => {

                const applicantApplications =
                    applications.filter(
                        application =>
                            application.applicant_id ===
                            applicant.applicant_id
                    );


                const latestApplication =
                    applicantApplications[0] || null;


                const applicantHires =
                    hiringRecords.filter(
                        hiring => {

                            return applicantApplications.some(
                                application =>
                                    application.application_id ===
                                    hiring.application_id
                            );

                        }
                    );


                const applicantScreenings =
                    screenings.filter(
                        screening => {

                            return applicantApplications.some(
                                application =>
                                    application.application_id ===
                                    screening.application_id
                            );

                        }
                    );


                return {

                    ...applicant,

                    applications:
                        applicantApplications,

                    latestApplication,

                    screenings:
                        applicantScreenings,

                    hires:
                        applicantHires,

                    derivedStatus:
                        getApplicantStatus(
                            applicant,
                            applicantApplications,
                            applicantScreenings,
                            applicantHires
                        )

                };

            }
        );


    buildPositionReports();

    buildStatusReports();

    buildQualifiedReports();

    buildRejectedReports();

    buildHiredReports();

}


/* =========================================================
   DETERMINE APPLICANT STATUS
   ========================================================= */

function getApplicantStatus(
    applicant,
    applicantApplications,
    applicantScreenings,
    applicantHires
) {

    /*
     * Hiring has the highest priority.
     */
    const hasHired =
        applicantHires.some(
            hiring =>
                normalize(
                    hiring.status
                ) === "hired"
        );


    if (hasHired) {
        return "Hired";
    }


    /*
     * Explicit rejected application.
     */
    const hasRejectedApplication =
        applicantApplications.some(
            application =>
                normalize(
                    application.status
                ) === "rejected"
        );


    if (hasRejectedApplication) {
        return "Rejected";
    }


    /*
     * Qualified screening.
     */
    const hasQualifiedScreening =
        applicantScreenings.some(
            screening =>
                normalize(
                    screening.result
                ) === "qualified"
        );


    if (hasQualifiedScreening) {
        return "Qualified";
    }


    /*
     * Not qualified screening.
     */
    const hasNotQualified =
        applicantScreenings.some(
            screening => {

                const result =
                    normalize(
                        screening.result
                    );

                return (
                    result === "not qualified" ||
                    result === "notqualified"
                );

            }
        );


    if (hasNotQualified) {
        return "Rejected";
    }


    /*
     * Fall back to latest application status.
     */
    if (
        applicantApplications.length > 0
    ) {

        const status =
            normalize(
                applicantApplications[0].status
            );


        if (
            status === "hired"
        ) {
            return "Hired";
        }


        if (
            status === "rejected"
        ) {
            return "Rejected";
        }


        if (
            status === "qualified"
        ) {
            return "Qualified";
        }


        if (
            status === "interview"
        ) {
            return "For Interview";
        }


        if (
            status === "selected"
        ) {
            return "Selected";
        }


        if (
            status === "screening" ||
            status === "under screening"
        ) {
            return "Under Screening";
        }


        if (
            status === "submitted"
        ) {
            return "Submitted";
        }

    }


    /*
     * Applicant profile status.
     */
    const applicantStatus =
        normalize(
            applicant.status
        );


    if (
        applicantStatus === "inactive"
    ) {
        return "Inactive";
    }


    return "Active";

}


/* =========================================================
   BUILD POSITION REPORT
   ========================================================= */

function buildPositionReports() {

    const groups = {};


    applications.forEach(
        application => {

            const job =
                jobs.find(
                    item =>
                        item.job_id ===
                        application.job_id
                );


            if (!job) {
                return;
            }


            const key =
                job.job_id;


            if (!groups[key]) {

                groups[key] = {

                    jobId:
                        job.job_id,

                    position:
                        job.job_title ||
                        "Unknown Position",

                    department:
                        job.department ||
                        "—",

                    applicants:
                        new Set(),

                    qualified:
                        new Set(),

                    hired:
                        new Set()

                };

            }


            groups[key]
                .applicants
                .add(
                    application.applicant_id
                );


            const applicationScreenings =
                screenings.filter(
                    screening =>
                        screening.application_id ===
                        application.application_id
                );


            if (
                applicationScreenings.some(
                    screening =>
                        normalize(
                            screening.result
                        ) === "qualified"
                )
            ) {

                groups[key]
                    .qualified
                    .add(
                        application.applicant_id
                    );

            }


            const applicationHires =
                hiringRecords.filter(
                    hiring =>
                        hiring.application_id ===
                        application.application_id
                );


            if (
                applicationHires.some(
                    hiring =>
                        normalize(
                            hiring.status
                        ) === "hired"
                )
            ) {

                groups[key]
                    .hired
                    .add(
                        application.applicant_id
                    );

            }

        }
    );


    positionReportRows =
        Object.values(groups)
            .map(
                group => ({

                    position:
                        group.position,

                    department:
                        group.department,

                    applicants:
                        group.applicants.size,

                    qualified:
                        group.qualified.size,

                    hired:
                        group.hired.size

                })
            )
            .sort(
                (a, b) =>
                    b.applicants -
                    a.applicants
            );

}


/* =========================================================
   BUILD STATUS REPORT
   ========================================================= */

function buildStatusReports() {

    const groups = {};


    applicantReportRows.forEach(
        applicant => {

            const status =
                applicant.derivedStatus ||
                "Active";


            if (!groups[status]) {
                groups[status] = 0;
            }


            groups[status]++;

        }
    );


    const total =
        applicantReportRows.length;


    statusReportRows =
        Object.entries(groups)
            .map(
                ([status, count]) => ({

                    status,

                    count,

                    percentage:
                        total > 0
                            ? (
                                count /
                                total *
                                100
                            )
                            : 0

                })
            )
            .sort(
                (a, b) =>
                    b.count -
                    a.count
            );

}


/* =========================================================
   BUILD QUALIFIED REPORT
   ========================================================= */

function buildQualifiedReports() {

    qualifiedRows = [];


    applicantReportRows.forEach(
        applicant => {

            applicant.screenings.forEach(
                screening => {

                    if (
                        normalize(
                            screening.result
                        ) !== "qualified"
                    ) {
                        return;
                    }


                    const application =
                        applicant.applications.find(
                            item =>
                                item.application_id ===
                                screening.application_id
                        );


                    const job =
                        application
                            ? jobs.find(
                                item =>
                                    item.job_id ===
                                    application.job_id
                            )
                            : null;


                    qualifiedRows.push({

                        applicantNo:
                            applicant.applicant_no,

                        name:
                            getFullName(
                                applicant
                            ),

                        position:
                            job?.job_title ||
                            "—",

                        score:
                            screening.score ??
                            "—",

                        result:
                            screening.result ||
                            "Qualified",

                        applicationStatus:
                            application?.status ||
                            "—"

                    });

                }
            );

        }
    );


    /*
     * Remove duplicate applicant-position entries.
     */
    qualifiedRows =
        uniqueRows(
            qualifiedRows,
            row =>
                `${row.applicantNo}|${row.position}`
        );

}


/* =========================================================
   BUILD REJECTED REPORT
   ========================================================= */

function buildRejectedReports() {

    rejectedRows = [];


    applicantReportRows.forEach(
        applicant => {

            /*
             * Check every application.
             */
            applicant.applications.forEach(
                application => {

                    const screening =
                        applicant.screenings.find(
                            item =>
                                item.application_id ===
                                application.application_id
                        );


                    const rejectedApplication =
                        normalize(
                            application.status
                        ) === "rejected";


                    const rejectedScreening =
                        screening &&
                        (
                            normalize(
                                screening.result
                            ) === "not qualified" ||

                            normalize(
                                screening.result
                            ) === "notqualified"
                            );



                    if (
                        !rejectedApplication &&
                        !rejectedScreening
                    ) {
                        return;
                    }


                    const job =
                        jobs.find(
                            item =>
                                item.job_id ===
                                application.job_id
                        );


                    rejectedRows.push({

                        applicantNo:
                            applicant.applicant_no,

                        name:
                            getFullName(
                                applicant
                            ),

                        position:
                            job?.job_title ||
                            "—",

                        status:
                            application.status ||
                            "Rejected",

                        screeningResult:
                            screening?.result ||
                            "—",

                        applicationDate:
                            application.application_date

                    });

                }
            );

        }
    );


    rejectedRows =
        uniqueRows(
            rejectedRows,
            row =>
                `${row.applicantNo}|${row.position}`
        );

}


/* =========================================================
   BUILD HIRED REPORT
   ========================================================= */

function buildHiredReports() {

    hiredRows = [];


    applicantReportRows.forEach(
        applicant => {

            applicant.hires.forEach(
                hiring => {

                    if (
                        normalize(
                            hiring.status
                        ) !== "hired"
                    ) {
                        return;
                    }


                    const application =
                        applicant.applications.find(
                            item =>
                                item.application_id ===
                                hiring.application_id
                        );


                    const job =
                        application
                            ? jobs.find(
                                item =>
                                    item.job_id ===
                                    application.job_id
                            )
                            : null;


                    hiredRows.push({

                        applicantNo:
                            applicant.applicant_no,

                        name:
                            getFullName(
                                applicant
                            ),

                        position:
                            hiring.position ||
                            job?.job_title ||
                            "—",

                        hiringDate:
                            hiring.hiring_date,

                        startDate:
                            hiring.start_date,

                        employmentStatus:
                            hiring.employment_status ||
                            "—"

                    });

                }
            );

        }
    );


    hiredRows =
        uniqueRows(
            hiredRows,
            row =>
                row.applicantNo
        );

}


/* =========================================================
   RENDER EVERYTHING
   ========================================================= */

function renderAllReports() {

    renderSummary();

    renderMasterList();

    renderPositionReport();

    renderStatusReport();

    renderQualifiedReport();

    renderRejectedReport();

    renderHiredReport();

}


/* =========================================================
   SUMMARY
   ========================================================= */

function renderSummary() {

    const total =
        applicantReportRows.length;


    const active =
        applicantReportRows.filter(
            applicant =>
                normalize(
                    applicant.status
                ) === "active"
        ).length;


    const qualified =
        qualifiedRows.length;


    const rejected =
        rejectedRows.length;


    const hired =
        hiredRows.length;


    setText(
        "totalApplicants",
        total
    );


    setText(
        "activeApplicants",
        active
    );


    setText(
        "qualifiedApplicants",
        qualified
    );


    setText(
        "rejectedApplicants",
        rejected
    );


    setText(
        "hiredApplicants",
        hired
    );

}


/* =========================================================
   MASTER LIST
   ========================================================= */

function renderMasterList() {

    const tbody =
        document.querySelector(
            "#applicantMasterTable tbody"
        );


    if (!tbody) {
        return;
    }


    const searchInput =
        document.getElementById(
            "applicantReportSearch"
        );


    const statusFilter =
        document.getElementById(
            "applicantStatusFilter"
        );


    const search =
        normalize(
            searchInput?.value
        );


    const filter =
        normalize(
            statusFilter?.value
        );


    const filtered =
        applicantReportRows.filter(
            applicant => {

                const name =
                    normalize(
                        getFullName(
                            applicant
                        )
                    );


                const applicantNo =
                    normalize(
                        applicant.applicant_no
                    );


                const email =
                    normalize(
                        applicant.email
                    );


                const matchesSearch =
                    !search ||

                    name.includes(search) ||

                    applicantNo.includes(search) ||

                    email.includes(search);


                const matchesStatus =
                    filter === "all" ||

                    normalize(
                        applicant.status
                    ) === filter;


                return (
                    matchesSearch &&
                    matchesStatus
                );

            }
        );


    setText(
        "masterListCount",
        `${filtered.length} applicants`
    );


    if (
        filtered.length === 0
    ) {

        tbody.innerHTML = emptyRow(
            7,
            "No applicants found."
        );

        return;

    }


    tbody.innerHTML =
        filtered
            .map(
                applicant => `

                    <tr>

                        <td>
                            <strong>
                                ${escapeHtml(
                                    applicant.applicant_no ||
                                    "—"
                                )}
                            </strong>
                        </td>


                        <td>

                            <div class="report-applicant">

                                <strong>
                                    ${escapeHtml(
                                        getFullName(
                                            applicant
                                        )
                                    )}
                                </strong>

                                <span>
                                    ${escapeHtml(
                                        applicant.address ||
                                        "No address"
                                    )}
                                </span>

                            </div>

                        </td>


                        <td>
                            ${escapeHtml(
                                applicant.email ||
                                "—"
                            )}
                        </td>


                        <td>
                            ${escapeHtml(
                                applicant.contact_no ||
                                "—"
                            )}
                        </td>


                        <td>
                            ${escapeHtml(
                                applicant.education ||
                                "—"
                            )}
                        </td>


                        <td>
                            ${escapeHtml(
                                applicant.experience ||
                                "—"
                            )}
                        </td>


                        <td>
                            ${statusBadge(
                                applicant.status
                            )}
                        </td>

                    </tr>

                `
            )
            .join("");

}


/* =========================================================
   POSITION REPORT
   ========================================================= */

function renderPositionReport() {

    const tbody =
        document.querySelector(
            "#applicantsByPositionTable tbody"
        );


    if (!tbody) {
        return;
    }


    setText(
        "positionReportCount",
        `${positionReportRows.length} positions`
    );


    if (
        positionReportRows.length === 0
    ) {

        tbody.innerHTML = emptyRow(
            5,
            "No application position data found."
        );

        return;

    }


    tbody.innerHTML =
        positionReportRows
            .map(
                row => `

                    <tr>

                        <td>

                            <div class="report-applicant">

                                <strong>
                                    ${escapeHtml(
                                        row.position
                                    )}
                                </strong>

                            </div>

                        </td>


                        <td>
                            ${escapeHtml(
                                row.department
                            )}
                        </td>


                        <td>
                            <span class="report-number">
                                ${row.applicants}
                            </span>
                        </td>


                        <td>
                            <span class="report-number">
                                ${row.qualified}
                            </span>
                        </td>


                        <td>
                            <span class="report-number">
                                ${row.hired}
                            </span>
                        </td>

                    </tr>

                `
            )
            .join("");

}


/* =========================================================
   STATUS REPORT
   ========================================================= */

function renderStatusReport() {

    const tbody =
        document.querySelector(
            "#applicantsByStatusTable tbody"
        );


    if (!tbody) {
        return;
    }


    if (
        statusReportRows.length === 0
    ) {

        tbody.innerHTML = emptyRow(
            3,
            "No applicant status data found."
        );

        return;

    }


    tbody.innerHTML =
        statusReportRows
            .map(
                row => `

                    <tr>

                        <td>
                            ${statusBadge(
                                row.status
                            )}
                        </td>


                        <td>

                            <span class="report-number">
                                ${row.count}
                            </span>

                        </td>


                        <td>
                            ${row.percentage.toFixed(1)}%
                        </td>

                    </tr>

                `
            )
            .join("");

}


/* =========================================================
   QUALIFIED REPORT
   ========================================================= */

function renderQualifiedReport() {

    const tbody =
        document.querySelector(
            "#qualifiedApplicantsTable tbody"
        );


    if (!tbody) {
        return;
    }


    setText(
        "qualifiedReportCount",
        `${qualifiedRows.length} qualified`
    );


    if (
        qualifiedRows.length === 0
    ) {

        tbody.innerHTML = emptyRow(
            6,
            "No qualified applicants found."
        );

        return;

    }


    tbody.innerHTML =
        qualifiedRows
            .map(
                row => `

                    <tr>

                        <td>
                            ${escapeHtml(
                                row.applicantNo
                            )}
                        </td>


                        <td>

                            <div class="report-applicant">

                                <strong>
                                    ${escapeHtml(
                                        row.name
                                    )}
                                </strong>

                            </div>

                        </td>


                        <td>
                            ${escapeHtml(
                                row.position
                            )}
                        </td>


                        <td>

                            <span class="report-number">
                                ${escapeHtml(
                                    row.score
                                )}
                            </span>

                        </td>


                        <td>
                            ${statusBadge(
                                "Qualified"
                            )}
                        </td>


                        <td>
                            ${escapeHtml(
                                row.applicationStatus
                            )}
                        </td>

                    </tr>

                `
            )
            .join("");

}


/* =========================================================
   REJECTED REPORT
   ========================================================= */

function renderRejectedReport() {

    const tbody =
        document.querySelector(
            "#rejectedApplicantsTable tbody"
        );


    if (!tbody) {
        return;
    }


    setText(
        "rejectedReportCount",
        `${rejectedRows.length} rejected`
    );


    if (
        rejectedRows.length === 0
    ) {

        tbody.innerHTML = emptyRow(
            6,
            "No rejected applicants found."
        );

        return;

    }


    tbody.innerHTML =
        rejectedRows
            .map(
                row => `

                    <tr>

                        <td>
                            ${escapeHtml(
                                row.applicantNo
                            )}
                        </td>


                        <td>

                            <div class="report-applicant">

                                <strong>
                                    ${escapeHtml(
                                        row.name
                                    )}
                                </strong>

                            </div>

                        </td>


                        <td>
                            ${escapeHtml(
                                row.position
                            )}
                        </td>


                        <td>
                            ${statusBadge(
                                "Rejected"
                            )}
                        </td>


                        <td>
                            ${escapeHtml(
                                row.screeningResult
                            )}
                        </td>


                        <td>
                            ${formatDate(
                                row.applicationDate
                            )}
                        </td>

                    </tr>

                `
            )
            .join("");

}


/* =========================================================
   HIRED REPORT
   ========================================================= */

function renderHiredReport() {

    const tbody =
        document.querySelector(
            "#hiredApplicantsTable tbody"
        );


    if (!tbody) {
        return;
    }


    setText(
        "hiredReportCount",
        `${hiredRows.length} hired`
    );


    if (
        hiredRows.length === 0
    ) {

        tbody.innerHTML = emptyRow(
            6,
            "No hired applicants found."
        );

        return;

    }


    tbody.innerHTML =
        hiredRows
            .map(
                row => `

                    <tr>

                        <td>
                            ${escapeHtml(
                                row.applicantNo
                            )}
                        </td>


                        <td>

                            <div class="report-applicant">

                                <strong>
                                    ${escapeHtml(
                                        row.name
                                    )}
                                </strong>

                            </div>

                        </td>


                        <td>
                            ${escapeHtml(
                                row.position
                            )}
                        </td>


                        <td>
                            ${formatDate(
                                row.hiringDate
                            )}
                        </td>


                        <td>
                            ${formatDate(
                                row.startDate
                            )}
                        </td>


                        <td>
                            ${escapeHtml(
                                row.employmentStatus
                            )}
                        </td>

                    </tr>

                `
            )
            .join("");

}


/* =========================================================
   LOADING STATE
   ========================================================= */

function setLoadingState() {

    const tables = [

        [
            "applicantMasterTable",
            7
        ],

        [
            "applicantsByPositionTable",
            5
        ],

        [
            "applicantsByStatusTable",
            3
        ],

        [
            "qualifiedApplicantsTable",
            6
        ],

        [
            "rejectedApplicantsTable",
            6
        ],

        [
            "hiredApplicantsTable",
            6
        ]

    ];


    tables.forEach(
        ([id, colspan]) => {

            const tbody =
                document.querySelector(
                    `#${id} tbody`
                );


            if (!tbody) {
                return;
            }


            tbody.innerHTML =
                emptyRow(
                    colspan,
                    "Loading..."
                );

        }
    );

}


/* =========================================================
   STATUS BADGE
   ========================================================= */

function statusBadge(status) {

    const cleanStatus =
        String(
            status ||
            "Active"
        )
        .trim();


    const normalized =
        normalize(
            cleanStatus
        );


    let className =
        "status-active";


    if (
        normalized === "inactive"
    ) {

        className =
            "status-inactive";

    }


    else if (
        normalized === "qualified"
    ) {

        className =
            "status-qualified";

    }


    else if (
        normalized === "rejected" ||
        normalized === "not qualified" ||
        normalized === "notqualified"
    ) {

        className =
            "status-rejected";

    }


    else if (
        normalized === "hired"
    ) {

        className =
            "status-hired";

    }


    else if (
        normalized === "submitted" ||
        normalized === "screening" ||
        normalized === "under screening" ||
        normalized === "interview" ||
        normalized === "for interview" ||
        normalized === "selected"
    ) {

        className =
            "status-pending";

    }


    return `
        <span
            class="applicant-report-status ${className}"
        >
            ${escapeHtml(cleanStatus)}
        </span>
    `;

}


/* =========================================================
   HELPERS
   ========================================================= */

function getFullName(applicant) {

    return [
        applicant.first_name,
        applicant.last_name
    ]
        .filter(Boolean)
        .join(" ")
        .trim() || "Unnamed Applicant";

}


function normalize(value) {

    return String(
        value ?? ""
    )
        .trim()
        .toLowerCase();

}


function setText(
    id,
    value
) {

    const element =
        document.getElementById(id);


    if (element) {
        element.textContent =
            value;
    }

}


function formatDate(value) {

    if (!value) {
        return "—";
    }


    const date =
        new Date(value);


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return escapeHtml(
            String(value)
        );
    }


    return date.toLocaleDateString(
        "en-US",
        {
            year: "numeric",
            month: "short",
            day: "numeric"
        }
    );

}


function escapeHtml(value) {

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


function emptyRow(
    colspan,
    message
) {

    return `
        <tr>
            <td
                colspan="${colspan}"
                class="table-empty"
            >
                ${escapeHtml(message)}
            </td>
        </tr>
    `;

}


function uniqueRows(
    rows,
    keyFunction
) {

    const seen =
        new Set();


    return rows.filter(
        row => {

            const key =
                keyFunction(row);


            if (
                seen.has(key)
            ) {
                return false;
            }


            seen.add(key);

            return true;

        }
    );

}