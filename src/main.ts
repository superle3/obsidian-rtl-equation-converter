import type {} from "@quartz-community/remark-obsidian";
import remarkObsidian from "@quartz-community/remark-obsidian";
import type { Root } from "mdast";
import type {} from "mdast-util-math";
import { Plugin, type TFile, type Vault } from "obsidian";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkStringify from "remark-stringify";
import { unified } from "unified";
import { visit } from "unist-util-visit";

export default class RTLConvertPlugin extends Plugin {
	converter!: EquationConverter;

	async onload() {
		this.app.workspace.onLayoutReady(async () => {
			this.converter = new EquationConverter();

			this.addCommand({
				id: "convert-all-equations",
				name: "Convert all equations",
				callback: async () => {
					for (const files of this.app.vault.getMarkdownFiles()) {
						await this.converter.convertFile(files, this.app.vault);
					}
				},
			});
			this.addCommand({
				id: "convert-current-file",
				name: "Convert current file",
				callback: () => {
					const activeFile = this.app.workspace.getActiveFile();
					if (activeFile) {
						void this.converter.convertFile(activeFile, this.app.vault);
					}
				},
			});
		});
	}

	onunload() {}
}

const remarkPlugin = () => (tree: Root) =>
	visit(tree, (node) => {
		if (!(node.type === "math" || node.type === "inlineMath")) {
			return;
		}
		if (node.type === "inlineMath") {
			if (node.value.startsWith("{}") && node.value.endsWith("{}")) {
				node.value = node.value.slice(2, -2);
			}
		}
		if (node.value.startsWith("{") && node.value.endsWith("}")) {
			return;
		}
		node.value = `{${node.value}}`;
	});

class EquationConverter {
	parser = unified()
		.use(remarkParse)
		.use(remarkGfm)
		.use(remarkObsidian)
		.use(remarkPlugin)
		.use(remarkPlugin)
		.use(remarkStringify);

	async convertFile(file: TFile, vault: Vault) {
		const content = await vault.read(file);
		const tree = await this.parser.process(content);
		await vault.modify(file, tree.toString());
	}
}
