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

	public findElementsByTagName(tag: string, node?: Parse5Node): Parse5Node[] {
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
		}
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
}
