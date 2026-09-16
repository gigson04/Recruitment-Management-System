/* =========================================================
   RECRUITMENT MANAGEMENT SYSTEM

   LABORATORY ACTIVITY 18
   APPLICANT-TO-EMPLOYEE CONVERSION

   Features:
   - Load hired applicants
   - Display employee records
   - Convert hired applicant
   - Transfer applicant information
   - Transfer position
   - Transfer department
   - Transfer start date
   - Assign employee number
   - Set employment status
   - Prevent duplicate employee conversion
   - View employee details
   - Search employees
   - Filter employees
   ========================================================= */


/* =========================================================
   GLOBAL VARIABLES
   ========================================================= */

let employees = [];

let conversionCandidates = [];

let selectedConversionCandidate = null;

let employeeEventsBound = false;


/* =========================================================
   INITIALIZE
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    initEmployees
);


async function initEmployees() {

    if (
        typeof renderShell ===
        "function"
    ) {

        renderShell({
            active: "Employees"
        });

    }


    setupEmployeeEvents();


    let session =
        null;


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


    await loadEmployeeData();

}


/* =========================================================
   EVENTS
   ========================================================= */

function setupEmployeeEvents() {

    if (employeeEventsBound) {

        return;

    }


    employeeEventsBound =
        true;


    /* -----------------------------------------------------
       SEARCH
       ----------------------------------------------------- */

    document
        .getElementById(
            "employeeSearch"
        )
        ?.addEventListener(
            "input",
            renderEmployees
        );


    /* -----------------------------------------------------
       FILTER
       ----------------------------------------------------- */

    document
        .getElementById(
            "employeeStatusFilter"
        )
        ?.addEventListener(
            "change",
            renderEmployees
        );


    /* -----------------------------------------------------
       TABLE ACTION
       ----------------------------------------------------- */

    document
        .getElementById(
            "employeesTable"
        )
        ?.addEventListener(
            "click",
            handleEmployeeAction
        );


    /* -----------------------------------------------------
       CONVERSION MODAL
       ----------------------------------------------------- */

    document
        .getElementById(
            "closeEmployeeConversionModal"
        )
        ?.addEventListener(
            "click",
            closeConversionModal
        );


    document
        .getElementById(
            "cancelEmployeeConversionModal"
        )
        ?.addEventListener(
            "click",
            closeConversionModal
        );


    document
        .getElementById(
            "convertEmployeeButton"
        )
        ?.addEventListener(
            "click",
            convertApplicantToEmployee
        );


    /* -----------------------------------------------------
       VIEW MODAL
       ----------------------------------------------------- */

    document
        .getElementById(
            "closeViewEmployee"
        )
        ?.addEventListener(
            "click",
            closeViewEmployee
        );


    document
        .getElementById(
            "closeViewEmployeeBottom"
        )
        ?.addEventListener(
            "click",
            closeViewEmployee
        );


    /* -----------------------------------------------------
       BACKDROPS
       ----------------------------------------------------- */

    document
        .getElementById(
            "employeeConversionModal"
        )
        ?.addEventListener(
            "click",
            event => {

                if (
                    event.target.id ===
                    "employeeConversionModal"
                ) {

                    closeConversionModal();

                }

            }
        );


    document
        .getElementById(
            "viewEmployeeModal"
        )
        ?.addEventListener(
            "click",
            event => {

                if (
                    event.target.id ===
                    "viewEmployeeModal"
                ) {

                    closeViewEmployee();

                }

            }
        );


    /* -----------------------------------------------------
       ESCAPE
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


            closeConversionModal();

            closeViewEmployee();

        }
    );

}


/* =========================================================
   LOAD EMPLOYEE DATA
   ========================================================= */

async function loadEmployeeData() {

    const table =
        document.getElementById(
            "employeesTable"
        );


    if (table) {

        table.innerHTML = `
            <tr>
                <td
                    colspan="7"
                    class="table-empty"
                >
                    Loading employees...
                </td>
            </tr>
        `;

    }


    try {

        if (
            !window.rmsSupabase
        ) {

            throw new Error(
                "Supabase client is not initialized."
            );

        }


        /* =================================================
           GET EXISTING EMPLOYEES
           ================================================= */

        const {
            data:
                employeeRows,
            error:
                employeeError
        } =
            await window.rmsSupabase
                .from(
                    "employees"
                )
                .select(`
                    employee_id,
                    employee_number,
                    application_id,
                    applicant_id,
                    first_name,
                    last_name,
                    email,
                    contact_no,
                    address,
                    position,
                    department,
                    start_date,
                    employment_status,
                    hired_date,
                    created_at,
                    updated_at
                `)
                .order(
                    "created_at",
                    {
                        ascending:
                            false
                    }
                );


        if (employeeError) {

            throw employeeError;

        }


        employees =
            Array.isArray(
                employeeRows
            )
                ? employeeRows
                : [];


        /* =================================================
           GET HIRED APPLICATIONS
           =================================================

           We only need applications whose
           status is HIRED.

           ================================================= */

        const {
            data:
                hiredApplications,
            error:
                applicationError
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
                        contact_no,
                        address,
                        status
                    ),

                    job_postings (
                        job_id,
                        job_code,
                        job_title,
                        department
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
                        created_at
                    )
                `)
                .eq(
                    "status",
                    "HIRED"
                )
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


        const hiredApps =
            Array.isArray(
                hiredApplications
            )
                ? hiredApplications
                : [];


        /* =================================================
           EXISTING EMPLOYEE APPLICATION IDS
           ================================================= */

        const convertedApplicationIds =
            new Set(
                employees.map(
                    employee =>
                        String(
                            employee.application_id
                        )
                )
            );


        /* =================================================
           BUILD CONVERSION CANDIDATES
           ================================================= */

        conversionCandidates =
            hiredApps
                .filter(
                    application =>
                        !convertedApplicationIds.has(
                            String(
                                application.application_id
                            )
                        )
                )
                .map(
                    application => {

                        const applicant =
                            getRelatedRecord(
                                application
                                    .applicants
                            );


                        const job =
                            getRelatedRecord(
                                application
                                    .job_postings
                            );


                        const hiringRecords =
                            Array.isArray(
                                application.hiring
                            )
                                ? [
                                    ...application
                                        .hiring
                                ]
                                : [];


                        hiringRecords.sort(
                            (
                                a,
                                b
                            ) =>
                                new Date(
                                    b.created_at ||
                                    0
                                ) -
                                new Date(
                                    a.created_at ||
                                    0
                                )
                        );


                        const hiring =
                            hiringRecords[0] ||
                            null;


                        return {

                            application,

                            applicant,

                            job,

                            hiring

                        };

                    }
                );


        updateEmployeeSummary();


        renderEmployees();


    } catch (error) {

        console.error(
            "Load employee data error:",
            error
        );


        employees = [];

        conversionCandidates = [];


        updateEmployeeSummary();


        if (table) {

            table.innerHTML = `
                <tr>
                    <td
                        colspan="7"
                        class="table-empty"
                    >
                        Unable to load employee data.
                    </td>
                </tr>
            `;

        }


        if (
            typeof showToast ===
            "function"
        ) {

            showToast(
                getEmployeeDatabaseError(
                    error
                ),
                "error"
            );

        }

    }

}


/* =========================================================
   RELATED RECORD
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
   RENDER EMPLOYEES
   ========================================================= */

function renderEmployees() {

    const table =
        document.getElementById(
            "employeesTable"
        );


    if (!table) {

        return;

    }


    const search =
        String(
            document.getElementById(
                "employeeSearch"
            )?.value ||
                ""
        )
            .trim()
            .toLowerCase();


    const filter =
        normalizeStatus(
            document.getElementById(
                "employeeStatusFilter"
            )?.value ||
                ""
        );


    const employeeRows =
        employees.filter(
            employee => {

                const fullName =
                    `${

                        employee.first_name ||
                        ""

                    } ${

                        employee.last_name ||
                        ""

                    }`
                        .trim()
                        .toLowerCase();


                const number =
                    String(
                        employee.employee_number ||
                        ""
                    )
                        .toLowerCase();


                const position =
                    String(
                        employee.position ||
                        ""
                    )
                        .toLowerCase();


                const department =
                    String(
                        employee.department ||
                        ""
                    )
                        .toLowerCase();


                const status =
                    normalizeStatus(
                        employee.employment_status
                    );


                const matchesSearch =
                    !search ||

                    fullName.includes(
                        search
                    ) ||

                    number.includes(
                        search
                    ) ||

                    position.includes(
                        search
                    ) ||

                    department.includes(
                        search
                    );


                const matchesFilter =
                    !filter ||
                    status ===
                    filter;


                return (

                    matchesSearch &&
                    matchesFilter

                );

            }
        );


    /*
     * Add hired applicants that have not
     * yet been converted.
     *
     * They are displayed at the bottom
     * as ready for conversion.
     */

    const conversionRows =
        conversionCandidates.filter(
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


                const fullName =
                    `${

                        applicant.first_name ||
                        ""

                    } ${

                        applicant.last_name ||
                        ""

                    }`
                        .trim()
                        .toLowerCase();


                const number =
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


                const department =
                    String(
                        job.department ||
                        ""
                    )
                        .toLowerCase();


                const matchesSearch =
                    !search ||

                    fullName.includes(
                        search
                    ) ||

                    number.includes(
                        search
                    ) ||

                    position.includes(
                        search
                    ) ||

                    department.includes(
                        search
                    );


                /*
                 * Conversion candidate is treated
                 * as READY FOR CONVERSION.
                 */

                const matchesFilter =
                    !filter;


                return (
                    matchesSearch &&
                    matchesFilter
                );

            }
        );


    if (
        !employeeRows.length &&
        !conversionRows.length
    ) {

        table.innerHTML = `
            <tr>
                <td
                    colspan="7"
                    class="table-empty"
                >
                    No employee records found.
                </td>
            </tr>
        `;

        return;

    }


    /* =================================================
       EXISTING EMPLOYEES HTML
       ================================================= */

    const existingHtml =
        employeeRows
            .map(
                employee => `

                    <tr>

                        <td>

                            <strong>
                                ${escapeHtml(
                                    employee
                                        .employee_number ||
                                    "—"
                                )}
                            </strong>

                        </td>


                        <td>

                            <div
                                class="employee-meta"
                            >

                                <strong>
                                    ${escapeHtml(
                                        `${
                                            employee
                                                .first_name ||
                                            ""
                                        } ${
                                            employee
                                                .last_name ||
                                            ""
                                        }`
                                            .trim() ||
                                        "—"
                                    )}
                                </strong>

                                <span>
                                    ${escapeHtml(
                                        employee
                                            .email ||
                                        ""
                                    )}
                                </span>

                            </div>

                        </td>


                        <td>

                            ${escapeHtml(
                                employee
                                    .position ||
                                "—"
                            )}

                        </td>


                        <td>

                            ${escapeHtml(
                                employee
                                    .department ||
                                "—"
                            )}

                        </td>


                        <td>

                            ${formatDate(
                                employee
                                    .start_date
                            )}

                        </td>


                        <td>

                            ${renderEmployeeStatus(
                                employee
                                    .employment_status
                            )}

                        </td>


                        <td>

                            <div
                                class="table-actions"
                            >

                                <button
                                    type="button"
                                    class="table-action"
                                    data-employee-action="view"
                                    data-id="${escapeHtml(
                                        employee.employee_id
                                    )}"
                                >
                                    View
                                </button>

                            </div>

                        </td>

                    </tr>

                `
            )
            .join("");


    /* =================================================
       CONVERSION HTML
       ================================================= */

    const conversionHtml =
        conversionRows
            .map(
                candidate => {

                    const applicant =
                        candidate.applicant ||
                        {};


                    const job =
                        candidate.job ||
                        {};


                    return `

                        <tr>

                            <td>

                                <span
                                    class="
                                        employee-status
                                        employee-other
                                    "
                                >
                                    READY
                                </span>

                            </td>


                            <td>

                                <div
                                    class="employee-meta"
                                >

                                    <strong>
                                        ${escapeHtml(
                                            `${
                                                applicant
                                                    .first_name ||
                                                ""
                                            } ${
                                                applicant
                                                    .last_name ||
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


                            <td>

                                ${escapeHtml(
                                    job
                                        .job_title ||
                                    "—"
                                )}

                            </td>


                            <td>

                                ${escapeHtml(
                                    job
                                        .department ||
                                    "—"
                                )}

                            </td>


                            <td>

                                ${
                                    candidate
                                        .hiring
                                        ?.start_date

                                        ? formatDate(
                                            candidate
                                                .hiring
                                                .start_date
                                        )

                                        : "—"
                                }

                            </td>


                            <td>

                                <span
                                    class="
                                        employee-status
                                        employee-other
                                    "
                                >
                                    READY FOR CONVERSION
                                </span>

                            </td>


                            <td>

                                <div
                                    class="table-actions"
                                >

                                    <button
                                        type="button"
                                        class="table-action"
                                        data-employee-action="convert"
                                        data-id="${escapeHtml(
                                            candidate
                                                .application
                                                .application_id
                                        )}"
                                    >
                                        Convert
                                    </button>

                                </div>

                            </td>

                        </tr>

                    `;

                }
            )
            .join("");


    table.innerHTML =
        conversionHtml +
        existingHtml;

}


/* =========================================================
   TABLE ACTION
   ========================================================= */

function handleEmployeeAction(
    event
) {

    const button =
        event.target.closest(
            "[data-employee-action]"
        );


    if (!button) {

        return;

    }


    const action =
        button.dataset
            .employeeAction;


    const id =
        button.dataset.id;


    if (
        action ===
        "convert"
    ) {

        const candidate =
            conversionCandidates.find(
                item =>
                    String(
                        item.application
                            ?.application_id
                    ) ===
                    String(
                        id
                    )
            );


        if (!candidate) {

            showToast(
                "Conversion candidate not found.",
                "error"
            );

            return;

        }


        openConversionModal(
            candidate
        );


        return;

    }


    if (
        action ===
        "view"
    ) {

        const employee =
            employees.find(
                item =>
                    String(
                        item.employee_id
                    ) ===
                    String(
                        id
                    )
            );


        if (!employee) {

            showToast(
                "Employee record not found.",
                "error"
            );

            return;

        }


        openViewEmployee(
            employee
        );

    }

}


/* =========================================================
   OPEN CONVERSION MODAL
   ========================================================= */

function openConversionModal(
    candidate
) {

    selectedConversionCandidate =
        candidate;


    const applicant =
        candidate.applicant ||
        {};


    const job =
        candidate.job ||
        {};


    const hiring =
        candidate.hiring ||
        {};


    const applicantName =
        `${

            applicant.first_name ||
            ""

        } ${

            applicant.last_name ||
            ""

        }`
            .trim();


    /* -----------------------------------------------------
       APPLICANT
       ----------------------------------------------------- */

    document.getElementById(
        "conversionApplicant"
    ).textContent =
        applicantName ||
        "—";


    document.getElementById(
        "conversionApplicantNo"
    ).textContent =
        applicant.applicant_no ||
        "—";


    document.getElementById(
        "conversionPosition"
    ).textContent =
        job.job_title ||
        hiring.position ||
        "—";


    document.getElementById(
        "conversionDepartment"
    ).textContent =
        job.department ||
        "—";


    /* -----------------------------------------------------
       EMPLOYEE NUMBER
       ----------------------------------------------------- */

    document.getElementById(
        "employeeNumber"
    ).value =
        generateEmployeeNumber();


    /* -----------------------------------------------------
       START DATE
       ----------------------------------------------------- */

    document.getElementById(
        "employeeStartDate"
    ).value =
        hiring.start_date ||
        getTodayLocalDate();


    /* -----------------------------------------------------
       EMPLOYMENT STATUS
       ----------------------------------------------------- */

    document.getElementById(
        "employeeEmploymentStatus"
    ).value =
        "ACTIVE";


    /* -----------------------------------------------------
       HIRED DATE
       ----------------------------------------------------- */

    document.getElementById(
        "employeeHiredDate"
    ).value =
        hiring.hiring_date ||
        getTodayLocalDate();


    clearEmployeeFormError();


    toggleConversionModal(
        true
    );

}


/* =========================================================
   CONVERT APPLICANT
   ========================================================= */

async function convertApplicantToEmployee() {

    const candidate =
        selectedConversionCandidate;


    if (!candidate) {

        setEmployeeFormError(
            "No applicant is selected."
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


    const hiring =
        candidate.hiring ||
        {};


    /* =================================================
       VALIDATION
       ================================================= */

    if (
        normalizeStatus(
            application.status
        ) !==
        "HIRED"
    ) {

        setEmployeeFormError(
            "Only hired applicants can be converted into employees."
        );

        return;

    }


    if (!application.application_id) {

        setEmployeeFormError(
            "Application ID is missing."
        );

        return;

    }


    if (!application.applicant_id) {

        setEmployeeFormError(
            "Applicant ID is missing."
        );

        return;

    }


    if (!applicant.first_name) {

        setEmployeeFormError(
            "Applicant first name is missing."
        );

        return;

    }


    if (!applicant.last_name) {

        setEmployeeFormError(
            "Applicant last name is missing."
        );

        return;

    }


    const employeeNumber =
        String(
            document.getElementById(
                "employeeNumber"
            )?.value ||
                ""
        ).trim();


    const startDate =
        String(
            document.getElementById(
                "employeeStartDate"
            )?.value ||
                ""
        ).trim();


    const employmentStatus =
        normalizeEmploymentStatus(
            document.getElementById(
                "employeeEmploymentStatus"
            )?.value ||
                ""
        );


    const hiredDate =
        String(
            document.getElementById(
                "employeeHiredDate"
            )?.value ||
                ""
        ).trim();


    if (!employeeNumber) {

        setEmployeeFormError(
            "Employee number is required."
        );

        return;

    }


    if (!startDate) {

        setEmployeeFormError(
            "Start date is required."
        );

        return;

    }


    if (
        !employmentStatus
    ) {

        setEmployeeFormError(
            "Employment status is required."
        );

        return;

    }


    const button =
        document.getElementById(
            "convertEmployeeButton"
        );


    setButtonLoading(
        button,
        true,
        "Converting..."
    );


    try {

        /* =================================================
           CHECK EXISTING CONVERSION
           ================================================= */

        const {
            data:
                existingEmployees,
            error:
                existingError
        } =
            await window.rmsSupabase
                .from(
                    "employees"
                )
                .select(
                    `
                        employee_id,
                        employee_number
                    `
                )
                .eq(
                    "application_id",
                    application.application_id
                )
                .limit(
                    1
                );


        if (existingError) {
            throw existingError;
        }


        if (
            Array.isArray(
                existingEmployees
            ) &&
            existingEmployees.length
        ) {

            throw new Error(
                "This applicant has already been converted into an employee."
            );

        }


        /* =================================================
           CHECK EMPLOYEE NUMBER
           ================================================= */

        const {
            data:
                duplicateNumber,
            error:
                numberError
        } =
            await window.rmsSupabase
                .from(
                    "employees"
                )
                .select(
                    "employee_id"
                )
                .eq(
                    "employee_number",
                    employeeNumber
                )
                .limit(
                    1
                );


        if (numberError) {
            throw numberError;
        }


        if (
            Array.isArray(
                duplicateNumber
            ) &&
            duplicateNumber.length
        ) {

            /*
             * Generate another employee number.
             */

            throw new Error(
                "The generated employee number already exists. Please try again."
            );

        }


        /* =================================================
           INSERT EMPLOYEE
           ================================================= */

        const employeeData = {

            employee_number:
                employeeNumber,

            application_id:
                application.application_id,

            applicant_id:
                application.applicant_id,

            first_name:
                applicant.first_name,

            last_name:
                applicant.last_name,

            email:
                applicant.email ||
                null,

            contact_no:
                applicant.contact_no ||
                null,

            address:
                applicant.address ||
                null,

            position:
                job.job_title ||
                hiring.position ||
                "—",

            department:
                job.department ||
                null,

            start_date:
                startDate,

            employment_status:
                employmentStatus,

            hired_date:
                hiredDate ||
                null,

            created_at:
                new Date()
                    .toISOString(),

            updated_at:
                new Date()
                    .toISOString()

        };


        const {
            data:
                insertedEmployees,
            error:
                insertError
        } =
            await window.rmsSupabase
                .from(
                    "employees"
                )
                .insert(
                    employeeData
                )
                .select()
                .single();


        if (insertError) {
            throw insertError;
        }


        /* =================================================
           UPDATE LOCAL EMPLOYEE LIST
           ================================================= */

        if (
            insertedEmployees
        ) {

            employees.unshift(
                insertedEmployees
            );

        }


        /* =================================================
           SUCCESS
           ================================================= */

        showToast(
            "Applicant converted to employee successfully.",
            "success"
        );


        closeConversionModal();


        await loadEmployeeData();


    } catch (error) {

        console.error(
            "Employee conversion error:",
            error
        );


        const message =
            getEmployeeDatabaseError(
                error
            );


        setEmployeeFormError(
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
   GENERATE EMPLOYEE NUMBER
   ========================================================= */

function generateEmployeeNumber() {

    const year =
        new Date()
            .getFullYear();


    let highest =
        0;


    employees.forEach(
        employee => {

            const number =
                String(
                    employee
                        .employee_number ||
                    ""
                );


            const match =
                number.match(
                    /^EMP-\d{4}-(\d+)$/
                );


            if (!match) {
                return;
            }


            const value =
                Number(
                    match[1]
                );


            if (
                Number.isFinite(
                    value
                ) &&
                value > highest
            ) {

                highest =
                    value;

            }

        }
    );


    const next =
        String(
            highest + 1
        )
            .padStart(
                3,
                "0"
            );


    return `EMP-${year}-${next}`;

}


/* =========================================================
   VIEW EMPLOYEE
   ========================================================= */

function openViewEmployee(employee) {

    const body =
        document.getElementById(
            "viewEmployeeBody"
        );

    if (!body) {
        return;
    }


    const fullName =
        `${employee.first_name || ""} ${
            employee.last_name || ""
        }`
        .trim();


    body.innerHTML = `

        <div class="employee-detail-item">

            <small>
                Employee Number
            </small>

            <strong>
                ${escapeHtml(
                    employee.employee_number ||
                    "—"
                )}
            </strong>

        </div>


        <div class="employee-detail-item">

            <small>
                Employment Status
            </small>

            ${renderEmployeeStatus(
                employee.employment_status
            )}

        </div>


        <div class="employee-detail-item">

            <small>
                Employee Name
            </small>

            <strong>
                ${escapeHtml(
                    fullName ||
                    "—"
                )}
            </strong>

        </div>


        <div class="employee-detail-item">

            <small>
                Applicant ID
            </small>

            <strong>
                ${escapeHtml(
                    employee.applicant_id ||
                    "—"
                )}
            </strong>

        </div>


        <div class="employee-detail-item">

            <small>
                Position
            </small>

            <strong>
                ${escapeHtml(
                    employee.position ||
                    "—"
                )}
            </strong>

        </div>


        <div class="employee-detail-item">

            <small>
                Department
            </small>

            <strong>
                ${escapeHtml(
                    employee.department ||
                    "—"
                )}
            </strong>

        </div>


        <div class="employee-detail-item">

            <small>
                Email
            </small>

            <strong>
                ${escapeHtml(
                    employee.email ||
                    "—"
                )}
            </strong>

        </div>


        <div class="employee-detail-item">

            <small>
                Contact Number
            </small>

            <strong>
                ${escapeHtml(
                    employee.contact_no ||
                    "—"
                )}
            </strong>

        </div>


        <div class="employee-detail-item">

            <small>
                Start Date
            </small>

            <strong>
                ${formatDate(
                    employee.start_date
                )}
            </strong>

        </div>


        <div class="employee-detail-item">

            <small>
                Hired Date
            </small>

            <strong>
                ${formatDate(
                    employee.hired_date
                )}
            </strong>

        </div>


        <div class="
            employee-detail-item
            employee-detail-full
        ">

            <small>
                Address
            </small>

            <strong>
                ${escapeHtml(
                    employee.address ||
                    "—"
                )}
            </strong>

        </div>

    `;


    toggleViewEmployee(true);

}

/* =========================================================
   CLOSE VIEW
   ========================================================= */

function closeViewEmployee() {

    toggleViewEmployee(
        false
    );

}


function toggleViewEmployee(
    open
) {

    const modal =
        document.getElementById(
            "viewEmployeeModal"
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
   CONVERSION MODAL
   ========================================================= */

function toggleConversionModal(
    open
) {

    const modal =
        document.getElementById(
            "employeeConversionModal"
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


function closeConversionModal() {

    selectedConversionCandidate =
        null;


    clearEmployeeFormError();


    toggleConversionModal(
        false
    );

}


/* =========================================================
   SUMMARY
   ========================================================= */

function updateEmployeeSummary() {

    const total =
        employees.length;


    const active =
        employees.filter(
            employee =>
                normalizeStatus(
                    employee
                        .employment_status
                ) ===
                "ACTIVE"
        ).length;


    const ready =
        conversionCandidates.length;


    const positions =
        new Set(
            employees
                .map(
                    employee =>
                        String(
                            employee
                                .position ||
                            ""
                        )
                            .trim()
                            .toLowerCase()
                )
                .filter(Boolean)
        ).size;


    document.getElementById(
        "totalEmployees"
    ).textContent =
        total;


    document.getElementById(
        "activeEmployees"
    ).textContent =
        active;


    document.getElementById(
        "readyForConversion"
    ).textContent =
        ready;


    document.getElementById(
        "employeePositions"
    ).textContent =
        positions;

}


/* =========================================================
   EMPLOYEE STATUS
   ========================================================= */

function renderEmployeeStatus(
    status
) {

    const normalized =
        normalizeStatus(
            status
        );


    let className =
        "employee-other";


    let display =
        status ||
        "ACTIVE";


    if (
        normalized ===
        "ACTIVE"
    ) {

        className =
            "employee-active";


    } else if (
        normalized ===
        "INACTIVE" ||
        normalized ===
        "RESIGNED" ||
        normalized ===
        "TERMINATED"
    ) {

        className =
            "employee-inactive";


    } else if (
        normalized ===
        "ON LEAVE"
    ) {

        className =
            "employee-leave";

    }


    return `

        <span
            class="
                employee-status
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
   EMPLOYMENT STATUS
   ========================================================= */

function normalizeEmploymentStatus(
    value
) {

    const normalized =
        normalizeStatus(
            value
        );


    const allowed = [

        "ACTIVE",

        "INACTIVE",

        "ON LEAVE"

    ];


    return allowed.includes(
        normalized
    )
        ? normalized
        : "";

}


/* =========================================================
   DATE
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
   STATUS
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
   ERROR
   ========================================================= */

function setEmployeeFormError(
    message
) {

    const element =
        document.getElementById(
            "employeeFormError"
        );


    if (element) {

        element.textContent =
            message ||
            "";

    }

}


function clearEmployeeFormError() {

    setEmployeeFormError(
        ""
    );

}


/* =========================================================
   DATABASE ERROR
   ========================================================= */

function getEmployeeDatabaseError(
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
            "employees"
        ) &&
        lower.includes(
            "does not exist"
        )
    ) {

        return (
            "The employees table does not exist. Run the Lab 18 SQL first."
        );

    }


    if (
        lower.includes(
            "duplicate key"
        ) &&
        lower.includes(
            "employee_number"
        )
    ) {

        return (
            "That employee number already exists. Please try again."
        );

    }


    if (
        lower.includes(
            "duplicate key"
        ) &&
        lower.includes(
            "application_id"
        )
    ) {

        return (
            "This applicant has already been converted into an employee."
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
            "The database blocked the employee conversion because of RLS permissions."
        );

    }


    if (
        lower.includes(
            "foreign key"
        )
    ) {

        return (
            "The applicant or application is not properly linked."
        );

    }


    return (
        error?.message ||
        error?.details ||
        "Unable to convert applicant to employee."
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


        button.innerHTML =
            text;


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