/* =========================================================
   RECRUITMENT MANAGEMENT SYSTEM
   LABORATORY ACTIVITY 13
   INTERVIEW SCHEDULING
   ========================================================= */

let interviews = [];
let applications = [];
let editingInterviewId = null;


/* =========================================================
   INITIALIZE
   ========================================================= */

document.addEventListener("DOMContentLoaded", initInterviews);

async function initInterviews() {

    renderShell({
        active: "Interviews"
    });

    /*
     * Attach UI events before authentication.
     * This allows the Schedule Interview button
     * to remain responsive even if authentication
     * or Supabase has a temporary problem.
     */
    setupInterviewEvents();

    let session = null;

    try {
        session = await requireAuth();
    } catch (error) {
        console.error(
            "Authentication error:",
            error
        );
    }

    if (!session) {
        console.warn(
            "No authenticated session detected."
        );
        return;
    }

    loadUserProfile().catch(error => {
        console.warn(
            "Unable to load user profile:",
            error
        );
    });

    await Promise.all([
        loadApplications(),
        loadInterviews()
    ]);
}


/* =========================================================
   EVENTS
   ========================================================= */

function setupInterviewEvents() {

    /*
     * OPEN SCHEDULE INTERVIEW MODAL
     */
    document
        .getElementById(
            "openInterviewModal"
        )
        ?.addEventListener(
            "click",
            openInterviewModalForm
        );


    /*
     * CLOSE SCHEDULE INTERVIEW MODAL
     */
    document
        .getElementById(
            "closeInterviewModal"
        )
        ?.addEventListener(
            "click",
            closeScheduleInterviewForm
        );


    /*
     * CANCEL SCHEDULE INTERVIEW
     */
    document
        .getElementById(
            "cancelInterviewModal"
        )
        ?.addEventListener(
            "click",
            closeScheduleInterviewForm
        );


    /*
     * SUBMIT INTERVIEW FORM
     */
    document
        .getElementById(
            "interviewForm"
        )
        ?.addEventListener(
            "submit",
            submitInterview
        );


    /*
     * SEARCH
     */
    document
        .getElementById(
            "interviewSearch"
        )
        ?.addEventListener(
            "input",
            renderInterviews
        );


    /*
     * STATUS FILTER
     */
    document
        .getElementById(
            "interviewStatusFilter"
        )
        ?.addEventListener(
            "change",
            renderInterviews
        );


    /*
     * TABLE ACTIONS
     */
    document
        .getElementById(
            "interviewsTable"
        )
        ?.addEventListener(
            "click",
            handleInterviewAction
        );


    /*
     * APPLICATION SELECTION
     */
    document
        .getElementById(
            "interviewApplication"
        )
        ?.addEventListener(
            "change",
            handleApplicationSelection
        );


    /*
     * VIEW INTERVIEW MODAL
     */
    document
        .getElementById(
            "closeViewInterview"
        )
        ?.addEventListener(
            "click",
            closeViewInterview
        );


    document
        .getElementById(
            "closeViewInterviewBottom"
        )
        ?.addEventListener(
            "click",
            closeViewInterview
        );


    /*
     * CLOSE MODALS WHEN CLICKING BACKDROP
     */
    document
        .querySelectorAll(
            ".modal-backdrop"
        )
        .forEach(modal => {

            modal.addEventListener(
                "click",
                event => {

                    if (
                        event.target === modal
                    ) {

                        toggleModal(
                            modal.id,
                            false
                        );

                    }

                }
            );

        });


    /*
     * CLOSE MODALS WITH ESCAPE KEY
     */
    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key !== "Escape"
            ) {
                return;
            }

            document
                .querySelectorAll(
                    ".modal-backdrop.open"
                )
                .forEach(modal => {

                    toggleModal(
                        modal.id,
                        false
                    );

                });

        }
    );
}


/* =========================================================
   LOAD QUALIFIED APPLICATIONS
   ========================================================= */

async function loadApplications() {

    const select =
        document.getElementById(
            "interviewApplication"
        );

    if (!select) {
        return;
    }

    try {

        if (!window.rmsSupabase) {

            throw new Error(
                "Supabase client is not initialized."
            );

        }

        /*
         * First get the applications only.
         * This avoids the relational SELECT failing
         * before the dropdown can be populated.
         */
        const {
            data: applicationRows,
            error: applicationError
        } =
            await window.rmsSupabase
                .from("applications")
                .select(`
                    application_id,
                    applicant_id,
                    job_id,
                    application_date,
                    status,
                    created_at,
                    updated_at
                `)
                .in(
                    "status",
                    [
                        "Qualified",
                        "For Interview"
                    ]
                )
                .order(
                    "created_at",
                    {
                        ascending: false
                    }
                );

        if (applicationError) {
            throw applicationError;
        }

        const rows =
            Array.isArray(
                applicationRows
            )
                ? applicationRows
                : [];

        /*
         * Get applicant IDs and job IDs.
         */
        const applicantIds =
            [
                ...new Set(
                    rows
                        .map(
                            row =>
                                row.applicant_id
                        )
                        .filter(Boolean)
                )
            ];

        const jobIds =
            [
                ...new Set(
                    rows
                        .map(
                            row =>
                                row.job_id
                        )
                        .filter(Boolean)
                )
            ];

        /*
         * Load applicants.
         */
        let applicantRows = [];

        if (
            applicantIds.length
        ) {

            const {
                data,
                error
            } =
                await window.rmsSupabase
                    .from("applicants")
                    .select(`
                        applicant_id,
                        applicant_no,
                        first_name,
                        last_name,
                        email
                    `)
                    .in(
                        "applicant_id",
                        applicantIds
                    );

            if (error) {
                throw error;
            }

            applicantRows =
                Array.isArray(data)
                    ? data
                    : [];

        }

        /*
         * Load jobs.
         */
        let jobRows = [];

        if (
            jobIds.length
        ) {

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
                        closing_date
                    `)
                    .in(
                        "job_id",
                        jobIds
                    );

            if (error) {
                throw error;
            }

            jobRows =
                Array.isArray(data)
                    ? data
                    : [];

        }

        /*
         * Create lookup maps.
         */
        const applicantMap =
            new Map(
                applicantRows.map(
                    applicant => [
                        String(
                            applicant.applicant_id
                        ),
                        applicant
                    ]
                )
            );

        const jobMap =
            new Map(
                jobRows.map(
                    job => [
                        String(
                            job.job_id
                        ),
                        job
                    ]
                )
            );

        /*
         * Build the same structure used
         * everywhere else in the page.
         */
        applications =
            rows.map(
                application => ({
                    ...application,

                    applicants:
                        applicantMap.get(
                            String(
                                application.applicant_id
                            )
                        ) || null,

                    job_postings:
                        jobMap.get(
                            String(
                                application.job_id
                            )
                        ) || null
                })
            );

        renderApplicationOptions();

    } catch (error) {

        console.error(
            "Load applications error:",
            error
        );

        applications = [];

        select.innerHTML = `
            <option value="">
                Unable to load qualified applications
            </option>
        `;

    }

}
/* =========================================================
   RENDER APPLICATION OPTIONS
   ========================================================= */

function renderApplicationOptions() {

    const select =
        document.getElementById(
            "interviewApplication"
        );

    if (!select) {
        return;
    }

    const currentValue =
        select.value;

    select.innerHTML = `
        <option value="">
            Select qualified application
        </option>
    `;

    applications
        .filter(application => {

            const status =
                normalizeStatus(
                    application.status
                );

            return (
                status === "QUALIFIED" ||
                status === "FOR INTERVIEW"
            );

        })
        .forEach(application => {

            const applicant =
                application.applicants;

            const job =
                application.job_postings;

            const applicantName =
                `${applicant?.first_name || ""} ${
                    applicant?.last_name || ""
                }`.trim();

            const jobTitle =
                job?.job_title ||
                "Unknown Position";

            const jobCode =
                job?.job_code ||
                "";

            const option =
                document.createElement(
                    "option"
                );

            option.value =
                application.application_id;

            option.textContent =
                `${applicantName} — ${jobTitle} ${
                    jobCode
                        ? `(${jobCode})`
                        : ""
                }`;

            select.appendChild(
                option
            );

        });

    /*
     * Keep previously selected value
     * if it still exists.
     */
    if (
        currentValue &&
        [...select.options].some(
            option =>
                String(option.value) ===
                String(currentValue)
        )
    ) {

        select.value =
            currentValue;

    }

}


/* =========================================================
   HANDLE APPLICATION SELECTION
   ========================================================= */

function handleApplicationSelection() {

    const select =
        document.getElementById(
            "interviewApplication"
        );

    const applicantElement =
        document.getElementById(
            "interviewApplicant"
        );

    const positionElement =
        document.getElementById(
            "interviewPosition"
        );

    const infoElement =
        document.getElementById(
            "selectedInterviewApplication"
        );

    if (!select) {
        console.error(
            "interviewApplication element not found."
        );
        return;
    }

    const selectedOption =
        select.options[
            select.selectedIndex
        ];

    const applicationId =
        String(
            select.value || ""
        ).trim();

    console.log(
        "Selected application ID:",
        applicationId
    );

    console.log(
        "Selected option:",
        selectedOption?.textContent
    );

    /*
     * Nothing selected.
     */
    if (!applicationId) {

        if (applicantElement) {
            applicantElement.textContent =
                "—";
        }

        if (positionElement) {
            positionElement.textContent =
                "—";
        }

        if (infoElement) {
            infoElement.hidden =
                true;

            infoElement.style.removeProperty(
                "display"
            );
        }

        return;
    }

    /*
     * Find the application.
     */
    const application =
        applications.find(
            item =>
                String(
                    item.application_id
                ).trim() ===
                applicationId
        );

    console.log(
        "Matched application:",
        application
    );

    /*
     * Pull the applicant and job data.
     */
    const applicant =
        application?.applicants || {};

    const job =
        application?.job_postings || {};

    const applicantName =
        `${applicant.first_name || ""} ${
            applicant.last_name || ""
        }`.trim();

    const positionName =
        job.job_title || "";

    console.log(
        "Applicant:",
        applicantName
    );

    console.log(
        "Position:",
        positionName
    );

    /*
     * Update Applicant.
     */
    if (applicantElement) {

        applicantElement.textContent =
            applicantName ||
            "—";

    }

    /*
     * Update Position.
     */
    if (positionElement) {

        positionElement.textContent =
            positionName ||
            "—";

    }

    /*
     * Make the application-info panel visible.
     */
    if (infoElement) {

        infoElement.hidden =
            false;

        infoElement.style.display =
            "grid";

    }

}
/* =========================================================
   LOAD INTERVIEWS
   ========================================================= */

async function loadInterviews() {

    const table =
        document.getElementById(
            "interviewsTable"
        );

    if (!table) {
        return;
    }

    table.innerHTML = `
        <tr>
            <td
                colspan="7"
                class="table-empty"
            >
                Loading interviews...
            </td>
        </tr>
    `;

    try {

        if (!window.rmsSupabase) {

            throw new Error(
                "Supabase client is not initialized."
            );

        }

        const {
            data,
            error
        } = await window.rmsSupabase
            .from("interviews")
            .select(`
                interview_id,
                application_id,
                interview_date,
                interview_time,
                interviewer,
                venue,
                status,
                score,
                result,
                remarks,
                created_at,
                updated_at,
                applications (
                    application_id,
                    applicant_id,
                    job_id,
                    status,
                    applicants (
                        applicant_no,
                        first_name,
                        last_name,
                        email
                    ),
                    job_postings (
                        job_code,
                        job_title,
                        department
                    )
                )
            `)
            .order(
                "interview_date",
                {
                    ascending: true
                }
            )
            .order(
                "interview_time",
                {
                    ascending: true
                }
            );

        if (error) {
            throw error;
        }

        interviews =
            Array.isArray(data)
                ? data
                : [];

        renderInterviews();

    } catch (error) {

        console.error(
            "Load interviews error:",
            error
        );

        interviews = [];

        table.innerHTML = `
            <tr>
                <td
                    colspan="7"
                    class="table-empty"
                >
                    Unable to load interviews.
                </td>
            </tr>
        `;

    }

}

/* =========================================================
   RENDER INTERVIEWS
   ========================================================= */

function renderInterviews() {

    const table =
        document.getElementById(
            "interviewsTable"
        );

    if (!table) {
        return;
    }

    const search =
        document
            .getElementById(
                "interviewSearch"
            )
            ?.value
            .trim()
            .toLowerCase() || "";

    const statusFilter =
        document
            .getElementById(
                "interviewStatusFilter"
            )
            ?.value || "";

    const filtered =
        interviews.filter(
            interview => {

                const application =
                    interview.applications;

                const applicant =
                    application?.applicants;

                const job =
                    application?.job_postings;

                const applicantName =
                    `${applicant?.first_name || ""} ${
                        applicant?.last_name || ""
                    }`
                        .trim()
                        .toLowerCase();

                const applicantNo =
                    String(
                        applicant?.applicant_no ||
                        ""
                    ).toLowerCase();

                const jobTitle =
                    String(
                        job?.job_title ||
                        ""
                    ).toLowerCase();

                const jobCode =
                    String(
                        job?.job_code ||
                        ""
                    ).toLowerCase();

                const interviewer =
                    String(
                        interview.interviewer ||
                        ""
                    ).toLowerCase();

                const matchesSearch =
                    !search ||
                    applicantName.includes(
                        search
                    ) ||
                    applicantNo.includes(
                        search
                    ) ||
                    jobTitle.includes(
                        search
                    ) ||
                    jobCode.includes(
                        search
                    ) ||
                    interviewer.includes(
                        search
                    );

                const matchesStatus =
                    !statusFilter ||
                    normalizeStatus(
                        interview.status
                    ) ===
                        normalizeStatus(
                            statusFilter
                        );

                return (
                    matchesSearch &&
                    matchesStatus
                );

            }
        );

    if (!filtered.length) {

        table.innerHTML = `
            <tr>
                <td
                    colspan="7"
                    class="table-empty"
                >
                    No interview schedules found.
                </td>
            </tr>
        `;

        return;
    }

    table.innerHTML =
        filtered
            .map(interview => {

                const application =
                    interview.applications;

                const applicant =
                    application?.applicants;

                const job =
                    application?.job_postings;

                const applicantName =
                    `${applicant?.first_name || ""} ${
                        applicant?.last_name || ""
                    }`.trim();

                return `
                    <tr>

                        <td>
                            ${escapeHtml(
                                applicantName ||
                                "—"
                            )}
                        </td>

                        <td>
                            <div class="application-meta">

                                <strong>
                                    ${escapeHtml(
                                        job?.job_title ||
                                        "—"
                                    )}
                                </strong>

                                <span>
                                    ${escapeHtml(
                                        job?.job_code ||
                                        ""
                                    )}
                                </span>

                            </div>
                        </td>

                        <td>
                            ${formatDate(
                                interview.interview_date
                            )}
                        </td>

                        <td>
                            ${formatTime(
                                interview.interview_time
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                interview.interviewer ||
                                "—"
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                interview.venue ||
                                "—"
                            )}
                        </td>

                        <td>
                            <div class="table-actions">

                                <button
                                    type="button"
                                    class="table-action"
                                    data-action="view"
                                    data-id="${
                                        interview.interview_id
                                    }"
                                >
                                    View
                                </button>

                                <button
                                    type="button"
                                    class="table-action"
                                    data-action="edit"
                                    data-id="${
                                        interview.interview_id
                                    }"
                                >
                                    Reschedule
                                </button>

                                ${
                                    normalizeStatus(
                                        interview.status
                                    ) !== "CANCELLED"
                                        ? `
                                            <button
                                                type="button"
                                                class="table-action danger"
                                                data-action="cancel"
                                                data-id="${
                                                    interview.interview_id
                                                }"
                                            >
                                                Cancel
                                            </button>
                                          `
                                        : ""
                                }

                            </div>
                        </td>

                    </tr>
                `;

            })
            .join("");

}


/* =========================================================
   OPEN SCHEDULE FORM
   ========================================================= */

async function openInterviewModalForm() {

    editingInterviewId = null;

    const form =
        document.getElementById(
            "interviewForm"
        );

    if (!form) {

        console.error(
            "interviewForm was not found."
        );

        return;
    }

    form.reset();

    const title =
        document.getElementById(
            "interviewModalTitle"
        );

    if (title) {

        title.textContent =
            "Schedule Interview";

    }

    const saveButton =
        document.getElementById(
            "saveInterviewButton"
        );

    if (saveButton) {

        saveButton.textContent =
            "Schedule Interview";

    }

    const applicationSelect =
        document.getElementById(
            "interviewApplication"
        );

    if (applicationSelect) {

        applicationSelect.disabled =
            false;

        applicationSelect.innerHTML = `
            <option value="">
                Loading qualified applications...
            </option>
        `;

    }

    /*
     * IMPORTANT:
     * Reload applications every time the modal opens.
     * This guarantees the latest Qualified applications
     * are available in the dropdown.
     */
    await loadApplications();

    /*
     * Populate the dropdown after the database request.
     */
    renderApplicationOptions();

    setMinimumInterviewDate();

    handleApplicationSelection();

    toggleModal(
        "interviewModal",
        true
    );

}

/* =========================================================
   CLOSE SCHEDULE FORM
   ========================================================= */

function closeScheduleInterviewForm() {

    editingInterviewId = null;

    const applicationSelect =
        document.getElementById(
            "interviewApplication"
        );

    if (applicationSelect) {

        applicationSelect.disabled =
            false;

    }

    toggleModal(
        "interviewModal",
        false
    );

}
/* =========================================================
   LOAD INTERVIEWS
   ========================================================= */

async function loadInterviews() {

    const table =
        document.getElementById(
            "interviewsTable"
        );

    if (!table) {
        return;
    }

    table.innerHTML = `
        <tr>
            <td
                colspan="7"
                class="table-empty"
            >
                Loading interviews...
            </td>
        </tr>
    `;

    try {

        if (!window.rmsSupabase) {

            throw new Error(
                "Supabase client is not initialized."
            );

        }

        const {
            data,
            error
        } = await window.rmsSupabase
            .from("interviews")
            .select(`
                interview_id,
                application_id,
                interview_date,
                interview_time,
                interviewer,
                venue,
                status,
                score,
                result,
                remarks,
                created_at,
                updated_at,
                applications (
                    application_id,
                    applicant_id,
                    job_id,
                    status,
                    applicants (
                        applicant_no,
                        first_name,
                        last_name,
                        email
                    ),
                    job_postings (
                        job_code,
                        job_title,
                        department
                    )
                )
            `)
            .order(
                "interview_date",
                {
                    ascending: true
                }
            )
            .order(
                "interview_time",
                {
                    ascending: true
                }
            );

        if (error) {
            throw error;
        }

        interviews =
            Array.isArray(data)
                ? data
                : [];

        renderInterviews();

    } catch (error) {

        console.error(
            "Load interviews error:",
            error
        );

        interviews = [];

        table.innerHTML = `
            <tr>
                <td
                    colspan="7"
                    class="table-empty"
                >
                    Unable to load interviews.
                </td>
            </tr>
        `;

    }

}


/* =========================================================
   RENDER INTERVIEWS
   ========================================================= */

function renderInterviews() {

    const table =
        document.getElementById(
            "interviewsTable"
        );

    if (!table) {
        return;
    }

    const search =
        document
            .getElementById(
                "interviewSearch"
            )
            ?.value
            .trim()
            .toLowerCase() || "";

    const statusFilter =
        document
            .getElementById(
                "interviewStatusFilter"
            )
            ?.value || "";

    const filtered =
        interviews.filter(
            interview => {

                const application =
                    interview.applications;

                const applicant =
                    application?.applicants;

                const job =
                    application?.job_postings;

                const applicantName =
                    `${applicant?.first_name || ""} ${
                        applicant?.last_name || ""
                    }`
                        .trim()
                        .toLowerCase();

                const applicantNo =
                    String(
                        applicant?.applicant_no ||
                        ""
                    ).toLowerCase();

                const jobTitle =
                    String(
                        job?.job_title ||
                        ""
                    ).toLowerCase();

                const jobCode =
                    String(
                        job?.job_code ||
                        ""
                    ).toLowerCase();

                const interviewer =
                    String(
                        interview.interviewer ||
                        ""
                    ).toLowerCase();

                const matchesSearch =
                    !search ||
                    applicantName.includes(
                        search
                    ) ||
                    applicantNo.includes(
                        search
                    ) ||
                    jobTitle.includes(
                        search
                    ) ||
                    jobCode.includes(
                        search
                    ) ||
                    interviewer.includes(
                        search
                    );

                const matchesStatus =
                    !statusFilter ||
                    normalizeStatus(
                        interview.status
                    ) ===
                        normalizeStatus(
                            statusFilter
                        );

                return (
                    matchesSearch &&
                    matchesStatus
                );

            }
        );

    if (!filtered.length) {

        table.innerHTML = `
            <tr>
                <td
                    colspan="7"
                    class="table-empty"
                >
                    No interview schedules found.
                </td>
            </tr>
        `;

        return;
    }

    table.innerHTML =
        filtered
            .map(interview => {

                const application =
                    interview.applications;

                const applicant =
                    application?.applicants;

                const job =
                    application?.job_postings;

                const applicantName =
                    `${applicant?.first_name || ""} ${
                        applicant?.last_name || ""
                    }`.trim();

                return `
                    <tr>

                        <td>
                            ${escapeHtml(
                                applicantName ||
                                "—"
                            )}
                        </td>

                        <td>
                            <div class="application-meta">

                                <strong>
                                    ${escapeHtml(
                                        job?.job_title ||
                                        "—"
                                    )}
                                </strong>

                                <span>
                                    ${escapeHtml(
                                        job?.job_code ||
                                        ""
                                    )}
                                </span>

                            </div>
                        </td>

                        <td>
                            ${formatDate(
                                interview.interview_date
                            )}
                        </td>

                        <td>
                            ${formatTime(
                                interview.interview_time
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                interview.interviewer ||
                                "—"
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                interview.venue ||
                                "—"
                            )}
                        </td>

                        <td>
                            <div class="table-actions">

                                <button
                                    type="button"
                                    class="table-action"
                                    data-action="view"
                                    data-id="${
                                        interview.interview_id
                                    }"
                                >
                                    View
                                </button>

                                <button
                                    type="button"
                                    class="table-action"
                                    data-action="edit"
                                    data-id="${
                                        interview.interview_id
                                    }"
                                >
                                    Reschedule
                                </button>

                                ${
                                    normalizeStatus(
                                        interview.status
                                    ) !== "CANCELLED"
                                        ? `
                                            <button
                                                type="button"
                                                class="table-action danger"
                                                data-action="cancel"
                                                data-id="${
                                                    interview.interview_id
                                                }"
                                            >
                                                Cancel
                                            </button>
                                          `
                                        : ""
                                }

                            </div>
                        </td>

                    </tr>
                `;

            })
            .join("");

}

/* =========================================================
   UPDATE APPLICATION STATUS
   ========================================================= */

async function updateApplicationForInterview(
    applicationId
) {

    if (!window.rmsSupabase) {
        return;
    }

    /*
     * Qualified → For Interview
     */
    const {
        error
    } =
        await window.rmsSupabase
            .from("applications")
            .update({
                status:
                    "For Interview"
            })
            .eq(
                "application_id",
                applicationId
            );

    if (error) {

        console.warn(
            "Application status could not be updated:",
            error
        );

    }

}


/* =========================================================
   TABLE ACTIONS
   ========================================================= */

async function handleInterviewAction(
    event
) {

    const button =
        event.target.closest(
            "[data-action]"
        );

    if (!button) {
        return;
    }

    const action =
        button.dataset.action;

    const id =
        button.dataset.id;

    if (!id) {
        return;
    }

    if (action === "view") {

        const interview =
            interviews.find(
                item =>
                    String(
                        item.interview_id
                    ) ===
                    String(id)
            );

        if (interview) {

            openViewInterview(
                interview
            );

        }

        return;
    }

    if (action === "edit") {

        const interview =
            interviews.find(
                item =>
                    String(
                        item.interview_id
                    ) ===
                    String(id)
            );

        if (interview) {

            openEditInterviewForm(
                interview
            );

        }

        return;
    }

    if (action === "cancel") {

        await cancelInterview(
            id
        );

    }

}


/* =========================================================
   OPEN EDIT / RESCHEDULE FORM
   ========================================================= */

function openEditInterviewForm(
    interview
) {

    editingInterviewId =
        interview.interview_id;

    const form =
        document.getElementById(
            "interviewForm"
        );

    if (!form) {
        return;
    }

    form.reset();

    const title =
        document.getElementById(
            "interviewModalTitle"
        );

    if (title) {

        title.textContent =
            "Reschedule Interview";

    }

    const saveButton =
        document.getElementById(
            "saveInterviewButton"
        );

    if (saveButton) {

        saveButton.textContent =
            "Save Changes";

    }

    renderApplicationOptions();

    const applicationSelect =
        document.getElementById(
            "interviewApplication"
        );

    if (applicationSelect) {

        applicationSelect.value =
            interview.application_id;

        /*
         * The applicant cannot be changed
         * while rescheduling.
         */
        applicationSelect.disabled =
            true;

    }

    const dateInput =
        document.getElementById(
            "interviewDate"
        );

    if (dateInput) {

        dateInput.value =
            interview.interview_date ||
            "";

    }

    const timeInput =
        document.getElementById(
            "interviewTime"
        );

    if (timeInput) {

        timeInput.value =
            normalizeTime(
                interview.interview_time
            );

    }

    const interviewerInput =
        document.getElementById(
            "interviewer"
        );

    if (interviewerInput) {

        interviewerInput.value =
            interview.interviewer ||
            "";

    }

    const venueInput =
        document.getElementById(
            "interviewVenue"
        );

    if (venueInput) {

        venueInput.value =
            interview.venue ||
            "";

    }

    handleApplicationSelection();

    setMinimumInterviewDate();

    toggleModal(
        "interviewModal",
        true
    );

}


/* =========================================================
   CANCEL INTERVIEW
   ========================================================= */

async function cancelInterview(
    interviewId
) {

    const interview =
        interviews.find(
            item =>
                String(
                    item.interview_id
                ) ===
                String(interviewId)
        );

    if (!interview) {

        showToast(
            "Interview record not found.",
            "error"
        );

        return;
    }

    const confirmed =
        window.confirm(
            "Are you sure you want to cancel this interview?"
        );

    if (!confirmed) {
        return;
    }

    if (!window.rmsSupabase) {

        showToast(
            "Supabase client is not initialized.",
            "error"
        );

        return;
    }

    try {

        const {
            error
        } =
            await window.rmsSupabase
                .from(
                    "interviews"
                )
                .update({
                    status:
                        "Cancelled"
                })
                .eq(
                    "interview_id",
                    interviewId
                );

        if (error) {
            throw error;
        }

        showToast(
            "Interview cancelled successfully.",
            "success"
        );

        await loadInterviews();

    } catch (error) {

        console.error(
            "Cancel interview error:",
            error
        );

        showToast(
            error?.message ||
            "Unable to cancel interview.",
            "error"
        );

    }

}
/* =========================================================
   VIEW INTERVIEW
   ========================================================= */

function openViewInterview(
    interview
) {

    const body =
        document.getElementById(
            "viewInterviewBody"
        );

    if (!body) {
        return;
    }

    const application =
        interview.applications;

    const applicant =
        application?.applicants;

    const job =
        application?.job_postings;

    const applicantName =
        `${applicant?.first_name || ""} ${
            applicant?.last_name || ""
        }`.trim();

    body.innerHTML = `
        <div class="details-grid">

            <div class="details-item">
                <span class="details-label">
                    Applicant
                </span>

                <strong>
                    ${escapeHtml(
                        applicantName ||
                        "—"
                    )}
                </strong>
            </div>

            <div class="details-item">
                <span class="details-label">
                    Applicant No.
                </span>

                <strong>
                    ${escapeHtml(
                        applicant?.applicant_no ||
                        "—"
                    )}
                </strong>
            </div>

            <div class="details-item">
                <span class="details-label">
                    Position
                </span>

                <strong>
                    ${escapeHtml(
                        job?.job_title ||
                        "—"
                    )}
                </strong>
            </div>

            <div class="details-item">
                <span class="details-label">
                    Job Code
                </span>

                <strong>
                    ${escapeHtml(
                        job?.job_code ||
                        "—"
                    )}
                </strong>
            </div>

            <div class="details-item">
                <span class="details-label">
                    Interview Date
                </span>

                <strong>
                    ${formatDate(
                        interview.interview_date
                    )}
                </strong>
            </div>

            <div class="details-item">
                <span class="details-label">
                    Interview Time
                </span>

                <strong>
                    ${formatTime(
                        interview.interview_time
                    )}
                </strong>
            </div>

            <div class="details-item">
                <span class="details-label">
                    Interviewer
                </span>

                <strong>
                    ${escapeHtml(
                        interview.interviewer ||
                        "—"
                    )}
                </strong>
            </div>

            <div class="details-item">
                <span class="details-label">
                    Venue
                </span>

                <strong>
                    ${escapeHtml(
                        interview.venue ||
                        "—"
                    )}
                </strong>
            </div>

            <div class="details-item">
                <span class="details-label">
                    Status
                </span>

                ${statusBadge(
                    interview.status
                )}
            </div>

            ${
                interview.remarks
                    ? `
                        <div class="details-item details-full">
                            <span class="details-label">
                                Remarks
                            </span>

                            <p>
                                ${escapeHtml(
                                    interview.remarks
                                )}
                            </p>
                        </div>
                      `
                    : ""
            }

        </div>
    `;

    toggleModal(
        "viewInterviewModal",
        true
    );

}


/* =========================================================
   CLOSE VIEW
   ========================================================= */

function closeViewInterview() {

    toggleModal(
        "viewInterviewModal",
        false
    );

}


/* =========================================================
   VALID DATE / TIME
   ========================================================= */

function isValidFutureDateTime(
    date,
    time,
    editingId = null
) {

    if (!date || !time) {
        return false;
    }

    /*
     * Browser local time.
     */
    const selected =
        new Date(
            `${date}T${normalizeTime(
                time
            )}:00`
        );

    if (
        Number.isNaN(
            selected.getTime()
        )
    ) {
        return false;
    }

    /*
     * Allow an existing appointment to retain
     * its current date/time while editing.
     */
    if (editingId !== null) {

        const existing =
            interviews.find(
                interview =>
                    String(
                        interview.interview_id
                    ) ===
                    String(
                        editingId
                    )
            );

        if (existing) {

            const oldDate =
                existing.interview_date;

            const oldTime =
                normalizeTime(
                    existing.interview_time
                );

            if (
                oldDate === date &&
                oldTime ===
                    normalizeTime(
                        time
                    )
            ) {

                return true;

            }

        }

    }

    /*
     * New schedules must be in the future.
     */
    return (
        selected.getTime() >
        Date.now()
    );

}


/* =========================================================
   MINIMUM INTERVIEW DATE
   ========================================================= */

function setMinimumInterviewDate() {

    const dateInput =
        document.getElementById(
            "interviewDate"
        );

    if (!dateInput) {
        return;
    }

    dateInput.min =
        getTodayLocalDate();

}


/* =========================================================
   GET TODAY'S LOCAL DATE
   ========================================================= */

function getTodayLocalDate() {

    const now =
        new Date();

    const year =
        now.getFullYear();

    const month =
        String(
            now.getMonth() + 1
        ).padStart(
            2,
            "0"
        );

    const day =
        String(
            now.getDate()
        ).padStart(
            2,
            "0"
        );

    return `${year}-${month}-${day}`;

}

/* =========================================================
   DATE FORMAT
   ========================================================= */

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
        return value;
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


/* =========================================================
   TIME FORMAT
   ========================================================= */

function formatTime(
    value
) {

    if (!value) {
        return "—";
    }

    const normalized =
        normalizeTime(
            value
        );

    const parts =
        normalized.split(":");

    const hour =
        Number(
            parts[0]
        );

    const minute =
        parts[1] || "00";

    if (
        Number.isNaN(
            hour
        )
    ) {
        return value;
    }

    const suffix =
        hour >= 12
            ? "PM"
            : "AM";

    const displayHour =
        hour % 12 || 12;

    return `${displayHour}:${minute} ${suffix}`;

}


/* =========================================================
   NORMALIZE TIME
   ========================================================= */

function normalizeTime(
    value
) {

    if (!value) {
        return "";
    }

    return String(value)
        .trim()
        .substring(
            0,
            5
        );

}


/* =========================================================
   NORMALIZE STATUS
   ========================================================= */

function normalizeStatus(
    value
) {

    return String(
        value || ""
    )
        .trim()
        .toUpperCase()
        .replace(
            /_/g,
            " "
        );

}


/* =========================================================
   STATUS BADGE
   ========================================================= */

function statusBadge(
    status
) {

    if (!status) {

        return `
            <span class="status-badge">
                —
            </span>
        `;

    }

    const normalized =
        normalizeStatus(
            status
        )
            .toLowerCase()
            .replace(
                /\s+/g,
                "-"
            );

    return `
        <span
            class="status-badge status-${escapeHtml(
                normalized
            )}"
        >
            ${escapeHtml(
                status
            )}
        </span>
    `;

}


/* =========================================================
   MODAL
   ========================================================= */

function toggleModal(
    id,
    open
) {

    const modal =
        document.getElementById(
            id
        );

    if (!modal) {
        return;
    }

    modal.classList.toggle(
        "open",
        open
    );

    modal.setAttribute(
        "aria-hidden",
        String(!open)
    );

}


/* =========================================================
   BUTTON LOADING
   ========================================================= */

function setButtonLoading(
    button,
    loading,
    text = "Processing..."
) {

    if (!button) {
        return;
    }

    if (loading) {

        button.dataset.originalText =
            button.innerHTML;

        button.disabled =
            true;

        button.innerHTML = `
            <span class="button-spinner"></span>
            ${escapeHtml(
                text
            )}
        `;

    } else {

        button.disabled =
            false;

        if (
            button.dataset.originalText
        ) {

            button.innerHTML =
                button.dataset.originalText;

            delete button.dataset
                .originalText;

        }

    }

}


/* =========================================================
   HTML ESCAPE
   ========================================================= */

function escapeHtml(
    value
) {

    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }

    return String(value)
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

function showToast(
    message,
    type = "info"
) {

    let container =
        document.getElementById(
            "toastRoot"
        );

    if (!container) {

        container =
            document.createElement(
                "div"
            );

        container.id =
            "toastRoot";

        container.className =
            "toast-container";

        document.body.appendChild(
            container
        );

    }

    const toast =
        document.createElement(
            "div"
        );

    toast.className =
        `toast toast-${type}`;

    toast.innerHTML = `
        <div class="toast-message">
            ${escapeHtml(
                message
            )}
        </div>
    `;

    container.appendChild(
        toast
    );

    setTimeout(() => {

        toast.classList.add(
            "toast-show"
        );

    }, 10);

    setTimeout(() => {

        toast.classList.remove(
            "toast-show"
        );

        setTimeout(() => {

            toast.remove();

        }, 250);

    }, 3000);

}

/* =========================================================
   LAB 13 FINAL FIX
   Paste this entire block at the VERY BOTTOM of interviews.js
   ========================================================= */

/*
 * FIXED EVENT SETUP
 */
function setupInterviewEvents() {

    const openButton =
        document.getElementById("openInterviewModal");

    const closeButton =
        document.getElementById("closeInterviewModal");

    const cancelButton =
        document.getElementById("cancelInterviewModal");

    const form =
        document.getElementById("interviewForm");

    const applicationSelect =
        document.getElementById("interviewApplication");

    const searchInput =
        document.getElementById("interviewSearch");

    const statusFilter =
        document.getElementById("interviewStatusFilter");

    const table =
        document.getElementById("interviewsTable");

    const closeViewButton =
        document.getElementById("closeViewInterview");

    const closeViewBottomButton =
        document.getElementById("closeViewInterviewBottom");


    /* OPEN SCHEDULE MODAL */
    if (openButton) {
        openButton.addEventListener(
            "click",
            openInterviewModalForm
        );
    }


    /* CLOSE SCHEDULE MODAL */
    if (closeButton) {
        closeButton.addEventListener(
            "click",
            closeScheduleInterviewForm
        );
    }


    /* CANCEL SCHEDULE MODAL */
    if (cancelButton) {
        cancelButton.addEventListener(
            "click",
            closeScheduleInterviewForm
        );
    }


    /*
     * FORM SUBMIT
     *
     * IMPORTANT:
     * Use a wrapper instead of referencing submitInterview
     * directly during setup.
     */
    if (form) {
        form.addEventListener(
            "submit",
            function (event) {
                submitInterview(event);
            }
        );
    }


    /* APPLICATION SELECT */
    if (applicationSelect) {
        applicationSelect.addEventListener(
            "change",
            handleApplicationSelection
        );
    }


    /* SEARCH */
    if (searchInput) {
        searchInput.addEventListener(
            "input",
            renderInterviews
        );
    }


    /* STATUS FILTER */
    if (statusFilter) {
        statusFilter.addEventListener(
            "change",
            renderInterviews
        );
    }


    /* TABLE ACTIONS */
    if (table) {
        table.addEventListener(
            "click",
            handleInterviewAction
        );
    }


    /* VIEW MODAL */
    if (closeViewButton) {
        closeViewButton.addEventListener(
            "click",
            closeViewInterview
        );
    }


    if (closeViewBottomButton) {
        closeViewBottomButton.addEventListener(
            "click",
            closeViewInterview
        );
    }


    /* MODAL BACKDROP */
    document
        .querySelectorAll(".modal-backdrop")
        .forEach(modal => {

            modal.addEventListener(
                "click",
                event => {

                    if (
                        event.target === modal
                    ) {
                        toggleModal(
                            modal.id,
                            false
                        );
                    }

                }
            );

        });


    /* ESCAPE KEY */
    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key !== "Escape"
            ) {
                return;
            }

            document
                .querySelectorAll(
                    ".modal-backdrop.open"
                )
                .forEach(modal => {

                    toggleModal(
                        modal.id,
                        false
                    );

                });

        }
    );
}


/* =========================================================
   FIXED APPLICATION SELECTION
   ========================================================= */

function handleApplicationSelection() {

    console.log(
        "===== INTERVIEW APPLICATION SELECTION ====="
    );


    const select =
        document.getElementById(
            "interviewApplication"
        );

    const applicantElement =
        document.getElementById(
            "interviewApplicant"
        );

    const positionElement =
        document.getElementById(
            "interviewPosition"
        );

    const infoElement =
        document.getElementById(
            "selectedInterviewApplication"
        );


    console.log(
        "Select:",
        select
    );

    console.log(
        "Applications:",
        applications
    );


    if (
        !select ||
        !applicantElement ||
        !positionElement
    ) {

        console.error(
            "Interview application elements are missing."
        );

        return;
    }


    const applicationId =
        String(
            select.value || ""
        ).trim();


    console.log(
        "Selected application ID:",
        applicationId
    );


    /*
     * Nothing selected
     */
    if (!applicationId) {

        applicantElement.textContent =
            "—";

        positionElement.textContent =
            "—";

        if (infoElement) {

            infoElement.hidden =
                false;

            infoElement.style.display =
                "grid";

        }

        return;
    }


    /*
     * Find selected application
     */
    const application =
        applications.find(
            item =>
                String(
                    item.application_id ??
                    item.id ??
                    ""
                ).trim() ===
                applicationId
        );


    console.log(
        "Matched application:",
        application
    );


    if (!application) {

        console.warn(
            "Application was not found:",
            applicationId
        );

        applicantElement.textContent =
            "—";

        positionElement.textContent =
            "—";

        if (infoElement) {

            infoElement.hidden =
                false;

            infoElement.style.display =
                "grid";

        }

        return;
    }


    /*
     * Applicant data
     */
    const applicant =
        application.applicants ||
        application.applicant ||
        {};


    /*
     * Job data
     */
    const job =
        application.job_postings ||
        application.job_posting ||
        application.job ||
        {};


    console.log(
        "Applicant data:",
        applicant
    );

    console.log(
        "Job data:",
        job
    );


    /*
     * Build applicant name
     */
    const applicantName = [
        applicant.first_name,
        applicant.last_name
    ]
        .filter(
            value =>
                value !== null &&
                value !== undefined &&
                String(value).trim() !== ""
        )
        .map(
            value =>
                String(value).trim()
        )
        .join(" ");


    /*
     * Build position name
     */
    const positionName =
        String(
            job.job_title ||
            application.job_title ||
            ""
        ).trim();


    console.log(
        "Applicant name:",
        applicantName
    );

    console.log(
        "Position:",
        positionName
    );


    /*
     * UPDATE APPLICANT
     */
    applicantElement.textContent =
        applicantName || "—";


    /*
     * UPDATE POSITION
     */
    positionElement.textContent =
        positionName || "—";


    /*
     * FORCE INFORMATION CARD VISIBLE
     */
    if (infoElement) {

        infoElement.hidden =
            false;

        infoElement.removeAttribute(
            "hidden"
        );

        infoElement.style.display =
            "grid";

    }


    console.log(
        "Applicant DOM:",
        applicantElement.textContent
    );

    console.log(
        "Position DOM:",
        positionElement.textContent
    );

    console.log(
        "=========================================="
    );
}


/* =========================================================
   FIXED SUBMIT INTERVIEW
   ========================================================= */

async function submitInterview(event) {
    event.preventDefault();

    const button = document.getElementById("saveInterviewButton");
    const applicationSelect = document.getElementById("interviewApplication");
    const dateInput = document.getElementById("interviewDate");
    const timeInput = document.getElementById("interviewTime");
    const interviewerInput = document.getElementById("interviewer");
    const venueInput = document.getElementById("interviewVenue");
    const statusInput = document.getElementById("interviewStatus");

    const applicationId = String(applicationSelect?.value || "").trim();
    const interviewDate = String(dateInput?.value || "").trim();
    const interviewTime = String(timeInput?.value || "").trim();
    const interviewer = String(interviewerInput?.value || "").trim();
    const venue = String(venueInput?.value || "").trim();
    const status = String(statusInput?.value || "Scheduled").trim();

    if (!applicationId) {
        showToast("Please select a qualified application.", "error");
        return;
    }

    if (!interviewDate) {
        showToast("Please select an interview date.", "error");
        return;
    }

    if (!interviewTime) {
        showToast("Please select an interview time.", "error");
        return;
    }

    if (!interviewer) {
        showToast("Please enter the interviewer.", "error");
        return;
    }

    if (!venue) {
        showToast("Please enter the interview venue.", "error");
        return;
    }

    const application = applications.find(
        item =>
            String(item.application_id ?? item.id ?? "").trim() ===
            applicationId
    );

    if (!application) {
        showToast(
            "The selected application could not be found.",
            "error"
        );
        return;
    }

    const applicationStatus = normalizeStatus(application.status);

    if (
        editingInterviewId === null &&
        applicationStatus !== "QUALIFIED" &&
        applicationStatus !== "FOR INTERVIEW"
    ) {
        showToast(
            "Interview cannot be scheduled because the application is not qualified.",
            "error"
        );
        return;
    }

    if (
        typeof isValidFutureDateTime === "function" &&
        !isValidFutureDateTime(
            interviewDate,
            interviewTime,
            editingInterviewId
        )
    ) {
        showToast(
            "Please select a valid future interview date and time.",
            "error"
        );
        return;
    }

    if (!window.rmsSupabase) {
        showToast(
            "Supabase client is not initialized.",
            "error"
        );
        return;
    }

    if (typeof setButtonLoading === "function") {
        setButtonLoading(
            button,
            true,
            editingInterviewId === null
                ? "Scheduling..."
                : "Saving..."
        );
    }

    try {

        /* =========================================
           SCHEDULE NEW INTERVIEW
           ========================================= */
        if (editingInterviewId === null) {

            const insertData = {
                application_id: applicationId,
                interview_date: interviewDate,
                interview_time: interviewTime,
                interviewer: interviewer,
                venue: venue,
                status: status || "Scheduled"
            };

            console.log(
                "Saving interview:",
                insertData
            );

            /*
             * IMPORTANT:
             * Do NOT use .select() here.
             * This prevents an INSERT from failing because
             * the inserted row cannot be returned under RLS.
             */
            const { error } =
                await window.rmsSupabase
                    .from("interviews")
                    .insert(insertData);

            if (error) {
                console.error(
                    "SUPABASE INSERT ERROR:",
                    error
                );

                console.error(
                    "message:",
                    error.message
                );

                console.error(
                    "details:",
                    error.details
                );

                console.error(
                    "hint:",
                    error.hint
                );

                console.error(
                    "code:",
                    error.code
                );

                throw error;
            }

            /*
             * Update application status after successful insert.
             */
            if (
                typeof updateApplicationForInterview ===
                "function"
            ) {
                try {
                    await updateApplicationForInterview(
                        applicationId
                    );
                } catch (applicationError) {
                    console.warn(
                        "Interview saved, but application status could not be updated:",
                        applicationError
                    );
                }
            }

            showToast(
                "Interview scheduled successfully.",
                "success"
            );
        }

        /* =========================================
           RESCHEDULE EXISTING INTERVIEW
           ========================================= */
        else {

            const updateData = {
                application_id: applicationId,
                interview_date: interviewDate,
                interview_time: interviewTime,
                interviewer: interviewer,
                venue: venue,
                status: status || "Scheduled"
            };

            console.log(
                "Updating interview:",
                updateData
            );

            const { error } =
                await window.rmsSupabase
                    .from("interviews")
                    .update(updateData)
                    .eq(
                        "interview_id",
                        editingInterviewId
                    );

            if (error) {
                console.error(
                    "SUPABASE UPDATE ERROR:",
                    error
                );

                console.error(
                    "message:",
                    error.message
                );

                console.error(
                    "details:",
                    error.details
                );

                console.error(
                    "hint:",
                    error.hint
                );

                console.error(
                    "code:",
                    error.code
                );

                throw error;
            }

            showToast(
                "Interview rescheduled successfully.",
                "success"
            );
        }

        closeScheduleInterviewForm();

        /*
         * Reload the table.
         */
        if (
            typeof loadInterviews ===
            "function"
        ) {
            await loadInterviews();
        }

        /*
         * Reload applications so the status is current.
         */
        if (
            typeof loadApplications ===
            "function"
        ) {
            await loadApplications();
        }

    } catch (error) {

        console.error(
            "===== INTERVIEW SAVE FAILED ====="
        );

        console.error(
            error
        );

        const message =
            error?.message ||
            error?.details ||
            error?.hint ||
            "Unable to save interview schedule.";

        showToast(
            message,
            "error"
        );

    } finally {

        if (
            typeof setButtonLoading ===
            "function"
        ) {
            setButtonLoading(
                button,
                false
            );
        }
    }
}

/* =========================================================
   RE-INITIALIZE EVENTS SAFELY
   ========================================================= */
