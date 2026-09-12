/* =========================================================
   RECRUITMENT MANAGEMENT SYSTEM
   LABORATORY ACTIVITY 13
   INTERVIEW SCHEDULING

   LABORATORY ACTIVITY 14
   INTERVIEW EVALUATION

   Features:
   - Schedule
   - Reschedule
   - Cancel
   - View
   - Search
   - Status filter
   - Summary counts
   - Qualified-application validation
   - Duplicate schedule validation
   - Interviewer conflict validation
   - Future date/time validation
   - Interview evaluation
   - Automatic total score
   - Automatic PASSED / FAILED result
   - Evaluation validation
   - Evaluation saved to interview record
   ========================================================= */

let interviews = [];
let applications = [];
let editingInterviewId = null;
let pendingCancelInterviewId = null;
let interviewEventsBound = false;
let evaluatingInterviewId = null;

document.addEventListener("DOMContentLoaded", initInterviews);


/* =========================================================
   INITIALIZE
   ========================================================= */

async function initInterviews() {
    renderShell({ active: "Interviews" });
    setupInterviewEvents();

    let session = null;

    try {
        session = await requireAuth();
    } catch (error) {
        console.error("Authentication error:", error);
    }

    if (!session) {
        console.warn("No authenticated session detected.");
        return;
    }

    loadUserProfile().catch(error => {
        console.warn("Unable to load user profile:", error);
    });

    await loadApplications();
    await loadInterviews();
}


/* =========================================================
   EVENTS
   ========================================================= */

function setupInterviewEvents() {
    if (interviewEventsBound) return;
    interviewEventsBound = true;

    document
        .getElementById("openInterviewModal")
        ?.addEventListener("click", openInterviewModalForm);

    document
        .getElementById("closeInterviewModal")
        ?.addEventListener("click", closeScheduleInterviewForm);

    document
        .getElementById("cancelInterviewModal")
        ?.addEventListener("click", closeScheduleInterviewForm);

    document
        .getElementById("interviewForm")
        ?.addEventListener("submit", submitInterview);

    document
        .getElementById("interviewApplication")
        ?.addEventListener("change", handleApplicationSelection);

    document
        .getElementById("interviewSearch")
        ?.addEventListener("input", renderInterviews);

    document
        .getElementById("interviewStatusFilter")
        ?.addEventListener("change", renderInterviews);

    document
        .getElementById("interviewsTable")
        ?.addEventListener("click", handleInterviewAction);

    document
        .getElementById("closeViewInterview")
        ?.addEventListener("click", closeViewInterview);

    document
        .getElementById("closeViewInterviewBottom")
        ?.addEventListener("click", closeViewInterview);

    document
        .getElementById("closeCancelConfirm")
        ?.addEventListener("click", closeCancelConfirm);

    document
        .getElementById("cancelCancelConfirm")
        ?.addEventListener("click", closeCancelConfirm);

    document
        .getElementById("confirmCancelInterview")
        ?.addEventListener("click", confirmCancelInterview);

    /* =====================================================
       LAB 14 - EVALUATION EVENTS
       ===================================================== */

    document
        .getElementById("closeEvaluationModal")
        ?.addEventListener(
            "click",
            closeInterviewEvaluation
        );

    document
        .getElementById("cancelEvaluationModal")
        ?.addEventListener(
            "click",
            closeInterviewEvaluation
        );

    document
        .getElementById("interviewEvaluationForm")
        ?.addEventListener(
            "submit",
            submitInterviewEvaluation
        );

    [
        "communicationScore",
        "technicalKnowledgeScore",
        "problemSolvingScore",
        "teamworkScore",
        "professionalismScore"
    ].forEach(id => {
        document
            .getElementById(id)
            ?.addEventListener(
                "input",
                updateEvaluationTotal
            );
    });

    document
        .querySelectorAll(".modal-backdrop")
        .forEach(modal => {
            modal.addEventListener(
                "click",
                event => {
                    if (event.target !== modal) {
                        return;
                    }

                    if (
                        modal.id ===
                        "cancelConfirmModal"
                    ) {
                        closeCancelConfirm();
                    } else {
                        toggleModal(
                            modal.id,
                            false
                        );
                    }
                }
            );
        });

    document.addEventListener(
        "keydown",
        event => {
            if (event.key !== "Escape") {
                return;
            }

            const openModals =
                document.querySelectorAll(
                    ".modal-backdrop.open"
                );

            openModals.forEach(
                modal => {
                    if (
                        modal.id ===
                        "cancelConfirmModal"
                    ) {
                        closeCancelConfirm();
                    } else {
                        toggleModal(
                            modal.id,
                            false
                        );
                    }
                }
            );
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

    try {
        if (!window.rmsSupabase) {
            throw new Error(
                "Supabase client is not initialized."
            );
        }

        const {
            data: rows,
            error
        } =
            await window.rmsSupabase
                .from("applications")
                .select(`
                    application_id,
                    applicant_id,
                    job_id,
                    application_date,
                    status,
                    created_at
                `)
                .order(
                    "created_at",
                    {
                        ascending: false
                    }
                );

        if (error) {
            throw error;
        }

        const applicationRows =
            Array.isArray(rows)
                ? rows
                : [];

        const applicantIds = [
            ...new Set(
                applicationRows
                    .map(
                        row =>
                            row.applicant_id
                    )
                    .filter(Boolean)
            )
        ];

        const jobIds = [
            ...new Set(
                applicationRows
                    .map(
                        row =>
                            row.job_id
                    )
                    .filter(Boolean)
            )
        ];

        let applicantRows = [];
        let jobRows = [];

        if (applicantIds.length) {
            const {
                data,
                error: applicantError
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

            if (applicantError) {
                throw applicantError;
            }

            applicantRows =
                Array.isArray(data)
                    ? data
                    : [];
        }

        if (jobIds.length) {
            const {
                data,
                error: jobError
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

            if (jobError) {
                throw jobError;
            }

            jobRows =
                Array.isArray(data)
                    ? data
                    : [];
        }

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

        applications =
            applicationRows.map(
                application => ({
                    ...application,

                    applicants:
                        applicantMap.get(
                            String(
                                application
                                    .applicant_id
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

        renderApplicationOptions(
            editingInterviewId !== null
        );

    } catch (error) {
        console.error(
            "Load applications error:",
            error
        );

        applications = [];

        if (select) {
            select.innerHTML = `
                <option value="">
                    Unable to load qualified applications
                </option>
            `;
        }
    }
}


/* =========================================================
   APPLICATION DROPDOWN
   ========================================================= */

function renderApplicationOptions(
    includeForInterview = false,
    selectedId = null
) {
    const select =
        document.getElementById(
            "interviewApplication"
        );

    if (!select) {
        return;
    }

    const previousValue =
        String(
            selectedId ??
            select.value ??
            ""
        ).trim();

    select.innerHTML = `
        <option value="">
            Select qualified application
        </option>
    `;

    const availableApplications =
        applications.filter(
            application => {
                const status =
                    normalizeStatus(
                        application.status
                    );

                return (
                    status ===
                        "QUALIFIED" ||
                    (
                        includeForInterview &&
                        status ===
                            "FOR INTERVIEW"
                    )
                );
            }
        );

    availableApplications.forEach(
        application => {
            const applicant =
                application.applicants ||
                {};

            const job =
                application.job_postings ||
                {};

            const applicantName =
                `${
                    applicant.first_name ||
                    ""
                } ${
                    applicant.last_name ||
                    ""
                }`.trim();

            const jobTitle =
                job.job_title ||
                "Unknown Position";

            const jobCode =
                job.job_code ||
                "";

            const option =
                document.createElement(
                    "option"
                );

            option.value =
                application.application_id;

            option.textContent =
                `${
                    applicantName ||
                    "Applicant"
                } — ${jobTitle}${
                    jobCode
                        ? ` (${jobCode})`
                        : ""
                }`;

            select.appendChild(
                option
            );
        }
    );

    if (
        !availableApplications.length
    ) {
        const emptyOption =
            document.createElement(
                "option"
            );

        emptyOption.disabled =
            true;

        emptyOption.textContent =
            "No qualified applications available";

        select.appendChild(
            emptyOption
        );
    }

    if (
        previousValue &&
        [
            ...select.options
        ].some(
            option =>
                String(
                    option.value
                ) === previousValue
        )
    ) {
        select.value =
            previousValue;
    }
}


/* =========================================================
   APPLICATION SELECTION
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
        return;
    }

    const applicationId =
        String(
            select.value || ""
        ).trim();

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

            infoElement.style
                .removeProperty(
                    "display"
                );
        }

        return;
    }

    const application =
        applications.find(
            item =>
                String(
                    item.application_id
                ) === applicationId
        );

    if (!application) {
        if (applicantElement) {
            applicantElement.textContent =
                "—";
        }

        if (positionElement) {
            positionElement.textContent =
                "—";
        }

        return;
    }

    const applicant =
        application.applicants ||
        {};

    const job =
        application.job_postings ||
        {};

    const applicantName =
        `${
            applicant.first_name ||
            ""
        } ${
            applicant.last_name ||
            ""
        }`.trim();

    const positionName =
        String(
            job.job_title ||
            ""
        ).trim();

    if (applicantElement) {
        applicantElement.textContent =
            applicantName ||
            "—";
    }

    if (positionElement) {
        positionElement.textContent =
            positionName ||
            "—";
    }

    if (infoElement) {
        infoElement.hidden =
            false;

        infoElement.style.display =
            "grid";
    }
}


/* =========================================================
   SCHEDULE MODAL
   ========================================================= */

async function openInterviewModalForm() {
    editingInterviewId = null;
    pendingCancelInterviewId =
        null;

    const form =
        document.getElementById(
            "interviewForm"
        );

    if (!form) {
        return;
    }

    form.reset();
    clearFormError();

    setFormMode("schedule");

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

    await loadApplications();

    renderApplicationOptions(
        false
    );

    setMinimumInterviewDate();

    handleApplicationSelection();

    toggleModal(
        "interviewModal",
        true
    );
}


function openEditInterviewForm(
    interview
) {
    const status =
        normalizeStatus(
            interview?.status
        );

    if (
        !interview ||
        status === "CANCELLED" ||
        status === "COMPLETED"
    ) {
        showToast(
            "This interview cannot be rescheduled.",
            "error"
        );

        return;
    }

    editingInterviewId =
        interview.interview_id;

    pendingCancelInterviewId =
        null;

    const form =
        document.getElementById(
            "interviewForm"
        );

    if (!form) {
        return;
    }

    form.reset();
    clearFormError();

    setFormMode(
        "reschedule"
    );

    renderApplicationOptions(
        true,
        interview.application_id
    );

    const applicationSelect =
        document.getElementById(
            "interviewApplication"
        );

    const dateInput =
        document.getElementById(
            "interviewDate"
        );

    const timeInput =
        document.getElementById(
            "interviewTime"
        );

    const interviewerInput =
        document.getElementById(
            "interviewer"
        );

    const venueInput =
        document.getElementById(
            "interviewVenue"
        );

    if (applicationSelect) {
        applicationSelect.value =
            interview.application_id;

        applicationSelect.disabled =
            true;
    }

    if (dateInput) {
        dateInput.value =
            interview.interview_date ||
            "";
    }

    if (timeInput) {
        timeInput.value =
            normalizeTime(
                interview.interview_time
            );
    }

    if (interviewerInput) {
        interviewerInput.value =
            interview.interviewer ||
            "";
    }

    if (venueInput) {
        venueInput.value =
            interview.venue ||
            "";
    }

    setMinimumInterviewDate();

    handleApplicationSelection();

    toggleModal(
        "interviewModal",
        true
    );
}


function setFormMode(
    mode
) {
    const title =
        document.getElementById(
            "interviewModalTitle"
        );

    const saveButton =
        document.getElementById(
            "saveInterviewButton"
        );

    const statusInput =
        document.getElementById(
            "interviewStatus"
        );

    const isReschedule =
        mode === "reschedule";

    const status =
        isReschedule
            ? "Rescheduled"
            : "Scheduled";

    if (title) {
        title.textContent =
            isReschedule
                ? "Reschedule Interview"
                : "Schedule Interview";
    }

    if (saveButton) {
        saveButton.textContent =
            isReschedule
                ? "Save Changes"
                : "Schedule Interview";
    }

    if (statusInput) {
        statusInput.innerHTML = `
            <option value="${status}">
                ${status}
            </option>
        `;

        statusInput.value =
            status;

        statusInput.disabled =
            true;
    }
}


function closeScheduleInterviewForm() {
    editingInterviewId =
        null;

    clearFormError();

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
                colspan="8"
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
        } =
            await window.rmsSupabase
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
                    communication_score,
                    technical_knowledge_score,
                    problem_solving_score,
                    teamwork_score,
                    professionalism_score,
                    evaluated_by,
                    evaluated_at,
                    created_at,
                    updated_at
                `)
                .order(
                    "interview_date",
                    {
                        ascending:
                            true
                    }
                )
                .order(
                    "interview_time",
                    {
                        ascending:
                            true
                    }
                );

        if (error) {
            throw error;
        }

        interviews =
            (
                Array.isArray(data)
                    ? data
                    : []
            ).map(
                interview => ({
                    ...interview,

                    applications:
                        applications.find(
                            application =>
                                String(
                                    application.application_id
                                ) ===
                                String(
                                    interview.application_id
                                )
                        ) || null
                })
            );

        renderInterviews();

    } catch (error) {
        console.error(
            "Load interviews error:",
            error
        );

        interviews = [];

        updateInterviewSummary();

        table.innerHTML = `
            <tr>
                <td
                    colspan="8"
                    class="table-empty"
                >
                    Unable to load interviews.
                </td>
            </tr>
        `;
    }
}


/* =========================================================
   SUMMARY
   ========================================================= */

function updateInterviewSummary() {
    const totalElement =
        document.getElementById(
            "totalInterviews"
        );

    const scheduledElement =
        document.getElementById(
            "scheduledInterviews"
        );

    const cancelledElement =
        document.getElementById(
            "cancelledInterviews"
        );

    const total =
        interviews.length;

    const scheduled =
        interviews.filter(
            interview => {
                const status =
                    normalizeStatus(
                        interview.status
                    );

                return (
                    status ===
                        "SCHEDULED" ||
                    status ===
                        "RESCHEDULED"
                );
            }
        ).length;

    const cancelled =
        interviews.filter(
            interview =>
                normalizeStatus(
                    interview.status
                ) ===
                "CANCELLED"
        ).length;

    if (totalElement) {
        totalElement.textContent =
            total;
    }

    if (scheduledElement) {
        scheduledElement.textContent =
            scheduled;
    }

    if (cancelledElement) {
        cancelledElement.textContent =
            cancelled;
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

    updateInterviewSummary();

    const search =
        String(
            document.getElementById(
                "interviewSearch"
            )?.value ||
                ""
        )
            .trim()
            .toLowerCase();

    const statusFilter =
        String(
            document.getElementById(
                "interviewStatusFilter"
            )?.value ||
                ""
        ).trim();

    const filtered =
        interviews.filter(
            interview => {
                const application =
                    interview.applications ||
                    {};

                const applicant =
                    application.applicants ||
                    {};

                const job =
                    application.job_postings ||
                    {};

                const applicantName =
                    `${
                        applicant.first_name ||
                        ""
                    } ${
                        applicant.last_name ||
                        ""
                    }`
                        .trim()
                        .toLowerCase();

                const applicantNo =
                    String(
                        applicant.applicant_no ||
                        ""
                    ).toLowerCase();

                const jobTitle =
                    String(
                        job.job_title ||
                        ""
                    ).toLowerCase();

                const jobCode =
                    String(
                        job.job_code ||
                        ""
                    ).toLowerCase();

                const interviewer =
                    String(
                        interview.interviewer ||
                        ""
                    ).toLowerCase();

                const venue =
                    String(
                        interview.venue ||
                        ""
                    ).toLowerCase();

                const status =
                    normalizeStatus(
                        interview.status
                    );

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
                    ) ||
                    venue.includes(
                        search
                    ) ||
                    status
                        .toLowerCase()
                        .includes(
                            search
                        );

                let matchesStatus =
                    true;

                if (statusFilter) {
                    const wanted =
                        normalizeStatus(
                            statusFilter
                        );

                    if (
                        wanted ===
                        "SCHEDULED"
                    ) {
                        matchesStatus =
                            status ===
                                "SCHEDULED" ||
                            status ===
                                "RESCHEDULED";
                    } else {
                        matchesStatus =
                            status ===
                            wanted;
                    }
                }

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
                    colspan="8"
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
            .map(
                interview => {
                    const application =
                        interview.applications ||
                        {};

                    const applicant =
                        application.applicants ||
                        {};

                    const job =
                        application.job_postings ||
                        {};

                    const status =
                        normalizeStatus(
                            interview.status
                        );

                    const inactive =
                        status ===
                            "CANCELLED" ||
                        status ===
                            "COMPLETED";

                    const applicantName =
                        `${
                            applicant.first_name ||
                            ""
                        } ${
                            applicant.last_name ||
                            ""
                        }`.trim();

                    const hasEvaluation =
                        interview.score !==
                            null &&
                        interview.score !==
                            undefined &&
                        interview.score !==
                            "";

                    return `
                        <tr>

                            <td>
                                ${escapeHtml(
                                    applicantName ||
                                    "—"
                                )}
                            </td>

                            <td>
                                <div class="interview-meta">

                                    <strong>
                                        ${escapeHtml(
                                            job.job_title ||
                                            "—"
                                        )}
                                    </strong>

                                    <span>
                                        ${escapeHtml(
                                            job.job_code ||
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

                                ${statusBadge(
                                    interview.status
                                )}

                                ${
                                    hasEvaluation
                                        ? `
                                            <div class="interview-score">
                                                ${escapeHtml(
                                                    interview.score
                                                )}/100
                                            </div>
                                        `
                                        : ""
                                }

                            </td>

                            <td>

                                <div class="table-actions">

                                    <button
                                        type="button"
                                        class="table-action"
                                        data-action="view"
                                        data-id="${escapeHtml(
                                            interview.interview_id
                                        )}"
                                    >
                                        View
                                    </button>

                                    ${
                                        inactive
                                            ? ""

                                            : `
                                                <button
                                                    type="button"
                                                    class="table-action"
                                                    data-action="edit"
                                                    data-id="${escapeHtml(
                                                        interview.interview_id
                                                    )}"
                                                >
                                                    Reschedule
                                                </button>

                                                <button
                                                    type="button"
                                                    class="table-action"
                                                    data-action="evaluate"
                                                    data-id="${escapeHtml(
                                                        interview.interview_id
                                                    )}"
                                                >
                                                    Evaluate
                                                </button>

                                                <button
                                                    type="button"
                                                    class="table-action danger"
                                                    data-action="cancel"
                                                    data-id="${escapeHtml(
                                                        interview.interview_id
                                                    )}"
                                                >
                                                    Cancel
                                                </button>
                                            `
                                    }

                                </div>

                            </td>

                        </tr>
                    `;
                }
            )
            .join("");
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

    const interview =
        interviews.find(
            item =>
                String(
                    item.interview_id
                ) ===
                String(id)
        );

    if (!interview) {
        showToast(
            "Interview record not found.",
            "error"
        );

        return;
    }

    if (action === "view") {
        openViewInterview(
            interview
        );

        return;
    }

    if (action === "edit") {
        openEditInterviewForm(
            interview
        );

        return;
    }

    if (action === "evaluate") {
        openInterviewEvaluation(
            interview
        );

        return;
    }

    if (action === "cancel") {
        cancelInterview(
            id
        );
    }
}


/* =========================================================
   SUBMIT INTERVIEW
   ========================================================= */

async function submitInterview(
    event
) {
    event.preventDefault();

    clearFormError();

    const button =
        document.getElementById(
            "saveInterviewButton"
        );

    const applicationSelect =
        document.getElementById(
            "interviewApplication"
        );

    const dateInput =
        document.getElementById(
            "interviewDate"
        );

    const timeInput =
        document.getElementById(
            "interviewTime"
        );

    const interviewerInput =
        document.getElementById(
            "interviewer"
        );

    const venueInput =
        document.getElementById(
            "interviewVenue"
        );

    const applicationId =
        String(
            applicationSelect?.value ||
                ""
        ).trim();

    const interviewDate =
        String(
            dateInput?.value ||
                ""
        ).trim();

    const interviewTime =
        String(
            timeInput?.value ||
                ""
        ).trim();

    const interviewer =
        String(
            interviewerInput?.value ||
                ""
        ).trim();

    const venue =
        String(
            venueInput?.value ||
                ""
        ).trim();

    const error =
        message => {
            setFormError(
                message
            );

            showToast(
                message,
                "error"
            );
        };

    if (!applicationId) {
        error(
            "Please select a qualified application."
        );

        return;
    }

    if (!interviewDate) {
        error(
            "Please select an interview date."
        );

        return;
    }

    if (!interviewTime) {
        error(
            "Please select an interview time."
        );

        return;
    }

    if (!interviewer) {
        error(
            "Please enter the interviewer."
        );

        return;
    }

    if (!venue) {
        error(
            "Please enter the interview venue."
        );

        return;
    }

    if (!window.rmsSupabase) {
        error(
            "Supabase client is not initialized. Please refresh the page."
        );

        return;
    }

    const application =
        applications.find(
            item =>
                String(
                    item.application_id
                ) ===
                applicationId
        );

    if (!application) {
        error(
            "The selected application could not be found."
        );

        return;
    }

    const applicationStatus =
        normalizeStatus(
            application.status
        );

    if (
        editingInterviewId === null &&
        applicationStatus !==
            "QUALIFIED"
    ) {
        error(
            "Interview cannot be scheduled because the application is not qualified."
        );

        return;
    }

    if (
        editingInterviewId !== null &&
        ![
            "QUALIFIED",
            "FOR INTERVIEW"
        ].includes(
            applicationStatus
        )
    ) {
        error(
            "This application is no longer eligible for an interview."
        );

        return;
    }

    if (
        !isValidFutureDateTime(
            interviewDate,
            interviewTime
        )
    ) {
        error(
            "Please select a valid future interview date and time."
        );

        return;
    }

    const duplicate =
        interviews.find(
            interview => {
                if (
                    String(
                        interview.interview_id
                    ) ===
                    String(
                        editingInterviewId
                    )
                ) {
                    return false;
                }

                const status =
                    normalizeStatus(
                        interview.status
                    );

                if (
                    status ===
                        "CANCELLED" ||
                    status ===
                        "COMPLETED"
                ) {
                    return false;
                }

                return (
                    String(
                        interview.application_id
                    ) ===
                        applicationId &&
                    String(
                        interview.interview_date
                    ) ===
                        interviewDate &&
                    normalizeTime(
                        interview.interview_time
                    ) ===
                        normalizeTime(
                            interviewTime
                        )
                );
            }
        );

    if (duplicate) {
        error(
            "This applicant already has an interview scheduled at that date and time."
        );

        return;
    }

    const interviewerConflict =
        interviews.find(
            interview => {
                if (
                    String(
                        interview.interview_id
                    ) ===
                    String(
                        editingInterviewId
                    )
                ) {
                    return false;
                }

                const status =
                    normalizeStatus(
                        interview.status
                    );

                if (
                    status ===
                        "CANCELLED" ||
                    status ===
                        "COMPLETED"
                ) {
                    return false;
                }

                return (
                    String(
                        interview.interviewer ||
                            ""
                    )
                        .trim()
                        .toLowerCase() ===
                        interviewer
                            .toLowerCase() &&
                    String(
                        interview.interview_date
                    ) ===
                        interviewDate &&
                    normalizeTime(
                        interview.interview_time
                    ) ===
                        normalizeTime(
                            interviewTime
                        )
                );
            }
        );

    if (interviewerConflict) {
        error(
            "The interviewer already has another interview scheduled at that date and time."
        );

        return;
    }

    const isReschedule =
        editingInterviewId !== null;

    const status =
        isReschedule
            ? "Rescheduled"
            : "Scheduled";

    setButtonLoading(
        button,
        true,
        isReschedule
            ? "Saving..."
            : "Scheduling..."
    );

    try {
        if (!isReschedule) {
            const {
                error: insertError
            } =
                await window.rmsSupabase
                    .from("interviews")
                    .insert({
                        application_id:
                            applicationId,
                        interview_date:
                            interviewDate,
                        interview_time:
                            interviewTime,
                        interviewer,
                        venue,
                        status:
                            "Scheduled"
                    });

            if (insertError) {
                throw insertError;
            }

            await updateApplicationForInterview(
                applicationId
            );

            showToast(
                "Interview scheduled successfully.",
                "success"
            );

        } else {
            const {
                error: updateError
            } =
                await window.rmsSupabase
                    .from("interviews")
                    .update({
                        interview_date:
                            interviewDate,
                        interview_time:
                            interviewTime,
                        interviewer,
                        venue,
                        status
                    })
                    .eq(
                        "interview_id",
                        editingInterviewId
                    );

            if (updateError) {
                throw updateError;
            }

            showToast(
                "Interview rescheduled successfully.",
                "success"
            );
        }

        closeScheduleInterviewForm();

        await loadApplications();
        await loadInterviews();

    } catch (error) {
        console.error(
            "Save interview error:",
            error
        );

        showToast(
            error?.message ||
                error?.details ||
                "Unable to save interview schedule.",
            "error"
        );

    } finally {
        setButtonLoading(
            button,
            false
        );
    }
}


/* =========================================================
   UPDATE APPLICATION STATUS
   ========================================================= */

async function updateApplicationForInterview(
    applicationId
) {
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
            "Interview saved, but application status could not be updated:",
            error
        );
    }
}


/* =========================================================
   CANCEL INTERVIEW
   ========================================================= */

function cancelInterview(
    interviewId
) {
    const interview =
        interviews.find(
            item =>
                String(
                    item.interview_id
                ) ===
                String(
                    interviewId
                )
        );

    if (!interview) {
        showToast(
            "Interview record not found.",
            "error"
        );

        return;
    }

    const status =
        normalizeStatus(
            interview.status
        );

    if (
        status ===
        "CANCELLED"
    ) {
        showToast(
            "This interview is already cancelled.",
            "info"
        );

        return;
    }

    if (
        status ===
        "COMPLETED"
    ) {
        showToast(
            "Completed interviews cannot be cancelled.",
            "error"
        );

        return;
    }

    pendingCancelInterviewId =
        interview.interview_id;

    const application =
        interview.applications ||
        applications.find(
            item =>
                String(
                    item.application_id
                ) ===
                String(
                    interview.application_id
                )
        ) ||
        {};

    const applicant =
        application.applicants ||
        {};

    const job =
        application.job_postings ||
        {};

    const applicantName =
        `${
            applicant.first_name ||
            ""
        } ${
            applicant.last_name ||
            ""
        }`.trim() ||
        "this applicant";

    const positionName =
        job.job_title ||
        "this position";

    const message =
        document.getElementById(
            "cancelConfirmMessage"
        );

    if (message) {
        message.innerHTML = `
            <strong>Cancel this interview?</strong>

            <p>
                You are about to cancel the interview scheduled for
                <strong>
                    ${escapeHtml(
                        applicantName
                    )}
                </strong>
                —
                ${escapeHtml(
                    positionName
                )}.
            </p>

            <p>
                The interview will remain in the system as
                <strong>Cancelled</strong>.
            </p>
        `;
    }

    const confirmButton =
        document.getElementById(
            "confirmCancelInterview"
        );

    if (confirmButton) {
        confirmButton.disabled =
            false;

        confirmButton.textContent =
            "Cancel Interview";
    }

    toggleModal(
        "cancelConfirmModal",
        true
    );
}


function closeCancelConfirm() {
    pendingCancelInterviewId =
        null;

    toggleModal(
        "cancelConfirmModal",
        false
    );
}


async function confirmCancelInterview() {
    const interviewId =
        pendingCancelInterviewId;

    if (!interviewId) {
        closeCancelConfirm();
        return;
    }

    const button =
        document.getElementById(
            "confirmCancelInterview"
        );

    try {
        if (!window.rmsSupabase) {
            throw new Error(
                "Supabase client is not initialized."
            );
        }

        if (button) {
            button.disabled =
                true;

            button.textContent =
                "Cancelling...";
        }

        const {
            error
        } =
            await window.rmsSupabase
                .from("interviews")
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

        closeCancelConfirm();

        await loadApplications();
        await loadInterviews();

        showToast(
            "Interview cancelled successfully.",
            "success"
        );

    } catch (error) {
        console.error(
            "Cancel interview error:",
            error
        );

        showToast(
            error?.message ||
                error?.details ||
                "Unable to cancel interview.",
            "error"
        );

        if (button) {
            button.disabled =
                false;

            button.textContent =
                "Cancel Interview";
        }
    }
}


/* =========================================================
   LAB 14 - INTERVIEW EVALUATION
   ========================================================= */

function openInterviewEvaluation(
    interview
) {
    if (!interview) {
        showToast(
            "Interview record not found.",
            "error"
        );

        return;
    }

    const status =
        normalizeStatus(
            interview.status
        );

    if (
        status ===
        "CANCELLED"
    ) {
        showToast(
            "Cancelled interviews cannot be evaluated.",
            "error"
        );

        return;
    }

    if (
        status ===
        "COMPLETED"
    ) {
        showToast(
            "This interview has already been evaluated.",
            "info"
        );

        return;
    }

    evaluatingInterviewId =
        interview.interview_id;

    const form =
        document.getElementById(
            "interviewEvaluationForm"
        );

    if (form) {
        form.reset();
    }

    /*
     * Use the interview's attached application first.
     * If it is missing, find the matching application
     * from the already loaded applications array.
     */
    const application =
        interview.applications ||
        applications.find(
            item =>
                String(
                    item.application_id
                ) ===
                String(
                    interview.application_id
                )
        ) ||
        {};

    const applicant =
        application.applicants ||
        application.applicant ||
        {};

    const job =
        application.job_postings ||
        application.job_posting ||
        application.job ||
        {};

    /*
     * Build applicant name.
     */
    const applicantName =
        [
            applicant.first_name,
            applicant.last_name
        ]
            .filter(Boolean)
            .join(" ")
            .trim();

    /*
     * Get evaluation modal elements.
     */
    const applicantElement =
        document.getElementById(
            "evaluationApplicant"
        );

    const positionElement =
        document.getElementById(
            "evaluationPosition"
        );

    const dateElement =
        document.getElementById(
            "evaluationDate"
        );

    const timeElement =
        document.getElementById(
            "evaluationTime"
        );

    const interviewerElement =
        document.getElementById(
            "evaluationInterviewer"
        );

    /*
     * Fill applicant.
     */
    if (applicantElement) {
        applicantElement.textContent =
            applicantName ||
            "—";
    }

    /*
     * Fill position.
     */
    if (positionElement) {
        positionElement.textContent =
            job.job_title ||
            application.job_title ||
            "—";
    }

    /*
     * Fill date.
     */
    if (dateElement) {
        dateElement.textContent =
            formatDate(
                interview.interview_date
            );
    }

    /*
     * Fill time.
     */
    if (timeElement) {
        timeElement.textContent =
            formatTime(
                interview.interview_time
            );
    }

    /*
     * Fill interviewer.
     */
    if (interviewerElement) {
        interviewerElement.textContent =
            interview.interviewer ||
            "—";
    }

    clearEvaluationError();

    resetEvaluationTotal();

    /*
     * IMPORTANT:
     * Your HTML uses id="evaluationModal".
     */
    toggleModal(
        "evaluationModal",
        true
    );
}


/* =========================================================
   CLOSE EVALUATION
   ========================================================= */

function closeInterviewEvaluation() {
    evaluatingInterviewId =
        null;

    clearEvaluationError();

    /*
     * IMPORTANT:
     * Your HTML uses id="evaluationModal".
     */
    toggleModal(
        "evaluationModal",
        false
    );
}


/* =========================================================
   GET EVALUATION SCORE
   ========================================================= */

function getEvaluationScore(
    id
) {
    const input =
        document.getElementById(
            id
        );

    if (!input) {
        return 0;
    }

    return Number(
        input.value
    );
}


/* =========================================================
   UPDATE TOTAL
   ========================================================= */

function updateEvaluationTotal() {
    const communication =
        getEvaluationScore(
            "communicationScore"
        );

    const technical =
        getEvaluationScore(
            "technicalKnowledgeScore"
        );

    const problemSolving =
        getEvaluationScore(
            "problemSolvingScore"
        );

    const teamwork =
        getEvaluationScore(
            "teamworkScore"
        );

    const professionalism =
        getEvaluationScore(
            "professionalismScore"
        );

    const scores = [
        communication,
        technical,
        problemSolving,
        teamwork,
        professionalism
    ];

    const total =
        scores.reduce(
            (
                sum,
                value
            ) =>
                sum +
                (
                    Number.isFinite(
                        value
                    )
                        ? value
                        : 0
                ),
            0
        );

    const totalElement =
        document.getElementById(
            "evaluationTotal"
        );

    const resultElement =
        document.getElementById(
            "evaluationResult"
        );

    if (totalElement) {
        totalElement.textContent =
            `${total}/100`;
    }

    const result =
        total >= 75
            ? "PASSED"
            : "FAILED";

    if (resultElement) {
        resultElement.textContent =
            result;
    }

    return {
        total,
        result
    };
}


/* =========================================================
   RESET TOTAL
   ========================================================= */

function resetEvaluationTotal() {
    const totalElement =
        document.getElementById(
            "evaluationTotal"
        );

    const resultElement =
        document.getElementById(
            "evaluationResult"
        );

    if (totalElement) {
        totalElement.textContent =
            "0/100";
    }

    if (resultElement) {
        resultElement.textContent =
            "—";
    }
}


/* =========================================================
   VALIDATE SCORES
   ========================================================= */

function validateEvaluationScores() {
    const rules = [
        [
            "communicationScore",
            "Communication",
            20
        ],

        [
            "technicalKnowledgeScore",
            "Technical Knowledge",
            30
        ],

        [
            "problemSolvingScore",
            "Problem Solving",
            20
        ],

        [
            "teamworkScore",
            "Teamwork",
            15
        ],

        [
            "professionalismScore",
            "Professionalism",
            15
        ]
    ];

    for (
        const [
            id,
            label,
            max
        ] of rules
    ) {
        const input =
            document.getElementById(
                id
            );

        if (
            !input ||
            input.value === ""
        ) {
            return (
                `${label} score is required.`
            );
        }

        const value =
            Number(
                input.value
            );

        if (
            !Number.isFinite(
                value
            )
        ) {
            return (
                `${label} score must be a valid number.`
            );
        }

        if (
            value < 0 ||
            value > max
        ) {
            return (
                `${label} score must be between 0 and ${max}.`
            );
        }

        if (
            !Number.isInteger(
                value
            )
        ) {
            return (
                `${label} score must be a whole number.`
            );
        }
    }

    return "";
}


/* =========================================================
   EVALUATION ERROR
   ========================================================= */

function setEvaluationError(
    message
) {
    const element =
        document.getElementById(
            "evaluationFormError"
        );

    if (element) {
        element.textContent =
            message || "";
    }
}


function clearEvaluationError() {
    setEvaluationError("");
}


/* =========================================================
   SUBMIT EVALUATION
   ========================================================= */

async function submitInterviewEvaluation(
    event
) {
    event.preventDefault();

    if (!evaluatingInterviewId) {
        showToast(
            "Interview record not found.",
            "error"
        );

        return;
    }

    const interview =
        interviews.find(
            item =>
                String(
                    item.interview_id
                ) ===
                String(
                    evaluatingInterviewId
                )
        );

    if (!interview) {
        showToast(
            "Interview record not found.",
            "error"
        );

        return;
    }

    const status =
        normalizeStatus(
            interview.status
        );

    if (
        status ===
        "CANCELLED"
    ) {
        showToast(
            "Cancelled interviews cannot be evaluated.",
            "error"
        );

        return;
    }

    if (
        status ===
        "COMPLETED"
    ) {
        showToast(
            "This interview has already been evaluated.",
            "info"
        );

        return;
    }

    const validationError =
        validateEvaluationScores();

    if (validationError) {
        setEvaluationError(
            validationError
        );

        showToast(
            validationError,
            "error"
        );

        return;
    }

    const {
        total,
        result
    } =
        updateEvaluationTotal();

    const remarks =
        String(
            document.getElementById(
                "evaluationRemarks"
            )?.value ||
                ""
        ).trim();

    if (
        total < 0 ||
        total > 100
    ) {
        showToast(
            "Invalid total evaluation score.",
            "error"
        );

        return;
    }

    const button =
        document.getElementById(
            "saveEvaluationButton"
        );

    setButtonLoading(
        button,
        true,
        "Saving..."
    );

    try {
        if (!window.rmsSupabase) {
            throw new Error(
                "Supabase client is not initialized."
            );
        }

        let evaluatedBy =
            null;

        try {
            const {
                data
            } =
                await window.rmsSupabase
                    .auth
                    .getUser();

            evaluatedBy =
                data?.user
                    ?.user_metadata
                    ?.full_name ||
                data?.user
                    ?.user_metadata
                    ?.name ||
                data?.user
                    ?.email ||
                null;

        } catch (error) {
            console.warn(
                "Unable to determine evaluator:",
                error
            );
        }

        const updateData = {

            communication_score:
                getEvaluationScore(
                    "communicationScore"
                ),

            technical_knowledge_score:
                getEvaluationScore(
                    "technicalKnowledgeScore"
                ),

            problem_solving_score:
                getEvaluationScore(
                    "problemSolvingScore"
                ),

            teamwork_score:
                getEvaluationScore(
                    "teamworkScore"
                ),

            professionalism_score:
                getEvaluationScore(
                    "professionalismScore"
                ),

            score:
                total,

            result:
                result,

            remarks:
                remarks,

            status:
                "Completed",

            evaluated_at:
                new Date()
                    .toISOString()
        };

        if (evaluatedBy) {
            updateData.evaluated_by =
                evaluatedBy;
        }

        const {
            error
        } =
            await window.rmsSupabase
                .from("interviews")
                .update(
                    updateData
                )
                .eq(
                    "interview_id",
                    evaluatingInterviewId
                );

        if (error) {
            throw error;
        }

        showToast(
            "Interview evaluation saved successfully.",
            "success"
        );

        closeInterviewEvaluation();

        await loadApplications();
        await loadInterviews();

    } catch (error) {
        console.error(
            "Interview evaluation error:",
            error
        );

        showToast(
            error?.message ||
                error?.details ||
                "Unable to save interview evaluation.",
            "error"
        );

    } finally {
        setButtonLoading(
            button,
            false
        );
    }
}


/* =========================================================
   EVALUATION DISPLAY
   ========================================================= */

function renderEvaluationCriteria(
    interview
) {
    const hasScores = [
        interview.communication_score,
        interview.technical_knowledge_score,
        interview.problem_solving_score,
        interview.teamwork_score,
        interview.professionalism_score
    ].some(
        value =>
            value !== null &&
            value !== undefined &&
            value !== ""
    );

    if (!hasScores) {
        return "";
    }

    const criteria = [
        [
            "Communication",
            interview.communication_score,
            20
        ],

        [
            "Technical Knowledge",
            interview.technical_knowledge_score,
            30
        ],

        [
            "Problem Solving",
            interview.problem_solving_score,
            20
        ],

        [
            "Teamwork",
            interview.teamwork_score,
            15
        ],

        [
            "Professionalism",
            interview.professionalism_score,
            15
        ]
    ];

    return `
        <div
            class="interview-detail-item
                   interview-detail-item-full"
        >

            <small>
                Evaluation Criteria
            </small>

            <div
                class="evaluation-view-grid"
            >

                ${
                    criteria
                        .map(
                            ([
                                label,
                                score,
                                max
                            ]) => `
                                <div
                                    class="evaluation-view-item"
                                >

                                    <span>
                                        ${escapeHtml(
                                            label
                                        )}
                                    </span>

                                    <strong>
                                        ${escapeHtml(
                                            score ??
                                            0
                                        )}/${max}
                                    </strong>

                                </div>
                            `
                        )
                        .join("")
                }

            </div>

        </div>
    `;
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
        interview.applications ||
        applications.find(
            item =>
                String(
                    item.application_id
                ) ===
                String(
                    interview.application_id
                )
        ) ||
        {};

    const applicant =
        application.applicants ||
        application.applicant ||
        {};

    const job =
        application.job_postings ||
        application.job_posting ||
        application.job ||
        {};

    const applicantName =
        `${
            applicant.first_name ||
            ""
        } ${
            applicant.last_name ||
            ""
        }`.trim();

    body.innerHTML = `
        <div
            class="interview-details-grid"
        >

            <div
                class="interview-detail-item"
            >
                <small>
                    Applicant
                </small>

                <div>
                    ${escapeHtml(
                        applicantName ||
                        "—"
                    )}
                </div>
            </div>


            <div
                class="interview-detail-item"
            >
                <small>
                    Applicant No.
                </small>

                <div>
                    ${escapeHtml(
                        applicant.applicant_no ||
                        "—"
                    )}
                </div>
            </div>


            <div
                class="interview-detail-item"
            >
                <small>
                    Position
                </small>

                <div>
                    ${escapeHtml(
                        job.job_title ||
                        "—"
                    )}
                </div>
            </div>


            <div
                class="interview-detail-item"
            >
                <small>
                    Job Code
                </small>

                <div>
                    ${escapeHtml(
                        job.job_code ||
                        "—"
                    )}
                </div>
            </div>


            <div
                class="interview-detail-item"
            >
                <small>
                    Interview Date
                </small>

                <div>
                    ${formatDate(
                        interview.interview_date
                    )}
                </div>
            </div>


            <div
                class="interview-detail-item"
            >
                <small>
                    Interview Time
                </small>

                <div>
                    ${formatTime(
                        interview.interview_time
                    )}
                </div>
            </div>


            <div
                class="interview-detail-item"
            >
                <small>
                    Interviewer
                </small>

                <div>
                    ${escapeHtml(
                        interview.interviewer ||
                        "—"
                    )}
                </div>
            </div>


            <div
                class="interview-detail-item"
            >
                <small>
                    Venue
                </small>

                <div>
                    ${escapeHtml(
                        interview.venue ||
                        "—"
                    )}
                </div>
            </div>


            <div
                class="interview-detail-item"
            >
                <small>
                    Status
                </small>

                <div>
                    ${statusBadge(
                        interview.status
                    )}
                </div>
            </div>


            ${
                interview.score !==
                    null &&
                interview.score !==
                    undefined &&
                interview.score !==
                    ""
                    ? `
                        <div
                            class="interview-detail-item"
                        >

                            <small>
                                Interview Score
                            </small>

                            <div>
                                ${escapeHtml(
                                    interview.score
                                )}/100
                            </div>

                        </div>
                    `
                    : ""
            }


            ${
                interview.result
                    ? `
                        <div
                            class="interview-detail-item"
                        >

                            <small>
                                Result
                            </small>

                            <div>
                                ${escapeHtml(
                                    interview.result
                                )}
                            </div>

                        </div>
                    `
                    : ""
            }


            ${
                interview.evaluated_by
                    ? `
                        <div
                            class="interview-detail-item"
                        >

                            <small>
                                Evaluated By
                            </small>

                            <div>
                                ${escapeHtml(
                                    interview.evaluated_by
                                )}
                            </div>

                        </div>
                    `
                    : ""
            }


            ${
                interview.evaluated_at
                    ? `
                        <div
                            class="interview-detail-item"
                        >

                            <small>
                                Evaluated At
                            </small>

                            <div>
                                ${formatDateTime(
                                    interview.evaluated_at
                                )}
                            </div>

                        </div>
                    `
                    : ""
            }


            ${
                interview.remarks
                    ? `
                        <div
                            class="interview-detail-item
                                   interview-detail-item-full"
                        >

                            <small>
                                Remarks
                            </small>

                            <div>
                                ${escapeHtml(
                                    interview.remarks
                                )}
                            </div>

                        </div>
                    `
                    : ""
            }

        </div>

        ${renderEvaluationCriteria(
            interview
        )}
    `;

    toggleModal(
        "viewInterviewModal",
        true
    );
}


function closeViewInterview() {
    toggleModal(
        "viewInterviewModal",
        false
    );
}


/* =========================================================
   DATE/TIME VALIDATION
   ========================================================= */

function isValidFutureDateTime(
    date,
    time
) {
    if (!date || !time) {
        return false;
    }

    const normalizedTime =
        normalizeTime(
            time
        );

    const selected =
        new Date(
            `${date}T${normalizedTime}:00`
        );

    if (
        Number.isNaN(
            selected.getTime()
        )
    ) {
        return false;
    }

    return (
        selected.getTime() >
        Date.now()
    );
}


function setMinimumInterviewDate() {
    const input =
        document.getElementById(
            "interviewDate"
        );

    if (input) {
        input.min =
            getTodayLocalDate();
    }
}


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
   FORM ERROR
   ========================================================= */

function setFormError(
    message
) {
    const element =
        document.getElementById(
            "interviewFormError"
        );

    if (element) {
        element.textContent =
            message || "";
    }
}


function clearFormError() {
    setFormError("");
}


/* =========================================================
   FORMATTING
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
        return String(
            value
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


function formatDateTime(
    value
) {
    if (!value) {
        return "—";
    }

    const date =
        new Date(
            value
        );

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return String(
            value
        );
    }

    return date.toLocaleString(
        "en-US",
        {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit"
        }
    );
}


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

    const [
        hoursText,
        minutesText = "00"
    ] =
        normalized.split(
            ":"
        );

    const hour =
        Number(
            hoursText
        );

    if (
        Number.isNaN(
            hour
        )
    ) {
        return String(
            value
        );
    }

    const suffix =
        hour >= 12
            ? "PM"
            : "AM";

    const displayHour =
        hour % 12 ||
        12;

    return `${displayHour}:${minutesText} ${suffix}`;
}


function normalizeTime(
    value
) {
    if (!value) {
        return "";
    }

    return String(
        value
    )
        .trim()
        .substring(
            0,
            5
        );
}


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
            <span
                class="interview-status-scheduled"
            >
                —
            </span>
        `;
    }

    const normalized =
        normalizeStatus(
            status
        );

    let className =
        "interview-status-scheduled";

    if (
        normalized ===
        "CANCELLED"
    ) {
        className =
            "interview-status-cancelled";

    } else if (
        normalized ===
        "COMPLETED"
    ) {
        className =
            "interview-status-completed";
    }

    return `
        <span
            class="${className}"
        >
            ${escapeHtml(
                status
            )}
        </span>
    `;
}


/* =========================================================
   UI HELPERS
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
        String(
            !open
        )
    );
}


function setButtonLoading(
    button,
    loading,
    text = "Processing..."
) {
    if (!button) {
        return;
    }

    if (loading) {
        if (
            !button.dataset
                .originalText
        ) {
            button.dataset
                .originalText =
                button.innerHTML;
        }

        button.disabled =
            true;

        button.innerHTML = `
            <span
                class="button-spinner"
            ></span>

            ${escapeHtml(
                text
            )}
        `;

        return;
    }

    button.disabled =
        false;

    if (
        button.dataset
            .originalText
    ) {
        button.innerHTML =
            button.dataset
                .originalText;

        delete button.dataset
            .originalText;
    }
}


function escapeHtml(
    value
) {
    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }

    return String(
        value
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
            "toast-root";

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
        <div
            class="toast-message"
        >
            ${escapeHtml(
                message
            )}
        </div>
    `;

    container.appendChild(
        toast
    );

    requestAnimationFrame(
        () => {
            toast.classList.add(
                "toast-show"
            );
        }
    );

    setTimeout(
        () => {
            toast.classList.remove(
                "toast-show"
            );

            setTimeout(
                () =>
                    toast.remove(),
                250
            );
        },
        3000
    );
}