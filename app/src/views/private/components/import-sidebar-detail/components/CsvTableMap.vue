<template>
	<v-sheet
		v-if="CsvImportData.firstSampleRow"
		style="width: 100%; margin: 0 auto; overflow-x: auto; position: relative"
	>
		<table v-bind="tableAttributes">
			<thead class="table-header">
				<tr>
					<th class="cell"></th>
					<th
						v-for="(field, key) in headers"
						:key="key"
						class="cell"
						style="min-width: 12rem; border-bottom: 2px solid black"
					>
						<v-select
							v-model="csvMap[key]"
							:mandatory="true"
							:items="availableFields"
							inline
							show-deselect
							item-text="label"
							item-value="key"
							item-disabled="selected"
							:placeholder="labels.excludeField"
						/>
						<h4 v-if="CsvImportData.fileHasHeaders" style="text-align: left; font-weight: bold">
							{{ field || '---' }}
						</h4>
					</th>
				</tr>
			</thead>
			<tbody>
				<tr v-for="(row, index) in csvSample" :key="`${index}#${column}`" class="table-row">
					<td class="cell">
						<span v-if="report[index] === 1">✓</span>
						<span v-else-if="report[index] === -1">!</span>
					</td>
					<td v-for="(item, column) in row" :key="`${index}#${column}`" class="cell">{{ item }}</td>
				</tr>
			</tbody>
		</table>
		<p style="text-align: center; font-family: monospace">… Sampled data …</p>
	</v-sheet>
</template>

<script>
import { computed, inject, watch, reactive } from 'vue';

export default {
	name: 'CsvTableMap',
	props: {
		report: {
			type: Array,
			default: () => [],
		},
		tableAttributes: {
			type: Object,
			default: () => ({}),
		},
		autoMatch: {
			type: Boolean,
			default: true,
		},
		autoMatchIgnoreCase: {
			type: Boolean,
			default: true,
		},
	},
	setup(props) {
		const CsvImportData = inject('CsvImportData');
		const buildMappedCsv = inject('buildMappedCsv');
		const labels = CsvImportData.language;
		const csvMap = reactive({});

		const availableFields = computed(() => {
			return CsvImportData.fields.map((f) => {
				f.selected = Object.values(csvMap).includes(f.label);
				return f;
			});
		});

		watch(
			() => csvMap,
			function () {
				CsvImportData.map = {};
				for (const [key, value] of Object.entries(csvMap)) {
					if (value === '' || value === null) {
						continue;
					}
					CsvImportData.map[value.toLowerCase()] = key;
				}

				if (CsvImportData.allFieldsAreMapped) {
					buildMappedCsv();
				}
			},
			{ deep: true }
		);

		const csvSample = computed(() => {
			return !CsvImportData.fileHasHeaders ? CsvImportData.csvSample : CsvImportData.csvSample.slice(1);
		});

		const headers = computed(() => {
			if (!CsvImportData.fileHasHeaders) {
				return [...Array(CsvImportData.firstSampleRow.length).keys()].map((i) => `${labels.csvColumn} ${i}`);
			} else {
				return CsvImportData.firstSampleRow;
			}
		});

		if (props.autoMatch) {
			watch(
				() => CsvImportData.csvSample,
				function (newVal) {
					if (newVal) {
						CsvImportData.fields.forEach((field) => {
							newVal[0].forEach((columnName, index) => {
								let fieldName = props.autoMatchIgnoreCase ? field.label.toLowerCase().trim() : field.label.trim();
								let colName = props.autoMatchIgnoreCase ? columnName.toLowerCase().trim() : columnName.trim();
								if (fieldName === colName) {
									csvMap[index] = field.label;
								}
							});
						});
					}
				}
			);
		}

		return {
			availableFields,
			csvMap,
			csvSample,
			headers,
			CsvImportData,
			labels,
		};
	},
};
</script>
