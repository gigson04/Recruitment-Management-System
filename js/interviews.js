/* =========================================================
   RECRUITMENT MANAGEMENT SYSTEM - LAB 13
   INTERVIEW SCHEDULING
   Clean replacement for js/interviews.js
   ========================================================= */

let interviews = [];
let applications = [];
let editingInterviewId = null;
let pendingCancelInterviewId = null;

const $ = id => document.getElementById(id);

/* -------------------- INITIALIZE -------------------- */

document.addEventListener("DOMContentLoaded", initInterviews);

async function initInterviews() {
    if (typeof renderShell === "function") {
        renderShell({
            active: "Interviews"
        });
    }

    bindInterviewEvents();
    addRescheduledFilterOption();

    try {
        const session =
            typeof requireAuth === "function"
                ? await requireAuth()
                : true;

        if (!session) {
            return;
        }

        if (typeof loadUserProfile === "function") {
            loadUserProfile().catch(console.warn);
        }

        await loadApplications();
        await loadInterviews();

    } catch (error) {
        console.error(
            "Interview initialization error:",
            error
        );

        showToast(
            error?.message ||
            "Unable to load interview page.",
            "error"
        );
    }
}

/* -------------------- EVENTS -------------------- */

function bindInterviewEvents() {

    $("openInterviewModal")
        ?.addEventListener(
            "click",
            openInterviewModalForm
        );

    $("closeInterviewModal")
        ?.addEventListener(
            "click",
            closeScheduleInterviewForm
        );

    $("cancelInterviewModal")
        ?.addEventListener(
            "click",
            closeScheduleInterviewForm
        );

    $("interviewForm")
        ?.addEventListener(
            "submit",
            submitInterview
        );

    $("interviewSearch")
        ?.addEventListener(
            "input",
            renderInterviews
        );

    $("interviewStatusFilter")
        ?.addEventListener(
            "change",
            renderInterviews
        );

    $("interviewApplication")
        ?.addEventListener(
            "change",
            handleApplicationSelection
        );

    $("closeViewInterview")
        ?.addEventListener(
            "click",
            closeViewInterview
        );

    $("closeViewInterviewBottom")
        ?.addEventListener(
            "click",
            closeViewInterview
        );

    $("closeCancelConfirm")
        ?.addEventListener(
            "click",
            closeCancelConfirm
        );

    $("cancelCancelConfirm")
        ?.addEventListener(
            "click",
            closeCancelConfirm
        );

    $("confirmCancelInterview")
        ?.addEventListener(
            "click",
            confirmCancelInterview
        );

    $("interviewsTable")
        ?.addEventListener(
            "click",
            handleInterviewAction
        );

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

    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Escape"
            ) {

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

        }
    );
}

function addRescheduledFilterOption() {

    const filter =
        $("interviewStatusFilter");

    if (!filter) {
        return;
    }

    if (
        filter.querySelector(
            'option[value="Rescheduled"]'
        )
    ) {
        return;
    }

    const option =
        document.createElement(
            "option"
        );

    option.value =
        "Rescheduled";

    option.textContent =
        "Rescheduled";

    filter.appendChild(
        option
    );
}

/* -------------------- APPLICATIONS -------------------- */

async function loadApplications() {

    const select =
        $("interviewApplication");

    if (!select) {
        return;
    }

    if (!window.rmsSupabase) {

        throw new Error(
            "Supabase client is not initialized."
        );

    }

    try {

        const {
            data: rows,
            error
        } =
            await window.rmsSupabase
                .from("applications")
                .select(
                    "application_id, applicant_id, job_id, application_date, status, created_at"
                )
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

        if (error) {
            throw error;
        }

        const apps =
            Array.isArray(rows)
                ? rows
                : [];

        const applicantIds =
            [
                ...new Set(
                    apps
                        .map(
                            item =>
                                item.applicant_id
                        )
                        .filter(Boolean)
                )
            ];

        const jobIds =
            [
                ...new Set(
                    apps
                        .map(
                            item =>
                                item.job_id
                        )
                        .filter(Boolean)
                )
            ];

        const [
            applicantResult,
            jobResult
        ] =
            await Promise.all([

                applicantIds.length
                    ? window.rmsSupabase
                        .from("applicants")
                        .select(
                            "applicant_id, applicant_no, first_name, last_name, email"
                        )
                        .in(
                            "applicant_id",
                            applicantIds
                        )
                    : Promise.resolve({
                        data: [],
                        error: null
                    }),

                jobIds.length
                    ? window.rmsSupabase
                        .from("job_postings")
                        .select(
                            "job_id, job_code, job_title, department, closing_date"
                        )
                        .in(
                            "job_id",
                            jobIds
                        )
                    : Promise.resolve({
                        data: [],
                        error: null
                    })

            ]);

        if (
            applicantResult.error
        ) {
            throw applicantResult.error;
        }

        if (
            jobResult.error
        ) {
            throw jobResult.error;
        }

        const applicantMap =
            new Map(
                (
                    applicantResult.data ||
                    []
                ).map(
                    item => [
                        String(
                            item.applicant_id
                        ),
                        item
                    ]
                )
            );

        const jobMap =
            new Map(
                (
                    jobResult.data ||
                    []
                ).map(
                    item => [
                        String(
                            item.job_id
                        ),
                        item
                    ]
                )
            );

        applications =
            apps.map(
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

        throw error;
    }
}

function renderApplicationOptions(
    selectedValue = ""
) {

    const select =
        $("interviewApplication");

    if (!select) {
        return;
    }

    select.innerHTML = `
        <option value="">
            Select qualified application
        </option>
    `;

    applications.forEach(
        application => {

            const status =
                normalizeStatus(
                    application.status
                );

            if (
                status !== "QUALIFIED" &&
                status !== "FOR INTERVIEW"
            ) {
                return;
            }

            const applicant =
                application.applicants ||
                {};

            const job =
                application.job_postings ||
                {};

            const applicantName =
                `${applicant.first_name || ""} ${
                    applicant.last_name || ""
                }`
                    .trim() ||
                "Unknown Applicant";

            const jobTitle =
                job.job_title ||
                "Unknown Position";

            const jobCode =
                job.job_code
                    ? ` (${job.job_code})`
                    : "";

            const option =
                document.createElement(
                    "option"
                );

            option.value =
                application.application_id;

            option.textContent =
                `${applicantName} — ${
                    jobTitle
                }${jobCode}`;

            select.appendChild(
                option
            );

        }
    );

    if (selectedValue) {

        select.value =
            selectedValue;

    }
}

function handleApplicationSelection() {

    const select =
        $("interviewApplication");

    const info =
        $("selectedInterviewApplication");

    if (!select) {
        return;
    }

    const application =
        applications.find(
            item =>
                String(
                    item.application_id
                ) ===
                String(
                    select.value
                )
        );

    if (!application) {

        if ($("interviewApplicant")) {
            $("interviewApplicant")
                .textContent =
                "—";
        }

        if ($("interviewPosition")) {
            $("interviewPosition")
                .textContent =
                "—";
        }

        if (info) {
            info.hidden = true;
        }

        return;
    }

    const applicant =
        application.applicants ||
        {};

    const job =
        application.job_postings ||
        {};

    if ($("interviewApplicant")) {

        $("interviewApplicant")
            .textContent =
            `${applicant.first_name || ""} ${
                applicant.last_name || ""
            }`
                .trim() ||
            "—";

    }

    if ($("interviewPosition")) {

        $("interviewPosition")
            .textContent =
            job.job_title ||
            "—";

    }

    if (info) {
        info.hidden = false;
    }
}

/* -------------------- INTERVIEWS -------------------- */

async function loadInterviews() {

    const table =
        $("interviewsTable");

    if (!table) {
        return;
    }

    if (!window.rmsSupabase) {

        throw new Error(
            "Supabase client is not initialized."
        );

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

        const {
            data,
            error
        } =
            await window.rmsSupabase
                .from("interviews")
                .select("*")
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

        const rows =
            Array.isArray(data)
                ? data
                : [];

        interviews =
            rows.map(
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

        updateCounters();

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

        throw error;
    }
}

function renderInterviews() {

    const table =
        $("interviewsTable");

    if (!table) {
        return;
    }

    updateCounters();

    const search =
        (
            $("interviewSearch")
                ?.value ||
            ""
        )
            .trim()
            .toLowerCase();

    const statusFilter =
        normalizeStatus(
            $("interviewStatusFilter")
                ?.value ||
            ""
        );

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
                    `${applicant.first_name || ""} ${
                        applicant.last_name || ""
                    }`
                        .trim()
                        .toLowerCase();

                const applicantNo =
                    String(
                        applicant.applicant_no ||
                        ""
                    ).toLowerCase();

                const position =
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

                const text =
                    [
                        applicantName,
                        applicantNo,
                        position,
                        jobCode,
                        interviewer,
                        venue
                    ].join(" ");

                const matchesSearch =
                    !search ||
                    text.includes(
                        search
                    );

                const matchesStatus =
                    !statusFilter ||
                    status ===
                    statusFilter;

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

                    const applicantName =
                        `${applicant.first_name || ""} ${
                            applicant.last_name || ""
                        }`
                            .trim() ||
                        "—";

                    const cancelled =
                        normalizeStatus(
                            interview.status
                        ) ===
                        "CANCELLED";

                    return `

                        <tr>

                            <td>
                                ${escapeHtml(
                                    applicantName
                                )}
                            </td>

                            <td>

                                <div
                                    class="application-meta"
                                >

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
                            </td>

                            <td>

                                <div
                                    class="table-actions"
                                >

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
                                        cancelled
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
                                            `
                                    }

                                    ${
                                        cancelled
                                            ? ""
                                            : `
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

function updateCounters() {

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

    if ($("totalInterviews")) {

        $("totalInterviews")
            .textContent =
            total;

    }

    if ($("scheduledInterviews")) {

        $("scheduledInterviews")
            .textContent =
            scheduled;

    }

    if ($("cancelledInterviews")) {

        $("cancelledInterviews")
            .textContent =
            cancelled;

    }
}

/* -------------------- SCHEDULE / RESCHEDULE -------------------- */

async function openInterviewModalForm() {

    editingInterviewId =
        null;

    const form =
        $("interviewForm");

    if (!form) {
        return;
    }

    form.reset();

    if ($("interviewModalTitle")) {

        $("interviewModalTitle")
            .textContent =
            "Schedule Interview";

    }

    if ($("saveInterviewButton")) {

        $("saveInterviewButton")
            .textContent =
            "Schedule Interview";

    }

    const select =
        $("interviewApplication");

    if (select) {

        select.disabled =
            false;

        await loadApplications();

    }

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

    editingInterviewId =
        interview.interview_id;

    const form =
        $("interviewForm");

    if (!form) {
        return;
    }

    form.reset();

    if ($("interviewModalTitle")) {

        $("interviewModalTitle")
            .textContent =
            "Reschedule Interview";

    }

    if ($("saveInterviewButton")) {

        $("saveInterviewButton")
            .textContent =
            "Save Changes";

    }

    renderApplicationOptions(
        interview.application_id
    );

    if ($("interviewApplication")) {

        $("interviewApplication")
            .value =
            interview.application_id;

        $("interviewApplication")
            .disabled =
            true;

    }

    if ($("interviewDate")) {

        $("interviewDate")
            .value =
            interview.interview_date ||
            "";

    }

    if ($("interviewTime")) {

        $("interviewTime")
            .value =
            normalizeTime(
                interview.interview_time
            );

    }

    if ($("interviewer")) {

        $("interviewer")
            .value =
            interview.interviewer ||
            "";

    }

    if ($("interviewVenue")) {

        $("interviewVenue")
            .value =
            interview.venue ||
            "";

    }

    if ($("interviewStatus")) {

        $("interviewStatus")
            .value =
            "Scheduled";

    }

    handleApplicationSelection();

    setMinimumInterviewDate();

    toggleModal(
        "interviewModal",
        true
    );
}

function closeScheduleInterviewForm() {

    editingInterviewId =
        null;

    if ($("interviewApplication")) {

        $("interviewApplication")
            .disabled =
            false;

    }

    toggleModal(
        "interviewModal",
        false
    );
}

async function submitInterview(
    event
) {

    event.preventDefault();

    const applicationId =
        String(
            $("interviewApplication")
                ?.value ||
            ""
        ).trim();

    const date =
        String(
            $("interviewDate")
                ?.value ||
            ""
        ).trim();

    const time =
        String(
            $("interviewTime")
                ?.value ||
            ""
        ).trim();

    const interviewer =
        String(
            $("interviewer")
                ?.value ||
            ""
        ).trim();

    const venue =
        String(
            $("interviewVenue")
                ?.value ||
            ""
        ).trim();

    if (!applicationId) {

        return showToast(
            "Please select a qualified application.",
            "error"
        );

    }

    if (!date) {

        return showToast(
            "Please select an interview date.",
            "error"
        );

    }

    if (!time) {

        return showToast(
            "Please select an interview time.",
            "error"
        );

    }

    if (!interviewer) {

        return showToast(
            "Please enter the interviewer.",
            "error"
        );

    }

    if (!venue) {

        return showToast(
            "Please enter the interview venue.",
            "error"
        );

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

        return showToast(
            "The selected application could not be found.",
            "error"
        );

    }

    const appStatus =
        normalizeStatus(
            application.status
        );

    if (
        editingInterviewId === null &&
        appStatus !== "QUALIFIED" &&
        appStatus !== "FOR INTERVIEW"
    ) {

        return showToast(
            "Interview cannot be scheduled because the application is not qualified.",
            "error"
        );

    }

    if (
        !isValidFutureDateTime(
            date,
            time,
            editingInterviewId
        )
    ) {

        return showToast(
            "Please select a valid future interview date and time.",
            "error"
        );

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

                if (
                    normalizeStatus(
                        interview.status
                    ) ===
                    "CANCELLED"
                ) {
                    return false;
                }

                return (
                    String(
                        interview.application_id
                    ) ===
                    applicationId &&

                    interview.interview_date ===
                    date &&

                    normalizeTime(
                        interview.interview_time
                    ) ===
                    normalizeTime(
                        time
                    )
                );

            }
        );

    if (duplicate) {

        return showToast(
            "This applicant already has an interview scheduled at that date and time.",
            "error"
        );

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

                if (
                    normalizeStatus(
                        interview.status
                    ) ===
                    "CANCELLED"
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

                    interview.interview_date ===
                    date &&

                    normalizeTime(
                        interview.interview_time
                    ) ===
                    normalizeTime(
                        time
                    )

                );

            }
        );

    if (
        interviewerConflict
    ) {

        return showToast(
            "The interviewer already has another interview scheduled at that date and time.",
            "error"
        );

    }

    if (!window.rmsSupabase) {

        return showToast(
            "Supabase client is not initialized. Please refresh the page.",
            "error"
        );

    }

    const button =
        $("saveInterviewButton");

    const originalText =
        button?.textContent ||
        "Schedule Interview";

    if (button) {

        button.disabled =
            true;

        button.textContent =
            editingInterviewId === null
                ? "Scheduling..."
                : "Saving...";

    }

    try {

        if (
            editingInterviewId === null
        ) {

            const {
                error
            } =
                await window.rmsSupabase
                    .from("interviews")
                    .insert({

                        application_id:
                            applicationId,

                        interview_date:
                            date,

                        interview_time:
                            time,

                        interviewer:
                            interviewer,

                        venue:
                            venue,

                        status:
                            "Scheduled"

                    });

            if (error) {
                throw error;
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
                error
            } =
                await window.rmsSupabase
                    .from("interviews")
                    .update({

                        application_id:
                            applicationId,

                        interview_date:
                            date,

                        interview_time:
                            time,

                        interviewer:
                            interviewer,

                        venue:
                            venue,

                        status:
                            "Rescheduled"

                    })
                    .eq(
                        "interview_id",
                        editingInterviewId
                    );

            if (error) {
                throw error;
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
            "Interview save error:",
            error
        );

        showToast(
            error?.message ||
            "Unable to save interview schedule.",
            "error"
        );

    } finally {

        if (button) {

            button.disabled =
                false;

            button.textContent =
                originalText;

        }

    }
}

async function updateApplicationForInterview(
    applicationId
) {

    if (!window.rmsSupabase) {
        return;
    }

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
            "Application status update failed:",
            error
        );

    }
}

/* -------------------- ACTIONS -------------------- */

function handleInterviewAction(
    event
) {

    const button =
        event.target.closest(
            "button[data-action]"
        );

    if (!button) {
        return;
    }

    const interview =
        interviews.find(
            item =>
                String(
                    item.interview_id
                ) ===
                String(
                    button.dataset.id
                )
        );

    if (!interview) {

        return showToast(
            "Interview record not found.",
            "error"
        );

    }

    const action =
        button.dataset.action;

    if (
        action === "view"
    ) {

        openViewInterview(
            interview
        );

    }

    if (
        action === "edit"
    ) {

        openEditInterviewForm(
            interview
        );

    }

    if (
        action === "cancel"
    ) {

        cancelInterview(
            interview.interview_id
        );

    }
}

/* -------------------- CANCEL -------------------- */

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

        return showToast(
            "Interview record not found.",
            "error"
        );

    }

    pendingCancelInterviewId =
        interviewId;

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
        `${applicant.first_name || ""} ${
            applicant.last_name || ""
        }`
            .trim() ||
        "this applicant";

    if ($("cancelConfirmMessage")) {

        $("cancelConfirmMessage")
            .innerHTML = `

                <strong>
                    Cancel this interview?
                </strong>

                <br>

                You are about to cancel
                the interview scheduled
                for

                <strong>
                    ${escapeHtml(
                        applicantName
                    )}
                </strong>

                —

                ${escapeHtml(
                    job.job_title ||
                    "this position"
                )}

                <br><br>

                The interview will remain
                in the system as

                <strong>
                    Cancelled
                </strong>.

            `;

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

    if (
        !pendingCancelInterviewId
    ) {

        return closeCancelConfirm();

    }

    if (!window.rmsSupabase) {

        return showToast(
            "Supabase client is not initialized. Please refresh the page.",
            "error"
        );

    }

    const id =
        pendingCancelInterviewId;

    const button =
        $("confirmCancelInterview");

    if (button) {

        button.disabled =
            true;

        button.textContent =
            "Cancelling...";

    }

    try {

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
                    id
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
            "Unable to cancel interview.",
            "error"
        );

    } finally {

        if (button) {

            button.disabled =
                false;

            button.textContent =
                "Cancel Interview";

        }

    }
}

/* -------------------- VIEW -------------------- */

function openViewInterview(
    interview
) {

    const body =
        $("viewInterviewBody");

    if (!body) {
        return;
    }

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
        `${applicant.first_name || ""} ${
            applicant.last_name || ""
        }`
            .trim() ||
        "—";

    body.innerHTML = `

        <div
            class="interview-detail-item"
        >

            <small>
                Applicant
            </small>

            <div>
                ${escapeHtml(
                    applicantName
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

        <div
            class="
                interview-detail-item
                interview-detail-item-full
            "
        >

            <small>
                Remarks
            </small>

            <div>
                ${escapeHtml(
                    interview.remarks ||
                    "—"
                )}
            </div>

        </div>

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

/* -------------------- VALIDATION -------------------- */

function isValidFutureDateTime(
    date,
    time,
    editingId = null
) {

    if (
        !date ||
        !time
    ) {

        return false;

    }

    if (
        editingId !== null
    ) {

        const existing =
            interviews.find(
                item =>
                    String(
                        item.interview_id
                    ) ===
                    String(
                        editingId
                    )
            );

        if (
            existing &&
            existing.interview_date ===
                date &&
            normalizeTime(
                existing.interview_time
            ) ===
                normalizeTime(
                    time
                )
        ) {

            return true;

        }
    }

    const selected =
        new Date(
            `${date}T${normalizeTime(
                time
            )}:00`
        );

    return (
        !Number.isNaN(
            selected.getTime()
        ) &&
        selected.getTime() >
        Date.now()
    );
}

function setMinimumInterviewDate() {

    const input =
        $("interviewDate");

    if (input) {

        input.min =
            getTodayLocalDate();

    }
}

function getTodayLocalDate() {

    const now =
        new Date();

    return `
        ${now.getFullYear()}-${
            String(
                now.getMonth() + 1
            ).padStart(
                2,
                "0"
            )
        }-${
            String(
                now.getDate()
            ).padStart(
                2,
                "0"
            )
        }
    `.replace(/\s+/g, "");
}

/* -------------------- FORMATTERS -------------------- */

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

        return escapeHtml(
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

function formatTime(
    value
) {

    const time =
        normalizeTime(
            value
        );

    if (!time) {
        return "—";
    }

    const parts =
        time.split(":");

    const hour =
        Number(
            parts[0]
        );

    const minute =
        parts[1] ||
        "00";

    if (
        Number.isNaN(
            hour
        )
    ) {

        return escapeHtml(
            value
        );

    }

    return `
        ${hour % 12 || 12}:${minute}
        ${hour >= 12 ? "PM" : "AM"}
    `.trim();
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
        .slice(
            0,
            5
        );
}

function normalizeStatus(
    value
) {

    return String(
        value ||
        ""
    )
        .trim()
        .toUpperCase()
        .replace(
            /_/g,
            " "
        );
}

function statusBadge(
    status
) {

    const normalized =
        normalizeStatus(
            status
        );

    let css =
        "interview-status-scheduled";

    if (
        normalized ===
        "CANCELLED"
    ) {

        css =
            "interview-status-cancelled";

    }

    if (
        normalized ===
        "COMPLETED"
    ) {

        css =
            "interview-status-completed";

    }

    return `
        <span
            class="${css}"
        >
            ${escapeHtml(
                status ||
                "—"
            )}
        </span>
    `;
}

/* -------------------- UI HELPERS -------------------- */

function toggleModal(
    id,
    open
) {

    const modal =
        $(id);

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

function escapeHtml(
    value
) {

    return String(
        value ??
        ""
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

    let root =
        $("toastRoot");

    if (!root) {

        root =
            document.createElement(
                "div"
            );

        root.id =
            "toastRoot";

        root.className =
            "toast-root";

        document.body.appendChild(
            root
        );

    }

    const toast =
        document.createElement(
            "div"
        );

    toast.className =
        `toast toast-${type}`;

    toast.textContent =
        String(
            message ??
            ""
        );

    root.appendChild(
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
                () => {

                    toast.remove();

                },
                250
            );

        },
        3000
    );
}