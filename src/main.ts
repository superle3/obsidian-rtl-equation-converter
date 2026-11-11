import type {} from "@quartz-community/remark-obsidian";
import remarkObsidian from "@quartz-community/remark-obsidian";
import type { Root } from "mdast";
import type {} from "mdast-util-math";
import { Notice, Plugin, Setting, type TFile, type Vault } from "obsidian";
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
					const fragment = new DocumentFragment();
					const notice = new Notice(fragment, 10e10);
					const files = this.app.vault.getMarkdownFiles();
					const div = notice.messageEl.createDiv();
					notice.messageEl.createDiv({
						text: `Converting ${files.length} files...`,
					});
					new Setting(div).addProgressBar(async (progress) => {
						progress.setValue(0);

						for (const [i, file] of files.entries()) {
							await this.converter.convertFile(file, this.app.vault);
							console.debug(`Converted ${file.path}`);
							progress.setValue(((i + 1) / files.length) * 100);
						}
						notice.hide();
					});
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
