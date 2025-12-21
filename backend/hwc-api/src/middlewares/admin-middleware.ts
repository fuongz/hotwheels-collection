import type { Session, User } from "better-auth";
import { createMiddleware } from "hono/factory";
import { auth } from "../auth";

export type AuthVariables = {
	user: User;
	session: Session;
};

export const adminMiddleware = createMiddleware(
	async ({ env, req, set, json }, next) => {
		try {
			const session = await auth(env).api.getSession({
				headers: req.raw.headers,
			});
			if (!session) {
				throw new Error("Unauthorized");
			}
			if (!session.user || session.user.email !== "phuongthephung@gmail.com") {
				throw new Error("Unauthorized");
			}
			set("session", session);
			if (session.user) {
				set("user", session.user);
			}
			await next();
		} catch (err: any) {
			return json({ message: err.message, httpStatus: 401, status: 0 }, 401);
		}
	},
);
