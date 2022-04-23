<script setup>
import { inject, ref } from 'vue';

const CsvImportData = inject('CsvImportData');
const buildMappedCsv = inject('buildMappedCsv');
const labels = CsvImportData.language;

const props = defineProps({
	progress: {
		type: Number,
		required: true,
	},
});

const $emit = defineEmits(['submit']);

const total = ref(0);
async function submit() {
	if (total.value !== props.progress) return;
	buildMappedCsv();

	if (CsvImportData.value?.length) {
		total.value = CsvImportData.value?.length;
		$emit('submit', CsvImportData.value);
	}
}
</script>

<template>
	<v-button type="submit" v-bind="$attrs" :disabled="total !== progress" @click.prevent="submit()">
		<span v-if="total !== progress">… {{ progress }}/{{ total }}</span>
		<span v-else>{{ labels.submitBtn }}</span>
	</v-button>
</template>
