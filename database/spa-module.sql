-- ============================================
-- MODULE GESTION DE SPA
-- Système complet de gestion de spa et bien-être
-- ============================================

-- Table des catégories de services spa
CREATE TABLE IF NOT EXISTS spa_service_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    name_fr VARCHAR(100),
    name_en VARCHAR(100),
    name_es VARCHAR(100),
    description TEXT,
    icon VARCHAR(50), -- massage, facial, body, wellness, beauty
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des services spa
CREATE TABLE IF NOT EXISTS spa_services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID REFERENCES spa_service_categories(id) ON DELETE SET NULL,
    name VARCHAR(200) NOT NULL,
    name_fr VARCHAR(200),
    name_en VARCHAR(200),
    name_es VARCHAR(200),
    description TEXT,
    description_fr TEXT,
    description_en TEXT,
    description_es TEXT,
    duration INTEGER NOT NULL, -- Durée en minutes
    price DECIMAL(10, 2) NOT NULL,
    image_url TEXT,
    benefits TEXT[], -- Bénéfices du service
    is_active BOOLEAN DEFAULT true,
    requires_therapist BOOLEAN DEFAULT true,
    max_persons INTEGER DEFAULT 1, -- Pour services de groupe
    preparation_time INTEGER DEFAULT 15, -- Temps de préparation en minutes
    cleanup_time INTEGER DEFAULT 15, -- Temps de nettoyage en minutes
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des thérapeutes/praticiens
CREATE TABLE IF NOT EXISTS spa_therapists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    specialties TEXT[], -- Spécialités (massage, facial, etc.)
    bio TEXT,
    photo_url TEXT,
    is_active BOOLEAN DEFAULT true,
    hire_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- Table des salles de traitement
CREATE TABLE IF NOT EXISTS spa_treatment_rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    room_number VARCHAR(20),
    capacity INTEGER DEFAULT 1,
    equipment TEXT[], -- Équipements disponibles
    status VARCHAR(20) CHECK (status IN ('available', 'occupied', 'cleaning', 'maintenance')) DEFAULT 'available',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des réservations spa
CREATE TABLE IF NOT EXISTS spa_bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_reference VARCHAR(20) NOT NULL UNIQUE, -- SPA-YYYYMMDD-XXXX
    
    -- Client
    guest_id UUID REFERENCES guests(id) ON DELETE CASCADE,
    room_booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL, -- Si client de l'hôtel
    guest_name VARCHAR(200), -- Pour clients externes
    guest_email VARCHAR(255),
    guest_phone VARCHAR(20),
    
    -- Service
    service_id UUID REFERENCES spa_services(id) ON DELETE RESTRICT NOT NULL,
    therapist_id UUID REFERENCES spa_therapists(id) ON DELETE SET NULL,
    treatment_room_id UUID REFERENCES spa_treatment_rooms(id) ON DELETE SET NULL,
    
    -- Date et heure
    booking_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    duration INTEGER NOT NULL, -- Durée totale en minutes
    
    -- Tarification
    base_price DECIMAL(10, 2) NOT NULL,
    discount_amount DECIMAL(10, 2) DEFAULT 0,
    tax_amount DECIMAL(10, 2) DEFAULT 0,
    total_amount DECIMAL(10, 2) NOT NULL,
    
    -- Statut
    status VARCHAR(20) CHECK (status IN ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show')) DEFAULT 'pending',
    payment_status VARCHAR(20) CHECK (payment_status IN ('unpaid', 'paid', 'refunded')) DEFAULT 'unpaid',
    
    -- Informations supplémentaires
    special_requests TEXT,
    notes TEXT, -- Notes du thérapeute
    cancellation_reason TEXT,
    cancelled_at TIMESTAMP,
    
    -- Traçabilité
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des horaires de travail des thérapeutes
CREATE TABLE IF NOT EXISTS spa_therapist_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    therapist_id UUID REFERENCES spa_therapists(id) ON DELETE CASCADE NOT NULL,
    day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6) NOT NULL, -- 0=Dimanche, 6=Samedi
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(therapist_id, day_of_week)
);

-- Table des congés/absences des thérapeutes
CREATE TABLE IF NOT EXISTS spa_therapist_time_off (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    therapist_id UUID REFERENCES spa_therapists(id) ON DELETE CASCADE NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason VARCHAR(100),
    is_approved BOOLEAN DEFAULT false,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- Table des produits spa (vente au détail)
CREATE TABLE IF NOT EXISTS spa_products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    name_fr VARCHAR(200),
    name_en VARCHAR(200),
    name_es VARCHAR(200),
    description TEXT,
    brand VARCHAR(100),
    category VARCHAR(100), -- skincare, haircare, aromatherapy, etc.
    price DECIMAL(10, 2) NOT NULL,
    cost DECIMAL(10, 2), -- Prix d'achat
    stock_quantity INTEGER DEFAULT 0,
    min_stock_level INTEGER DEFAULT 5,
    image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des ventes de produits
CREATE TABLE IF NOT EXISTS spa_product_sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES spa_products(id) ON DELETE RESTRICT NOT NULL,
    spa_booking_id UUID REFERENCES spa_bookings(id) ON DELETE SET NULL,
    guest_id UUID REFERENCES guests(id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(10, 2) NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    sold_by UUID REFERENCES users(id) ON DELETE SET NULL,
    sale_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des packages spa
CREATE TABLE IF NOT EXISTS spa_packages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    name_fr VARCHAR(200),
    name_en VARCHAR(200),
    name_es VARCHAR(200),
    description TEXT,
    description_fr TEXT,
    description_en TEXT,
    description_es TEXT,
    total_duration INTEGER NOT NULL, -- Durée totale en minutes
    regular_price DECIMAL(10, 2) NOT NULL, -- Prix normal (somme des services)
    package_price DECIMAL(10, 2) NOT NULL, -- Prix du package (réduit)
    savings DECIMAL(10, 2) GENERATED ALWAYS AS (regular_price - package_price) STORED,
    image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    valid_from DATE,
    valid_until DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table de liaison package-services
CREATE TABLE IF NOT EXISTS spa_package_services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    package_id UUID REFERENCES spa_packages(id) ON DELETE CASCADE NOT NULL,
    service_id UUID REFERENCES spa_services(id) ON DELETE CASCADE NOT NULL,
    service_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(package_id, service_id)
);

-- Table des avis clients sur les services spa
CREATE TABLE IF NOT EXISTS spa_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    spa_booking_id UUID REFERENCES spa_bookings(id) ON DELETE CASCADE NOT NULL,
    guest_id UUID REFERENCES guests(id) ON DELETE SET NULL,
    service_id UUID REFERENCES spa_services(id) ON DELETE SET NULL,
    therapist_id UUID REFERENCES spa_therapists(id) ON DELETE SET NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
    comment TEXT,
    is_published BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- ============================================
-- TRIGGERS
-- ============================================

CREATE TRIGGER update_spa_service_categories_updated_at 
BEFORE UPDATE ON spa_service_categories 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_spa_services_updated_at 
BEFORE UPDATE ON spa_services 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_spa_therapists_updated_at 
BEFORE UPDATE ON spa_therapists 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_spa_treatment_rooms_updated_at 
BEFORE UPDATE ON spa_treatment_rooms 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_spa_bookings_updated_at 
BEFORE UPDATE ON spa_bookings 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_spa_therapist_schedules_updated_at 
BEFORE UPDATE ON spa_therapist_schedules 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_spa_therapist_time_off_updated_at 
BEFORE UPDATE ON spa_therapist_time_off 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_spa_products_updated_at 
BEFORE UPDATE ON spa_products 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_spa_packages_updated_at 
BEFORE UPDATE ON spa_packages 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_spa_reviews_updated_at 
BEFORE UPDATE ON spa_reviews 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- INDEX POUR PERFORMANCE
-- ============================================

CREATE INDEX idx_spa_services_category ON spa_services(category_id);
CREATE INDEX idx_spa_services_active ON spa_services(is_active);
CREATE INDEX idx_spa_bookings_date ON spa_bookings(booking_date);
CREATE INDEX idx_spa_bookings_status ON spa_bookings(status);
CREATE INDEX idx_spa_bookings_guest ON spa_bookings(guest_id);
CREATE INDEX idx_spa_bookings_therapist ON spa_bookings(therapist_id);
CREATE INDEX idx_spa_bookings_service ON spa_bookings(service_id);
CREATE INDEX idx_spa_bookings_reference ON spa_bookings(booking_reference);
CREATE INDEX idx_spa_therapist_schedules_therapist ON spa_therapist_schedules(therapist_id);
CREATE INDEX idx_spa_therapist_time_off_dates ON spa_therapist_time_off(therapist_id, start_date, end_date);
CREATE INDEX idx_spa_products_active ON spa_products(is_active);
CREATE INDEX idx_spa_product_sales_date ON spa_product_sales(sale_date);

-- ============================================
-- FONCTIONS UTILES
-- ============================================

-- Fonction pour générer une référence de réservation spa unique
CREATE OR REPLACE FUNCTION generate_spa_booking_reference()
RETURNS VARCHAR(20) AS $$
DECLARE
    ref VARCHAR(20);
    exists BOOLEAN;
BEGIN
    LOOP
        ref := 'SPA-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || 
               LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
        
        SELECT EXISTS(SELECT 1 FROM spa_bookings WHERE booking_reference = ref) INTO exists;
        
        EXIT WHEN NOT exists;
    END LOOP;
    
    RETURN ref;
END;
$$ LANGUAGE plpgsql;


-- Fonction pour vérifier la disponibilité d'un thérapeute
CREATE OR REPLACE FUNCTION check_therapist_availability(
    p_therapist_id UUID,
    p_date DATE,
    p_start_time TIME,
    p_end_time TIME,
    p_exclude_booking_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    is_available BOOLEAN;
    day_of_week INTEGER;
    has_schedule BOOLEAN;
    is_on_time_off BOOLEAN;
    has_conflict BOOLEAN;
BEGIN
    -- Vérifier si le thérapeute est actif
    SELECT is_active INTO is_available FROM spa_therapists WHERE id = p_therapist_id;
    IF NOT is_available THEN
        RETURN FALSE;
    END IF;
    
    -- Obtenir le jour de la semaine (0=Dimanche, 6=Samedi)
    day_of_week := EXTRACT(DOW FROM p_date);
    
    -- Vérifier si le thérapeute travaille ce jour
    SELECT EXISTS(
        SELECT 1 FROM spa_therapist_schedules 
        WHERE therapist_id = p_therapist_id 
        AND day_of_week = day_of_week
        AND is_active = true
        AND start_time <= p_start_time 
        AND end_time >= p_end_time
    ) INTO has_schedule;
    
    IF NOT has_schedule THEN
        RETURN FALSE;
    END IF;
    
    -- Vérifier si le thérapeute est en congé
    SELECT EXISTS(
        SELECT 1 FROM spa_therapist_time_off 
        WHERE therapist_id = p_therapist_id 
        AND p_date BETWEEN start_date AND end_date
        AND is_approved = true
    ) INTO is_on_time_off;
    
    IF is_on_time_off THEN
        RETURN FALSE;
    END IF;
    
    -- Vérifier les conflits avec d'autres réservations
    SELECT EXISTS(
        SELECT 1 FROM spa_bookings 
        WHERE therapist_id = p_therapist_id 
        AND booking_date = p_date
        AND status IN ('confirmed', 'in_progress')
        AND (id != p_exclude_booking_id OR p_exclude_booking_id IS NULL)
        AND (
            (start_time < p_end_time AND end_time > p_start_time)
        )
    ) INTO has_conflict;
    
    RETURN NOT has_conflict;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour calculer le revenu spa par période
CREATE OR REPLACE FUNCTION get_spa_revenue(
    p_start_date DATE,
    p_end_date DATE
)
RETURNS TABLE (
    total_bookings BIGINT,
    total_revenue DECIMAL,
    product_sales DECIMAL,
    total DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(DISTINCT sb.id)::BIGINT as total_bookings,
        COALESCE(SUM(sb.total_amount), 0) as total_revenue,
        COALESCE(SUM(sps.total_amount), 0) as product_sales,
        COALESCE(SUM(sb.total_amount), 0) + COALESCE(SUM(sps.total_amount), 0) as total
    FROM spa_bookings sb
    LEFT JOIN spa_product_sales sps ON sps.sale_date::DATE BETWEEN p_start_date AND p_end_date
    WHERE sb.booking_date BETWEEN p_start_date AND p_end_date
    AND sb.status IN ('completed', 'in_progress');
END;
$$ LANGUAGE plpgsql;


-- ============================================
-- DONNÉES INITIALES
-- ============================================

-- Catégories de services
INSERT INTO spa_service_categories (name, name_fr, name_en, name_es, description, icon, display_order) VALUES
('Massages', 'Massages', 'Massages', 'Masajes', 'Massages thérapeutiques et relaxants', 'massage', 1),
('Soins du visage', 'Soins du visage', 'Facial Treatments', 'Tratamientos faciales', 'Soins du visage et de la peau', 'facial', 2),
('Soins du corps', 'Soins du corps', 'Body Treatments', 'Tratamientos corporales', 'Gommages, enveloppements et soins corporels', 'body', 3),
('Bien-être', 'Bien-être', 'Wellness', 'Bienestar', 'Yoga, méditation et relaxation', 'wellness', 4),
('Beauté', 'Beauté', 'Beauty', 'Belleza', 'Manucure, pédicure et soins esthétiques', 'beauty', 5);

-- Services spa (exemples)
INSERT INTO spa_services (category_id, name, name_fr, name_en, name_es, description, description_fr, duration, price, benefits, is_active) VALUES
(
    (SELECT id FROM spa_service_categories WHERE name = 'Massages' LIMIT 1),
    'Massage Suédois',
    'Massage Suédois',
    'Swedish Massage',
    'Masaje Sueco',
    'Massage relaxant aux huiles essentielles',
    'Massage relaxant aux huiles essentielles pour détendre les muscles et apaiser l''esprit',
    60,
    80.00,
    ARRAY['Relaxation profonde', 'Soulagement des tensions', 'Amélioration de la circulation'],
    true
),
(
    (SELECT id FROM spa_service_categories WHERE name = 'Massages' LIMIT 1),
    'Massage Deep Tissue',
    'Massage Deep Tissue',
    'Deep Tissue Massage',
    'Masaje de Tejido Profundo',
    'Massage thérapeutique en profondeur',
    'Massage thérapeutique ciblant les couches profondes des muscles',
    90,
    110.00,
    ARRAY['Soulagement des douleurs chroniques', 'Libération des tensions profondes', 'Amélioration de la posture'],
    true
),
(
    (SELECT id FROM spa_service_categories WHERE name = 'Massages' LIMIT 1),
    'Massage aux Pierres Chaudes',
    'Massage aux Pierres Chaudes',
    'Hot Stone Massage',
    'Masaje con Piedras Calientes',
    'Massage relaxant avec pierres volcaniques chaudes',
    'Massage relaxant utilisant des pierres volcaniques chaudes pour détendre les muscles',
    75,
    95.00,
    ARRAY['Relaxation intense', 'Amélioration de la circulation', 'Détoxification'],
    true
),
(
    (SELECT id FROM spa_service_categories WHERE name = 'Soins du visage' LIMIT 1),
    'Soin du Visage Hydratant',
    'Soin du Visage Hydratant',
    'Hydrating Facial',
    'Facial Hidratante',
    'Soin hydratant pour tous types de peau',
    'Soin du visage hydratant en profondeur pour tous types de peau',
    60,
    75.00,
    ARRAY['Hydratation intense', 'Éclat du teint', 'Peau douce et souple'],
    true
),
(
    (SELECT id FROM spa_service_categories WHERE name = 'Soins du visage' LIMIT 1),
    'Soin Anti-Âge',
    'Soin Anti-Âge',
    'Anti-Aging Facial',
    'Facial Anti-Edad',
    'Soin anti-rides et raffermissant',
    'Soin du visage anti-âge avec actifs raffermissants et anti-rides',
    90,
    120.00,
    ARRAY['Réduction des rides', 'Raffermissement', 'Éclat de jeunesse'],
    true
),
(
    (SELECT id FROM spa_service_categories WHERE name = 'Soins du corps' LIMIT 1),
    'Gommage Corps Complet',
    'Gommage Corps Complet',
    'Full Body Scrub',
    'Exfoliación Corporal Completa',
    'Exfoliation complète du corps',
    'Gommage exfoliant pour une peau douce et renouvelée',
    45,
    65.00,
    ARRAY['Peau douce', 'Élimination des cellules mortes', 'Préparation au bronzage'],
    true
),
(
    (SELECT id FROM spa_service_categories WHERE name = 'Soins du corps' LIMIT 1),
    'Enveloppement Détox',
    'Enveloppement Détox',
    'Detox Body Wrap',
    'Envoltura Corporal Detox',
    'Enveloppement détoxifiant aux algues',
    'Enveloppement corporel détoxifiant et amincissant aux algues marines',
    60,
    85.00,
    ARRAY['Détoxification', 'Raffermissement', 'Peau lisse'],
    true
),
(
    (SELECT id FROM spa_service_categories WHERE name = 'Bien-être' LIMIT 1),
    'Séance de Yoga Privée',
    'Séance de Yoga Privée',
    'Private Yoga Session',
    'Sesión de Yoga Privada',
    'Cours de yoga personnalisé',
    'Séance de yoga privée adaptée à votre niveau',
    60,
    70.00,
    ARRAY['Flexibilité', 'Équilibre', 'Paix intérieure'],
    true
),
(
    (SELECT id FROM spa_service_categories WHERE name = 'Beauté' LIMIT 1),
    'Manucure Spa',
    'Manucure Spa',
    'Spa Manicure',
    'Manicura Spa',
    'Manucure complète avec soin des mains',
    'Manucure spa avec gommage, massage et vernis',
    45,
    40.00,
    ARRAY['Mains soignées', 'Ongles parfaits', 'Relaxation'],
    true
),
(
    (SELECT id FROM spa_service_categories WHERE name = 'Beauté' LIMIT 1),
    'Pédicure Spa',
    'Pédicure Spa',
    'Spa Pedicure',
    'Pedicura Spa',
    'Pédicure complète avec soin des pieds',
    'Pédicure spa avec bain, gommage, massage et vernis',
    60,
    50.00,
    ARRAY['Pieds doux', 'Ongles soignés', 'Détente'],
    true
);


-- Thérapeutes (exemples)
INSERT INTO spa_therapists (first_name, last_name, email, phone, specialties, bio, is_active, hire_date) VALUES
('Sophie', 'Martin', 'sophie.martin@spa.com', '+33612345678', ARRAY['Massage', 'Aromathérapie'], 'Thérapeute certifiée avec 10 ans d''expérience en massages thérapeutiques', true, '2020-01-15'),
('Lucas', 'Dubois', 'lucas.dubois@spa.com', '+33612345679', ARRAY['Massage', 'Réflexologie'], 'Spécialiste en massage deep tissue et réflexologie plantaire', true, '2021-03-20'),
('Emma', 'Bernard', 'emma.bernard@spa.com', '+33612345680', ARRAY['Soins du visage', 'Beauté'], 'Esthéticienne diplômée spécialisée en soins anti-âge', true, '2019-06-10'),
('Thomas', 'Petit', 'thomas.petit@spa.com', '+33612345681', ARRAY['Yoga', 'Méditation'], 'Professeur de yoga certifié et coach en méditation', true, '2022-01-05');

-- Horaires de travail des thérapeutes (Lundi à Samedi, 9h-18h)
INSERT INTO spa_therapist_schedules (therapist_id, day_of_week, start_time, end_time, is_active)
SELECT 
    t.id,
    d.day,
    '09:00'::TIME,
    '18:00'::TIME,
    true
FROM spa_therapists t
CROSS JOIN (SELECT generate_series(1, 6) as day) d
WHERE t.is_active = true;

-- Salles de traitement
INSERT INTO spa_treatment_rooms (name, room_number, capacity, equipment, status, is_active) VALUES
('Salle Zen', 'S1', 1, ARRAY['Table de massage', 'Diffuseur d''huiles', 'Musique relaxante'], 'available', true),
('Salle Harmonie', 'S2', 1, ARRAY['Table de massage', 'Pierres chaudes', 'Serviettes chauffantes'], 'available', true),
('Salle Sérénité', 'S3', 2, ARRAY['2 Tables de massage', 'Diffuseur', 'Bougies'], 'available', true),
('Salle Beauté', 'S4', 1, ARRAY['Fauteuil esthétique', 'Vapeur faciale', 'Lampe LED'], 'available', true),
('Studio Yoga', 'S5', 10, ARRAY['Tapis de yoga', 'Blocs', 'Sangles', 'Coussins'], 'available', true);

-- Produits spa
INSERT INTO spa_products (name, name_fr, name_en, name_es, description, brand, category, price, cost, stock_quantity, min_stock_level, is_active) VALUES
('Huile de Massage Relaxante', 'Huile de Massage Relaxante', 'Relaxing Massage Oil', 'Aceite de Masaje Relajante', 'Huile de massage aux huiles essentielles de lavande', 'Spa Essentials', 'aromatherapy', 35.00, 15.00, 20, 5, true),
('Crème Hydratante Visage', 'Crème Hydratante Visage', 'Face Moisturizer', 'Crema Hidratante Facial', 'Crème hydratante pour tous types de peau', 'Derma Care', 'skincare', 45.00, 20.00, 15, 5, true),
('Gommage Corps Exfoliant', 'Gommage Corps Exfoliant', 'Body Scrub', 'Exfoliante Corporal', 'Gommage exfoliant au sel de mer', 'Body Bliss', 'skincare', 30.00, 12.00, 25, 5, true),
('Bougie Aromathérapie', 'Bougie Aromathérapie', 'Aromatherapy Candle', 'Vela de Aromaterapia', 'Bougie parfumée aux huiles essentielles', 'Zen Moments', 'aromatherapy', 25.00, 10.00, 30, 10, true),
('Sérum Anti-Âge', 'Sérum Anti-Âge', 'Anti-Aging Serum', 'Sérum Anti-Edad', 'Sérum concentré anti-rides', 'Age Defying', 'skincare', 65.00, 30.00, 10, 3, true);

-- Packages spa
INSERT INTO spa_packages (name, name_fr, name_en, name_es, description, description_fr, total_duration, regular_price, package_price, is_active) VALUES
(
    'Package Détente Complète',
    'Package Détente Complète',
    'Complete Relaxation Package',
    'Paquete de Relajación Completa',
    'Massage + Soin du visage + Manucure',
    'Une journée de détente complète avec massage suédois, soin du visage hydratant et manucure spa',
    165,
    195.00,
    165.00,
    true
),
(
    'Package Bien-Être',
    'Package Bien-Être',
    'Wellness Package',
    'Paquete de Bienestar',
    'Massage + Gommage + Enveloppement',
    'Package bien-être complet avec massage, gommage corps et enveloppement détox',
    165,
    230.00,
    195.00,
    true
),
(
    'Package Beauté',
    'Package Beauté',
    'Beauty Package',
    'Paquete de Belleza',
    'Soin visage + Manucure + Pédicure',
    'Package beauté avec soin du visage, manucure et pédicure spa',
    165,
    165.00,
    140.00,
    true
);

-- Liaison packages-services
INSERT INTO spa_package_services (package_id, service_id, service_order)
SELECT 
    (SELECT id FROM spa_packages WHERE name_fr = 'Package Détente Complète'),
    id,
    ROW_NUMBER() OVER (ORDER BY name)
FROM spa_services 
WHERE name IN ('Massage Suédois', 'Soin du Visage Hydratant', 'Manucure Spa');

INSERT INTO spa_package_services (package_id, service_id, service_order)
SELECT 
    (SELECT id FROM spa_packages WHERE name_fr = 'Package Bien-Être'),
    id,
    ROW_NUMBER() OVER (ORDER BY name)
FROM spa_services 
WHERE name IN ('Massage Suédois', 'Gommage Corps Complet', 'Enveloppement Détox');

INSERT INTO spa_package_services (package_id, service_id, service_order)
SELECT 
    (SELECT id FROM spa_packages WHERE name_fr = 'Package Beauté'),
    id,
    ROW_NUMBER() OVER (ORDER BY name)
FROM spa_services 
WHERE name IN ('Soin du Visage Hydratant', 'Manucure Spa', 'Pédicure Spa');

-- ============================================
-- VUES UTILES
-- ============================================

-- Vue des réservations spa avec détails
CREATE OR REPLACE VIEW v_spa_bookings_details AS
SELECT 
    sb.id,
    sb.booking_reference,
    sb.booking_date,
    sb.start_time,
    sb.end_time,
    sb.duration,
    sb.status,
    sb.payment_status,
    sb.total_amount,
    -- Service
    ss.name as service_name,
    ssc.name as category_name,
    -- Client
    COALESCE(g.first_name || ' ' || g.last_name, sb.guest_name) as guest_name,
    COALESCE(g.email, sb.guest_email) as guest_email,
    COALESCE(g.phone, sb.guest_phone) as guest_phone,
    -- Thérapeute
    st.first_name || ' ' || st.last_name as therapist_name,
    -- Salle
    str.name as room_name,
    sb.created_at
FROM spa_bookings sb
LEFT JOIN spa_services ss ON sb.service_id = ss.id
LEFT JOIN spa_service_categories ssc ON ss.category_id = ssc.id
LEFT JOIN guests g ON sb.guest_id = g.id
LEFT JOIN spa_therapists st ON sb.therapist_id = st.id
LEFT JOIN spa_treatment_rooms str ON sb.treatment_room_id = str.id;

-- Vue des statistiques spa
CREATE OR REPLACE VIEW v_spa_statistics AS
SELECT 
    COUNT(*) FILTER (WHERE status = 'completed') as completed_bookings,
    COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed_bookings,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_bookings,
    COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_bookings,
    COALESCE(SUM(total_amount) FILTER (WHERE status IN ('completed', 'in_progress')), 0) as total_revenue,
    COALESCE(AVG(total_amount) FILTER (WHERE status IN ('completed', 'in_progress')), 0) as average_booking_value,
    COUNT(DISTINCT guest_id) as unique_guests
FROM spa_bookings
WHERE booking_date >= CURRENT_DATE - INTERVAL '30 days';

COMMENT ON TABLE spa_service_categories IS 'Catégories de services spa';
COMMENT ON TABLE spa_services IS 'Services spa disponibles';
COMMENT ON TABLE spa_therapists IS 'Thérapeutes et praticiens spa';
COMMENT ON TABLE spa_treatment_rooms IS 'Salles de traitement';
COMMENT ON TABLE spa_bookings IS 'Réservations de services spa';
COMMENT ON TABLE spa_therapist_schedules IS 'Horaires de travail des thérapeutes';
COMMENT ON TABLE spa_therapist_time_off IS 'Congés et absences des thérapeutes';
COMMENT ON TABLE spa_products IS 'Produits spa en vente';
COMMENT ON TABLE spa_product_sales IS 'Ventes de produits spa';
COMMENT ON TABLE spa_packages IS 'Packages spa (combinaisons de services)';
COMMENT ON TABLE spa_package_services IS 'Services inclus dans les packages';
COMMENT ON TABLE spa_reviews IS 'Avis clients sur les services spa';
