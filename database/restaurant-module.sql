-- ============================================
-- MODULE RESTAURANT/BAR
-- Gestion complète du restaurant et bar de l'hôtel
-- ============================================

-- Table des catégories de menu
CREATE TABLE IF NOT EXISTS menu_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    name_fr VARCHAR(100),
    name_en VARCHAR(100),
    name_es VARCHAR(100),
    type VARCHAR(20) CHECK (type IN ('food', 'beverage', 'both')) DEFAULT 'both',
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des articles du menu
CREATE TABLE IF NOT EXISTS menu_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID REFERENCES menu_categories(id) ON DELETE SET NULL,
    name VARCHAR(200) NOT NULL,
    name_fr VARCHAR(200),
    name_en VARCHAR(200),
    name_es VARCHAR(200),
    description TEXT,
    description_fr TEXT,
    description_en TEXT,
    description_es TEXT,
    price DECIMAL(10, 2) NOT NULL,
    cost DECIMAL(10, 2), -- Coût pour calcul de marge
    image_url TEXT,
    is_available BOOLEAN DEFAULT true,
    is_vegetarian BOOLEAN DEFAULT false,
    is_vegan BOOLEAN DEFAULT false,
    is_gluten_free BOOLEAN DEFAULT false,
    allergens TEXT[], -- Array des allergènes
    preparation_time INTEGER, -- En minutes
    calories INTEGER,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des tables du restaurant
CREATE TABLE IF NOT EXISTS restaurant_tables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_number VARCHAR(20) NOT NULL UNIQUE,
    capacity INTEGER NOT NULL,
    location VARCHAR(50) CHECK (location IN ('indoor', 'outdoor', 'terrace', 'bar')) DEFAULT 'indoor',
    status VARCHAR(20) CHECK (status IN ('available', 'occupied', 'reserved', 'cleaning')) DEFAULT 'available',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- Table des commandes
CREATE TABLE IF NOT EXISTS restaurant_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number VARCHAR(50) NOT NULL UNIQUE,
    table_id UUID REFERENCES restaurant_tables(id) ON DELETE SET NULL,
    guest_id UUID REFERENCES guests(id) ON DELETE SET NULL,
    room_id UUID REFERENCES rooms(id) ON DELETE SET NULL, -- Pour room service
    booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
    order_type VARCHAR(20) CHECK (order_type IN ('dine_in', 'room_service', 'takeaway', 'bar')) NOT NULL,
    status VARCHAR(20) CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready', 'served', 'completed', 'cancelled')) DEFAULT 'pending',
    subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0,
    tax DECIMAL(10, 2) NOT NULL DEFAULT 0,
    service_charge DECIMAL(10, 2) NOT NULL DEFAULT 0,
    discount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    payment_status VARCHAR(20) CHECK (payment_status IN ('unpaid', 'paid', 'charged_to_room')) DEFAULT 'unpaid',
    payment_method VARCHAR(20) CHECK (payment_method IN ('cash', 'card', 'room_charge', 'transfer')),
    special_instructions TEXT,
    server_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- Table des articles de commande
CREATE TABLE IF NOT EXISTS restaurant_order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES restaurant_orders(id) ON DELETE CASCADE,
    menu_item_id UUID REFERENCES menu_items(id) ON DELETE SET NULL,
    item_name VARCHAR(200) NOT NULL, -- Copie du nom au moment de la commande
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    special_instructions TEXT,
    status VARCHAR(20) CHECK (status IN ('pending', 'preparing', 'ready', 'served')) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des réservations de table
CREATE TABLE IF NOT EXISTS table_reservations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_id UUID REFERENCES restaurant_tables(id) ON DELETE CASCADE,
    guest_id UUID REFERENCES guests(id) ON DELETE SET NULL,
    guest_name VARCHAR(200) NOT NULL,
    guest_phone VARCHAR(20),
    guest_email VARCHAR(255),
    number_of_guests INTEGER NOT NULL,
    reservation_date DATE NOT NULL,
    reservation_time TIME NOT NULL,
    duration_minutes INTEGER DEFAULT 120,
    status VARCHAR(20) CHECK (status IN ('pending', 'confirmed', 'seated', 'completed', 'cancelled', 'no_show')) DEFAULT 'pending',
    special_requests TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table de l'inventaire (optionnel, pour gestion des stocks)
CREATE TABLE IF NOT EXISTS restaurant_inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_name VARCHAR(200) NOT NULL,
    category VARCHAR(100),
    unit VARCHAR(50) NOT NULL, -- kg, liters, pieces, etc.
    current_stock DECIMAL(10, 2) NOT NULL DEFAULT 0,
    minimum_stock DECIMAL(10, 2) NOT NULL DEFAULT 0,
    unit_cost DECIMAL(10, 2),
    supplier VARCHAR(200),
    last_restocked_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- ============================================
-- TRIGGERS
-- ============================================

CREATE TRIGGER update_menu_categories_updated_at 
BEFORE UPDATE ON menu_categories 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_menu_items_updated_at 
BEFORE UPDATE ON menu_items 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_restaurant_tables_updated_at 
BEFORE UPDATE ON restaurant_tables 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_restaurant_orders_updated_at 
BEFORE UPDATE ON restaurant_orders 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_restaurant_order_items_updated_at 
BEFORE UPDATE ON restaurant_order_items 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_table_reservations_updated_at 
BEFORE UPDATE ON table_reservations 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_restaurant_inventory_updated_at 
BEFORE UPDATE ON restaurant_inventory 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- INDEX POUR PERFORMANCE
-- ============================================

CREATE INDEX idx_menu_items_category ON menu_items(category_id);
CREATE INDEX idx_menu_items_available ON menu_items(is_available);
CREATE INDEX idx_restaurant_orders_status ON restaurant_orders(status);
CREATE INDEX idx_restaurant_orders_date ON restaurant_orders(created_at);
CREATE INDEX idx_restaurant_orders_table ON restaurant_orders(table_id);
CREATE INDEX idx_restaurant_orders_room ON restaurant_orders(room_id);
CREATE INDEX idx_order_items_order ON restaurant_order_items(order_id);
CREATE INDEX idx_table_reservations_date ON table_reservations(reservation_date);
CREATE INDEX idx_table_reservations_status ON table_reservations(status);

-- ============================================
-- DONNÉES DE TEST
-- ============================================

-- Catégories de menu
INSERT INTO menu_categories (name, name_fr, name_en, name_es, type, display_order) VALUES
('Entrées', 'Entrées', 'Starters', 'Entrantes', 'food', 1),
('Plats Principaux', 'Plats Principaux', 'Main Courses', 'Platos Principales', 'food', 2),
('Desserts', 'Desserts', 'Desserts', 'Postres', 'food', 3),
('Boissons Chaudes', 'Boissons Chaudes', 'Hot Beverages', 'Bebidas Calientes', 'beverage', 4),
('Boissons Froides', 'Boissons Froides', 'Cold Beverages', 'Bebidas Frías', 'beverage', 5),
('Cocktails', 'Cocktails', 'Cocktails', 'Cócteles', 'beverage', 6),
('Vins', 'Vins', 'Wines', 'Vinos', 'beverage', 7);


-- Articles du menu (exemples)
INSERT INTO menu_items (category_id, name, name_fr, name_en, name_es, description, description_fr, description_en, description_es, price, is_vegetarian, is_vegan, is_gluten_free, preparation_time, calories) 
SELECT 
    c.id,
    'Salade César',
    'Salade César',
    'Caesar Salad',
    'Ensalada César',
    'Laitue romaine, croûtons, parmesan, sauce César',
    'Laitue romaine, croûtons, parmesan, sauce César',
    'Romaine lettuce, croutons, parmesan, Caesar dressing',
    'Lechuga romana, picatostes, parmesano, salsa César',
    12.50,
    true,
    false,
    false,
    15,
    350
FROM menu_categories c WHERE c.name = 'Entrées';

INSERT INTO menu_items (category_id, name, name_fr, name_en, name_es, description, description_fr, description_en, description_es, price, is_vegetarian, preparation_time, calories) 
SELECT 
    c.id,
    'Soupe du Jour',
    'Soupe du Jour',
    'Soup of the Day',
    'Sopa del Día',
    'Demandez à votre serveur',
    'Demandez à votre serveur',
    'Ask your server',
    'Pregunte a su camarero',
    8.00,
    true,
    10,
    200
FROM menu_categories c WHERE c.name = 'Entrées';

INSERT INTO menu_items (category_id, name, name_fr, name_en, name_es, description, description_fr, description_en, description_es, price, preparation_time, calories) 
SELECT 
    c.id,
    'Steak Frites',
    'Steak Frites',
    'Steak and Fries',
    'Bistec con Patatas',
    'Entrecôte 300g, frites maison, sauce au choix',
    'Entrecôte 300g, frites maison, sauce au choix',
    '300g ribeye, homemade fries, choice of sauce',
    'Entrecot 300g, patatas caseras, salsa a elegir',
    28.00,
    false,
    25,
    850
FROM menu_categories c WHERE c.name = 'Plats Principaux';

INSERT INTO menu_items (category_id, name, name_fr, name_en, name_es, description, description_fr, description_en, description_es, price, is_vegetarian, is_vegan, preparation_time, calories) 
SELECT 
    c.id,
    'Risotto aux Champignons',
    'Risotto aux Champignons',
    'Mushroom Risotto',
    'Risotto de Champiñones',
    'Riz arborio, champignons sauvages, parmesan',
    'Riz arborio, champignons sauvages, parmesan',
    'Arborio rice, wild mushrooms, parmesan',
    'Arroz arborio, setas silvestres, parmesano',
    22.00,
    true,
    false,
    20,
    650
FROM menu_categories c WHERE c.name = 'Plats Principaux';

INSERT INTO menu_items (category_id, name, name_fr, name_en, name_es, description, description_fr, description_en, description_es, price, is_vegetarian, is_vegan, is_gluten_free, preparation_time, calories) 
SELECT 
    c.id,
    'Tarte Tatin',
    'Tarte Tatin',
    'Tarte Tatin',
    'Tarta Tatin',
    'Pommes caramélisées, pâte feuilletée, glace vanille',
    'Pommes caramélisées, pâte feuilletée, glace vanille',
    'Caramelized apples, puff pastry, vanilla ice cream',
    'Manzanas caramelizadas, hojaldre, helado de vainilla',
    9.50,
    true,
    false,
    false,
    15,
    420
FROM menu_categories c WHERE c.name = 'Desserts';

INSERT INTO menu_items (category_id, name, name_fr, name_en, name_es, description, description_fr, description_en, description_es, price, is_vegetarian, is_vegan, is_gluten_free, preparation_time, calories) 
SELECT 
    c.id,
    'Mousse au Chocolat',
    'Mousse au Chocolat',
    'Chocolate Mousse',
    'Mousse de Chocolate',
    'Chocolat noir 70%, crème fouettée',
    'Chocolat noir 70%, crème fouettée',
    '70% dark chocolate, whipped cream',
    'Chocolate negro 70%, nata montada',
    8.50,
    true,
    false,
    true,
    5,
    380
FROM menu_categories c WHERE c.name = 'Desserts';


-- Boissons
INSERT INTO menu_items (category_id, name, name_fr, name_en, name_es, price, is_vegetarian, is_vegan, is_gluten_free, preparation_time, calories) 
SELECT 
    c.id,
    'Café Espresso',
    'Café Espresso',
    'Espresso Coffee',
    'Café Espresso',
    3.50,
    true,
    true,
    true,
    3,
    5
FROM menu_categories c WHERE c.name = 'Boissons Chaudes';

INSERT INTO menu_items (category_id, name, name_fr, name_en, name_es, price, is_vegetarian, is_vegan, is_gluten_free, preparation_time, calories) 
SELECT 
    c.id,
    'Cappuccino',
    'Cappuccino',
    'Cappuccino',
    'Capuchino',
    4.50,
    true,
    false,
    true,
    5,
    120
FROM menu_categories c WHERE c.name = 'Boissons Chaudes';

INSERT INTO menu_items (category_id, name, name_fr, name_en, name_es, price, is_vegetarian, is_vegan, is_gluten_free, preparation_time, calories) 
SELECT 
    c.id,
    'Jus d''Orange Frais',
    'Jus d''Orange Frais',
    'Fresh Orange Juice',
    'Zumo de Naranja Natural',
    5.50,
    true,
    true,
    true,
    5,
    110
FROM menu_categories c WHERE c.name = 'Boissons Froides';

INSERT INTO menu_items (category_id, name, name_fr, name_en, name_es, description, description_fr, description_en, description_es, price, is_vegetarian, is_vegan, is_gluten_free, preparation_time, calories) 
SELECT 
    c.id,
    'Mojito',
    'Mojito',
    'Mojito',
    'Mojito',
    'Rhum blanc, menthe, citron vert, sucre de canne',
    'Rhum blanc, menthe, citron vert, sucre de canne',
    'White rum, mint, lime, cane sugar',
    'Ron blanco, menta, lima, azúcar de caña',
    12.00,
    true,
    true,
    true,
    7,
    180
FROM menu_categories c WHERE c.name = 'Cocktails';

INSERT INTO menu_items (category_id, name, name_fr, name_en, name_es, description, description_fr, description_en, description_es, price, is_vegetarian, is_vegan, is_gluten_free, preparation_time, calories) 
SELECT 
    c.id,
    'Bordeaux Rouge',
    'Bordeaux Rouge',
    'Red Bordeaux',
    'Burdeos Tinto',
    'Verre de vin rouge de Bordeaux',
    'Verre de vin rouge de Bordeaux',
    'Glass of red Bordeaux wine',
    'Copa de vino tinto de Burdeos',
    8.50,
    true,
    true,
    true,
    2,
    125
FROM menu_categories c WHERE c.name = 'Vins';

-- Tables du restaurant
INSERT INTO restaurant_tables (table_number, capacity, location, status) VALUES
('T1', 2, 'indoor', 'available'),
('T2', 2, 'indoor', 'available'),
('T3', 4, 'indoor', 'available'),
('T4', 4, 'indoor', 'available'),
('T5', 6, 'indoor', 'available'),
('T6', 6, 'indoor', 'available'),
('T7', 8, 'indoor', 'available'),
('T8', 2, 'outdoor', 'available'),
('T9', 4, 'outdoor', 'available'),
('T10', 4, 'terrace', 'available'),
('B1', 2, 'bar', 'available'),
('B2', 2, 'bar', 'available'),
('B3', 4, 'bar', 'available');

-- ============================================
-- VUES UTILES
-- ============================================

-- Vue des commandes avec détails
CREATE OR REPLACE VIEW v_restaurant_orders_details AS
SELECT 
    o.id,
    o.order_number,
    o.order_type,
    o.status,
    o.payment_status,
    o.total_amount,
    o.created_at,
    t.table_number,
    t.location as table_location,
    r.room_number,
    g.first_name || ' ' || g.last_name as guest_name,
    g.phone as guest_phone,
    u.first_name || ' ' || u.last_name as server_name,
    COUNT(oi.id) as items_count
FROM restaurant_orders o
LEFT JOIN restaurant_tables t ON o.table_id = t.id
LEFT JOIN rooms r ON o.room_id = r.id
LEFT JOIN guests g ON o.guest_id = g.id
LEFT JOIN users u ON o.server_id = u.id
LEFT JOIN restaurant_order_items oi ON o.id = oi.order_id
GROUP BY o.id, t.table_number, t.location, r.room_number, g.first_name, g.last_name, g.phone, u.first_name, u.last_name;

-- Vue du menu avec catégories
CREATE OR REPLACE VIEW v_menu_with_categories AS
SELECT 
    mi.id,
    mi.name,
    mi.name_fr,
    mi.name_en,
    mi.name_es,
    mi.description,
    mi.description_fr,
    mi.description_en,
    mi.description_es,
    mi.price,
    mi.is_available,
    mi.is_vegetarian,
    mi.is_vegan,
    mi.is_gluten_free,
    mi.preparation_time,
    mi.calories,
    mc.name as category_name,
    mc.name_fr as category_name_fr,
    mc.name_en as category_name_en,
    mc.name_es as category_name_es,
    mc.type as category_type
FROM menu_items mi
LEFT JOIN menu_categories mc ON mi.category_id = mc.id
WHERE mi.is_available = true AND mc.is_active = true
ORDER BY mc.display_order, mi.display_order;

COMMENT ON TABLE menu_categories IS 'Catégories du menu restaurant/bar';
COMMENT ON TABLE menu_items IS 'Articles du menu avec prix et détails';
COMMENT ON TABLE restaurant_tables IS 'Tables du restaurant et bar';
COMMENT ON TABLE restaurant_orders IS 'Commandes restaurant et room service';
COMMENT ON TABLE restaurant_order_items IS 'Détails des articles commandés';
COMMENT ON TABLE table_reservations IS 'Réservations de tables';
COMMENT ON TABLE restaurant_inventory IS 'Inventaire des produits restaurant';
