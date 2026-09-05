/* =========================================================
   RECRUITMENT MANAGEMENT SYSTEM
   LABORATORY ACTIVITY 3
   JOB POSTING MANAGEMENT
   ========================================================= */

let jobPostings = [];
let editingJobId = null;

document.addEventListener(
    "DOMContentLoaded",
    initJobPostings
);


/* =========================================================
   INITIALIZATION
   ========================================================= */

async function initJobPostings() {
    try {
        renderShell({
            active: "Job Postings"
        });

        bindJobPostingEvents();

        const {
            data: sessionData,
            error: sessionError
        } = await withTimeout(
            window.rmsSupabase.auth.getSession(),
            8000,
            "Authentication request timed out."
        );

        if (sessionError) {
            throw sessionError;
        }

        if (!sessionData?.session) {
            window.location.href = "login.html";
            return;
        }

        await Promise.allSettled([
            loadJobPostings(),
            loadJobPostingProfile()
        ]);

    } catch (error) {
        console.error(
            "Job Postings initialization error:",
            error
        );

        showToast(
            error.message ||
            "Unable to initialize Job Postings.",
            "error"
        );
    }
}


/* =========================================================
   EVENT HANDLERS
   ========================================================= */

function bindJobPostingEvents() {
    document
        .getElementById("jobSearch")
        ?.addEventListener(
            "input",
            renderJobPostings
        );

    document
        .getElementById("statusFilter")
        ?.addEventListener(
            "change",
            renderJobPostings
        );

    document
        .getElementById("openAddModal")
        ?.addEventListener(
            "click",
            openAddJobModal
        );

    document
        .getElementById("jobsTable")
        ?.addEventListener(
            "click",
            handleJobTableClick
        );
}


/* =========================================================
   USER PROFILE
   ========================================================= */

async function loadJobPostingProfile() {
    try {
        const {
            data
        } = await withTimeout(
            window.rmsSupabase.auth.getUser(),
            8000,
            "User request timed out."
        );

        const user =
            data?.user;

        if (!user) {
            return null;
        }

        const {
            data: profile,
            error
        } = await withTimeout(
            window.rmsSupabase
                .from("users")
                .select(
                    "username, role, status"
                )
                .eq(
                    "user_id",
                    user.id
                )
                .maybeSingle(),
            8000,
            "User profile request timed out."
        );

        if (error) {
            console.warn(
                "Profile request:",
                error.message
            );
        }

        const username =
            profile?.username ||
            user.email?.split("@")[0] ||
            "User";

        const role =
            profile?.role ||
            "User";

        document
            .querySelectorAll(
                "#sidebarUsername"
            )
            .forEach(
                element => {
                    element.textContent =
                        username;
                }
            );

        document
            .querySelectorAll(
                "#sidebarRole"
            )
            .forEach(
                element => {
                    element.textContent =
                        role;
                }
            );

        document
            .querySelectorAll(
                "#sidebarAvatar, #topbarAvatar"
            )
            .forEach(
                element => {
                    element.textContent =
                        username
                            .charAt(0)
                            .toUpperCase();
                }
            );

        return profile;

    } catch (error) {
        console.warn(
            "Could not load profile:",
            error
        );

        return null;
    }
}


/* =========================================================
   LOAD JOB POSTINGS
   ========================================================= */

async function loadJobPostings() {
    const tableBody =
        document.getElementById(
            "jobsTable"
        );

    if (!tableBody) {
        return;
    }

    tableBody.innerHTML = `
        <tr>
            <td
                colspan="9"
                class="table-empty"
            >
                Loading job postings…
            </td>
        </tr>
    `;

    try {
        const {
            data,
            error
        } = await withTimeout(
            window.rmsSupabase
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
                ),
            10000,
            "Job postings request timed out."
        );

        if (error) {
            throw error;
        }

        jobPostings =
            Array.isArray(data)
                ? data
                : [];

        renderJobPostings();

    } catch (error) {
        console.error(
            "Job posting load error:",
            error
        );

        tableBody.innerHTML = `
            <tr>
                <td
                    colspan="9"
                    class="table-empty"
                >
                    <strong>
                        Unable to load job postings
                    </strong>

                    <div
                        style="
                            margin-top:8px;
                            font-size:13px;
                            color:var(--muted);
                        "
                    >
                        ${escapeHtml(
                            error.message ||
                            "Please try again."
                        )}
                    </div>

                    <button
                        type="button"
                        class="btn btn-secondary"
                        style="margin-top:14px;"
                        onclick="loadJobPostings()"
                    >
                        Try Again
                    </button>
                </td>
            </tr>
        `;
    }
}


/* =========================================================
   RENDER JOB POSTINGS
   ========================================================= */

function renderJobPostings() {
    const tableBody =
        document.getElementById(
            "jobsTable"
        );

    if (!tableBody) {
        return;
    }

    const search =
        document.getElementById(
            "jobSearch"
        )
        ?.value
        .trim()
        .toLowerCase() || "";

    const status =
        document.getElementById(
            "statusFilter"
        )
        ?.value || "";

    const filtered =
        jobPostings.filter(
            job => {
                const searchableText = `
                    ${job.job_code || ""}
                    ${job.job_title || ""}
                    ${job.department || ""}
                `.toLowerCase();

                const matchesSearch =
                    !search ||
                    searchableText.includes(
                        search
                    );

                const matchesStatus =
                    !status ||
                    normalizeStatus(
                        job.status
                    ) ===
                    normalizeStatus(
                        status
                    );

                return (
                    matchesSearch &&
                    matchesStatus
                );
            }
        );

    if (!filtered.length) {
        tableBody.innerHTML = `
            <tr>
                <td
                    colspan="9"
                    class="table-empty"
                >
                    No job postings found.
                </td>
            </tr>
        `;

        return;
    }

    tableBody.innerHTML =
        filtered
            .map(
                createJobTableRow
            )
            .join("");
}


/* =========================================================
   TABLE ROW
   ========================================================= */

function createJobTableRow(job) {
    return `
        <tr>

            <td>
                <strong>
                    ${escapeHtml(
                        job.job_code || "—"
                    )}
                </strong>
            </td>

            <td>
                ${escapeHtml(
                    job.job_title || "—"
                )}
            </td>

            <td>
                ${escapeHtml(
                    job.department || "—"
                )}
            </td>

            <td>
                ${escapeHtml(
                    job.employment_type || "—"
                )}
            </td>

            <td>
                ${Number(
                    job.vacancies || 0
                )}
            </td>

            <td>
                ${formatDate(
                    job.posting_date
                )}
            </td>

            <td>
                ${formatDate(
                    job.closing_date
                )}
            </td>

            <td>
                ${statusBadge(
                    job.status || "Open"
                )}
            </td>

            <td>

                <div class="table-actions">

                    <button
                        type="button"
                        class="table-action"
                        data-action="view"
                        data-id="${job.job_id}"
                    >
                        View
                    </button>

                    <button
                        type="button"
                        class="table-action"
                        data-action="edit"
                        data-id="${job.job_id}"
                    >
                        Edit
                    </button>

                    <button
                        type="button"
                        class="table-action danger"
                        data-action="delete"
                        data-id="${job.job_id}"
                    >
                        Delete
                    </button>

                </div>

            </td>

        </tr>
    `;
}


/* =========================================================
   TABLE ACTIONS
   ========================================================= */

async function handleJobTableClick(event) {
    const button =
        event.target.closest(
            "[data-action]"
        );

    if (!button) {
        return;
    }

    const jobId =
        button.dataset.id;

    if (!jobId) {
        return;
    }

    const job =
        jobPostings.find(
            item =>
                String(
                    item.job_id
                ) ===
                String(
                    jobId
                )
        );

    if (!job) {
        showToast(
            "Job posting could not be found.",
            "error"
        );

        return;
    }

    const action =
        button.dataset.action;

    if (action === "view") {
        openViewJobModal(job);
        return;
    }

    if (action === "edit") {
        openEditJobModal(job);
        return;
    }

    if (action === "delete") {
        await deleteJobPosting(job);
    }
}


/* =========================================================
   ADD JOB POSTING
   ========================================================= */

function openAddJobModal() {
    editingJobId = null;

    removeExistingModal(
        "jobPostingModal"
    );

    createJobModal();

    const form =
        document.getElementById(
            "jobPostingForm"
        );

    const title =
        document.getElementById(
            "jobPostingModalTitle"
        );

    const submit =
        document.getElementById(
            "jobPostingSubmit"
        );

    if (title) {
        title.textContent =
            "Add Job Posting";
    }

    if (submit) {
        submit.textContent =
            "Create Job Posting";
    }

    if (form) {
        form.reset();
    }

    const today =
        new Date()
            .toISOString()
            .split("T")[0];

    const postingDate =
        document.getElementById(
            "jobPostingDate"
        );

    if (postingDate) {
        postingDate.value =
            today;
    }

    const status =
        document.getElementById(
            "jobPostingStatus"
        );

    if (status) {
        status.value =
            "Open";
    }

    showModal(
        "jobPostingModal"
    );
}


/* =========================================================
   EDIT JOB POSTING
   ========================================================= */

function openEditJobModal(job) {
    editingJobId =
        job.job_id;

    removeExistingModal(
        "jobPostingModal"
    );

    createJobModal();

    document.getElementById(
        "jobPostingModalTitle"
    ).textContent =
        "Edit Job Posting";

    document.getElementById(
        "jobPostingSubmit"
    ).textContent =
        "Save Changes";

    document.getElementById(
        "jobCode"
    ).value =
        job.job_code || "";

    document.getElementById(
        "jobTitle"
    ).value =
        job.job_title || "";

    document.getElementById(
        "jobDepartment"
    ).value =
        job.department || "";

    document.getElementById(
        "jobEmployment"
    ).value =
        job.employment_type || "";

    document.getElementById(
        "jobVacancies"
    ).value =
        Number(
            job.vacancies || 1
        );

    document.getElementById(
        "jobPostingDate"
    ).value =
        formatInputDate(
            job.posting_date
        );

    document.getElementById(
        "jobClosingDate"
    ).value =
        formatInputDate(
            job.closing_date
        );

    document.getElementById(
        "jobDescription"
    ).value =
        job.description || "";

    document.getElementById(
        "jobQualifications"
    ).value =
        job.qualifications || "";

    document.getElementById(
        "jobPostingStatus"
    ).value =
        normalizeStatus(
            job.status
        ) === "closed"
            ? "Closed"
            : "Open";

    showModal(
        "jobPostingModal"
    );
}


/* =========================================================
   CREATE JOB MODAL
   IMPORTANT:
   SAME STRUCTURE AS APPLICANT VIEW MODAL
   ========================================================= */

function createJobModal() {

    const modalBackdrop =
        document.createElement(
            "div"
        );

    modalBackdrop.id =
        "jobPostingModal";

    modalBackdrop.className =
        "modal-backdrop";

    modalBackdrop.setAttribute(
        "aria-hidden",
        "true"
    );

    modalBackdrop.innerHTML = `

        <div
            class="modal glass-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="jobPostingModalTitle"
        >

            <div class="modal-head">

                <div>

                    <p class="eyebrow">
                        Vacancy Management
                    </p>

                    <h3
                        id="jobPostingModalTitle"
                    >
                        Add Job Posting
                    </h3>

                </div>

                <button
                    type="button"
                    class="icon-button"
                    id="closeJobPostingModal"
                    aria-label="Close"
                >
                    ×
                </button>

            </div>


            <form
                id="jobPostingForm"
                class="form-grid"
                autocomplete="off"
            >

                <div>
                    <label for="jobCode">
                        Job Code
                    </label>

                    <input
                        id="jobCode"
                        type="text"
                        required
                        maxlength="50"
                        placeholder="JOB-001"
                    >
                </div>


                <div>
                    <label for="jobTitle">
                        Position
                    </label>

                    <input
                        id="jobTitle"
                        type="text"
                        required
                        maxlength="150"
                        placeholder="Software Developer"
                    >
                </div>


                <div>
                    <label for="jobDepartment">
                        Department
                    </label>

                    <input
                        id="jobDepartment"
                        type="text"
                        required
                        maxlength="150"
                        placeholder="Information Technology"
                    >
                </div>


                <div>
                    <label for="jobEmployment">
                        Employment Type
                    </label>

                    <select
                        id="jobEmployment"
                        required
                    >

                        <option value="">
                            Select employment type
                        </option>

                        <option value="Full-Time">
                            Full-Time
                        </option>

                        <option value="Part-Time">
                            Part-Time
                        </option>

                        <option value="Contract">
                            Contract
                        </option>

                        <option value="Temporary">
                            Temporary
                        </option>

                        <option value="Internship">
                            Internship
                        </option>

                    </select>
                </div>


                <div>
                    <label for="jobVacancies">
                        Vacancies
                    </label>

                    <input
                        id="jobVacancies"
                        type="number"
                        min="1"
                        step="1"
                        value="1"
                        required
                    >
                </div>


                <div>
                    <label for="jobPostingDate">
                        Posting Date
                    </label>

                    <input
                        id="jobPostingDate"
                        type="date"
                        required
                    >
                </div>


                <div>
                    <label for="jobClosingDate">
                        Closing Date
                    </label>

                    <input
                        id="jobClosingDate"
                        type="date"
                        required
                    >
                </div>


                <div>
                    <label for="jobPostingStatus">
                        Status
                    </label>

                    <select
                        id="jobPostingStatus"
                        required
                    >

                        <option value="Open">
                            Open
                        </option>

                        <option value="Closed">
                            Closed
                        </option>

                    </select>
                </div>


                <div class="full-field">

                    <label for="jobDescription">
                        Job Description
                    </label>

                    <textarea
                        id="jobDescription"
                        rows="5"
                        maxlength="5000"
                        placeholder="Describe the responsibilities and duties..."
                    ></textarea>

                </div>


                <div class="full-field">

                    <label for="jobQualifications">
                        Qualifications
                    </label>

                    <textarea
                        id="jobQualifications"
                        rows="5"
                        maxlength="5000"
                        placeholder="List the required education, skills, experience, and qualifications..."
                    ></textarea>

                </div>


                <div
                    class="button-row full-field"
                >

                    <button
                        type="button"
                        class="btn btn-secondary"
                        id="cancelJobPosting"
                    >
                        Cancel
                    </button>

                    <button
                        type="submit"
                        class="btn btn-primary"
                        id="jobPostingSubmit"
                    >
                        Create Job Posting
                    </button>

                </div>

            </form>

        </div>

    `;

    document.body.appendChild(
        modalBackdrop
    );


    document
        .getElementById(
            "closeJobPostingModal"
        )
        ?.addEventListener(
            "click",
            closeJobPostingModal
        );


    document
        .getElementById(
            "cancelJobPosting"
        )
        ?.addEventListener(
            "click",
            closeJobPostingModal
        );


    document
        .getElementById(
            "jobPostingForm"
        )
        ?.addEventListener(
            "submit",
            saveJobPosting
        );


    modalBackdrop.addEventListener(
        "click",
        event => {

            if (
                event.target ===
                modalBackdrop
            ) {
                closeJobPostingModal();
            }

        }
    );
}


/* =========================================================
   CLOSE ADD / EDIT MODAL
   ========================================================= */

function closeJobPostingModal() {

    const modal =
        document.getElementById(
            "jobPostingModal"
        );

    if (!modal) {
        return;
    }

    hideModal(
        modal
    );

    setTimeout(
        () => {

            if (
                modal.parentNode
            ) {
                modal.remove();
            }

        },
        180
    );

    editingJobId = null;
}


/* =========================================================
   SAVE JOB POSTING
   ========================================================= */

async function saveJobPosting(event) {
    event.preventDefault();

    const jobCode =
        document.getElementById(
            "jobCode"
        ).value.trim();

    const jobTitle =
        document.getElementById(
            "jobTitle"
        ).value.trim();

    const department =
        document.getElementById(
            "jobDepartment"
        ).value.trim();

    const employmentType =
        document.getElementById(
            "jobEmployment"
        ).value.trim();

    const vacancies =
        Number(
            document.getElementById(
                "jobVacancies"
            ).value
        );

    const postingDate =
        document.getElementById(
            "jobPostingDate"
        ).value;

    const closingDate =
        document.getElementById(
            "jobClosingDate"
        ).value;

    const status =
        document.getElementById(
            "jobPostingStatus"
        ).value;

    const description =
        document.getElementById(
            "jobDescription"
        ).value.trim();

    const qualifications =
        document.getElementById(
            "jobQualifications"
        ).value.trim();


    if (!jobCode) {
        showToast(
            "Job code is required.",
            "error"
        );
        return;
    }


    if (!jobTitle) {
        showToast(
            "Position is required.",
            "error"
        );
        return;
    }


    if (!department) {
        showToast(
            "Department is required.",
            "error"
        );
        return;
    }


    if (!employmentType) {
        showToast(
            "Employment type is required.",
            "error"
        );
        return;
    }


    if (
        !Number.isInteger(
            vacancies
        ) ||
        vacancies < 1
    ) {
        showToast(
            "Vacancies must be at least 1.",
            "error"
        );
        return;
    }


    if (!postingDate) {
        showToast(
            "Posting date is required.",
            "error"
        );
        return;
    }


    if (!closingDate) {
        showToast(
            "Closing date is required.",
            "error"
        );
        return;
    }


    if (
        closingDate <
        postingDate
    ) {
        showToast(
            "Closing date cannot be before the posting date.",
            "error"
        );
        return;
    }


    const duplicate =
        jobPostings.find(
            job =>
                String(
                    job.job_code || ""
                )
                .trim()
                .toLowerCase() ===
                jobCode
                    .toLowerCase() &&
                String(
                    job.job_id
                ) !==
                String(
                    editingJobId || ""
                )
        );


    if (duplicate) {
        showToast(
            "That job code already exists.",
            "error"
        );
        return;
    }


    const submitButton =
        document.getElementById(
            "jobPostingSubmit"
        );

    if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent =
            "Saving...";
    }


    try {

        const payload = {

            job_code:
                jobCode,

            job_title:
                jobTitle,

            department:
                department,

            description:
                description ||
                null,

            qualifications:
                qualifications ||
                null,

            employment_type:
                employmentType,

            posting_date:
                postingDate,

            closing_date:
                closingDate,

            vacancies:
                vacancies,

            status:
                status
        };


        if (editingJobId) {

            const {
                error
            } = await withTimeout(
                window.rmsSupabase
                    .from(
                        "job_postings"
                    )
                    .update(
                        payload
                    )
                    .eq(
                        "job_id",
                        editingJobId
                    ),
                10000,
                "Saving job posting timed out."
            );


            if (error) {
                throw error;
            }


            showToast(
                "Job posting updated successfully."
            );

        } else {

            const {
                error
            } = await withTimeout(
                window.rmsSupabase
                    .from(
                        "job_postings"
                    )
                    .insert([
                        payload
                    ]),
                10000,
                "Creating job posting timed out."
            );


            if (error) {
                throw error;
            }


            showToast(
                "Job posting created successfully."
            );
        }


        closeJobPostingModal();

        await loadJobPostings();

    } catch (error) {

        console.error(
            "Save job posting error:",
            error
        );

        showToast(
            error.message ||
            "Unable to save job posting.",
            "error"
        );

    } finally {

        if (
            submitButton &&
            document.body.contains(
                submitButton
            )
        ) {

            submitButton.disabled =
                false;

            submitButton.textContent =
                "Save";

        }
    }
}


/* =========================================================
   VIEW JOB POSTING
   SAME MODAL STRUCTURE AS APPLICANTS
   ========================================================= */

function openViewJobModal(job) {

    removeExistingModal(
        "viewJobModal"
    );


    const modalBackdrop =
        document.createElement(
            "div"
        );

    modalBackdrop.id =
        "viewJobModal";

    modalBackdrop.className =
        "modal-backdrop";

    modalBackdrop.setAttribute(
        "aria-hidden",
        "true"
    );


    modalBackdrop.innerHTML = `

        <div
            class="modal glass-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="viewJobTitle"
        >

            <div class="modal-head">

                <div>

                    <p class="eyebrow">
                        Job Posting
                    </p>

                    <h3 id="viewJobTitle">
                        ${escapeHtml(
                            job.job_title ||
                            "Job Posting"
                        )}
                    </h3>

                </div>


                <button
                    id="closeViewJob"
                    class="icon-button"
                    type="button"
                    aria-label="Close"
                >
                    ×
                </button>

            </div>


            <div class="profile-grid">

                <div class="profile-item">

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


                <div class="profile-item">

                    <small>
                        Status
                    </small>

                    <div>
                        ${statusBadge(
                            job.status ||
                            "Open"
                        )}
                    </div>

                </div>


                <div class="profile-item">

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


                <div class="profile-item">

                    <small>
                        Department
                    </small>

                    <div>
                        ${escapeHtml(
                            job.department ||
                            "—"
                        )}
                    </div>

                </div>


                <div class="profile-item">

                    <small>
                        Employment Type
                    </small>

                    <div>
                        ${escapeHtml(
                            job.employment_type ||
                            "—"
                        )}
                    </div>

                </div>


                <div class="profile-item">

                    <small>
                        Vacancies
                    </small>

                    <div>
                        ${Number(
                            job.vacancies ||
                            0
                        )}
                    </div>

                </div>


                <div class="profile-item">

                    <small>
                        Posting Date
                    </small>

                    <div>
                        ${formatDate(
                            job.posting_date
                        )}
                    </div>

                </div>


                <div class="profile-item">

                    <small>
                        Closing Date
                    </small>

                    <div>
                        ${
                            job.closing_date
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
                        Job Description
                    </small>

                    <div
                        style="
                            white-space:pre-wrap;
                        "
                    >
                        ${escapeHtml(
                            job.description ||
                            "No job description provided."
                        )}
                    </div>

                </div>


                <div
                    class="profile-item profile-item-full"
                >

                    <small>
                        Qualifications
                    </small>

                    <div
                        style="
                            white-space:pre-wrap;
                        "
                    >
                        ${escapeHtml(
                            job.qualifications ||
                            "No qualifications provided."
                        )}
                    </div>

                </div>

            </div>


            <div class="button-row">

                <button
                    id="closeViewJobBottom"
                    class="btn btn-secondary"
                    type="button"
                >
                    Close
                </button>

            </div>

        </div>

    `;


    document.body.appendChild(
        modalBackdrop
    );


    document
        .getElementById(
            "closeViewJob"
        )
        ?.addEventListener(
            "click",
            closeViewJobModal
        );


    document
        .getElementById(
            "closeViewJobBottom"
        )
        ?.addEventListener(
            "click",
            closeViewJobModal
        );


    modalBackdrop.addEventListener(
        "click",
        event => {

            if (
                event.target ===
                modalBackdrop
            ) {
                closeViewJobModal();
            }

        }
    );


    document.addEventListener(
        "keydown",
        handleViewJobEscape
    );


    showModal(
        "viewJobModal"
    );
}


/* =========================================================
   CLOSE VIEW JOB MODAL
   ========================================================= */

function closeViewJobModal() {

    const modal =
        document.getElementById(
            "viewJobModal"
        );

    if (!modal) {
        return;
    }

    hideModal(
        modal
    );

    document.removeEventListener(
        "keydown",
        handleViewJobEscape
    );

    setTimeout(
        () => {

            if (
                modal.parentNode
            ) {
                modal.remove();
            }

        },
        180
    );
}


function handleViewJobEscape(event) {

    if (
        event.key ===
        "Escape"
    ) {
        closeViewJobModal();
    }
}


/* =========================================================
   DELETE JOB POSTING
   ========================================================= */

async function deleteJobPosting(job) {

    const confirmed =
        window.confirm(
            `Delete "${job.job_title}" (${job.job_code})?`
        );

    if (!confirmed) {
        return;
    }


    try {

        const {
            data: applications,
            error: applicationsError
        } = await withTimeout(
            window.rmsSupabase
                .from("applications")
                .select(
                    "application_id"
                )
                .eq(
                    "job_id",
                    job.job_id
                )
                .limit(1),
            8000,
            "Application check timed out."
        );


        if (applicationsError) {
            throw applicationsError;
        }


        if (
            Array.isArray(
                applications
            ) &&
            applications.length > 0
        ) {

            showToast(
                "This job posting has applications and cannot be deleted. Close it instead.",
                "error"
            );

            return;
        }


        const {
            error
        } = await withTimeout(
            window.rmsSupabase
                .from("job_postings")
                .delete()
                .eq(
                    "job_id",
                    job.job_id
                ),
            10000,
            "Deleting job posting timed out."
        );


        if (error) {
            throw error;
        }


        showToast(
            "Job posting deleted successfully."
        );


        await loadJobPostings();

    } catch (error) {

        console.error(
            "Delete job posting error:",
            error
        );

        showToast(
            error.message ||
            "Unable to delete job posting.",
            "error"
        );
    }
}


/* =========================================================
   MODAL HELPERS
   ========================================================= */

function showModal(id) {

    const modal =
        document.getElementById(
            id
        );

    if (!modal) {
        return;
    }

    modal.classList.add(
        "open"
    );

    modal.setAttribute(
        "aria-hidden",
        "false"
    );
}


function hideModal(modal) {

    if (!modal) {
        return;
    }

    modal.classList.remove(
        "open"
    );

    modal.setAttribute(
        "aria-hidden",
        "true"
    );
}


function removeExistingModal(id) {

    const existing =
        document.getElementById(
            id
        );

    if (existing) {
        existing.remove();
    }
}


/* =========================================================
   STATUS
   ========================================================= */

function normalizeStatus(status) {

    return String(
        status || ""
    )
        .trim()
        .toLowerCase();
}


/* =========================================================
   DATE
   ========================================================= */

function formatInputDate(value) {

    if (!value) {
        return "";
    }

    const text =
        String(value);

    if (
        /^\d{4}-\d{2}-\d{2}$/.test(
            text
        )
    ) {
        return text;
    }

    const date =
        new Date(text);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return "";
    }

    return date
        .toISOString()
        .split("T")[0];
}


/* =========================================================
   TIMEOUT
   ========================================================= */

function withTimeout(
    promise,
    milliseconds,
    message
) {

    const timeout =
        new Promise(
            (_, reject) => {

                setTimeout(
                    () => {

                        reject(
                            new Error(
                                message
                            )
                        );

                    },
                    milliseconds
                );

            }
        );

    return Promise.race([
        promise,
        timeout
    ]);
}