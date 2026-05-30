-- ============================================
-- MODULE RÉSERVATION EN LIGNE
-- Système de réservation publique pour clients
-- ============================================

-- Table des paramètres de réservation en ligne
CREATE TABLE IF NOT EXISTS online_booking_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    is_enabled BOOLEAN DEFAULT true,
    min_advance_days INTEGER DEFAULT 1, -- Minimum de jours à l'avance
    max_advance_days INTEGER DEFAULT 365, -- Maximum de jours à l'avance
    min_stay_nights INTEGER DEFAULT 1, -- Séjour minimum
    max_stay_nights INTEGER DEFAULT 30, -- Séjour maximum
    require_payment BOOLEAN DEFAULT false, -- Paiement requis à la réservation
    require_deposit BOOLEAN DEFAULT true, -- Acompte requis
    deposit_percentage DECIMAL(5, 2) DEFAULT 30.00, -- Pourcentage d'acompte
    cancellation_hours INTEGER DEFAULT 24, -- Heures avant annulation gratuite
    terms_and_conditions TEXT, -- Conditions générales
    privacy_policy TEXT, -- Politique de confidentialité
    confirmation_email_template TEXT, -- Template email de confirmation
    cancellation_email_template TEXT, -- Template email d'annulation
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des réservations en ligne (avant conversion en booking)
CREATE TABLE IF NOT EXISTS online_bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_reference VARCHAR(20) NOT NULL UNIQUE, -- REF-YYYYMMDD-XXXX
    
    -- Informations client
    guest_first_name VARCHAR(100) NOT NULL,
    guest_last_name VARCHAR(100) NOT NULL,
    guest_email VARCHAR(255) NOT NULL,
    guest_phone VARCHAR(20) NOT NULL,
    guest_country VARCHAR(100),
    guest_address TEXT,
    guest_city VARCHAR(100),
    guest_postal_code VARCHAR(20),
    
    -- Détails de la réservation
    room_type VARCHAR(50) NOT NULL, -- Single, Double, Suite, Deluxe
    check_in_date DATE NOT NULL,
    check_out_date DATE NOT NULL,
    number_of_guests INTEGER NOT NULL,
    number_of_nights INTEGER NOT NULL,
    
    -- Tarification
    room_rate DECIMAL(10, 2) NOT NULL, -- Prix par nuit
    subtotal DECIMAL(10, 2) NOT NULL, -- Total avant taxes
    tax_amount DECIMAL(10, 2) NOT NULL, -- Montant des taxes
    total_amount DECIMAL(10, 2) NOT NULL, -- Total à payer
    deposit_amount DECIMAL(10, 2), -- Montant de l'acompte
    
    -- Statut et paiement
    status VARCHAR(20) CHECK (status IN ('pending', 'confirmed', 'cancelled', 'expired', 'converted')) DEFAULT 'pending',
    payment_status VARCHAR(20) CHECK (payment_status IN ('unpaid', 'deposit_paid', 'fully_paid')) DEFAULT 'unpaid',
    payment_method VARCHAR(50), -- stripe, paypal, bank_transfer, etc.
    payment_intent_id VARCHAR(255), -- ID de paiement Stripe/PayPal
    
    -- Informations supplémentaires
    special_requests TEXT,
    arrival_time TIME, -- Heure d'arrivée estimée
    source VARCHAR(50) DEFAULT 'website', -- website, mobile_app, widget
    ip_address VARCHAR(45), -- IP du client
    user_agent TEXT, -- Navigateur utilisé
    
    -- Conversion en réservation interne
    converted_to_booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
    converted_at TIMESTAMP,
    converted_by UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Annulation
    cancelled_at TIMESTAMP,
    cancellation_reason TEXT,
    refund_amount DECIMAL(10, 2),
    refund_status VARCHAR(20) CHECK (refund_status IN ('none', 'pending', 'processed', 'failed')),
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP -- Expiration si non confirmé
);

-- Table des disponibilités personnalisées (overrides)
CREATE TABLE IF NOT EXISTS room_availability_overrides (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_type VARCHAR(50) NOT NULL,
    date DATE NOT NULL,
    available_rooms INTEGER NOT NULL DEFAULT 0,
    custom_price DECIMAL(10, 2), -- Prix personnalisé pour cette date
    reason VARCHAR(255), -- Raison (événement, saison haute, etc.)
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(room_type, date)
);

-- Table des promotions et codes promo
CREATE TABLE IF NOT EXISTS promo_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    discount_type VARCHAR(20) CHECK (discount_type IN ('percentage', 'fixed_amount')) NOT NULL,
    discount_value DECIMAL(10, 2) NOT NULL,
    min_nights INTEGER DEFAULT 1, -- Nombre minimum de nuits
    min_amount DECIMAL(10, 2), -- Montant minimum de réservation
    applicable_room_types TEXT[], -- Types de chambres éligibles
    valid_from DATE NOT NULL,
    valid_until DATE NOT NULL,
    max_uses INTEGER, -- Nombre maximum d'utilisations
    current_uses INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des avis clients (pour affichage public)
CREATE TABLE IF NOT EXISTS public_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guest_name VARCHAR(200) NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
    comment TEXT NOT NULL,
    room_type VARCHAR(50),
    stay_date DATE,
    is_verified BOOLEAN DEFAULT false, -- Vérifié par l'hôtel
    is_published BOOLEAN DEFAULT false, -- Publié sur le site
    response TEXT, -- Réponse de l'hôtel
    responded_at TIMESTAMP,
    responded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des questions fréquentes (FAQ)
CREATE TABLE IF NOT EXISTS booking_faqs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question TEXT NOT NULL,
    question_fr TEXT,
    question_en TEXT,
    question_es TEXT,
    answer TEXT NOT NULL,
    answer_fr TEXT,
    answer_en TEXT,
    answer_es TEXT,
    category VARCHAR(100), -- general, payment, cancellation, rooms, etc.
    display_order INTEGER DEFAULT 0,
    is_published BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- ============================================
-- TRIGGERS
-- ============================================

CREATE TRIGGER update_online_booking_settings_updated_at 
BEFORE UPDATE ON online_booking_settings 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_online_bookings_updated_at 
BEFORE UPDATE ON online_bookings 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_room_availability_overrides_updated_at 
BEFORE UPDATE ON room_availability_overrides 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_promo_codes_updated_at 
BEFORE UPDATE ON promo_codes 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_public_reviews_updated_at 
BEFORE UPDATE ON public_reviews 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_booking_faqs_updated_at 
BEFORE UPDATE ON booking_faqs 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- INDEX POUR PERFORMANCE
-- ============================================

CREATE INDEX idx_online_bookings_reference ON online_bookings(booking_reference);
CREATE INDEX idx_online_bookings_email ON online_bookings(guest_email);
CREATE INDEX idx_online_bookings_dates ON online_bookings(check_in_date, check_out_date);
CREATE INDEX idx_online_bookings_status ON online_bookings(status);
CREATE INDEX idx_online_bookings_created ON online_bookings(created_at);
CREATE INDEX idx_room_availability_date ON room_availability_overrides(date);
CREATE INDEX idx_room_availability_type ON room_availability_overrides(room_type);
CREATE INDEX idx_promo_codes_code ON promo_codes(code);
CREATE INDEX idx_promo_codes_valid ON promo_codes(valid_from, valid_until);
CREATE INDEX idx_public_reviews_published ON public_reviews(is_published);

-- ============================================
-- FONCTIONS UTILES
-- ============================================

-- Fonction pour générer une référence de réservation unique
CREATE OR REPLACE FUNCTION generate_booking_reference()
RETURNS VARCHAR(20) AS $$
DECLARE
    ref VARCHAR(20);
    exists BOOLEAN;
BEGIN
    LOOP
        ref := 'REF-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || 
               LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
        
        SELECT EXISTS(SELECT 1 FROM online_bookings WHERE booking_reference = ref) INTO exists;
        
        EXIT WHEN NOT exists;
    END LOOP;
    
    RETURN ref;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour calculer la disponibilité d'un type de chambre
CREATE OR REPLACE FUNCTION get_room_availability(
    p_room_type VARCHAR(50),
    p_check_in DATE,
    p_check_out DATE
)
RETURNS INTEGER AS $$
DECLARE
    total_rooms INTEGER;
    booked_rooms INTEGER;
    online_booked INTEGER;
    override_available INTEGER;
    available INTEGER;
BEGIN
    -- Compter le nombre total de chambres de ce type
    SELECT COUNT(*) INTO total_rooms
    FROM rooms
    WHERE type = p_room_type;
    
    -- Compter les chambres réservées (bookings internes)
    SELECT COUNT(DISTINCT room_id) INTO booked_rooms
    FROM bookings
    WHERE room_id IN (SELECT id FROM rooms WHERE type = p_room_type)
    AND status IN ('confirmed', 'checked_in')
    AND (
        (check_in_date <= p_check_in AND check_out_date > p_check_in)
        OR (check_in_date < p_check_out AND check_out_date >= p_check_out)
        OR (check_in_date >= p_check_in AND check_out_date <= p_check_out)
    );
    
    -- Compter les réservations en ligne confirmées
    SELECT COUNT(*) INTO online_booked
    FROM online_bookings
    WHERE room_type = p_room_type
    AND status IN ('confirmed', 'pending')
    AND (
        (check_in_date <= p_check_in AND check_out_date > p_check_in)
        OR (check_in_date < p_check_out AND check_out_date >= p_check_out)
        OR (check_in_date >= p_check_in AND check_out_date <= p_check_out)
    );
    
    -- Vérifier s'il y a un override de disponibilité
    SELECT available_rooms INTO override_available
    FROM room_availability_overrides
    WHERE room_type = p_room_type
    AND date = p_check_in
    LIMIT 1;
    
    -- Si override existe, l'utiliser, sinon calculer normalement
    IF override_available IS NOT NULL THEN
        available := override_available;
    ELSE
        available := total_rooms - booked_rooms - online_booked;
    END IF;
    
    RETURN GREATEST(available, 0);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- DONNÉES INITIALES
-- ============================================

-- Paramètres par défaut
INSERT INTO online_booking_settings (
    is_enabled,
    min_advance_days,
    max_advance_days,
    min_stay_nights,
    max_stay_nights,
    require_deposit,
    deposit_percentage,
    cancellation_hours,
    terms_and_conditions,
    confirmation_email_template
) VALUES (
    true,
    1,
    365,
    1,
    30,
    true,
    30.00,
    24,
    'Conditions générales de réservation...',
    'Bonjour {{guest_name}}, votre réservation {{booking_reference}} est confirmée...'
);

-- Codes promo d'exemple
INSERT INTO promo_codes (code, description, discount_type, discount_value, min_nights, valid_from, valid_until, max_uses, is_active) VALUES
('WELCOME10', 'Réduction de bienvenue 10%', 'percentage', 10.00, 2, CURRENT_DATE, CURRENT_DATE + INTERVAL '1 year', 100, true),
('SUMMER2026', 'Promotion été 2026', 'percentage', 15.00, 3, '2026-06-01', '2026-08-31', 500, true),
('LONGSTAY', 'Réduction séjour longue durée', 'percentage', 20.00, 7, CURRENT_DATE, CURRENT_DATE + INTERVAL '1 year', NULL, true);

-- FAQ d'exemple
INSERT INTO booking_faqs (question, question_fr, question_en, question_es, answer, answer_fr, answer_en, answer_es, category, display_order, is_published) VALUES
(
    'Quelle est l''heure d''arrivée ?',
    'Quelle est l''heure d''arrivée ?',
    'What is the check-in time?',
    '¿Cuál es la hora de llegada?',
    'L''heure d''arrivée est à partir de 14h00.',
    'L''heure d''arrivée est à partir de 14h00.',
    'Check-in time is from 2:00 PM.',
    'La hora de llegada es a partir de las 14:00.',
    'general',
    1,
    true
),
(
    'Puis-je annuler ma réservation ?',
    'Puis-je annuler ma réservation ?',
    'Can I cancel my reservation?',
    '¿Puedo cancelar mi reserva?',
    'Oui, vous pouvez annuler gratuitement jusqu''à 24h avant l''arrivée.',
    'Oui, vous pouvez annuler gratuitement jusqu''à 24h avant l''arrivée.',
    'Yes, you can cancel free of charge up to 24 hours before arrival.',
    'Sí, puede cancelar gratuitamente hasta 24 horas antes de la llegada.',
    'cancellation',
    2,
    true
),
(
    'Acceptez-vous les animaux ?',
    'Acceptez-vous les animaux ?',
    'Do you accept pets?',
    '¿Aceptan mascotas?',
    'Oui, les animaux sont acceptés moyennant un supplément de 20€ par nuit.',
    'Oui, les animaux sont acceptés moyennant un supplément de 20€ par nuit.',
    'Yes, pets are accepted for an additional fee of €20 per night.',
    'Sí, se aceptan mascotas con un suplemento de 20€ por noche.',
    'general',
    3,
    true
);

-- Avis publics d'exemple
INSERT INTO public_reviews (guest_name, rating, comment, room_type, stay_date, is_verified, is_published) VALUES
('Marie Dupont', 5, 'Excellent séjour ! Chambre spacieuse et personnel très accueillant.', 'Suite', '2026-05-15', true, true),
('John Smith', 5, 'Perfect location and amazing service. Highly recommended!', 'Deluxe', '2026-05-10', true, true),
('Carlos García', 4, 'Muy buena experiencia. Habitación limpia y cómoda.', 'Double', '2026-05-05', true, true);

-- ============================================
-- VUES UTILES
-- ============================================

-- Vue des réservations en ligne avec détails
CREATE OR REPLACE VIEW v_online_bookings_summary AS
SELECT 
    ob.id,
    ob.booking_reference,
    ob.guest_first_name || ' ' || ob.guest_last_name as guest_name,
    ob.guest_email,
    ob.guest_phone,
    ob.room_type,
    ob.check_in_date,
    ob.check_out_date,
    ob.number_of_nights,
    ob.number_of_guests,
    ob.total_amount,
    ob.deposit_amount,
    ob.status,
    ob.payment_status,
    ob.created_at,
    ob.converted_to_booking_id,
    b.id as internal_booking_id,
    CASE 
        WHEN ob.status = 'converted' THEN 'Convertie'
        WHEN ob.status = 'confirmed' THEN 'Confirmée'
        WHEN ob.status = 'pending' THEN 'En attente'
        WHEN ob.status = 'cancelled' THEN 'Annulée'
        WHEN ob.status = 'expired' THEN 'Expirée'
    END as status_label
FROM online_bookings ob
LEFT JOIN bookings b ON ob.converted_to_booking_id = b.id;

-- Vue des statistiques de réservation en ligne
CREATE OR REPLACE VIEW v_online_booking_stats AS
SELECT 
    COUNT(*) as total_bookings,
    COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed_bookings,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_bookings,
    COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_bookings,
    COUNT(*) FILTER (WHERE status = 'converted') as converted_bookings,
    COALESCE(SUM(total_amount) FILTER (WHERE status IN ('confirmed', 'converted')), 0) as total_revenue,
    COALESCE(AVG(total_amount) FILTER (WHERE status IN ('confirmed', 'converted')), 0) as average_booking_value,
    COUNT(DISTINCT guest_email) as unique_guests
FROM online_bookings
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days';

COMMENT ON TABLE online_booking_settings IS 'Paramètres du système de réservation en ligne';
COMMENT ON TABLE online_bookings IS 'Réservations effectuées via le site web public';
COMMENT ON TABLE room_availability_overrides IS 'Disponibilités personnalisées par date';
COMMENT ON TABLE promo_codes IS 'Codes promotionnels pour réductions';
COMMENT ON TABLE public_reviews IS 'Avis clients publiés sur le site';
COMMENT ON TABLE booking_faqs IS 'Questions fréquentes sur les réservations';
