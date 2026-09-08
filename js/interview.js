/* =========================================================
   RMS — LAB 13
   INTERVIEW SCHEDULING
   ========================================================= */


let interviews = [];

let qualifiedApplications = [];

let editingInterviewId = null;

let pendingCancelInterview = null;


/* =========================================================
   INITIALIZE
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    initInterviews
);


async function initInterviews() {

    try {

        renderShell({
            active: "Interviews"
        });


        const session =
            await requireAuth();


        if (!session) {
            return;
        }


        setupInterviewEvents();


        loadUserProfile()
            .catch(console.warn);


        await Promise.all([
            loadInterviews(),
            loadQualifiedApplications()
        ]);


    } catch (error) {

        console.error(
            "Interview initialization error:",
            error
        );


        showToast(
            "Unable to load interview scheduling.",
            "error"
        );

    }

}


/* =========================================================
   EVENTS
   ========================================================= */

function setupInterviewEvents() {

    document
        .getElementById(
            "openInterviewModal"
        )
        ?.addEventListener(
            "click",
            () => openInterviewForm()
        );


    document
        .getElementById(
            "closeInterviewModal"
        )
        ?.addEventListener(
            "click",
            closeInterviewForm
        );


    document
        .getElementById(
            "cancelInterviewModal"
        )
        ?.addEventListener(
            "click",
            closeInterviewForm
        );


    document
        .getElementById(
            "interviewForm"
        )
        ?.addEventListener(
            "submit",
            saveInterview
        );


    document
        .getElementById(
            "interviewApplication"
        )
        ?.addEventListener(
            "change",
            handleInterviewApplicationChange
        );


    document
        .getElementById(
            "interviewSearch"
        )
        ?.addEventListener(
            "input",
            renderInterviews
        );


    document
        .getElementById(
            "interviewStatusFilter"
        )
        ?.addEventListener(
            "change",
            renderInterviews
        );


    document
        .getElementById(
            "interviewsTable"
        )
        ?.addEventListener(
            "click",
            handleInterviewAction
        );


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


    document
        .getElementById(
            "closeCancelConfirm"
        )
        ?.addEventListener(
            "click",
            closeCancelConfirm
        );


    document
        .getElementById(
            "cancelCancelConfirm"
        )
        ?.addEventListener(
            "click",
            closeCancelConfirm
        );


    document
        .getElementById(
            "confirmCancelInterview"
        )
        ?.addEventListener(
            "click",
            confirmCancelInterview
        );


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

                        toggleInterviewModal(
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
                event.key !==
                "Escape"
            ) {
                return;
            }


            document
                .querySelectorAll(
                    ".modal-backdrop.open"
                )
                .forEach(modal => {

                    toggleInterviewModal(
                        modal.id,
                        false
                    );

                });


            pendingCancelInterview =
                null;

        }
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

        const {
            data,
            error
        } =
            await window.rmsSupabase
                .from(
                    "interviews"
                )
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
                            last_name
                        ),
                        job_postings (
                            job_code,
                            job_title
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

        updateInterviewSummary();


    } catch (error) {

        console.error(
            "Load interviews error:",
            error
        );


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


        showToast(
            "Unable to load interviews.",
            "error"
        );

    }

}


/* =========================================================
   LOAD QUALIFIED APPLICATIONS
   ========================================================= */

async function loadQualifiedApplications() {

    const select =
        document.getElementById(
            "interviewApplication"
        );


    if (!select) {
        return;
    }


    select.innerHTML = `
        <option value="">
            Loading qualified applications...
        </option>
    `;


    try {

        const {
            data,
            error
        } =
            await window.rmsSupabase
                .from(
                    "applications"
                )
                .select(`
                    application_id,
                    applicant_id,
                    job_id,
                    application_date,
                    status,
                    applicants (
                        applicant_no,
                        first_name,
                        last_name
                    ),
                    job_postings (
                        job_code,
                        job_title
                    )
                `)
                .eq(
                    "status",
                    "Qualified"
                )
                .order(
                    "application_date",
                    {
                        ascending: false
                    }
                );


        if (error) {
            throw error;
        }


        qualifiedApplications =
            Array.isArray(data)
                ? data
                : [];


        renderQualifiedApplicationOptions();


    } catch (error) {

        console.error(
            "Load qualified applications error:",
            error
        );


        qualifiedApplications =
            [];


        select.innerHTML = `
            <option value="">
                Unable to load qualified applications
            </option>
        `;


        showToast(
            "Unable to load qualified applications.",
            "error"
        );

    }

}


/* =========================================================
   RENDER QUALIFIED APPLICATIONS
   ========================================================= */

function renderQualifiedApplicationOptions() {

    const select =
        document.getElementById(
            "interviewApplication"
        );


    if (!select) {
        return;
    }


    select.innerHTML = `
        <option value="">
            Select qualified application
        </option>
    `;


    qualifiedApplications.forEach(
        application => {

            const applicant =
                application.applicants;


            const job =
                application.job_postings;


            const option =
                document.createElement(
                    "option"
                );


            const applicantName =
                `${applicant?.first_name || ""} ${applicant?.last_name || ""}`
                    .trim();


            option.value =
                application.application_id;


            option.textContent =
                `${applicant?.applicant_no || "Applicant"} — ${applicantName} — ${job?.job_title || "Position"}`;


            select.appendChild(
                option
            );

        }
    );


    if (
        select.options.length ===
        1
    ) {

        const option =
            document.createElement(
                "option"
            );


        option.value =
            "";


        option.textContent =
            "No qualified applications available";


        option.disabled =
            true;


        select.appendChild(
            option
        );

    }

}


/* =========================================================
   UPDATE SUMMARY
   ========================================================= */

function updateInterviewSummary() {

    const total =
        document.getElementById(
            "totalInterviews"
        );


    const scheduled =
        document.getElementById(
            "scheduledInterviews"
        );


    const cancelled =
        document.getElementById(
            "cancelledInterviews"
        );


    const totalCount =
        interviews.length;


    const scheduledCount =
        interviews.filter(
            interview =>
                interview.status ===
                "Scheduled"
        ).length;


    const cancelledCount =
        interviews.filter(
            interview =>
                interview.status ===
                "Cancelled"
        ).length;


    if (total) {

        total.textContent =
            String(totalCount);

    }


    if (scheduled) {

        scheduled.textContent =
            String(scheduledCount);

    }


    if (cancelled) {

        cancelled.textContent =
            String(cancelledCount);

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
        String(
            document.getElementById(
                "interviewSearch"
            )?.value || ""
        )
            .trim()
            .toLowerCase();


    const statusFilter =
        String(
            document.getElementById(
                "interviewStatusFilter"
            )?.value || ""
        )
            .trim();


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
                    `${applicant?.first_name || ""} ${applicant?.last_name || ""}`
                        .trim();


                const applicantNo =
                    String(
                        applicant?.applicant_no || ""
                    );


                const position =
                    String(
                        job?.job_title || ""
                    );


                const interviewer =
                    String(
                        interview.interviewer || ""
                    );


                const venue =
                    String(
                        interview.venue || ""
                    );


                const matchesSearch =
                    !search ||
                    applicantName
                        .toLowerCase()
                        .includes(search) ||
                    applicantNo
                        .toLowerCase()
                        .includes(search) ||
                    position
                        .toLowerCase()
                        .includes(search) ||
                    interviewer
                        .toLowerCase()
                        .includes(search) ||
                    venue
                        .toLowerCase()
                        .includes(search);


                const matchesStatus =
                    !statusFilter ||
                    interview.status ===
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
                    No interviews found.
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
                        interview.applications;


                    const applicant =
                        application?.applicants;


                    const job =
                        application?.job_postings;


                    const applicantName =
                        `${applicant?.first_name || ""} ${applicant?.last_name || ""}`
                            .trim();


                    return `
                        <tr>

                            <td>

                                <div class="interview-meta">

                                    <strong>
                                        ${escapeInterviewHtml(
                                            applicantName ||
                                            "—"
                                        )}
                                    </strong>

                                    <span>
                                        ${escapeInterviewHtml(
                                            applicant?.applicant_no ||
                                            "—"
                                        )}
                                    </span>

                                </div>

                            </td>


                            <td>

                                <div class="interview-meta">

                                    <strong>
                                        ${escapeInterviewHtml(
                                            job?.job_title ||
                                            "—"
                                        )}
                                    </strong>

                                    <span>
                                        ${escapeInterviewHtml(
                                            job?.job_code ||
                                            ""
                                        )}
                                    </span>

                                </div>

                            </td>


                            <td>
                                ${formatInterviewDate(
                                    interview.interview_date
                                )}
                            </td>


                            <td>
                                ${formatInterviewTime(
                                    interview.interview_time
                                )}
                            </td>


                            <td>
                                ${escapeInterviewHtml(
                                    interview.interviewer ||
                                    "—"
                                )}
                            </td>


                            <td>
                                ${escapeInterviewHtml(
                                    interview.venue ||
                                    "—"
                                )}
                            </td>


                            <td>
                                ${renderInterviewStatus(
                                    interview.status
                                )}
                            </td>


                            <td>

                                <div class="table-actions">

                                    <button
                                        type="button"
                                        class="table-action"
                                        data-action="view"
                                        data-id="${interview.interview_id}"
                                    >
                                        View
                                    </button>


                                    ${
                                        interview.status ===
                                        "Scheduled"
                                            ? `
                                                <button
                                                    type="button"
                                                    class="table-action"
                                                    data-action="edit"
                                                    data-id="${interview.interview_id}"
                                                >
                                                    Edit
                                                </button>

                                                <button
                                                    type="button"
                                                    class="table-action"
                                                    data-action="cancel"
                                                    data-id="${interview.interview_id}"
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

                }
            )
            .join("");

}


/* =========================================================
   STATUS HTML
   ========================================================= */

function renderInterviewStatus(
    status
) {

    const value =
        status ||
        "Scheduled";


    if (
        value ===
        "Cancelled"
    ) {

        return `
            <span class="interview-status-cancelled">
                Cancelled
            </span>
        `;

    }


    if (
        value ===
        "Completed"
    ) {

        return `
            <span class="interview-status-completed">
                Completed
            </span>
        `;

    }


    return `
        <span class="interview-status-scheduled">
            Scheduled
        </span>
    `;

}


/* =========================================================
   OPEN FORM
   ========================================================= */

function openInterviewForm(
    interview = null
) {

    const form =
        document.getElementById(
            "interviewForm"
        );


    if (!form) {
        return;
    }


    form.reset();


    editingInterviewId =
        interview?.interview_id ||
        null;


    const title =
        document.getElementById(
            "interviewModalTitle"
        );


    if (title) {

        title.textContent =
            interview
                ? "Reschedule Interview"
                : "Schedule Interview";

    }


    const button =
        document.getElementById(
            "saveInterviewButton"
        );


    if (button) {

        button.textContent =
            interview
                ? "Save Changes"
                : "Schedule Interview";

    }


    clearInterviewFormError();


    hideSelectedInterviewApplication();


    if (interview) {

        populateEditApplication(
            interview
        );


        setInterviewValue(
            "interviewDate",
            interview.interview_date
        );


        setInterviewValue(
            "interviewTime",
            normalizeTimeForInput(
                interview.interview_time
            )
        );


        setInterviewValue(
            "interviewer",
            interview.interviewer
        );


        setInterviewValue(
            "interviewVenue",
            interview.venue
        );


        setInterviewValue(
            "interviewStatus",
            interview.status
        );


        updateSelectedInterviewApplication(
            interview.application_id
        );

    }


    toggleInterviewModal(
        "interviewModal",
        true
    );

}


/* =========================================================
   POPULATE EDIT APPLICATION
   ========================================================= */

function populateEditApplication(
    interview
) {

    const select =
        document.getElementById(
            "interviewApplication"
        );


    if (!select) {
        return;
    }


    const application =
        interview.applications;


    if (
        !application
    ) {
        return;
    }


    const applicant =
        application.applicants;


    const job =
        application.job_postings;


    const applicantName =
        `${applicant?.first_name || ""} ${applicant?.last_name || ""}`
            .trim();


    let option =
        Array.from(
            select.options
        ).find(
            item =>
                String(
                    item.value
                ) ===
                String(
                    interview.application_id
                )
        );


    if (!option) {

        option =
            document.createElement(
                "option"
            );


        option.value =
            interview.application_id;


        option.textContent =
            `${applicant?.applicant_no || "Applicant"} — ${applicantName} — ${job?.job_title || "Position"}`;


        select.appendChild(
            option
        );

    }


    select.value =
        interview.application_id;

}


/* =========================================================
   CLOSE FORM
   ========================================================= */

function closeInterviewForm() {

    toggleInterviewModal(
        "interviewModal",
        false
    );


    editingInterviewId =
        null;

}


/* =========================================================
   APPLICATION CHANGE
   ========================================================= */

function handleInterviewApplicationChange() {

    const select =
        document.getElementById(
            "interviewApplication"
        );


    const applicationId =
        select?.value;


    if (!applicationId) {

        hideSelectedInterviewApplication();

        return;

    }


    updateSelectedInterviewApplication(
        applicationId
    );

}


/* =========================================================
   APPLICATION INFO
   ========================================================= */

function updateSelectedInterviewApplication(
    applicationId
) {

    const application =
        findQualifiedApplication(
            applicationId
        );


    const info =
        document.getElementById(
            "selectedInterviewApplication"
        );


    if (!application) {

        hideSelectedInterviewApplication();

        return;

    }


    const applicant =
        application.applicants;


    const job =
        application.job_postings;


    const applicantName =
        `${applicant?.first_name || ""} ${applicant?.last_name || ""}`
            .trim();


    const applicantElement =
        document.getElementById(
            "interviewApplicant"
        );


    const positionElement =
        document.getElementById(
            "interviewPosition"
        );


    if (applicantElement) {

        applicantElement.textContent =
            `${applicant?.applicant_no || "—"} — ${applicantName}`;

    }


    if (positionElement) {

        positionElement.textContent =
            job?.job_title ||
            "—";

    }


    if (info) {
        info.hidden = false;
    }

}


/* =========================================================
   FIND APPLICATION
   ========================================================= */

function findQualifiedApplication(
    applicationId
) {

    return (
        qualifiedApplications.find(
            application =>
                String(
                    application.application_id
                ) ===
                String(
                    applicationId
                )
        ) ||
        findApplicationFromInterviews(
            applicationId
        )
    );

}


function findApplicationFromInterviews(
    applicationId
) {

    const interview =
        interviews.find(
            item =>
                String(
                    item.application_id
                ) ===
                String(
                    applicationId
                )
        );


    return interview?.applications ||
        null;

}


/* =========================================================
   HIDE APPLICATION INFO
   ========================================================= */

function hideSelectedInterviewApplication() {

    const info =
        document.getElementById(
            "selectedInterviewApplication"
        );


    if (info) {
        info.hidden = true;
    }


    const applicant =
        document.getElementById(
            "interviewApplicant"
        );


    const position =
        document.getElementById(
            "interviewPosition"
        );


    if (applicant) {
        applicant.textContent =
            "—";
    }


    if (position) {
        position.textContent =
            "—";
    }

}


/* =========================================================
   SAVE INTERVIEW
   ========================================================= */

async function saveInterview(
    event
) {

    event.preventDefault();


    clearInterviewFormError();


    const applicationId =
        getInterviewValue(
            "interviewApplication"
        );


    const interviewDate =
        getInterviewValue(
            "interviewDate"
        );


    const interviewTime =
        getInterviewValue(
            "interviewTime"
        );


    const interviewer =
        getInterviewValue(
            "interviewer"
        );


    const venue =
        getInterviewValue(
            "interviewVenue"
        );


    const status =
        getInterviewValue(
            "interviewStatus"
        );


    if (!applicationId) {

        showInterviewFormError(
            "Please select a qualified application."
        );

        return;

    }


    if (!interviewDate) {

        showInterviewFormError(
            "Please select an interview date."
        );

        return;

    }


    if (!interviewTime) {

        showInterviewFormError(
            "Please select an interview time."
        );

        return;

    }


    if (!interviewer) {

        showInterviewFormError(
            "Please enter the interviewer."
        );

        return;

    }


    if (!venue) {

        showInterviewFormError(
            "Please enter the interview venue."
        );

        return;

    }


    const application =
        findQualifiedApplication(
            applicationId
        );


    if (!application) {

        showInterviewFormError(
            "The selected application could not be found."
        );

        return;

    }


    /*
     * Lab 13 rule:
     * interview is only allowed for a qualified application.
     */

    const applicationStatus =
        String(
            application.status || ""
        )
            .trim()
            .toLowerCase();


    if (
        applicationStatus !==
        "qualified" &&
        !(
            editingInterviewId &&
            applicationStatus ===
            "for interview"
        )
    ) {

        showInterviewFormError(
            "Only qualified applications can be scheduled for interview."
        );

        return;

    }


    /*
     * Date/time validation.
     */

    const scheduleValidation =
        validateInterviewDateTime(
            interviewDate,
            interviewTime
        );


    if (
        !scheduleValidation.valid
    ) {

        showInterviewFormError(
            scheduleValidation.message
        );

        return;

    }


    /*
     * Duplicate schedule validation.
     */

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
                    interview.status !==
                    "Scheduled"
                ) {

                    return false;

                }


                return (
                    String(
                        interview.application_id
                    ) ===
                    String(
                        applicationId
                    ) &&
                    interview.interview_date ===
                    interviewDate &&
                    normalizeTimeForInput(
                        interview.interview_time
                    ) ===
                    interviewTime
                );

            }
        );


    if (duplicate) {

        showInterviewFormError(
            "This application already has an interview scheduled at this date and time."
        );

        return;

    }


    /*
     * Interviewer conflict validation.
     */

    const normalizedInterviewer =
        interviewer
            .trim()
            .toLowerCase();


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
                    interview.status !==
                    "Scheduled"
                ) {

                    return false;

                }


                const existingInterviewer =
                    String(
                        interview.interviewer ||
                        ""
                    )
                        .trim()
                        .toLowerCase();


                return (
                    existingInterviewer ===
                    normalizedInterviewer &&
                    interview.interview_date ===
                    interviewDate &&
                    normalizeTimeForInput(
                        interview.interview_time
                    ) ===
                    interviewTime
                );

            }
        );


    if (
        interviewerConflict
    ) {

        showInterviewFormError(
            `Interviewer ${interviewer} already has an interview scheduled at this date and time.`
        );

        return;

    }


    const button =
        document.getElementById(
            "saveInterviewButton"
        );


    setInterviewButtonLoading(
        button,
        true,
        editingInterviewId
            ? "Saving..."
            : "Scheduling..."
    );


    try {

        const payload = {

            application_id:
                applicationId,

            interview_date:
                interviewDate,

            interview_time:
                interviewTime,

            interviewer:
                interviewer.trim(),

            venue:
                venue.trim(),

            status:
                status ||
                "Scheduled"

        };


        let result;


        if (
            editingInterviewId
        ) {

            result =
                await window.rmsSupabase
                    .from(
                        "interviews"
                    )
                    .update(
                        payload
                    )
                    .eq(
                        "interview_id",
                        editingInterviewId
                    );

        } else {

            result =
                await window.rmsSupabase
                    .from(
                        "interviews"
                    )
                    .insert([
                        payload
                    ]);

        }


        if (result.error) {
            throw result.error;
        }


        /*
         * When the interview is scheduled,
         * move a Qualified application into
         * the next workflow state.
         */

        if (
            !editingInterviewId &&
            applicationStatus ===
            "qualified"
        ) {

            const {
                error:
                    statusError
            } =
                await window.rmsSupabase
                    .from(
                        "applications"
                    )
                    .update({
                        status:
                            "For Interview"
                    })
                    .eq(
                        "application_id",
                        applicationId
                    );


            if (statusError) {
                throw statusError;
            }

        }


        closeInterviewForm();


        showToast(
            editingInterviewId
                ? "Interview rescheduled successfully."
                : "Interview scheduled successfully."
        );


        await Promise.all([
            loadInterviews(),
            loadQualifiedApplications()
        ]);


    } catch (error) {

        console.error(
            "Save interview error:",
            error
        );


        showInterviewFormError(
            getInterviewDatabaseErrorMessage(
                error
            )
        );

    } finally {

        setInterviewButtonLoading(
            button,
            false,
            ""
        );

    }

}


/* =========================================================
   DATE / TIME VALIDATION
   ========================================================= */

function validateInterviewDateTime(
    dateValue,
    timeValue
) {

    const dateTime =
        new Date(
            `${dateValue}T${timeValue}`
        );


    if (
        Number.isNaN(
            dateTime.getTime()
        )
    ) {

        return {
            valid: false,
            message:
                "Please enter a valid interview date and time."
        };

    }


    const now =
        new Date();


    if (
        dateTime <=
        now
    ) {

        return {
            valid: false,
            message:
                "Interview date and time must be in the future."
        };

    }


    return {
        valid: true,
        message: ""
    };

}


/* =========================================================
   TABLE ACTIONS
   ========================================================= */

function handleInterviewAction(
    event
) {

    const button =
        event.target.closest(
            "[data-action]"
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
        return;
    }


    const action =
        button.dataset.action;


    if (
        action ===
        "view"
    ) {

        openViewInterview(
            interview
        );

        return;

    }


    if (
        action ===
        "edit"
    ) {

        openInterviewForm(
            interview
        );

        return;

    }


    if (
        action ===
        "cancel"
    ) {

        openCancelConfirm(
            interview
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


    const title =
        document.getElementById(
            "viewInterviewTitle"
        );


    if (!body || !title) {
        return;
    }


    const application =
        interview.applications;


    const applicant =
        application?.applicants;


    const job =
        application?.job_postings;


    const applicantName =
        `${applicant?.first_name || ""} ${applicant?.last_name || ""}`
            .trim();


    title.textContent =
        job?.job_title ||
        "Interview Details";


    body.innerHTML = `

        <div class="interview-detail-item">

            <small>
                Applicant
            </small>

            <div>
                ${escapeInterviewHtml(
                    applicantName ||
                    "—"
                )}
            </div>

        </div>


        <div class="interview-detail-item">

            <small>
                Applicant No.
            </small>

            <div>
                ${escapeInterviewHtml(
                    applicant?.applicant_no ||
                    "—"
                )}
            </div>

        </div>


        <div class="interview-detail-item">

            <small>
                Position
            </small>

            <div>
                ${escapeInterviewHtml(
                    job?.job_title ||
                    "—"
                )}
            </div>

        </div>


        <div class="interview-detail-item">

            <small>
                Job Code
            </small>

            <div>
                ${escapeInterviewHtml(
                    job?.job_code ||
                    "—"
                )}
            </div>

        </div>


        <div class="interview-detail-item">

            <small>
                Date
            </small>

            <div>
                ${formatInterviewDate(
                    interview.interview_date
                )}
            </div>

        </div>


        <div class="interview-detail-item">

            <small>
                Time
            </small>

            <div>
                ${formatInterviewTime(
                    interview.interview_time
                )}
            </div>

        </div>


        <div class="interview-detail-item">

            <small>
                Interviewer
            </small>

            <div>
                ${escapeInterviewHtml(
                    interview.interviewer ||
                    "—"
                )}
            </div>

        </div>


        <div class="interview-detail-item">

            <small>
                Venue
            </small>

            <div>
                ${escapeInterviewHtml(
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
                ${renderInterviewStatus(
                    interview.status
                )}
            </div>

        </div>


        ${
            interview.result ||
            interview.score !== null ||
            interview.remarks
                ? `
                    <div
                        class="interview-detail-item"
                    >

                        <small>
                            Evaluation Status
                        </small>

                        <div>
                            ${
                                interview.result
                                    ? escapeInterviewHtml(
                                        interview.result
                                    )
                                    : "Not evaluated"
                            }
                        </div>

                    </div>

                    <div
                        class="interview-detail-item"
                    >

                        <small>
                            Score
                        </small>

                        <div>
                            ${
                                interview.score !==
                                null &&
                                interview.score !==
                                undefined
                                    ? `${formatInterviewScore(interview.score)}/100`
                                    : "—"
                            }
                        </div>

                    </div>
                  `
                : ""
        }


        ${
            interview.remarks
                ? `
                    <div
                        class="interview-detail-item interview-detail-item-full"
                    >

                        <small>
                            Remarks
                        </small>

                        <div>
                            ${escapeInterviewHtml(
                                interview.remarks
                            )}
                        </div>

                    </div>
                  `
                : ""
        }

    `;


    toggleInterviewModal(
        "viewInterviewModal",
        true
    );

}


/* =========================================================
   CLOSE VIEW
   ========================================================= */

function closeViewInterview() {

    toggleInterviewModal(
        "viewInterviewModal",
        false
    );

}


/* =========================================================
   CANCEL CONFIRMATION
   ========================================================= */

function openCancelConfirm(
    interview
) {

    pendingCancelInterview =
        interview;


    const message =
        document.getElementById(
            "cancelConfirmMessage"
        );


    const applicant =
        interview.applications?.applicants;


    const job =
        interview.applications?.job_postings;


    const applicantName =
        `${applicant?.first_name || ""} ${applicant?.last_name || ""}`
            .trim();


    if (message) {

        message.innerHTML = `
            Are you sure you want to cancel the interview for
            <strong>
                ${escapeInterviewHtml(
                    applicantName ||
                    "this applicant"
                )}
            </strong>
            for
            <strong>
                ${escapeInterviewHtml(
                    job?.job_title ||
                    "this position"
                )}
            </strong>
            on
            <strong>
                ${formatInterviewDate(
                    interview.interview_date
                )}
                at
                ${formatInterviewTime(
                    interview.interview_time
                )}
            </strong>?
        `;

    }


    toggleInterviewModal(
        "cancelConfirmModal",
        true
    );

}


function closeCancelConfirm() {

    pendingCancelInterview =
        null;


    toggleInterviewModal(
        "cancelConfirmModal",
        false
    );

}


/* =========================================================
   CANCEL INTERVIEW
   ========================================================= */

async function confirmCancelInterview() {

    if (
        !pendingCancelInterview
    ) {
        return;
    }


    const interview =
        pendingCancelInterview;


    const button =
        document.getElementById(
            "confirmCancelInterview"
        );


    if (button) {

        button.disabled =
            true;

        button.dataset.originalText =
            button.textContent;

        button.textContent =
            "Cancelling...";

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
                    interview.interview_id
                );


        if (error) {
            throw error;
        }


        /*
         * Return the application to Qualified
         * so it may be scheduled again.
         */

        if (
            interview.applications?.status ===
            "For Interview"
        ) {

            const {
                error:
                    applicationError
            } =
                await window.rmsSupabase
                    .from(
                        "applications"
                    )
                    .update({
                        status:
                            "Qualified"
                    })
                    .eq(
                        "application_id",
                        interview.application_id
                    );


            if (applicationError) {
                throw applicationError;
            }

        }


        closeCancelConfirm();


        showToast(
            "Interview cancelled successfully."
        );


        await Promise.all([
            loadInterviews(),
            loadQualifiedApplications()
        ]);


    } catch (error) {

        console.error(
            "Cancel interview error:",
            error
        );


        showToast(
            getInterviewDatabaseErrorMessage(
                error
            ),
            "error"
        );

    } finally {

        if (button) {

            button.disabled =
                false;

            button.textContent =
                button.dataset.originalText ||
                "Cancel Interview";

        }

    }

}


/* =========================================================
   FORM ERROR
   ========================================================= */

function showInterviewFormError(
    message
) {

    const error =
        document.getElementById(
            "interviewFormError"
        );


    if (error) {

        error.textContent =
            message;

    }

}


function clearInterviewFormError() {

    const error =
        document.getElementById(
            "interviewFormError"
        );


    if (error) {

        error.textContent =
            "";

    }

}


/* =========================================================
   DATABASE ERROR
   ========================================================= */

function getInterviewDatabaseErrorMessage(
    error
) {

    const message =
        String(
            error?.message ||
            ""
        )
            .toLowerCase();


    if (
        message.includes(
            "interviews"
        ) &&
        message.includes(
            "does not exist"
        )
    ) {

        return "The interviews table does not exist. Run the Lab 13 SQL first.";

    }


    if (
        message.includes(
            "row-level security"
        ) ||
        message.includes(
            "permission"
        )
    ) {

        return "Interview scheduling was blocked by database permissions.";

    }


    return (
        error?.message ||
        "Unable to save interview schedule."
    );

}


/* =========================================================
   MODAL
   ========================================================= */

function toggleInterviewModal(
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
   FORM HELPERS
   ========================================================= */

function getInterviewValue(
    id
) {

    const element =
        document.getElementById(
            id
        );


    return element
        ? element.value.trim()
        : "";

}


function setInterviewValue(
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


    element.value =
        value ?? "";

}


/* =========================================================
   BUTTON LOADING
   ========================================================= */

function setInterviewButtonLoading(
    button,
    loading,
    loadingText
) {

    if (!button) {
        return;
    }


    if (loading) {

        button.disabled =
            true;

        button.dataset.originalText =
            button.textContent;

        button.textContent =
            loadingText ||
            "Saving...";

    } else {

        button.disabled =
            false;

        button.textContent =
            button.dataset.originalText ||
            "Schedule Interview";

    }

}


/* =========================================================
   DATE FORMAT
   ========================================================= */

function formatInterviewDate(
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

        return escapeInterviewHtml(
            value
        );

    }


    return date.toLocaleDateString(
        "en-US",
        {
            month: "short",
            day: "numeric",
            year: "numeric"
        }
    );

}


/* =========================================================
   TIME FORMAT
   ========================================================= */

function formatInterviewTime(
    value
) {

    if (!value) {
        return "—";
    }


    const normalized =
        normalizeTimeForInput(
            value
        );


    const parts =
        normalized.split(":");


    if (
        parts.length <
        2
    ) {

        return escapeInterviewHtml(
            value
        );

    }


    let hours =
        Number(
            parts[0]
        );


    const minutes =
        parts[1];


    if (
        Number.isNaN(
            hours
        )
    ) {

        return escapeInterviewHtml(
            value
        );

    }


    const period =
        hours >= 12
            ? "PM"
            : "AM";


    hours =
        hours % 12 ||
        12;


    return (
        `${hours}:${minutes} ${period}`
    );

}


/* =========================================================
   TIME NORMALIZATION
   ========================================================= */

function normalizeTimeForInput(
    value
) {

    if (!value) {
        return "";
    }


    return String(
        value
    ).substring(
        0,
        5
    );

}


/* =========================================================
   SCORE FORMAT
   ========================================================= */

function formatInterviewScore(
    value
) {

    const number =
        Number(
            value
        );


    if (
        Number.isInteger(
            number
        )
    ) {

        return String(
            number
        );

    }


    return number
        .toFixed(2)
        .replace(
            /\.?0+$/,
            ""
        );

}


/* =========================================================
   HTML ESCAPE
   ========================================================= */

function escapeInterviewHtml(
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