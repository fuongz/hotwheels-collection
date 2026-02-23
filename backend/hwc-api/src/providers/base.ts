import { parse } from "parse5";
import type { Parse5Node } from ".";

export class HTMLParser {
	private node: Parse5Node;

	constructor(html: string) {
		this.node = parse(html) as Parse5Node;
	}

	private isElement(node: Parse5Node): boolean {
		return node.nodeName !== "#text" && node.nodeName !== "#comment";
	}

	public findElementsByTagName(
		tag: string,
		node?: Parse5Node,
		scanChildren = false,
	): Parse5Node[] {
		const results: Parse5Node[] = [];
		let children = [];
		if (node) {
			children = node.childNodes || [];
		} else {
			children = this.node.childNodes || [];
		}
		for (const child of children) {
			if (this.isElement(child) && child.nodeName === tag) {
				results.push(child);
			}
			if (
				scanChildren &&
				this.isElement(child) &&
				child.childNodes &&
				child.childNodes.length > 0
			) {
				results.push(...this.findElementsByTagName(tag, child));
			}
		}
		return results;
	}

	public findElementsBySelector(
		selector: string,
		node?: Parse5Node,
	): Parse5Node[] {
		const parts = selector
			.split(">")
			.map((part) => part.trim())
			.filter((part) => part.length > 0);

		if (parts.length === 0) return [];

		// Start from root
		let currentNodes = node?.childNodes || this.node.childNodes;

		if (!currentNodes) return [];

		// Process each part of the selector
		for (const part of parts) {
			const nextNodes: Parse5Node[] = [];

			for (const currentNode of currentNodes) {
				const matches = this.matchSelector(part, currentNode);
				nextNodes.push(...matches);
			}

			currentNodes = nextNodes;
			if (currentNodes.length === 0) break;
		}

		return currentNodes;
	}

	private matchSelector(
		selector: string,
		parentNode: Parse5Node,
	): Parse5Node[] {
		const results: Parse5Node[] = [];

		const traverse = (node: Parse5Node, directChildOnly: boolean) => {
			const children = node.childNodes || [];

			for (const child of children) {
				if (!this.isElement(child)) continue;

				if (this.nodeMatchesSelector(child, selector)) {
					results.push(child);
				}

				// Continue traversing if not direct child only
				if (!directChildOnly) {
					traverse(child, false);
				}
			}
		};

		// For direct child combinator, only check immediate children
		traverse(parentNode, true);

		return results;
	}

	private nodeMatchesSelector(node: Parse5Node, selector: string): boolean {
		// Handle ID selector (#id)
		if (selector.startsWith("#")) {
			const id = selector.slice(1);
			const attrs = node.attrs || [];
			console.log(
				"S:",
				attrs.some((attr) => attr.name === "id" && attr.value === id),
			);

			return attrs.some((attr) => attr.name === "id" && attr.value === id);
		}

		// Handle class selector (.class)
		if (selector.startsWith(".")) {
			const className = selector.slice(1);
			const attrs = node.attrs || [];
			const classAttr = attrs.find((attr) => attr.name === "class");
			if (!classAttr) return false;
			const classes = classAttr.value.split(/\s+/);
			return classes.includes(className);
		}

		// Handle attribute selector [attr=value] or [attr]
		if (selector.includes("[")) {
			const match = selector.match(/^(\w+)?\[([^\]]+)\]$/);
			if (match) {
				const [, tag, attrPart] = match;
				if (tag && node.nodeName !== tag) return false;

				const attrMatch = attrPart.match(/^(\w+)(?:=["']?([^"']*)["']?)?$/);
				if (attrMatch) {
					const [, attrName, attrValue] = attrMatch;
					const attrs = node.attrs || [];
					return attrs.some(
						(attr) =>
							attr.name === attrName &&
							(attrValue === undefined || attr.value === attrValue),
					);
				}
			}
			return false;
		}

		// Handle tag selector (div, img, etc.)
		return node.nodeName === selector;
	}

	public findElementsByClass(className: string): Parse5Node[] {
		if (className === "") return [];
		if (className.startsWith(".")) {
			className = className.slice(1);
		}
		const results: Parse5Node[] = [];
		const traverse = (currentNode: Parse5Node) => {
			if (this.isElement(currentNode)) {
				const attrs = currentNode.attrs || [];
				const classAttr = attrs.find((attr) => attr.name === "class");
				if (classAttr) {
					const classes = classAttr.value.split(/\s+/);
					if (classes.includes(className)) {
						results.push(currentNode);
					}
				}
			}
			const children = currentNode.childNodes || [];
			for (const child of children) {
				if (this.isElement(child)) {
					traverse(child);
				}
			}
		};

		traverse(this.node);
		return results;
	}

	public findElementsByDataAttribute(
		tag: string,
		attribute: string,
		value: string,
	): Parse5Node[] {
		const results: Parse5Node[] = [];

		const traverse = (currentNode: Parse5Node) => {
			if (this.isElement(currentNode) && currentNode.nodeName === tag) {
				const attrs = currentNode.attrs || [];
				for (const attr of attrs) {
					if (attr.name === attribute && attr.value === value) {
						results.push(currentNode);
					}
				}
			}

			const children = currentNode.childNodes || [];
			for (const child of children) {
				if (this.isElement(child)) {
					traverse(child);
				}
			}
		};

		traverse(this.node);
		return results;
	}

	private serializeNode(node: Parse5Node): any {
		return {
			nodeName: node.nodeName,
			attrs: node.attrs || [],
			childNodes: (node.childNodes || []).map((child) => {
				if (child.nodeName === "#text") {
					return {
						nodeName: "#text",
						value: (child as any).value || "",
					};
				}
				return this.serializeNode(child);
			}),
		};
	}

	public getAttribute(node: Parse5Node, attribute: string): string {
		const attrs = node.attrs || [];
		const attr = attrs.find((attr) => attr.name === attribute);
		return attr?.value || "";
	}

	public getHref(node: Parse5Node): string {
		const attrs = node.attrs || [];
		const hrefAttr = attrs.find((attr) => attr.name === "href");
		return hrefAttr?.value || "";
	}

	public getSrc(node: Parse5Node): string {
		const attrs = node.attrs || [];
		const srcAttr = attrs.find((attr) => attr.name === "src");
		return srcAttr?.value || "";
	}

	public getTextContent(node: Parse5Node): string {
		let n = [];
		if (node) {
			n = node.childNodes || [];
		} else {
			n = this.node.childNodes || [];
		}
		return n
			.map((child) => {
				if (child.nodeName === "#text") {
					return (child as any).value || "";
				}
				return this.getTextContent(child);
			})
			.join("");
	}

	/**
	 * Find the next sibling element of a given node
	 * @param node - The current node
	 * @param parentNode - The parent containing the sibling nodes
	 * @returns The next sibling element or null if none exists
	 */
	public getNextSibling(
		node: Parse5Node,
		parentNode: Parse5Node,
	): Parse5Node | null {
		const siblings = parentNode.childNodes || [];
		const currentIndex = siblings.indexOf(node);

		if (currentIndex === -1) return null;

		// Find next element (skip text and comment nodes)
		for (let i = currentIndex + 1; i < siblings.length; i++) {
			if (this.isElement(siblings[i])) {
				return siblings[i];
			}
		}

		return null;
	}

	/**
	 * Collect all sibling elements between a start node and the next occurrence of a tag
	 * @param startNode - The starting marker element
	 * @param endTagName - Tag name to stop at (e.g., "h2")
	 * @param parentNode - The parent node containing these siblings
	 * @returns Array of nodes between the markers
	 */
	public getElementsBetweenSiblings(
		startNode: Parse5Node,
		endTagName: string,
		parentNode: Parse5Node,
	): Parse5Node[] {
		const results: Parse5Node[] = [];
		const siblings = parentNode.childNodes || [];
		const startIndex = siblings.indexOf(startNode);

		if (startIndex === -1) return results;

		// Collect siblings until we hit the end tag
		for (let i = startIndex + 1; i < siblings.length; i++) {
			const sibling = siblings[i];

			// Skip non-element nodes
			if (!this.isElement(sibling)) continue;

			// Stop if we hit the end marker
			if (sibling.nodeName === endTagName) break;

			results.push(sibling);
		}

		return results;
	}

	/**
	 * Find div elements between first and second h2 headers in a container
	 * @param containerSelector - CSS selector for the container (e.g., ".mw-content-ltr")
	 * @param startHeaderTag - Header tag to use as markers (default "h2")
	 * @param targetDivTag - Tag to collect between headers (default "div")
	 * @returns Array of div nodes found between headers
	 */
	public findContentBetweenHeaders(
		containerSelector: string,
		startHeaderTag = "h2",
		targetDivTag = "p",
	): string | null {
		// Find the main content container
		const containers = this.findElementsByClass(containerSelector);
		if (containers.length === 0) return null;
		const container = containers[0];

		// Find all header elements in the container
		const headers = this.findElementsByTagName(startHeaderTag, container);

		if (headers.length === 0) return null;

		// Get all elements between first and second header (or end of container)
		const elementsBetween = this.getElementsBetweenSiblings(
			headers[0],
			startHeaderTag,
			container,
		);

		let content = "";
		for (const element of elementsBetween) {
			if (!this.isElement(element)) continue;
			if (element.nodeName !== targetDivTag) continue;
			content += this.getTextContent(element);
		}
		return content === "" ? null : content;
	}
}
