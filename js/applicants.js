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
}

async function loadApplicants() {
    const table = document.getElementById("applicantsTable");

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
                resume_file,
                status
            `)
            .order("last_name", { ascending: true });

        if (error) throw error;

        applicants = data || [];
        renderApplicants();

    } catch (error) {
        console.error(error);

        table.innerHTML = `
            <tr>
                <td colspan="7" class="table-empty">
                    Unable to load applicants.
                </td>
            </tr>
        `;
    }
}

function renderApplicants() {
    const table = document.getElementById("applicantsTable");
    const search = document.getElementById("applicantSearch")
        ?.value.trim().toLowerCase() || "";
    const status = document.getElementById("applicantStatusFilter")
        ?.value || "";

    const filtered = applicants.filter(a => {
        const name = `${a.first_name} ${a.last_name}`.toLowerCase();

        const matchesSearch =
            !search ||
            a.applicant_no.toLowerCase().includes(search) ||
            name.includes(search) ||
            a.email.toLowerCase().includes(search);

        const matchesStatus =
            !status || a.status === status;

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

    table.innerHTML = filtered.map(a => `
        <tr>
            <td><strong>${escapeHtml(a.applicant_no)}</strong></td>

            <td>
                ${escapeHtml(
                    `${a.first_name} ${a.last_name}`
                )}
            </td>

            <td>${escapeHtml(a.email)}</td>

            <td>${escapeHtml(a.contact_no)}</td>

            <td>${escapeHtml(a.education)}</td>

            <td>${statusBadge(a.status)}</td>

            <td>
                <div class="table-actions">
                    <button
                        class="table-action"
                        data-action="view"
                        data-id="${a.applicant_id}">
                        View
                    </button>

                    <button
                        class="table-action"
                        data-action="edit"
                        data-id="${a.applicant_id}">
                        Edit
                    </button>
                </div>
            </td>
        </tr>
    `).join("");
}

function openForm(applicant = null) {
    const form = document.getElementById("applicantForm");
    form.reset();

    editingId = applicant?.applicant_id || null;

    document.getElementById("applicantModalTitle").textContent =
        applicant ? "Edit Applicant" : "Add Applicant";

    document.getElementById("applicantFormError").textContent = "";

    if (applicant) {
        setValue("applicantId", applicant.applicant_id);
        setValue("applicantNo", applicant.applicant_no);
        setValue("firstName", applicant.first_name);
        setValue("lastName", applicant.last_name);
        setValue("email", applicant.email);
        setValue("contactNo", applicant.contact_no);
        setValue("address", applicant.address);
        setValue("education", applicant.education);
        setValue("experience", applicant.experience);
        setValue("applicantStatus", applicant.status);
    } else {
        setValue("applicantStatus", "Active");
        setValue("applicantNo", nextApplicantNumber());
    }

    toggleModal("applicantModal", true);
}

function closeForm() {
    toggleModal("applicantModal", false);
}

async function saveApplicant(event) {
    event.preventDefault();

    const errorBox = document.getElementById(
        "applicantFormError"
    );

    errorBox.textContent = "";

    const applicant = {
        applicant_no: value("applicantNo").toUpperCase(),
        first_name: value("firstName"),
        last_name: value("lastName"),
        email: value("email").toLowerCase(),
        contact_no: value("contactNo"),
        address: value("address"),
        education: value("education"),
        experience: value("experience"),
        status: value("applicantStatus")
    };

    const validationError = validateApplicant(applicant);

    if (validationError) {
        errorBox.textContent = validationError;
        return;
    }

    const duplicateQuery = await window.rmsSupabase
        .from("applicants")
        .select("applicant_id")
        .eq("applicant_no", applicant.applicant_no)
        .maybeSingle();

    if (duplicateQuery.error) {
        errorBox.textContent =
            "Unable to check applicant number.";
        return;
    }

    if (
        duplicateQuery.data &&
        duplicateQuery.data.applicant_id !== editingId
    ) {
        errorBox.textContent =
            "This applicant number already exists.";
        return;
    }

    const button =
        document.getElementById("saveApplicantButton");

    setButtonLoading(button, true, "Saving...");

    try {
        const result = editingId
            ? await window.rmsSupabase
                .from("applicants")
                .update(applicant)
                .eq("applicant_id", editingId)

            : await window.rmsSupabase
                .from("applicants")
                .insert(applicant);

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
        console.error(error);
        errorBox.textContent =
            "Unable to save applicant.";
    } finally {
        setButtonLoading(button, false);
    }
}

function validateApplicant(a) {
    if (
        !a.applicant_no ||
        !a.first_name ||
        !a.last_name ||
        !a.email ||
        !a.contact_no ||
        !a.address ||
        !a.education ||
        !a.experience
    ) {
        return "Please complete all required information.";
    }

    if (!/^[A-Z0-9-]+$/.test(a.applicant_no)) {
        return "Applicant number may only contain letters, numbers, and hyphens.";
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(a.email)) {
        return "Please enter a valid email address.";
    }

    if (!/^(09\d{9}|\+639\d{9})$/.test(a.contact_no)) {
        return "Please enter a valid Philippine contact number.";
    }

    return "";
}

function handleAction(event) {
    const button = event.target.closest("[data-action]");
    if (!button) return;

    const applicant = applicants.find(
        a => String(a.applicant_id) === String(button.dataset.id)
    );

    if (!applicant) return;

    if (button.dataset.action === "edit") {
        openForm(applicant);
    }

    if (button.dataset.action === "view") {
        openView(applicant);
    }
}

function openView(a) {
    const name = `${a.first_name} ${a.last_name}`;

    document.getElementById("viewApplicantTitle").textContent =
        name;

    document.getElementById("viewApplicantBody").innerHTML = `
        <div class="profile-grid">

            <div class="profile-item">
                <small>Applicant No.</small>
                <div>${escapeHtml(a.applicant_no)}</div>
            </div>

            <div class="profile-item">
                <small>Status</small>
                <div>${statusBadge(a.status)}</div>
            </div>

            <div class="profile-item">
                <small>Email</small>
                <div>${escapeHtml(a.email)}</div>
            </div>

            <div class="profile-item">
                <small>Contact No.</small>
                <div>${escapeHtml(a.contact_no)}</div>
            </div>

            <div class="profile-item">
                <small>Address</small>
                <div>${escapeHtml(a.address)}</div>
            </div>

            <div class="profile-item">
                <small>Education</small>
                <div>${escapeHtml(a.education)}</div>
            </div>

            <div class="profile-item">
                <small>Work Experience</small>
                <div>${escapeHtml(a.experience)}</div>
            </div>

        </div>
    `;

    toggleModal("viewApplicantModal", true);
}

function closeView() {
    toggleModal("viewApplicantModal", false);
}

function toggleModal(id, open) {
    const modal = document.getElementById(id);

    modal.classList.toggle("open", open);
    modal.setAttribute("aria-hidden", String(!open));
}

function value(id) {
    return document.getElementById(id).value.trim();
}

function setValue(id, value) {
    document.getElementById(id).value = value || "";
}

function nextApplicantNumber() {
    const numbers = applicants
        .map(a => Number(a.applicant_no?.match(/\d+$/)?.[0] || 0));

    const next = (Math.max(0, ...numbers) + 1)
        .toString()
        .padStart(3, "0");

    return `APP-${next}`;
}