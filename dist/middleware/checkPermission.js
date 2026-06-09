"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkOwnership = exports.checkAnyPermission = exports.checkPermission = void 0;
const database_1 = __importDefault(require("../config/database"));
/**
 * Vérifie si l'utilisateur a la permission requise
 * @param userPermissions - Objet permissions de l'utilisateur (JSONB)
 * @param resource - Resource (ex: "restaurant.orders")
 * @param action - Action (ex: "create", "read", "update", "delete")
 */
function hasPermission(userPermissions, resource, action) {
    if (!userPermissions)
        return false;
    // Split resource path (ex: "restaurant.orders" => ["restaurant", "orders"])
    const parts = resource.split('.');
    let current = userPermissions;
    // Navigate through the permission object
    for (const part of parts) {
        if (Array.isArray(current)) {
            return false; // We reached an array before the end
        }
        if (!current[part]) {
            return false; // Path doesn't exist
        }
        current = current[part];
    }
    // At the end, current should be an array of actions
    if (!Array.isArray(current)) {
        return false;
    }
    // Check if the action is in the array
    return current.includes(action);
}
/**
 * Middleware factory pour vérifier une permission spécifique
 * Usage: router.post('/orders', checkPermission('restaurant.orders', 'create'), createOrder)
 */
const checkPermission = (resource, action) => {
    return async (req, res, next) => {
        try {
            // Vérifier que l'utilisateur est authentifié
            if (!req.user?.id) {
                return res.status(401).json({ message: 'Non authentifié' });
            }
            // Récupérer le rôle de l'utilisateur directement depuis la colonne role
            const result = await database_1.default.query(`SELECT role FROM users WHERE id = $1`, [req.user.id]);
            if (result.rows.length === 0) {
                return res.status(403).json({ message: 'Utilisateur non trouvé' });
            }
            const roleName = result.rows[0].role;
            // Admin et manager ont tous les droits
            if (roleName === 'admin' || roleName === 'manager') {
                return next();
            }
            // Définir les permissions en dur pour les rôles restaurant
            const restaurantPermissions = {
                restaurant_server: {
                    'restaurant.orders': ['read', 'create'],
                    'restaurant.menu': ['read'],
                    'restaurant.tables': ['read'],
                    'restaurant.print': ['tickets']
                },
                restaurant_cashier: {
                    'restaurant.orders': ['read', 'update_payment'],
                    'restaurant.menu': ['read'],
                    'restaurant.payments': ['create', 'refund'],
                    'restaurant.print': ['invoices']
                },
                restaurant_manager: {
                    'restaurant.orders': ['read', 'create', 'update', 'update_status', 'update_payment'],
                    'restaurant.menu': ['read', 'create', 'update', 'delete'],
                    'restaurant.tables': ['read', 'create', 'update', 'delete', 'update_status'],
                    'restaurant.reservations': ['read', 'create', 'update', 'delete'],
                    'restaurant.payments': ['create', 'refund'],
                    'restaurant.stats': ['read'],
                    'restaurant.print': ['tickets', 'invoices']
                },
                restaurant_chef: {
                    'restaurant.orders': ['read', 'update_status'],
                    'restaurant.menu': ['read'],
                    'restaurant.stats': ['read_production'],
                    'restaurant.print': ['tickets']
                }
            };
            // Vérifier si le rôle a la permission
            const rolePerms = restaurantPermissions[roleName];
            if (!rolePerms) {
                return res.status(403).json({
                    message: 'Rôle non autorisé',
                    role: roleName
                });
            }
            const resourcePerms = rolePerms[resource];
            if (!resourcePerms || !resourcePerms.includes(action)) {
                return res.status(403).json({
                    message: 'Permission refusée',
                    required: `${resource}.${action}`,
                    role: roleName
                });
            }
            // Permission accordée
            next();
        }
        catch (error) {
            console.error('Error checking permission:', error);
            return res.status(500).json({ message: 'Erreur serveur lors de la vérification des permissions' });
        }
    };
};
exports.checkPermission = checkPermission;
/**
 * Middleware pour vérifier si l'utilisateur a AU MOINS UNE des permissions requises
 * Usage: router.get('/orders', checkAnyPermission([
 *   ['restaurant.orders', 'read'],
 *   ['restaurant.orders', 'update']
 * ]), getOrders)
 */
const checkAnyPermission = (permissionPairs) => {
    return async (req, res, next) => {
        try {
            if (!req.user?.id) {
                return res.status(401).json({ message: 'Non authentifié' });
            }
            // Récupérer le rôle de l'utilisateur directement depuis la colonne role
            const result = await database_1.default.query(`SELECT role FROM users WHERE id = $1`, [req.user.id]);
            if (result.rows.length === 0) {
                return res.status(403).json({ message: 'Utilisateur non trouvé' });
            }
            const roleName = result.rows[0].role;
            // Admin et manager ont tous les droits
            if (roleName === 'admin' || roleName === 'manager') {
                return next();
            }
            // Définir les permissions en dur pour les rôles restaurant
            const restaurantPermissions = {
                restaurant_server: {
                    'restaurant.orders': ['read', 'create'],
                    'restaurant.menu': ['read'],
                    'restaurant.tables': ['read'],
                    'restaurant.print': ['tickets']
                },
                restaurant_cashier: {
                    'restaurant.orders': ['read', 'update_payment'],
                    'restaurant.menu': ['read'],
                    'restaurant.payments': ['create', 'refund'],
                    'restaurant.print': ['invoices']
                },
                restaurant_manager: {
                    'restaurant.orders': ['read', 'create', 'update', 'update_status', 'update_payment'],
                    'restaurant.menu': ['read', 'create', 'update', 'delete'],
                    'restaurant.tables': ['read', 'create', 'update', 'delete', 'update_status'],
                    'restaurant.reservations': ['read', 'create', 'update', 'delete'],
                    'restaurant.payments': ['create', 'refund'],
                    'restaurant.stats': ['read'],
                    'restaurant.print': ['tickets', 'invoices']
                },
                restaurant_chef: {
                    'restaurant.orders': ['read', 'update_status'],
                    'restaurant.menu': ['read'],
                    'restaurant.stats': ['read_production'],
                    'restaurant.print': ['tickets']
                }
            };
            // Vérifier si le rôle a au moins une des permissions
            const rolePerms = restaurantPermissions[roleName];
            if (!rolePerms) {
                return res.status(403).json({
                    message: 'Rôle non autorisé',
                    role: roleName
                });
            }
            const hasAnyPermission = permissionPairs.some(([resource, action]) => {
                const resourcePerms = rolePerms[resource];
                return resourcePerms && resourcePerms.includes(action);
            });
            if (!hasAnyPermission) {
                return res.status(403).json({
                    message: 'Permission refusée',
                    required_any: permissionPairs.map(([r, a]) => `${r}.${a}`),
                    role: roleName
                });
            }
            next();
        }
        catch (error) {
            console.error('Error checking permissions:', error);
            return res.status(500).json({ message: 'Erreur serveur lors de la vérification des permissions' });
        }
    };
};
exports.checkAnyPermission = checkAnyPermission;
/**
 * Middleware pour vérifier l'ownership d'une ressource
 * Usage: Pour permettre à un serveur de modifier seulement SES commandes
 */
const checkOwnership = (resource, action, ownershipCheck) => {
    return async (req, res, next) => {
        try {
            if (!req.user?.id) {
                return res.status(401).json({ message: 'Non authentifié' });
            }
            // Récupérer le rôle de l'utilisateur directement depuis la colonne role
            const result = await database_1.default.query(`SELECT role FROM users WHERE id = $1`, [req.user.id]);
            if (result.rows.length === 0) {
                return res.status(403).json({ message: 'Utilisateur non trouvé' });
            }
            const roleName = result.rows[0].role;
            // Admin et manager ont tous les droits
            if (roleName === 'admin' || roleName === 'manager') {
                return next();
            }
            // Définir les permissions en dur pour les rôles restaurant
            const restaurantPermissions = {
                restaurant_server: {
                    'restaurant.orders': ['read', 'create', 'update_own'],
                    'restaurant.menu': ['read'],
                    'restaurant.tables': ['read'],
                    'restaurant.print': ['tickets']
                },
                restaurant_cashier: {
                    'restaurant.orders': ['read', 'update_payment'],
                    'restaurant.menu': ['read'],
                    'restaurant.payments': ['create', 'refund'],
                    'restaurant.print': ['invoices']
                },
                restaurant_manager: {
                    'restaurant.orders': ['read', 'create', 'update', 'update_status', 'update_payment', 'update_own'],
                    'restaurant.menu': ['read', 'create', 'update', 'delete'],
                    'restaurant.tables': ['read', 'create', 'update', 'delete', 'update_status'],
                    'restaurant.reservations': ['read', 'create', 'update', 'delete'],
                    'restaurant.payments': ['create', 'refund'],
                    'restaurant.stats': ['read'],
                    'restaurant.print': ['tickets', 'invoices']
                },
                restaurant_chef: {
                    'restaurant.orders': ['read', 'update_status'],
                    'restaurant.menu': ['read'],
                    'restaurant.stats': ['read_production'],
                    'restaurant.print': ['tickets']
                }
            };
            // Vérifier la permission de base
            const actionToCheck = action === 'update_own' ? 'update_own' : action;
            const rolePerms = restaurantPermissions[roleName];
            if (!rolePerms) {
                return res.status(403).json({
                    message: 'Rôle non autorisé',
                    role: roleName
                });
            }
            const resourcePerms = rolePerms[resource];
            if (!resourcePerms || !resourcePerms.includes(actionToCheck)) {
                return res.status(403).json({
                    message: 'Permission refusée',
                    required: `${resource}.${actionToCheck}`,
                    role: roleName
                });
            }
            // Si action est "update_own", vérifier l'ownership
            if (action === 'update_own') {
                const isOwner = await ownershipCheck(req);
                if (!isOwner) {
                    return res.status(403).json({
                        message: 'Vous ne pouvez modifier que vos propres ressources',
                        role: roleName
                    });
                }
            }
            next();
        }
        catch (error) {
            console.error('Error checking ownership:', error);
            return res.status(500).json({ message: 'Erreur serveur lors de la vérification de l\'ownership' });
        }
    };
};
exports.checkOwnership = checkOwnership;
