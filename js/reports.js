// =========================================================
// RECRUITMENT MANAGEMENT SYSTEM
// LABORATORY ACTIVITY 19
// STAGE 9 - RECRUITMENT REPORTS
// =========================================================

let jobPostings = [];
let applications = [];
let hiringRecords = [];


// =========================================================
// INITIALIZE PAGE
// =========================================================

document.addEventListener(
    "DOMContentLoaded",
    init
);


async function init() {

    // Render the shared sidebar and topbar
    renderShell({
        active: "Reports"
    });


    // Check authentication
    const session = await requireAuth();

    if (!session) {
        return;
    }


    // Load user information
    loadUserProfile().catch(console.warn);


    // Load report data
    await loadReportData();


    // Print button
    document
        .getElementById("printReportButton")
        ?.addEventListener(
            "click",
            printReport
        );
}


// =========================================================
// LOAD ALL REPORT DATA
// =========================================================

async function loadReportData() {

    try {

        await Promise.all([
            loadJobPostings(),
            loadApplications(),
            loadHiring()
        ]);


        generateReports();


    } catch (error) {

        console.error(
            "Report loading error:",
            error
        );

        showToast(
            "Unable to load recruitment reports.",
            "error"
        );
    }
}


// =========================================================
// LOAD JOB POSTINGS
// =========================================================

async function loadJobPostings() {

    const {
        data,
        error
    } =
        await window.rmsSupabase
            .from("job_postings")
            .select(`
                job_id,
                job_code,
                job_title,
                department,
                description,
                qualifications,
                employment_type,
                posting_date,
                closing_date,
                vacancies,
                status,
                created_at,
                updated_at
            `)
            .order(
                "posting_date",
                {
                    ascending: false
                }
            );


    if (error) {

        console.error(
            "Load job postings error:",
            error
        );

        throw error;
    }


    jobPostings =
        Array.isArray(data)
            ? data
            : [];


    console.log(
        "Job postings loaded:",
        jobPostings
    );
}


// =========================================================
// LOAD APPLICATIONS
// =========================================================

async function loadApplications() {

    const {
        data,
        error
    } =
        await window.rmsSupabase
            .from("applications")
            .select(`
                application_id,
                applicant_id,
                job_id,
                application_date,
                cover_letter,
                status,
                created_at,
                updated_at
            `);


    if (error) {

        console.error(
            "Load applications error:",
            error
        );

        throw error;
    }


    applications =
        Array.isArray(data)
            ? data
            : [];


    console.log(
        "Applications loaded:",
        applications
    );
}


// =========================================================
// LOAD HIRING RECORDS
// =========================================================

async function loadHiring() {

    const {
        data,
        error
    } =
        await window.rmsSupabase
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


    if (error) {

        console.error(
            "Load hiring records error:",
            error
        );

        throw error;
    }


    hiringRecords =
        Array.isArray(data)
            ? data
            : [];


    console.log(
        "Hiring records loaded:",
        hiringRecords
    );
}


// =========================================================
// GENERATE REPORTS
// =========================================================

function generateReports() {

    const reportData =
        jobPostings.map(
            job => {

                const jobApplications =
                    applications.filter(
                        application =>
                            String(
                                application.job_id
                            ) ===
                            String(
                                job.job_id
                            )
                    );


                const hiredApplications =
                    jobApplications.filter(
                        application =>
                            isApplicationHired(
                                application
                            )
                    );


                const vacancies =
                    Number(
                        job.vacancies
                    ) || 0;


                const applicants =
                    jobApplications.length;


                const hired =
                    hiredApplications.length;


                const unfilled =
                    Math.max(
                        vacancies - hired,
                        0
                    );


                return {

                    job,

                    applicants,

                    hired,

                    vacancies,

                    unfilled,

                    open:
                        isJobOpen(job),

                    closed:
                        !isJobOpen(job)

                };

            }
        );


    renderSummary(
        reportData
    );


    renderJobReport(
        reportData
    );


    renderOpenVacancies(
        reportData
    );


    renderClosedVacancies(
        reportData
    );
}


// =========================================================
// CHECK IF JOB IS OPEN
// =========================================================

function isJobOpen(job) {

    const status =
        String(
            job.status || ""
        )
            .trim()
            .toLowerCase();


    const validStatuses = [
        "open",
        "active",
        "opened",
        "published",
        "available"
    ];


    if (
        !validStatuses.includes(
            status
        )
    ) {
        return false;
    }


    // Check closing date
    if (job.closing_date) {

        const closingDate =
            new Date(
                `${job.closing_date}T23:59:59`
            );


        if (
            Number.isNaN(
                closingDate.getTime()
            )
        ) {
            return false;
        }


        if (
            closingDate <
            new Date()
        ) {
            return false;
        }
    }


    // Check vacancies
    if (
        job.vacancies !== null &&
        job.vacancies !== undefined &&
        Number(job.vacancies) <= 0
    ) {
        return false;
    }


    return true;
}


// =========================================================
// CHECK IF APPLICATION WAS HIRED
// =========================================================

function isApplicationHired(
    application
) {

    // First check hiring table
    const hiringRecord =
        hiringRecords.find(
            hiring =>
                String(
                    hiring.application_id
                ) ===
                String(
                    application.application_id
                )
        );


    if (hiringRecord) {

        const hiringStatus =
            String(
                hiringRecord.status || ""
            )
                .trim()
                .toLowerCase();


        const validHiringStatuses = [
            "hired",
            "approved",
            "completed",
            "active"
        ];


        if (
            validHiringStatuses.includes(
                hiringStatus
            )
        ) {
            return true;
        }


        // If a hiring record exists and
        // employment status indicates employment
        const employmentStatus =
            String(
                hiringRecord.employment_status ||
                ""
            )
                .trim()
                .toLowerCase();


        if (
            [
                "regular",
                "probationary",
                "contractual",
                "active",
                "employed",
                "hired"
            ].includes(
                employmentStatus
            )
        ) {
            return true;
        }
    }


    // Also check application status
    const applicationStatus =
        String(
            application.status || ""
        )
            .trim()
            .toLowerCase();


    return [
        "hired",
        "selected"
    ].includes(
        applicationStatus
    );
}


// =========================================================
// RENDER SUMMARY
// =========================================================

function renderSummary(
    reportData
) {

    const openVacancies =
        reportData
            .filter(
                item =>
                    item.open
            )
            .reduce(
                (
                    total,
                    item
                ) =>
                    total +
                    item.vacancies,
                0
            );


    const closedVacancies =
        reportData
            .filter(
                item =>
                    item.closed
            )
            .reduce(
                (
                    total,
                    item
                ) =>
                    total +
                    item.vacancies,
                0
            );


    const totalApplicants =
        applications.length;


    const filledVacancies =
        reportData.reduce(
            (
                total,
                item
            ) =>
                total +
                item.hired,
            0
        );


    const unfilledVacancies =
        reportData.reduce(
            (
                total,
                item
            ) =>
                total +
                item.unfilled,
            0
        );


    setText(
        "openVacanciesCount",
        openVacancies
    );


    setText(
        "closedVacanciesCount",
        closedVacancies
    );


    setText(
        "totalApplicantsCount",
        totalApplicants
    );


    setText(
        "filledVacanciesCount",
        filledVacancies
    );


    setText(
        "unfilledVacanciesCount",
        unfilledVacancies
    );
}


// =========================================================
// RENDER MAIN JOB REPORT
// =========================================================

function renderJobReport(
    reportData
) {

    const table =
        document.getElementById(
            "jobReportsTable"
        );


    if (!table) {
        return;
    }


    if (
        reportData.length === 0
    ) {

        table.innerHTML = `
            <tr>
                <td
                    colspan="7"
                    class="table-empty"
                >
                    No job postings found.
                </td>
            </tr>
        `;

        return;
    }


    table.innerHTML =
        reportData
            .map(
                item => {

                    const job =
                        item.job;


                    return `
                        <tr>

                            <td>
                                <strong>
                                    ${escapeHtml(
                                        job.job_title ||
                                        "—"
                                    )}
                                </strong>
                            </td>

                            <td>
                                ${escapeHtml(
                                    job.department ||
                                    "—"
                                )}
                            </td>

                            <td>
                                ${statusBadge(
                                    job.status ||
                                    "Unknown"
                                )}
                            </td>

                            <td>
                                ${item.vacancies}
                            </td>

                            <td>
                                ${item.applicants}
                            </td>

                            <td>
                                ${item.hired}
                            </td>

                            <td>
                                ${item.unfilled}
                            </td>

                        </tr>
                    `;
                }
            )
            .join("");
}


// =========================================================
// RENDER OPEN VACANCIES
// =========================================================

function renderOpenVacancies(
    reportData
) {

    const table =
        document.getElementById(
            "openVacanciesTable"
        );


    if (!table) {
        return;
    }


    const openJobs =
        reportData.filter(
            item =>
                item.open
        );


    if (
        openJobs.length === 0
    ) {

        table.innerHTML = `
            <tr>
                <td
                    colspan="5"
                    class="table-empty"
                >
                    No open vacancies.
                </td>
            </tr>
        `;

        return;
    }


    table.innerHTML =
        openJobs
            .map(
                item => {

                    const job =
                        item.job;


                    return `
                        <tr>

                            <td>
                                ${escapeHtml(
                                    job.job_code ||
                                    "—"
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    job.job_title ||
                                    "—"
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    job.department ||
                                    "—"
                                )}
                            </td>

                            <td>
                                ${item.unfilled}
                            </td>

                            <td>
                                ${
                                    job.closing_date
                                        ? formatDate(
                                            job.closing_date
                                        )
                                        : "No deadline"
                                }
                            </td>

                        </tr>
                    `;
                }
            )
            .join("");
}


// =========================================================
// RENDER CLOSED VACANCIES
// =========================================================

function renderClosedVacancies(
    reportData
) {

    const table =
        document.getElementById(
            "closedVacanciesTable"
        );


    if (!table) {
        return;
    }


    const closedJobs =
        reportData.filter(
            item =>
                item.closed
        );


    if (
        closedJobs.length === 0
    ) {

        table.innerHTML = `
            <tr>
                <td
                    colspan="5"
                    class="table-empty"
                >
                    No closed vacancies.
                </td>
            </tr>
        `;

        return;
    }


    table.innerHTML =
        closedJobs
            .map(
                item => {

                    const job =
                        item.job;


                    return `
                        <tr>

                            <td>
                                ${escapeHtml(
                                    job.job_code ||
                                    "—"
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    job.job_title ||
                                    "—"
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    job.department ||
                                    "—"
                                )}
                            </td>

                            <td>
                                ${item.vacancies}
                            </td>

                            <td>
                                ${
                                    job.closing_date
                                        ? formatDate(
                                            job.closing_date
                                        )
                                        : "—"
                                }
                            </td>

                        </tr>
                    `;
                }
            )
            .join("");
}


// =========================================================
// PRINT REPORT
// =========================================================

function printReport() {

    window.print();
}


// =========================================================
// SET TEXT
// =========================================================

function setText(
    id,
    value
) {

    const element =
        document.getElementById(
            id
        );


    if (!element) {
        return;
    }


    element.textContent =
        String(
            value
        );
}


// =========================================================
// FORMAT DATE
// =========================================================

function formatDate(
    value
) {

    if (!value) {
        return "—";
    }


    const date =
        new Date(
            `${value}T00:00:00`
        );


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return "—";
    }


    return new Intl.DateTimeFormat(
        "en-PH",
        {
            year: "numeric",
            month: "short",
            day: "numeric"
        }
    ).format(
        date
    );
}


// =========================================================
// ESCAPE HTML
// =========================================================

function escapeHtml(
    value = ""
) {

    return String(
        value
    )
        .replaceAll(
            "&",
            "&amp;"
        )
        .replaceAll(
            "<",
            "&lt;"
        )
        .replaceAll(
            ">",
            "&gt;"
        )
        .replaceAll(
            '"',
            "&quot;"
        )
        .replaceAll(
            "'",
            "&#039;"
        );
}


// =========================================================
// STATUS BADGE
// =========================================================

function statusBadge(
    status
) {

    const cleanStatus =
        String(
            status ||
            "Unknown"
        );


    const normalized =
        cleanStatus
            .toLowerCase()
            .replaceAll(
                " ",
                "-"
            );


    return `
        <span
            class="status-badge status-${escapeHtml(
                normalized
            )}"
        >
            ${escapeHtml(
                cleanStatus
            )}
        </span>
    `;
}