export const NAV_GROUPS = [
  {
    key: 'overview',
    links: [
      { key: 'dashboard', to: { name: 'dashboard' }, label: 'Обзор', icon: 'dashboard' },
      { key: 'reports', to: { name: 'reports' }, label: 'Отчеты', icon: 'chart' },
    ],
  },
  {
    key: 'diary',
    label: 'Дневник',
    links: [
      { key: 'fuel', to: { name: 'fuel' }, label: 'Топливо', icon: 'fuel' },
      { key: 'expenses', to: { name: 'expenses' }, label: 'Все расходы', icon: 'list' },
    ],
  },
  {
    key: 'setup',
    label: 'Настройка',
    links: [
      { key: 'vehicles', to: { name: 'vehicles' }, label: 'Гараж', icon: 'car', badge: 'vehicles' },
      { key: 'categories', to: { name: 'categories' }, label: 'Категории', icon: 'tags' },
      { key: 'settings', to: { name: 'settings' }, label: 'Настройки', icon: 'settings' },
    ],
  },
]
