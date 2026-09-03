async function requireAuth() {

    try {

        if (!window.rmsSupabase) {
            throw new Error(
                "Supabase client is not initialized. Check config.js and supabase.js."
            );
        }


        const {
            data,
            error
        } = await Promise.race([

            window.rmsSupabase.auth.getSession(),

            new Promise((_, reject) => {
                setTimeout(() => {
                    reject(
                        new Error(
                            "Supabase authentication timed out."
                        )
                    );
                }, 8000);
            })

        ]);


        if (error) {

            console.error(
                "Session error:",
                error
            );

            window.location.href =
                "login.html";

            return null;
        }


        if (!data?.session) {

            console.log(
                "No active session."
            );

            window.location.href =
                "login.html";

            return null;
        }


        console.log(
            "Authenticated user:",
            data.session.user.email
        );


        return data.session;


    } catch (error) {

        console.error(
            "Authentication error:",
            error
        );


        /*
         * Don't silently fail.
         * Show the actual problem in the console.
         */
        if (
            window.location.pathname
                .includes("dashboard") ||
            window.location.pathname
                .includes("job-postings") ||
            window.location.pathname
                .includes("open-positions")
        ) {

            alert(
                error.message ||
                "Unable to connect to Supabase."
            );

        }


        return null;
    }
}


async function loginWithPassword(
    email,
    password
) {

    try {

        if (!window.rmsSupabase) {

            throw new Error(
                "Supabase client is not initialized."
            );

        }


        console.log(
            "Logging in:",
            email
        );


        const result =
            await Promise.race([

                window.rmsSupabase
                    .auth
                    .signInWithPassword({
                        email,
                        password
                    }),

                new Promise((_, reject) => {

                    setTimeout(() => {

                        reject(
                            new Error(
                                "Login request timed out. Check your Supabase connection."
                            )
                        );

                    }, 10000);

                })

            ]);


        console.log(
            "Login result:",
            result
        );


        return result;


    } catch (error) {

        console.error(
            "Login exception:",
            error
        );


        return {
            data: null,
            error: {
                message:
                    error.message ||
                    "Unable to connect to Supabase."
            }
        };

    }

}