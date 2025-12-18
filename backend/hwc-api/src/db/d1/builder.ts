import {
	asc,
	desc,
	eq,
	gt,
	gte,
	lt,
	lte,
	type SQL,
	type Table,
} from "drizzle-orm";

export function wheresBuilder<T extends Table>(
	table: T,
	query: Record<string, Array<string> | string | undefined>,
): Array<SQL | undefined> {
	const conditions: SQL[] = [];
	const tableColumns = table as Record<string, any>;

	if (!query && Object.keys(query).length === 0) {
		return conditions;
	}

	for (const key in query) {
		if (
			Object.hasOwn(query, key) &&
			Object.hasOwn(tableColumns, key) &&
			(Array.isArray(query[key]) || typeof query[key] === "string")
		) {
			const column = tableColumns[key];
			if (typeof query[key] === "string") {
				conditions.push(eq(column, query[key]));
			} else if (Array.isArray(query[key]) && query[key].length === 1) {
				conditions.push(eq(column, query[key][0]));
			} else if (Array.isArray(query[key]) && query[key].length === 2) {
				const [operator, value] = query[key];
				switch (operator) {
					case "gt":
						conditions.push(gt(column, value));
						break;
					case "gte":
						conditions.push(gte(column, value));
						break;
					case "lt":
						conditions.push(lt(column, value));
						break;
					case "lte":
						conditions.push(lte(column, value));
						break;
					case "eq":
						conditions.push(eq(column, value));
						break;
					case "in":
						if (Array.isArray(value)) {
							conditions.push(column.in(value));
						} else {
							conditions.push(column.in([value]));
						}
						break;
					case "notIn":
						if (Array.isArray(value)) {
							conditions.push(column.notIn(value));
						} else {
							conditions.push(column.notIn([value]));
						}
						break;
					case "ilike":
						conditions.push(column.ilike(value));
						break;
					case "like":
						conditions.push(column.like(value));
						break;
					case "notLike":
						conditions.push(column.notLike(value));
						break;
					default:
						conditions.push(eq(column, value));
						break;
				}
			}
		}
	}
	return conditions;
}

export function orderBuilder<T extends Table>(
	table: T,
	sortBy: string,
	sortOrder: string,
): SQL {
	const tableColumns = table as Record<string, any>;

	// Build order by clause
	const orderDirection = sortOrder === "desc" ? desc : asc;

	// Default to updatedAt if it exists, otherwise use the first column
	let orderByClause: SQL;

	if (tableColumns.updatedAt) {
		orderByClause = orderDirection(tableColumns.updatedAt);
	} else {
		// Fallback to first available column
		const firstColumn = Object.values(tableColumns)[0];
		orderByClause = orderDirection(firstColumn);
	}

	// Override with specific sortBy column if provided and exists
	if (sortBy && Object.hasOwn(tableColumns, sortBy)) {
		orderByClause = orderDirection(tableColumns[sortBy]);
	}

	return orderByClause;
}
