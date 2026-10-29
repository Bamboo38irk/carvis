<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'
import SectionCard from '@/components/SectionCard.vue'
import UiBadge from '@/components/ui/UiBadge.vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiConfirm from '@/components/ui/UiConfirm.vue'
import UiField from '@/components/ui/UiField.vue'
import UiInput from '@/components/ui/UiInput.vue'
import UiModal from '@/components/ui/UiModal.vue'
import UiSelect from '@/components/ui/UiSelect.vue'
import UiTextarea from '@/components/ui/UiTextarea.vue'
import { useFormat } from '@/composables/useFormat.js'
import { useToast } from '@/composables/useToast.js'
import { useCatalogStore } from '@/stores/catalog.js'
import { useExpensesStore } from '@/stores/expenses.js'

const catalog = useCatalogStore()
const expenses = useExpensesStore()
const toast = useToast()
const router = useRouter()
const { money, number, plural } = useFormat()

const ICON_OPTIONS = [
  'receipt', 'fuel', 'droplet', 'wheel', 'wrench', 'shield', 'parking', 'alert', 'gauge',
  'wallet', 'car', 'sparkle', 'bank', 'clock',
]

const PALETTE = [
  '#d8ed5c', '#c9b6f7', '#232323', '#a8e0b4', '#9fd8f0', '#f6c99a', '#f2a7ad', '#8fdfd0',
  '#b9b9b9',
]

const KIND_OPTIONS = [
  { value: 'generic', label: 'Обычный расход' },
  { value: 'fuel', label: 'Топливо (объем и цена)' },
]

const blank = () => ({
  name: '',
  description: '',
  icon: 'receipt',
  color: PALETTE[5],
  kind: 'generic',
})

const modalOpen = ref(false)
const editing = ref(null)
const form = ref(blank())
const saving = ref(false)
const errors = ref({})
const pendingDelete = ref(null)
const deleting = ref(false)

const totalSpent = computed(() =>
  catalog.categories.reduce((sum, category) => sum + Number(category.expensesTotal), 0),
)

const systemCategories = computed(() => catalog.categories.filter((item) => item.isSystem))
const customCategories = computed(() => catalog.categories.filter((item) => !item.isSystem))

function openCreate() {
  editing.value = null
  form.value = blank()
  errors.value = {}
  modalOpen.value = true
}

function openEdit(category) {
  editing.value = category
  form.value = {
    name: category.name,
    description: category.description ?? '',
    icon: category.icon,
    color: category.color,
    kind: category.kind,
  }
  errors.value = {}
  modalOpen.value = true
}

async function save() {
  if (!form.value.name.trim()) {
    errors.value = { name: 'Укажите название' }
    return
  }

  saving.value = true
  try {
    const payload = { ...form.value, name: form.value.name.trim() }
    if (editing.value) {
      await catalog.updateCategory(editing.value.id, payload)
      toast.success('Категория обновлена')
    } else {
      await catalog.createCategory(payload)
      toast.success('Категория создана')
    }
    modalOpen.value = false
  } catch (error) {
    errors.value = error.details ?? {}
    toast.error(error.message)
  } finally {
    saving.value = false
  }
}

async function confirmDelete() {
  deleting.value = true
  try {
    await catalog.removeCategory(pendingDelete.value.id)
    toast.success('Категория удалена')
    pendingDelete.value = null
  } catch (error) {
    toast.error(error.message)
  } finally {
    deleting.value = false
  }
}

function showExpenses(category) {
  expenses.filterBy({ categoryId: category.id })
  router.push({ name: 'expenses' })
}

onMounted(() => catalog.load())
</script>

<template>
  <div class="page">
    <header class="page-head">
      <div class="page-head__text">
        <h1>Категории</h1>
        <p class="page-head__subtitle">
          {{ catalog.categories.length }} категорий · учтено {{ money(totalSpent) }}
        </p>
      </div>
      <UiButton icon="plus" @click="openCreate">Своя категория</UiButton>
    </header>

    <SectionCard
      title="Основные категории учета"
      subtitle="Базовый набор доступен всем пользователям"
    >
      <div class="cats">
        <article
          v-for="category in systemCategories"
          :key="category.id"
          class="cat"
          :style="{ '--cat-color': category.color }"
        >
          <header class="cat__head">
            <span class="cat__icon"><AppIcon :name="category.icon" :size="20" /></span>
            <div class="cat__titles">
              <h3 class="cat__name">{{ category.name }}</h3>
              <p class="cat__meta">
                {{ number(category.expensesCount) }}
                {{ plural(category.expensesCount, ['запись', 'записи', 'записей']) }}
              </p>
            </div>
          </header>

          <p v-if="category.description" class="cat__description">{{ category.description }}</p>

          <p class="cat__total">{{ money(category.expensesTotal) }}</p>

          <div class="cat__bar">
            <div
              class="cat__bar-fill"
              :style="{
                width: `${totalSpent > 0 ? (category.expensesTotal / totalSpent) * 100 : 0}%`,
              }"
            />
          </div>

          <footer class="cat__actions">
            <UiButton variant="ghost" size="sm" icon="list" @click="showExpenses(category)">
              Записи
            </UiButton>
          </footer>
        </article>
      </div>
    </SectionCard>

    <SectionCard
      title="Мои категории"
    >
      <div v-if="customCategories.length" class="cats">
        <article
          v-for="category in customCategories"
          :key="category.id"
          class="cat"
          :style="{ '--cat-color': category.color }"
        >
          <header class="cat__head">
            <span class="cat__icon"><AppIcon :name="category.icon" :size="20" /></span>
            <div class="cat__titles">
              <h3 class="cat__name">{{ category.name }}</h3>
              <p class="cat__meta">
                {{ number(category.expensesCount) }}
                {{ plural(category.expensesCount, ['запись', 'записи', 'записей']) }}
              </p>
            </div>
            <UiBadge
              v-if="category.kind === 'fuel'"
              tone="warning"
              title="В этой категории запрашиваются литры и цена за литр"
            >
              литры
            </UiBadge>
          </header>

          <p v-if="category.description" class="cat__description">{{ category.description }}</p>

          <p class="cat__total">{{ money(category.expensesTotal) }}</p>

          <footer class="cat__actions">
            <UiButton variant="ghost" size="sm" icon="list" @click="showExpenses(category)">
              Записи
            </UiButton>
            <UiButton variant="ghost" size="sm" icon="pencil" @click="openEdit(category)">
              Изменить
            </UiButton>
            <UiButton
              variant="ghost"
              size="sm"
              icon="trash"
              :disabled="category.expensesCount > 0"
              :title="category.expensesCount > 0 ? 'В категории есть расходы' : 'Удалить'"
              @click="pendingDelete = category"
            />
          </footer>
        </article>
      </div>

      <p v-else class="empty-note">
        Своих категорий пока нет. Добавьте, например «Платные дороги» или «Аренда гаража».
      </p>
    </SectionCard>

    <UiModal
      :open="modalOpen"
      :title="editing ? 'Изменить категорию' : 'Новая категория'"
      subtitle="Группируйте траты так, как удобно именно вам."
      size="sm"
      @close="modalOpen = false"
    >
      <div class="cat-form">
        <UiField label="Название" required :error="errors.name" input-id="cat-name">
          <UiInput
            id="cat-name"
            v-model="form.name"
            placeholder="Платные дороги"
            :invalid="Boolean(errors.name)"
          />
        </UiField>

        <UiField label="Описание" input-id="cat-description">
          <UiTextarea
            id="cat-description"
            v-model="form.description"
            :rows="2"
            placeholder="Что относить к этой категории"
          />
        </UiField>

        <UiField
          label="Тип"
          hint="Для топливных категорий запрашиваются литры и цена за литр"
          input-id="cat-kind"
        >
          <UiSelect id="cat-kind" v-model="form.kind" :options="KIND_OPTIONS" />
        </UiField>

        <UiField label="Иконка">
          <div class="picker">
            <button
              v-for="icon in ICON_OPTIONS"
              :key="icon"
              type="button"
              class="picker__icon"
              :class="{ 'is-active': form.icon === icon }"
              :aria-label="icon"
              @click="form.icon = icon"
            >
              <AppIcon :name="icon" :size="16" />
            </button>
          </div>
        </UiField>

        <UiField label="Цвет">
          <div class="picker">
            <button
              v-for="color in PALETTE"
              :key="color"
              type="button"
              class="picker__color"
              :class="{ 'is-active': form.color === color }"
              :style="{ background: color }"
              :aria-label="color"
              @click="form.color = color"
            />
          </div>
        </UiField>
      </div>

      <template #footer>
        <UiButton variant="secondary" @click="modalOpen = false">Отмена</UiButton>
        <UiButton :loading="saving" icon="check" @click="save">
          {{ editing ? 'Сохранить' : 'Создать' }}
        </UiButton>
      </template>
    </UiModal>

    <UiConfirm
      :open="Boolean(pendingDelete)"
      title="Удалить категорию?"
      :message="pendingDelete ? `«${pendingDelete.name}» будет удалена из списка.` : ''"
      :loading="deleting"
      @cancel="pendingDelete = null"
      @confirm="confirmDelete"
    />
  </div>
</template>

<style lang="scss" scoped>
.cats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: $space-4;

  @include down($bp-lg) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @include down($bp-sm) {
    grid-template-columns: minmax(0, 1fr);
  }
}

.cat {
  display: flex;
  flex-direction: column;
  gap: $space-3;
  padding: $space-4;
  border: 1px solid var(--border);
  border-radius: $radius-md;
  background: var(--surface);
  transition: border-color 0.16s ease, box-shadow 0.16s ease;

  &:hover {
    border-color: var(--border-strong);
    box-shadow: var(--shadow-md);
  }

  &__head {
    display: flex;
    align-items: center;
    gap: $space-3;
  }

  &__icon {
    display: grid;
    place-items: center;
    width: 42px;
    height: 42px;
    flex: none;
    border-radius: $radius-md;
    background: color-mix(in srgb, var(--cat-color) 12%, transparent);
    color: var(--cat-color);
  }

  &__titles {
    flex: 1;
    min-width: 0;
  }

  &__name {
    @include truncate;
  }

  &__meta {
    font-size: $font-size-sm;
    color: var(--text-soft);
  }

  &__description {
    font-size: $font-size-sm;
    color: var(--text-muted);
  }

  &__total {
    font-size: $font-size-xl;
    line-height: $line-xl;
    font-weight: $weight-bold;
    margin-top: auto;
  }

  &__bar {
    height: 6px;
    border-radius: $radius-pill;
    background: var(--fill-gray-strong);
    overflow: hidden;
  }

  &__bar-fill {
    height: 100%;
    background: var(--cat-color);
    border-radius: $radius-pill;
    transition: width 0.4s ease;
  }

  &__actions {
    display: flex;
    align-items: center;
    gap: 2px;
    padding-top: $space-3;
    border-top: 1px solid var(--border);
  }
}

.empty-note {
  color: var(--text-muted);
}

.cat-form {
  display: flex;
  flex-direction: column;
  gap: $space-4;
}

.picker {
  display: flex;
  flex-wrap: wrap;
  gap: $space-2;

  &__icon {
    display: grid;
    place-items: center;
    width: 42px;
    height: 42px;
    border: 1px solid var(--border-input);
    border-radius: $radius-md;
    background: var(--surface);
    color: var(--text-soft);
    cursor: pointer;

    &:hover {
      color: var(--text);
    }

    &.is-active {
      border-color: var(--accent);
      background: var(--accent-soft);
      color: var(--accent-strong);
    }
  }

  &__color {
    width: 30px;
    height: 30px;
    border: 2px solid transparent;
    border-radius: 50%;
    cursor: pointer;
    box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.08);

    &.is-active {
      border-color: var(--text);
    }
  }
}
</style>
