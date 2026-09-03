if (!window.RMS_CONFIG) {
    throw new Error(
        "RMS_CONFIG was not loaded. Check js/config.js."
    );
}

if (
    !window.RMS_CONFIG.SUPABASE_URL ||
    !window.RMS_CONFIG.SUPABASE_ANON_KEY
) {
    throw new Error(
        "Supabase URL or key is missing in js/config.js."
    );
}

if (!window.supabase) {
    throw new Error(
        "Supabase JavaScript library was not loaded."
    );
}

window.rmsSupabase = window.supabase.createClient(
    window.RMS_CONFIG.SUPABASE_URL,
    window.RMS_CONFIG.SUPABASE_ANON_KEY
);

console.log("Supabase client initialized successfully.");