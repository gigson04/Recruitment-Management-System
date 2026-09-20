/* =========================================================
   APPLICANT REPORTS
   Laboratory Activity 20
   ========================================================= */

let applicantReportsData = {
    applicants: [],
    applications: [],
    hiring: [],

    masterList: [],
    byPosition: [],
    byStatus: [],
    qualified: [],
    rejected: [],
    hired: []
};

let applicantReportEventsBound = false;


/* =========================================================
   INITIALIZE
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
    initApplicantReports();
});


async function initApplicantReports() {

    /*
        IMPORTANT:
        This exact label must match the sidebar label
        in components.js:

        Applicant Reports
    */
    renderShell({
        active: "Applicant Reports"
    });


    if (typeof requireAuth === "function") {

        const authenticated = await requireAuth();

        if (!authenticated) {
            return;
        }
    }


    if (!applicantReportEventsBound) {

        bindApplicantReportEvents();

        applicantReportEventsBound = true;
    }


    if (typeof loadUserProfile === "function") {

        try {
            await loadUserProfile();
        } catch (error) {
            console.warn(
                "Unable to load user profile:",
                error
            );
        }
    }


    await loadApplicantReports();
}


/* =========================================================
   SUPABASE CLIENT
   ========================================================= */

function getSupabaseClient() {

    if (
        window.rmsSupabase &&
        typeof window.rmsSupabase.from === "function"
    ) {
        return window.rmsSupabase;
    }


    if (
        window.supabaseClient &&
        typeof window.supabaseClient.from === "function"
    ) {
        return window.supabaseClient;
    }


    throw new Error(
        "Supabase client was not found. Check js/supabase.js."
    );
}


/* =========================================================
   LOAD REPORT DATA
   ========================================================= */

async function loadApplicantReports() {

    setLoadingState();


    try {

        const supabase = getSupabaseClient();


        /* =================================================
           LOAD APPLICANTS
           ================================================= */

        const applicantsResult = await supabase
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
            .order("last_name", {
                ascending: true
            });


        if (applicantsResult.error) {

            throw new Error(
                "Applicants: " +
                applicantsResult.error.message
            );
        }


        applicantReportsData.applicants =
            applicantsResult.data || [];


        /* =================================================
           LOAD APPLICATIONS
           ================================================= */

        const applicationsResult = await supabase
            .from("applications")
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
                )
            `)
            .order("application_date", {
                ascending: false
            });


        if (applicationsResult.error) {

            throw new Error(
                "Applications: " +
                applicationsResult.error.message
            );
        }


        applicantReportsData.applications =
            applicationsResult.data || [];


        /* =================================================
           LOAD HIRING RECORDS
           ================================================= */

        const hiringResult = await supabase
            .from("hiring")
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
            .order("created_at", {
                ascending: false
            });


        if (hiringResult.error) {

            throw new Error(
                "Hiring: " +
                hiringResult.error.message
            );
        }


        applicantReportsData.hiring =
            hiringResult.data || [];


        /* =================================================
           BUILD REPORTS
           ================================================= */

        buildAllReports();


        /* =================================================
           RENDER
           ================================================= */

        renderAllReports();


        showApplicantReportToast(
            "Applicant reports loaded successfully.",
            "success"
        );

    } catch (error) {

        console.error(
            "Applicant Reports Error:",
            error
        );


        renderErrorState(
            error.message || "Unable to load applicant reports."
        );


        showApplicantReportToast(
            error.message ||
            "Unable to load applicant reports.",
            "error"
        );
    }
}


/* =========================================================
   BUILD ALL REPORTS
   ========================================================= */

function buildAllReports() {

    const applicants =
        applicantReportsData.applicants || [];

    const applications =
        applicantReportsData.applications || [];

    const hiring =
        applicantReportsData.hiring || [];


    applicantReportsData.masterList =
        buildMasterList(
            applicants,
            applications
        );


    applicantReportsData.byPosition =
        buildPositionReport(
            applications
        );


    applicantReportsData.byStatus =
        buildStatusReport(
            applications
        );


    applicantReportsData.qualified =
        applications.filter(application => {

            return normalizeStatus(
                application.status
            ) === "QUALIFIED";

        });


    applicantReportsData.rejected =
        applications.filter(application => {

            return normalizeStatus(
                application.status
            ) === "REJECTED";

        });


    applicantReportsData.hired =
        applications.filter(application => {

            return normalizeStatus(
                application.status
            ) === "HIRED";

        });


    /*
        Attach latest hiring record to hired applications.
    */

    applicantReportsData.hired =
        applicantReportsData.hired.map(application => {

            return {
                ...application,
                hiringRecord:
                    getLatestHiringRecord(
                        application.application_id,
                        hiring
                    )
            };

        });
}


/* =========================================================
   MASTER LIST
   ========================================================= */

function buildMasterList(
    applicants,
    applications
) {

    return applicants.map(applicant => {

        const applicantApplications =
            applications.filter(application => {

                return String(
                    application.applicant_id
                ) === String(
                    applicant.applicant_id
                );

            });


        /*
            Sort newest application first.
        */

        applicantApplications.sort(
            compareApplicationsNewest
        );


        const latestApplication =
            applicantApplications[0] || null;


        /*
            Get all unique positions.
        */

        const positions = [];


        applicantApplications.forEach(application => {

            const position =
                getPosition(application);


            if (
                position &&
                position !== "—" &&
                !positions.includes(position)
            ) {
                positions.push(position);
            }

        });


        return {

            applicant_id:
                applicant.applicant_id,

            applicant_no:
                applicant.applicant_no || "—",

            name:
                getApplicantName(
                    applicant
                ),

            email:
                applicant.email || "—",

            applicant_status:
                applicant.status || "—",

            position:
                positions.length
                    ? positions.join(", ")
                    : "—",

            latest_status:
                latestApplication
                    ? (
                        latestApplication.status ||
                        "—"
                    )
                    : "—",

            application_date:
                latestApplication
                    ? latestApplication.application_date
                    : null
        };

    });
}


/* =========================================================
   BY POSITION
   ========================================================= */

function buildPositionReport(
    applications
) {

    const positionMap = new Map();


    applications.forEach(application => {

        const position =
            getPosition(application);


        if (
            !position ||
            position === "—"
        ) {
            return;
        }


        if (!positionMap.has(position)) {

            positionMap.set(
                position,
                {
                    position: position,
                    applicants: new Set(),
                    hired: new Set()
                }
            );
        }


        const record =
            positionMap.get(position);


        if (application.applicant_id) {

            record.applicants.add(
                String(
                    application.applicant_id
                )
            );
        }


        if (
            normalizeStatus(
                application.status
            ) === "HIRED"
        ) {

            if (application.applicant_id) {

                record.hired.add(
                    String(
                        application.applicant_id
                    )
                );
            }
        }

    });


    return Array.from(
        positionMap.values()
    )
    .map(record => {

        return {

            position:
                record.position,

            applicants:
                record.applicants.size,

            hired:
                record.hired.size
        };

    })
    .sort((a, b) => {

        return a.position.localeCompare(
            b.position
        );

    });
}


/* =========================================================
   BY STATUS
   ========================================================= */

function buildStatusReport(
    applications
) {

    const statusMap = new Map();


    applications.forEach(application => {

        let status =
            normalizeStatus(
                application.status
            );


        if (!status) {
            status = "NO STATUS";
        }


        if (!statusMap.has(status)) {

            statusMap.set(
                status,
                new Set()
            );
        }


        if (application.applicant_id) {

            statusMap
                .get(status)
                .add(
                    String(
                        application.applicant_id
                    )
                );
        }

    });


    const statusOrder = [
        "SUBMITTED",
        "UNDER SCREENING",
        "QUALIFIED",
        "FOR INTERVIEW",
        "INTERVIEWED",
        "SELECTED FOR HIRING",
        "HIRED",
        "REJECTED",
        "DECLINED",
        "ON HOLD",
        "NO STATUS"
    ];


    return Array.from(
        statusMap.entries()
    )
    .map(([status, applicants]) => {

        return {

            status:
                formatStatus(status),

            normalizedStatus:
                status,

            applicants:
                applicants.size
        };

    })
    .sort((a, b) => {

        const aIndex =
            statusOrder.indexOf(
                a.normalizedStatus
            );

        const bIndex =
            statusOrder.indexOf(
                b.normalizedStatus
            );


        if (aIndex === -1 && bIndex === -1) {

            return a.status.localeCompare(
                b.status
            );
        }


        if (aIndex === -1) {
            return 1;
        }


        if (bIndex === -1) {
            return -1;
        }


        return aIndex - bIndex;

    });
}


/* =========================================================
   RENDER EVERYTHING
   ========================================================= */

function renderAllReports() {

    renderSummary();

    renderMasterList();

    renderPositionReport();

    renderStatusReport();

    renderQualifiedReport();

    renderRejectedReport();

    renderHiredReport();
}


/* =========================================================
   SUMMARY
   ========================================================= */

function renderSummary() {

    const applicants =
        applicantReportsData.applicants || [];

    const applications =
        applicantReportsData.applications || [];


    const totalApplicants =
        applicants.length;


    const activeApplicants =
        applicants.filter(applicant => {

            return normalizeStatus(
                applicant.status
            ) === "ACTIVE";

        }).length;


    const qualifiedApplicants =
        getUniqueApplicantCountByStatus(
            applications,
            "QUALIFIED"
        );


    const rejectedApplicants =
        getUniqueApplicantCountByStatus(
            applications,
            "REJECTED"
        );


    const hiredApplicants =
        getUniqueApplicantCountByStatus(
            applications,
            "HIRED"
        );


    setText(
        "totalApplicants",
        totalApplicants
    );


    setText(
        "activeApplicants",
        activeApplicants
    );


    setText(
        "qualifiedApplicants",
        qualifiedApplicants
    );


    setText(
        "rejectedApplicants",
        rejectedApplicants
    );


    setText(
        "hiredApplicants",
        hiredApplicants
    );
}


/* =========================================================
   MASTER LIST RENDER
   ========================================================= */

function renderMasterList() {

    const table =
        document.getElementById(
            "applicantMasterTable"
        );


    if (!table) {
        return;
    }


    const tbody =
        table.querySelector("tbody");


    if (!tbody) {
        return;
    }


    const searchInput =
        document.getElementById(
            "applicantReportSearch"
        );


    const statusFilter =
        document.getElementById(
            "applicantStatusFilter"
        );


    const searchTerm =
        searchInput
            ? searchInput.value
                .trim()
                .toLowerCase()
            : "";


    const selectedStatus =
        statusFilter
            ? statusFilter.value
            : "all";


    const filtered =
        applicantReportsData.masterList.filter(
            applicant => {

                const searchableText = [

                    applicant.applicant_no,

                    applicant.name,

                    applicant.email,

                    applicant.applicant_status,

                    applicant.position,

                    applicant.latest_status

                ]
                .join(" ")
                .toLowerCase();


                const matchesSearch =
                    !searchTerm ||
                    searchableText.includes(
                        searchTerm
                    );


                const normalizedApplicantStatus =
                    normalizeStatus(
                        applicant.applicant_status
                    );


                const matchesStatus =
                    selectedStatus === "all" ||
                    normalizedApplicantStatus ===
                        selectedStatus.toUpperCase();


                return (
                    matchesSearch &&
                    matchesStatus
                );
            }
        );


    setText(
        "masterListCount",
        `${filtered.length} record${filtered.length === 1 ? "" : "s"}`
    );


    if (!filtered.length) {

        tbody.innerHTML = emptyRow(
            7,
            "No applicants found."
        );

        return;
    }


    tbody.innerHTML =
        filtered.map(applicant => {

            return `
                <tr>

                    <td>
                        ${escapeHtml(
                            applicant.applicant_no
                        )}
                    </td>

                    <td>
                        <strong>
                            ${escapeHtml(
                                applicant.name
                            )}
                        </strong>
                    </td>

                    <td>
                        ${escapeHtml(
                            applicant.email
                        )}
                    </td>

                    <td>
                        ${statusBadge(
                            applicant.applicant_status
                        )}
                    </td>

                    <td>
                        ${escapeHtml(
                            applicant.position
                        )}
                    </td>

                    <td>
                        ${statusBadge(
                            applicant.latest_status
                        )}
                    </td>

                    <td>
                        ${formatDate(
                            applicant.application_date
                        )}
                    </td>

                </tr>
            `;

        }).join("");
}


/* =========================================================
   POSITION REPORT RENDER
   ========================================================= */

function renderPositionReport() {

    const table =
        document.getElementById(
            "applicantsByPositionTable"
        );


    if (!table) {
        return;
    }


    const tbody =
        table.querySelector("tbody");


    if (!tbody) {
        return;
    }


    const data =
        applicantReportsData.byPosition || [];


    setText(
        "positionReportCount",
        `${data.length} record${data.length === 1 ? "" : "s"}`
    );


    if (!data.length) {

        tbody.innerHTML = emptyRow(
            3,
            "No position data available."
        );

        return;
    }


    tbody.innerHTML =
        data.map(record => {

            return `
                <tr>

                    <td>
                        <strong>
                            ${escapeHtml(
                                record.position
                            )}
                        </strong>
                    </td>

                    <td>
                        ${record.applicants}
                    </td>

                    <td>
                        ${record.hired}
                    </td>

                </tr>
            `;

        }).join("");
}


/* =========================================================
   STATUS REPORT RENDER
   ========================================================= */

function renderStatusReport() {

    const table =
        document.getElementById(
            "applicantsByStatusTable"
        );


    if (!table) {
        return;
    }


    const tbody =
        table.querySelector("tbody");


    if (!tbody) {
        return;
    }


    const data =
        applicantReportsData.byStatus || [];


    setText(
        "statusReportCount",
        `${data.length} status${data.length === 1 ? "" : "es"}`
    );


    if (!data.length) {

        tbody.innerHTML = emptyRow(
            2,
            "No application status data available."
        );

        return;
    }


    tbody.innerHTML =
        data.map(record => {

            return `
                <tr>

                    <td>
                        ${statusBadge(
                            record.status
                        )}
                    </td>

                    <td>
                        ${record.applicants}
                    </td>

                </tr>
            `;

        }).join("");
}


/* =========================================================
   QUALIFIED REPORT
   ========================================================= */

function renderQualifiedReport() {

    const table =
        document.getElementById(
            "qualifiedApplicantsTable"
        );


    if (!table) {
        return;
    }


    const tbody =
        table.querySelector("tbody");


    if (!tbody) {
        return;
    }


    const data =
        applicantReportsData.qualified || [];


    setText(
        "qualifiedReportCount",
        `${data.length} record${data.length === 1 ? "" : "s"}`
    );


    if (!data.length) {

        tbody.innerHTML = emptyRow(
            5,
            "No qualified applicants found."
        );

        return;
    }


    tbody.innerHTML =
        data.map(application => {

            return `
                <tr>

                    <td>
                        ${escapeHtml(
                            getApplicantNumber(
                                application
                            )
                        )}
                    </td>

                    <td>
                        <strong>
                            ${escapeHtml(
                                getApplicantNameFromApplication(
                                    application
                                )
                            )}
                        </strong>
                    </td>

                    <td>
                        ${escapeHtml(
                            getPosition(
                                application
                            )
                        )}
                    </td>

                    <td>
                        ${formatDate(
                            application.application_date
                        )}
                    </td>

                    <td>
                        ${statusBadge(
                            application.status
                        )}
                    </td>

                </tr>
            `;

        }).join("");
}


/* =========================================================
   REJECTED REPORT
   ========================================================= */

function renderRejectedReport() {

    const table =
        document.getElementById(
            "rejectedApplicantsTable"
        );


    if (!table) {
        return;
    }


    const tbody =
        table.querySelector("tbody");


    if (!tbody) {
        return;
    }


    const data =
        applicantReportsData.rejected || [];


    setText(
        "rejectedReportCount",
        `${data.length} record${data.length === 1 ? "" : "s"}`
    );


    if (!data.length) {

        tbody.innerHTML = emptyRow(
            5,
            "No rejected applicants found."
        );

        return;
    }


    tbody.innerHTML =
        data.map(application => {

            return `
                <tr>

                    <td>
                        ${escapeHtml(
                            getApplicantNumber(
                                application
                            )
                        )}
                    </td>

                    <td>
                        <strong>
                            ${escapeHtml(
                                getApplicantNameFromApplication(
                                    application
                                )
                            )}
                        </strong>
                    </td>

                    <td>
                        ${escapeHtml(
                            getPosition(
                                application
                            )
                        )}
                    </td>

                    <td>
                        ${formatDate(
                            application.application_date
                        )}
                    </td>

                    <td>
                        ${statusBadge(
                            application.status
                        )}
                    </td>

                </tr>
            `;

        }).join("");
}


/* =========================================================
   HIRED REPORT
   ========================================================= */

function renderHiredReport() {

    const table =
        document.getElementById(
            "hiredApplicantsTable"
        );


    if (!table) {
        return;
    }


    const tbody =
        table.querySelector("tbody");


    if (!tbody) {
        return;
    }


    const data =
        applicantReportsData.hired || [];


    setText(
        "hiredReportCount",
        `${data.length} record${data.length === 1 ? "" : "s"}`
    );


    if (!data.length) {

        tbody.innerHTML = emptyRow(
            6,
            "No hired applicants found."
        );

        return;
    }


    tbody.innerHTML =
        data.map(application => {

            const hiringRecord =
                application.hiringRecord;


            const position =
                getPosition(
                    application
                ) !== "—"
                    ? getPosition(
                        application
                    )
                    : (
                        hiringRecord &&
                        hiringRecord.position
                            ? hiringRecord.position
                            : "—"
                    );


            return `
                <tr>

                    <td>
                        ${escapeHtml(
                            getApplicantNumber(
                                application
                            )
                        )}
                    </td>

                    <td>
                        <strong>
                            ${escapeHtml(
                                getApplicantNameFromApplication(
                                    application
                                )
                            )}
                        </strong>
                    </td>

                    <td>
                        ${escapeHtml(
                            position
                        )}
                    </td>

                    <td>
                        ${formatDate(
                            hiringRecord
                                ? hiringRecord.hiring_date
                                : null
                        )}
                    </td>

                    <td>
                        ${escapeHtml(
                            hiringRecord &&
                            hiringRecord.employment_status
                                ? hiringRecord.employment_status
                                : "—"
                        )}
                    </td>

                    <td>
                        ${formatDate(
                            hiringRecord
                                ? hiringRecord.start_date
                                : null
                        )}
                    </td>

                </tr>
            `;

        }).join("");
}


/* =========================================================
   EVENTS
   ========================================================= */

function bindApplicantReportEvents() {

    const refreshButton =
        document.getElementById(
            "refreshApplicantReports"
        );


    if (refreshButton) {

        refreshButton.addEventListener(
            "click",
            async () => {

                await loadApplicantReports();

            }
        );
    }


    const printButton =
        document.getElementById(
            "printApplicantReports"
        );


    if (printButton) {

        printButton.addEventListener(
            "click",
            () => {

                window.print();

            }
        );
    }


    const searchInput =
        document.getElementById(
            "applicantReportSearch"
        );


    if (searchInput) {

        searchInput.addEventListener(
            "input",
            () => {

                renderMasterList();

            }
        );
    }


    const statusFilter =
        document.getElementById(
            "applicantStatusFilter"
        );


    if (statusFilter) {

        statusFilter.addEventListener(
            "change",
            () => {

                renderMasterList();

            }
        );
    }
}


/* =========================================================
   HELPER:
   GET UNIQUE APPLICANT COUNT BY APPLICATION STATUS
   ========================================================= */

function getUniqueApplicantCountByStatus(
    applications,
    wantedStatus
) {

    const ids = new Set();


    applications.forEach(application => {

        if (
            normalizeStatus(
                application.status
            ) !== wantedStatus
        ) {
            return;
        }


        if (application.applicant_id) {

            ids.add(
                String(
                    application.applicant_id
                )
            );
        }

    });


    return ids.size;
}


/* =========================================================
   HELPER:
   GET LATEST HIRING RECORD
   ========================================================= */

function getLatestHiringRecord(
    applicationId,
    hiringRecords
) {

    const records =
        hiringRecords.filter(record => {

            return String(
                record.application_id
            ) === String(
                applicationId
            );

        });


    if (!records.length) {
        return null;
    }


    records.sort((a, b) => {

        const dateA =
            new Date(
                a.updated_at ||
                a.created_at ||
                a.hiring_date ||
                0
            ).getTime();


        const dateB =
            new Date(
                b.updated_at ||
                b.created_at ||
                b.hiring_date ||
                0
            ).getTime();


        return dateB - dateA;

    });


    return records[0];
}


/* =========================================================
   HELPER:
   GET POSITION
   ========================================================= */

function getPosition(application) {

    if (
        application &&
        application.job_postings &&
        application.job_postings.job_title
    ) {

        return application.job_postings.job_title;
    }


    return "—";
}


/* =========================================================
   HELPER:
   GET APPLICANT NAME
   ========================================================= */

function getApplicantName(applicant) {

    if (!applicant) {
        return "—";
    }


    const firstName =
        applicant.first_name || "";


    const lastName =
        applicant.last_name || "";


    const fullName =
        `${firstName} ${lastName}`.trim();


    return fullName || "—";
}


/* =========================================================
   HELPER:
   GET APPLICANT NAME FROM APPLICATION
   ========================================================= */

function getApplicantNameFromApplication(
    application
) {

    if (
        application &&
        application.applicants
    ) {

        return getApplicantName(
            application.applicants
        );
    }


    return "—";
}


/* =========================================================
   HELPER:
   GET APPLICANT NUMBER
   ========================================================= */

function getApplicantNumber(
    application
) {

    if (
        application &&
        application.applicants &&
        application.applicants.applicant_no
    ) {

        return application
            .applicants
            .applicant_no;
    }


    return "—";
}


/* =========================================================
   HELPER:
   NORMALIZE STATUS
   ========================================================= */

function normalizeStatus(status) {

    return String(
        status || ""
    )
    .trim()
    .toUpperCase()
    .replace(/_/g, " ")
    .replace(/\s+/g, " ");
}


/* =========================================================
   HELPER:
   FORMAT STATUS
   ========================================================= */

function formatStatus(status) {

    const normalized =
        normalizeStatus(status);


    const statusNames = {

        "SUBMITTED":
            "Submitted",

        "UNDER SCREENING":
            "Under Screening",

        "QUALIFIED":
            "Qualified",

        "FOR INTERVIEW":
            "For Interview",

        "INTERVIEWED":
            "Interviewed",

        "SELECTED FOR HIRING":
            "Selected for Hiring",

        "HIRED":
            "Hired",

        "REJECTED":
            "Rejected",

        "DECLINED":
            "Declined",

        "ON HOLD":
            "On Hold",

        "ACTIVE":
            "Active",

        "INACTIVE":
            "Inactive",

        "NO STATUS":
            "No Status"
    };


    return (
        statusNames[normalized] ||
        normalized
            .toLowerCase()
            .replace(/\b\w/g, letter =>
                letter.toUpperCase()
            )
    );
}


/* =========================================================
   HELPER:
   STATUS BADGE
   ========================================================= */

function statusBadge(status) {

    if (
        status === null ||
        status === undefined ||
        String(status).trim() === ""
    ) {
        return `
            <span class="status-badge">
                —
            </span>
        `;
    }


    const normalized =
        normalizeStatus(status);


    let badgeClass =
        "status-badge";


    if (
        normalized === "ACTIVE" ||
        normalized === "QUALIFIED" ||
        normalized === "HIRED"
    ) {

        badgeClass +=
            " status-success";

    } else if (
        normalized === "REJECTED" ||
        normalized === "DECLINED" ||
        normalized === "INACTIVE"
    ) {

        badgeClass +=
            " status-danger";

    } else if (
        normalized === "ON HOLD" ||
        normalized === "UNDER SCREENING" ||
        normalized === "FOR INTERVIEW"
    ) {

        badgeClass +=
            " status-warning";
    }


    return `
        <span class="${badgeClass}">
            ${escapeHtml(
                formatStatus(status)
            )}
        </span>
    `;
}


/* =========================================================
   HELPER:
   COMPARE APPLICATIONS
   ========================================================= */

function compareApplicationsNewest(
    a,
    b
) {

    const dateA =
        new Date(
            a.application_date ||
            a.created_at ||
            0
        ).getTime();


    const dateB =
        new Date(
            b.application_date ||
            b.created_at ||
            0
        ).getTime();


    return dateB - dateA;
}


/* =========================================================
   HELPER:
   FORMAT DATE
   ========================================================= */

function formatDate(value) {

    if (!value) {
        return "—";
    }


    const date =
        new Date(value);


    if (Number.isNaN(
        date.getTime()
    )) {
        return "—";
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


/* =========================================================
   HELPER:
   SET TEXT
   ========================================================= */

function setText(
    id,
    value
) {

    const element =
        document.getElementById(id);


    if (element) {

        element.textContent =
            value;
    }
}


/* =========================================================
   HELPER:
   EMPTY TABLE ROW
   ========================================================= */

function emptyRow(
    colspan,
    message
) {

    return `
        <tr>

            <td
                colspan="${colspan}"
                class="table-empty"
            >
                ${escapeHtml(message)}
            </td>

        </tr>
    `;
}


/* =========================================================
   LOADING STATE
   ========================================================= */

function setLoadingState() {

    const tableIds = [

        [
            "applicantMasterTable",
            7
        ],

        [
            "applicantsByPositionTable",
            3
        ],

        [
            "applicantsByStatusTable",
            2
        ],

        [
            "qualifiedApplicantsTable",
            5
        ],

        [
            "rejectedApplicantsTable",
            5
        ],

        [
            "hiredApplicantsTable",
            6
        ]

    ];


    tableIds.forEach(
        ([id, colspan]) => {

            const table =
                document.getElementById(id);


            if (!table) {
                return;
            }


            const tbody =
                table.querySelector("tbody");


            if (!tbody) {
                return;
            }


            tbody.innerHTML =
                emptyRow(
                    colspan,
                    "Loading reports..."
                );

        }
    );
}


/* =========================================================
   ERROR STATE
   ========================================================= */

function renderErrorState(
    message
) {

    const tableIds = [

        [
            "applicantMasterTable",
            7
        ],

        [
            "applicantsByPositionTable",
            3
        ],

        [
            "applicantsByStatusTable",
            2
        ],

        [
            "qualifiedApplicantsTable",
            5
        ],

        [
            "rejectedApplicantsTable",
            5
        ],

        [
            "hiredApplicantsTable",
            6
        ]

    ];


    tableIds.forEach(
        ([id, colspan]) => {

            const table =
                document.getElementById(id);


            if (!table) {
                return;
            }


            const tbody =
                table.querySelector("tbody");


            if (!tbody) {
                return;
            }


            tbody.innerHTML =
                emptyRow(
                    colspan,
                    message
                );

        }
    );
}


/* =========================================================
   TOAST
   ========================================================= */

function showApplicantReportToast(
    message,
    type = "info"
) {

    /*
        Use the shared showToast() if
        components.js provides it.
    */

    if (
        typeof showToast === "function"
    ) {

        showToast(
            message,
            type
        );

        return;
    }


    const toastRoot =
        document.getElementById(
            "toastRoot"
        );


    if (!toastRoot) {
        return;
    }


    const toast =
        document.createElement(
            "div"
        );


    toast.className =
        `toast toast-${type}`;


    toast.textContent =
        message;


    toastRoot.appendChild(
        toast
    );


    setTimeout(() => {

        toast.remove();

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