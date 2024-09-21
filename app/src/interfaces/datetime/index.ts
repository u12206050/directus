import { defineInterface } from '@directus/extensions';
import InterfaceDateTime from './datetime.vue';
import PreviewSVG from './preview.svg?raw';
import { DeepPartial, Field } from '@directus/types';
import { useFieldsStore } from '@/stores/fields';

export default defineInterface({
	id: 'datetime',
	name: '$t:interfaces.datetime.datetime',
	description: '$t:interfaces.datetime.description',
	icon: 'today',
	component: InterfaceDateTime,
	types: ['dateTime', 'date', 'time', 'timestamp'],
	group: 'selection',
	options: ({ field, collection }) => {
		const opts: DeepPartial<Field>[] = [];
		const allowedTypes = ['dateTime', 'date', 'time', 'timestamp'];

		if (collection) {
			const fieldsStore = useFieldsStore();

			const choices: { text: string; value: string }[] = [];

			fieldsStore.getFieldsForCollection(collection).forEach((otherField) => {
				if (allowedTypes.includes(otherField.type) && otherField.field !== field.field) {
					choices.push({
						text: otherField.name,
						value: otherField.field,
					});
				}
			});

			opts.push(
				{
					field: 'minField',
					name: `Min field/value`,
					type: 'string',
					meta: {
						width: 'half',
						interface: 'select-dropdown',
						note: 'Select a field to use as the minimum value, or specify a $NOW() function.',
						options: {
							choices,
							showDeselect: true,
							allowOther: true,
						},
					},
				},
				{
					field: 'maxField',
					name: `Max field/value`,
					type: 'string',
					meta: {
						width: 'half',
						interface: 'select-dropdown',
						note: 'Select a field to use as the maxiumum value, or specify a $NOW() function.',
						options: {
							choices,
							showDeselect: true,
							allowOther: true,
						},
					},
				}
			);
		}

		if (field.type === 'date') {
			return {
				standard: [],
				advanced: opts,
			};
		}

		return {
				standard:  [
				{
					field: 'includeSeconds',
					name: '$t:interfaces.datetime.include_seconds',
					type: 'boolean',
					meta: {
						width: 'half',
						interface: 'boolean',
					},
					schema: {
						default_value: false,
					},
				},
				{
					field: 'use24',
					name: '$t:interfaces.datetime.use_24',
					type: 'boolean',
					meta: {
						width: 'half',
						interface: 'boolean',
					},
					schema: {
						default_value: true,
					},
				},
			],
			advanced: opts,
		};
	},
	recommendedDisplays: ['datetime'],
	preview: PreviewSVG,
});
