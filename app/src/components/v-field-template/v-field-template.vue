<script setup lang="ts">
import type { FieldNode } from '@/composables/use-field-tree';
import { flattenFieldGroups } from '@/utils/flatten-field-groups';
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import FieldListItem from './field-list-item.vue';
import { FieldTree } from './types';
import dompurify from 'dompurify';

const props = withDefaults(
	defineProps<{
		disabled?: boolean;
		modelValue?: string | null;
		nullable?: boolean;
		tree: FieldNode[];
		loadPathLevel?: (fieldPath: string, root?: FieldNode | undefined) => void;
		depth?: number;
		placeholder?: string | null;
	}>(),
	{
		disabled: false,
		modelValue: null,
		nullable: true,
		collection: null,
		depth: undefined,
		placeholder: null,
		inject: null,
	},
);

const emit = defineEmits(['update:modelValue']);

const contentEl = ref<HTMLElement | null>(null);

const menuActive = ref(false);

watch(() => props.modelValue, setContent, { immediate: true });

const grouplessTree = computed(() => {
	return flattenFieldGroups(props.tree);
});

onMounted(() => {
	if (contentEl.value) {
		contentEl.value.addEventListener('selectstart', onSelect);
		setContent();
	}
});

onUnmounted(() => {
	if (contentEl.value) {
		contentEl.value.removeEventListener('selectstart', onSelect);
	}
});

function onInput() {
	if (!contentEl.value) return;

	const valueString = getInputValue();
	emit('update:modelValue', valueString);
}

function onClick(event: MouseEvent) {
	const target = event.target as HTMLElement;
	if (target.tagName.toLowerCase() !== 'button') return;
	removeField(target);
}

function onKeyDown(event: KeyboardEvent) {
	const target = event.currentTarget as HTMLElement;
	const isButton = target?.tagName.toLowerCase() !== 'button';

	if (!isButton && event.key === 'Enter') {
		event.preventDefault();
	}

	if (isButton && ['Enter', ' '].includes(event.key)) {
		removeField(target);
	}

	if (event.key === '{' || event.key === '}') {
		event.preventDefault();
		menuActive.value = true;
	}

	if (contentEl.value?.innerHTML === '') {
		contentEl.value.innerHTML = '<span class="text"></span>';
	}
}

function onSelect() {
	if (!contentEl.value) return;
	const selection = window.getSelection();
	if (!selection || selection.rangeCount <= 0) return;
	const range = selection.getRangeAt(0);
	if (!range) return;
	const start = range.startContainer;

	if (
		!(start instanceof HTMLElement && start.classList.contains('text')) &&
		!start.parentElement?.classList.contains('text')
	) {
		selection.removeAllRanges();
		const range = new Range();
		let textSpan = null;

		for (let i = 0; i < contentEl.value.childNodes.length || !textSpan; i++) {
			const child = contentEl.value.children[i];

			if (child?.classList.contains('text')) {
				textSpan = child;
			}
		}

		if (!textSpan) {
			textSpan = document.createElement('span');
			textSpan.classList.add('text');
			contentEl.value.appendChild(textSpan);
		}

		range.setStart(textSpan as Node, 0);
		selection.addRange(range);
	}
}

function addField(field: FieldTree) {
	if (!contentEl.value) return;

	const button = document.createElement('button');
	button.dataset.field = field.key;
	button.setAttribute('contenteditable', 'false');
	button.classList.add('selected-field');
	button.innerText = String(field.name);

	if (window.getSelection()?.rangeCount == 0) {
		const range = document.createRange();
		range.selectNodeContents(contentEl.value.children[0] as Node);
		window.getSelection()?.addRange(range);
	}

	const range = window.getSelection()?.getRangeAt(0);
	if (!range) return;
	range.deleteContents();

	const end = splitElements();

	if (end) {
		contentEl.value.insertBefore(button, end);
		window.getSelection()?.removeAllRanges();
	} else {
		contentEl.value.appendChild(button);
		const span = document.createElement('span');
		span.classList.add('text');
		contentEl.value.appendChild(span);
	}

	onInput();
}

function removeField(target: HTMLElement) {
	const field = target.dataset.field;
	emit('update:modelValue', props.modelValue?.replace(`{{${field}}}`, ''));

	const before = target.previousElementSibling;
	const after = target.nextElementSibling;

	if (!before || !after || !(before instanceof HTMLElement) || !(after instanceof HTMLElement)) return;

	target.remove();
	joinElements(before, after);
	window.getSelection()?.removeAllRanges();
	onInput();

	contentEl.value?.focus();
}

function findTree(tree: FieldTree[] | undefined, fieldSections: string[]): FieldTree | undefined {
	if (tree === undefined) return undefined;

	const fieldObject = tree.find((f) => f.field === fieldSections[0]);

	if (fieldObject === undefined) return undefined;
	if (fieldSections.length === 1) return fieldObject;
	return findTree(fieldObject.children, fieldSections.slice(1));
}

function joinElements(first: HTMLElement, second: HTMLElement) {
	first.innerText += second.innerText;
	second.remove();
}

function splitElements() {
	const range = window.getSelection()?.getRangeAt(0);
	if (!range) return;

	const textNode = range.startContainer;
	if (textNode.nodeType !== Node.TEXT_NODE) return;
	const start = textNode.parentElement;
	if (!start || !(start instanceof HTMLSpanElement) || !start.classList.contains('text')) return;

	const startOffset = range.startOffset;

	const left = start.textContent?.slice(0, startOffset) || '';
	const right = start.textContent?.slice(startOffset) || '';

	start.innerText = left;

	const nextSpan = document.createElement('span');
	nextSpan.classList.add('text');
	nextSpan.innerText = right;
	contentEl.value?.insertBefore(nextSpan, start.nextSibling);
	return nextSpan;
}

function getInputValue() {
	if (!contentEl.value) return null;

	const value = Array.from(contentEl.value.childNodes).reduce((acc, node) => {
		const el = node as HTMLElement;
		const tag = el.tagName;

		if (tag && tag.toLowerCase() === 'button') return (acc += `{{${el.dataset.field}}}`);
		else if ('textContent' in el) return (acc += el.textContent);

		return (acc += '');
	}, '');

	if (props.nullable === true && value === '') {
		return null;
	}

	return value;
}

function setContent() {
	if (!contentEl.value) return;

	if (props.modelValue === null || props.modelValue === '') {
		contentEl.value.innerHTML = '<span class="text"></span>';
		return;
	}

	if (props.modelValue !== getInputValue()) {
		const regex = /({{.*?}})/g;

		const newInnerHTML = props.modelValue
			.split(regex)
			.map((part) => {
				if (part.startsWith('{{') === false) {
					return `<span class="text">${part}</span>`;
				}

				const fieldKey = part.replace(/({|})/g, '').trim();
				const fieldPath = fieldKey.split('.');

				for (let i = 0; i < fieldPath.length; i++) {
					props.loadPathLevel?.(fieldPath.slice(0, i).join('.'));
				}

				const field = findTree(grouplessTree.value, fieldPath);

				if (!field) return '';

				return `<button type="button" contenteditable="false" data-field="${fieldKey}" ${
					props.disabled ? 'disabled' : ''
				} class="selected-field">${field.name}</button>`;
			})
			.join('');

		contentEl.value.innerHTML = dompurify.sanitize(newInnerHTML, {
			ALLOWED_TAGS: ['span', 'button'],
			ALLOWED_ATTR: ['type', 'contenteditable', 'data-field', 'disabled', 'class'],
		});
	}
}
</script>

<template>
	<v-menu v-model="menuActive" attached>
		<template #activator="{ toggle }">
			<v-input :disabled="disabled">
				<template #input>
					<span
						ref="contentEl"
						class="content"
						:contenteditable="!disabled"
						@keydown="onKeyDown"
						@input="onInput"
						@click="onClick"
					>
						<span class="text" />
					</span>
					<span v-if="placeholder && !modelValue" class="placeholder">{{ placeholder }}</span>
				</template>

				<template #append>
					<v-icon name="add_box" outline clickable :disabled="disabled" @click="toggle" />
				</template>
			</v-input>
		</template>

		<v-list v-if="!disabled" :mandatory="false" @toggle="loadPathLevel?.($event.value)">
			<field-list-item v-for="field in tree" :key="field.field" :field="field" :depth="depth" @add="addField" />
		</v-list>
	</v-menu>
</template>

<style scoped lang="scss">
.content {
	display: block;
	flex-grow: 1;
	block-size: 100%;
	padding: var(--theme--form--field--input--padding) 0;
	overflow: hidden;
	font-size: 14px;
	font-family: var(--theme--fonts--monospace--font-family);
	white-space: nowrap;

	:deep(span) {
		min-inline-size: 1px;
		min-block-size: 1em;
		white-space: pre;
	}

	:deep(br) {
		display: none;
	}

	:deep(.selected-field) {
		margin: -1px 4px 0;
		padding: 2px 4px 0;
		color: var(--theme--primary);
		background-color: var(--theme--primary-background);
		border-radius: var(--theme--border-radius);
		transition: var(--fast) var(--transition);
		transition-property: background-color, color;
		-webkit-user-select: none;
		user-select: none;
	}

	:deep(.selected-field:not(:disabled):hover) {
		color: var(--white);
		background-color: var(--theme--danger);
	}
}

.placeholder {
	position: absolute;
	inset-block-start: 50%;
	inset-inline-start: 14px;
	color: var(--theme--foreground-subdued);
	transform: translateY(-50%);
	-webkit-user-select: none;
	user-select: none;
	pointer-events: none;
}

.content > :deep(*) {
	display: inline-block;
	white-space: nowrap;
}
</style>
