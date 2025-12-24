import { createAuthClient } from "better-auth/react";
export const authClient = createAuthClient({
	baseURL: process.env.NEXT_PUBLIC_AUTH_URL,
});

const { signIn, signOut, signUp, useSession, listAccounts } = authClient;
export { signIn, signOut, signUp, useSession, listAccounts };
