/* =========================================================
   RECRUITMENT MANAGEMENT SYSTEM
   LABORATORY ACTIVITY 16
   APPLICANT SELECTION
   ========================================================= */

let selectionCandidates = [];
let selectedApplicationId = null;
let hiringEventsBound = false;


/* =========================================================
   INITIALIZE
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    initHiring
);


async function initHiring() {

    if (
        typeof renderShell ===
        "function"
    ) {

        renderShell({
            active: "Hiring"
        });

    }


    setupHiringEvents();


    let session = null;


    try {

        if (
            typeof requireAuth ===
            "function"
        ) {

            session =
                await requireAuth();

        }

    } catch (error) {

        console.error(
            "Authentication error:",
            error
        );

    }


    if (!session) {

        console.warn(
            "No authenticated session."
        );

        return;
    }


    if (
        typeof loadUserProfile ===
        "function"
    ) {

        loadUserProfile()
            .catch(
                error =>
                    console.warn(
                        "Unable to load user profile:",
                        error
                    )
            );

    }


    await loadSelectionCandidates();

}


/* =========================================================
   EVENTS
   ========================================================= */

function setupHiringEvents() {

    if (hiringEventsBound) {
        return;
    }


    hiringEventsBound = true;


    document
        .getElementById(
            "selectionSearch"
        )
        ?.addEventListener(
            "input",
            renderSelectionCandidates
        );


    document
        .getElementById(
            "selectionFilter"
        )
        ?.addEventListener(
            "change",
            renderSelectionCandidates
        );


    document
        .getElementById(
            "selectionTable"
        )
        ?.addEventListener(
            "click",
            handleSelectionTableAction
        );


    document
        .getElementById(
            "closeSelectionModal"
        )
        ?.addEventListener(
            "click",
            closeSelectionModal
        );


    document
        .getElementById(
            "cancelSelectionModal"
        )
        ?.addEventListener(
            "click",
            closeSelectionModal
        );


    document
        .getElementById(
            "saveSelectionButton"
        )
        ?.addEventListener(
            "click",
            saveApplicantSelection
        );


    document
        .getElementById(
            "selectionModal"
        )
        ?.addEventListener(
            "click",
            event => {

                const modal =
                    document.getElementById(
                        "selectionModal"
                    );


                if (
                    event.target ===
                    modal
                ) {

                    closeSelectionModal();

                }

            }
        );


    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key ===
                "Escape"
            ) {

                closeSelectionModal();

            }

        }
    );

}


/* =========================================================
   LOAD CANDIDATES
   ========================================================= */

async function loadSelectionCandidates() {

    const table =
        document.getElementById(
            "selectionTable"
        );


    if (table) {

        table.innerHTML = `
            <tr>
                <td
                    colspan="7"
                    class="table-empty"
                >
                    Loading candidates...
                </td>
            </tr>
        `;

    }


    try {

        if (!window.rmsSupabase) {

            throw new Error(
                "Supabase client is not initialized."
            );

        }


        /* =================================================
           APPLICATIONS
           ================================================= */

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
                    created_at
                `)
                .order(
                    "created_at",
                    {
                        ascending:
                            false
                    }
                );


        if (applicationError) {
            throw applicationError;
        }


        const apps =
            Array.isArray(
                applicationRows
            )
                ? applicationRows
                : [];


        if (!apps.length) {

            selectionCandidates = [];

            updateSelectionSummary();

            renderSelectionCandidates();

            return;

        }


        /* =================================================
           APPLICANTS
           ================================================= */

        const applicantIds =
            [
                ...new Set(
                    apps
                        .map(
                            application =>
                                application.applicant_id
                        )
                        .filter(Boolean)
                )
            ];


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
                        email,
                        status
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


        /* =================================================
           JOB POSTINGS
           ================================================= */

        const jobIds =
            [
                ...new Set(
                    apps
                        .map(
                            application =>
                                application.job_id
                        )
                        .filter(Boolean)
                )
            ];


        let jobRows = [];


        if (jobIds.length) {

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
                        department
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


        /* =================================================
           MAP DATA
           ================================================= */

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


        /* =================================================
           SCREENINGS
           ================================================= */

        const applicationIds =
            apps
                .map(
                    application =>
                        application.application_id
                )
                .filter(Boolean);


        let screeningRows = [];


        if (
            applicationIds.length
        ) {

            const {
                data,
                error
            } =
                await window.rmsSupabase
                    .from("screenings")
                    .select(`
                        screening_id,
                        application_id,
                        screening_date,
                        score,
                        result,
                        created_at
                    `)
                    .in(
                        "application_id",
                        applicationIds
                    )
                    .order(
                        "created_at",
                        {
                            ascending:
                                false
                        }
                    );


            if (error) {
                throw error;
            }


            screeningRows =
                Array.isArray(data)
                    ? data
                    : [];

        }


        const screeningMap =
            new Map();


        screeningRows.forEach(
            screening => {

                const id =
                    String(
                        screening.application_id
                    );


                if (
                    !screeningMap.has(
                        id
                    )
                ) {

                    screeningMap.set(
                        id,
                        screening
                    );

                }

            }
        );


        /* =================================================
           INTERVIEWS
           ================================================= */

        let interviewRows = [];


        if (
            applicationIds.length
        ) {

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
                        status,
                        score,
                        result,
                        created_at,
                        updated_at
                    `)
                    .in(
                        "application_id",
                        applicationIds
                    )
                    .order(
                        "created_at",
                        {
                            ascending:
                                false
                        }
                    );


            if (error) {
                throw error;
            }


            interviewRows =
                Array.isArray(data)
                    ? data
                    : [];

        }


        /*
         * Lab 15 permits multiple interviews.
         *
         * For Lab 16 we use the latest
         * completed interview that has a score.
         */

        const interviewMap =
            new Map();


        interviewRows.forEach(
            interview => {

                const id =
                    String(
                        interview.application_id
                    );


                const current =
                    interviewMap.get(
                        id
                    );


                if (!current) {

                    interviewMap.set(
                        id,
                        interview
                    );

                    return;

                }


                const currentCompleted =
                    normalizeStatus(
                        current.status
                    ) ===
                    "COMPLETED";


                const currentHasScore =
                    hasScore(
                        current.score
                    );


                const interviewCompleted =
                    normalizeStatus(
                        interview.status
                    ) ===
                    "COMPLETED";


                const interviewHasScore =
                    hasScore(
                        interview.score
                    );


                if (
                    interviewCompleted &&
                    interviewHasScore &&
                    (
                        !currentCompleted ||
                        !currentHasScore
                    )
                ) {

                    interviewMap.set(
                        id,
                        interview
                    );

                }

            }
        );


        /* =================================================
           BUILD CANDIDATES
           ================================================= */

        selectionCandidates =
            apps
                .map(
                    application => {

                        const applicationId =
                            String(
                                application.application_id
                            );


                        const applicant =
                            applicantMap.get(
                                String(
                                    application.applicant_id
                                )
                            ) || null;


                        const job =
                            jobMap.get(
                                String(
                                    application.job_id
                                )
                            ) || null;


                        const screening =
                            screeningMap.get(
                                applicationId
                            ) || null;


                        const interview =
                            interviewMap.get(
                                applicationId
                            ) || null;


                        const screeningScore =
                            toNumberOrNull(
                                screening?.score
                            );


                        const interviewScore =
                            toNumberOrNull(
                                interview?.score
                            );


                        const overallScore =
                            calculateOverallScore(
                                screeningScore,
                                interviewScore
                            );


                        return {

                            application,

                            applicant,

                            job,

                            screening,

                            interview,

                            screeningScore,

                            interviewScore,

                            overallScore

                        };

                    }
                )
                .filter(
                    candidate => {

                        const status =
                            normalizeStatus(
                                candidate
                                    .application
                                    ?.status
                            );


                        return (

                            status ===
                                "QUALIFIED" ||

                            status ===
                                "FOR INTERVIEW" ||

                            status ===
                                "INTERVIEWED" ||

                            status ===
                                "SELECTED FOR HIRING"

                        );

                    }
                );


        updateSelectionSummary();

        renderSelectionCandidates();


    } catch (error) {

        console.error(
            "Load selection candidates error:",
            error
        );


        selectionCandidates = [];


        updateSelectionSummary();


        if (table) {

            table.innerHTML = `
                <tr>
                    <td
                        colspan="7"
                        class="table-empty"
                    >
                        Unable to load applicant selection data.
                    </td>
                </tr>
            `;

        }


        showToast(
            error?.message ||
                "Unable to load applicant selection data.",
            "error"
        );

    }

}


/* =========================================================
   RENDER TABLE
   ========================================================= */

function renderSelectionCandidates() {

    const table =
        document.getElementById(
            "selectionTable"
        );


    if (!table) {
        return;
    }


    const search =
        String(
            document.getElementById(
                "selectionSearch"
            )?.value ||
                ""
        )
            .trim()
            .toLowerCase();


    const filter =
        normalizeStatus(
            document.getElementById(
                "selectionFilter"
            )?.value ||
                ""
        );


    const filtered =
        selectionCandidates.filter(
            candidate => {

                const applicant =
                    candidate.applicant ||
                    {};


                const job =
                    candidate.job ||
                    {};


                const application =
                    candidate.application ||
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
                    )
                        .toLowerCase();


                const position =
                    String(
                        job.job_title ||
                        ""
                    )
                        .toLowerCase();


                const jobCode =
                    String(
                        job.job_code ||
                        ""
                    )
                        .toLowerCase();


                const status =
                    normalizeStatus(
                        application.status
                    );


                const matchesSearch =
                    !search ||
                    applicantName.includes(
                        search
                    ) ||
                    applicantNo.includes(
                        search
                    ) ||
                    position.includes(
                        search
                    ) ||
                    jobCode.includes(
                        search
                    );


                let matchesFilter =
                    true;


                if (
                    filter ===
                    "QUALIFIED"
                ) {

                    matchesFilter =
                        status ===
                        "QUALIFIED";

                } else if (
                    filter ===
                    "SELECTED"
                ) {

                    matchesFilter =
                        status ===
                        "SELECTED FOR HIRING";

                }


                return (
                    matchesSearch &&
                    matchesFilter
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
                    No candidates found.
                </td>
            </tr>
        `;

        return;
    }


    table.innerHTML =
        filtered
            .map(
                candidate => {

                    const applicant =
                        candidate.applicant ||
                        {};


                    const job =
                        candidate.job ||
                        {};


                    const application =
                        candidate.application ||
                        {};


                    const status =
                        normalizeStatus(
                            application.status
                        );


                    const selected =
                        status ===
                        "SELECTED FOR HIRING";


                    return `

                        <tr>

                            <td>

                                <div
                                    class="selection-applicant"
                                >

                                    <strong>
                                        ${escapeHtml(
                                            `${

                                                applicant.first_name ||
                                                ""

                                            } ${

                                                applicant.last_name ||
                                                ""

                                            }`
                                                .trim() ||
                                            "—"
                                        )}
                                    </strong>

                                    <span>
                                        ${escapeHtml(
                                            applicant.applicant_no ||
                                            "—"
                                        )}
                                    </span>

                                </div>

                            </td>


                            <td>

                                <div
                                    class="selection-position"
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
                                ${renderScore(
                                    candidate.screeningScore
                                )}
                            </td>


                            <td>
                                ${renderScore(
                                    candidate.interviewScore
                                )}
                            </td>


                            <td>
                                ${renderOverallScore(
                                    candidate.overallScore
                                )}
                            </td>


                            <td>

                                ${
                                    selected

                                        ? `
                                            <span
                                                class="
                                                    selection-status
                                                    selection-status-selected
                                                "
                                            >
                                                SELECTED FOR HIRING
                                            </span>
                                        `

                                        : `
                                            <span
                                                class="
                                                    selection-status
                                                    selection-status-qualified
                                                "
                                            >
                                                ${escapeHtml(
                                                    application.status ||
                                                    "QUALIFIED"
                                                )}
                                            </span>
                                        `
                                }

                            </td>


                            <td>

                                <div
                                    class="table-actions"
                                >

                                    <button
                                        type="button"
                                        class="table-action"
                                        data-selection-action="review"
                                        data-id="${escapeHtml(
                                            application.application_id
                                        )}"
                                    >
                                        ${
                                            selected
                                                ? "View"
                                                : "Select"
                                        }
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
   TABLE ACTION
   ========================================================= */

function handleSelectionTableAction(
    event
) {

    const button =
        event.target.closest(
            "[data-selection-action]"
        );


    if (!button) {
        return;
    }


    const applicationId =
        button.dataset.id;


    if (!applicationId) {
        return;
    }


    const candidate =
        selectionCandidates.find(
            item =>
                String(
                    item.application
                        ?.application_id
                ) ===
                String(
                    applicationId
                )
        );


    if (!candidate) {

        showToast(
            "Candidate record not found.",
            "error"
        );

        return;
    }


    openSelectionModal(
        candidate
    );

}


/* =========================================================
   OPEN MODAL
   ========================================================= */

function openSelectionModal(
    candidate
) {

    const applicant =
        candidate.applicant ||
        {};


    const job =
        candidate.job ||
        {};


    const application =
        candidate.application ||
        {};


    selectedApplicationId =
        application.application_id;


    const applicantName =
        `${

            applicant.first_name ||
            ""

        } ${

            applicant.last_name ||
            ""

        }`
            .trim();


    document.getElementById(
        "selectionApplicant"
    ).textContent =
        applicantName ||
        "—";


    document.getElementById(
        "selectionApplicantNo"
    ).textContent =
        applicant.applicant_no ||
        "—";


    document.getElementById(
        "selectionPosition"
    ).textContent =
        job.job_title ||
        "—";


    document.getElementById(
        "selectionApplicationStatus"
    ).textContent =
        application.status ||
        "—";


    document.getElementById(
        "selectionScreeningScore"
    ).textContent =
        candidate.screeningScore ??
        "—";


    document.getElementById(
        "selectionInterviewScore"
    ).textContent =
        candidate.interviewScore ??
        "—";


    document.getElementById(
        "selectionOverallScore"
    ).textContent =
        candidate.overallScore !==
            null

            ? candidate.overallScore
                .toFixed(1)

            : "—";


    const recommendation =
        document.getElementById(
            "selectionRecommendation"
        );


    const alreadySelected =
        isSelectedStatus(
            application.status
        );


    if (recommendation) {

        recommendation.value =
            alreadySelected
                ? "SELECTED"
                : "QUALIFIED";


        recommendation.disabled =
            alreadySelected;

    }


    clearSelectionError();


    toggleSelectionModal(
        true
    );

}


/* =========================================================
   SAVE SELECTION
   ========================================================= */

async function saveApplicantSelection() {

    if (!selectedApplicationId) {

        setSelectionError(
            "No applicant selection record is active."
        );

        return;
    }


    const candidate =
        selectionCandidates.find(
            item =>
                String(
                    item.application
                        ?.application_id
                ) ===
                String(
                    selectedApplicationId
                )
        );


    if (!candidate) {

        setSelectionError(
            "Candidate record could not be found."
        );

        return;
    }


    const applicationStatus =
        normalizeStatus(
            candidate.application
                ?.status
        );


    const eligibleStatuses = [

        "QUALIFIED",

        "FOR INTERVIEW",

        "INTERVIEWED",

        "SELECTED FOR HIRING"

    ];


    if (
        !eligibleStatuses.includes(
            applicationStatus
        )
    ) {

        setSelectionError(
            "Only qualified applicants can be selected for hiring."
        );

        return;
    }


    if (
        candidate.screeningScore ===
            null ||
        candidate.screeningScore ===
            undefined
    ) {

        setSelectionError(
            "The applicant does not have a screening score yet."
        );

        return;
    }


    if (
        candidate.interviewScore ===
            null ||
        candidate.interviewScore ===
            undefined
    ) {

        setSelectionError(
            "The applicant does not have a completed interview score yet."
        );

        return;
    }


    const recommendation =
        String(
            document.getElementById(
                "selectionRecommendation"
            )?.value ||
                ""
        ).trim();


    if (
        recommendation !==
        "SELECTED"
    ) {

        setSelectionError(
            "Please select SELECTED to continue."
        );

        return;
    }


    const button =
        document.getElementById(
            "saveSelectionButton"
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


        /*
         * Lab 16 expected output:
         *
         * SELECTED FOR HIRING
         */

        const {
            error
        } =
            await window.rmsSupabase
                .from("applications")
                .update({

                    status:
                        "SELECTED FOR HIRING"

                })
                .eq(
                    "application_id",
                    selectedApplicationId
                );


        if (error) {
            throw error;
        }


        /*
         * Update local copy immediately.
         */

        const localCandidate =
            selectionCandidates.find(
                item =>
                    String(
                        item.application
                            ?.application_id
                    ) ===
                    String(
                        selectedApplicationId
                    )
            );


        if (
            localCandidate?.application
        ) {

            localCandidate
                .application
                .status =
                "SELECTED FOR HIRING";

        }


        showToast(
            "Applicant selected for hiring successfully.",
            "success"
        );


        closeSelectionModal();


        updateSelectionSummary();


        renderSelectionCandidates();


    } catch (error) {

        console.error(
            "Save applicant selection error:",
            error
        );


        setSelectionError(
            error?.message ||
                "Unable to save applicant selection."
        );


        showToast(
            error?.message ||
                "Unable to save applicant selection.",
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
   OVERALL SCORE
   ========================================================= */

function calculateOverallScore(
    screeningScore,
    interviewScore
) {

    if (
        screeningScore ===
            null ||
        screeningScore ===
            undefined ||
        interviewScore ===
            null ||
        interviewScore ===
            undefined
    ) {

        return null;

    }


    const screening =
        Number(
            screeningScore
        );


    const interview =
        Number(
            interviewScore
        );


    if (
        !Number.isFinite(
            screening
        ) ||
        !Number.isFinite(
            interview
        )
    ) {

        return null;

    }


    return (
        screening +
        interview
    ) / 2;

}


/* =========================================================
   SUMMARY
   ========================================================= */

function updateSelectionSummary() {

    const qualifiedCount =
        selectionCandidates.filter(
            candidate => {

                const status =
                    normalizeStatus(
                        candidate.application
                            ?.status
                    );


                return (

                    status ===
                        "QUALIFIED" ||

                    status ===
                        "FOR INTERVIEW" ||

                    status ===
                        "INTERVIEWED"

                );

            }
        ).length;


    const selectedCount =
        selectionCandidates.filter(
            candidate =>
                isSelectedStatus(
                    candidate.application
                        ?.status
                )
        ).length;


    const scores =
        selectionCandidates
            .map(
                candidate =>
                    candidate.overallScore
            )
            .filter(
                score =>
                    score !==
                        null &&
                    score !==
                        undefined &&
                    Number.isFinite(
                        score
                    )
            );


    const average =
        scores.length

            ? scores.reduce(
                (
                    total,
                    score
                ) =>
                    total +
                    score,
                0
            ) /
            scores.length

            : 0;


    const qualifiedElement =
        document.getElementById(
            "qualifiedCount"
        );


    const selectedElement =
        document.getElementById(
            "selectedCount"
        );


    const averageElement =
        document.getElementById(
            "averageScore"
        );


    if (qualifiedElement) {

        qualifiedElement.textContent =
            qualifiedCount;

    }


    if (selectedElement) {

        selectedElement.textContent =
            selectedCount;

    }


    if (averageElement) {

        averageElement.textContent =
            average.toFixed(
                1
            );

    }

}


/* =========================================================
   SCORE DISPLAY
   ========================================================= */

function renderScore(
    score
) {

    if (
        score ===
            null ||
        score ===
            undefined
    ) {

        return `
            <span
                class="selection-score"
            >
                —
            </span>
        `;

    }


    const value =
        Number(
            score
        );


    let className =
        "selection-score";


    if (
        value >= 80
    ) {

        className +=
            " selection-score-high";

    } else if (
        value >= 70
    ) {

        className +=
            " selection-score-medium";

    } else {

        className +=
            " selection-score-low";

    }


    return `

        <span
            class="${className}"
        >
            ${escapeHtml(
                value
            )}/100
        </span>

    `;

}


function renderOverallScore(
    score
) {

    if (
        score ===
            null ||
        score ===
            undefined
    ) {

        return `
            <span
                class="selection-score"
            >
                —
            </span>
        `;

    }


    const value =
        Number(
            score
        );


    let className =
        "selection-score";


    if (
        value >= 80
    ) {

        className +=
            " selection-score-high";

    } else if (
        value >= 70
    ) {

        className +=
            " selection-score-medium";

    } else {

        className +=
            " selection-score-low";

    }


    return `

        <span
            class="${className}"
        >
            ${escapeHtml(
                value.toFixed(1)
            )}/100
        </span>

    `;

}


/* =========================================================
   HELPERS
   ========================================================= */

function isSelectedStatus(
    value
) {

    return (
        normalizeStatus(
            value
        ) ===
        "SELECTED FOR HIRING"
    );

}


function hasScore(
    value
) {

    return (
        value !==
            null &&
        value !==
            undefined &&
        value !==
            ""
    );

}


function toNumberOrNull(
    value
) {

    if (
        value ===
            null ||
        value ===
            undefined ||
        value ===
            ""
    ) {

        return null;

    }


    const number =
        Number(
            value
        );


    return Number.isFinite(
        number
    )
        ? number
        : null;

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


/* =========================================================
   MODAL
   ========================================================= */

function toggleSelectionModal(
    open
) {

    const modal =
        document.getElementById(
            "selectionModal"
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


function closeSelectionModal() {

    selectedApplicationId =
        null;


    clearSelectionError();


    toggleSelectionModal(
        false
    );

}


/* =========================================================
   ERROR
   ========================================================= */

function setSelectionError(
    message
) {

    const element =
        document.getElementById(
            "selectionFormError"
        );


    if (element) {

        element.textContent =
            message ||
            "";

    }

}


function clearSelectionError() {

    setSelectionError(
        ""
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


/* =========================================================
   HTML ESCAPE
   ========================================================= */

function escapeHtml(
    value
) {

    if (
        value ===
            null ||
        value ===
            undefined
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