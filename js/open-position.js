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

document.addEventListener(
    "DOMContentLoaded",
    initOpenPositions
);


async function initOpenPositions() {

    try {

        /*
         * IMPORTANT:
         *
         * Render the common shell first so the page
         * does not remain blank while authentication
         * is being checked.
         */
        renderShell({
            active: "Open Positions"
        });


        /*
         * Make sure the user is authenticated.
         */
        const session =
            await requireAuth();

        if (!session) {
            return;
        }


        /*
         * IMPORTANT:
         *
         * Do NOT wait for the profile request.
         * A profile problem should never prevent
         * Open Positions from loading.
         */
        if (
            typeof loadUserProfile ===
            "function"
        ) {

            loadUserProfile()
                .catch(
                    error => {

                        console.warn(
                            "User profile could not be loaded:",
                            error
                        );

                    }
                );

        }


        /*
         * Bind page events.
         */
        bindPositionEvents();


        /*
         * Load the positions immediately.
         */
        await loadOpenPositions();


    } catch (error) {

        console.error(
            "Open positions initialization error:",
            error
        );


        showToast(
            error?.message ||
            "Unable to load open positions.",
            "error"
        );

    }

}


/* =========================================================
   EVENT HANDLERS
   ========================================================= */

function bindPositionEvents() {

    /*
     * Search
     */
    document
        .getElementById(
            "positionSearch"
        )
        ?.addEventListener(
            "input",
            renderPositions
        );


    /*
     * Department filter
     */
    document
        .getElementById(
            "departmentFilter"
        )
        ?.addEventListener(
            "change",
            renderPositions
        );


    /*
     * Employment filter
     */
    document
        .getElementById(
            "employmentFilter"
        )
        ?.addEventListener(
            "change",
            renderPositions
        );


    /*
     * Status filter
     */
    document
        .getElementById(
            "positionStatusFilter"
        )
        ?.addEventListener(
            "change",
            renderPositions
        );


    /*
     * Position cards
     */
    document
        .getElementById(
            "positionsGrid"
        )
        ?.addEventListener(
            "click",
            handlePositionClick
        );


    /*
     * Close details
     */
    document
        .getElementById(
            "closeDetails"
        )
        ?.addEventListener(
            "click",
            closeDetails
        );


    document
        .getElementById(
            "closeDetailsBottom"
        )
        ?.addEventListener(
            "click",
            closeDetails
        );


    /*
     * Click outside modal
     */
    document
        .getElementById(
            "detailsModal"
        )
        ?.addEventListener(
            "click",
            event => {

                if (
                    event.target.id ===
                    "detailsModal"
                ) {

                    closeDetails();

                }

            }
        );


    /*
     * Apply from modal
     */
    document
        .getElementById(
            "applyFromDetails"
        )
        ?.addEventListener(
            "click",
            () => {

                if (
                    selectedPosition
                ) {

                    selectJobForApplication(
                        selectedPosition
                    );

                }

            }
        );


    /*
     * ESC closes details modal.
     */
    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key ===
                "Escape"
            ) {

                closeDetails();

            }

        }
    );

}


/* =========================================================
   HANDLE POSITION CARD BUTTONS
   ========================================================= */

function handlePositionClick(
    event
) {

    const button =
        event.target.closest(
            "[data-action]"
        );


    if (!button) {
        return;
    }


    const job =
        positions.find(
            item =>
                String(
                    item.job_id
                ) ===
                String(
                    button.dataset.id
                )
        );


    if (!job) {

        showToast(
            "Position record not found.",
            "error"
        );

        return;

    }


    const action =
        button.dataset.action;


    /*
     * View details
     */
    if (
        action ===
        "details"
    ) {

        openDetails(
            job
        );

        return;

    }


    /*
     * Apply
     */
    if (
        action ===
        "apply"
    ) {

        selectJobForApplication(
            job
        );

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

        console.error(
            "positionsGrid element was not found."
        );

        return;

    }


    /*
     * Loading state
     */
    grid.innerHTML = `
        <div
            class="glass-panel position-card position-empty"
        >

            <div class="table-empty">
                Loading available positions...
            </div>

        </div>
    `;


    try {

        /*
         * Make sure Supabase exists.
         */
        if (
            !window.rmsSupabase
        ) {

            throw new Error(
                "Supabase client is not initialized."
            );

        }


        /*
         * Query job postings.
         *
         * Laboratory Activity 3
         * creates/manages these records.
         *
         * Laboratory Activity 4
         * displays them here.
         */
        const {
            data,
            error
        } =
            await window.rmsSupabase
                .from(
                    "job_postings"
                )
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
                        ascending:
                            false
                    }
                );


        /*
         * Supabase returned an error.
         */
        if (error) {

            console.error(
                "Supabase job_postings error:",
                error
            );

            throw error;

        }


        /*
         * Save records.
         */
        positions =
            Array.isArray(
                data
            )
                ? data
                : [];


        console.log(
            "Open Positions loaded:",
            positions
        );


        /*
         * Populate department filter.
         */
        populateDepartmentFilter();


        /*
         * Render positions.
         */
        renderPositions();


    } catch (error) {

        console.error(
            "Unable to load job postings:",
            error
        );


        positions = [];


        grid.innerHTML = `
            <div
                class="glass-panel position-card position-empty"
            >

                <h3>
                    Unable to load positions
                </h3>

                <p>
                    ${escapeHtml(
                        error?.message ||
                        "Please try again."
                    )}
                </p>

            </div>
        `;


        const count =
            document.getElementById(
                "positionCount"
            );


        if (count) {

            count.textContent =
                "Unable to load positions.";

        }


        showToast(
            error?.message ||
            "Unable to load positions.",
            "error"
        );

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
     * Remember current value.
     */
    const current =
        select.value;


    /*
     * Unique departments.
     */
    const departments =
        [
            ...new Set(
                positions
                    .map(
                        job =>
                            String(
                                job.department ||
                                ""
                            ).trim()
                    )
                    .filter(Boolean)
            )
        ]
        .sort(
            (a, b) =>
                a.localeCompare(b)
        );


    /*
     * Rebuild filter.
     */
    select.innerHTML = `
        <option value="">
            All departments
        </option>

        ${
            departments
                .map(
                    department => `
                        <option
                            value="${escapeHtml(
                                department
                            )}"
                        >
                            ${escapeHtml(
                                department
                            )}
                        </option>
                    `
                )
                .join("")
        }
    `;


    /*
     * Restore previous selection.
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
        String(
            document.getElementById(
                "positionSearch"
            )?.value ||
            ""
        )
            .trim()
            .toLowerCase();


    /*
     * Department
     */
    const department =
        String(
            document.getElementById(
                "departmentFilter"
            )?.value ||
            ""
        ).trim();


    /*
     * Employment type
     */
    const employment =
        String(
            document.getElementById(
                "employmentFilter"
            )?.value ||
            ""
        ).trim();


    /*
     * Status
     *
     * Default is Open.
     */
    const statusSelect =
        document.getElementById(
            "positionStatusFilter"
        );


    const status =
        statusSelect
            ? String(
                statusSelect.value ||
                ""
            ).trim()
            : "Open";


    /*
     * Filter positions.
     */
    const filtered =
        positions.filter(
            job => {

                const normalizedStatus =
                    normalizeStatus(
                        job.status
                    );


                const normalizedSelectedStatus =
                    normalizeStatus(
                        status
                    );


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
                    String(
                        job.department ||
                        ""
                    ).trim() ===
                    department;


                const matchesEmployment =
                    !employment ||
                    String(
                        job.employment_type ||
                        ""
                    ).trim() ===
                    employment;


                const matchesStatus =
                    !status ||
                    normalizedStatus ===
                    normalizedSelectedStatus;


                return (
                    matchesSearch &&
                    matchesDepartment &&
                    matchesEmployment &&
                    matchesStatus
                );

            }
        );


    /*
     * Position count.
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
     * No positions.
     */
    if (
        !filtered.length
    ) {

        grid.innerHTML = `
            <div
                class="
                    glass-panel
                    position-card
                    position-empty
                "
            >

                <div
                    class="empty-icon"
                    style="margin:0 auto 8px;"
                >
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
     * Render cards.
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

function createPositionCard(
    job
) {

    const isOpen =
        normalizeStatus(
            job.status
        ) ===
        "OPEN";


    const applyButton =
        isOpen
            ? `
                <button
                    type="button"
                    class="btn btn-primary"
                    data-action="apply"
                    data-id="${escapeHtml(
                        job.job_id
                    )}"
                >
                    Apply
                </button>
            `
            : "";


    return `
        <article
            class="glass-panel position-card"
        >

            <!-- TOP -->

            <div class="position-top">

                <div>

                    <div class="job-code">
                        ${escapeHtml(
                            job.job_code ||
                            "—"
                        )}
                    </div>

                    <h3>
                        ${escapeHtml(
                            job.job_title ||
                            "Untitled Position"
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
                        job.department ||
                        "—"
                    )}
                </span>


                <span>
                    ◷
                    ${escapeHtml(
                        job.employment_type ||
                        "—"
                    )}
                </span>


                <span>
                    ▣
                    ${escapeHtml(
                        job.vacancies ??
                        "0"
                    )}
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
                    type="button"
                    class="btn btn-secondary"
                    data-action="details"
                    data-id="${escapeHtml(
                        job.job_id
                    )}"
                >
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

function openDetails(
    job
) {

    selectedPosition =
        job;


    const detailsCode =
        document.getElementById(
            "detailsCode"
        );


    const detailsTitle =
        document.getElementById(
            "detailsTitle"
        );


    const detailsBody =
        document.getElementById(
            "detailsBody"
        );


    if (
        detailsCode
    ) {

        detailsCode.textContent =
            job.job_code ||
            "—";

    }


    if (
        detailsTitle
    ) {

        detailsTitle.textContent =
            job.job_title ||
            "Job Position";

    }


    if (
        detailsBody
    ) {

        detailsBody.innerHTML = `

            <div class="details-grid">

                <div class="detail-block">

                    <small>
                        Department
                    </small>

                    <strong>
                        ${escapeHtml(
                            job.department ||
                            "—"
                        )}
                    </strong>

                </div>


                <div class="detail-block">

                    <small>
                        Employment Type
                    </small>

                    <strong>
                        ${escapeHtml(
                            job.employment_type ||
                            "—"
                        )}
                    </strong>

                </div>


                <div class="detail-block">

                    <small>
                        Vacancies
                    </small>

                    <strong>
                        ${escapeHtml(
                            job.vacancies ??
                            "—"
                        )}
                    </strong>

                </div>


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


                <div
                    class="
                        detail-block
                        detail-full
                    "
                >

                    <small>
                        Job Description
                    </small>

                    <div class="modal-description">
                        ${escapeHtml(
                            job.description ||
                            "No job description provided."
                        )}
                    </div>

                </div>


                <div
                    class="
                        detail-block
                        detail-full
                    "
                >

                    <small>
                        Qualifications
                    </small>

                    <div class="modal-description">
                        ${escapeHtml(
                            job.qualifications ||
                            "No qualifications provided."
                        )}
                    </div>

                </div>

            </div>

        `;

    }


    /*
     * Apply button.
     */
    const applyButton =
        document.getElementById(
            "applyFromDetails"
        );


    if (applyButton) {

        const isOpen =
            normalizeStatus(
                job.status
            ) ===
            "OPEN";


        applyButton.style.display =
            isOpen
                ? "inline-flex"
                : "none";

    }


    /*
     * Open modal.
     */
    toggleModal(
        "detailsModal",
        true
    );

}


/* =========================================================
   CLOSE DETAILS
   ========================================================= */

function closeDetails() {

    toggleModal(
        "detailsModal",
        false
    );


    selectedPosition =
        null;

}


/* =========================================================
   APPLY / SELECT JOB
   ========================================================= */

function selectJobForApplication(
    job
) {

    if (!job) {
        return;
    }


    /* =====================================================
       VALIDATE POSITION STATUS
       ===================================================== */

    if (
        normalizeStatus(
            job.status
        ) !==
        "OPEN"
    ) {

        showToast(
            "Only open positions can be selected for an application.",
            "error"
        );

        return;

    }


    /* =====================================================
       VALIDATE CLOSING DATE
       ===================================================== */

    if (
        job.closing_date
    ) {

        const closingDate =
            new Date(
                `${job.closing_date}T23:59:59`
            );


        if (
            Number.isNaN(
                closingDate.getTime()
            )
        ) {

            showToast(
                "The closing date for this position is invalid.",
                "error"
            );

            return;

        }


        if (
            closingDate.getTime() <
            Date.now()
        ) {

            showToast(
                "This position is no longer accepting applications.",
                "error"
            );

            return;

        }

    }


    /* =====================================================
       VALIDATE VACANCIES
       ===================================================== */

    const vacancies =
        Number(
            job.vacancies
        );


    if (
        !Number.isFinite(vacancies) ||
        vacancies <= 0
    ) {

        showToast(
            "This position currently has no available vacancies.",
            "error"
        );

        return;

    }


    /* =====================================================
       STORE SELECTED JOB
       ===================================================== */

    const selectedJob = {

        job_id:
            job.job_id,

        job_code:
            job.job_code,

        job_title:
            job.job_title,

        department:
            job.department,

        employment_type:
            job.employment_type,

        vacancies:
            job.vacancies,

        closing_date:
            job.closing_date,

        description:
            job.description,

        qualifications:
            job.qualifications,

        selected_at:
            new Date()
                .toISOString()

    };


    try {

        localStorage.setItem(
            "rms_selected_job",
            JSON.stringify(
                selectedJob
            )
        );

    } catch (error) {

        console.error(
            "Unable to save selected job:",
            error
        );


        showToast(
            "Unable to prepare the selected position.",
            "error"
        );

        return;

    }


    /* =====================================================
       CLOSE DETAILS MODAL
       ===================================================== */

    closeDetails();


    /* =====================================================
       GO TO APPLICATION PAGE
       ===================================================== */

    showToast(
        `${job.job_title} selected. Opening application form...`
    );


    /*
     * Allow the toast to appear before navigation.
     */
    setTimeout(
        () => {

            window.location.href =
                "applications.html";

        },
        250
    );

}


/* =========================================================
   STATUS BADGE
   ========================================================= */

function statusBadge(
    status
) {

    const normalized =
        normalizeStatus(
            status
        );


    if (
        normalized ===
        "OPEN"
    ) {

        return `
            <span
                class="position-status-open"
            >
                Open
            </span>
        `;

    }


    if (
        normalized ===
        "CLOSED"
    ) {

        return `
            <span
                class="position-status-closed"
            >
                Closed
            </span>
        `;

    }


    return `
        <span
            class="position-status-closed"
        >
            ${escapeHtml(
                status ||
                "—"
            )}
        </span>
    `;

}


/* =========================================================
   NORMALIZE STATUS
   ========================================================= */

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


/* =========================================================
   FORMAT DATE
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

            year:
                "numeric",

            month:
                "short",

            day:
                "numeric"

        }
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
            value ||
            ""
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
        ) +
        "…"
    );

}


/* =========================================================
   SAFE HTML ESCAPING
   ========================================================= */

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


/* =========================================================
   MODAL HELPER
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
        <div class="toast-message">
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
                () => {
                    toast.remove();
                },
                250
            );

        },
        3000
    );

}