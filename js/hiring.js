/* =========================================================
   RECRUITMENT MANAGEMENT SYSTEM

   LABORATORY ACTIVITY 16
   APPLICANT SELECTION

   LABORATORY ACTIVITY 17
   HIRING DECISION

   OPTIMIZED VERSION
   ========================================================= */


/* =========================================================
   GLOBAL VARIABLES
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

    /* -----------------------------------------------------
       LOAD COMMON SHELL
       ----------------------------------------------------- */

    if (
        typeof renderShell ===
        "function"
    ) {

        renderShell({
            active: "Hiring"
        });

    }


    /* -----------------------------------------------------
       BIND EVENTS
       ----------------------------------------------------- */

    setupHiringEvents();


    /* -----------------------------------------------------
       AUTHENTICATION
       ----------------------------------------------------- */

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


    /* -----------------------------------------------------
       LOAD USER PROFILE
       ----------------------------------------------------- */

    if (
        typeof loadUserProfile ===
        "function"
    ) {

        loadUserProfile()
            .catch(
                error => {

                    console.warn(
                        "Unable to load user profile:",
                        error
                    );

                }
            );

    }


    /* -----------------------------------------------------
       LOAD HIRING DATA
       ----------------------------------------------------- */

    await loadSelectionCandidates();

}


/* =========================================================
   EVENT SETUP
   ========================================================= */

function setupHiringEvents() {

    if (hiringEventsBound) {
        return;
    }


    hiringEventsBound =
        true;


    /* -----------------------------------------------------
       SEARCH
       ----------------------------------------------------- */

    document
        .getElementById(
            "selectionSearch"
        )
        ?.addEventListener(
            "input",
            renderSelectionCandidates
        );


    /* -----------------------------------------------------
       FILTER
       ----------------------------------------------------- */

    document
        .getElementById(
            "selectionFilter"
        )
        ?.addEventListener(
            "change",
            renderSelectionCandidates
        );


    /* -----------------------------------------------------
       TABLE
       ----------------------------------------------------- */

    document
        .getElementById(
            "selectionTable"
        )
        ?.addEventListener(
            "click",
            handleSelectionTableAction
        );


    /* -----------------------------------------------------
       LAB 16
       ----------------------------------------------------- */

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


    /* -----------------------------------------------------
       LAB 17
       ----------------------------------------------------- */

    document
        .getElementById(
            "closeHiringDecisionModal"
        )
        ?.addEventListener(
            "click",
            closeHiringDecisionModal
        );


    document
        .getElementById(
            "cancelHiringDecisionModal"
        )
        ?.addEventListener(
            "click",
            closeHiringDecisionModal
        );


    document
        .getElementById(
            "saveHiringDecisionButton"
        )
        ?.addEventListener(
            "click",
            saveHiringDecision
        );


    /* -----------------------------------------------------
       SELECTION MODAL BACKDROP
       ----------------------------------------------------- */

    document
        .getElementById(
            "selectionModal"
        )
        ?.addEventListener(
            "click",
            event => {

                if (
                    event.target.id ===
                    "selectionModal"
                ) {

                    closeSelectionModal();

                }

            }
        );


    /* -----------------------------------------------------
       HIRING MODAL BACKDROP
       ----------------------------------------------------- */

    document
        .getElementById(
            "hiringDecisionModal"
        )
        ?.addEventListener(
            "click",
            event => {

                if (
                    event.target.id ===
                    "hiringDecisionModal"
                ) {

                    closeHiringDecisionModal();

                }

            }
        );


    /* -----------------------------------------------------
       ESCAPE KEY
       ----------------------------------------------------- */

    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key !==
                "Escape"
            ) {
                return;
            }


            closeSelectionModal();

            closeHiringDecisionModal();

        }
    );

}


/* =========================================================
   LOAD DATA
   =========================================================

   IMPORTANT:

   This uses ONE Supabase request.

   applications
       ├── applicants
       ├── job_postings
       ├── screenings
       ├── interviews
       └── hiring

   ========================================================= */

async function loadSelectionCandidates() {

    const table =
        document.getElementById(
            "selectionTable"
        );


    /* -----------------------------------------------------
       LOADING MESSAGE
       ----------------------------------------------------- */

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

        /* -------------------------------------------------
           CHECK SUPABASE
           ------------------------------------------------- */

        if (
            !window.rmsSupabase
        ) {

            throw new Error(
                "Supabase client is not initialized."
            );

        }


        /* =================================================
           ONE DATABASE REQUEST
           ================================================= */

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
                    created_at,

                    applicants (
                        applicant_id,
                        applicant_no,
                        first_name,
                        last_name,
                        email,
                        status
                    ),

                    job_postings (
                        job_id,
                        job_code,
                        job_title,
                        department
                    ),

                    screenings (
                        screening_id,
                        application_id,
                        screening_date,
                        score,
                        result,
                        created_at
                    ),

                    interviews (
                        interview_id,
                        application_id,
                        interview_date,
                        interview_time,
                        interviewer,
                        status,
                        score,
                        result,
                        remarks,
                        created_at,
                        updated_at
                    ),

                    hiring (
                        hiring_id,
                        application_id,
                        hiring_date,
                        position,
                        salary_offer,
                        employment_status,
                        start_date,
                        status,
                        created_at,
                        updated_at
                    )
                `)
                .in(
                    "status",
                    [
                        "QUALIFIED",
                        "For Interview",
                        "Interviewed",
                        "SELECTED FOR HIRING",
                        "HIRED",
                        "DECLINED",
                        "REJECTED",
                        "ON HOLD"
                    ]
                )
                .order(
                    "created_at",
                    {
                        ascending:
                            false
                    }
                );


        /* -------------------------------------------------
           SUPABASE ERROR
           ------------------------------------------------- */

        if (error) {
            throw error;
        }


        /* -------------------------------------------------
           NORMALIZE RESULT
           ------------------------------------------------- */

        const applications =
            Array.isArray(data)
                ? data
                : [];


        /* =================================================
           BUILD CANDIDATES
           ================================================= */

        selectionCandidates =
            applications
                .map(
                    application => {

                        /* ---------------------------------
                           APPLICANT
                           --------------------------------- */

                        const applicant =
                            getRelatedRecord(
                                application
                                    .applicants
                            );


                        /* ---------------------------------
                           JOB
                           --------------------------------- */

                        const job =
                            getRelatedRecord(
                                application
                                    .job_postings
                            );


                        /* ---------------------------------
                           SCREENING HISTORY
                           --------------------------------- */

                        const screenings =
                            Array.isArray(
                                application
                                    .screenings
                            )

                                ? [
                                    ...application
                                        .screenings
                                ]

                                : [];


                        /*
                         * Newest screening first.
                         */

                        screenings.sort(
                            (
                                a,
                                b
                            ) => {

                                const dateA =
                                    new Date(
                                        a.created_at ||
                                        a.screening_date ||
                                        0
                                    ).getTime();


                                const dateB =
                                    new Date(
                                        b.created_at ||
                                        b.screening_date ||
                                        0
                                    ).getTime();


                                return (
                                    dateB -
                                    dateA
                                );

                            }
                        );


                        const screening =
                            screenings.length
                                ? screenings[0]
                                : null;


                        /* ---------------------------------
                           INTERVIEW HISTORY
                           --------------------------------- */

                        const interviewRows =
                            Array.isArray(
                                application
                                    .interviews
                            )

                                ? [
                                    ...application
                                        .interviews
                                ]

                                : [];


                        /*
                         * Sort newest first.
                         */

                        interviewRows.sort(
                            (
                                a,
                                b
                            ) => {

                                const dateA =
                                    getInterviewSortDate(
                                        a
                                    );


                                const dateB =
                                    getInterviewSortDate(
                                        b
                                    );


                                return (
                                    dateB -
                                    dateA
                                );

                            }
                        );


                        /*
                         * Lab 15 permits multiple
                         * interviews.
                         *
                         * Select the newest completed
                         * interview that has a score.
                         */

                        let interview =
                            interviewRows.find(
                                item =>

                                    normalizeStatus(
                                        item.status
                                    ) ===
                                    "COMPLETED"

                                    &&

                                    hasScore(
                                        item.score
                                    )
                            )
                            || null;


                        /*
                         * Fallback:
                         * newest interview with score.
                         */

                        if (
                            !interview
                        ) {

                            interview =
                                interviewRows.find(
                                    item =>
                                        hasScore(
                                            item.score
                                        )
                                )
                                || null;

                        }


                        /* ---------------------------------
                           HIRING HISTORY
                           --------------------------------- */

                        const hiringRows =
                            Array.isArray(
                                application
                                    .hiring
                            )

                                ? [
                                    ...application
                                        .hiring
                                ]

                                : [];


                        hiringRows.sort(
                            (
                                a,
                                b
                            ) => {

                                const dateA =
                                    new Date(
                                        a.created_at ||
                                        0
                                    ).getTime();


                                const dateB =
                                    new Date(
                                        b.created_at ||
                                        0
                                    ).getTime();


                                return (
                                    dateB -
                                    dateA
                                );

                            }
                        );


                        const hiring =
                            hiringRows.length
                                ? hiringRows[0]
                                : null;


                        /* ---------------------------------
                           SCORES
                           --------------------------------- */

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


                        /* ---------------------------------
                           RETURN CANDIDATE
                           --------------------------------- */

                        return {

                            application:
                                application,

                            applicant:
                                applicant,

                            job:
                                job,

                            screening:
                                screening,

                            interview:
                                interview,

                            hiring:
                                hiring,

                            screeningScore:
                                screeningScore,

                            interviewScore:
                                interviewScore,

                            overallScore:
                                overallScore

                        };

                    }
                );


        /* =================================================
           UPDATE UI
           ================================================= */

        updateSelectionSummary();


        renderSelectionCandidates();


    } catch (error) {

        console.error(
            "Hiring data load error:",
            error
        );


        selectionCandidates =
            [];


        updateSelectionSummary();


        if (table) {

            table.innerHTML = `
                <tr>
                    <td
                        colspan="7"
                        class="table-empty"
                    >
                        Unable to load hiring data.
                    </td>
                </tr>
            `;

        }


        if (
            typeof showToast ===
            "function"
        ) {

            showToast(
                getDatabaseErrorMessage(
                    error
                ),
                "error"
            );

        }

    }

}


/* =========================================================
   RELATED RECORD HELPER
   ========================================================= */

function getRelatedRecord(
    value
) {

    if (
        Array.isArray(
            value
        )
    ) {

        return (
            value[0] ||
            null
        );

    }


    return (
        value ||
        null
    );

}


/* =========================================================
   INTERVIEW SORT DATE
   ========================================================= */

function getInterviewSortDate(
    interview
) {

    if (!interview) {
        return 0;
    }


    if (
        interview.updated_at
    ) {

        const updated =
            new Date(
                interview.updated_at
            ).getTime();


        if (
            Number.isFinite(
                updated
            )
        ) {

            return updated;

        }

    }


    if (
        interview.created_at
    ) {

        const created =
            new Date(
                interview.created_at
            ).getTime();


        if (
            Number.isFinite(
                created
            )
        ) {

            return created;

        }

    }


    if (
        interview.interview_date
    ) {

        const date =
            new Date(
                `${
                    interview.interview_date
                }T${
                    normalizeTime(
                        interview.interview_time
                    ) ||
                    "00:00"
                }:00`
            ).getTime();


        if (
            Number.isFinite(
                date
            )
        ) {

            return date;

        }

    }


    return 0;

}


/* =========================================================
   RENDER CANDIDATES
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


                const jobTitle =
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

                    jobTitle.includes(
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


                } else if (
                    filter ===
                    "HIRED"
                ) {

                    matchesFilter =
                        status ===
                        "HIRED";


                } else if (
                    filter ===
                    "DECLINED"
                ) {

                    matchesFilter =
                        status ===
                        "DECLINED";


                } else if (
                    filter ===
                    "REJECTED"
                ) {

                    matchesFilter =
                        status ===
                        "REJECTED";


                } else if (
                    filter ===
                    "ON HOLD"
                ) {

                    matchesFilter =
                        status ===
                        "ON HOLD";

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


                    const action =
                        getCandidateAction(
                            candidate
                        );


                    return `

                        <tr>

                            <!-- APPLICANT -->

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
                                            applicant
                                                .applicant_no ||
                                            "—"
                                        )}
                                    </span>

                                </div>

                            </td>


                            <!-- POSITION -->

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


                            <!-- SCREENING -->

                            <td>

                                ${renderScore(
                                    candidate
                                        .screeningScore
                                )}

                            </td>


                            <!-- INTERVIEW -->

                            <td>

                                ${renderScore(
                                    candidate
                                        .interviewScore
                                )}

                            </td>


                            <!-- OVERALL -->

                            <td>

                                ${renderOverallScore(
                                    candidate
                                        .overallScore
                                )}

                            </td>


                            <!-- STATUS -->

                            <td>

                                ${renderCandidateStatus(
                                    application.status
                                )}

                            </td>


                            <!-- ACTION -->

                            <td>

                                <div
                                    class="table-actions"
                                >

                                    <button
                                        type="button"
                                        class="table-action"
                                        data-selection-action="${action.action}"
                                        data-id="${escapeHtml(
                                            application
                                                .application_id
                                        )}"
                                    >
                                        ${action.label}
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
   CANDIDATE ACTION
   ========================================================= */

function getCandidateAction(
    candidate
) {

    const status =
        normalizeStatus(
            candidate.application
                ?.status
        );


    /* -----------------------------------------------------
       SELECTED
       ----------------------------------------------------- */

    if (
        status ===
        "SELECTED FOR HIRING"
    ) {

        return {

            action:
                "hire",

            label:
                "Hiring Decision"

        };

    }


    /* -----------------------------------------------------
       FINAL DECISION ALREADY EXISTS
       ----------------------------------------------------- */

    if (

        status ===
            "HIRED" ||

        status ===
            "DECLINED" ||

        status ===
            "REJECTED" ||

        status ===
            "ON HOLD"

    ) {

        return {

            action:
                "hire",

            label:
                "View Decision"

        };

    }


    /* -----------------------------------------------------
       QUALIFIED
       ----------------------------------------------------- */

    return {

        action:
            "review",

        label:
            "Select"

    };

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


    const action =
        button.dataset
            .selectionAction;


    if (
        action ===
        "hire"
    ) {

        openHiringDecisionModal(
            candidate
        );

        return;
    }


    openSelectionModal(
        candidate
    );

}


/* =========================================================
   LAB 16
   OPEN SELECTION MODAL
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


    const applicantElement =
        document.getElementById(
            "selectionApplicant"
        );


    const applicantNoElement =
        document.getElementById(
            "selectionApplicantNo"
        );


    const positionElement =
        document.getElementById(
            "selectionPosition"
        );


    const statusElement =
        document.getElementById(
            "selectionApplicationStatus"
        );


    const screeningElement =
        document.getElementById(
            "selectionScreeningScore"
        );


    const interviewElement =
        document.getElementById(
            "selectionInterviewScore"
        );


    const overallElement =
        document.getElementById(
            "selectionOverallScore"
        );


    if (
        applicantElement
    ) {

        applicantElement.textContent =
            applicantName ||
            "—";

    }


    if (
        applicantNoElement
    ) {

        applicantNoElement.textContent =
            applicant.applicant_no ||
            "—";

    }


    if (
        positionElement
    ) {

        positionElement.textContent =
            job.job_title ||
            "—";

    }


    if (
        statusElement
    ) {

        statusElement.textContent =
            application.status ||
            "—";

    }


    if (
        screeningElement
    ) {

        screeningElement.textContent =
            candidate.screeningScore ??
            "—";

    }


    if (
        interviewElement
    ) {

        interviewElement.textContent =
            candidate.interviewScore ??
            "—";

    }


    if (
        overallElement
    ) {

        overallElement.textContent =
            candidate.overallScore !==
                null

                ? candidate
                    .overallScore
                    .toFixed(1)

                : "—";

    }


    const recommendation =
        document.getElementById(
            "selectionRecommendation"
        );


    const alreadySelected =
        isSelectedStatus(
            application.status
        );


    if (
        recommendation
    ) {

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
   LAB 16
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


    /* -----------------------------------------------------
       SCORE VALIDATION
       ----------------------------------------------------- */

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


    /* -----------------------------------------------------
       RECOMMENDATION
       ----------------------------------------------------- */

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


    /* -----------------------------------------------------
       IF ALREADY SELECTED
       ----------------------------------------------------- */

    if (
        isSelectedStatus(
            candidate.application
                ?.status
        )
    ) {

        closeSelectionModal();


        openHiringDecisionModal(
            candidate
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

        const {
            error
        } =
            await window.rmsSupabase
                .from(
                    "applications"
                )
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


        /* -------------------------------------------------
           UPDATE LOCAL DATA
           ------------------------------------------------- */

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
            localCandidate
                ?.application
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
            "Selection error:",
            error
        );


        setSelectionError(
            getDatabaseErrorMessage(
                error
            )
        );


        showToast(
            getDatabaseErrorMessage(
                error
            ),
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
   LAB 17
   OPEN HIRING DECISION
   ========================================================= */

function openHiringDecisionModal(
    candidate
) {

    if (!candidate) {

        showToast(
            "Candidate record not found.",
            "error"
        );

        return;
    }


    const application =
        candidate.application ||
        {};


    const applicant =
        candidate.applicant ||
        {};


    const job =
        candidate.job ||
        {};


    const status =
        normalizeStatus(
            application.status
        );


    const allowedStatuses = [

        "SELECTED FOR HIRING",

        "HIRED",

        "DECLINED",

        "REJECTED",

        "ON HOLD"

    ];


    if (
        !allowedStatuses.includes(
            status
        )
    ) {

        showToast(
            "Only selected applicants can proceed to the hiring decision.",
            "error"
        );

        return;

    }


    selectedApplicationId =
        application.application_id;


    const hiring =
        candidate.hiring ||
        null;


    /* -----------------------------------------------------
       APPLICANT
       ----------------------------------------------------- */

    const applicantName =
        `${

            applicant.first_name ||
            ""

        } ${

            applicant.last_name ||
            ""

        }`
            .trim();


    const applicantElement =
        document.getElementById(
            "hiringApplicant"
        );


    const applicantNoElement =
        document.getElementById(
            "hiringApplicantNo"
        );


    const positionElement =
        document.getElementById(
            "hiringPosition"
        );


    const currentStatusElement =
        document.getElementById(
            "hiringCurrentStatus"
        );


    const screeningElement =
        document.getElementById(
            "hiringScreeningScore"
        );


    const interviewElement =
        document.getElementById(
            "hiringInterviewScore"
        );


    const overallElement =
        document.getElementById(
            "hiringOverallScore"
        );


    if (
        applicantElement
    ) {

        applicantElement.textContent =
            applicantName ||
            "—";

    }


    if (
        applicantNoElement
    ) {

        applicantNoElement.textContent =
            applicant.applicant_no ||
            "—";

    }


    if (
        positionElement
    ) {

        positionElement.textContent =
            job.job_title ||
            hiring?.position ||
            "—";

    }


    if (
        currentStatusElement
    ) {

        currentStatusElement.textContent =
            application.status ||
            "—";

    }


    if (
        screeningElement
    ) {

        screeningElement.textContent =
            candidate.screeningScore ??
            "—";

    }


    if (
        interviewElement
    ) {

        interviewElement.textContent =
            candidate.interviewScore ??
            "—";

    }


    if (
        overallElement
    ) {

        overallElement.textContent =
            candidate.overallScore !==
                null

                ? candidate
                    .overallScore
                    .toFixed(1)

                : "—";

    }


    /* =====================================================
       FORM VALUES
       ===================================================== */

    const hiringDate =
        document.getElementById(
            "hiringDate"
        );


    const startDate =
        document.getElementById(
            "hiringStartDate"
        );


    const salary =
        document.getElementById(
            "hiringSalary"
        );


    const employmentStatus =
        document.getElementById(
            "hiringEmploymentStatus"
        );


    const decision =
        document.getElementById(
            "hiringDecision"
        );


    if (hiring) {

        if (
            hiringDate
        ) {

            hiringDate.value =
                hiring.hiring_date ||
                getTodayLocalDate();

        }


        if (
            startDate
        ) {

            startDate.value =
                hiring.start_date ||
                "";

        }


        if (
            salary
        ) {

            salary.value =
                hiring.salary_offer ??
                "";

        }


        if (
            employmentStatus
        ) {

            employmentStatus.value =
                hiring
                    .employment_status ||
                "";

        }


        if (
            decision
        ) {

            decision.value =
                normalizeHiringDecision(
                    hiring.status
                ) ||
                "ON HOLD";

        }

    } else {

        if (
            hiringDate
        ) {

            hiringDate.value =
                getTodayLocalDate();

        }


        if (
            startDate
        ) {

            startDate.value =
                "";

        }


        if (
            salary
        ) {

            salary.value =
                "";

        }


        if (
            employmentStatus
        ) {

            employmentStatus.value =
                "";

        }


        if (
            decision
        ) {

            decision.value =
                "ON HOLD";

        }

    }


    clearHiringError();


    toggleHiringDecisionModal(
        true
    );

}


/* =========================================================
   LAB 17
   SAVE HIRING DECISION
   ========================================================= */

async function saveHiringDecision() {

    if (!selectedApplicationId) {

        setHiringError(
            "No applicant is selected."
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

        setHiringError(
            "Candidate record could not be found."
        );

        return;
    }


    const application =
        candidate.application ||
        {};


    const job =
        candidate.job ||
        {};


    const applicationStatus =
        normalizeStatus(
            application.status
        );


    /* -----------------------------------------------------
       ONLY SELECTED CANDIDATES
       ----------------------------------------------------- */

    const validStatuses = [

        "SELECTED FOR HIRING",

        "HIRED",

        "DECLINED",

        "REJECTED",

        "ON HOLD"

    ];


    if (
        !validStatuses.includes(
            applicationStatus
        )
    ) {

        setHiringError(
            "Only selected applicants can receive a hiring decision."
        );

        return;
    }


    /* -----------------------------------------------------
       GET FORM DATA
       ----------------------------------------------------- */

    const hiringDate =
        String(
            document.getElementById(
                "hiringDate"
            )?.value ||
                ""
        ).trim();


    const startDate =
        String(
            document.getElementById(
                "hiringStartDate"
            )?.value ||
                ""
        ).trim();


    const salaryText =
        String(
            document.getElementById(
                "hiringSalary"
            )?.value ||
                ""
        ).trim();


    const employmentStatus =
        String(
            document.getElementById(
                "hiringEmploymentStatus"
            )?.value ||
                ""
        ).trim();


    const decision =
        normalizeHiringDecision(
            document.getElementById(
                "hiringDecision"
            )?.value ||
                ""
        );


    /* -----------------------------------------------------
       VALIDATE HIRING DATE
       ----------------------------------------------------- */

    if (!hiringDate) {

        setHiringError(
            "Hiring date is required."
        );

        return;
    }


    /* -----------------------------------------------------
       VALIDATE START DATE
       ----------------------------------------------------- */

    if (!startDate) {

        setHiringError(
            "Start date is required."
        );

        return;
    }


    if (
        startDate <
        hiringDate
    ) {

        setHiringError(
            "Start date cannot be earlier than the hiring date."
        );

        return;
    }


    /* -----------------------------------------------------
       VALIDATE DECISION
       ----------------------------------------------------- */

    const validDecisions = [

        "HIRED",

        "DECLINED",

        "REJECTED",

        "ON HOLD"

    ];


    if (
        !validDecisions.includes(
            decision
        )
    ) {

        setHiringError(
            "Please select a valid hiring decision."
        );

        return;
    }


    /* -----------------------------------------------------
       VALIDATE SALARY
       ----------------------------------------------------- */

    let salaryOffer =
        null;


    if (
        salaryText !==
        ""
    ) {

        salaryOffer =
            Number(
                salaryText
            );


        if (
            !Number.isFinite(
                salaryOffer
            ) ||
            salaryOffer < 0
        ) {

            setHiringError(
                "Salary offer must be a valid amount."
            );

            return;
        }

    }


    const button =
        document.getElementById(
            "saveHiringDecisionButton"
        );


    setButtonLoading(
        button,
        true,
        "Saving..."
    );


    try {

        /* =================================================
           CHECK EXISTING HIRING RECORD
           ================================================= */

        const {
            data: existingRows,
            error: existingError
        } =
            await window.rmsSupabase
                .from(
                    "hiring"
                )
                .select(`
                    hiring_id,
                    application_id,
                    hiring_date,
                    position,
                    salary_offer,
                    employment_status,
                    start_date,
                    status,
                    created_at,
                    updated_at
                `)
                .eq(
                    "application_id",
                    selectedApplicationId
                )
                .order(
                    "created_at",
                    {
                        ascending:
                            false
                    }
                )
                .limit(
                    1
                );


        if (existingError) {
            throw existingError;
        }


        const existingHiring =
            Array.isArray(
                existingRows
            ) &&
            existingRows.length
                ? existingRows[0]
                : null;


        /* =================================================
           HIRING DATA
           ================================================= */

        const hiringData = {

            application_id:
                selectedApplicationId,

            hiring_date:
                hiringDate,

            position:
                job.job_title ||
                existingHiring?.position ||
                "—",

            salary_offer:
                salaryOffer,

            employment_status:
                employmentStatus ||
                null,

            start_date:
                startDate,

            status:
                decision,

            updated_at:
                new Date()
                    .toISOString()

        };


        /* =================================================
           INSERT OR UPDATE
           ================================================= */

        if (
            existingHiring
        ) {

            const {
                error
            } =
                await window.rmsSupabase
                    .from(
                        "hiring"
                    )
                    .update(
                        hiringData
                    )
                    .eq(
                        "hiring_id",
                        existingHiring
                            .hiring_id
                    );


            if (error) {
                throw error;
            }

        } else {

            const {
                error
            } =
                await window.rmsSupabase
                    .from(
                        "hiring"
                    )
                    .insert({

                        ...hiringData,

                        created_at:
                            new Date()
                                .toISOString()

                    });


            if (error) {
                throw error;
            }

        }


        /* =================================================
           UPDATE APPLICATION STATUS
           ================================================= */

        let applicationStatus =
            "ON HOLD";


        if (
            decision ===
            "HIRED"
        ) {

            applicationStatus =
                "HIRED";

        } else if (
            decision ===
            "DECLINED"
        ) {

            applicationStatus =
                "DECLINED";

        } else if (
            decision ===
            "REJECTED"
        ) {

            applicationStatus =
                "REJECTED";

        } else if (
            decision ===
            "ON HOLD"
        ) {

            applicationStatus =
                "ON HOLD";

        }


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
                        applicationStatus

                })
                .eq(
                    "application_id",
                    selectedApplicationId
                );


        if (applicationError) {
            throw applicationError;
        }


        /* =================================================
           UPDATE LOCAL DATA
           ================================================= */

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
            localCandidate
                ?.application
        ) {

            localCandidate
                .application
                .status =
                applicationStatus;

        }


        /* =================================================
           SUCCESS
           ================================================= */

        showToast(
            `Hiring decision saved: ${decision}.`,
            "success"
        );


        closeHiringDecisionModal();


        updateSelectionSummary();


        renderSelectionCandidates();


    } catch (error) {

        console.error(
            "Save hiring decision error:",
            error
        );


        const message =
            getHiringDatabaseErrorMessage(
                error
            );


        setHiringError(
            message
        );


        showToast(
            message,
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
   DATABASE ERROR MESSAGE
   ========================================================= */

function getDatabaseErrorMessage(
    error
) {

    const message =
        String(
            error?.message ||
                ""
        );


    const lower =
        message.toLowerCase();


    if (
        lower.includes(
            "relation"
        ) &&
        lower.includes(
            "hiring"
        ) &&
        lower.includes(
            "does not exist"
        )
    ) {

        return (
            "The hiring table does not exist. Run the Lab 17 SQL first."
        );

    }


    if (
        lower.includes(
            "foreign key"
        )
    ) {

        return (
            "The selected record is not properly linked to the hiring data."
        );

    }


    if (
        lower.includes(
            "row-level security"
        ) ||
        lower.includes(
            "rls"
        )
    ) {

        return (
            "The database blocked this action because of RLS permissions."
        );

    }


    if (
        lower.includes(
            "applications_status_check"
        )
    ) {

        return (
            "The application status is not allowed by the database constraint."
        );

    }


    return (
        error?.message ||
        error?.details ||
        "Unable to complete the database request."
    );

}


function getHiringDatabaseErrorMessage(
    error
) {

    const message =
        String(
            error?.message ||
                ""
        );


    const lower =
        message.toLowerCase();


    if (
        lower.includes(
            "relation"
        ) &&
        lower.includes(
            "hiring"
        ) &&
        lower.includes(
            "does not exist"
        )
    ) {

        return (
            "The hiring table does not exist. Run the Lab 17 SQL first."
        );

    }


    if (
        lower.includes(
            "hiring_status_check"
        )
    ) {

        return (
            "The hiring decision is not allowed by the hiring status constraint."
        );

    }


    if (
        lower.includes(
            "applications_status_check"
        )
    ) {

        return (
            "The application status is not allowed by the database constraint."
        );

    }


    if (
        lower.includes(
            "row-level security"
        ) ||
        lower.includes(
            "rls"
        )
    ) {

        return (
            "Database permissions blocked the hiring decision. Check the hiring table RLS policies."
        );

    }


    return (
        error?.message ||
        error?.details ||
        "Unable to save hiring decision."
    );

}


/* =========================================================
   LAB 16 SUMMARY
   ========================================================= */

function updateSelectionSummary() {

    const qualified =
        selectionCandidates.filter(
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
                        "INTERVIEWED"

                );

            }
        ).length;


    const selected =
        selectionCandidates.filter(
            candidate =>

                normalizeStatus(
                    candidate
                        .application
                        ?.status
                ) ===
                "SELECTED FOR HIRING"

        ).length;


    const hired =
        selectionCandidates.filter(
            candidate =>

                normalizeStatus(
                    candidate
                        .application
                        ?.status
                ) ===
                "HIRED"

        ).length;


    const scores =
        selectionCandidates
            .map(
                candidate =>
                    candidate
                        .overallScore
            )
            .filter(
                score =>
                    score !== null &&
                    score !== undefined &&
                    Number.isFinite(
                        score
                    )
            );


    const average =
        scores.length

            ? scores.reduce(
                (
                    sum,
                    score
                ) =>
                    sum + score,
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


    const hiredElement =
        document.getElementById(
            "hiredCount"
        );


    const averageElement =
        document.getElementById(
            "averageScore"
        );


    if (
        qualifiedElement
    ) {

        qualifiedElement.textContent =
            qualified;

    }


    if (
        selectedElement
    ) {

        selectedElement.textContent =
            selected;

    }


    if (
        hiredElement
    ) {

        hiredElement.textContent =
            hired;

    }


    if (
        averageElement
    ) {

        averageElement.textContent =
            average.toFixed(
                1
            );

    }

}


/* =========================================================
   STATUS DISPLAY
   ========================================================= */

function renderCandidateStatus(
    status
) {

    const normalized =
        normalizeStatus(
            status
        );


    let className =
        "selection-status-qualified";


    let display =
        status ||
        "QUALIFIED";


    if (
        normalized ===
        "SELECTED FOR HIRING"
    ) {

        className =
            "selection-status-selected";


        display =
            "SELECTED FOR HIRING";


    } else if (
        normalized ===
        "HIRED"
    ) {

        className =
            "selection-status-hired";


        display =
            "HIRED";


    } else if (
        normalized ===
        "DECLINED"
    ) {

        className =
            "selection-status-declined";


        display =
            "DECLINED";


    } else if (
        normalized ===
        "REJECTED"
    ) {

        className =
            "selection-status-rejected";


        display =
            "REJECTED";


    } else if (
        normalized ===
        "ON HOLD"
    ) {

        className =
            "selection-status-hold";


        display =
            "ON HOLD";

    }


    return `

        <span
            class="
                selection-status
                ${className}
            "
        >
            ${escapeHtml(
                display
            )}
        </span>

    `;

}


/* =========================================================
   SCORE DISPLAY
   ========================================================= */

function renderScore(
    score
) {

    if (
        score === null ||
        score === undefined
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
        score === null ||
        score === undefined
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


    return `

        <span
            class="
                selection-score
                selection-score-high
            "
        >
            ${escapeHtml(
                value.toFixed(
                    1
                )
            )}/100
        </span>

    `;

}


/* =========================================================
   SCORE CALCULATION
   ========================================================= */

function calculateOverallScore(
    screeningScore,
    interviewScore
) {

    if (
        screeningScore === null ||
        interviewScore === null
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
   SELECTED STATUS
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
   NORMALIZE HIRING DECISION
   ========================================================= */

function normalizeHiringDecision(
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
   NUMBER
   ========================================================= */

function toNumberOrNull(
    value
) {

    if (
        value === null ||
        value === undefined ||
        value === ""
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


/* =========================================================
   SCORE CHECK
   ========================================================= */

function hasScore(
    value
) {

    return (

        value !== null &&
        value !== undefined &&
        value !== ""

    );

}


/* =========================================================
   TODAY
   ========================================================= */

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
   SELECTION MODAL
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
   HIRING MODAL
   ========================================================= */

function toggleHiringDecisionModal(
    open
) {

    const modal =
        document.getElementById(
            "hiringDecisionModal"
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


function closeHiringDecisionModal() {

    selectedApplicationId =
        null;


    clearHiringError();


    toggleHiringDecisionModal(
        false
    );

}


/* =========================================================
   SELECTION ERRORS
   ========================================================= */

function setSelectionError(
    message
) {

    const element =
        document.getElementById(
            "selectionFormError"
        );


    if (
        element
    ) {

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
   HIRING ERRORS
   ========================================================= */

function setHiringError(
    message
) {

    const element =
        document.getElementById(
            "hiringFormError"
        );


    if (
        element
    ) {

        element.textContent =
            message ||
            "";

    }

}


function clearHiringError() {

    setHiringError(
        ""
    );

}


/* =========================================================
   BUTTON LOADING
   =========================================================

   Uses the existing setButtonLoading()
   from components.js.

   ========================================================= */


/* =========================================================
   HTML ESCAPE
   ========================================================= */

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