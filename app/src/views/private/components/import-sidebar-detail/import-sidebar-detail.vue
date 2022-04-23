<script setup lang="ts">
import { computed, ref, toRef } from 'vue';
import api from '@/api';
import { useFieldsStore } from '@/stores';
import { Field } from '@directus/shared/types';

import CsvImport from './components/CsvImport.vue';
import CsvInput from './components/CsvInput.vue';
import CsvErrors from './components/CsvErrors.vue';
import CsvTableMap from './components/CsvTableMap.vue';
import CsvSubmit from './components/CsvSubmit.vue';
import VDivider from '@/components/v-divider/v-divider.vue';
import VTable from '@/components/v-table/v-table.vue';

const fieldsStore = useFieldsStore();

const props = defineProps({
	collection: {
		type: String,
		required: true,
	},
	file: {
		type: File,
		required: true,
	},
});

const collection = toRef(props, 'collection');

const csvColumns = computed(() => {
	const columns: Record<string, { label: string }> = {};
	fieldsStore.getFieldsForCollection(collection.value).forEach((field: Field) => {
		if (field.type !== 'alias' && !field.meta?.special?.includes('group')) {
			columns[field.field] = {
				label: field.name,
			};
		}
	});

	return columns;
});

const csv = ref(null);
const defaultFormValues = ref({});
const ignore = ref(false);

const message = ref<string>('');
const report = ref<Array<number>>([]);

type Error = {
	input: string;
	output: string;
};
const errors = ref<Array<Error>>([]);
const progress = ref(0);
const loading = ref(false);

let succeeding = 0;

type CsvRow = {
	[key: string]: string | number | boolean | null;
};

function upload(chunk: Array<CsvRow>, offset = 0) {
	const defaultValues = defaultFormValues.value;

	return Promise.all(
		chunk.map(async (row, index) => {
			const payload = Object.assign({}, defaultValues, row);
			try {
				await api.post(`/items/${collection.value}`, payload);
				report.value[index + offset] = 1;
				++succeeding;
			} catch (e: any) {
				const output = e.response.data?.errors?.map((e) => e.message).join(' | ') || e.message;
				report.value[index + offset] = -1;
				errors.value.push({
					input: Object.values(row).join(' | '),
					output,
				});
				if (ignore.value) {
					++succeeding;
				} else {
					--succeeding;
				}
			}

			++progress.value;
		})
	);
}

async function submit(rows: Array<CsvRow>) {
	const total = rows.length;

	if (loading.value) {
		return (progress.value = total);
	}
	loading.value = true;

	progress.value = 0;
	report.value = [];
	errors.value = [];

	succeeding = 0;
	let offset = 0;
	let CHUNK_SIZE = 10;
	while (offset < total && succeeding > -1) {
		succeeding = 0;
		const chunk = rows.slice(offset, offset + CHUNK_SIZE);
		await upload(chunk, offset);
		offset += CHUNK_SIZE;
	}

	if (succeeding < 0) {
		alert('Aborted due to multiple errors');
	}

	message.value = `Imported ${report.value.filter((r) => r === 1).length} out of ${total} items`;
	progress.value = total;
	loading.value = false;

	try {
		sessionStorage.setItem(
			'csv-report',
			JSON.stringify({
				errors: errors.value,
				defaultFormValues: defaultFormValues.value,
			})
		);
	} catch (e) {
		//console.error(e)
	}
}

try {
	const report = JSON.parse(sessionStorage.getItem('csv-report') ?? '{}');
	errors.value = report.errors ?? [];
	defaultFormValues.value = report.defaultFormValues ?? {};
} catch (e) {
	//console.error(e)
}
</script>

<template>
	<csv-import v-model="csv" :fields="csvColumns" :file="props.file" class="wrap">
		<v-divider>Match columns to fields</v-divider>
		<br />

		<csv-input />
		<br />

		<csv-table-map :report="report" />

		<br />

		<v-detail label="Default values">
			<v-form v-model="defaultFormValues" :collection="collection" batch-mode />
		</v-detail>

		<br />
		<csv-errors />
		<br />

		<v-notice v-if="message">{{ message }}</v-notice>

		<br />
		<v-checkbox v-model="ignore" block full-width label="Don't stop on errors" />
		<br />

		<csv-submit :progress="progress" @submit="submit" />
	</csv-import>

	<v-sheet v-if="errors.length">
		<v-table
			:headers="[
				{ text: 'Input', value: 'input' },
				{ text: 'Error', value: 'output' },
			]"
			:items="errors"
		/>
	</v-sheet>
</template>

<style scoped>
.wrap {
	padding: var(--content-padding);
	padding-top: 0;
}
</style>
