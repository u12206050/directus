<template>
	<div>
		<slot :errors="CsvImportData.errors" :fields="CsvImportData.fields" :file="CsvImportData.file"></slot>
	</div>
</template>

<script>
import { computed, reactive, provide } from 'vue';
import { drop, every, forEach, get, isArray, map, set } from 'lodash';

// TODO: Add to translation strings and replace with t i18n
const defaultLanguage = {
	errors: {
		fileRequired: 'A file is required',
		invalidMimeType: 'Invalid file type',
	},
	toggleHeaders: 'File has headers',
	submitBtn: 'Submit',
	fieldColumn: 'Field',
	csvColumn: 'Column',
	requiredField: '*',
	excludeField: 'Exclude field',
};

const mapFields = function (fields) {
	if (isArray(fields)) {
		return map(fields, (item) => {
			return {
				key: item,
				label: item,
				required: true,
			};
		});
	}

	return map(fields, (val, key) => {
		return {
			key: key,
			label: get(val, 'label', val),
			required: get(val, 'required', true),
		};
	});
};

export default {
	props: {
		modelValue: {
			type: [Array, null],
			default: () => null,
		},
		fields: {
			type: [Object, Array],
			required: true,
		},
		file: {
			type: File,
			required: true,
		},
	},
	emits: ['update:modelValue'],
	setup(props, { emit }) {
		let CsvImportData = reactive({
			errors: [],
			inputName: 'csv',
			file: props.file,
			map: {},
			value: {},
			fields: mapFields(props.fields),
			fileHasHeaders: true,
			csvSample: null,
			rawCsv: null,
			language: defaultLanguage,
			firstSampleRow: computed(() =>
				isArray(CsvImportData.csvSample) && isArray(CsvImportData.csvSample[0]) ? CsvImportData.csvSample[0] : null
			),
			allFieldsAreMapped: computed(() =>
				every(CsvImportData.fields, function (field) {
					return typeof CsvImportData.map[field.key] !== 'undefined' || !field.required;
				})
			),
		});

		const buildMappedCsv = function () {
			let newCsv = !CsvImportData.fileHasHeaders ? CsvImportData.rawCsv : drop(CsvImportData.rawCsv);

			CsvImportData.value = map(newCsv, (row) => {
				let newRow = {};
				forEach(CsvImportData.map, (column, field) => {
					set(newRow, field, get(row, column));
				});

				return newRow;
			});

			emit('update:modelValue', CsvImportData.value);
		};

		provide('CsvImportData', CsvImportData);
		provide('buildMappedCsv', buildMappedCsv);

		return {
			CsvImportData,
		};
	},
};
</script>
