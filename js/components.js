/* =========================================================
   RECRUITMENT MANAGEMENT SYSTEM
   SHARED COMPONENTS
   RESPONSIVE VERSION
   ========================================================= */

const RMS_COMPONENTS = {

    navItems: [

        [
            'dashboard.html',
            'Dashboard',
            '▦'
        ],

        [
            'job-postings.html',
            'Job Postings',
            '▤'
        ],

        [
            'open-positions.html',
            'Open Positions',
            '⌕'
        ],

        [
            'applicants.html',
            'Applicants',
            '◎'
        ],

        [
            'applications.html',
            'Applications',
            '▧'
        ],

        [
            'screening.html',
            'Screening',
            '✓'
        ],

        [
            'interviews.html',
            'Interviews',
            '◷'
        ],

        [
            'hiring.html',
            'Hiring',
            '◆'
        ],

        [
            'employees.html',
            'Employees',
            '♙'
        ],

        [
            'reports.html',
            'Reports',
            '⌁'
        ],

        /* =================================================
           LAB 20 - APPLICANT REPORTS
           ================================================= */

        [
            'applicant-reports.html',
            'Applicant Reports',
            '▥'
        ],

        /* =================================================
           LAB 21 - RECRUITMENT PIPELINE
           ================================================= */

        [
            'applicant-pipeline.html',
            'Recruitment Pipeline',
            '⇢'
        ],

        [
            'users.html',
            'Users',
            '◉'
        ]

    ]

};


/* =========================================================
   RENDER APPLICATION SHELL
   ========================================================= */

function renderShell({
    active = ''
} = {}) {

    /* -----------------------------------------------------
       SIDEBAR
       ----------------------------------------------------- */

    const sidebar =
        document.querySelector(
            '#appSidebar'
        );

    if (sidebar) {

        sidebar.innerHTML = `

            <div class="brand-block">

                <div class="brand-mark">
                    R
                </div>

                <div>

                    <div class="brand-title">
                        Recruitment
                    </div>

                    <div class="brand-subtitle">
                        Management System
                    </div>

                </div>

            </div>


            <nav
                class="sidebar-nav"
                aria-label="Main navigation"
            >

                ${RMS_COMPONENTS.navItems
                    .map(
                        (
                            [
                                href,
                                label,
                                icon
                            ]
                        ) => `

                            <a
                                class="nav-item ${
                                    active === label
                                        ? 'active'
                                        : ''
                                }"
                                href="${href}"
                            >

                                <span
                                    class="nav-icon"
                                    aria-hidden="true"
                                >
                                    ${icon}
                                </span>

                                <span>
                                    ${label}
                                </span>

                            </a>

                        `
                    )
                    .join('')
                }

            </nav>


            <div class="sidebar-bottom">

                <div class="user-mini">

                    <div
                        class="avatar"
                        id="sidebarAvatar"
                    >
                        U
                    </div>

                    <div class="user-mini-text">

                        <strong
                            id="sidebarUsername"
                        >
                            User
                        </strong>

                        <span
                            id="sidebarRole"
                        >
                            Loading...
                        </span>

                    </div>

                </div>


                <button
                    class="nav-item logout-button"
                    id="logoutButton"
                    type="button"
                >

                    <span
                        class="nav-icon"
                        aria-hidden="true"
                    >
                        ↪
                    </span>

                    <span>
                        Logout
                    </span>

                </button>

            </div>

        `;

    }


    /* -----------------------------------------------------
       TOPBAR
       ----------------------------------------------------- */

    const topbar =
        document.querySelector(
            '#appTopbar'
        );

    if (topbar) {

        topbar.innerHTML = `

            <div class="topbar-left">

                <button
                    type="button"
                    class="mobile-menu-button"
                    id="mobileMenuButton"
                    aria-label="Open navigation menu"
                    aria-expanded="false"
                    title="Menu"
                >
                    ☰
                </button>


                <div>

                    <div
                        class="eyebrow"
                        id="topbarEyebrow"
                    >
                        Recruitment Management
                    </div>


                    <h1 id="topbarTitle">
                        ${escapeHtml(
                            active ||
                            'Dashboard'
                        )}
                    </h1>

                </div>

            </div>


            <div class="topbar-actions">

                <div
                    class="avatar avatar-top"
                    id="topbarAvatar"
                >
                    U
                </div>

            </div>

        `;

    }


    /* -----------------------------------------------------
       MOBILE SIDEBAR OVERLAY
       ----------------------------------------------------- */

    let overlay =
        document.querySelector(
            '#mobileSidebarOverlay'
        );

    if (!overlay) {

        overlay =
            document.createElement(
                'div'
            );

        overlay.id =
            'mobileSidebarOverlay';

        overlay.className =
            'mobile-sidebar-overlay';

        overlay.setAttribute(
            'aria-hidden',
            'true'
        );

        document.body.appendChild(
            overlay
        );

    }


    /* -----------------------------------------------------
       MOBILE MENU BUTTON
       ----------------------------------------------------- */

    const menuButton =
        document.querySelector(
            '#mobileMenuButton'
        );

    if (menuButton) {

        menuButton.addEventListener(
            'click',
            () => {

                toggleMobileSidebar();

            }
        );

    }


    /* -----------------------------------------------------
       OVERLAY CLOSE
       ----------------------------------------------------- */

    overlay.addEventListener(
        'click',
        closeMobileSidebar
    );


    /* -----------------------------------------------------
       CLOSE SIDEBAR AFTER NAVIGATION
       ----------------------------------------------------- */

    document
        .querySelectorAll(
            '#appSidebar .nav-item'
        )
        .forEach(
            item => {

                item.addEventListener(
                    'click',
                    () => {

                        closeMobileSidebar();

                    }
                );

            }
        );


    /* -----------------------------------------------------
       LOGOUT
       ----------------------------------------------------- */

    const logout =
        document.querySelector(
            '#logoutButton'
        );

    logout?.addEventListener(
        'click',
        async () => {

            try {

                if (
                    window.rmsSupabase
                ) {

                    await window.rmsSupabase
                        .auth
                        .signOut();

                }

            } catch (error) {

                console.error(
                    'Logout error:',
                    error
                );

            } finally {

                window.location.href =
                    'login.html';

            }

        }
    );

}


/* =========================================================
   MOBILE SIDEBAR OPEN / CLOSE
   ========================================================= */

function toggleMobileSidebar() {

    const sidebar =
        document.querySelector(
            '#appSidebar'
        );

    const overlay =
        document.querySelector(
            '#mobileSidebarOverlay'
        );

    const button =
        document.querySelector(
            '#mobileMenuButton'
        );

    if (!sidebar) {
        return;
    }


    const isOpen =
        sidebar.classList.contains(
            'mobile-open'
        ) ||
        sidebar.classList.contains(
            'sidebar-open'
        );


    if (isOpen) {

        closeMobileSidebar();

    } else {

        /* Support both versions of the responsive CSS */
        sidebar.classList.add(
            'mobile-open'
        );

        sidebar.classList.add(
            'sidebar-open'
        );


        if (overlay) {

            overlay.classList.add(
                'visible'
            );

            overlay.classList.add(
                'show'
            );

            overlay.setAttribute(
                'aria-hidden',
                'false'
            );

        }


        if (button) {

            button.setAttribute(
                'aria-expanded',
                'true'
            );

            button.setAttribute(
                'aria-label',
                'Close navigation menu'
            );

            button.textContent =
                '×';

        }

    }

}


/* =========================================================
   CLOSE MOBILE SIDEBAR
   ========================================================= */

function closeMobileSidebar() {

    const sidebar =
        document.querySelector(
            '#appSidebar'
        );

    const overlay =
        document.querySelector(
            '#mobileSidebarOverlay'
        );

    const button =
        document.querySelector(
            '#mobileMenuButton'
        );


    if (sidebar) {

        sidebar.classList.remove(
            'mobile-open'
        );

        sidebar.classList.remove(
            'sidebar-open'
        );

    }


    if (overlay) {

        overlay.classList.remove(
            'visible'
        );

        overlay.classList.remove(
            'show'
        );

        overlay.setAttribute(
            'aria-hidden',
            'true'
        );

    }


    if (button) {

        button.setAttribute(
            'aria-expanded',
            'false'
        );

        button.setAttribute(
            'aria-label',
            'Open navigation menu'
        );

        button.textContent =
            '☰';

    }

}


/* =========================================================
   DESKTOP / TABLET RESIZE
   ========================================================= */

window.addEventListener(
    'resize',
    () => {

        /*
         * Do not force the sidebar closed on resize.
         * The menu remains usable across screen sizes.
         */

    }
);


/* =========================================================
   SHOW TOAST
   ========================================================= */

function showToast(
    message,
    type = 'success'
) {

    const root =
        document.querySelector(
            '#toastRoot'
        ) ||
        document.body;


    const toast =
        document.createElement(
            'div'
        );


    toast.className =
        `toast toast-${type}`;


    toast.textContent =
        message;


    root.appendChild(
        toast
    );


    requestAnimationFrame(
        () => {

            toast.classList.add(
                'show'
            );

        }
    );


    setTimeout(
        () => {

            toast.classList.remove(
                'show'
            );


            setTimeout(
                () => {

                    toast.remove();

                },
                250
            );

        },
        3200
    );

}


/* =========================================================
   BUTTON LOADING
   ========================================================= */

function setButtonLoading(
    button,
    loading,
    text = ''
) {

    if (!button) {
        return;
    }


    if (loading) {

        button.dataset.originalText =
            button.textContent;


        button.disabled =
            true;


        button.textContent =
            text ||
            'Saving...';

    } else {

        button.disabled =
            false;


        button.textContent =
            button.dataset.originalText ||
            button.textContent;


        delete button.dataset.originalText;

    }

}


/* =========================================================
   FORMAT DATE
   ========================================================= */

function formatDate(
    value
) {

    if (!value) {
        return '—';
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

        return '—';

    }


    return new Intl.DateTimeFormat(
        'en-PH',
        {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
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


/* =========================================================
   STATUS BADGE
   ========================================================= */

function statusBadge(
    status
) {

    const normalized =
        String(
            status || ''
        )
            .toLowerCase()
            .replaceAll(
                ' ',
                '-'
            );


    return `
        <span
            class="status-badge status-${normalized}"
        >
            ${escapeHtml(
                status ||
                'Unknown'
            )}
        </span>
    `;

}


/* =========================================================
   LOAD USER PROFILE
   ========================================================= */

async function loadUserProfile() {

    try {

        if (
            !window.rmsSupabase
        ) {

            console.warn(
                'Supabase client is unavailable.'
            );

            return null;

        }


        const {
            data: authData,
            error: authError
        } =
            await window.rmsSupabase
                .auth
                .getUser();


        if (authError) {

            console.warn(
                'Unable to get authenticated user:',
                authError.message
            );

            return null;

        }


        const user =
            authData?.user;


        if (!user) {
            return null;
        }


        const {
            data: profile,
            error: profileError
        } =
            await window.rmsSupabase
                .from('users')
                .select(
                    'username, role, status'
                )
                .eq(
                    'user_id',
                    user.id
                )
                .maybeSingle();


        if (profileError) {

            console.warn(
                'Unable to load user profile:',
                profileError.message
            );

        }


        const username =
            profile?.username ||
            user.email
                ?.split('@')[0] ||
            'User';


        const role =
            profile?.role ||
            'User';


        document
            .querySelectorAll(
                '#sidebarUsername'
            )
            .forEach(
                element => {

                    element.textContent =
                        username;

                }
            );


        document
            .querySelectorAll(
                '#sidebarRole'
            )
            .forEach(
                element => {

                    element.textContent =
                        role;

                }
            );


        document
            .querySelectorAll(
                '#sidebarAvatar, #topbarAvatar'
            )
            .forEach(
                element => {

                    element.textContent =
                        username
                            .charAt(0)
                            .toUpperCase();

                }
            );


        return (
            profile || {
                username,
                role
            }
        );


    } catch (error) {

        console.warn(
            'User profile error:',
            error
        );

        return null;

    }

}