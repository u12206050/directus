<script setup>
import { inject, watch } from 'vue';
import { get, merge } from 'lodash';
import Papa from 'papaparse';

const props = defineProps({
	parseConfig: {
		type: Object,
		default() {
			return {};
		},
	},
	validation: {
		type: Boolean,
		default: true,
	},
	fileMimeTypes: {
		type: Array,
		default: () => {
			return ['text/csv', 'text/x-csv', 'application/vnd.ms-excel', 'text/plain'];
		},
	},
});

const CsvImportData = inject('CsvImportData');
const buildMappedCsv = inject('buildMappedCsv');
const labels = CsvImportData.language;

const validate = function (file) {
	CsvImportData.errors = [];

	if (!file) {
		CsvImportData.errors.push(labels.errors.fileRequired);
		return false;
	}

	if (props.validation) {
		let mimeType = file.type;
		if (mimeType === '') {
			mimeType = file.name.includes('.csv') ? 'text/csv' : 'unknown';
		}

		if (!props.fileMimeTypes.includes(mimeType)) {
			CsvImportData.errors.push(labels.errors.invalidMimeType);
		}

		return CsvImportData.errors.length === 0;
	}

	return true;
};

watch(
	() => CsvImportData.file,
	(newCurrentFile) => {
		if (!validate(newCurrentFile)) {
			CsvImportData.csvSample.value = null;
			CsvImportData.rawCsv.value = null;
			return;
		}
		let reader = new FileReader();
		reader.readAsText(CsvImportData.file, 'UTF-8');
		reader.onload = function (evt) {
			CsvImportData.csvSample = get(
				Papa.parse(
					evt.target.result,
					merge(
						{
							preview: 10,
							skipEmptyLines: true,
						},
						props.parseConfig
					)
				),
				'data'
			);
			CsvImportData.rawCsv = get(
				Papa.parse(evt.target.result, merge({ skipEmptyLines: true }, props.parseConfig)),
				'data'
			);
		};
		reader.onerror = function (err) {
			alert(err.message);
		};
	},
	{ deep: true, immediate: true }
);

watch(
	() => CsvImportData.fileHasHeaders,
	() => {
		if (CsvImportData.allFieldsAreMapped) {
			buildMappedCsv();
		}
	}
);
</script>

<template>
	<v-checkbox v-model="CsvImportData.fileHasHeaders" block full-width :label="labels.toggleHeaders" />
</template>
