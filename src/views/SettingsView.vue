<script setup>
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'
import SectionCard from '@/components/SectionCard.vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiField from '@/components/ui/UiField.vue'
import UiSelect from '@/components/ui/UiSelect.vue'
import {
  CURRENCY_OPTIONS,
  DISTANCE_OPTIONS,
  useFormat,
} from '@/composables/useFormat.js'
import { importApi } from '@/api/index.js'
import { useDownload } from '@/composables/useDownload.js'
import { useToast } from '@/composables/useToast.js'
import { useAuthStore } from '@/stores/auth.js'
import { useCatalogStore } from '@/stores/catalog.js'
import { useExpensesStore } from '@/stores/expenses.js'

const auth = useAuthStore()
const expenses = useExpensesStore()
const catalog = useCatalogStore()
const toast = useToast()
const router = useRouter()
const { date } = useFormat()
const { downloadExport } = useDownload()

const importState = ref({ file: '', csv: '', vehicleId: '', report: null, busy: false })

const profile = ref({ currency: 'RUB', distanceUnit: 'km' })
const saving = ref(false)
const exporting = ref('')

watch(
  () => auth.user,
  (user) => {
    if (!user) return
    profile.value = {
      currency: user.currency,
      distanceUnit: user.distanceUnit,
    }
  },
  { immediate: true },
)

async function saveProfile() {
  saving.value = true
  try {
    await auth.updateProfile(profile.value)
    if (expenses.overview) await expenses.fetchOverview()
    toast.success('Настройки сохранены')
  } catch (error) {
    toast.error(error.message)
  } finally {
    saving.value = false
  }
}

async function exportData(format) {
  exporting.value = format
  try {
    await downloadExport({ format })
    toast.success('Файл выгружен')
  } catch (error) {
    toast.error(error.message)
  } finally {
    exporting.value = ''
  }
}

async function logout() {
  await auth.logout()
  router.push({ name: 'login' })
}

function pickImportFile(event) {
  const file = event.target.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = () => {
    importState.value = {
      ...importState.value,
      file: file.name,
      csv: String(reader.result ?? ''),
      report: null,
    }
  }
  reader.readAsText(file, 'utf-8')
}

async function runImport(dryRun) {
  if (!importState.value.csv) return

  importState.value.busy = true
  try {
    const report = await importApi.expenses({
      csv: importState.value.csv,
      vehicleId: importState.value.vehicleId || null,
      dryRun,
    })
    importState.value.report = report
    if (!dryRun) {
      toast.success(`Импортировано записей: ${report.imported}`)
      await Promise.all([expenses.fetchList(), expenses.fetchOverview(), catalog.refresh()])
      importState.value = { file: '', csv: '', vehicleId: '', report, busy: false }
    }
  } catch (error) {
    toast.error(error.message)
  } finally {
    importState.value.busy = false
  }
}

</script>

<template>
  <div class="page">
    <header class="page-head">
      <div class="page-head__text">
        <h1>Настройки</h1>
        <p class="page-head__subtitle">
          Аккаунт создан {{ date(auth.user?.createdAt) }}
        </p>
      </div>
      <UiButton variant="secondary" icon="logout" @click="logout">Выйти</UiButton>
    </header>

    <div class="settings-grid">
      <SectionCard class="settings-grid__wide" title="Профиль" subtitle="Валюта и единицы пробега">
        <form class="profile" @submit.prevent="saveProfile">
          <UiField label="Валюта" input-id="settings-currency">
            <UiSelect
              id="settings-currency"
              v-model="profile.currency"
              :options="CURRENCY_OPTIONS"
            />
          </UiField>

          <UiField
            label="Единицы пробега"
            hint="Данные хранятся в километрах и пересчитываются при отображении"
            input-id="settings-distance"
          >
            <UiSelect
              id="settings-distance"
              v-model="profile.distanceUnit"
              :options="DISTANCE_OPTIONS"
            />
          </UiField>

          <UiButton class="profile__submit" type="submit" icon="check" :loading="saving">
            Сохранить
          </UiButton>
        </form>
      </SectionCard>

      <SectionCard
        title="Импорт из другого приложения"
        subtitle="CSV из Drivvo, Fuelio или своей таблицы"
      >
        <div class="tools">
          <p class="tools__hint">
            Нужны колонки с датой и суммой — остальное подхватим, если найдем: пробег, литры,
            цену, вид топлива, категорию и место. Сначала посмотрите разбор, потом импортируйте.
          </p>

          <div class="tools__row tools__row--stack">
            <label class="file">
              <input type="file" accept=".csv,text/csv,text/plain" @change="pickImportFile" />
              <AppIcon name="download" :size="16" />
              {{ importState.file || 'Выбрать CSV-файл' }}
            </label>
            <UiSelect
              v-model="importState.vehicleId"
              :options="catalog.vehicleOptions"
              placeholder="Без привязки к транспорту"
            />
          </div>

          <div v-if="importState.csv" class="tools__row">
            <UiButton
              variant="secondary"
              :loading="importState.busy"
              @click="runImport(true)"
            >
              Проверить файл
            </UiButton>
            <UiButton :loading="importState.busy" @click="runImport(false)">
              Импортировать
            </UiButton>
          </div>

          <div v-if="importState.report" class="report">
            <p v-if="importState.report.dryRun">
              Готово к импорту: <b>{{ importState.report.ready }}</b> строк.
              Пропущено: {{ importState.report.skipped.length }}.
            </p>
            <p v-else>
              Импортировано: <b>{{ importState.report.imported }}</b> строк.
              Пропущено: {{ importState.report.skipped.length }}.
            </p>
            <ul v-if="importState.report.skipped.length" class="report__skipped">
              <li v-for="row in importState.report.skipped.slice(0, 5)" :key="row.line">
                Строка {{ row.line }}: {{ row.reason }}
              </li>
            </ul>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Экспорт" subtitle="CSV и Excel">
        <div class="tools">
          <p class="tools__hint">
            Выгрузите всю историю владения автомобилем — файл можно открыть на компьютере или
            передать новому владельцу при продаже.
          </p>
          <div class="tools__row">
            <UiButton
              variant="secondary"
              icon="download"
              :loading="exporting === 'csv'"
              @click="exportData('csv')"
            >
              Скачать CSV
            </UiButton>
            <UiButton
              variant="secondary"
              icon="download"
              :loading="exporting === 'xlsx'"
              @click="exportData('xlsx')"
            >
              Скачать Excel
            </UiButton>
          </div>
        </div>
      </SectionCard>
    </div>

  </div>
</template>

<style lang="scss" scoped>
.settings-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-items: stretch;
  gap: $space-5;

  @include down($bp-md) {
    grid-template-columns: minmax(0, 1fr);
    gap: $space-4;
  }

  &__wide {
    grid-column: 1 / -1;
  }
}

.profile {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: $space-4 $space-5;
  align-items: start;

  @include down($bp-md) {
    grid-template-columns: minmax(0, 1fr);
  }

  &__submit {
    justify-self: start;
  }
}

.file {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: $space-2;
  height: $control-height-lg;
  padding: 0 $space-5;
  border: 1px dashed var(--border-strong);
  border-radius: $radius-pill;
  background: var(--surface);
  color: var(--text);
  font-size: $font-size-base;
  font-weight: $weight-medium;
  cursor: pointer;

  &:hover {
    border-color: var(--text-faint);
  }

  input {
    display: none;
  }
}

.report {
  padding: $space-4;
  border-radius: $radius-md;
  background: var(--lime-soft);
  font-size: $font-size-base;
  line-height: $line-base;

  &__skipped {
    margin: $space-2 0 0;
    padding-left: 18px;
    color: var(--text-muted);
    font-size: $font-size-sm;
  }
}

.tools {
  display: flex;
  flex-direction: column;
  gap: $space-3;
  align-items: flex-start;
  height: 100%;

  &__hint {
    margin-bottom: auto;
    font-size: $font-size-base;
    color: var(--text-muted);
  }

  &__row {
    display: flex;
    gap: $space-2;
    flex-wrap: wrap;
    width: 100%;

    > * {
      flex: 1 1 140px;
    }

    &--stack > * {
      flex: 1 1 240px;
    }

    @include down($bp-sm) {
      &--stack > * {
        flex: 1 1 100%;
      }
    }
  }
}
</style>
