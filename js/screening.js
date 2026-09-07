/* =========================================================
   RMS — LAB 10 + LAB 11 + LAB 12
   APPLICANT SCREENING
   ========================================================= */

let screeningCriteria = [];
let applications = [];
let screeningHistory = [];

let editingCriterionId = null;
let pendingDeleteCriterion = null;
let selectedApplication = null;


/*
 * Qualification threshold.
 * 70 points or higher = Qualified.
 */
const QUALIFICATION_THRESHOLD = 70;


/* =========================================================
   INITIALIZE
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    initScreening
);


async function initScreening() {

    try {

        renderShell({
            active: "Screening"
        });

        const session =
            await requireAuth();

        if (!session) {
            return;
        }

        setupScreeningEvents();

        loadUserProfile()
            .catch(console.warn);

        await Promise.all([
            loadScreeningCriteria(),
            loadApplications(),
            loadScreeningHistory()
        ]);

    } catch (error) {

        console.error(
            "Screening initialization error:",
            error
        );

        showToast(
            "Unable to load screening.",
            "error"
        );
    }
}


/* =========================================================
   EVENTS
   ========================================================= */

function setupScreeningEvents() {

    /* -----------------------------------------------------
       LAB 10
       ----------------------------------------------------- */

    document
        .getElementById("openCriterionModal")
        ?.addEventListener(
            "click",
            () => openCriterionForm()
        );

    document
        .getElementById("closeCriterionModal")
        ?.addEventListener(
            "click",
            closeCriterionForm
        );

    document
        .getElementById("cancelCriterionModal")
        ?.addEventListener(
            "click",
            closeCriterionForm
        );

    document
        .getElementById("criterionForm")
        ?.addEventListener(
            "submit",
            saveCriterion
        );

    document
        .getElementById("criterionSearch")
        ?.addEventListener(
            "input",
            renderScreeningCriteria
        );

    document
        .getElementById("criterionStatusFilter")
        ?.addEventListener(
            "change",
            renderScreeningCriteria
        );

    document
        .getElementById("criteriaTable")
        ?.addEventListener(
            "click",
            handleCriterionAction
        );


    /* -----------------------------------------------------
       LAB 11
       ----------------------------------------------------- */

    document
        .getElementById("evaluationApplication")
        ?.addEventListener(
            "change",
            handleApplicationSelection
        );

    document
        .getElementById("evaluationCriteriaTable")
        ?.addEventListener(
            "input",
            handleScoreInput
        );

    document
        .getElementById("saveEvaluation")
        ?.addEventListener(
            "click",
            saveEvaluation
        );

    document
        .getElementById("resetEvaluation")
        ?.addEventListener(
            "click",
            resetEvaluation
        );


    /* -----------------------------------------------------
       LAB 12
       ----------------------------------------------------- */

    document
        .getElementById("screeningHistorySearch")
        ?.addEventListener(
            "input",
            renderScreeningHistory
        );

    document
        .getElementById("screeningHistoryResultFilter")
        ?.addEventListener(
            "change",
            renderScreeningHistory
        );

    document
        .getElementById("screeningHistoryTable")
        ?.addEventListener(
            "click",
            handleHistoryAction
        );


    /* -----------------------------------------------------
       MODALS
       ----------------------------------------------------- */

    document
        .querySelectorAll(".modal-backdrop")
        .forEach(modal => {

            modal.addEventListener(
                "click",
                event => {

                    if (
                        event.target === modal
                    ) {

                        toggleScreeningModal(
                            modal.id,
                            false
                        );

                    }

                }
            );

        });


    /* -----------------------------------------------------
       ESCAPE KEY
       ----------------------------------------------------- */

    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key !== "Escape"
            ) {
                return;
            }

            document
                .querySelectorAll(
                    ".modal-backdrop.open"
                )
                .forEach(modal => {

                    toggleScreeningModal(
                        modal.id,
                        false
                    );

                });

            closeScreeningHistoryDetails();

            pendingDeleteCriterion = null;
        }
    );
}


/* =========================================================
   LAB 10
   LOAD SCREENING CRITERIA
   ========================================================= */

async function loadScreeningCriteria() {

    const table =
        document.getElementById(
            "criteriaTable"
        );

    if (!table) {
        return;
    }

    table.innerHTML = `
        <tr>
            <td
                colspan="4"
                class="table-empty"
            >
                Loading screening criteria...
            </td>
        </tr>
    `;

    try {

        const {
            data,
            error
        } =
            await window.rmsSupabase
                .from("screening_criteria")
                .select(`
                    criterion_id,
                    criterion_name,
                    description,
                    weight,
                    is_active,
                    created_at,
                    updated_at
                `)
                .order(
                    "criterion_id",
                    {
                        ascending: true
                    }
                );

        if (error) {
            throw error;
        }

        screeningCriteria =
            Array.isArray(data)
                ? data
                : [];

        renderScreeningCriteria();
        updateScreeningSummary();
        renderEvaluationCriteria();

    } catch (error) {

        console.error(
            "Load criteria error:",
            error
        );

        table.innerHTML = `
            <tr>
                <td
                    colspan="4"
                    class="table-empty"
                >
                    Unable to load screening criteria.
                </td>
            </tr>
        `;

        showToast(
            "Unable to load screening criteria.",
            "error"
        );
    }
}


/* =========================================================
   LAB 10
   RENDER SCREENING CRITERIA
   ========================================================= */

function renderScreeningCriteria() {

    const table =
        document.getElementById(
            "criteriaTable"
        );

    if (!table) {
        return;
    }

    const search =
        String(
            document.getElementById(
                "criterionSearch"
            )?.value || ""
        )
            .trim()
            .toLowerCase();

    const statusFilter =
        String(
            document.getElementById(
                "criterionStatusFilter"
            )?.value || ""
        )
            .trim();

    const filtered =
        screeningCriteria.filter(
            criterion => {

                const name =
                    String(
                        criterion.criterion_name || ""
                    )
                        .toLowerCase();

                const description =
                    String(
                        criterion.description || ""
                    )
                        .toLowerCase();

                const matchesSearch =
                    !search ||
                    name.includes(search) ||
                    description.includes(search);

                const activeStatus =
                    criterion.is_active
                        ? "Active"
                        : "Inactive";

                const matchesStatus =
                    !statusFilter ||
                    activeStatus === statusFilter;

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
                    colspan="4"
                    class="table-empty"
                >
                    No screening criteria found.
                </td>
            </tr>
        `;

        return;
    }

    table.innerHTML =
        filtered
            .map(
                criterion => {

                    const active =
                        Boolean(
                            criterion.is_active
                        );

                    return `
                        <tr>

                            <td>

                                <div class="criterion-name">

                                    <strong>
                                        ${escapeScreeningHtml(
                                            criterion.criterion_name ||
                                            "—"
                                        )}
                                    </strong>

                                    <span>
                                        ${escapeScreeningHtml(
                                            criterion.description ||
                                            "No description provided."
                                        )}
                                    </span>

                                </div>

                            </td>


                            <td>

                                <span class="weight-value">
                                    ${formatWeight(
                                        criterion.weight
                                    )}%
                                </span>

                            </td>


                            <td>

                                ${
                                    active
                                        ? `
                                            <span class="criterion-active">
                                                Active
                                            </span>
                                          `
                                        : `
                                            <span class="criterion-inactive">
                                                Inactive
                                            </span>
                                          `
                                }

                            </td>


                            <td>

                                <div class="table-actions">

                                    <button
                                        type="button"
                                        class="table-action"
                                        data-action="edit"
                                        data-id="${criterion.criterion_id}"
                                    >
                                        Edit
                                    </button>

                                    <button
                                        type="button"
                                        class="table-action danger"
                                        data-action="delete"
                                        data-id="${criterion.criterion_id}"
                                    >
                                        Delete
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
   LAB 10
   UPDATE SUMMARY
   ========================================================= */

function updateScreeningSummary() {

    const totalCriteria =
        document.getElementById(
            "totalCriteria"
        );

    const activeCriteria =
        document.getElementById(
            "activeCriteria"
        );

    const criteriaWeight =
        document.getElementById(
            "criteriaWeight"
        );

    const weightTotal =
        document.getElementById(
            "weightTotal"
        );

    const total =
        screeningCriteria.length;

    const active =
        screeningCriteria.filter(
            criterion =>
                criterion.is_active
        );

    const activeWeight =
        active.reduce(
            (
                sum,
                criterion
            ) =>
                sum +
                Number(
                    criterion.weight || 0
                ),
            0
        );

    if (totalCriteria) {
        totalCriteria.textContent =
            String(total);
    }

    if (activeCriteria) {
        activeCriteria.textContent =
            String(
                active.length
            );
    }

    if (criteriaWeight) {
        criteriaWeight.textContent =
            `${formatWeight(activeWeight)}%`;
    }

    if (weightTotal) {

        weightTotal.textContent =
            `${formatWeight(activeWeight)}%`;

        weightTotal.classList.remove(
            "valid",
            "invalid"
        );

        if (
            Math.abs(
                activeWeight - 100
            ) < 0.001
        ) {

            weightTotal.classList.add(
                "valid"
            );

        } else {

            weightTotal.classList.add(
                "invalid"
            );
        }
    }
}


/* =========================================================
   LAB 10
   OPEN CRITERION FORM
   ========================================================= */

function openCriterionForm(
    criterion = null
) {

    const form =
        document.getElementById(
            "criterionForm"
        );

    if (!form) {
        return;
    }

    form.reset();

    editingCriterionId =
        criterion?.criterion_id ||
        null;

    const title =
        document.getElementById(
            "criterionModalTitle"
        );

    if (title) {

        title.textContent =
            criterion
                ? "Edit Criterion"
                : "Add Criterion";
    }

    const errorBox =
        document.getElementById(
            "criterionFormError"
        );

    if (errorBox) {
        errorBox.textContent = "";
    }

    if (criterion) {

        setScreeningValue(
            "criterionId",
            criterion.criterion_id
        );

        setScreeningValue(
            "criterionName",
            criterion.criterion_name
        );

        setScreeningValue(
            "criterionDescription",
            criterion.description
        );

        setScreeningValue(
            "criterionWeight",
            criterion.weight
        );

        setScreeningValue(
            "criterionStatus",
            criterion.is_active
                ? "Active"
                : "Inactive"
        );

    } else {

        setScreeningValue(
            "criterionStatus",
            "Active"
        );
    }

    toggleScreeningModal(
        "criterionModal",
        true
    );
}


/* =========================================================
   LAB 10
   CLOSE CRITERION FORM
   ========================================================= */

function closeCriterionForm() {

    toggleScreeningModal(
        "criterionModal",
        false
    );
}


/* =========================================================
   LAB 10
   SAVE CRITERION
   ========================================================= */

async function saveCriterion(
    event
) {

    event.preventDefault();

    const errorBox =
        document.getElementById(
            "criterionFormError"
        );

    if (errorBox) {
        errorBox.textContent = "";
    }

    const criterionName =
        getScreeningValue(
            "criterionName"
        );

    const description =
        getScreeningValue(
            "criterionDescription"
        );

    const weight =
        Number(
            getScreeningValue(
                "criterionWeight"
            )
        );

    const status =
        getScreeningValue(
            "criterionStatus"
        );

    if (!criterionName) {

        showCriterionError(
            "Please enter a criterion name."
        );

        return;
    }

    if (
        !Number.isFinite(weight) ||
        weight < 0 ||
        weight > 100
    ) {

        showCriterionError(
            "Weight must be a number between 0 and 100."
        );

        return;
    }

    const duplicate =
        screeningCriteria.find(
            criterion =>
                String(
                    criterion.criterion_name || ""
                )
                    .trim()
                    .toLowerCase() ===
                criterionName
                    .trim()
                    .toLowerCase()
                &&
                String(
                    criterion.criterion_id
                ) !==
                String(
                    editingCriterionId
                )
        );

    if (duplicate) {

        showCriterionError(
            "A screening criterion with this name already exists."
        );

        return;
    }

    const isActive =
        status === "Active";

    const currentActiveWeight =
        screeningCriteria.reduce(
            (
                sum,
                criterion
            ) => {

                if (
                    !criterion.is_active
                ) {
                    return sum;
                }

                if (
                    editingCriterionId &&
                    String(
                        criterion.criterion_id
                    ) ===
                    String(
                        editingCriterionId
                    )
                ) {
                    return sum;
                }

                return (
                    sum +
                    Number(
                        criterion.weight || 0
                    )
                );
            },
            0
        );

    const newActiveWeight =
        isActive
            ? currentActiveWeight +
              weight
            : currentActiveWeight;

    if (
        newActiveWeight >
        100.001
    ) {

        showCriterionError(
            `Active criteria cannot exceed 100%. The new total would be ${formatWeight(newActiveWeight)}%.`
        );

        return;
    }

    const button =
        document.getElementById(
            "saveCriterionButton"
        );

    setScreeningButtonLoading(
        button,
        true
    );

    const payload = {

        criterion_name:
            criterionName,

        description:
            description ||
            null,

        weight:
            Number(
                weight.toFixed(2)
            ),

        is_active:
            isActive
    };

    try {

        let result;

        if (
            editingCriterionId
        ) {

            result =
                await window.rmsSupabase
                    .from(
                        "screening_criteria"
                    )
                    .update(
                        payload
                    )
                    .eq(
                        "criterion_id",
                        editingCriterionId
                    );

        } else {

            result =
                await window.rmsSupabase
                    .from(
                        "screening_criteria"
                    )
                    .insert([
                        payload
                    ]);
        }

        if (result.error) {
            throw result.error;
        }

        closeCriterionForm();

        showToast(
            editingCriterionId
                ? "Screening criterion updated successfully."
                : "Screening criterion added successfully."
        );

        await loadScreeningCriteria();

    } catch (error) {

        console.error(
            "Save criterion error:",
            error
        );

        showCriterionError(
            error?.message ||
            "Unable to save screening criterion."
        );

    } finally {

        setScreeningButtonLoading(
            button,
            false
        );
    }
}


/* =========================================================
   LAB 10
   CRITERION TABLE ACTIONS
   ========================================================= */

function handleCriterionAction(
    event
) {

    const button =
        event.target.closest(
            "[data-action]"
        );

    if (!button) {
        return;
    }

    const criterion =
        screeningCriteria.find(
            item =>
                String(
                    item.criterion_id
                ) ===
                String(
                    button.dataset.id
                )
        );

    if (!criterion) {
        return;
    }

    if (
        button.dataset.action ===
        "edit"
    ) {

        openCriterionForm(
            criterion
        );

        return;
    }

    if (
        button.dataset.action ===
        "delete"
    ) {

        openDeleteCriterion(
            criterion
        );
    }
}


/* =========================================================
   LAB 10
   DELETE CRITERION
   ========================================================= */

function openDeleteCriterion(
    criterion
) {

    if (!criterion) {
        return;
    }

    pendingDeleteCriterion =
        criterion;

    const message =
        document.getElementById(
            "deleteCriterionMessage"
        );

    const warning =
        document.getElementById(
            "deleteCriterionWarning"
        );

    const name =
        criterion.criterion_name ||
        "this criterion";

    if (message) {

        message.innerHTML = `
            Are you sure you want to delete
            <strong>
                ${escapeScreeningHtml(name)}
            </strong>?
        `;
    }

    if (
        warning &&
        criterion.is_active
    ) {

        const activeWeight =
            screeningCriteria.reduce(
                (
                    sum,
                    item
                ) =>
                    item.is_active
                        ? sum +
                          Number(
                              item.weight || 0
                          )
                        : sum,
                0
            );

        const newWeight =
            activeWeight -
            Number(
                criterion.weight || 0
            );

        warning.style.display =
            "block";

        warning.textContent =
            `After deletion, the active criteria total will be ${formatWeight(newWeight)}%.`;

    } else if (warning) {

        warning.style.display =
            "none";

        warning.textContent =
            "";
    }

    toggleScreeningModal(
        "deleteCriterionModal",
        true
    );
}


function closeDeleteCriterion() {

    pendingDeleteCriterion =
        null;

    toggleScreeningModal(
        "deleteCriterionModal",
        false
    );
}


async function confirmDeleteCriterion() {

    if (
        !pendingDeleteCriterion
    ) {
        return;
    }

    const criterion =
        pendingDeleteCriterion;

    const button =
        document.getElementById(
            "confirmDeleteCriterion"
        );

    if (button) {

        button.disabled =
            true;

        button.dataset.originalText =
            button.textContent;

        button.textContent =
            "Deleting...";
    }

    try {

        const {
            error
        } =
            await window.rmsSupabase
                .from(
                    "screening_criteria"
                )
                .delete()
                .eq(
                    "criterion_id",
                    criterion.criterion_id
                );

        if (error) {
            throw error;
        }

        closeDeleteCriterion();

        showToast(
            "Screening criterion deleted successfully."
        );

        await loadScreeningCriteria();

    } catch (error) {

        console.error(
            "Delete criterion error:",
            error
        );

        showToast(
            "Unable to delete screening criterion.",
            "error"
        );

    } finally {

        if (button) {

            button.disabled =
                false;

            button.textContent =
                button.dataset.originalText ||
                "Delete Criterion";
        }
    }
}


/* =========================================================
   LAB 11
   LOAD APPLICATIONS
   ========================================================= */

async function loadApplications() {

    const select =
        document.getElementById(
            "evaluationApplication"
        );

    if (!select) {
        return;
    }

    select.innerHTML = `
        <option value="">
            Loading applications...
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
                .order(
                    "application_date",
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

        renderApplicationOptions();

    } catch (error) {

        console.error(
            "Load applications error:",
            error
        );

        applications = [];

        select.innerHTML = `
            <option value="">
                Unable to load applications
            </option>
        `;

        showToast(
            "Unable to load applications.",
            "error"
        );
    }
}


/* =========================================================
   LAB 11
   APPLICATION OPTIONS
   ========================================================= */

function renderApplicationOptions() {

    const select =
        document.getElementById(
            "evaluationApplication"
        );

    if (!select) {
        return;
    }

    select.innerHTML = `
        <option value="">
            Select application
        </option>
    `;

    applications
        .filter(
            application => {

                const status =
                    String(
                        application.status || ""
                    )
                        .trim()
                        .toLowerCase();

                return (
                    status === "submitted" ||
                    status === "under screening"
                );
            }
        )
        .forEach(
            application => {

                const option =
                    document.createElement(
                        "option"
                    );

                const applicant =
                    application.applicants;

                const job =
                    application.job_postings;

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
            "No applications ready for screening";

        option.disabled =
            true;

        select.appendChild(
            option
        );
    }
}


/* =========================================================
   LAB 11
   APPLICATION SELECTION
   ========================================================= */

async function handleApplicationSelection() {

    const select =
        document.getElementById(
            "evaluationApplication"
        );

    const applicationId =
        select?.value;

    clearEvaluationError();

    if (!applicationId) {

        selectedApplication =
            null;

        clearEvaluationDisplay();

        return;
    }

    selectedApplication =
        applications.find(
            application =>
                String(
                    application.application_id
                ) ===
                String(
                    applicationId
                )
        );

    if (!selectedApplication) {
        return;
    }

    await markApplicationUnderScreening(
        selectedApplication
    );

    updateApplicationInfo();

    renderEvaluationCriteria();
}


/* =========================================================
   LAB 11
   MARK APPLICATION UNDER SCREENING
   ========================================================= */

async function markApplicationUnderScreening(
    application
) {

    const currentStatus =
        String(
            application.status || ""
        )
            .trim()
            .toLowerCase();

    if (
        currentStatus !==
        "submitted"
    ) {
        return;
    }

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
                        "Under Screening"
                })
                .eq(
                    "application_id",
                    application.application_id
                );

        if (error) {
            throw error;
        }

        application.status =
            "Under Screening";

    } catch (error) {

        console.error(
            "Update application status error:",
            error
        );

        showToast(
            "Unable to update application status.",
            "error"
        );
    }
}


/* =========================================================
   LAB 11
   APPLICATION INFO
   ========================================================= */

function updateApplicationInfo() {

    const info =
        document.getElementById(
            "applicationInfo"
        );

    if (!selectedApplication) {

        if (info) {
            info.hidden = true;
        }

        return;
    }

    const applicant =
        selectedApplication.applicants;

    const job =
        selectedApplication.job_postings;

    const applicantElement =
        document.getElementById(
            "evaluationApplicant"
        );

    const positionElement =
        document.getElementById(
            "evaluationPosition"
        );

    const statusElement =
        document.getElementById(
            "evaluationStatus"
        );

    if (applicantElement) {

        applicantElement.textContent =
            `${applicant?.applicant_no || "—"} — ${applicant?.first_name || ""} ${applicant?.last_name || ""}`
                .trim();
    }

    if (positionElement) {

        positionElement.textContent =
            job?.job_title ||
            "—";
    }

    if (statusElement) {

        statusElement.textContent =
            selectedApplication.status ||
            "—";
    }

    if (info) {
        info.hidden = false;
    }
}


/* =========================================================
   LAB 11
   RENDER EVALUATION CRITERIA
   ========================================================= */

function renderEvaluationCriteria() {

    const section =
        document.getElementById(
            "evaluationSection"
        );

    const table =
        document.getElementById(
            "evaluationCriteriaTable"
        );

    if (!section || !table) {
        return;
    }

    if (!selectedApplication) {

        section.hidden =
            true;

        table.innerHTML =
            "";

        return;
    }

    const activeCriteria =
        screeningCriteria.filter(
            criterion =>
                criterion.is_active
        );

    const activeWeight =
        activeCriteria.reduce(
            (
                sum,
                criterion
            ) =>
                sum +
                Number(
                    criterion.weight || 0
                ),
            0
        );

    section.hidden =
        false;

    if (!activeCriteria.length) {

        table.innerHTML = `
            <tr>

                <td
                    colspan="3"
                    class="table-empty"
                >
                    No active screening criteria configured.
                </td>

            </tr>
        `;

        return;
    }

    table.innerHTML =
        activeCriteria
            .map(
                criterion => {

                    const weight =
                        Number(
                            criterion.weight || 0
                        );

                    return `
                        <tr>

                            <td>

                                <strong>
                                    ${escapeScreeningHtml(
                                        criterion.criterion_name
                                    )}
                                </strong>

                                <br>

                                <span class="score-range">
                                    ${escapeScreeningHtml(
                                        criterion.description ||
                                        ""
                                    )}
                                </span>

                            </td>

                            <td>
                                ${formatWeight(
                                    weight
                                )} points
                            </td>

                            <td>

                                <input
                                    type="number"
                                    class="score-input"
                                    min="0"
                                    max="${weight}"
                                    step="0.01"
                                    value="0"
                                    data-criterion-id="${criterion.criterion_id}"
                                    data-max-score="${weight}"
                                >

                                <span class="score-range">
                                    / ${formatWeight(
                                        weight
                                    )}
                                </span>

                            </td>

                        </tr>
                    `;
                }
            )
            .join("");

    const scoreElement =
        document.getElementById(
            "evaluationScore"
        );

    if (scoreElement) {

        scoreElement.textContent =
            `0 / ${formatWeight(
                activeWeight
            )}`;
    }

    const resultElement =
        document.getElementById(
            "evaluationResult"
        );

    if (resultElement) {

        resultElement.textContent =
            "—";

        resultElement.classList.remove(
            "evaluation-result-qualified",
            "evaluation-result-rejected"
        );
    }

    clearEvaluationError();
}


/* =========================================================
   LAB 11
   SCORE INPUT
   ========================================================= */

function handleScoreInput(
    event
) {

    const input =
        event.target.closest(
            ".score-input"
        );

    if (!input) {
        return;
    }

    let score =
        Number(
            input.value
        );

    const max =
        Number(
            input.dataset.maxScore
        );

    if (!Number.isFinite(score)) {
        score = 0;
    }

    if (score < 0) {
        score = 0;
    }

    if (score > max) {
        score = max;
    }

    input.value =
        String(score);

    calculateEvaluationScore();
}


/* =========================================================
   LAB 11
   CALCULATE SCORE
   ========================================================= */

function calculateEvaluationScore() {

    const inputs =
        document.querySelectorAll(
            "#evaluationCriteriaTable .score-input"
        );

    let total =
        0;

    let maximum =
        0;

    inputs.forEach(
        input => {

            const score =
                Number(
                    input.value || 0
                );

            const max =
                Number(
                    input.dataset.maxScore || 0
                );

            total +=
                Math.min(
                    Math.max(
                        score,
                        0
                    ),
                    max
                );

            maximum +=
                max;
        }
    );

    const scoreElement =
        document.getElementById(
            "evaluationScore"
        );

    const resultElement =
        document.getElementById(
            "evaluationResult"
        );

    if (scoreElement) {

        scoreElement.textContent =
            `${formatWeight(total)} / ${formatWeight(maximum)}`;
    }

    if (!resultElement) {

        return {
            total,
            maximum,
            result: null
        };
    }

    resultElement.classList.remove(
        "evaluation-result-qualified",
        "evaluation-result-rejected"
    );

    if (
        Math.abs(
            maximum - 100
        ) > 0.001
    ) {

        resultElement.textContent =
            "Criteria total must equal 100%";

        return {
            total,
            maximum,
            result: null
        };
    }

    const qualified =
        total >=
        QUALIFICATION_THRESHOLD;

    resultElement.textContent =
        qualified
            ? "QUALIFIED"
            : "NOT QUALIFIED";

    resultElement.classList.add(
        qualified
            ? "evaluation-result-qualified"
            : "evaluation-result-rejected"
    );

    return {
        total,
        maximum,
        result:
            qualified
                ? "Qualified"
                : "Not Qualified"
    };
}


/* =========================================================
   LAB 11
   SAVE EVALUATION
   ========================================================= */

async function saveEvaluation() {

    clearEvaluationError();

    if (!selectedApplication) {

        showEvaluationError(
            "Please select an application."
        );

        return;
    }

    const activeCriteria =
        screeningCriteria.filter(
            criterion =>
                criterion.is_active
        );

    if (!activeCriteria.length) {

        showEvaluationError(
            "No active screening criteria are configured."
        );

        return;
    }

    const activeWeight =
        activeCriteria.reduce(
            (
                sum,
                criterion
            ) =>
                sum +
                Number(
                    criterion.weight || 0
                ),
            0
        );

    if (
        Math.abs(
            activeWeight - 100
        ) > 0.001
    ) {

        showEvaluationError(
            `Active screening criteria must total 100%. Current total is ${formatWeight(activeWeight)}%.`
        );

        return;
    }

    const calculated =
        calculateEvaluationScore();

    if (
        !calculated ||
        !calculated.result
    ) {

        showEvaluationError(
            "Unable to calculate the screening result."
        );

        return;
    }

    const remarks =
        String(
            document.getElementById(
                "evaluationRemarks"
            )?.value || ""
        )
            .trim();

    const button =
        document.getElementById(
            "saveEvaluation"
        );

    if (button) {

        button.disabled =
            true;

        button.dataset.originalText =
            button.textContent;

        button.textContent =
            "Saving...";
    }

    try {

        const {
            data: userData,
            error: userError
        } =
            await window.rmsSupabase
                .auth
                .getUser();

        if (userError) {
            throw userError;
        }

        const user =
            userData?.user;

        if (!user) {

            throw new Error(
                "Authenticated user not found."
            );
        }

        const screeningPayload = {

            application_id:
                selectedApplication.application_id,

            screening_date:
                getTodayLocalDate(),

            score:
                Number(
                    calculated.total.toFixed(2)
                ),

            result:
                calculated.result,

            remarks:
                remarks ||
                null,

            screened_by:
                user.id
        };

        const {
            error:
                screeningError
        } =
            await window.rmsSupabase
                .from(
                    "screenings"
                )
                .insert([
                    screeningPayload
                ]);

        if (screeningError) {
            throw screeningError;
        }

        const newApplicationStatus =
            calculated.result ===
            "Qualified"
                ? "Qualified"
                : "Rejected";

        const {
            error:
                applicationUpdateError
        } =
            await window.rmsSupabase
                .from(
                    "applications"
                )
                .update({
                    status:
                        newApplicationStatus
                })
                .eq(
                    "application_id",
                    selectedApplication.application_id
                );

        if (
            applicationUpdateError
        ) {
            throw applicationUpdateError;
        }

        selectedApplication.status =
            newApplicationStatus;

        showToast(
            `Screening saved. Applicant is ${calculated.result}.`
        );

        await loadApplications();

        await loadScreeningHistory();

        resetEvaluation();

    } catch (error) {

        console.error(
            "Save screening evaluation error:",
            error
        );

        showEvaluationError(
            getScreeningDatabaseErrorMessage(
                error
            )
        );

    } finally {

        if (button) {

            button.disabled =
                false;

            button.textContent =
                button.dataset.originalText ||
                "Save Screening";
        }
    }
}


/* =========================================================
   LAB 11
   RESET EVALUATION
   ========================================================= */

function resetEvaluation() {

    selectedApplication =
        null;

    const select =
        document.getElementById(
            "evaluationApplication"
        );

    const info =
        document.getElementById(
            "applicationInfo"
        );

    const section =
        document.getElementById(
            "evaluationSection"
        );

    const remarks =
        document.getElementById(
            "evaluationRemarks"
        );

    if (select) {
        select.value = "";
    }

    if (info) {
        info.hidden = true;
    }

    if (section) {
        section.hidden = true;
    }

    if (remarks) {
        remarks.value = "";
    }

    clearEvaluationError();

    clearEvaluationDisplay();
}


/* =========================================================
   LAB 11
   CLEAR EVALUATION DISPLAY
   ========================================================= */

function clearEvaluationDisplay() {

    const table =
        document.getElementById(
            "evaluationCriteriaTable"
        );

    if (table) {
        table.innerHTML = "";
    }

    const score =
        document.getElementById(
            "evaluationScore"
        );

    if (score) {
        score.textContent =
            "0 / 100";
    }

    const result =
        document.getElementById(
            "evaluationResult"
        );

    if (result) {

        result.textContent =
            "—";

        result.classList.remove(
            "evaluation-result-qualified",
            "evaluation-result-rejected"
        );
    }

    const applicant =
        document.getElementById(
            "evaluationApplicant"
        );

    const position =
        document.getElementById(
            "evaluationPosition"
        );

    const status =
        document.getElementById(
            "evaluationStatus"
        );

    if (applicant) {
        applicant.textContent =
            "—";
    }

    if (position) {
        position.textContent =
            "—";
    }

    if (status) {
        status.textContent =
            "—";
    }
}


/* =========================================================
   LAB 11
   ERROR HELPERS
   ========================================================= */

function showEvaluationError(
    message
) {

    const error =
        document.getElementById(
            "evaluationError"
        );

    if (error) {

        error.textContent =
            message;
    }
}


function clearEvaluationError() {

    const error =
        document.getElementById(
            "evaluationError"
        );

    if (error) {

        error.textContent =
            "";
    }
}


function showCriterionError(
    message
) {

    const error =
        document.getElementById(
            "criterionFormError"
        );

    if (error) {

        error.textContent =
            message;
    }
}


/* =========================================================
   DATABASE ERROR
   ========================================================= */

function getScreeningDatabaseErrorMessage(
    error
) {

    const message =
        String(
            error?.message ||
            ""
        ).toLowerCase();

    if (
        message.includes("screenings") &&
        message.includes("does not exist")
    ) {

        return "The screenings table does not exist. Run the Lab 11 SQL first.";
    }

    if (
        message.includes("row-level security") ||
        message.includes("rls")
    ) {

        return "Screening was blocked by database permissions. Check the screenings RLS policies.";
    }

    return (
        error?.message ||
        "Unable to save screening evaluation."
    );
}


/* =========================================================
   LAB 12
   LOAD SCREENING HISTORY
   ========================================================= */

async function loadScreeningHistory() {

    const table =
        document.getElementById(
            "screeningHistoryTable"
        );

    if (!table) {
        return;
    }

    table.innerHTML = `
        <tr>
            <td
                colspan="7"
                class="table-empty"
            >
                Loading screening history...
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
                    "screenings"
                )
                .select(`
                    screening_id,
                    application_id,
                    screening_date,
                    score,
                    result,
                    remarks,
                    screened_by,
                    created_at,
                    applications (
                        application_id,
                        applicant_id,
                        job_id,
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
                    "screening_date",
                    {
                        ascending: false
                    }
                );

        if (error) {
            throw error;
        }

        screeningHistory =
            Array.isArray(data)
                ? data
                : [];

        renderScreeningHistory();

    } catch (error) {

        console.error(
            "Load screening history error:",
            error
        );

        screeningHistory =
            [];

        table.innerHTML = `
            <tr>
                <td
                    colspan="7"
                    class="table-empty"
                >
                    Unable to load screening history.
                </td>
            </tr>
        `;

        showToast(
            "Unable to load screening history.",
            "error"
        );
    }
}


/* =========================================================
   LAB 12
   RENDER SCREENING HISTORY
   ========================================================= */

function renderScreeningHistory() {

    const table =
        document.getElementById(
            "screeningHistoryTable"
        );

    if (!table) {
        return;
    }

    const search =
        String(
            document.getElementById(
                "screeningHistorySearch"
            )?.value || ""
        )
            .trim()
            .toLowerCase();

    const resultFilter =
        String(
            document.getElementById(
                "screeningHistoryResultFilter"
            )?.value || ""
        )
            .trim();

    const filtered =
        screeningHistory.filter(
            screening => {

                const application =
                    screening.applications;

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

                const score =
                    String(
                        screening.score ?? ""
                    );

                const result =
                    String(
                        screening.result || ""
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
                    score.includes(search);

                const matchesResult =
                    !resultFilter ||
                    result === resultFilter;

                return (
                    matchesSearch &&
                    matchesResult
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
                    No screening history found.
                </td>
            </tr>
        `;

        return;
    }

    table.innerHTML =
        filtered
            .map(
                screening => {

                    const application =
                        screening.applications;

                    const applicant =
                        application?.applicants;

                    const job =
                        application?.job_postings;

                    const applicantName =
                        `${applicant?.first_name || ""} ${applicant?.last_name || ""}`
                            .trim();

                    const result =
                        String(
                            screening.result || ""
                        );

                    const resultClass =
                        result === "Qualified"
                            ? "history-qualified"
                            : "history-not-qualified";

                    return `
                        <tr>

                            <td>

                                <div class="history-applicant">

                                    <strong>
                                        ${escapeScreeningHtml(
                                            applicantName ||
                                            "—"
                                        )}
                                    </strong>

                                    <span>
                                        ${escapeScreeningHtml(
                                            applicant?.applicant_no ||
                                            "—"
                                        )}
                                    </span>

                                </div>

                            </td>


                            <td>

                                <div class="history-applicant">

                                    <strong>
                                        ${escapeScreeningHtml(
                                            job?.job_title ||
                                            "—"
                                        )}
                                    </strong>

                                    <span>
                                        ${escapeScreeningHtml(
                                            job?.job_code ||
                                            ""
                                        )}
                                    </span>

                                </div>

                            </td>


                            <td>

                                <span class="history-score">
                                    ${formatScreeningScore(
                                        screening.score
                                    )}/100
                                </span>

                            </td>


                            <td>

                                <span class="${resultClass}">
                                    ${escapeScreeningHtml(
                                        result ||
                                        "—"
                                    )}
                                </span>

                            </td>


                            <td>
                                ${formatHistoryDate(
                                    screening.screening_date
                                )}
                            </td>


                            <td>
                                ${escapeScreeningHtml(
                                    getScreenedByDisplay(
                                        screening.screened_by
                                    )
                                )}
                            </td>


                            <td>

                                <div class="table-actions">

                                    <button
                                        type="button"
                                        class="table-action"
                                        data-history-action="view"
                                        data-id="${screening.screening_id}"
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
   LAB 12
   HISTORY ACTION
   ========================================================= */

function handleHistoryAction(
    event
) {

    const button =
        event.target.closest(
            "[data-history-action]"
        );

    if (!button) {
        return;
    }

    const screening =
        screeningHistory.find(
            item =>
                String(
                    item.screening_id
                ) ===
                String(
                    button.dataset.id
                )
        );

    if (!screening) {
        return;
    }

    if (
        button.dataset.historyAction ===
        "view"
    ) {

        openScreeningHistoryDetails(
            screening
        );
    }
}


/* =========================================================
   LAB 12
   VIEW HISTORY DETAILS
   ========================================================= */

function openScreeningHistoryDetails(
    screening
) {

    closeScreeningHistoryDetails();

    const application =
        screening.applications;

    const applicant =
        application?.applicants;

    const job =
        application?.job_postings;

    const applicantName =
        `${applicant?.first_name || ""} ${applicant?.last_name || ""}`
            .trim();

    const result =
        screening.result ||
        "—";

    const resultClass =
        result === "Qualified"
            ? "history-qualified"
            : "history-not-qualified";

    const modal =
        document.createElement(
            "div"
        );

    modal.id =
        "screeningHistoryDetailsModal";

    modal.className =
        "modal-backdrop";

    modal.setAttribute(
        "aria-hidden",
        "false"
    );

    modal.classList.add(
        "open"
    );

    modal.innerHTML = `

        <div
            class="modal glass-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="screeningHistoryDetailsTitle"
        >

            <div class="modal-head">

                <div>

                    <p class="eyebrow">
                        Screening History
                    </p>

                    <h3
                        id="screeningHistoryDetailsTitle"
                    >
                        Screening Details
                    </h3>

                </div>


                <button
                    type="button"
                    class="icon-button"
                    id="closeScreeningHistoryDetails"
                    aria-label="Close"
                >
                    ×
                </button>

            </div>


            <div class="history-details">


                <div class="history-detail-item">

                    <small>
                        Applicant
                    </small>

                    <div>
                        ${escapeScreeningHtml(
                            applicantName ||
                            "—"
                        )}
                    </div>

                </div>


                <div class="history-detail-item">

                    <small>
                        Applicant No.
                    </small>

                    <div>
                        ${escapeScreeningHtml(
                            applicant?.applicant_no ||
                            "—"
                        )}
                    </div>

                </div>


                <div class="history-detail-item">

                    <small>
                        Position
                    </small>

                    <div>
                        ${escapeScreeningHtml(
                            job?.job_title ||
                            "—"
                        )}
                    </div>

                </div>


                <div class="history-detail-item">

                    <small>
                        Job Code
                    </small>

                    <div>
                        ${escapeScreeningHtml(
                            job?.job_code ||
                            "—"
                        )}
                    </div>

                </div>


                <div class="history-detail-item">

                    <small>
                        Screening Score
                    </small>

                    <div>
                        ${formatScreeningScore(
                            screening.score
                        )}/100
                    </div>

                </div>


                <div class="history-detail-item">

                    <small>
                        Result
                    </small>

                    <div>

                        <span class="${resultClass}">
                            ${escapeScreeningHtml(
                                result
                            )}
                        </span>

                    </div>

                </div>


                <div class="history-detail-item">

                    <small>
                        Screening Date
                    </small>

                    <div>
                        ${formatHistoryDate(
                            screening.screening_date
                        )}
                    </div>

                </div>


                <div class="history-detail-item">

                    <small>
                        Screened By
                    </small>

                    <div>
                        ${escapeScreeningHtml(
                            getScreenedByDisplay(
                                screening.screened_by
                            )
                        )}
                    </div>

                </div>


                <div class="history-detail-item">

                    <small>
                        Remarks
                    </small>

                    <div>
                        ${escapeScreeningHtml(
                            screening.remarks ||
                            "No remarks provided."
                        )}
                    </div>

                </div>


            </div>


            <div
                class="button-row"
                style="margin-top:18px;"
            >

                <button
                    type="button"
                    class="btn btn-secondary"
                    id="closeScreeningHistoryDetailsBottom"
                >
                    Close
                </button>

            </div>

        </div>
    `;

    document.body.appendChild(
        modal
    );

    document
        .getElementById(
            "closeScreeningHistoryDetails"
        )
        ?.addEventListener(
            "click",
            closeScreeningHistoryDetails
        );

    document
        .getElementById(
            "closeScreeningHistoryDetailsBottom"
        )
        ?.addEventListener(
            "click",
            closeScreeningHistoryDetails
        );

    modal.addEventListener(
        "click",
        event => {

            if (
                event.target === modal
            ) {

                closeScreeningHistoryDetails();

            }
        }
    );
}


/* =========================================================
   LAB 12
   CLOSE HISTORY DETAILS
   ========================================================= */

function closeScreeningHistoryDetails() {

    const modal =
        document.getElementById(
            "screeningHistoryDetailsModal"
        );

    if (modal) {
        modal.remove();
    }
}


/* =========================================================
   HISTORY HELPERS
   ========================================================= */

function formatScreeningScore(
    value
) {

    const number =
        Number(
            value || 0
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


function formatHistoryDate(
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
            month: "short",
            day: "numeric",
            year: "numeric"
        }
    );
}


function getScreenedByDisplay(
    userId
) {

    if (!userId) {
        return "—";
    }

    const text =
        String(
            userId
        );

    if (
        text.length <= 12
    ) {

        return text;
    }

    return (
        text.substring(
            0,
            8
        ) +
        "..."
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
   MODAL
   ========================================================= */

function toggleScreeningModal(
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

function getScreeningValue(
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


function setScreeningValue(
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

function setScreeningButtonLoading(
    button,
    loading
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
            "Saving...";

    } else {

        button.disabled =
            false;

        button.textContent =
            button.dataset.originalText ||
            "Save Criterion";
    }
}


/* =========================================================
   FORMAT WEIGHT
   ========================================================= */

function formatWeight(
    value
) {

    const number =
        Number(
            value || 0
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
   ESCAPE HTML
   ========================================================= */

function escapeScreeningHtml(
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