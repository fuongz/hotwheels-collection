import { drizzle } from "drizzle-orm/d1";

function formatLog(log: string) {
	const logArr = log.split(" ");
	const queryType = logArr[0];
	let logString = "";
	switch (queryType) {
		case "select": {
			const tableName = log.split(" from ")[1].split(" ")[0];
			logString = `${logArr[1].startsWith("count(") ? "COUNT" : "SELECT"} table: ${tableName}`;
			break;
		}
		case "insert": {
			const tableName = log.split(" into ")[1].split(" ")[0];
			logString = `INSERT table: ${tableName}`;
			break;
		}
		case "update": {
			const tableName = log.split(" ")[1];
			logString = `UPDATE table: ${tableName}`;
			break;
		}
		case "delete": {
			const tableName = log.split(" ")[2];
			logString = `DELETE tableName: ${tableName}`;
			break;
		}
		default:
			logString = `[QUERY] ${log}`;
			break;
	}

	return `----> LOG [SQL] ${logString}`;
}
export const dbClient = (db: D1Database) => {
	return drizzle(db, {
		logger: {
			logQuery: (log) => {
				console.log(formatLog(log));
			},
		},
	});
};
