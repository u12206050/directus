import { defineInterface } from '@directus/extensions';
import type { DeepPartial, Field } from '@directus/types';
import InterfaceDateTime from './datetime.vue';
import PreviewSVG from './preview.svg?raw';
import { useFieldsStore } from '@/stores/fields';
import { getTimezoneOptions } from '@/utils/timezones';

export default defineInterface({
	id: 'datetime',
	name: '$t:interfaces.datetime.datetime',
	description: '$t:interfaces.datetime.description',
	icon: 'today',
	component: InterfaceDateTime,
	types: ['dateTime', 'date', 'time', 'timestamp'],
	group: 'selection',
	options: ({ field, collection }) => {
		const options = field.meta?.options || {};

		const fields: DeepPartial<Field>[] = [
			{
				field: 'relative',
				name: '$t:displays.datetime.relative',
				type: 'boolean',
				meta: {
					width: 'half',
					interface: 'boolean',
					options: {
						label: '$t:displays.datetime.relative_label',
					},
				},
				schema: {
					default_value: false,
				},
			},
		];

		if (!options.relative) {
			fields.push({
				field: 'format',
				name: '$t:displays.datetime.format',
				type: 'string',
				meta: {
					interface: 'select-dropdown',
					width: 'half',
					options: {
						choices: [
							{ text: '$t:displays.datetime.long', value: 'long' },
							{ text: '$t:displays.datetime.short', value: 'short' },
						],
						allowOther: true,
					},
					note: '$t:displays.datetime.format_note',
				},
				schema: {
					default_value: 'long',
				},
			});

			if (field.type !== 'date') {
				fields.push(
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
				);
			}

			if (field.type === 'timestamp') {
				fields.push({
					field: 'tz',
					name: '$t:displays.datetime.timezone',
					type: 'string',
					meta: {
						interface: 'select-dropdown',
						width: 'full',
						options: {
							choices: getTimezoneOptions(),
							allowOther: true,
						},
						note: '$t:displays.datetime.timezone_note',
					},
				});
			}
		} else {
			fields.push(
				{
					field: 'suffix',
					name: '$t:displays.datetime.suffix',
					type: 'boolean',
					meta: {
						width: 'half',
						interface: 'boolean',
						options: {
							label: '$t:displays.datetime.suffix_label',
						},
						note: '$t:displays.datetime.suffix_note',
					},
					schema: {
						default_value: true,
					},
				},
				{
					field: 'strict',
					name: '$t:displays.datetime.strict',
					type: 'boolean',
					meta: {
						width: 'half',
						interface: 'boolean',
						options: {
							label: '$t:displays.datetime.strict_label',
						},
						note: '$t:displays.datetime.strict_note',
					},
					schema: {
						default_value: false,
					},
				},
				{
					field: 'round',
					name: '$t:displays.datetime.round',
					type: 'string',
					meta: {
						width: 'half',
						interface: 'select-dropdown',
						options: {
							choices: [
								{ text: '$t:displays.datetime.down', value: 'floor' },
								{ text: '$t:displays.datetime.nearest', value: 'round' },
								{ text: '$t:displays.datetime.up', value: 'ceil' },
							],
						},
						note: '$t:displays.datetime.round_note',
					},
					schema: {
						default_value: 'round',
					},
				},
			);
		}

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
				},
			);
		}

		return {
			standard: fields,
			advanced: opts,
		};
	},
	recommendedDisplays: ['datetime'],
	preview: PreviewSVG,
});
