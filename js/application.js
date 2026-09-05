let applications = [];
let applicants = [];
let jobs = [];

document.addEventListener("DOMContentLoaded", init);


/* =========================================================
   INITIALIZE
========================================================= */

async function init() {

    renderShell({
        active: "Applications"
    });

    const session = await requireAuth();

    if (!session) {
        return;
    }

    setupEvents();

    loadUserProfile().catch(console.warn);

    await Promise.all([
        loadApplicants(),
        loadJobs(),
        loadApplications()
    ]);
}


/* =========================================================
   EVENTS
========================================================= */

function setupEvents() {

    document
        .getElementById("openApplicationModal")
        ?.addEventListener(
            "click",
            openApplicationForm
        );


    document
        .getElementById("closeApplicationModal")
        ?.addEventListener(
            "click",
            closeApplicationForm
        );


    document
        .getElementById("cancelApplicationModal")
        ?.addEventListener(
            "click",
            closeApplicationForm
        );


    document
        .getElementById("applicationForm")
        ?.addEventListener(
            "submit",
            submitApplication
        );


    document
        .getElementById("applicationApplicant")
        ?.addEventListener(
            "change",
            handleApplicantChange
        );


    document
        .getElementById("applicationJob")
        ?.addEventListener(
            "change",
            handleJobChange
        );


    document
        .getElementById("applicationSearch")
        ?.addEventListener(
            "input",
            renderApplications
        );


    document
        .getElementById("applicationStatusFilter")
        ?.addEventListener(
            "change",
            renderApplications
        );


    document
        .getElementById("applicationsTable")
        ?.addEventListener(
            "click",
            handleApplicationAction
        );


    document
        .getElementById("closeViewApplication")
        ?.addEventListener(
            "click",
            closeViewApplication
        );


    document
        .getElementById("closeViewApplicationBottom")
        ?.addEventListener(
            "click",
            closeViewApplication
        );


    document
        .querySelectorAll(".modal-backdrop")
        .forEach(modal => {

            modal.addEventListener(
                "click",
                event => {

                    if (event.target === modal) {
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
   LOAD APPLICANTS
========================================================= */

async function loadApplicants() {

    const select =
        document.getElementById(
            "applicationApplicant"
        );

    if (!select) {
        return;
    }

    try {

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


        renderApplicantOptions();


    } catch (error) {

        console.error(
            "Load applicants error:",
            error
        );

        showToast(
            "Unable to load applicants.",
            "error"
        );

    }
}


/* =========================================================
   RENDER APPLICANT OPTIONS
========================================================= */

function renderApplicantOptions() {

    const select =
        document.getElementById(
            "applicationApplicant"
        );

    if (!select) {
        return;
    }


    select.innerHTML = `
        <option value="">
            Select applicant
        </option>
    `;


    applicants
        .filter(
            applicant =>
                String(
                    applicant.status || ""
                ).toLowerCase() !== "inactive"
        )
        .forEach(
            applicant => {

                const option =
                    document.createElement(
                        "option"
                    );

                option.value =
                    applicant.applicant_id;

                option.textContent =
                    `${applicant.applicant_no} — ` +
                    `${applicant.first_name} ` +
                    `${applicant.last_name}`;

                select.appendChild(
                    option
                );

            }
        );
}


/* =========================================================
   LOAD JOBS
========================================================= */

async function loadJobs() {

    const select =
        document.getElementById(
            "applicationJob"
        );

    if (!select) {
        return;
    }


    try {

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
                    status
                `)
                .order(
                    "closing_date",
                    {
                        ascending: true
                    }
                );


        if (error) {
            throw error;
        }


        jobs =
            Array.isArray(data)
                ? data
                : [];


        renderJobOptions();


    } catch (error) {

        console.error(
            "Load jobs error:",
            error
        );

        showToast(
            "Unable to load job postings.",
            "error"
        );

    }
}


/* =========================================================
   RENDER AVAILABLE JOBS
========================================================= */

function renderJobOptions() {

    const select =
        document.getElementById(
            "applicationJob"
        );

    if (!select) {
        return;
    }


    select.innerHTML = `
        <option value="">
            Select available job
        </option>
    `;


    const now =
        new Date();


    jobs
        .filter(
            job => {

                const status =
                    String(
                        job.status || ""
                    )
                        .trim()
                        .toLowerCase();


                const closingDate =
                    job.closing_date
                        ? new Date(
                            `${job.closing_date}T23:59:59`
                        )
                        : null;


                const isActive =
                    status === "active";


                const deadlineValid =
                    !closingDate ||
                    closingDate >= now;


                const hasVacancies =
                    Number(
                        job.vacancies || 0
                    ) > 0;


                return (
                    isActive &&
                    deadlineValid &&
                    hasVacancies
                );

            }
        )
        .forEach(
            job => {

                const option =
                    document.createElement(
                        "option"
                    );


                option.value =
                    job.job_id;


                option.textContent =
                    `${job.job_code} — ${job.job_title}`;


                select.appendChild(
                    option
                );

            }
        );
}


/* =========================================================
   LOAD APPLICATIONS
========================================================= */

async function loadApplications() {

    const table =
        document.getElementById(
            "applicationsTable"
        );

    if (!table) {
        return;
    }


    table.innerHTML = `
        <tr>
            <td
                colspan="6"
                class="table-empty"
            >
                Loading applications...
            </td>
        </tr>
    `;


    try {

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
                    updated_at,

                    applicants (
                        applicant_no,
                        first_name,
                        last_name,
                        email
                    ),

                    job_postings (
                        job_code,
                        job_title,
                        department,
                        employment_type,
                        closing_date
                    )
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


        applications =
            Array.isArray(data)
                ? data
                : [];


        renderApplications();


    } catch (error) {

        console.error(
            "Load applications error:",
            error
        );


        table.innerHTML = `
            <tr>
                <td
                    colspan="6"
                    class="table-empty"
                >
                    Unable to load applications.
                </td>
            </tr>
        `;


        showToast(
            "Unable to load applications.",
            "error"
        );

    }
}


/* =========================================================
   RENDER APPLICATIONS
========================================================= */

function renderApplications() {

    const table =
        document.getElementById(
            "applicationsTable"
        );

    if (!table) {
        return;
    }


    const search =
        document
            .getElementById(
                "applicationSearch"
            )
            ?.value
            .trim()
            .toLowerCase() || "";


    const statusFilter =
        document
            .getElementById(
                "applicationStatusFilter"
            )
            ?.value || "";


    const filtered =
        applications.filter(
            application => {

                const applicant =
                    application.applicants;


                const job =
                    application.job_postings;


                const applicantName =
                    (
                        `${applicant?.first_name || ""} ` +
                        `${applicant?.last_name || ""}`
                    )
                        .trim()
                        .toLowerCase();


                const applicantNo =
                    String(
                        applicant?.applicant_no || ""
                    )
                        .toLowerCase();


                const jobTitle =
                    String(
                        job?.job_title || ""
                    )
                        .toLowerCase();


                const jobCode =
                    String(
                        job?.job_code || ""
                    )
                        .toLowerCase();


                const applicationId =
                    String(
                        application.application_id || ""
                    )
                        .toLowerCase();


                const matchesSearch =
                    !search ||
                    applicantName.includes(search) ||
                    applicantNo.includes(search) ||
                    jobTitle.includes(search) ||
                    jobCode.includes(search) ||
                    applicationId.includes(search);


                const matchesStatus =
                    !statusFilter ||
                    normalizeTrackingStatus(
                        application.status
                    ) ===
                    normalizeTrackingStatus(
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
                    colspan="6"
                    class="table-empty"
                >
                    No applications found.
                </td>
            </tr>
        `;

        return;
    }


    table.innerHTML =
        filtered
            .map(
                application => {

                    const applicant =
                        application.applicants;


                    const job =
                        application.job_postings;


                    const applicantName =
                        (
                            `${applicant?.first_name || ""} ` +
                            `${applicant?.last_name || ""}`
                        )
                            .trim();


                    return `
                        <tr>

                            <td>

                                <div class="application-meta">

                                    <strong>
                                        ${escapeHtml(
                                            shortApplicationId(
                                                application.application_id
                                            )
                                        )}
                                    </strong>

                                    <span>
                                        Application
                                    </span>

                                </div>

                            </td>


                            <td>
                                ${escapeHtml(
                                    applicantName
                                )}
                            </td>


                            <td>

                                <div class="application-meta">

                                    <strong>
                                        ${escapeHtml(
                                            job?.job_title || "—"
                                        )}
                                    </strong>

                                    <span>
                                        ${escapeHtml(
                                            job?.job_code || ""
                                        )}
                                    </span>

                                </div>

                            </td>


                            <td>
                                ${formatDate(
                                    application.application_date
                                )}
                            </td>


                            <td>
                                ${statusBadge(
                                    application.status || ""
                                )}
                            </td>


                            <td>

                                <div class="table-actions">

                                    <button
                                        type="button"
                                        class="table-action"
                                        data-action="view"
                                        data-id="${escapeHtml(
                                            application.application_id
                                        )}"
                                    >
                                        View
                                    </button>

                                </div>

                            </td>

                        </tr>
                    `;

                }
            )
            .join("");
}


/* =========================================================
   OPEN APPLICATION FORM
========================================================= */

function openApplicationForm() {

    const form =
        document.getElementById(
            "applicationForm"
        );


    if (!form) {
        return;
    }


    form.reset();


    const errorBox =
        document.getElementById(
            "applicationFormError"
        );


    if (errorBox) {
        errorBox.textContent = "";
    }


    hideSelectedJob();


    toggleModal(
        "applicationModal",
        true
    );
}


/* =========================================================
   CLOSE APPLICATION FORM
========================================================= */

function closeApplicationForm() {

    toggleModal(
        "applicationModal",
        false
    );
}


/* =========================================================
   APPLICANT CHANGE
========================================================= */

function handleApplicantChange() {

    const applicantId =
        document.getElementById(
            "applicationApplicant"
        )?.value;


    if (!applicantId) {
        return;
    }


    const applicant =
        applicants.find(
            item =>
                String(
                    item.applicant_id
                ) ===
                String(
                    applicantId
                )
        );


    if (!applicant) {
        return;
    }
}


/* =========================================================
   JOB CHANGE
========================================================= */

function handleJobChange() {

    const jobId =
        document.getElementById(
            "applicationJob"
        )?.value;


    const section =
        document.getElementById(
            "selectedJobSection"
        );


    if (!section) {
        return;
    }


    if (!jobId) {

        hideSelectedJob();

        return;
    }


    const job =
        jobs.find(
            item =>
                String(
                    item.job_id
                ) ===
                String(
                    jobId
                )
        );


    if (!job) {

        hideSelectedJob();

        return;
    }


    document.getElementById(
        "selectedJobTitle"
    ).textContent =
        job.job_title ||
        "Job Details";


    document.getElementById(
        "selectedJobCode"
    ).textContent =
        job.job_code ||
        "";


    document.getElementById(
        "selectedJobDepartment"
    ).textContent =
        job.department ||
        "—";


    document.getElementById(
        "selectedJobEmploymentType"
    ).textContent =
        job.employment_type ||
        "—";


    document.getElementById(
        "selectedJobClosingDate"
    ).textContent =
        job.closing_date
            ? formatDate(
                job.closing_date
            )
            : "No deadline";


    document.getElementById(
        "selectedJobVacancies"
    ).textContent =
        String(
            job.vacancies ?? "—"
        );


    document.getElementById(
        "selectedJobDescription"
    ).textContent =
        job.description ||
        "No description provided.";


    document.getElementById(
        "selectedJobQualifications"
    ).textContent =
        job.qualifications ||
        "No qualifications provided.";


    section.hidden = false;
}


/* =========================================================
   HIDE JOB DETAILS
========================================================= */

function hideSelectedJob() {

    const section =
        document.getElementById(
            "selectedJobSection"
        );


    if (!section) {
        return;
    }


    section.hidden = true;


    document.getElementById(
        "selectedJobTitle"
    ).textContent =
        "Job Details";


    document.getElementById(
        "selectedJobCode"
    ).textContent =
        "Select a job to view details.";


    document.getElementById(
        "selectedJobDepartment"
    ).textContent =
        "—";


    document.getElementById(
        "selectedJobEmploymentType"
    ).textContent =
        "—";


    document.getElementById(
        "selectedJobClosingDate"
    ).textContent =
        "—";


    document.getElementById(
        "selectedJobVacancies"
    ).textContent =
        "—";


    document.getElementById(
        "selectedJobDescription"
    ).textContent =
        "—";


    document.getElementById(
        "selectedJobQualifications"
    ).textContent =
        "—";
}


/* =========================================================
   LAB 8 — PROFILE VALIDATION
========================================================= */

function validateApplicantProfile(
    applicant
) {

    if (!applicant) {

        return {
            valid: false,
            message:
                "Applicant does not exist."
        };

    }


    const requiredFields = [

        {
            value:
                applicant.applicant_no,
            name:
                "Applicant number"
        },

        {
            value:
                applicant.first_name,
            name:
                "First name"
        },

        {
            value:
                applicant.last_name,
            name:
                "Last name"
        },

        {
            value:
                applicant.email,
            name:
                "Email"
        },

        {
            value:
                applicant.contact_no,
            name:
                "Contact number"
        },

        {
            value:
                applicant.address,
            name:
                "Address"
        },

        {
            value:
                applicant.education,
            name:
                "Education"
        },

        {
            value:
                applicant.experience,
            name:
                "Work experience"
        },

        {
            value:
                applicant.skills,
            name:
                "Skills"
        },

        {
            value:
                applicant.resume_file,
            name:
                "Resume"
        }

    ];


    const missing =
        requiredFields
            .filter(
                field =>
                    !field.value ||
                    String(
                        field.value
                    ).trim() === ""
            )
            .map(
                field =>
                    field.name
            );


    if (missing.length) {

        return {

            valid: false,

            message:
                `Applicant profile is incomplete. Missing: ${missing.join(", ")}.`

        };

    }


    return {

        valid: true,

        message: ""

    };
}


/* =========================================================
   LAB 8 — JOB VALIDATION
========================================================= */

function validateJob(
    job
) {

    if (!job) {

        return {

            valid: false,

            message:
                "Job posting does not exist."

        };

    }


    const status =
        String(
            job.status || ""
        )
            .trim()
            .toLowerCase();


    if (status !== "active") {

        return {

            valid: false,

            message:
                "Job posting is not active."

        };

    }


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

            return {

                valid: false,

                message:
                    "Job closing date is invalid."

            };

        }


        if (
            closingDate <
            new Date()
        ) {

            return {

                valid: false,

                message:
                    "Application deadline has passed."

            };

        }

    }


    if (
        Number(
            job.vacancies || 0
        ) <= 0
    ) {

        return {

            valid: false,

            message:
                "This position currently has no available vacancies."

        };

    }


    return {

        valid: true,

        message: ""

    };
}


/* =========================================================
   LAB 8 — CHECK DUPLICATE
========================================================= */

async function checkDuplicateApplication(
    applicantId,
    jobId
) {

    const {
        data,
        error
    } =
        await window.rmsSupabase
            .from("applications")
            .select(
                "application_id"
            )
            .eq(
                "applicant_id",
                applicantId
            )
            .eq(
                "job_id",
                jobId
            )
            .limit(1);


    if (error) {
        throw error;
    }


    return (
        Array.isArray(data) &&
        data.length > 0
    );
}


/* =========================================================
   SUBMIT APPLICATION
========================================================= */

async function submitApplication(
    event
) {

    event.preventDefault();


    const errorBox =
        document.getElementById(
            "applicationFormError"
        );


    if (errorBox) {
        errorBox.textContent = "";
    }


    const applicantId =
        document.getElementById(
            "applicationApplicant"
        )?.value ||
        "";


    const jobId =
        document.getElementById(
            "applicationJob"
        )?.value ||
        "";


    const coverLetter =
        document.getElementById(
            "coverLetter"
        )?.value
            .trim() ||
        "";


    if (!applicantId) {

        errorBox.textContent =
            "Please select an applicant.";

        return;
    }


    if (!jobId) {

        errorBox.textContent =
            "Please select a job.";

        return;
    }


    if (!coverLetter) {

        errorBox.textContent =
            "Please enter a cover letter.";

        return;
    }


    const applicant =
        applicants.find(
            item =>
                String(
                    item.applicant_id
                ) ===
                String(
                    applicantId
                )
        );


    const applicantValidation =
        validateApplicantProfile(
            applicant
        );


    if (
        !applicantValidation.valid
    ) {

        errorBox.textContent =
            applicantValidation.message;

        return;
    }


    const job =
        jobs.find(
            item =>
                String(
                    item.job_id
                ) ===
                String(
                    jobId
                )
        );


    const jobValidation =
        validateJob(
            job
        );


    if (
        !jobValidation.valid
    ) {

        errorBox.textContent =
            jobValidation.message;

        return;
    }


    try {

        const duplicate =
            await checkDuplicateApplication(
                applicantId,
                jobId
            );


        if (duplicate) {

            errorBox.textContent =
                `The applicant has already applied for ${job.job_code}.`;

            return;
        }


    } catch (error) {

        console.error(
            "Duplicate check error:",
            error
        );


        errorBox.textContent =
            "Unable to validate duplicate application.";

        return;
    }


    const button =
        document.getElementById(
            "submitApplicationButton"
        );


    setButtonLoading(
        button,
        true,
        "Submitting..."
    );


    try {

        const application = {

            applicant_id:
                applicantId,

            job_id:
                jobId,

            application_date:
                getTodayLocalDate(),

            cover_letter:
                coverLetter,

            status:
                "SUBMITTED"

        };


        const {
            error
        } =
            await window.rmsSupabase
                .from("applications")
                .insert([
                    application
                ]);


        if (error) {
            throw error;
        }


        closeApplicationForm();


        showToast(
            "Application submitted successfully."
        );


        await loadApplications();


    } catch (error) {

        console.error(
            "Submit application error:",
            error
        );


        errorBox.textContent =
            error?.message ||
            "Unable to submit application. Please try again.";


    } finally {

        setButtonLoading(
            button,
            false
        );

    }
}


/* =========================================================
   APPLICATION ACTION
========================================================= */

function handleApplicationAction(
    event
) {

    const button =
        event.target.closest(
            "[data-action]"
        );


    if (!button) {
        return;
    }


    const application =
        applications.find(
            item =>
                String(
                    item.application_id
                ) ===
                String(
                    button.dataset.id
                )
        );


    if (!application) {
        return;
    }


    if (
        button.dataset.action ===
        "view"
    ) {

        openViewApplication(
            application
        );

    }
}


/* =========================================================
   VIEW APPLICATION
========================================================= */

function openViewApplication(
    application
) {

    const applicant =
        application.applicants;


    const job =
        application.job_postings;


    const title =
        document.getElementById(
            "viewApplicationTitle"
        );


    const body =
        document.getElementById(
            "viewApplicationBody"
        );


    if (!title || !body) {
        return;
    }


    const applicantName =
        (
            `${applicant?.first_name || ""} ` +
            `${applicant?.last_name || ""}`
        )
            .trim();


    title.textContent =
        job?.job_title ||
        "Application Details";


    body.innerHTML = `

        <div class="profile-grid">


            <div class="profile-item">

                <small>
                    Application ID
                </small>

                <div>
                    ${escapeHtml(
                        application.application_id || ""
                    )}
                </div>

            </div>


            <div class="profile-item">

                <small>
                    Status
                </small>

                <div>
                    ${statusBadge(
                        application.status || ""
                    )}
                </div>

            </div>


            <div class="profile-item">

                <small>
                    Applicant
                </small>

                <div>
                    ${escapeHtml(
                        applicantName
                    )}
                </div>

            </div>


            <div class="profile-item">

                <small>
                    Applicant No.
                </small>

                <div>
                    ${escapeHtml(
                        applicant?.applicant_no || ""
                    )}
                </div>

            </div>


            <div class="profile-item">

                <small>
                    Position
                </small>

                <div>
                    ${escapeHtml(
                        job?.job_title || ""
                    )}
                </div>

            </div>


            <div class="profile-item">

                <small>
                    Job Code
                </small>

                <div>
                    ${escapeHtml(
                        job?.job_code || ""
                    )}
                </div>

            </div>


            <div class="profile-item">

                <small>
                    Department
                </small>

                <div>
                    ${escapeHtml(
                        job?.department || ""
                    )}
                </div>

            </div>


            <div class="profile-item">

                <small>
                    Employment Type
                </small>

                <div>
                    ${escapeHtml(
                        job?.employment_type || ""
                    )}
                </div>

            </div>


            <div class="profile-item">

                <small>
                    Date Applied
                </small>

                <div>
                    ${formatDate(
                        application.application_date
                    )}
                </div>

            </div>


            <div class="profile-item">

                <small>
                    Closing Date
                </small>

                <div>
                    ${
                        job?.closing_date
                            ? formatDate(
                                job.closing_date
                            )
                            : "No deadline"
                    }
                </div>

            </div>


            <div
                class="profile-item profile-item-full"
            >

                <small>
                    Cover Letter
                </small>

                <div
                    style="white-space:pre-wrap;"
                >
                    ${escapeHtml(
                        application.cover_letter || ""
                    )}
                </div>

            </div>


        </div>


        <!-- =================================================
             LAB 9 APPLICATION TRACKING
        ================================================== -->

        <div
            id="applicationTracking"
            class="application-tracking"
        ></div>

    `;


    const tracking =
        document.getElementById(
            "applicationTracking"
        );


    if (tracking) {

        renderApplicationTracking(
            application,
            tracking
        );

    }


    toggleModal(
        "viewApplicationModal",
        true
    );
}


/* =========================================================
   LAB 9 — APPLICATION TRACKING
========================================================= */

const TRACKING_STATUSES = [

    "SUBMITTED",

    "UNDER SCREENING",

    "QUALIFIED",

    "FOR INTERVIEW",

    "INTERVIEWED",

    "SELECTED",

    "HIRED"

];


const TRACKING_LABELS = [

    "Submitted",

    "Under Screening",

    "Qualified",

    "For Interview",

    "Interviewed",

    "Selected",

    "Hired"

];


/*
   Allowed status movement.

   This keeps the application moving through
   the recruitment process in the correct order.
*/

const STATUS_TRANSITIONS = {

    "SUBMITTED": [
        "UNDER SCREENING",
        "REJECTED",
        "WITHDRAWN"
    ],

    "UNDER SCREENING": [
        "QUALIFIED",
        "REJECTED",
        "WITHDRAWN"
    ],

    "QUALIFIED": [
        "FOR INTERVIEW",
        "REJECTED",
        "WITHDRAWN"
    ],

    "FOR INTERVIEW": [
        "INTERVIEWED",
        "REJECTED",
        "WITHDRAWN"
    ],

    "INTERVIEWED": [
        "SELECTED",
        "REJECTED",
        "WITHDRAWN"
    ],

    "SELECTED": [
        "HIRED",
        "REJECTED",
        "WITHDRAWN"
    ],

    "HIRED": [],

    "REJECTED": [],

    "WITHDRAWN": []

};


/* =========================================================
   NORMALIZE STATUS
========================================================= */

function normalizeTrackingStatus(
    status
) {

    return String(
        status || ""
    )
        .trim()
        .toUpperCase()
        .replace(/_/g, " ");

}


/* =========================================================
   DISPLAY STATUS
========================================================= */

function trackingDisplayStatus(
    status
) {

    const normalized =
        normalizeTrackingStatus(
            status
        );


    if (
        normalized ===
        "UNDER SCREENING"
    ) {

        return "Under Screening";

    }


    if (
        normalized ===
        "FOR INTERVIEW"
    ) {

        return "For Interview";

    }


    return normalized
        .toLowerCase()
        .replace(
            /(^|\s)\S/g,
            letter =>
                letter.toUpperCase()
        );

}


/* =========================================================
   RENDER APPLICATION TRACKING
========================================================= */

function renderApplicationTracking(
    application,
    container
) {

    if (!container) {
        return;
    }


    const currentStatus =
        normalizeTrackingStatus(
            application.status
        );


    const currentIndex =
        TRACKING_STATUSES.indexOf(
            currentStatus
        );


    let stepsHtml = "";


    TRACKING_STATUSES.forEach(
        (
            status,
            index
        ) => {

            let state = "";


            if (
                currentIndex >= 0
            ) {

                if (
                    index <
                    currentIndex
                ) {

                    state =
                        "completed";

                }
                else if (
                    index ===
                    currentIndex
                ) {

                    state =
                        "current";

                }

            }


            stepsHtml += `

                <div
                    class="tracking-step ${state}"
                >

                    <div
                        class="tracking-dot"
                    >
                        ${
                            index <
                            currentIndex
                                ? "✓"
                                : index ===
                                    currentIndex
                                        ? "•"
                                        : index + 1
                        }
                    </div>


                    <span
                        class="tracking-label"
                    >
                        ${escapeHtml(
                            TRACKING_LABELS[index]
                        )}
                    </span>

                </div>

            `;

        }
    );


    const outcomeStatuses = [

        "REJECTED",

        "WITHDRAWN"

    ];


    const transitionOptions =
        STATUS_TRANSITIONS[
            currentStatus
        ] || [];


    const hasOutcome =
        outcomeStatuses.includes(
            currentStatus
        );


    const selectOptions =
        transitionOptions
            .map(
                status => `

                    <option
                        value="${escapeHtml(
                            status
                        )}"
                    >
                        ${escapeHtml(
                            trackingDisplayStatus(
                                status
                            )
                        )}
                    </option>

                `
            )
            .join("");


    container.innerHTML = `

        <div
            class="tracking-header"
        >

            <div>

                <h4>
                    Application Status
                </h4>

                <p>

                    Current status:

                    <strong>
                        ${escapeHtml(
                            trackingDisplayStatus(
                                currentStatus
                            )
                        )}
                    </strong>

                </p>

            </div>


            ${statusBadge(
                application.status || ""
            )}

        </div>


        ${
            hasOutcome

                ? `

                    <div
                        class="tracking-outcome"
                    >

                        This application has reached
                        a final outcome:

                        <strong>
                            ${escapeHtml(
                                trackingDisplayStatus(
                                    currentStatus
                                )
                            )}
                        </strong>.

                    </div>

                `

                : `

                    <div
                        class="tracking-steps"
                    >

                        ${stepsHtml}

                    </div>

                `
        }


        ${
            transitionOptions.length

                ? `

                    <div
                        class="tracking-controls"
                    >

                        <div
                            class="form-group"
                        >

                            <label
                                for="trackingStatusSelect"
                            >
                                Update Status
                            </label>


                            <select
                                id="trackingStatusSelect"
                            >

                                <option value="">
                                    Select next status
                                </option>

                                ${selectOptions}

                            </select>

                        </div>


                        <button
                            type="button"
                            class="btn btn-primary"
                            data-action="update-status"
                            data-id="${escapeHtml(
                                application.application_id
                            )}"
                        >
                            Update Status
                        </button>

                    </div>


                    <div
                        id="trackingMessage"
                        class="tracking-message"
                        role="alert"
                    ></div>

                `

                : ""

        }

    `;

}


/* =========================================================
   TRACKING BUTTON
========================================================= */

document.addEventListener(
    "click",
    event => {

        const button =
            event.target.closest(
                '[data-action="update-status"]'
            );


        if (!button) {
            return;
        }


        const applicationId =
            button.dataset.id;


        updateApplicationStatus(
            applicationId,
            button
        );

    }
);


/* =========================================================
   UPDATE APPLICATION STATUS
========================================================= */

async function updateApplicationStatus(
    applicationId,
    button
) {

    const select =
        document.getElementById(
            "trackingStatusSelect"
        );


    const message =
        document.getElementById(
            "trackingMessage"
        );


    const nextStatus =
        normalizeTrackingStatus(
            select?.value
        );


    if (!nextStatus) {

        if (message) {

            message.textContent =
                "Please select the next status.";

        }

        return;
    }


    const application =
        applications.find(
            item =>
                String(
                    item.application_id
                ) ===
                String(
                    applicationId
                )
        );


    if (!application) {

        if (message) {

            message.textContent =
                "Application could not be found.";

        }

        return;
    }


    const currentStatus =
        normalizeTrackingStatus(
            application.status
        );


    const allowedTransitions =
        STATUS_TRANSITIONS[
            currentStatus
        ] || [];


    if (
        !allowedTransitions.includes(
            nextStatus
        )
    ) {

        if (message) {

            message.textContent =
                "That status change is not allowed.";

        }

        return;
    }


    setButtonLoading(
        button,
        true,
        "Updating..."
    );


    try {

        const {
            data,
            error
        } =
            await window.rmsSupabase
                .from("applications")
                .update({

                    status:
                        nextStatus

                })
                .eq(
                    "application_id",
                    applicationId
                )
                .select(`

                    application_id,
                    applicant_id,
                    job_id,
                    application_date,
                    cover_letter,
                    status,
                    created_at,
                    updated_at,

                    applicants (
                        applicant_no,
                        first_name,
                        last_name,
                        email
                    ),

                    job_postings (
                        job_code,
                        job_title,
                        department,
                        employment_type,
                        closing_date
                    )

                `)
                .single();


        if (error) {
            throw error;
        }


        const index =
            applications.findIndex(
                item =>
                    String(
                        item.application_id
                    ) ===
                    String(
                        applicationId
                    )
            );


        if (
            index !== -1 &&
            data
        ) {

            applications[index] =
                data;

        }


        renderApplications();


        if (data) {

            openViewApplication(
                data
            );

        }


        showToast(
            `Application status updated to ${trackingDisplayStatus(
                nextStatus
            )}.`
        );


    } catch (error) {

        console.error(
            "Update application status error:",
            error
        );


        if (message) {

            message.textContent =
                error?.message ||
                "Unable to update application status.";

        }


    } finally {

        setButtonLoading(
            button,
            false
        );

    }

}


/* =========================================================
   CLOSE VIEW APPLICATION
========================================================= */

function closeViewApplication() {

    toggleModal(
        "viewApplicationModal",
        false
    );
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
   LOCAL DATE
========================================================= */

function getTodayLocalDate() {

    const now =
        new Date();


    const year =
        now.getFullYear();


    const month =
        String(
            now.getMonth() + 1
        )
            .padStart(
                2,
                "0"
            );


    const day =
        String(
            now.getDate()
        )
            .padStart(
                2,
                "0"
            );


    return `${year}-${month}-${day}`;

}


/* =========================================================
   SHORT APPLICATION ID
========================================================= */

function shortApplicationId(
    id
) {

    if (!id) {
        return "—";
    }


    return String(
        id
    )
        .split("-")
        .pop()
        .toUpperCase();

}