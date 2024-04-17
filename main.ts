import { Plugin , TAbstractFile, TFolder, TFile, CachedMetadata, normalizePath, Notice, parseFrontMatterEntry, Setting, Modal } from 'obsidian'

export default class FindNonUseAssets extends Plugin {
    async onload() {
        this.addCommand({
            id: 'set-asset-folder',
            name: 'set asset folder',
            callback: async () => {
                new FloatingTabfinderModal(this.app, (assetsDir, compareNote) => {
                    this.findFiles((assetsDir), (compareNote));
                }).open();
            }
        });
    }

    onunload() {

	}

    async findFiles(assetFolderName: string, compareNote: string) {

        var linkedNames = [""];
        var attachedFilesNames = [""];
        var useList = [""];
        //var numberOfLinkedfiles = -1;
        var a = -1;
        var b = -1;

        const allFiles = this.app.vault.getFiles();
        const assetFolder = this.app.vault.getFolderByPath(assetFolderName);

        if (assetFolder != null) { 
            a = 1;
        }

        const filesMd = this.app.vault.getMarkdownFiles();
        const noteSearchID = filesMd.findIndex(compareNoteName => {
			return compareNoteName.path === compareNote;
        });
        if (noteSearchID != -1) {
            b = 1;
        }
        // Search name files.
        if (a != -1 && b != -1) {
            const content =  await this.app.vault.cachedRead(filesMd[noteSearchID]);
            const textPatternsLink = ["- ![[", "![["];   
            const contentLines = content? content.split(/\r\n|\r|\n/) : [];

            contentLines.forEach(lineText => {
                if (lineText.contains(textPatternsLink[0]) == true) {
                    const preNameLink = lineText.split(textPatternsLink[0]);
                    const postNameLink = preNameLink[1].split(".");
                    const linkName = postNameLink[0];
                    //numberOfLinkedfiles++;
                    linkedNames.push(linkName);
                }
                else if (lineText.contains(textPatternsLink[1]) == true) {
                    const preNameLink = lineText.split(textPatternsLink[1]);
                    const postNameLink = preNameLink[1].split(".");
                    const linkName = postNameLink[0];
                    //numberOfLinkedfiles++;
                    linkedNames.push(linkName);
                }
            });
            //create list of name 
            assetFolder?.children.forEach(file => {
                if (file.parent == assetFolder) {
                    attachedFilesNames.push(file.name);
                }
            });
            //create list of use attached
            assetFolder?.children.forEach(file => {
                const attachIndex = attachedFilesNames.findIndex(name => {
                    return name === file.name;
                });
                if(attachIndex != -1) {
                    const nontype = attachedFilesNames[attachIndex].split(".");
                    for(var i = 1; i<linkedNames.length; i++) {
                        if(nontype[0] == linkedNames[i]) {
                            useList.push(file.name);
                        }
                    }
                }
            });
            //select unuse
            for(var i=1; i<attachedFilesNames.length; i++) {
                const fileName = attachedFilesNames[i];
                const nonInList = useList.findIndex(name => {
                    return name === fileName; //error
                });
                if (nonInList == -1) {
                    const toDel = allFiles.findIndex(file =>{
                        return file.name === attachedFilesNames[i];
                    });
                    this.app.vault.delete(allFiles[toDel]);
                }
            }
        }
    }
}

//suggest
// ***************************************************************************************
// *    Title: obsidian-periodic-notes/suggest.ts
// *    Author: Liam Cain https://github.com/liamcain
// *    Date: 2021
// *    Code version: Latest commit 427ebb2 on 4 Feb 2021
// *    Availability: https://github.com/liamcain/obsidian-periodic-notes
// *
// ***************************************************************************************
import { App, ISuggestOwner, Scope } from 'obsidian';
import { createPopper, Instance as PopperInstance } from '@popperjs/core';

export const wrapAround = (value: number, size: number): number => {
	return ((value % size) + size) % size;
};

class Suggest<T> {
	private owner: ISuggestOwner<T>;
	private values: T[];
	private suggestions: HTMLDivElement[];
	private selectedItem: number;
	private containerEl: HTMLElement;

	constructor(owner: ISuggestOwner<T>, containerEl: HTMLElement, scope: Scope) {
		this.owner = owner;
		this.containerEl = containerEl;

		containerEl.on('click', '.suggestion-item', this.onSuggestionClick.bind(this));
		containerEl.on('mousemove', '.suggestion-item', this.onSuggestionMouseover.bind(this));

		scope.register([], 'ArrowUp', (event) => {
			if (!event.isComposing) {
				this.setSelectedItem(this.selectedItem - 1, true);
				return false;
			}
		});

		scope.register([], 'ArrowDown', (event) => {
			if (!event.isComposing) {
				this.setSelectedItem(this.selectedItem + 1, true);
				return false;
			}
		});

		scope.register([], 'Enter', (event) => {
			if (!event.isComposing) {
				this.useSelectedItem(event);
				return false;
			}
		});
	}

	onSuggestionClick(event: MouseEvent, el: HTMLDivElement): void {
		event.preventDefault();

		const item = this.suggestions.indexOf(el);
		this.setSelectedItem(item, false);
		this.useSelectedItem(event);
	}

	onSuggestionMouseover(_event: MouseEvent, el: HTMLDivElement): void {
		const item = this.suggestions.indexOf(el);
		this.setSelectedItem(item, false);
	}

	setSuggestions(values: T[]) {
		this.containerEl.empty();
		const suggestionEls: HTMLDivElement[] = [];

		values.forEach((value) => {
			const suggestionEl = this.containerEl.createDiv('suggestion-item');
			this.owner.renderSuggestion(value, suggestionEl);
			suggestionEls.push(suggestionEl);
		});

		this.values = values;
		this.suggestions = suggestionEls;
		this.setSelectedItem(0, false);
	}

	useSelectedItem(event: MouseEvent | KeyboardEvent) {
		const currentValue = this.values[this.selectedItem];
		if (currentValue) {
			this.owner.selectSuggestion(currentValue, event);
		}
	}

	setSelectedItem(selectedIndex: number, scrollIntoView: boolean) {
		const normalizedIndex = wrapAround(selectedIndex, this.suggestions.length);
		const prevSelectedSuggestion = this.suggestions[this.selectedItem];
		const selectedSuggestion = this.suggestions[normalizedIndex];

		prevSelectedSuggestion?.removeClass('is-selected');
		selectedSuggestion?.addClass('is-selected');

		this.selectedItem = normalizedIndex;

		if (scrollIntoView) {
			selectedSuggestion.scrollIntoView(false);
		}
	}
}

export abstract class TextInputSuggest<T> implements ISuggestOwner<T> {
	protected app: App;
	protected inputEl: HTMLInputElement;

	private popper: PopperInstance;
	private scope: Scope;
	private suggestEl: HTMLElement;
	private suggest: Suggest<T>;

	constructor(app: App, inputEl: HTMLInputElement) {
		this.app = app;
		this.inputEl = inputEl;
		this.scope = new Scope();

		this.suggestEl = createDiv('suggestion-container');
		const suggestion = this.suggestEl.createDiv('suggestion');
		this.suggest = new Suggest(this, suggestion, this.scope);

		this.scope.register([], 'Escape', this.close.bind(this));

		this.inputEl.addEventListener('input', this.onInputChanged.bind(this));
		this.inputEl.addEventListener('focus', this.onInputChanged.bind(this));
		this.inputEl.addEventListener('blur', this.close.bind(this));
		this.suggestEl.on('mousedown', '.suggestion-container', (event: MouseEvent) => {
			event.preventDefault();
		});
	}

	onInputChanged(): void {
		const inputStr = this.inputEl.value;
		const suggestions = this.getSuggestions(inputStr);

		if (suggestions.length > 0) {
			this.suggest.setSuggestions(suggestions);
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			this.open((<any>this.app).dom.appContainerEl, this.inputEl);
		}
	}

	open(container: HTMLElement, inputEl: HTMLElement): void {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(<any>this.app).keymap.pushScope(this.scope);

		container.appendChild(this.suggestEl);
		this.popper = createPopper(inputEl, this.suggestEl, {
			placement: 'bottom-start',
			modifiers: [
				{
					name: 'sameWidth',
					enabled: true,
					fn: ({ state, instance }) => {
						// Note: positioning needs to be calculated twice -
						// first pass - positioning it according to the width of the popper
						// second pass - position it with the width bound to the reference element
						// we need to early exit to avoid an infinite loop
						const targetWidth = `${state.rects.reference.width}px`;
						if (state.styles.popper.width === targetWidth) {
							return;
						}
						state.styles.popper.width = targetWidth;
						instance.update();
					},
					phase: 'beforeWrite',
					requires: ['computeStyles'],
				},
			],
		});
	}

	close(): void {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(<any>this.app).keymap.popScope(this.scope);

		this.suggest.setSuggestions([]);
		this.popper.destroy();
		this.suggestEl.detach();
	}

	abstract getSuggestions(inputStr: string): T[];
	abstract renderSuggestion(item: T, el: HTMLElement): void;
	abstract selectSuggestion(item: T): void;
}

//file suggest
export class FolderSuggest extends TextInputSuggest<TFolder> {
	getSuggestions(inputStr: string): TFolder[] {
		const abstractFiles = this.app.vault.getAllLoadedFiles();
		const folders: TFolder[] = [];
		const lowerCaseInputStr = inputStr.toLowerCase();

		abstractFiles.forEach((folder: TAbstractFile) => {
			if (folder instanceof TFolder && folder.path.toLowerCase().contains(lowerCaseInputStr)) {
				folders.push(folder);
			}
		});

		return folders;
	}

	renderSuggestion(file: TFolder, el: HTMLElement): void {
		el.setText(file.path);
	}

	selectSuggestion(file: TFolder): void {
		this.inputEl.value = file.path;
		this.inputEl.trigger('input');
		this.close();
	}
}

//note Suggest
 
export class FileSuggest extends TextInputSuggest<TFile> {
	getSuggestions(inputStr: string): TFile[] {
		const abstractFiles = this.app.vault.getAllLoadedFiles();
		const files: TFile[] = [];
		const lowerCaseInputStr = inputStr.toLowerCase();

		abstractFiles.forEach((file: TAbstractFile) => {
			if (
				file instanceof TFile &&
				file.extension === 'md' &&
				file.path.toLowerCase().contains(lowerCaseInputStr)
			) {
				files.push(file);
			}
		});

		return files;
	}

	renderSuggestion(file: TFile, el: HTMLElement): void {
		el.setText(file.path);
	}

	selectSuggestion(file: TFile): void {
		this.inputEl.value = file.path;
		this.inputEl.trigger('input');
		this.close();
	}
}

//utils

// Disable AutoNoteMover when "AutoNoteMover: disable" is present in the frontmatter.
export const isFmDisable = (fileCache: CachedMetadata) => {
	const fm = parseFrontMatterEntry(fileCache.frontmatter, 'AutoNoteMover');
	if (fm === 'disable') {
		return true;
	} else {
		return false;
	}
};

const folderOrFile = (app: App, path: string) => {
	const F = app.vault.getAbstractFileByPath(path);
	if (F instanceof TFile) {
		return TFile;
	} else if (F instanceof TFolder) {
		return TFolder;
	}
};

const isTFExists = (app: App, path: string, F: typeof TFile | typeof TFolder) => {
	if (folderOrFile(app, normalizePath(path)) === F) {
		return true;
	} else {
		return false;
	}
};

export const fileMove = async (app: App, settingFolder: string, fileFullName: string, file: TFile) => {
	// Does the destination folder exist?
	if (!isTFExists(app, settingFolder, TFolder)) {
		console.error(`[Auto Note Mover] The destination folder "${settingFolder}" does not exist.`);
		new Notice(`[Auto Note Mover]\n"Error: The destination folder\n"${settingFolder}"\ndoes not exist.`);
		return;
	}
	// Does the file with the same name exist in the destination folder?
	const newPath = normalizePath(settingFolder + '/' + fileFullName);
	if (isTFExists(app, newPath, TFile) && newPath !== file.path) {
		console.error(
			`[Auto Note Mover] Error: A file with the same name "${fileFullName}" exists at the destination folder.`
		);
		new Notice(
			`[Auto Note Mover]\nError: A file with the same name\n"${fileFullName}"\nexists at the destination folder.`
		);
		return;
	}
	// Is the destination folder the same path as the current folder?
	if (newPath === file.path) {
		return;
	}
	// Move file
	await app.fileManager.renameFile(file, newPath);
	console.log(`[Auto Note Mover] Moved the note "${fileFullName}" to the "${settingFolder}".`);
	new Notice(`[Auto Note Mover]\nMoved the note "${fileFullName}"\nto the "${settingFolder}".`);
};

export const arrayMove = <T>(array: T[], fromIndex: number, toIndex: number): void => {
	if (toIndex < 0 || toIndex === array.length) {
		return;
	}
	const temp = array[fromIndex];
	array[fromIndex] = array[toIndex];
	array[toIndex] = temp;
};

export const getTriggerIndicator = (trigger: string) => {
	if (trigger === 'Automatic') {
		return `[A]`;
	} else {
		return `[M]`;
	}
};

//modals
export interface FolderTagPattern {
	folder: string;
	tag: string;
	frontmatterProperty: string;
	pattern: string;
}

export interface ExcludedFolder {
	folder: string;
}

export interface AutoNoteMoverSettings {
	trigger_auto_manual: string;
	use_regex_to_check_for_tags: boolean;
	statusBar_trigger_indicator: boolean;
	folder_tag_pattern: Array<FolderTagPattern>;
	use_regex_to_check_for_excluded_folder: boolean;
	excluded_folder: Array<ExcludedFolder>;
}

export class FloatingTabfinderModal extends Modal {
    plugin: FindNonUseAssets;
    assetsDir: string;
    compareNote: string;
    sendVals: (assetsDir: string, compareNote: string) => void;

	constructor(app: App, getVals: (assetsDir: string, compareNote: string) => void) {
		super(app);
        this.sendVals = getVals;
	}
    onOpen() {
        const { contentEl } = this;
        contentEl.createEl("b", { text: "Add Folder an Note to compare."});

        new Setting(contentEl)
            .setName('Set assets folder.')
            .addSearch((cb) => {
                new FolderSuggest(this.app, cb.inputEl);
                    cb.setPlaceholder('Folder name.')
                        .setValue(this.assetsDir)
                        .onChange((newFolder) => {
                            this.assetsDir = newFolder;
                    })
            });

        new Setting(contentEl)
        .setName('Set compare note.')
        .addSearch((cb) => {
            new FileSuggest(this.app, cb.inputEl);
                cb.setPlaceholder('Note name')
                    .setValue(this.compareNote)
                    .onChange((newNote) => {
                        this.compareNote = newNote;
                    })
            });

        new Setting(contentEl)
        .setName('Delete files')
        .addButton(onchange => onchange
            .onClick((MouseEvent) => {
                this.close();
                this.sendVals(this.assetsDir, this.compareNote);
            }));
    }

    onClose() {
        let { contentEl } = this;
        contentEl.empty();
    }
}