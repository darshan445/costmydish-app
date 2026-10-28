export const APP_DEEP_LINK = 'costmydish://';

function getUrlParams() {
  const searchParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  return { searchParams, hashParams };
}

function getUrlError(searchParams, hashParams) {
  const message =
    searchParams.get('error_description') ||
    hashParams.get('error_description') ||
    searchParams.get('error') ||
    hashParams.get('error');

  return message ? new Error(message) : null;
}

async function sessionFromHash(supabase, hashParams) {
  const accessToken = hashParams.get('access_token');
  const refreshToken = hashParams.get('refresh_token');

  if (!accessToken || !refreshToken) {
    return null;
  }

  const { data, error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  return { session: data.session, error };
}

async function sessionFromTokenHash(supabase, searchParams) {
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type');

  if (!tokenHash || !type) {
    return null;
  }

  const { data, error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type,
  });

  return { session: data.session, error };
}

async function sessionFromCode(supabase, searchParams) {
  const code = searchParams.get('code');

  if (!code) {
    return null;
  }

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  return { session: data.session, error };
}

function waitForSession(supabase, events = ['SIGNED_IN', 'PASSWORD_RECOVERY', 'TOKEN_REFRESHED']) {
  return new Promise((resolve) => {
    const timeout = setTimeout(async () => {
      subscription.unsubscribe();
      const { data, error } = await supabase.auth.getSession();
      resolve({ session: data.session, error });
    }, 5000);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && events.includes(event)) {
        clearTimeout(timeout);
        subscription.unsubscribe();
        resolve({ session, error: null });
      }
    });
  });
}

export async function establishSessionFromUrl(supabase) {
  const { searchParams, hashParams } = getUrlParams();

  const urlError = getUrlError(searchParams, hashParams);
  if (urlError) {
    return { session: null, error: urlError };
  }

  // 1. Hash tokens — default redirect from /auth/v1/verify?token=... emails
  const fromHash = await sessionFromHash(supabase, hashParams);
  if (fromHash) {
    return fromHash;
  }

  // 2. token_hash query — custom email templates
  const fromTokenHash = await sessionFromTokenHash(supabase, searchParams);
  if (fromTokenHash) {
    return fromTokenHash;
  }

  // 3. PKCE code — only works when reset started in the same browser
  const fromCode = await sessionFromCode(supabase, searchParams);
  if (fromCode) {
    return fromCode;
  }

  // 4. Already stored, or wait for detectSessionInUrl to finish
  const { data } = await supabase.auth.getSession();
  if (data.session) {
    return { session: data.session, error: null };
  }

  return waitForSession(supabase);
}
