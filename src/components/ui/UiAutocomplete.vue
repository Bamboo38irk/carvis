<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import UiInput from '@/components/ui/UiInput.vue'

const props = defineProps({
  modelValue: { type: [String, Number], default: '' },
  options: { type: Array, default: () => [] },
  placeholder: { type: String, default: '' },
  id: { type: String, default: undefined },
})

const emit = defineEmits(['update:modelValue'])

const LIMIT = 8

const root = ref(null)
const menu = ref(null)
const open = ref(false)
const activeIndex = ref(-1)
const menuStyle = ref({})

const query = computed(() =>
  String(props.modelValue ?? '')
    .trim()
    .toLowerCase(),
)

const matches = computed(() => {
  if (!query.value) return props.options.slice(0, LIMIT)

  const starts = []
  const contains = []
  for (const option of props.options) {
    const lower = option.toLowerCase()
    if (lower.startsWith(query.value)) starts.push(option)
    else if (lower.includes(query.value)) contains.push(option)
  }
  return [...starts, ...contains].slice(0, LIMIT)
})

const visible = computed(
  () =>
    open.value &&
    matches.value.length > 0 &&
    !(matches.value.length === 1 && matches.value[0].toLowerCase() === query.value),
)

function place() {
  const box = root.value?.getBoundingClientRect()
  if (!box) return
  menuStyle.value = {
    left: `${box.left}px`,
    top: `${box.bottom + 6}px`,
    width: `${box.width}px`,
  }
}

function show() {
  place()
  open.value = true
}

function hide() {
  open.value = false
  activeIndex.value = -1
}

function pick(option) {
  emit('update:modelValue', option)
  hide()
}

function onInput(value) {
  emit('update:modelValue', value)
  activeIndex.value = -1
  show()
}

function move(step) {
  const count = matches.value.length
  if (count === 0) return
  const next = activeIndex.value + step
  activeIndex.value = next < 0 ? count - 1 : next % count
}

function onKeydown(event) {
  if (event.key === 'Escape') {
    if (open.value) event.stopPropagation()
    hide()
    return
  }

  if (event.key === 'Tab') {
    hide()
    return
  }

  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault()
    if (!open.value) {
      show()
      return
    }
    move(event.key === 'ArrowDown' ? 1 : -1)
    return
  }

  if (event.key === 'Enter' && visible.value && activeIndex.value >= 0) {
    event.preventDefault()
    pick(matches.value[activeIndex.value])
  }
}

const onDocumentPointerDown = (event) => {
  const inside = root.value?.contains(event.target) || menu.value?.contains(event.target)
  if (!inside) hide()
}

const reposition = () => {
  if (open.value) place()
}

onMounted(() => {
  document.addEventListener('pointerdown', onDocumentPointerDown)
  window.addEventListener('scroll', reposition, true)
  window.addEventListener('resize', reposition)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onDocumentPointerDown)
  window.removeEventListener('scroll', reposition, true)
  window.removeEventListener('resize', reposition)
})

watch(() => props.options, hide)
</script>

<template>
  <span
    ref="root"
    class="ac"
    role="combobox"
    aria-haspopup="listbox"
    :aria-expanded="visible"
    @focusin="show"
    @keydown="onKeydown"
  >
    <UiInput
      :id="id"
      :model-value="modelValue"
      :placeholder="placeholder"
      autocomplete="off"
      @update:model-value="onInput"
    />

    <Teleport to="body">
      <ul v-if="visible" ref="menu" class="ac__menu" :style="menuStyle" role="listbox">
        <li v-for="(option, index) in matches" :key="option" role="presentation">
          <button
            type="button"
            class="ac__option"
            :class="{ 'is-active': index === activeIndex }"
            role="option"
            :aria-selected="option === modelValue"
            tabindex="-1"
            @mouseenter="activeIndex = index"
            @click="pick(option)"
          >
            {{ option }}
          </button>
        </li>
      </ul>
    </Teleport>
  </span>
</template>

<style lang="scss" scoped>
.ac {
  display: block;
  min-width: 0;

  &__menu {
    position: fixed;
    z-index: 200;
    max-height: 268px;
    margin: 0;
    padding: $space-2;
    list-style: none;
    overflow-y: auto;
    background: var(--surface);
    border: 1px solid var(--border-strong);
    border-radius: $radius-md;
    box-shadow: var(--shadow-lg);
    @include scrollbar;
  }

  &__option {
    display: block;
    width: 100%;
    padding: $space-2 $space-3;
    border: 0;
    border-radius: $radius-xs;
    background: transparent;
    color: var(--text);
    font-family: inherit;
    font-size: $font-size-base;
    font-weight: $weight-medium;
    text-align: left;
    cursor: pointer;

    &:hover,
    &.is-active {
      background: var(--fill-gray);
    }
  }
}
</style>
