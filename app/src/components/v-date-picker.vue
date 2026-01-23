<script setup lang="ts">
import { getFlatpickrLocale } from '@/utils/get-flatpickr-locale';
import { format, parse, parseISO } from 'date-fns';
import Flatpickr from 'flatpickr';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

interface Props {
	type: 'date' | 'time' | 'dateTime' | 'timestamp';
	modelValue?: string;
	disabled?: boolean;
	includeSeconds?: boolean;
	use24?: boolean;
	min?: string;
	max?: string;
}

const props = withDefaults(defineProps<Props>(), {
	modelValue: undefined,
	disabled: false,
	includeSeconds: false,
	use24: true,
	min: '',
	max: '',
});

const emit = defineEmits<{ 'update:modelValue': [value: string | null]; close: [] }>();

const { t } = useI18n();

const wrapper = ref<HTMLElement | null>(null);
let flatpickr: Flatpickr.Instance | null;

onMounted(async () => {
	if (wrapper.value) {
		const flatpickrLocale = getFlatpickrLocale();
		flatpickr = Flatpickr(wrapper.value as Node, { ...flatpickrOptions.value, locale: flatpickrLocale } as any);
	}

	watch(
		() => props.modelValue,
		() => {
			if (props.modelValue) {
				flatpickr?.setDate(props.modelValue, false);
			} else {
				flatpickr?.clear();
			}
		},
		{ immediate: true },
	);
});

onBeforeUnmount(() => {
	if (flatpickr) {
		flatpickr.close();
		flatpickr = null;
	}
});

const handleEnterNavigation = (currentElement: HTMLElement | null, instance: Flatpickr.Instance) => {
	const { hourElement, minuteElement, secondElement, amPM } = instance;
	const navSequence: HTMLElement[] = [];

	if (hourElement) navSequence.push(hourElement);
	if (minuteElement) navSequence.push(minuteElement);
	if (props.includeSeconds && secondElement) navSequence.push(secondElement);
	if (!props.use24 && amPM) navSequence.push(amPM);

	if (!currentElement) {
		if (navSequence.length > 0) {
			navSequence[0]!.focus();
			if ('select' in navSequence[0]!) (navSequence[0]! as HTMLInputElement).select();
		}

		return;
	}

	if (currentElement) {
		const inputEvent = new Event('input', { bubbles: true });
		currentElement.dispatchEvent(inputEvent);
	}

	const currentIndex = navSequence.findIndex((el) => el === currentElement);

	if (currentIndex < navSequence.length - 1) {
		setTimeout(() => {
			const nextElement = navSequence[currentIndex + 1];
			if (!nextElement) return;
			nextElement.focus();
			if ('select' in nextElement) (nextElement as HTMLInputElement).select();
		}, 10);
	} else {
		setTimeout(() => {
			const blurEvent = new Event('blur', { bubbles: true });
			currentElement.dispatchEvent(blurEvent);

			setTimeout(() => {
				emit('close');
			}, 50);
		}, 10);
	}
};

const handlePaste = async (event: KeyboardEvent): Promise<void> => {
	if (!(event.ctrlKey || event.metaKey) || event.key !== 'v') return;
	event.preventDefault();

	try {
		const clipboardText = (await navigator.clipboard.readText()).trim();

		if (!clipboardText) return;

		let parsedDate: Date | null = null;

		switch (props.type) {
			case 'dateTime':
				parsedDate = parse(clipboardText, "yyyy-MM-dd'T'HH:mm:ss", new Date());
				break;
			case 'date':
				parsedDate = parse(clipboardText, 'yyyy-MM-dd', new Date());
				break;
			case 'time':
				parsedDate = parse(clipboardText, 'HH:mm:ss', new Date());
				break;
			case 'timestamp':
				parsedDate = parseISO(clipboardText);
				break;
		}

		if (parsedDate) {
			emitValue(parsedDate);

			setTimeout(() => {
				emit('close');
			}, 50);
		}
	} catch {
		return;
	}
};

const handleCopy = async (event: KeyboardEvent) => {
	if (!(event.ctrlKey || event.metaKey) || event.key !== 'c') return;
	if (!flatpickr || !flatpickr.selectedDates || flatpickr.selectedDates.length === 0) return;

	event.preventDefault();

	const selectedDate = flatpickr.selectedDates[0];
	if (!selectedDate) return;

	let formattedValue = '';

	switch (props.type) {
		case 'dateTime':
			formattedValue = format(selectedDate, "yyyy-MM-dd'T'HH:mm:ss");
			break;
		case 'date':
			formattedValue = format(selectedDate, 'yyyy-MM-dd');
			break;
		case 'time':
			formattedValue = format(selectedDate, 'HH:mm:ss');
			break;
		case 'timestamp':
			formattedValue = selectedDate.toISOString();
			break;
	}

	if (formattedValue) {
		await navigator.clipboard.writeText(formattedValue);
	}
};

function attachEnterEvent(element: HTMLElement, instance: Flatpickr.Instance) {
	element.addEventListener('keydown', (event: KeyboardEvent) => {
		if (event.key === 'Enter' && !event.ctrlKey && !event.metaKey) {
			event.preventDefault();
			event.stopPropagation();
			handleEnterNavigation(element, instance);
		}
	});
}

const defaultOptions = {
	static: true,
	inline: true,
	nextArrow:
		'<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6-6-6z"/></svg>',
	prevArrow:
		'<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12l4.58-4.59z"/></svg>',
	wrap: true,

	onChange(selectedDates: Date[], _dateStr: string, _instance: Flatpickr.Instance) {
		const selectedDate = selectedDates.length > 0 ? (selectedDates as [Date])[0] : null;
		emitValue(selectedDate);
	},
	onClose(selectedDates: Date[], _dateStr: string, _instance: Flatpickr.Instance) {
		const selectedDate = selectedDates.length > 0 ? (selectedDates as [Date])[0] : null;
		emitValue(selectedDate);
	},
	onReady(_selectedDates: Date[], _dateStr: string, instance: Flatpickr.Instance) {
		const setToNowButton: HTMLElement = document.createElement('button');
		setToNowButton.setAttribute('type', 'button');
		setToNowButton.innerHTML = t('interfaces.datetime.set_to_now');
		setToNowButton.classList.add('set-to-now-button');
		setToNowButton.addEventListener('click', setToNow);
		instance.calendarContainer.appendChild(setToNowButton);

		instance.calendarContainer.addEventListener('keydown', handlePaste);
		instance.calendarContainer.addEventListener('keydown', handleCopy);

		if (instance.hourElement) {
			attachEnterEvent(instance.hourElement, instance);
		}

		if (instance.minuteElement) {
			attachEnterEvent(instance.minuteElement, instance);
		}

		if (props.includeSeconds && instance.secondElement) {
			attachEnterEvent(instance.secondElement, instance);
		}

		if (!props.use24 && instance.amPM) {
			attachEnterEvent(instance.amPM, instance);
		}

		if (instance.daysContainer) {
			attachEnterEvent(instance.daysContainer, instance);
		}

		setTimeout(() => {
			if (['dateTime', 'time', 'timestamp'].includes(props.type) && instance.hourElement) {
				instance.hourElement.focus();
				if ('select' in instance.hourElement) (instance.hourElement as HTMLInputElement).select();
			}
		}, 150);
	},
};

const flatpickrOptions = computed<Record<string, any>>(() => {
	return Object.assign({}, defaultOptions, {
		enableSeconds: props.includeSeconds,
		enableTime: ['dateTime', 'time', 'timestamp'].includes(props.type),
		noCalendar: props.type === 'time',
		time_24hr: props.use24,
		minDate: props.min,
		maxDate: props.max,
	});
});

function emitValue(value: Date | null) {
	if (!value) return emit('update:modelValue', null);

	switch (props.type) {
		case 'dateTime':
			emit('update:modelValue', format(value, "yyyy-MM-dd'T'HH:mm:ss"));
			break;
		case 'date':
			emit('update:modelValue', format(value, 'yyyy-MM-dd'));
			break;
		case 'time':
			emit('update:modelValue', format(value, 'HH:mm:ss'));
			break;
		case 'timestamp':
			emit('update:modelValue', value.toISOString());
			break;
	}

	// close the calendar on input change if it's only a date picker without time input
	if (props.type === 'date') {
		emit('close');
	}
}

function setToNow() {
	flatpickr?.setDate(new Date(), true);
}
</script>

<template>
	<div ref="wrapper" class="v-date-picker">
		<input class="input" type="text" data-input />
	</div>
</template>

<style lang="scss" scoped>
.v-date-picker {
	.input {
		display: none;
	}
}
</style>
