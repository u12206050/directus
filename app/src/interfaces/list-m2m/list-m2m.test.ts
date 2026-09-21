import { Field, Relation } from '@directus/types';
import { createTestingPinia } from '@pinia/testing';
import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { computed, ref } from 'vue';
import ListM2M from './list-m2m.vue';
import type { GlobalMountOptions } from '@/__utils__/types';
import { i18n } from '@/lang';
import { Collection } from '@/types/collections';
import { LAYOUTS } from '@/types/interfaces';

vi.mock('@/composables/use-relation-m2m', () => ({
	useRelationM2M: () => ({
		relationInfo: computed(() => ({
			relation: {
				collection: 'junction-collection',
				field: 'related_id',
				related_collection: 'related-collection',
				schema: null,
				meta: null,
			} as Relation,
			relatedCollection: {
				collection: 'related-collection',
			} as Collection,
			relatedPrimaryKeyField: { field: 'id' } as Field,
			junctionCollection: {
				collection: 'junction-collection',
			} as Collection,
			junctionPrimaryKeyField: { field: 'id' } as Field,
			junctionField: { field: 'related_id' } as Field,
			reverseJunctionField: { field: 'item_id' } as Field,
			junction: {
				collection: 'junction-collection',
				field: 'item_id',
				related_collection: 'test-collection',
				schema: null,
				meta: null,
			} as Relation,
			type: 'm2m',
		})),
	}),
}));

vi.mock('@/composables/use-relation-permissions', () => ({
	useRelationPermissionsM2M: () => ({
		createAllowed: computed(() => true),
		selectAllowed: computed(() => true),
		updateAllowed: computed(() => true),
		deleteAllowed: computed(() => true),
	}),
}));

const mockGetField = vi.hoisted(() => vi.fn(() => null as any));
const mockGetWidth = vi.hoisted(() => vi.fn((_key: string, defaultWidth: number) => defaultWidth));
const mockUpdateWidths = vi.hoisted(() => vi.fn());

vi.mock('@/composables/use-column-widths', () => ({
	useColumnWidths: () => ({ getWidth: mockGetWidth, updateWidths: mockUpdateWidths }),
}));

vi.mock('@/stores/fields', () => ({
	useFieldsStore: () => ({
		getFieldsForCollection: vi.fn((collection: string) => {
			if (collection === 'related-collection') {
				return [
					{ field: 'id', name: 'ID', type: 'integer' },
					{ field: 'title', name: 'Title', type: 'string' },
					{ field: 'status', name: 'Status', type: 'string' },
				];
			}

			return [
				{ field: 'id', name: 'ID', type: 'integer' },
				{ field: 'related_id', name: 'Related', type: 'integer' },
				{ field: 'item_id', name: 'Item', type: 'integer' },
				{ field: 'quantity', name: 'Quantity', type: 'integer' },
				{ field: 'notes', name: 'Notes', type: 'string' },
			];
		}),
		getField: mockGetField,
		getPrimaryKeyFieldForCollection: vi.fn(() => ({ field: 'id' })),
	}),
}));

const mockUpdate = vi.hoisted(() => vi.fn());
const mockGetItemEdits = vi.hoisted(() => vi.fn(() => ({})));

vi.mock('@/composables/use-relation-multiple', () => ({
	useRelationMultiple: () => ({
		create: vi.fn(),
		update: mockUpdate,
		remove: vi.fn(),
		select: vi.fn(),
		displayItems: ref([{ id: '1', related_id: { id: '10' }, $type: 'existingItem', $index: 0, $edits: 0 }]),
		totalItemCount: ref(1),
		loading: ref(false),
		selected: ref([]),
		fetchedSelectItems: ref([]),
		fetchedItems: ref([]),
		useActions: vi.fn(() => ({
			cleanItem: vi.fn((item: any) => item),
			getPage: vi.fn(),
			isLocalItem: vi.fn(() => false),
			getItemEdits: mockGetItemEdits,
			isEmpty: vi.fn(() => false),
		})),
		cleanItem: vi.fn((item: any) => item),
		isItemSelected: vi.fn(() => false),
		isLocalItem: vi.fn(() => false),
		getItemEdits: mockGetItemEdits,
	}),
}));

afterEach(() => {
	vi.clearAllMocks();
});

const global: GlobalMountOptions = {
	stubs: {
		VIcon: true,
		VListItem: {
			template: '<div class="v-list-item"><slot /></div>',
		},
		VNotice: true,
		VRemove: true,
		VSkeletonLoader: true,
		VButton: true,
		VPagination: true,
		VSelect: true,
		VTable: true,
		DrawerBatch: {
			name: 'DrawerBatch',
			template: '<div class="drawer-batch" />',
			props: [
				'active',
				'primaryKeys',
				'collection',
				'relatedCollection',
				'junctionField',
				'circularField',
				'junctionFieldLocation',
				'stageOnSave',
			],
		},
		DrawerCollection: true,
		DrawerItem: true,
		RenderTemplate: true,
		RouterLink: true,
		SearchInput: true,
		Draggable: {
			template: '<div><slot v-for="element in modelValue" name="item" :element="element" /></div>',
			props: ['modelValue'],
		},
	},
	directives: {
		tooltip: () => {},
		'prevent-focusout': () => {},
	},
	plugins: [
		i18n,
		createTestingPinia({
			createSpy: vi.fn,
		}),
	],
};

const routerLinkStub = {
	template: '<div class="router-link-stub"><slot v-bind="{ href: \'/test\', navigate: () => {} }" /></div>',
};

const globalWithRouterLink: GlobalMountOptions = {
	...global,
	stubs: { ...global.stubs, RouterLink: routerLinkStub },
};

const tableGlobal: GlobalMountOptions = {
	...global,
	stubs: {
		...global.stubs,
		VTable: {
			template: '<div class="v-table"><slot v-for="item in items" name="item-append" :item="item" /></div>',
			props: ['items'],
		},
	},
};

const tableGlobalWithRouterLink: GlobalMountOptions = {
	...tableGlobal,
	stubs: { ...tableGlobal.stubs, RouterLink: routerLinkStub },
};

const tableGlobalWithHeaderEmit: GlobalMountOptions = {
	...global,
	stubs: {
		...global.stubs,
		VTable: {
			name: 'VTable',
			template: '<div class="v-table" />',
			props: ['modelValue', 'headers', 'items'],
			emits: ['update:headers'],
		},
	},
};

const listProps = {
	primaryKey: '1',
	collection: 'test-collection',
	field: 'test-field',
	width: 'full',
	version: null,
};

describe('list-m2m', () => {
	it('should mount', () => {
		const wrapper = mount(ListM2M, {
			props: listProps,
			global,
		});

		expect(wrapper.exists()).toBe(true);
	});

	describe('list layout', () => {
		describe('non-editable state', () => {
			it('should show item-actions with navigate link when nonEditable and enableLink are true', () => {
				const wrapper = mount(ListM2M, {
					props: { ...listProps, enableLink: true, nonEditable: true, disabled: true },
					global,
				});

				expect(wrapper.find('.item-actions').exists()).toBe(true);
				expect(wrapper.find('.item-actions router-link-stub').exists()).toBe(true);
			});

			it('should hide item-actions when nonEditable is true and enableLink is false', () => {
				const wrapper = mount(ListM2M, {
					props: { ...listProps, enableLink: false, nonEditable: true, disabled: true },
					global,
				});

				expect(wrapper.find('.item-actions').exists()).toBe(false);
			});

			it('should hide remove button when nonEditable is true', () => {
				const wrapper = mount(ListM2M, {
					props: { ...listProps, enableLink: true, nonEditable: true, disabled: true },
					global,
				});

				expect(wrapper.find('.item-actions v-remove-stub').exists()).toBe(false);
			});

			it('should render clickable navigate link when nonEditable and disabled are both true', () => {
				const wrapper = mount(ListM2M, {
					props: { ...listProps, enableLink: true, nonEditable: true, disabled: true },
					global: globalWithRouterLink,
				});

				expect(wrapper.find('.item-actions .item-link').exists()).toBe(true);
			});

			it('should render non-clickable icon when disabled is true and nonEditable is false', () => {
				const wrapper = mount(ListM2M, {
					props: { ...listProps, enableLink: true, nonEditable: false, disabled: true },
					global: globalWithRouterLink,
				});

				expect(wrapper.find('.item-actions .item-link').exists()).toBe(false);
			});
		});

		describe('disabled state', () => {
			it('should render action buttons disabled when disabled is true', () => {
				const wrapper = mount(ListM2M, {
					props: { ...listProps, disabled: true },
					global,
				});

				expect(wrapper.find('.item-actions v-remove-stub').exists()).toBe(true);
				expect(wrapper.find('.item-actions v-remove-stub').attributes('disabled')).toBe('true');
			});
		});

		describe('editable state', () => {
			it('should show remove button when nonEditable is false', () => {
				const wrapper = mount(ListM2M, {
					props: { ...listProps, enableLink: true, nonEditable: false, disabled: false },
					global,
				});

				expect(wrapper.find('.item-actions').exists()).toBe(true);
				expect(wrapper.find('.item-actions v-remove-stub').exists()).toBe(true);
			});
		});
	});

	describe('table layout', () => {
		describe('non-editable state', () => {
			it('should show item-actions with navigate link when nonEditable and enableLink are true', () => {
				const wrapper = mount(ListM2M, {
					props: { ...listProps, layout: LAYOUTS.TABLE, enableLink: true, nonEditable: true, disabled: true },
					global: tableGlobal,
				});

				expect(wrapper.find('.item-actions').exists()).toBe(true);
				expect(wrapper.find('.item-actions router-link-stub').exists()).toBe(true);
			});

			it('should hide remove button when nonEditable is true', () => {
				const wrapper = mount(ListM2M, {
					props: { ...listProps, layout: LAYOUTS.TABLE, enableLink: true, nonEditable: true, disabled: true },
					global: tableGlobal,
				});

				expect(wrapper.find('.item-actions v-remove-stub').exists()).toBe(false);
			});

			it('should render clickable navigate link when nonEditable and disabled are both true', () => {
				const wrapper = mount(ListM2M, {
					props: { ...listProps, layout: LAYOUTS.TABLE, enableLink: true, nonEditable: true, disabled: true },
					global: tableGlobalWithRouterLink,
				});

				expect(wrapper.find('.item-actions .item-link').exists()).toBe(true);
			});

			it('should render non-clickable icon when disabled is true and nonEditable is false', () => {
				const wrapper = mount(ListM2M, {
					props: { ...listProps, layout: LAYOUTS.TABLE, enableLink: true, nonEditable: false, disabled: true },
					global: tableGlobalWithRouterLink,
				});

				expect(wrapper.find('.item-actions .item-link').exists()).toBe(false);
			});
		});

		describe('disabled state', () => {
			it('should render action buttons disabled when disabled is true', () => {
				const wrapper = mount(ListM2M, {
					props: { ...listProps, layout: LAYOUTS.TABLE, disabled: true },
					global: tableGlobal,
				});

				expect(wrapper.find('.item-actions v-remove-stub').exists()).toBe(true);
				expect(wrapper.find('.item-actions v-remove-stub').attributes('disabled')).toBe('true');
			});
		});

		describe('editable state', () => {
			it('should show remove button when nonEditable is false', () => {
				const wrapper = mount(ListM2M, {
					props: { ...listProps, layout: LAYOUTS.TABLE, enableLink: true, nonEditable: false, disabled: false },
					global: tableGlobal,
				});

				expect(wrapper.find('.item-actions').exists()).toBe(true);
				expect(wrapper.find('.item-actions v-remove-stub').exists()).toBe(true);
			});
		});

		describe('batch edit', () => {
			beforeEach(() => {
				mockUpdate.mockReset();
				mockGetItemEdits.mockReset();
				mockGetItemEdits.mockReturnValue({});
			});

			it('passes junction relation info to DrawerBatch', () => {
				const wrapper = mount(ListM2M, {
					props: { ...listProps, layout: LAYOUTS.TABLE },
					global: tableGlobal,
				});

				const drawerBatch = wrapper.findComponent({ name: 'DrawerBatch' });

				expect(drawerBatch.props('collection')).toBe('junction-collection');
				expect(drawerBatch.props('relatedCollection')).toBe('related-collection');
				expect(drawerBatch.props('junctionField')).toBe('related_id');
				expect(drawerBatch.props('circularField')).toBe('item_id');
			});

			it('stages junction-level edits at the top level rather than under the related FK', async () => {
				const wrapper = mount(ListM2M, {
					props: { ...listProps, layout: LAYOUTS.TABLE },
					global: tableGlobal,
				});

				const setupState = (wrapper.vm as any).$.setupState;
				setupState.selection = [{ id: '1', related_id: { id: '10' }, $type: 'existingItem', $index: 0, $edits: 0 }];

				await wrapper.findComponent({ name: 'DrawerBatch' }).vm.$emit('input', { quantity: 5, notes: 'updated' });

				expect(mockUpdate).toHaveBeenCalledWith(
					expect.objectContaining({
						quantity: 5,
						notes: 'updated',
						id: '1',
						related_id: { id: '10' },
					}),
				);

				const staged = mockUpdate.mock.calls[0]![0];
				expect(staged.related_id).not.toHaveProperty('quantity');
				expect(staged.related_id).not.toHaveProperty('notes');
			});

			it('stages related-collection edits under the junction field', async () => {
				const wrapper = mount(ListM2M, {
					props: { ...listProps, layout: LAYOUTS.TABLE },
					global: tableGlobal,
				});

				const setupState = (wrapper.vm as any).$.setupState;
				setupState.selection = [{ id: '1', related_id: { id: '10' }, $type: 'existingItem', $index: 0, $edits: 0 }];

				await wrapper.findComponent({ name: 'DrawerBatch' }).vm.$emit('input', {
					quantity: 3,
					related_id: { title: 'Updated', status: 'draft' },
				});

				expect(mockUpdate).toHaveBeenCalledWith(
					expect.objectContaining({
						quantity: 3,
						id: '1',
						related_id: expect.objectContaining({
							id: '10',
							title: 'Updated',
							status: 'draft',
						}),
					}),
				);
			});
		});

		describe('column width persistence', () => {
			beforeEach(() => {
				mockGetField.mockReset();
				mockGetWidth.mockImplementation((_key: string, defaultWidth: number) => defaultWidth);
				mockUpdateWidths.mockReset();
			});

			it('only calls updateWidths for columns whose width changed', async () => {
				mockGetField.mockReturnValue({ name: 'Name', type: 'string', field: 'name' } as any);
				// getWidth returns 144 (default), so any other value counts as a resize
				mockGetWidth.mockReturnValue(144);

				const wrapper = mount(ListM2M, {
					props: { ...listProps, layout: LAYOUTS.TABLE, fields: ['name'] },
					global: tableGlobalWithHeaderEmit,
				});

				const vTable = wrapper.findComponent({ name: 'VTable' });

				// Emit a resize: 'name' changes to 250, different from stored 144
				await vTable.vm.$emit('update:headers', [{ text: 'Name', value: 'name', width: 250 }]);
				expect(mockUpdateWidths).toHaveBeenCalledWith([{ text: 'Name', value: 'name', width: 250 }]);
			});

			it('does not call updateWidths when no width changed', async () => {
				mockGetField.mockReturnValue({ name: 'Name', type: 'string', field: 'name' } as any);
				mockGetWidth.mockReturnValue(144);

				const wrapper = mount(ListM2M, {
					props: { ...listProps, layout: LAYOUTS.TABLE, fields: ['name'] },
					global: tableGlobalWithHeaderEmit,
				});

				const vTable = wrapper.findComponent({ name: 'VTable' });

				// Emit same width as currently rendered — no actual resize
				await vTable.vm.$emit('update:headers', [{ text: 'Name', value: 'name', width: 144 }]);
				expect(mockUpdateWidths).not.toHaveBeenCalled();
			});

			it('uses getWidth to restore stored column widths on mount', async () => {
				mockGetField.mockReturnValue({ name: 'Name', type: 'string', field: 'name' } as any);
				mockGetWidth.mockReturnValue(300); // simulate a stored width of 300

				const wrapper = mount(ListM2M, {
					props: { ...listProps, layout: LAYOUTS.TABLE, fields: ['name'] },
					global: tableGlobalWithHeaderEmit,
				});

				const vTable = wrapper.findComponent({ name: 'VTable' });
				const headers = vTable.props('headers') as Array<{ value: string; width: number }>;
				expect(headers?.find((h) => h.value === 'name')?.width).toBe(300);
			});
		});
	});
});
