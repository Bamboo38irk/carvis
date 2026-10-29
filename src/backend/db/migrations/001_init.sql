CREATE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE users (
  id            uuid PRIMARY KEY,
  login         varchar(100) NOT NULL,
  password_hash varchar(255) NOT NULL,
  currency      varchar(3) NOT NULL DEFAULT 'RUB' CHECK (currency IN ('RUB', 'USD', 'EUR')),
  distance_unit varchar(2) NOT NULL DEFAULT 'km' CHECK (distance_unit IN ('km', 'mi')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX users_login_key ON users (lower(login));

CREATE TABLE sessions (
  token      varchar(64) PRIMARY KEY,
  user_id    uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX sessions_user_idx ON sessions (user_id);

CREATE TABLE vehicles (
  id                   uuid PRIMARY KEY,
  user_id              uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  title                varchar(255) NOT NULL,
  vehicle_type         varchar(16) NOT NULL DEFAULT 'car'
                         CHECK (vehicle_type IN ('car', 'truck', 'motorcycle', 'trailer')),
  make                 varchar(60),
  model                varchar(60),
  year                 smallint CHECK (year IS NULL OR year BETWEEN 1900 AND 2100),
  plate                varchar(20),
  vin                  varchar(32),
  fuel_grade           varchar(16) NOT NULL DEFAULT 'ai95'
                         CHECK (fuel_grade IN ('diesel', 'ai92', 'ai95', 'ai95plus', 'ai98', 'ai100', 'electric', 'gas')),
  tank_volume          numeric(6, 2) CHECK (tank_volume IS NULL OR tank_volume > 0),
  odometer             integer NOT NULL DEFAULT 0 CHECK (odometer >= 0),
  purchase_date        date,
  purchase_price       numeric(12, 2) CHECK (purchase_price IS NULL OR purchase_price > 0),
  odometer_at_purchase integer CHECK (odometer_at_purchase IS NULL OR odometer_at_purchase >= 0),
  is_primary           boolean NOT NULL DEFAULT false,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX vehicles_user_idx ON vehicles (user_id);
CREATE UNIQUE INDEX vehicles_one_primary_key ON vehicles (user_id) WHERE is_primary;

CREATE TABLE categories (
  id          uuid PRIMARY KEY,
  user_id     uuid REFERENCES users (id) ON DELETE CASCADE,
  slug        varchar(64) NOT NULL,
  name        varchar(120) NOT NULL,
  description varchar(255),
  icon        varchar(40) NOT NULL DEFAULT 'receipt',
  color       varchar(9) NOT NULL DEFAULT '#7c5cff',
  kind        varchar(16) NOT NULL DEFAULT 'generic' CHECK (kind IN ('generic', 'fuel')),
  sort_order  smallint NOT NULL DEFAULT 100,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX categories_user_slug_key ON categories (user_id, slug) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX categories_system_slug_key ON categories (slug) WHERE user_id IS NULL;

INSERT INTO categories (id, user_id, slug, name, description, icon, color, kind, sort_order) VALUES
  ('00000000-0000-4000-8000-000000000001', NULL, 'fuel', 'Топливо', 'Заправки, стоимость литра, тип горючего, объем и АЗС', 'fuel', '#d8ed5c', 'fuel', 10),
  ('00000000-0000-4000-8000-000000000002', NULL, 'service', 'Сервис', 'Ремонт, регулярное ТО, замена жидкостей и диагностика', 'wrench', '#c9b6f7', 'generic', 20),
  ('00000000-0000-4000-8000-000000000003', NULL, 'parts', 'Запчасти', 'Покупка деталей, расходников и аксессуаров', 'wheel', '#232323', 'generic', 30),
  ('00000000-0000-4000-8000-000000000004', NULL, 'fixed', 'Постоянные расходы', 'Страхование (ОСАГО/КАСКО) и штрафы', 'shield', '#a8e0b4', 'generic', 40),
  ('00000000-0000-4000-8000-000000000005', NULL, 'regular', 'Регулярные траты', 'Мойка, парковка, платные дороги и аренда гаража', 'droplet', '#9fd8f0', 'generic', 50),
  ('00000000-0000-4000-8000-000000000006', NULL, 'other', 'Другое', 'Любые нестандартные расходы с текстовыми заметками', 'receipt', '#b9b9b9', 'generic', 60);

CREATE TABLE expenses (
  id              uuid PRIMARY KEY,
  user_id         uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  vehicle_id      uuid REFERENCES vehicles (id) ON DELETE SET NULL,
  category_id     uuid NOT NULL REFERENCES categories (id) ON DELETE RESTRICT,
  amount          numeric(12, 2) NOT NULL CHECK (amount > 0),
  spent_at        date NOT NULL,
  odometer        integer CHECK (odometer IS NULL OR odometer >= 0),
  liters          numeric(8, 2) CHECK (liters IS NULL OR liters > 0),
  price_per_liter numeric(8, 2) CHECK (price_per_liter IS NULL OR price_per_liter > 0),
  fuel_grade      varchar(16)
                    CHECK (fuel_grade IS NULL OR fuel_grade IN ('diesel', 'ai92', 'ai95', 'ai95plus', 'ai98', 'ai100', 'electric', 'gas')),
  session_fee     numeric(10, 2) CHECK (session_fee IS NULL OR session_fee >= 0),
  idle_fee        numeric(10, 2) CHECK (idle_fee IS NULL OR idle_fee >= 0),
  connector       varchar(16)
                    CHECK (connector IS NULL OR connector IN ('type2', 'ccs2', 'gbt', 'chademo', 'schuko', 'other')),
  is_full_tank    boolean NOT NULL DEFAULT false,
  vendor          varchar(120),
  note            varchar(500),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX expenses_user_spent_at_idx ON expenses (user_id, spent_at DESC);
CREATE INDEX expenses_category_idx ON expenses (category_id);
CREATE INDEX expenses_vehicle_odometer_idx ON expenses (vehicle_id, odometer);

CREATE TABLE expense_items (
  id         uuid PRIMARY KEY,
  expense_id uuid NOT NULL REFERENCES expenses (id) ON DELETE CASCADE,
  kind       varchar(10) NOT NULL DEFAULT 'part' CHECK (kind IN ('part', 'labour')),
  name       varchar(160) NOT NULL,
  quantity   numeric(10, 3) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price numeric(12, 2) NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
  part_code  varchar(60),
  position   smallint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX expense_items_expense_idx ON expense_items (expense_id, position);

CREATE TABLE vehicle_passports (
  id              uuid PRIMARY KEY,
  vehicle_id      uuid NOT NULL REFERENCES vehicles (id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  token           varchar(128) NOT NULL UNIQUE,
  pin_hash        varchar(255),
  include_amounts boolean NOT NULL DEFAULT true,
  expires_at      timestamptz,
  views           integer NOT NULL DEFAULT 0,
  revoked_at      timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX vehicle_passports_vehicle_idx ON vehicle_passports (vehicle_id);
CREATE INDEX vehicle_passports_user_idx ON vehicle_passports (user_id);

CREATE TRIGGER users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER vehicles_updated_at BEFORE UPDATE ON vehicles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER categories_updated_at BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER expenses_updated_at BEFORE UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER vehicle_passports_updated_at BEFORE UPDATE ON vehicle_passports
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
