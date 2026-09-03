/* =========================================================
   RECRUITMENT MANAGEMENT SYSTEM
   LABORATORY ACTIVITY 4
   JOB POSTING SEARCH AND DETAILS
   ========================================================= */

let positions = [];
let selectedPosition = null;


/* =========================================================
   PAGE INITIALIZATION
   ========================================================= */

document.addEventListener("DOMContentLoaded", async () => {

    try {

        /*
         * Make sure the user is authenticated first.
         */
        const session = await requireAuth();

        if (!session) {
            return;
        }


        /*
         * Render the common sidebar and topbar.
         */
        renderShell({
            active: "Open Positions"
        });


        /*
         * Load the logged-in user's profile.
         *
         * This is not allowed to stop the positions page
         * from loading if the profile request fails.
         */
        try {

            await loadUserProfile();

        } catch (profileError) {

            console.warn(
                "User profile could not be loaded:",
                profileError
            );

        }


        /*
         * Set up search, filters, buttons and modal.
         */
        bindPositionEvents();


        /*
         * Load job postings from Supabase.
         */
        await loadOpenPositions();


    } catch (error) {

        console.error(
            "Open positions initialization error:",
            error
        );

        showToast(
            error.message ||
            "Unable to load open positions.",
            "error"
        );

    }

});


/* =========================================================
   EVENT HANDLERS
   ========================================================= */

function bindPositionEvents() {

    /*
     * Search
     */
    document
        .getElementById("positionSearch")
        ?.addEventListener(
            "input",
            renderPositions
        );


    /*
     * Department filter
     */
    document
        .getElementById("departmentFilter")
        ?.addEventListener(
            "change",
            renderPositions
        );


    /*
     * Employment filter
     */
    document
        .getElementById("employmentFilter")
        ?.addEventListener(
            "change",
            renderPositions
        );


    /*
     * Status filter
     */
    document
        .getElementById("positionStatusFilter")
        ?.addEventListener(
            "change",
            renderPositions
        );


    /*
     * Position cards
     */
    document
        .getElementById("positionsGrid")
        ?.addEventListener(
            "click",
            handlePositionClick
        );


    /*
     * Close modal
     */
    document
        .getElementById("closeDetails")
        ?.addEventListener(
            "click",
            closeDetails
        );


    document
        .getElementById("closeDetailsBottom")
        ?.addEventListener(
            "click",
            closeDetails
        );


    /*
     * Click outside modal
     */
    document
        .getElementById("detailsModal")
        ?.addEventListener(
            "click",
            (event) => {

                if (
                    event.target.id === "detailsModal"
                ) {

                    closeDetails();

                }

            }
        );


    /*
     * Apply from details modal
     */
    document
        .getElementById("applyFromDetails")
        ?.addEventListener(
            "click",
            () => {

                if (selectedPosition) {

                    selectJobForApplication(
                        selectedPosition
                    );

                }

            }
        );


    /*
     * ESC key closes modal
     */
    document.addEventListener(
        "keydown",
        (event) => {

            if (
                event.key === "Escape"
            ) {

                closeDetails();

            }

        }
    );

}


/* =========================================================
   HANDLE POSITION CARD BUTTONS
   ========================================================= */

function handlePositionClick(event) {

    const button =
        event.target.closest(
            "[data-action]"
        );

    if (!button) {
        return;
    }


    const job =
        positions.find(
            (item) =>
                String(item.job_id) ===
                String(button.dataset.id)
        );


    if (!job) {
        return;
    }


    /*
     * View Details
     */
    if (
        button.dataset.action ===
        "details"
    ) {

        openDetails(job);

    }


    /*
     * Apply
     */
    if (
        button.dataset.action ===
        "apply"
    ) {

        selectJobForApplication(job);

    }

}


/* =========================================================
   LOAD JOB POSTINGS FROM SUPABASE
   ========================================================= */

async function loadOpenPositions() {

    const grid =
        document.getElementById(
            "positionsGrid"
        );


    if (!grid) {
        return;
    }


    /*
     * Loading state
     */
    grid.innerHTML = `
        <div
            class="glass-panel position-card position-empty">

            <div class="table-empty">
                Loading available positions...
            </div>

        </div>
    `;


    try {

        /*
         * Get job posting records.
         *
         * This uses the SAME job_postings table
         * created in Laboratory Activity 3.
         */
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
                status
            `)
            .order(
                "posting_date",
                {
                    ascending: false
                }
            );


        /*
         * Supabase error
         */
        if (error) {

            console.error(
                "Supabase error:",
                error
            );

            throw error;

        }


        /*
         * Save data
         */
        positions =
            Array.isArray(data)
                ? data
                : [];


        /*
         * Build Department filter
         */
        populateDepartmentFilter();


        /*
         * Render cards
         */
        renderPositions();


    } catch (error) {

        console.error(
            "Unable to load job postings:",
            error
        );


        grid.innerHTML = `
            <div
                class="glass-panel position-card position-empty">

                <h3>
                    Unable to load positions
                </h3>

                <p>
                    ${escapeHtml(
                        error.message ||
                        "Please try again."
                    )}
                </p>

            </div>
        `;


        document.getElementById(
            "positionCount"
        ).textContent =
            "Unable to load positions.";


        throw error;

    }

}


/* =========================================================
   DEPARTMENT FILTER
   ========================================================= */

function populateDepartmentFilter() {

    const select =
        document.getElementById(
            "departmentFilter"
        );


    if (!select) {
        return;
    }


    /*
     * Remember current selection
     */
    const current =
        select.value;


    /*
     * Get unique departments
     */
    const departments =
        [
            ...new Set(
                positions
                    .map(
                        job =>
                            job.department
                    )
                    .filter(Boolean)
            )
        ]
        .sort(
            (a, b) =>
                a.localeCompare(b)
        );


    /*
     * Rebuild options
     */
    select.innerHTML =
        `
        <option value="">
            All departments
        </option>
        `

        +

        departments
            .map(
                department =>
                    `
                    <option
                        value="${escapeHtml(
                            department
                        )}">
                        ${escapeHtml(
                            department
                        )}
                    </option>
                    `
            )
            .join("");


    /*
     * Restore selection
     */
    if (
        departments.includes(
            current
        )
    ) {

        select.value =
            current;

    }

}


/* =========================================================
   RENDER POSITIONS
   ========================================================= */

function renderPositions() {

    const grid =
        document.getElementById(
            "positionsGrid"
        );


    if (!grid) {
        return;
    }


    /*
     * Search
     */
    const query =
        document.getElementById(
            "positionSearch"
        )
        ?.value
        .trim()
        .toLowerCase()
        || "";


    /*
     * Department
     */
    const department =
        document.getElementById(
            "departmentFilter"
        )
        ?.value
        || "";


    /*
     * Employment
     */
    const employment =
        document.getElementById(
            "employmentFilter"
        )
        ?.value
        || "";


    /*
     * Status
     */
    const status =
        document.getElementById(
            "positionStatusFilter"
        )
        ?.value
        ?? "Open";


    /*
     * Filter positions
     */
    const filtered =
        positions.filter(
            job => {

                const haystack =
                    `
                    ${job.job_code || ""}
                    ${job.job_title || ""}
                    ${job.department || ""}
                    `
                    .toLowerCase();


                const matchesSearch =
                    !query ||
                    haystack.includes(
                        query
                    );


                const matchesDepartment =
                    !department ||
                    job.department ===
                        department;


                const matchesEmployment =
                    !employment ||
                    job.employment_type ===
                        employment;


                const matchesStatus =
                    !status ||
                    job.status ===
                        status;


                return (
                    matchesSearch &&
                    matchesDepartment &&
                    matchesEmployment &&
                    matchesStatus
                );

            }
        );


    /*
     * Position count
     */
    const count =
        document.getElementById(
            "positionCount"
        );


    if (count) {

        count.textContent =
            `${filtered.length} position${
                filtered.length === 1
                    ? ""
                    : "s"
            } shown`;

    }


    /*
     * No results
     */
    if (!filtered.length) {

        grid.innerHTML = `
            <div
                class="
                    glass-panel
                    position-card
                    position-empty
                ">

                <div
                    class="empty-icon"
                    style="margin:0 auto 8px;">

                    ⌕

                </div>

                <h3>
                    No positions found
                </h3>

                <p>
                    Try changing your search
                    or filters.
                </p>

            </div>
        `;

        return;

    }


    /*
     * Build cards
     */
    grid.innerHTML =
        filtered
            .map(
                job =>
                    createPositionCard(
                        job
                    )
            )
            .join("");

}


/* =========================================================
   CREATE POSITION CARD
   ========================================================= */

function createPositionCard(job) {

    const isOpen =
        job.status === "Open";


    const applyButton =
        isOpen
            ? `
                <button
                    class="btn btn-primary"
                    data-action="apply"
                    data-id="${job.job_id}">

                    Apply

                </button>
            `
            : "";


    return `
        <article
            class="glass-panel position-card">

            <!-- TOP -->
            <div class="position-top">

                <div>

                    <div class="job-code">
                        ${escapeHtml(
                            job.job_code
                        )}
                    </div>

                    <h3>
                        ${escapeHtml(
                            job.job_title
                        )}
                    </h3>

                </div>


                ${statusBadge(
                    job.status
                )}

            </div>


            <!-- INFORMATION -->
            <div class="position-meta">

                <span>
                    ◈
                    ${escapeHtml(
                        job.department
                    )}
                </span>

                <span>
                    ◷
                    ${escapeHtml(
                        job.employment_type
                    )}
                </span>

                <span>
                    ▣
                    ${job.vacancies}
                    ${
                        Number(
                            job.vacancies
                        ) === 1
                            ? "Vacancy"
                            : "Vacancies"
                    }
                </span>

                <span>
                    ⌁
                    Closing Date:
                    ${formatDate(
                        job.closing_date
                    )}
                </span>

            </div>


            <!-- DESCRIPTION -->
            <p class="position-summary">

                ${escapeHtml(
                    shorten(
                        job.description ||
                        "No job description provided.",
                        130
                    )
                )}

            </p>


            <!-- ACTIONS -->
            <div class="position-actions">

                <button
                    class="btn btn-secondary"
                    data-action="details"
                    data-id="${job.job_id}">

                    View Details

                </button>

                ${applyButton}

            </div>

        </article>
    `;

}


/* =========================================================
   OPEN DETAILS MODAL
   ========================================================= */

function openDetails(job) {

    selectedPosition =
        job;


    /*
     * Modal title
     */
    document.getElementById(
        "detailsCode"
    ).textContent =
        job.job_code;


    document.getElementById(
        "detailsTitle"
    ).textContent =
        job.job_title;


    /*
     * Modal content
     */
    document.getElementById(
        "detailsBody"
    ).innerHTML = `

        <div class="details-grid">

            <!-- DEPARTMENT -->
            <div class="detail-block">

                <small>
                    Department
                </small>

                <strong>
                    ${escapeHtml(
                        job.department
                    )}
                </strong>

            </div>


            <!-- EMPLOYMENT -->
            <div class="detail-block">

                <small>
                    Employment Type
                </small>

                <strong>
                    ${escapeHtml(
                        job.employment_type
                    )}
                </strong>

            </div>


            <!-- VACANCIES -->
            <div class="detail-block">

                <small>
                    Vacancies
                </small>

                <strong>
                    ${job.vacancies}
                </strong>

            </div>


            <!-- STATUS -->
            <div class="detail-block">

                <small>
                    Status
                </small>

                <strong>
                    ${statusBadge(
                        job.status
                    )}
                </strong>

            </div>


            <!-- POSTING DATE -->
            <div class="detail-block">

                <small>
                    Posting Date
                </small>

                <strong>
                    ${formatDate(
                        job.posting_date
                    )}
                </strong>

            </div>


            <!-- CLOSING DATE -->
            <div class="detail-block">

                <small>
                    Closing Date
                </small>

                <strong>
                    ${formatDate(
                        job.closing_date
                    )}
                </strong>

            </div>


            <!-- DESCRIPTION -->
            <div
                class="
                    detail-block
                    detail-full
                ">

                <small>
                    Job Description
                </small>

                <div
                    class="modal-description">

                    ${escapeHtml(
                        job.description ||
                        "No job description provided."
                    )}

                </div>

            </div>


            <!-- QUALIFICATIONS -->
            <div
                class="
                    detail-block
                    detail-full
                ">

                <small>
                    Qualifications
                </small>

                <div
                    class="modal-description">

                    ${escapeHtml(
                        job.qualifications ||
                        "No qualifications provided."
                    )}

                </div>

            </div>

        </div>
    `;


    /*
     * Apply button is only available
     * for Open positions.
     */
    const applyButton =
        document.getElementById(
            "applyFromDetails"
        );


    if (applyButton) {

        applyButton.style.display =
            job.status === "Open"
                ? "inline-flex"
                : "none";

    }


    /*
     * Show modal
     */
    const modal =
        document.getElementById(
            "detailsModal"
        );


    modal.classList.add(
        "open"
    );


    modal.setAttribute(
        "aria-hidden",
        "false"
    );

}


/* =========================================================
   CLOSE DETAILS MODAL
   ========================================================= */

function closeDetails() {

    const modal =
        document.getElementById(
            "detailsModal"
        );


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


/* =========================================================
   APPLY BUTTON
   ========================================================= */

function selectJobForApplication(job) {

    /*
     * Only open jobs can be applied for.
     */
    if (
        job.status !==
        "Open"
    ) {

        showToast(
            "Only open positions can be selected for an application.",
            "error"
        );

        return;

    }


    /*
     * Save the selected job.
     *
     * This is important for the next
     * laboratory activity.
     *
     * The actual application record
     * will later use this job_id.
     */
    const selectedJob = {

        job_id:
            job.job_id,

        job_code:
            job.job_code,

        job_title:
            job.job_title,

        department:
            job.department,

        selected_at:
            new Date().toISOString()

    };


    localStorage.setItem(
        "rms_selected_job",
        JSON.stringify(
            selectedJob
        )
    );


    /*
     * Close details modal
     */
    closeDetails();


    /*
     * Notify user
     */
    showToast(
        `${job.job_title} selected. This job is now ready to become the basis of an applicant application.`
    );

}


/* =========================================================
   SHORTEN TEXT
   ========================================================= */

function shorten(
    value,
    maxLength
) {

    const text =
        String(
            value || ""
        ).trim();


    if (
        text.length <=
        maxLength
    ) {

        return text;

    }


    return (
        text.slice(
            0,
            maxLength - 1
        ) + "…"
    );

}


/* =========================================================
   SAFE HTML ESCAPING
   ========================================================= */

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