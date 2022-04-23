<template>
	<slot :sample="CsvImportData.firstSampleRow" :map="CsvImportData.map" :fields="CsvImportData.fields">
		<template v-if="CsvImportData.firstSampleRow">
			<table v-bind="$attrs">
				<thead v-if="!noThead">
					<tr>
						<th>{{ labels.fieldColumn }}</th>
						<th>{{ labels.csvColumn }}</th>
					</tr>
				</thead>
				<tbody>
					<tr v-for="(field, rowIndex) in CsvImportData.fields" :key="rowIndex">
						<td>{{ field.label }}</td>
						<td>
							<select
								v-model="CsvImportData.map[field.key]"
								v-bind="selectAttributes"
								:name="`csv_uploader_map_${rowIndex}`"
							>
								<option v-if="!field.required" :value="null">&nbsp;</option>
								<option v-for="(column, colIndex) in CsvImportData.firstSampleRow" :key="colIndex" :value="colIndex">
									{{ column }}
								</option>
							</select>
						</td>
					</tr>
				</tbody>
			</table>
		</template>
	</slot>
</template>

<script>
import { inject, watch } from 'vue';

export default {
	name: 'CsvMap',
	props: {
		noThead: {
			type: Boolean,
			default: false,
		},
		selectAttributes: {
			type: Object,
			default() {
				return {};
			},
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

		watch(
			() => CsvImportData.map,
			() => {
				if (CsvImportData.allFieldsAreMapped) {
					buildMappedCsv();
				}
			},
			{ deep: true }
		);

		if (props.autoMatch) {
			watch(
				() => CsvImportData.csvSample,
				(newVal) => {
					if (newVal) {
						CsvImportData.fields.forEach((field) => {
							newVal[0].forEach((columnName, index) => {
								let fieldName = props.autoMatchIgnoreCase ? field.label.toLowerCase().trim() : field.label.trim();
								let colName = props.autoMatchIgnoreCase ? columnName.toLowerCase().trim() : columnName.trim();
								if (fieldName === colName) {
									CsvImportData.map[field.key] = index;
								}
							});
						});
					}
				}
			);
		}

		return {
			CsvImportData,
			labels,
		};
	},
};
</script>
