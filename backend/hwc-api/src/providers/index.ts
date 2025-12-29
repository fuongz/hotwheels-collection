export type Parse5Node = {
	nodeName: string;
	childNodes?: Parse5Node[];
	attrs?: Array<{ name: string; value: string }>;
	value?: string;
};
