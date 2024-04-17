import FindNonUseAssets from 'main';
import { App, Modal, Setting } from 'obsidian';

import { FolderSuggest } from 'Suggests/file-suggest';
import { FileSuggest } from 'Suggests/note-suggest';
import { arrayMove } from 'utils/Utils';

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