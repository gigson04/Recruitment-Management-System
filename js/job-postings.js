/* =========================================================
   RECRUITMENT MANAGEMENT SYSTEM
   LABORATORY ACTIVITY 4
   OPEN POSITIONS
   FAST SUPABASE VERSION
   ========================================================= */

let positions = [];
let selectedPosition = null;

document.addEventListener("DOMContentLoaded", initOpenPositions);


async function initOpenPositions() {
    try {
        /*
         * Make the common UI appear immediately.
         */
        renderShell({
            active: "Open Positions"
        });

        /*
         * Bind the controls immediately.
         */
        bindPositionEvents();

        /*
         * Check authentication.
         * We only use getSession here because it is fast
         * and does not require an additional user lookup.
         */
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

        /*
         * Load profile and positions at the SAME TIME.
         */
        const profilePromise = loadUserProfileFast();
        const positionsPromise = loadOpenPositions();

        await Promise.allSettled([
            profilePromise,
            positionsPromise
        ]);

    } catch (error) {

        console.error(
            "Open Positions initialization error:",
            error
        );

        showToast(
            error.message ||
            "Unable to load Open Positions.",
            "error"
        );
    }
}


/* =========================================================
   EVENT HANDLERS
   ========================================================= */

function bindPositionEvents() {

    document
        .getElementById("positionSearch")
        ?.addEventListener(
            "input",
            renderPositions
        );

    document
        .getElementById("departmentFilter")
        ?.addEventListener(
            "change",
            renderPositions
        );

    document
        .getElementById("employmentFilter")
        ?.addEventListener(
            "change",
            renderPositions
        );

    document
        .getElementById("positionStatusFilter")
        ?.addEventListener(
            "change",
            renderPositions
        );

    document
        .getElementById("positionsGrid")
        ?.addEventListener(
            "click",
            handlePositionClick
        );

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

    document
        .getElementById("detailsModal")
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

    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Escape"
            ) {
                closeDetails();
            }

        }
    );
}


/* =========================================================
   LOAD USER PROFILE
   ========================================================= */

async function loadUserProfileFast() {

    try {

        const {
            data
        } = await withTimeout(
            window.rmsSupabase.auth.getUser(),
            8000,
            "User profile request timed out."
        );

        const user =
            data?.user;

        if (!user) {
            return null;
        }


        /*
         * Only request fields actually needed
         * by the sidebar.
         */
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

            "User profile database request timed out."
        );


        if (error) {
            console.warn(
                "Profile request:",
                error.message
            );
        }


        const username =
            profile?.username ||
            user.email
                ?.split("@")[0] ||
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
            "Could not load user profile:",
            error
        );

        return null;
    }
}


/* =========================================================
   LOAD JOB POSTINGS
   ========================================================= */

async function loadOpenPositions() {

    const grid =
        document.getElementById(
            "positionsGrid"
        );

    if (!grid) {
        return;
    }


    grid.innerHTML = `
        <div
            class="glass-panel position-card"
            style="
                grid-column:1/-1;
                text-align:center;
                justify-content:center;
                min-height:180px;
            ">

            <div class="table-empty">
                Loading available positions...
            </div>

        </div>
    `;


    try {

        console.time(
            "Supabase job_postings"
        );


        /*
         * Only retrieve columns that
         * Laboratory Activity 4 needs.
         */
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
                    status
                `)
                .order(
                    "posting_date",
                    {
                        ascending: false
                    }
                ),

            8000,

            "Supabase job request timed out."
        );


        console.timeEnd(
            "Supabase job_postings"
        );


        if (error) {
            throw error;
        }


        positions =
            Array.isArray(data)
                ? data
                : [];


        populateDepartmentFilter();

        renderPositions();


    } catch (error) {

        console.error(
            "Job posting load error:",
            error
        );


        grid.innerHTML = `
            <div
                class="glass-panel position-card"
                style="
                    grid-column:1/-1;
                    text-align:center;
                    justify-content:center;
                    min-height:180px;
                ">

                <h3>
                    Unable to load positions
                </h3>

                <p
                    style="
                        color:var(--muted);
                        font-size:13px;
                    ">

                    ${escapeHtml(
                        error.message ||
                        "Please try again."
                    )}

                </p>

                <button
                    class="btn btn-secondary"
                    type="button"
                    onclick="loadOpenPositions()">

                    Try Again

                </button>

            </div>
        `;


        const counter =
            document.getElementById(
                "positionCount"
            );

        if (counter) {
            counter.textContent =
                "Unable to load positions.";
        }

    }
}


/* =========================================================
   FILTER OPTIONS
   ========================================================= */

function populateDepartmentFilter() {

    const select =
        document.getElementById(
            "departmentFilter"
        );

    if (!select) {
        return;
    }


    const current =
        select.value;


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


    select.innerHTML =
        `
        <option value="">
            All departments
        </option>
        `

        +

        departments
            .map(
                department => `
                    <option value="${escapeHtml(
                        department
                    )}">
                        ${escapeHtml(
                            department
                        )}
                    </option>
                `
            )
            .join("");


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


    const query =
        document.getElementById(
            "positionSearch"
        )
        ?.value
        .trim()
        .toLowerCase()
        || "";


    const department =
        document.getElementById(
            "departmentFilter"
        )
        ?.value
        || "";


    const employment =
        document.getElementById(
            "employmentFilter"
        )
        ?.value
        || "";


    const status =
        document.getElementById(
            "positionStatusFilter"
        )
        ?.value
        ?? "Open";


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


                return (

                    (
                        !query ||
                        haystack.includes(
                            query
                        )
                    )

                    &&

                    (
                        !department ||
                        job.department ===
                            department
                    )

                    &&

                    (
                        !employment ||
                        job.employment_type ===
                            employment
                    )

                    &&

                    (
                        !status ||
                        job.status ===
                            status
                    )

                );

            }
        );


    const counter =
        document.getElementById(
            "positionCount"
        );


    if (counter) {

        counter.textContent =
            `${filtered.length} position${
                filtered.length === 1
                    ? ""
                    : "s"
            } shown`;

    }


    if (!filtered.length) {

        grid.innerHTML = `
            <div
                class="glass-panel position-card"
                style="
                    grid-column:1/-1;
                    text-align:center;
                    justify-content:center;
                    min-height:220px;
                ">

                <h3>
                    No positions found
                </h3>

                <p
                    style="
                        color:var(--muted);
                        font-size:13px;
                    ">

                    Try changing your
                    search or filters.

                </p>

            </div>
        `;

        return;
    }


    grid.innerHTML =
        filtered
            .map(
                createPositionCard
            )
            .join("");
}


/* =========================================================
   POSITION CARD
   ========================================================= */

function createPositionCard(job) {

    return `
        <article
            class="glass-panel position-card">

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


            <p
                class="position-summary">

                ${escapeHtml(
                    shorten(
                        job.description ||
                        "No job description provided.",
                        130
                    )
                )}

            </p>


            <div class="position-actions">

                <button
                    class="btn btn-secondary"
                    data-action="details"
                    data-id="${job.job_id}">

                    View Details

                </button>


                ${
                    job.status === "Open"
                        ? `
                            <button
                                class="btn btn-primary"
                                data-action="apply"
                                data-id="${job.job_id}">

                                Apply

                            </button>
                          `
                        : ""
                }

            </div>

        </article>
    `;
}


/* =========================================================
   POSITION ACTIONS
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
            item =>
                String(
                    item.job_id
                ) ===
                String(
                    button.dataset.id
                )
        );


    if (!job) {
        return;
    }


    if (
        button.dataset.action ===
        "details"
    ) {

        openDetails(job);

    }


    if (
        button.dataset.action ===
        "apply"
    ) {

        selectJobForApplication(
            job
        );

    }
}


/* =========================================================
   DETAILS MODAL
   ========================================================= */

function openDetails(job) {

    selectedPosition =
        job;


    document.getElementById(
        "detailsCode"
    ).textContent =
        job.job_code;


    document.getElementById(
        "detailsTitle"
    ).textContent =
        job.job_title;


    document.getElementById(
        "detailsBody"
    ).innerHTML = `

        <div class="details-grid">

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


            <div class="detail-block">
                <small>
                    Vacancies
                </small>

                <strong>
                    ${job.vacancies}
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
   APPLY / SELECT JOB
   ========================================================= */

function selectJobForApplication(job) {

    if (
        job.status !==
        "Open"
    ) {

        showToast(
            "Only open positions can be selected.",
            "error"
        );

        return;
    }


    localStorage.setItem(
        "rms_selected_job",
        JSON.stringify({
            job_id:
                job.job_id,

            job_code:
                job.job_code,

            job_title:
                job.job_title,

            department:
                job.department,

            selected_at:
                new Date()
                    .toISOString()
        })
    );


    closeDetails();


    showToast(
        `${job.job_title} selected.`
    );
}


/* =========================================================
   HELPERS
   ========================================================= */

function shorten(
    value,
    max
) {

    const text =
        String(
            value || ""
        ).trim();


    if (
        text.length <= max
    ) {
        return text;
    }


    return (
        text.slice(
            0,
            max - 1
        ) + "…"
    );
}


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