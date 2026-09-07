/* =========================================================
   RMS - JOB POSTINGS
   Job Posting Management
   ========================================================= */

let jobPostings = [];
let editingJobId = null;
let pendingDeleteJob = null;


/* =========================================================
   DOM READY
   ========================================================= */

document.addEventListener("DOMContentLoaded", async () => {
    try {
        if (typeof renderShell === "function") {
            renderShell({
                active: "Job Postings"
            });
        }

        const session = await requireAuth();

        if (!session) {
            return;
        }

        setupEvents();
        createDeleteConfirmModal();

        await loadJobPostings();

    } catch (error) {
        console.error("Job Postings initialization error:", error);

        showToast(
            "Unable to load Job Postings.",
            "error"
        );
    }
});


/* =========================================================
   EVENT SETUP
   ========================================================= */

function setupEvents() {

    // Add Job Posting
    document
        .getElementById("openAddModal")
        ?.addEventListener("click", () => {
            openAddModal();
        });


    // Search
    document
        .getElementById("jobSearch")
        ?.addEventListener("input", () => {
            renderJobPostings();
        });


    // Status Filter
    document
        .getElementById("statusFilter")
        ?.addEventListener("change", () => {
            renderJobPostings();
        });


    // Close Add/Edit Modal
    document
        .getElementById("closeJobModal")
        ?.addEventListener("click", () => {
            closeJobModal();
        });


    document
        .getElementById("cancelJobModal")
        ?.addEventListener("click", () => {
            closeJobModal();
        });


    // Job Form
    document
        .getElementById("jobPostingForm")
        ?.addEventListener("submit", handleJobSubmit);


    // View Modal Close
    document
        .getElementById("closeViewJobModal")
        ?.addEventListener("click", () => {
            closeViewJobModal();
        });


    document
        .getElementById("closeViewJob")
        ?.addEventListener("click", () => {
            closeViewJobModal();
        });


    // Escape key
    document.addEventListener("keydown", (event) => {
        if (event.key !== "Escape") {
            return;
        }

        closeJobModal();
        closeViewJobModal();
        closeDeleteConfirm();
    });
}


/* =========================================================
   LOAD JOB POSTINGS
   ========================================================= */

async function loadJobPostings() {

    const tableBody = document.getElementById("jobsTable");

    if (tableBody) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="9" class="table-empty">
                    Loading job postings...
                </td>
            </tr>
        `;
    }

    try {

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
            .order("created_at", {
                ascending: false
            });

        if (error) {
            throw error;
        }

        jobPostings = Array.isArray(data)
            ? data
            : [];

        renderJobPostings();

    } catch (error) {

        console.error(
            "Error loading job postings:",
            error
        );

        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="9" class="table-empty">
                        Failed to load job postings.
                    </td>
                </tr>
            `;
        }

        showToast(
            "Failed to load job postings.",
            "error"
        );
    }
}


/* =========================================================
   RENDER JOB POSTINGS
   ========================================================= */

function renderJobPostings() {

    const tableBody =
        document.getElementById("jobsTable");

    if (!tableBody) {
        return;
    }


    const searchInput =
        document.getElementById("jobSearch");

    const statusFilter =
        document.getElementById("statusFilter");


    const search =
        String(searchInput?.value || "")
            .trim()
            .toLowerCase();

    const selectedStatus =
        String(statusFilter?.value || "All")
            .trim()
            .toLowerCase();


    let filteredJobs = [...jobPostings];


    // Search filter
    if (search) {

        filteredJobs = filteredJobs.filter(job => {

            const searchableText = [
                job.job_code,
                job.job_title,
                job.department,
                job.employment_type,
                job.description,
                job.qualifications
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

            return searchableText.includes(search);
        });
    }


    // Status filter
    if (selectedStatus && selectedStatus !== "all") {

        filteredJobs = filteredJobs.filter(job => {

            const status =
                normalizeStatus(job.status);

            return status.toLowerCase() === selectedStatus;
        });
    }


    if (filteredJobs.length === 0) {

        tableBody.innerHTML = `
            <tr>
                <td colspan="9" class="table-empty">
                    No job postings found.
                </td>
            </tr>
        `;

        return;
    }


    tableBody.innerHTML = filteredJobs
        .map(job => createJobRow(job))
        .join("");
}


/* =========================================================
   CREATE TABLE ROW
   ========================================================= */

function createJobRow(job) {

    const status =
        normalizeStatus(job.status);

    const statusClass =
        status.toLowerCase() === "open"
            ? "status-open"
            : "status-closed";


    return `
        <tr>

            <td>
                ${escapeHtml(job.job_code || "—")}
            </td>

            <td>
                <strong>
                    ${escapeHtml(job.job_title || "—")}
                </strong>
            </td>

            <td>
                ${escapeHtml(job.department || "—")}
            </td>

            <td>
                ${escapeHtml(job.employment_type || "—")}
            </td>

            <td>
                ${escapeHtml(
                    String(job.vacancies ?? "—")
                )}
            </td>

            <td>
                ${formatDate(job.posting_date)}
            </td>

            <td>
                ${formatDate(job.closing_date)}
            </td>

            <td>
                <span class="status-badge ${statusClass}">
                    ${escapeHtml(status)}
                </span>
            </td>

            <td>
                <div class="table-actions">

                    <button
                        type="button"
                        class="action-btn view"
                        onclick="viewJobPosting('${escapeJs(job.job_id)}')"
                        title="View"
                    >
                        View
                    </button>

                    <button
                        type="button"
                        class="action-btn edit"
                        onclick="editJobPosting('${escapeJs(job.job_id)}')"
                        title="Edit"
                    >
                        Edit
                    </button>

                    <button
                        type="button"
                        class="action-btn delete"
                        onclick="deleteJobPosting('${escapeJs(job.job_id)}')"
                        title="Delete"
                    >
                        Delete
                    </button>

                </div>
            </td>

        </tr>
    `;
}


/* =========================================================
   ADD MODAL
   ========================================================= */

function openAddModal() {

    editingJobId = null;

    const form =
        document.getElementById("jobPostingForm");

    if (form) {
        form.reset();
    }


    // Set default status
    const statusField =
        document.getElementById("jobStatus");

    if (statusField) {
        statusField.value = "Open";
    }


    // Set current date
    const postingDate =
        document.getElementById("postingDate");

    if (postingDate && !postingDate.value) {

        const today =
            new Date();

        postingDate.value =
            toInputDate(today);
    }


    setModalTitle(
        "Add Job Posting"
    );

    showJobModal();
}


/* =========================================================
   EDIT JOB POSTING
   ========================================================= */

function editJobPosting(jobId) {

    const job =
        jobPostings.find(
            item =>
                String(item.job_id) === String(jobId)
        );

    if (!job) {

        showToast(
            "Job posting not found.",
            "error"
        );

        return;
    }


    editingJobId = job.job_id;


    setFieldValue(
        "jobCode",
        job.job_code
    );

    setFieldValue(
        "jobTitle",
        job.job_title
    );

    setFieldValue(
        "department",
        job.department
    );

    setFieldValue(
        "employmentType",
        job.employment_type
    );

    setFieldValue(
        "vacancies",
        job.vacancies
    );

    setFieldValue(
        "postingDate",
        toInputDate(job.posting_date)
    );

    setFieldValue(
        "closingDate",
        toInputDate(job.closing_date)
    );

    setFieldValue(
        "jobStatus",
        normalizeStatus(job.status)
    );

    setFieldValue(
        "jobDescription",
        job.description
    );

    setFieldValue(
        "qualifications",
        job.qualifications
    );


    setModalTitle(
        "Edit Job Posting"
    );

    showJobModal();
}


/* =========================================================
   JOB FORM SUBMIT
   ========================================================= */

async function handleJobSubmit(event) {

    event.preventDefault();


    const jobCode =
        getFieldValue("jobCode");

    const jobTitle =
        getFieldValue("jobTitle");

    const department =
        getFieldValue("department");

    const employmentType =
        getFieldValue("employmentType");

    const vacancies =
        Number(
            getFieldValue("vacancies")
        );

    const postingDate =
        getFieldValue("postingDate");

    const closingDate =
        getFieldValue("closingDate");

    const status =
        normalizeStatus(
            getFieldValue("jobStatus")
        );

    const description =
        getFieldValue("jobDescription");

    const qualifications =
        getFieldValue("qualifications");


    // =========================================
    // VALIDATION
    // =========================================

    if (!jobCode) {
        showToast(
            "Please enter the Job Code.",
            "error"
        );
        return;
    }


    if (!jobTitle) {
        showToast(
            "Please enter the Position.",
            "error"
        );
        return;
    }


    if (!department) {
        showToast(
            "Please enter the Department.",
            "error"
        );
        return;
    }


    if (!employmentType) {
        showToast(
            "Please select the Employment Type.",
            "error"
        );
        return;
    }


    if (!Number.isInteger(vacancies) ||
        vacancies < 1) {

        showToast(
            "Vacancies must be at least 1.",
            "error"
        );

        return;
    }


    if (!postingDate) {

        showToast(
            "Please select the Posting Date.",
            "error"
        );

        return;
    }


    if (!closingDate) {

        showToast(
            "Please select the Closing Date.",
            "error"
        );

        return;
    }


    if (closingDate < postingDate) {

        showToast(
            "Closing Date cannot be earlier than Posting Date.",
            "error"
        );

        return;
    }


    if (!description) {

        showToast(
            "Please enter the Job Description.",
            "error"
        );

        return;
    }


    if (!qualifications) {

        showToast(
            "Please enter the Qualifications.",
            "error"
        );

        return;
    }


    // =========================================
    // DATA
    // =========================================

    const jobData = {
        job_code: jobCode,
        job_title: jobTitle,
        department: department,
        employment_type: employmentType,
        vacancies: vacancies,
        posting_date: postingDate,
        closing_date: closingDate,
        status: status,
        description: description,
        qualifications: qualifications
    };


    const submitButton =
        document.querySelector(
            '#jobPostingForm button[type="submit"]'
        );


    const originalButtonText =
        submitButton?.textContent;


    if (submitButton) {

        submitButton.disabled = true;

        submitButton.textContent =
            editingJobId
                ? "Saving..."
                : "Creating...";
    }


    try {

        let result;


        if (editingJobId) {

            result =
                await window.rmsSupabase
                    .from("job_postings")
                    .update(jobData)
                    .eq(
                        "job_id",
                        editingJobId
                    );

        } else {

            result =
                await window.rmsSupabase
                    .from("job_postings")
                    .insert([
                        jobData
                    ]);
        }


        if (result.error) {
            throw result.error;
        }


        closeJobModal();


        showToast(
            editingJobId
                ? "Job posting updated successfully."
                : "Job posting created successfully.",
            "success"
        );


        editingJobId = null;


        await loadJobPostings();


    } catch (error) {

        console.error(
            "Save job posting error:",
            error
        );

        // Show the actual Supabase error
        const message =
            error?.message ||
            "Failed to save job posting.";

        showToast(
            message,
            "error"
        );

    } finally {

        if (submitButton) {

            submitButton.disabled =
                false;

            submitButton.textContent =
                originalButtonText ||
                "Create Job Posting";
        }
    }
}


/* =========================================================
   VIEW JOB POSTING
   ========================================================= */

function viewJobPosting(jobId) {

    const job =
        jobPostings.find(
            item =>
                String(item.job_id) === String(jobId)
        );


    if (!job) {

        showToast(
            "Job posting not found.",
            "error"
        );

        return;
    }


    const body =
        document.getElementById(
            "viewJobBody"
        );


    if (!body) {
        return;
    }


    body.innerHTML = `

        <div class="profile-item">
            <span class="profile-label">
                Job Code
            </span>

            <strong>
                ${escapeHtml(job.job_code || "—")}
            </strong>
        </div>


        <div class="profile-item">
            <span class="profile-label">
                Position
            </span>

            <strong>
                ${escapeHtml(job.job_title || "—")}
            </strong>
        </div>


        <div class="profile-item">
            <span class="profile-label">
                Department
            </span>

            <strong>
                ${escapeHtml(job.department || "—")}
            </strong>
        </div>


        <div class="profile-item">
            <span class="profile-label">
                Employment Type
            </span>

            <strong>
                ${escapeHtml(job.employment_type || "—")}
            </strong>
        </div>


        <div class="profile-item">
            <span class="profile-label">
                Vacancies
            </span>

            <strong>
                ${escapeHtml(
                    String(job.vacancies ?? "—")
                )}
            </strong>
        </div>


        <div class="profile-item">
            <span class="profile-label">
                Status
            </span>

            <strong>
                ${escapeHtml(
                    normalizeStatus(job.status)
                )}
            </strong>
        </div>


        <div class="profile-item">
            <span class="profile-label">
                Posting Date
            </span>

            <strong>
                ${formatDate(job.posting_date)}
            </strong>
        </div>


        <div class="profile-item">
            <span class="profile-label">
                Closing Date
            </span>

            <strong>
                ${formatDate(job.closing_date)}
            </strong>
        </div>


        <div class="profile-item profile-item-full">
            <span class="profile-label">
                Job Description
            </span>

            <div>
                ${escapeHtml(
                    job.description || "—"
                ).replace(/\n/g, "<br>")}
            </div>
        </div>


        <div class="profile-item profile-item-full">
            <span class="profile-label">
                Qualifications
            </span>

            <div>
                ${escapeHtml(
                    job.qualifications || "—"
                ).replace(/\n/g, "<br>")}
            </div>
        </div>

    `;


    showViewJobModal();
}


/* =========================================================
   DELETE CONFIRMATION
   ========================================================= */

function createDeleteConfirmModal() {

    // Prevent duplicate creation
    if (
        document.getElementById(
            "deleteConfirmModal"
        )
    ) {
        setupDeleteConfirmEvents();
        return;
    }


    const modal =
        document.createElement("div");


    modal.id =
        "deleteConfirmModal";

    modal.className =
        "modal-backdrop";

    modal.setAttribute(
        "aria-hidden",
        "true"
    );


    modal.innerHTML = `

        <div
            class="modal glass-panel delete-confirm-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="deleteConfirmTitle"
        >

            <div class="modal-head">

                <div>

                    <div class="modal-eyebrow">
                        VACANCY MANAGEMENT
                    </div>

                    <h2 id="deleteConfirmTitle">
                        Delete Job Posting
                    </h2>

                </div>


                <button
                    type="button"
                    class="icon-button"
                    id="closeDeleteConfirm"
                    aria-label="Close"
                >
                    ×
                </button>

            </div>


            <div class="delete-confirm-content">

                <p id="deleteConfirmMessage">
                    Are you sure you want to delete this job posting?
                </p>

            </div>


            <div class="button-row delete-confirm-actions">

                <button
                    type="button"
                    class="btn secondary"
                    id="cancelDeleteConfirm"
                >
                    Cancel
                </button>


                <button
                    type="button"
                    class="btn danger"
                    id="confirmDeleteJob"
                >
                    Delete Job Posting
                </button>

            </div>

        </div>

    `;


    document.body.appendChild(modal);

    setupDeleteConfirmEvents();
}


/* =========================================================
   DELETE CONFIRM EVENTS
   ========================================================= */

function setupDeleteConfirmEvents() {

    document
        .getElementById("closeDeleteConfirm")
        ?.addEventListener(
            "click",
            closeDeleteConfirm
        );


    document
        .getElementById("cancelDeleteConfirm")
        ?.addEventListener(
            "click",
            closeDeleteConfirm
        );


    document
        .getElementById("confirmDeleteJob")
        ?.addEventListener(
            "click",
            confirmDeleteJob
        );


    const modal =
        document.getElementById(
            "deleteConfirmModal"
        );


    modal?.addEventListener(
        "click",
        (event) => {

            if (
                event.target === modal
            ) {
                closeDeleteConfirm();
            }
        }
    );
}


/* =========================================================
   OPEN DELETE CONFIRM
   ========================================================= */

function deleteJobPosting(jobId) {

    const job =
        jobPostings.find(
            item =>
                String(item.job_id) === String(jobId)
        );


    if (!job) {

        showToast(
            "Job posting not found.",
            "error"
        );

        return;
    }


    pendingDeleteJob = job;


    const message =
        document.getElementById(
            "deleteConfirmMessage"
        );


    if (message) {

        message.textContent =
            `Are you sure you want to delete "${job.job_title} (${job.job_code})"?`;
    }


    const modal =
        document.getElementById(
            "deleteConfirmModal"
        );


    if (modal) {

        modal.classList.add("open");

        modal.setAttribute(
            "aria-hidden",
            "false"
        );
    }
}


/* =========================================================
   CLOSE DELETE CONFIRM
   ========================================================= */

function closeDeleteConfirm() {

    pendingDeleteJob = null;


    const modal =
        document.getElementById(
            "deleteConfirmModal"
        );


    if (modal) {

        modal.classList.remove("open");

        modal.setAttribute(
            "aria-hidden",
            "true"
        );
    }
}


/* =========================================================
   CONFIRM DELETE
   ========================================================= */

async function confirmDeleteJob() {

    if (!pendingDeleteJob) {

        closeDeleteConfirm();

        return;
    }


    const job =
        pendingDeleteJob;


    const jobId =
        job.job_id;


    const confirmButton =
        document.getElementById(
            "confirmDeleteJob"
        );


    const originalText =
        confirmButton?.textContent;


    if (confirmButton) {

        confirmButton.disabled =
            true;

        confirmButton.textContent =
            "Deleting...";
    }


    try {

        const {
            error
        } = await window.rmsSupabase
            .from("job_postings")
            .delete()
            .eq(
                "job_id",
                jobId
            );


        if (error) {
            throw error;
        }


        closeDeleteConfirm();


        showToast(
            "Job posting deleted successfully.",
            "success"
        );


        await loadJobPostings();


    } catch (error) {

        console.error(
            "Delete job posting error:",
            error
        );


        let message =
            "Failed to delete job posting.";


        // Foreign key protection
        if (
            error?.code === "23503" ||
            String(error?.message || "")
                .toLowerCase()
                .includes("foreign key")
        ) {

            message =
                "This job posting cannot be deleted because it is already being used by another record.";
        }


        showToast(
            message,
            "error"
        );

    } finally {

        if (confirmButton) {

            confirmButton.disabled =
                false;

            confirmButton.textContent =
                originalText ||
                "Delete Job Posting";
        }
    }
}


/* =========================================================
   MODAL HELPERS
   ========================================================= */

function showJobModal() {

    const modal =
        document.getElementById(
            "jobPostingModal"
        );


    if (!modal) {
        return;
    }


    modal.classList.add("open");

    modal.setAttribute(
        "aria-hidden",
        "false"
    );
}


function closeJobModal() {

    const modal =
        document.getElementById(
            "jobPostingModal"
        );


    if (!modal) {
        return;
    }


    modal.classList.remove("open");

    modal.setAttribute(
        "aria-hidden",
        "true"
    );
}


function showViewJobModal() {

    const modal =
        document.getElementById(
            "viewJobModal"
        );


    if (!modal) {
        return;
    }


    modal.classList.add("open");

    modal.setAttribute(
        "aria-hidden",
        "false"
    );
}


function closeViewJobModal() {

    const modal =
        document.getElementById(
            "viewJobModal"
        );


    if (!modal) {
        return;
    }


    modal.classList.remove("open");

    modal.setAttribute(
        "aria-hidden",
        "true"
    );
}


/* =========================================================
   MODAL TITLE
   ========================================================= */

function setModalTitle(title) {

    const titleElement =
        document.getElementById(
            "jobModalTitle"
        );


    if (titleElement) {
        titleElement.textContent =
            title;
    }


    const submitButton =
        document.querySelector(
            '#jobPostingForm button[type="submit"]'
        );


    if (submitButton) {

        submitButton.textContent =
            title.startsWith("Edit")
                ? "Save Changes"
                : "Create Job Posting";
    }
}


/* =========================================================
   FORM HELPERS
   ========================================================= */

function getFieldValue(id) {

    const element =
        document.getElementById(id);


    if (!element) {
        return "";
    }


    return String(
        element.value || ""
    ).trim();
}


function setFieldValue(id, value) {

    const element =
        document.getElementById(id);


    if (!element) {
        return;
    }


    element.value =
        value ?? "";
}


/* =========================================================
   STATUS NORMALIZATION
   ========================================================= */

function normalizeStatus(status) {

    const value =
        String(status || "")
            .trim()
            .toLowerCase();


    if (
        value === "active" ||
        value === "open"
    ) {
        return "Open";
    }


    if (
        value === "inactive" ||
        value === "closed"
    ) {
        return "Closed";
    }


    if (!value) {
        return "Open";
    }


    return (
        value.charAt(0).toUpperCase() +
        value.slice(1)
    );
}


/* =========================================================
   DATE HELPERS
   ========================================================= */

function formatDate(value) {

    if (!value) {
        return "—";
    }


    const date =
        new Date(value);


    if (Number.isNaN(date.getTime())) {
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


function toInputDate(value) {

    if (!value) {
        return "";
    }


    const date =
        new Date(value);


    if (Number.isNaN(date.getTime())) {
        return "";
    }


    const year =
        date.getFullYear();


    const month =
        String(
            date.getMonth() + 1
        ).padStart(2, "0");


    const day =
        String(
            date.getDate()
        ).padStart(2, "0");


    return `${year}-${month}-${day}`;
}


/* =========================================================
   TOAST
   ========================================================= */

function showToast(
    message,
    type = "info"
) {

    const root =
        document.getElementById(
            "toastRoot"
        );


    if (!root) {
        return;
    }


    const toast =
        document.createElement("div");


    toast.className =
        `toast toast-${type}`;


    toast.textContent =
        message;


    root.appendChild(toast);


    requestAnimationFrame(() => {

        toast.classList.add(
            "show"
        );

    });


    setTimeout(() => {

        toast.classList.remove(
            "show"
        );


        setTimeout(() => {

            toast.remove();

        }, 250);


    }, 3500);
}


/* =========================================================
   ESCAPE HTML
   ========================================================= */

function escapeHtml(value) {

    return String(
        value ?? ""
    )
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/* =========================================================
   ESCAPE JS
   ========================================================= */

function escapeJs(value) {

    return String(
        value ?? ""
    )
        .replace(/\\/g, "\\\\")
        .replace(/'/g, "\\'");
}


/* =========================================================
   EXPORT
   ========================================================= */

window.loadJobPostings =
    loadJobPostings;

window.renderJobPostings =
    renderJobPostings;

window.openAddModal =
    openAddModal;

window.editJobPosting =
    editJobPosting;

window.viewJobPosting =
    viewJobPosting;

window.deleteJobPosting =
    deleteJobPosting;

window.closeDeleteConfirm =
    closeDeleteConfirm;

window.confirmDeleteJob =
    confirmDeleteJob;