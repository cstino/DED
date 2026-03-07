/**
 * Dynamically determines the base URL for the application.
 * This is used to set the 'redirectTo' parameter in Supabase auth calls,
 * ensuring that email confirmation links work correctly on different devices
 * (e.g., mobile phones on the same network).
 */
export const getURL = () => {
    // Check if we are on the client side
    if (typeof window === 'undefined') return '';

    let url =
        process.env.NEXT_PUBLIC_SITE_URL ?? // Set this for production
        window.location.origin; // Default to current origin (works for local IP)

    // Make sure to include `https://` if not present (except for localhost/dev)
    url = url.charAt(url.length - 1) === '/' ? url.slice(0, -1) : url;

    // Append /auth/callback or just return the base for redirects
    return url;
};
