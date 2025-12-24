import type { Session, User } from "better-auth";

export type AuthVariables = {
	user: User;
	session: Session;
};

export type App = {
	Bindings: CloudflareBindings;
	Variables: AuthVariables;
};
