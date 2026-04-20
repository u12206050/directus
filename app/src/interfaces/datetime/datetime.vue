<script setup lang="ts">
import { adjustDate } from '@directus/utils';
import { DateValue, parseAbsolute } from '@internationalized/date';
import { isValid, parseISO } from 'date-fns';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';
import { get } from 'lodash';
import { computed, ComputedRef, inject, onUnmounted, ref, useTemplateRef, watch } from 'vue';
import UseDatetime, { type Props as UseDatetimeProps } from '@/components/use-datetime.vue';
import VDatePicker from '@/components/v-date-picker/v-date-picker.vue';
import VIcon from '@/components/v-icon/v-icon.vue';
import VListItem from '@/components/v-list-item.vue';
import VMenu from '@/components/v-menu.vue';
import VRemove from '@/components/v-remove.vue';
import { parseDate } from '@/utils/parse-date';

interface Props extends Omit<UseDatetimeProps, 'value'> {
	value: string | null;
	disabled?: boolean;
	nonEditable?: boolean;
	minField?: string;
	maxField?: string;
	tz?: string;
}

const props = withDefaults(defineProps<Props>(), {
	use24: true,
	format: 'long',
	relative: false,
	strict: false,
	round: 'round',
	suffix: true,
});

const emit = defineEmits<{
	(e: 'input', value: string | null): void;
}>();

const menuActive = ref(false);
const dateTimeMenu = useTemplateRef('dateTimeMenu');
const values = inject('values') as ComputedRef<Record<string, any>>;
const min = useDateFieldOrDynamic(props.minField);
const max = useDateFieldOrDynamic(props.maxField);

const isValidValue = computed(() => (props.value ? isValid(parseDate(props.value, props.type)) : false));

function unsetValue(e: Event) {
	e.preventDefault();
	e.stopPropagation();
	emit('input', null);
}

// Computed property for date-picker value with timezone conversion
const tzValue = computed({
	get() {
		if (props.type === 'timestamp' && props.tz && props.value) {
			const date = parseISO(props.value);
			if (!isValid(date)) return null;
			return toZonedTime(date, props.tz).toISOString();
		}

		return props.value;
	},
	set(value: string | null) {
		if (!value) {
			emit('input', null);
			return;
		}

		const date = parseISO(value);

		if (isValid(date) && props.type === 'timestamp' && props.tz) {
			emit('input', fromZonedTime(date, props.tz).toISOString());
			return;
		}

		emit('input', value);
	},
});

function useDateFieldOrDynamic(value?: string) {
	if (!value) return undefined;
	
	const val = ref<DateValue | undefined>(undefined);

	if (value.startsWith('$NOW')) {
		val.value = dateToValue(parse$NOW(value));

		const interval = setInterval(() => {
			val.value = dateToValue(parse$NOW(value));
		}, 60000);

		onUnmounted(() => {
			if (interval) clearInterval(interval);
		});
	} else {
		watch(values, (form) => {
			const v = get(form, value);
			if (v) {
				val.value = dateToValue(new Date(v));
			} else val.value = undefined;
		}, { immediate: true });
	}

	return val;
}

function dateToValue(date: Date) {
	return parseAbsolute(date.toISOString(), props.tz || 'UTC');
}

function parse$NOW(value: string) {
	if (value.includes('(') && value.includes(')')) {
		const adjustment = value.match(/\(([^)]+)\)/)?.[1];
		if (adjustment) return adjustDate(new Date(), adjustment)!;
	}

	return new Date();
}
</script>

<template>
	<VMenu
		ref="dateTimeMenu"
		v-model="menuActive"
		v-prevent-focusout="menuActive"
		:close-on-content-click="false"
		attached
		:disabled="disabled"
		full-height
		seamless
	>
		<template #activator="{ toggle, active }">
			<VListItem block clickable :disabled :non-editable :active @click="toggle">
				<template v-if="isValidValue">
					<UseDatetime v-slot="{ datetime }" v-bind="$props as UseDatetimeProps">
						{{ datetime }}
					</UseDatetime>
				</template>

				<div class="spacer" />

				<div v-if="!nonEditable" class="item-actions">
					<VIcon v-if="tz" v-tooltip="tz" name="schedule" class="timezone-icon" :class="{ active, disabled }" />
					<VRemove v-if="value" :disabled deselect class="clear-icon" @action="unsetValue($event)" />
					<VIcon v-else name="today" class="today-icon" :class="{ active, disabled }" />
				</div>
			</VListItem>
		</template>

		<VDatePicker
			v-model="tzValue"
			:type
			:disabled
			:include-seconds
			:use-24
			:min="min"
			:max="max"
			@close="dateTimeMenu?.deactivate"
		/>
	</VMenu>
</template>

<style lang="scss" scoped>
@use '@/styles/mixins';

.v-list-item {
	--v-list-item-color-active: var(--v-list-item-color);
	--v-list-item-background-color-active: var(
		--v-list-item-background-color,
		var(--v-list-background-color, var(--theme--form--field--input--background))
	);

	&.disabled:not(.non-editable) {
		--v-list-item-background-color: var(--theme--form--field--input--background-subdued);
	}

	&.active:not(.disabled),
	&:focus-within,
	&:focus-visible {
		--v-list-item-border-color: var(--v-input-border-color-focus, var(--theme--form--field--input--border-color-focus));
		--v-list-item-border-color-hover: var(--v-list-item-border-color);

		offset: 0;
		box-shadow: var(--theme--form--field--input--box-shadow-focus);
	}
}

.today-icon:not(.disabled) {
	&:hover,
	&.active {
		--v-icon-color: var(--theme--primary);
	}

	&.timezone-icon {
		margin-inline-end: 4px;

		--v-icon-color: var(--theme--secondary);
	}
}

.timezone-icon {
	margin-inline-end: 0.25rem;
}

.item-actions {
	@include mixins.list-interface-item-actions;
}
</style>
