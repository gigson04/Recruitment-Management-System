let applicants = [];
let editingId = null;

document.addEventListener("DOMContentLoaded", init);

async function init() {
    renderShell({ active: "Applicants" });

    const session = await requireAuth();

    if (!session) return;

    setupEvents();

    loadUserProfile().catch(console.warn);

    await loadApplicants();
}

/* =========================================================
   EVENTS
   ========================================================= */

function setupEvents() {
    document.getElementById("openApplicantModal")
        ?.addEventListener("click", () => openForm());

    document.getElementById("closeApplicantModal")
        ?.addEventListener("click", closeForm);

    document.getElementById("cancelApplicantModal")
        ?.addEventListener("click", closeForm);

    document.getElementById("applicantForm")
        ?.addEventListener("submit", saveApplicant);

    document.getElementById("applicantSearch")
        ?.addEventListener("input", renderApplicants);

    document.getElementById("applicantStatusFilter")
        ?.addEventListener("change", renderApplicants);

    document.getElementById("applicantsTable")
        ?.addEventListener("click", handleAction);

    document.getElementById("closeViewApplicant")
        ?.addEventListener("click", closeView);

    document.getElementById("closeViewApplicantBottom")
        ?.addEventListener("click", closeView);

    document.getElementById("resumeFile")
        ?.addEventListener("change", handleResumeSelection);

    document.querySelectorAll(".modal-backdrop").forEach(modal => {
        modal.addEventListener("click", event => {
            if (event.target === modal) {
                toggleModal(modal.id, false);
            }
        });
    });

    document.addEventListener("keydown", event => {
        if (event.key !== "Escape") return;

        document.querySelectorAll(".modal-backdrop.open")
            .forEach(modal => {
                toggleModal(modal.id, false);
            });
    });
}

/* =========================================================
   LOAD APPLICANTS
   ========================================================= */

async function loadApplicants() {
    const table = document.getElementById("applicantsTable");

    if (!table) return;

    table.innerHTML = `
        <tr>
            <td colspan="7" class="table-empty">
                Loading applicants...
            </td>
        </tr>
    `;

    try {
        const { data, error } = await window.rmsSupabase
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
            .order("last_name", { ascending: true });

        if (error) throw error;

        applicants = data || [];

        renderApplicants();

    } catch (error) {
        console.error("Load applicants error:", error);

        table.innerHTML = `
            <tr>
                <td colspan="7" class="table-empty">
                    Unable to load applicants.
                </td>
            </tr>
        `;
    }
}

/* =========================================================
   RENDER APPLICANTS
   ========================================================= */

function renderApplicants() {
    const table = document.getElementById("applicantsTable");

    if (!table) return;

    const search =
        document.getElementById("applicantSearch")
            ?.value
            .trim()
            .toLowerCase() || "";

    const status =
        document.getElementById("applicantStatusFilter")
            ?.value || "";

    const filtered = applicants.filter(applicant => {
        const name =
            `${applicant.first_name || ""} ${applicant.last_name || ""}`
                .trim()
                .toLowerCase();

        const applicantNo =
            String(applicant.applicant_no || "").toLowerCase();

        const email =
            String(applicant.email || "").toLowerCase();

        const matchesSearch =
            !search ||
            applicantNo.includes(search) ||
            name.includes(search) ||
            email.includes(search);

        const matchesStatus =
            !status ||
            applicant.status === status;

        return matchesSearch && matchesStatus;
    });

    if (!filtered.length) {
        table.innerHTML = `
            <tr>
                <td colspan="7" class="table-empty">
                    No applicants found.
                </td>
            </tr>
        `;

        return;
    }

    table.innerHTML = filtered.map(applicant => {
        const fullName =
            `${applicant.first_name || ""} ${applicant.last_name || ""}`
                .trim();

        return `
            <tr>
                <td>
                    <strong>
                        ${escapeHtml(applicant.applicant_no || "")}
                    </strong>
                </td>

                <td>
                    ${escapeHtml(fullName)}
                </td>

                <td>
                    ${escapeHtml(applicant.email || "")}
                </td>

                <td>
                    ${escapeHtml(applicant.contact_no || "")}
                </td>

                <td>
                    ${escapeHtml(applicant.education || "")}
                </td>

                <td>
                    ${statusBadge(applicant.status || "")}
                </td>

                <td>
                    <div class="table-actions">

                        <button
                            type="button"
                            class="table-action"
                            data-action="view"
                            data-id="${applicant.applicant_id}"
                        >
                            View
                        </button>

                        <button
                            type="button"
                            class="table-action"
                            data-action="edit"
                            data-id="${applicant.applicant_id}"
                        >
                            Edit
                        </button>

                    </div>
                </td>
            </tr>
        `;
    }).join("");
}

/* =========================================================
   OPEN FORM
   ========================================================= */

function openForm(applicant = null) {
    const form = document.getElementById("applicantForm");

    if (!form) return;

    form.reset();

    editingId =
        applicant?.applicant_id || null;

    const title =
        document.getElementById("applicantModalTitle");

    if (title) {
        title.textContent =
            applicant
                ? "Edit Applicant"
                : "Add Applicant";
    }

    const errorBox =
        document.getElementById("applicantFormError");

    if (errorBox) {
        errorBox.textContent = "";
    }

    const currentResume =
        document.getElementById("currentResume");

    if (currentResume) {
        currentResume.innerHTML = "";
    }

    if (applicant) {

        setValue(
            "applicantId",
            applicant.applicant_id
        );

        setValue(
            "applicantNo",
            applicant.applicant_no
        );

        setValue(
            "firstName",
            applicant.first_name
        );

        setValue(
            "lastName",
            applicant.last_name
        );

        setValue(
            "email",
            applicant.email
        );

        setValue(
            "contactNo",
            applicant.contact_no
        );

        setValue(
            "address",
            applicant.address
        );

        setValue(
            "education",
            applicant.education
        );

        setValue(
            "experience",
            applicant.experience
        );

        setValue(
            "skills",
            applicant.skills
        );

        setValue(
            "applicantStatus",
            applicant.status
        );

        if (
            currentResume &&
            applicant.resume_file
        ) {
            currentResume.innerHTML = `
                Current resume:
                <strong>
                    ${escapeHtml(applicant.resume_file)}
                </strong>
            `;
        }

    } else {

        setValue(
            "applicantStatus",
            "Active"
        );

        setValue(
            "applicantNo",
            nextApplicantNumber()
        );
    }

    toggleModal(
        "applicantModal",
        true
    );
}

/* =========================================================
   CLOSE FORM
   ========================================================= */

function closeForm() {
    toggleModal(
        "applicantModal",
        false
    );
}

/* =========================================================
   RESUME SELECTION
   ========================================================= */

function handleResumeSelection() {
    const input =
        document.getElementById("resumeFile");

    if (!input?.files?.length) {
        return;
    }

    const file = input.files[0];

    const errorBox =
        document.getElementById("applicantFormError");

    if (errorBox) {
        errorBox.textContent = "";
    }

    const error =
        validateResumeFile(file);

    if (error) {
        input.value = "";

        if (errorBox) {
            errorBox.textContent = error;
        }

        return;
    }

    showToast(
        `Selected resume: ${file.name}`
    );
}

/* =========================================================
   SAVE APPLICANT
   ========================================================= */

async function saveApplicant(event) {
    event.preventDefault();

    const errorBox =
        document.getElementById("applicantFormError");

    if (errorBox) {
        errorBox.textContent = "";
    }

    const applicant = {
        applicant_no:
            value("applicantNo").toUpperCase(),

        first_name:
            value("firstName"),

        last_name:
            value("lastName"),

        email:
            value("email").toLowerCase(),

        contact_no:
            value("contactNo"),

        address:
            value("address"),

        education:
            value("education"),

        experience:
            value("experience"),

        skills:
            value("skills"),

        status:
            value("applicantStatus")
    };

    const validationError =
        validateApplicant(applicant);

    if (validationError) {

        if (errorBox) {
            errorBox.textContent =
                validationError;
        }

        return;
    }

    const resumeInput =
        document.getElementById("resumeFile");

    const selectedResume =
        resumeInput?.files?.[0] || null;

    if (selectedResume) {

        const resumeError =
            validateResumeFile(selectedResume);

        if (resumeError) {

            if (errorBox) {
                errorBox.textContent =
                    resumeError;
            }

            return;
        }

        /*
         * Lab 6:
         * Store the selected resume filename.
         * No resume preview is used.
         */

        applicant.resume_file =
            selectedResume.name;

    } else {

        /*
         * Keep the existing resume when editing.
         */

        const existing =
            applicants.find(
                a =>
                    String(a.applicant_id) ===
                    String(editingId)
            );

        applicant.resume_file =
            existing?.resume_file || null;
    }

    /* =====================================================
       DUPLICATE APPLICANT NUMBER
       ===================================================== */

    try {

        const { data, error } =
            await window.rmsSupabase
                .from("applicants")
                .select("applicant_id")
                .eq(
                    "applicant_no",
                    applicant.applicant_no
                )
                .maybeSingle();

        if (error) {
            throw error;
        }

        if (
            data &&
            String(data.applicant_id) !==
            String(editingId)
        ) {

            if (errorBox) {
                errorBox.textContent =
                    "This applicant number already exists.";
            }

            return;
        }

    } catch (error) {

        console.error(
            "Duplicate check error:",
            error
        );

        if (errorBox) {
            errorBox.textContent =
                "Unable to check applicant number.";
        }

        return;
    }

    const button =
        document.getElementById(
            "saveApplicantButton"
        );

    setButtonLoading(
        button,
        true,
        editingId
            ? "Updating..."
            : "Saving..."
    );

    try {

        let result;

        if (editingId) {

            result =
                await window.rmsSupabase
                    .from("applicants")
                    .update(applicant)
                    .eq(
                        "applicant_id",
                        editingId
                    );

        } else {

            result =
                await window.rmsSupabase
                    .from("applicants")
                    .insert([applicant]);
        }

        if (result.error) {
            throw result.error;
        }

        closeForm();

        showToast(
            editingId
                ? "Applicant updated successfully."
                : "Applicant registered successfully."
        );

        await loadApplicants();

    } catch (error) {

        console.error(
            "Save applicant error:",
            error
        );

        if (errorBox) {
            errorBox.textContent =
                "Unable to save applicant.";
        }

    } finally {

        setButtonLoading(
            button,
            false
        );
    }
}

/* =========================================================
   APPLICANT VALIDATION
   ========================================================= */

function validateApplicant(applicant) {

    if (
        !applicant.applicant_no ||
        !applicant.first_name ||
        !applicant.last_name ||
        !applicant.email ||
        !applicant.contact_no ||
        !applicant.address ||
        !applicant.education ||
        !applicant.experience ||
        !applicant.status
    ) {
        return "Please complete all required information.";
    }

    if (
        !/^[A-Z0-9-]+$/.test(
            applicant.applicant_no
        )
    ) {
        return "Applicant number may only contain letters, numbers, and hyphens.";
    }

    if (
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
            applicant.email
        )
    ) {
        return "Please enter a valid email address.";
    }

    if (
        !/^(09\d{9}|\+639\d{9})$/.test(
            applicant.contact_no
        )
    ) {
        return "Please enter a valid Philippine contact number.";
    }

    return "";
}

/* =========================================================
   RESUME VALIDATION
   ========================================================= */

function validateResumeFile(file) {

    if (!file) {
        return "";
    }

    const maxSize =
        5 * 1024 * 1024;

    const isPdf =
        file.type === "application/pdf" ||
        file.name
            .toLowerCase()
            .endsWith(".pdf");

    if (!isPdf) {
        return "Resume must be a PDF file.";
    }

    if (file.size > maxSize) {
        return "Resume file must not exceed 5 MB.";
    }

    return "";
}

/* =========================================================
   TABLE ACTIONS
   ========================================================= */

function handleAction(event) {

    const button =
        event.target.closest(
            "[data-action]"
        );

    if (!button) {
        return;
    }

    const applicant =
        applicants.find(
            a =>
                String(a.applicant_id) ===
                String(button.dataset.id)
        );

    if (!applicant) {
        return;
    }

    if (
        button.dataset.action === "edit"
    ) {
        openForm(applicant);
        return;
    }

    if (
        button.dataset.action === "view"
    ) {
        openView(applicant);
    }
}

/* =========================================================
   VIEW APPLICANT
   ========================================================= */

function openView(applicant) {

    const name =
        `${applicant.first_name || ""} ${applicant.last_name || ""}`
            .trim();

    const title =
        document.getElementById(
            "viewApplicantTitle"
        );

    const body =
        document.getElementById(
            "viewApplicantBody"
        );

    if (!title || !body) {
        return;
    }

    title.textContent =
        name || "Applicant Profile";

    const resumeHtml =
        applicant.resume_file
            ? `
                <span>
                    ${escapeHtml(applicant.resume_file)}
                </span>
            `
            : `
                <span class="muted">
                    No resume uploaded
                </span>
            `;

    /*
     * IMPORTANT:
     * viewApplicantBody already has class="profile-grid"
     * in applicants.html.
     *
     * Therefore, do NOT create another profile-grid here.
     */

    body.innerHTML = `

        <div class="profile-item">
            <small>Applicant No.</small>

            <div>
                ${escapeHtml(
                    applicant.applicant_no || ""
                )}
            </div>
        </div>

        <div class="profile-item">
            <small>Status</small>

            <div>
                ${statusBadge(
                    applicant.status || ""
                )}
            </div>
        </div>

        <div class="profile-item">
            <small>First Name</small>

            <div>
                ${escapeHtml(
                    applicant.first_name || ""
                )}
            </div>
        </div>

        <div class="profile-item">
            <small>Last Name</small>

            <div>
                ${escapeHtml(
                    applicant.last_name || ""
                )}
            </div>
        </div>

        <div class="profile-item">
            <small>Email</small>

            <div>
                ${escapeHtml(
                    applicant.email || ""
                )}
            </div>
        </div>

        <div class="profile-item">
            <small>Contact No.</small>

            <div>
                ${escapeHtml(
                    applicant.contact_no || ""
                )}
            </div>
        </div>

        <div class="profile-item profile-item-full">
            <small>Address</small>

            <div>
                ${escapeHtml(
                    applicant.address || ""
                )}
            </div>
        </div>

        <div class="profile-item profile-item-full">
            <small>Education</small>

            <div>
                ${escapeHtml(
                    applicant.education || ""
                )}
            </div>
        </div>

        <div class="profile-item profile-item-full">
            <small>Work Experience</small>

            <div>
                ${escapeHtml(
                    applicant.experience || ""
                )}
            </div>
        </div>

        <div class="profile-item profile-item-full">
            <small>Skills</small>

            <div>
                ${escapeHtml(
                    applicant.skills ||
                    "Not provided"
                )}
            </div>
        </div>

        <div class="profile-item profile-item-full">
            <small>Resume</small>

            <div>
                ${resumeHtml}
            </div>
        </div>
    `;

    toggleModal(
        "viewApplicantModal",
        true
    );
}

/* =========================================================
   CLOSE VIEW
   ========================================================= */

function closeView() {
    toggleModal(
        "viewApplicantModal",
        false
    );
}

/* =========================================================
   MODAL
   ========================================================= */

function toggleModal(id, open) {

    const modal =
        document.getElementById(id);

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

function value(id) {

    const element =
        document.getElementById(id);

    return element
        ? element.value.trim()
        : "";
}

function setValue(id, newValue) {

    const element =
        document.getElementById(id);

    if (!element) {
        return;
    }

    element.value =
        newValue ?? "";
}

/* =========================================================
   NEXT APPLICANT NUMBER
   ========================================================= */

function nextApplicantNumber() {

    const numbers =
        applicants.map(applicant => {

            const match =
                String(
                    applicant.applicant_no || ""
                ).match(/\d+$/);

            return match
                ? Number(match[0])
                : 0;
        });

    const next =
        Math.max(0, ...numbers) + 1;

    return `APP-${String(next).padStart(3, "0")}`;
}