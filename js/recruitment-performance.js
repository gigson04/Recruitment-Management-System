/* =========================================================
   RECRUITMENT MANAGEMENT SYSTEM
   LABORATORY ACTIVITY 22
   RECRUITMENT PERFORMANCE REPORTS
   ========================================================= */


/* =========================================================
   SUPABASE CLIENT
   ========================================================= */

const performanceSupabase =
    window.rmsSupabase ||
    window.supabaseClient;


/* =========================================================
   GLOBAL DATA
   ========================================================= */

let performanceData = {

    applicants: [],

    applications: [],

    jobPostings: [],

    screenings: [],

    interviews: [],

    hiring: []

};


/* =========================================================
   PAGE INITIALIZATION
   ========================================================= */

document.addEventListener(
    'DOMContentLoaded',
    async () => {

        try {

            /*
             * Render the shared RMS shell.
             *
             * IMPORTANT:
             * This label must exactly match the
             * sidebar label.
             */

            renderShell({
                active: 'Recruitment Performance'
            });


            /*
             * Require authenticated user.
             */

            const authenticated =
                await requireAuth();


            if (
                authenticated === false
            ) {

                return;

            }


            /*
             * Load user information
             * into the shared sidebar.
             */

            await loadUserProfile();


            /*
             * Load the performance reports.
             */

            await loadPerformanceReports();


            /*
             * Setup page buttons.
             */

            bindPerformanceEvents();


        } catch (error) {

            console.error(
                'Recruitment performance initialization error:',
                error
            );


            showPerformanceError(
                'Unable to load recruitment performance reports.'
            );

        }

    }
);


/* =========================================================
   LOAD ALL PERFORMANCE DATA
   ========================================================= */

async function loadPerformanceReports() {

    if (
        !performanceSupabase
    ) {

        throw new Error(
            'Supabase client is unavailable.'
        );

    }


    setPerformanceLoading(
        true
    );


    try {

        /*
         * Load all required tables.
         *
         * These are existing RMS tables.
         */

        const [
            applicantsResult,
            applicationsResult,
            jobsResult,
            screeningsResult,
            interviewsResult,
            hiringResult
        ] = await Promise.all([


            /* ---------------------------------------------
               APPLICANTS
               --------------------------------------------- */

            performanceSupabase
                .from('applicants')
                .select(`
                    applicant_id,
                    applicant_no,
                    first_name,
                    last_name,
                    email,
                    status
                `),


            /* ---------------------------------------------
               APPLICATIONS
               --------------------------------------------- */

            performanceSupabase
                .from('applications')
                .select(`
                    application_id,
                    applicant_id,
                    job_id,
                    application_date,
                    status
                `),


            /* ---------------------------------------------
               JOB POSTINGS
               --------------------------------------------- */

            performanceSupabase
                .from('job_postings')
                .select(`
                    job_id,
                    job_code,
                    job_title,
                    department,
                    vacancies,
                    status,
                    closing_date
                `),


            /* ---------------------------------------------
               SCREENINGS
               --------------------------------------------- */

            performanceSupabase
                .from('screenings')
                .select(`
                    screening_id,
                    application_id,
                    screening_date,
                    score,
                    result,
                    created_at
                `),


            /* ---------------------------------------------
               INTERVIEWS
               --------------------------------------------- */

            performanceSupabase
                .from('interviews')
                .select(`
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
                `),


            /* ---------------------------------------------
               HIRING
               --------------------------------------------- */

            performanceSupabase
                .from('hiring')
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

        ]);


        /* =================================================
           CHECK FOR DATABASE ERRORS
           ================================================= */

        if (
            applicantsResult.error
        ) {

            throw applicantsResult.error;

        }


        if (
            applicationsResult.error
        ) {

            throw applicationsResult.error;

        }


        if (
            jobsResult.error
        ) {

            throw jobsResult.error;

        }


        if (
            screeningsResult.error
        ) {

            throw screeningsResult.error;

        }


        if (
            interviewsResult.error
        ) {

            throw interviewsResult.error;

        }


        if (
            hiringResult.error
        ) {

            throw hiringResult.error;

        }


        /* =================================================
           SAVE DATA
           ================================================= */

        performanceData.applicants =
            applicantsResult.data || [];


        performanceData.applications =
            applicationsResult.data || [];


        performanceData.jobPostings =
            jobsResult.data || [];


        performanceData.screenings =
            screeningsResult.data || [];


        performanceData.interviews =
            interviewsResult.data || [];


        performanceData.hiring =
            hiringResult.data || [];


        /* =================================================
           BUILD REPORTS
           ================================================= */

        renderPerformanceSummary();

        renderApplicantsPerVacancy();

        renderScreeningPerformance();

        renderInterviewPerformance();

        renderHiringPerformance();

        renderRecruitmentSource();

        renderVacancyFulfillment();


        /* =================================================
           UPDATE LAST REFRESHED
           ================================================= */

        const updatedElement =
            document.querySelector(
                '#performanceUpdated'
            );


        if (
            updatedElement
        ) {

            updatedElement.textContent =
                `Updated ${formatPerformanceDateTime(
                    new Date()
                )}`;

        }


    } catch (error) {

        console.error(
            'Performance report loading error:',
            error
        );


        showPerformanceError(
            getPerformanceErrorMessage(
                error
            )
        );

    } finally {

        setPerformanceLoading(
            false
        );

    }

}


/* =========================================================
   SUMMARY
   ========================================================= */

function renderPerformanceSummary() {

    const applicants =
        getUniqueApplicantIds(
            performanceData.applications
        );


    const screened =
        getScreenedApplicationIds();


    const qualified =
        getQualifiedApplicationIds();


    const interviews =
        getInterviewApplicationIds();


    const passedInterviews =
        getPassedInterviewApplicationIds();


    const hired =
        getHiredApplicationIds();


    const selected =
        getSelectedApplicationIds();


    /* -----------------------------------------------------
       TIME TO HIRE
       ----------------------------------------------------- */

    const timeToHire =
        calculateAverageTimeToHire();


    setText(
        'averageTimeToHire',
        timeToHire === null
            ? '—'
            : timeToHire.toFixed(1)
    );


    /* -----------------------------------------------------
       TOTAL APPLICANTS
       ----------------------------------------------------- */

    setText(
        'totalPerformanceApplicants',
        applicants.size
    );


    setText(
        'hiringApplicantsCount',
        applicants.size
    );


    /* -----------------------------------------------------
       SCREENING RATE
       ----------------------------------------------------- */

    const screeningRate =
        calculateRate(
            qualified.size,
            screened.size
        );


    setText(
        'screeningPassRate',
        formatPercent(
            screeningRate
        )
    );


    setText(
        'screeningPassRateLarge',
        formatPercent(
            screeningRate
        )
    );


    setText(
        'screenedPerformanceCount',
        screened.size
    );


    setText(
        'qualifiedPerformanceCount',
        qualified.size
    );


    const rejected =
        getRejectedApplicationIds();


    setText(
        'rejectedPerformanceCount',
        rejected.size
    );


    /* -----------------------------------------------------
       INTERVIEW RATE
       ----------------------------------------------------- */

    const interviewRate =
        calculateRate(
            passedInterviews.size,
            interviews.size
        );


    setText(
        'interviewPassRate',
        formatPercent(
            interviewRate
        )
    );


    setText(
        'interviewPassRateLarge',
        formatPercent(
            interviewRate
        )
    );


    setText(
        'totalInterviewsPerformance',
        interviews.size
    );


    setText(
        'passedInterviewsPerformance',
        passedInterviews.size
    );


    const failedInterviews =
        getFailedInterviewApplicationIds();


    setText(
        'failedInterviewsPerformance',
        failedInterviews.size
    );


    /* -----------------------------------------------------
       HIRING RATE
       ----------------------------------------------------- */

    const hiringRate =
        calculateRate(
            hired.size,
            applicants.size
        );


    setText(
        'hiringRate',
        formatPercent(
            hiringRate
        )
    );


    setText(
        'hiringRateLarge',
        formatPercent(
            hiringRate
        )
    );


    setText(
        'selectedPerformanceCount',
        selected.size
    );


    setText(
        'hiredPerformanceCount',
        hired.size
    );


    /* -----------------------------------------------------
       VACANCY FULFILLMENT
       ----------------------------------------------------- */

    const vacancyStats =
        calculateOverallVacancyFulfillment();


    setText(
        'vacancyFulfillmentRate',
        formatPercent(
            vacancyStats.rate
        )
    );

}


/* =========================================================
   APPLICANTS PER VACANCY
   ========================================================= */

function renderApplicantsPerVacancy() {

    const table =
        document.querySelector(
            '#applicantsPerVacancyTable'
        );


    const count =
        document.querySelector(
            '#applicantsPerVacancyCount'
        );


    if (!table) {
        return;
    }


    const jobs =
        performanceData.jobPostings || [];


    if (count) {

        count.textContent =
            `${jobs.length} ${
                jobs.length === 1
                    ? 'Job'
                    : 'Jobs'
            }`;

    }


    if (!jobs.length) {

        table.innerHTML = `
            <tr>
                <td
                    colspan="6"
                    class="performance-empty"
                >
                    No job posting data available.
                </td>
            </tr>
        `;

        return;

    }


    const rows =
        jobs.map(
            job => {

                const applications =
                    performanceData.applications
                        .filter(
                            application =>
                                String(
                                    application.job_id
                                ) ===
                                String(
                                    job.job_id
                                )
                        );


                const vacancies =
                    toNumber(
                        job.vacancies
                    );


                const applicantCount =
                    new Set(
                        applications
                            .map(
                                application =>
                                    application.applicant_id
                            )
                            .filter(Boolean)
                    ).size;


                const applicantsPerVacancy =
                    vacancies > 0
                        ? applicantCount /
                          vacancies
                        : null;


                return `
                    <tr>

                        <td>
                            ${escapeHtml(
                                job.job_code ||
                                '—'
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                job.job_title ||
                                '—'
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                job.department ||
                                '—'
                            )}
                        </td>

                        <td>
                            ${vacancies}
                        </td>

                        <td>
                            ${applicantCount}
                        </td>

                        <td>
                            ${
                                applicantsPerVacancy === null
                                    ? '—'
                                    : applicantsPerVacancy.toFixed(2)
                            }
                        </td>

                    </tr>
                `;

            }
        )
        .join('');


    table.innerHTML =
        rows;

}


/* =========================================================
   SCREENING PERFORMANCE
   ========================================================= */

function renderScreeningPerformance() {

    /*
     * The summary section already contains the
     * screening calculations.
     *
     * This function exists separately so the
     * report structure remains easy to expand.
     */

    const screened =
        getScreenedApplicationIds();


    const qualified =
        getQualifiedApplicationIds();


    const rate =
        calculateRate(
            qualified.size,
            screened.size
        );


    setText(
        'screeningPassRateLarge',
        formatPercent(
            rate
        )
    );

}


/* =========================================================
   INTERVIEW PERFORMANCE
   ========================================================= */

function renderInterviewPerformance() {

    const interviewIds =
        getInterviewApplicationIds();


    const passedIds =
        getPassedInterviewApplicationIds();


    const failedIds =
        getFailedInterviewApplicationIds();


    const rate =
        calculateRate(
            passedIds.size,
            interviewIds.size
        );


    setText(
        'interviewPassRateLarge',
        formatPercent(
            rate
        )
    );


    setText(
        'totalInterviewsPerformance',
        interviewIds.size
    );


    setText(
        'passedInterviewsPerformance',
        passedIds.size
    );


    setText(
        'failedInterviewsPerformance',
        failedIds.size
    );

}


/* =========================================================
   HIRING PERFORMANCE
   ========================================================= */

function renderHiringPerformance() {

    const applicants =
        getUniqueApplicantIds(
            performanceData.applications
        );


    const selected =
        getSelectedApplicationIds();


    const hired =
        getHiredApplicationIds();


    const rate =
        calculateRate(
            hired.size,
            applicants.size
        );


    setText(
        'hiringRateLarge',
        formatPercent(
            rate
        )
    );


    setText(
        'hiringApplicantsCount',
        applicants.size
    );


    setText(
        'selectedPerformanceCount',
        selected.size
    );


    setText(
        'hiredPerformanceCount',
        hired.size
    );

}


/* =========================================================
   RECRUITMENT SOURCE
   ========================================================= */

function renderRecruitmentSource() {

    const table =
        document.querySelector(
            '#recruitmentSourceTable'
        );


    const count =
        document.querySelector(
            '#recruitmentSourceCount'
        );


    if (!table) {
        return;
    }


    /*
     * The current RMS database does not contain a
     * documented recruitment-source field in the
     * existing applicant/application structure.
     *
     * Therefore we do NOT invent source data.
     */


    if (count) {

        count.textContent =
            '0 Sources';

    }


    table.innerHTML = `
        <tr>

            <td
                colspan="5"
                class="performance-empty"
            >

                Recruitment source data is not
                currently available in the database.

            </td>

        </tr>
    `;

}


/* =========================================================
   VACANCY FULFILLMENT
   ========================================================= */

function renderVacancyFulfillment() {

    const table =
        document.querySelector(
            '#vacancyFulfillmentTable'
        );


    if (!table) {
        return;
    }


    const jobs =
        performanceData.jobPostings || [];


    if (!jobs.length) {

        table.innerHTML = `
            <tr>

                <td
                    colspan="6"
                    class="performance-empty"
                >
                    No vacancy data available.
                </td>

            </tr>
        `;

        return;

    }


    const rows =
        jobs.map(
            job => {

                const vacancies =
                    toNumber(
                        job.vacancies
                    );


                const hiredCount =
                    getHiredCountForJob(
                        job.job_id
                    );


                const fulfillmentRate =
                    vacancies > 0
                        ? Math.min(
                            (
                                hiredCount /
                                vacancies
                            ) * 100,
                            100
                        )
                        : null;


                return `
                    <tr>

                        <td>
                            ${escapeHtml(
                                job.job_code ||
                                '—'
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                job.job_title ||
                                '—'
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                job.department ||
                                '—'
                            )}
                        </td>

                        <td>
                            ${vacancies}
                        </td>

                        <td>
                            ${hiredCount}
                        </td>

                        <td>
                            ${
                                fulfillmentRate === null
                                    ? '—'
                                    : formatPercent(
                                        fulfillmentRate
                                    )
                            }
                        </td>

                    </tr>
                `;

            }
        )
        .join('');


    table.innerHTML =
        rows;

}


/* =========================================================
   AVERAGE TIME-TO-HIRE
   ========================================================= */

function calculateAverageTimeToHire() {

    const durations = [];


    for (
        const hire
        of performanceData.hiring
    ) {

        const application =
            performanceData.applications
                .find(
                    item =>
                        String(
                            item.application_id
                        ) ===
                        String(
                            hire.application_id
                        )
                );


        if (
            !application?.application_date ||
            !hire?.hiring_date
        ) {

            continue;

        }


        const applicationDate =
            parseDate(
                application.application_date
            );


        const hiringDate =
            parseDate(
                hire.hiring_date
            );


        if (
            !applicationDate ||
            !hiringDate
        ) {

            continue;

        }


        const difference =
            hiringDate.getTime() -
            applicationDate.getTime();


        const days =
            difference /
            (
                1000 *
                60 *
                60 *
                24
            );


        /*
         * Ignore invalid negative durations.
         */

        if (
            days >= 0
        ) {

            durations.push(
                days
            );

        }

    }


    if (
        durations.length === 0
    ) {

        return null;

    }


    const total =
        durations.reduce(
            (
                sum,
                value
            ) =>
                sum + value,
            0
        );


    return (
        total /
        durations.length
    );

}


/* =========================================================
   OVERALL VACANCY FULFILLMENT
   ========================================================= */

function calculateOverallVacancyFulfillment() {

    let totalVacancies = 0;

    let totalHired = 0;


    for (
        const job
        of performanceData.jobPostings
    ) {

        totalVacancies +=
            Math.max(
                0,
                toNumber(
                    job.vacancies
                )
            );


        totalHired +=
            getHiredCountForJob(
                job.job_id
            );

    }


    const rate =
        totalVacancies > 0
            ? Math.min(
                (
                    totalHired /
                    totalVacancies
                ) * 100,
                100
            )
            : 0;


    return {

        vacancies:
            totalVacancies,

        hired:
            totalHired,

        rate

    };

}


/* =========================================================
   GET HIRED COUNT FOR JOB
   ========================================================= */

function getHiredCountForJob(
    jobId
) {

    const hiredApplicationIds =
        getHiredApplicationIds();


    const matchingApplicationIds =
        performanceData.applications
            .filter(
                application =>
                    String(
                        application.job_id
                    ) ===
                    String(
                        jobId
                    )
            )
            .map(
                application =>
                    String(
                        application.application_id
                    )
            );


    return matchingApplicationIds
        .filter(
            applicationId =>
                hiredApplicationIds.has(
                    applicationId
                )
        )
        .length;

}


/* =========================================================
   SCREENED APPLICATION IDS
   ========================================================= */

function getScreenedApplicationIds() {

    return new Set(

        performanceData.screenings

            .map(
                screening =>
                    screening.application_id
            )

            .filter(Boolean)

            .map(
                id =>
                    String(id)
            )

    );

}


/* =========================================================
   QUALIFIED APPLICATION IDS
   ========================================================= */

function getQualifiedApplicationIds() {

    return new Set(

        performanceData.applications

            .filter(
                application =>
                    normalizeStatus(
                        application.status
                    ) === 'QUALIFIED'
            )

            .map(
                application =>
                    application.application_id
            )

            .filter(Boolean)

            .map(
                id =>
                    String(id)
            )

    );

}


/* =========================================================
   REJECTED APPLICATION IDS
   ========================================================= */

function getRejectedApplicationIds() {

    return new Set(

        performanceData.applications

            .filter(
                application =>
                    normalizeStatus(
                        application.status
                    ) === 'REJECTED'
            )

            .map(
                application =>
                    application.application_id
            )

            .filter(Boolean)

            .map(
                id =>
                    String(id)
            )

    );

}


/* =========================================================
   INTERVIEW APPLICATION IDS
   ========================================================= */

function getInterviewApplicationIds() {

    return new Set(

        performanceData.interviews

            .map(
                interview =>
                    interview.application_id
            )

            .filter(Boolean)

            .map(
                id =>
                    String(id)
            )

    );

}


/* =========================================================
   PASSED INTERVIEW IDS
   ========================================================= */

function getPassedInterviewApplicationIds() {

    return new Set(

        performanceData.interviews

            .filter(
                interview =>
                    isPassedInterview(
                        interview
                    )
            )

            .map(
                interview =>
                    interview.application_id
            )

            .filter(Boolean)

            .map(
                id =>
                    String(id)
            )

    );

}


/* =========================================================
   FAILED INTERVIEW IDS
   ========================================================= */

function getFailedInterviewApplicationIds() {

    return new Set(

        performanceData.interviews

            .filter(
                interview =>
                    isFailedInterview(
                        interview
                    )
            )

            .map(
                interview =>
                    interview.application_id
            )

            .filter(Boolean)

            .map(
                id =>
                    String(id)
            )

    );

}


/* =========================================================
   SELECTED APPLICATION IDS
   ========================================================= */

function getSelectedApplicationIds() {

    return new Set(

        performanceData.applications

            .filter(
                application =>
                    normalizeStatus(
                        application.status
                    ) ===
                    'SELECTED FOR HIRING'
            )

            .map(
                application =>
                    application.application_id
            )

            .filter(Boolean)

            .map(
                id =>
                    String(id)
            )

    );

}


/* =========================================================
   HIRED APPLICATION IDS
   ========================================================= */

function getHiredApplicationIds() {

    const applicationIds =
        new Set();


    /*
     * Primary source:
     * applications.status = Hired
     */

    performanceData.applications

        .filter(
            application =>
                normalizeStatus(
                    application.status
                ) === 'HIRED'
        )

        .forEach(
            application => {

                if (
                    application.application_id
                ) {

                    applicationIds.add(
                        String(
                            application.application_id
                        )
                    );

                }

            }
        );


    /*
     * Also recognize records in the hiring table
     * whose status is Hired.
     */

    performanceData.hiring

        .filter(
            hire =>
                normalizeStatus(
                    hire.status
                ) === 'HIRED'
        )

        .forEach(
            hire => {

                if (
                    hire.application_id
                ) {

                    applicationIds.add(
                        String(
                            hire.application_id
                        )
                    );

                }

            }
        );


    return applicationIds;

}


/* =========================================================
   UNIQUE APPLICANT IDS
   ========================================================= */

function getUniqueApplicantIds(
    applications
) {

    return new Set(

        applications

            .map(
                application =>
                    application.applicant_id
            )

            .filter(Boolean)

            .map(
                id =>
                    String(id)
            )

    );

}


/* =========================================================
   INTERVIEW RESULT CHECK
   ========================================================= */

function isPassedInterview(
    interview
) {

    const result =
        normalizeStatus(
            interview?.result
        );


    const status =
        normalizeStatus(
            interview?.status
        );


    return (
        result === 'PASSED' ||
        result === 'PASS' ||
        result === 'QUALIFIED' ||
        status === 'PASSED' ||
        status === 'PASS'
    );

}


/* =========================================================
   FAILED INTERVIEW CHECK
   ========================================================= */

function isFailedInterview(
    interview
) {

    const result =
        normalizeStatus(
            interview?.result
        );


    const status =
        normalizeStatus(
            interview?.status
        );


    return (
        result === 'FAILED' ||
        result === 'FAIL' ||
        result === 'REJECTED' ||
        status === 'FAILED' ||
        status === 'FAIL' ||
        status === 'REJECTED'
    );

}


/* =========================================================
   EVENT BINDINGS
   ========================================================= */

function bindPerformanceEvents() {

    const refreshButton =
        document.querySelector(
            '#refreshPerformance'
        );


    if (
        refreshButton
    ) {

        refreshButton.addEventListener(
            'click',
            async () => {

                await loadPerformanceReports();

            }
        );

    }


    const printButton =
        document.querySelector(
            '#printPerformance'
        );


    if (
        printButton
    ) {

        printButton.addEventListener(
            'click',
            () => {

                window.print();

            }
        );

    }

}


/* =========================================================
   LOADING STATE
   ========================================================= */

function setPerformanceLoading(
    loading
) {

    const refreshButton =
        document.querySelector(
            '#refreshPerformance'
        );


    if (
        !refreshButton
    ) {

        return;

    }


    if (
        loading
    ) {

        refreshButton.disabled =
            true;

        refreshButton.textContent =
            '↻ Loading...';

    } else {

        refreshButton.disabled =
            false;

        refreshButton.textContent =
            '↻ Refresh';

    }

}


/* =========================================================
   SHOW ERROR
   ========================================================= */

function showPerformanceError(
    message
) {

    const updatedElement =
        document.querySelector(
            '#performanceUpdated'
        );


    if (
        updatedElement
    ) {

        updatedElement.textContent =
            message;

    }


    const tables = [

        [
            '#applicantsPerVacancyTable',
            6
        ],

        [
            '#recruitmentSourceTable',
            5
        ],

        [
            '#vacancyFulfillmentTable',
            6
        ]

    ];


    tables.forEach(
        (
            [
                selector,
                colspan
            ]
        ) => {

            const table =
                document.querySelector(
                    selector
                );


            if (
                table
            ) {

                table.innerHTML = `
                    <tr>

                        <td
                            colspan="${colspan}"
                            class="performance-empty"
                        >
                            ${escapeHtml(
                                message
                            )}
                        </td>

                    </tr>
                `;

            }

        }
    );


    try {

        showToast(
            message,
            'error'
        );

    } catch (
        toastError
    ) {

        console.warn(
            toastError
        );

    }

}


/* =========================================================
   GET ERROR MESSAGE
   ========================================================= */

function getPerformanceErrorMessage(
    error
) {

    const message =
        error?.message ||
        'Unknown error';


    if (
        message
            .toLowerCase()
            .includes(
                'column'
            )
    ) {

        return (
            'A database column used by the performance report was not found.'
        );

    }


    if (
        message
            .toLowerCase()
            .includes(
                'relation'
            )
    ) {

        return (
            'A required recruitment table was not found.'
        );

    }


    return (
        `Unable to load performance data: ${message}`
    );

}


/* =========================================================
   SET TEXT
   ========================================================= */

function setText(
    id,
    value
) {

    const element =
        document.getElementById(
            id
        );


    if (
        element
    ) {

        element.textContent =
            value;

    }

}


/* =========================================================
   NORMALIZE STATUS
   ========================================================= */

function normalizeStatus(
    value
) {

    return String(
        value || ''
    )

        .trim()

        .toUpperCase()

        .replace(
            /[_-]+/g,
            ' '
        )

        .replace(
            /\s+/g,
            ' '
        );

}


/* =========================================================
   CALCULATE RATE
   ========================================================= */

function calculateRate(
    numerator,
    denominator
) {

    if (
        !denominator ||
        denominator <= 0
    ) {

        return 0;

    }


    return (
        numerator /
        denominator
    ) * 100;

}


/* =========================================================
   FORMAT PERCENT
   ========================================================= */

function formatPercent(
    value
) {

    if (
        !Number.isFinite(
            Number(value)
        )
    ) {

        return '0%';

    }


    return `${Number(
        value
    ).toFixed(1)}%`;

}


/* =========================================================
   NUMBER CONVERSION
   ========================================================= */

function toNumber(
    value
) {

    const number =
        Number(value);


    if (
        Number.isFinite(
            number
        )
    ) {

        return number;

    }


    return 0;

}


/* =========================================================
   PARSE DATE
   ========================================================= */

function parseDate(
    value
) {

    if (!value) {
        return null;
    }


    const date =
        new Date(
            value
        );


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return null;

    }


    return date;

}


/* =========================================================
   FORMAT DATE + TIME
   ========================================================= */

function formatPerformanceDateTime(
    value
) {

    const date =
        parseDate(
            value
        );


    if (!date) {
        return '—';
    }


    return new Intl.DateTimeFormat(
        'en-PH',
        {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        }
    ).format(
        date
    );

}


/* =========================================================
   ESCAPE HTML
   ========================================================= */

function escapeHtml(
    value = ''
) {

    return String(
        value
    )

        .replaceAll(
            '&',
            '&amp;'
        )

        .replaceAll(
            '<',
            '&lt;'
        )

        .replaceAll(
            '>',
            '&gt;'
        )

        .replaceAll(
            '"',
            '&quot;'
        )

        .replaceAll(
            "'",
            '&#039;'
        );

}