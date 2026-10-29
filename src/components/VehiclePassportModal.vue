<script setup>
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiCheckbox from '@/components/ui/UiCheckbox.vue'
import UiField from '@/components/ui/UiField.vue'
import UiInput from '@/components/ui/UiInput.vue'
import UiModal from '@/components/ui/UiModal.vue'
import UiSelect from '@/components/ui/UiSelect.vue'
import { passportsApi } from '@/api/index.js'
import { useFormat } from '@/composables/useFormat.js'
import { useToast } from '@/composables/useToast.js'

const props = defineProps({
  open: { type: Boolean, default: false },
  vehicle: { type: Object, default: null },
})

const emit = defineEmits(['close'])

const router = useRouter()
const toast = useToast()
const { date, number } = useFormat()

const EXPIRY_OPTIONS = [
  { value: '7', label: '7 дней' },
  { value: '30', label: '30 дней' },
  { value: '90', label: '90 дней' },
  { value: '', label: 'Без срока' },
]

const form = ref({ pin: '', includeAmounts: true, expiresInDays: '30' })
const passports = ref([])
const creating = ref(false)
const errors = ref({})

const vehiclePassports = computed(() =>
  passports.value.filter((item) => item.vehicleId === props.vehicle?.id),
)

const linkFor = (token) =>
  new URL(router.resolve({ name: 'passport', params: { token } }).href, window.location.href).href

async function load() {
  try {
    passports.value = await passportsApi.list()
  } catch (error) {
    toast.error(error.message)
  }
}

watch(
  () => props.open,
  (open) => {
    if (open) {
      errors.value = {}
      form.value = { pin: '', includeAmounts: true, expiresInDays: '30' }
      load()
    }
  },
)

async function create() {
  errors.value = {}
  creating.value = true
  try {
    await passportsApi.create({
      vehicleId: props.vehicle.id,
      pin: form.value.pin.trim() || null,
      includeAmounts: form.value.includeAmounts,
      expiresInDays: form.value.expiresInDays === '' ? null : Number(form.value.expiresInDays),
    })
    toast.success('Ссылка создана')
    await load()
  } catch (error) {
    errors.value = error.details ?? {}
    toast.error(error.message)
  } finally {
    creating.value = false
  }
}

async function revoke(passport) {
  try {
    await passportsApi.revoke(passport.id)
    toast.success('Доступ отозван')
    await load()
  } catch (error) {
    toast.error(error.message)
  }
}

async function copy(passport) {
  try {
    await navigator.clipboard.writeText(linkFor(passport.token))
    toast.success('Ссылка скопирована')
  } catch {
    toast.error('Не удалось скопировать ссылку')
  }
}
</script>

<template>
  <UiModal
    :open="open"
    title="Предпродажный паспорт"
    :subtitle="vehicle ? vehicle.title : ''"
    @close="emit('close')"
  >
    <div class="passport">
      <p class="passport__lead">
        Ссылка открывает страницу с историей обслуживания и печатной версией для PDF.
        Доступ можно закрыть в любой момент.
      </p>

      <div class="passport__form">
        <UiField
          label="PIN-код"
          hint="Необязательно: 4–8 цифр"
          :error="errors.pin"
          input-id="passport-pin"
        >
          <UiInput
            id="passport-pin"
            v-model="form.pin"
            placeholder="1234"
            :invalid="Boolean(errors.pin)"
          />
        </UiField>

        <UiField label="Срок действия" input-id="passport-expiry">
          <UiSelect
            id="passport-expiry"
            v-model="form.expiresInDays"
            :options="EXPIRY_OPTIONS"
          />
        </UiField>
      </div>

      <UiCheckbox
        v-model="form.includeAmounts"
        label="Показывать суммы расходов"
        hint="Выключите, если хотите показать только состав работ и пробег"
      />

      <UiButton icon="link" :loading="creating" @click="create">Создать ссылку</UiButton>

      <ul v-if="vehiclePassports.length" class="passport__list">
        <li
          v-for="passport in vehiclePassports"
          :key="passport.id"
          class="passport__item"
          :class="{ 'is-revoked': passport.revokedAt }"
        >
          <div class="passport__info">
            <p class="passport__link">{{ linkFor(passport.token) }}</p>
            <p class="passport__meta">
              <span v-if="passport.revokedAt">отозвана {{ date(passport.revokedAt) }}</span>
              <span v-else-if="passport.expiresAt">до {{ date(passport.expiresAt) }}</span>
              <span v-else>без срока</span>
              <span v-if="passport.hasPin"> · PIN</span>
              <span v-if="!passport.includeAmounts"> · без сумм</span>
              <span> · открытий: {{ number(passport.views) }}</span>
            </p>
          </div>
          <div class="passport__actions">
            <UiButton
              v-if="!passport.revokedAt"
              variant="ghost"
              size="sm"
              icon="copy"
              @click="copy(passport)"
            />
            <a
              v-if="!passport.revokedAt"
              class="passport__open"
              :href="linkFor(passport.token)"
              target="_blank"
              rel="noreferrer"
              title="Открыть"
            >
              <AppIcon name="chevron-right" :size="15" />
            </a>
            <UiButton
              v-if="!passport.revokedAt"
              variant="ghost"
              size="sm"
              icon="trash"
              @click="revoke(passport)"
            />
          </div>
        </li>
      </ul>
    </div>

    <template #footer>
      <UiButton variant="secondary" @click="emit('close')">Закрыть</UiButton>
    </template>
  </UiModal>
</template>

<style lang="scss" scoped>
.passport {
  display: flex;
  flex-direction: column;
  gap: $space-4;

  &__lead {
    color: var(--text-muted);
    font-size: $font-size-base;
  }

  &__form {
    @include form-row($space-4);
  }

  &__list {
    display: flex;
    flex-direction: column;
    gap: $space-2;
    padding-top: $space-4;
    border-top: 1px solid var(--border);
  }

  &__item {
    display: flex;
    align-items: center;
    gap: $space-3;
    padding: $space-3;
    border: 1px solid var(--border);
    border-radius: $radius-md;

    &.is-revoked {
      opacity: 0.55;
    }
  }

  &__info {
    flex: 1;
    min-width: 0;
  }

  &__link {
    font-size: $font-size-sm;
    font-weight: $weight-medium;
    @include truncate;
  }

  &__meta {
    font-size: $font-size-sm;
    color: var(--text-soft);
  }

  &__actions {
    display: flex;
    align-items: center;
    gap: 2px;
  }

  &__open {
    display: grid;
    place-items: center;
    width: 30px;
    height: 30px;
    border-radius: $radius-sm;
    color: var(--text-muted);

    &:hover {
      background: var(--surface-3);
      color: var(--text);
      text-decoration: none;
    }
  }
}
</style>
