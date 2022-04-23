<script setup>
import { inject, toRef } from 'vue';

const CsvImportData = inject('CsvImportData');

const errors = toRef(CsvImportData, 'errors');
</script>

<template>
	<v-sheet v-if="errors && errors.length">
		<v-error v-for="(error, index) in errors" :key="'error' + index" :error="error" />
	</v-sheet>
</template>
