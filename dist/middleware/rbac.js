"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkRole = exports.checkAllPermissions = exports.checkAnyPermission = exports.checkPermission = void 0;
exports.getUserPermissions = getUserPermissions;
const database_1 = __importDefault(require("../config/database"));
/**
 * Middleware pour vérifier si l'utilisateur a une permission spécifique
 * @param requiredPermission - Code de la permission requise (ex: 'reservation.create')
 */
const checkPermission = (requiredPermission) => {
    return async (req, res, next) => {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({ message: 'Non authentifié' });
            }
            // Vérifier si l'utilisateur a la permission
            const hasPermission = await userHasPermission(userId, requiredPermission);
            if (!hasPermission) {
                // Logger l'accès refusé
                await logAccessAttempt(userId, requiredPermission, 'denied', req);
                return res.status(403).json({
                    message: 'Accès refusé',
                    required_permission: requiredPermission
                });
            }
            // Logger l'accès autorisé
            await logAccessAttempt(userId, requiredPermission, 'success', req);
            next();
        }
        catch (error) {
            console.error('Permission check error:', error);
            res.status(500).json({ message: 'Erreur de vérification des permissions' });
        }
    };
};
exports.checkPermission = checkPermission;
/**
 * Middleware pour vérifier si l'utilisateur a AU MOINS UNE des permissions
 * @param permissions - Liste des permissions (OR logic)
 */
const checkAnyPermission = (permissions) => {
    return async (req, res, next) => {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({ message: 'Non authentifié' });
            }
            // Vérifier si l'utilisateur a au moins une permission
            for (const permission of permissions) {
                const hasPermission = await userHasPermission(userId, permission);
                if (hasPermission) {
                    await logAccessAttempt(userId, permission, 'success', req);
                    return next();
                }
            }
            await logAccessAttempt(userId, permissions.join(','), 'denied', req);
            return res.status(403).json({
                message: 'Accès refusé',
                required_permissions: permissions
            });
        }
        catch (error) {
            console.error('Permission check error:', error);
            res.status(500).json({ message: 'Erreur de vérification des permissions' });
        }
    };
};
exports.checkAnyPermission = checkAnyPermission;
/**
 * Middleware pour vérifier si l'utilisateur a TOUTES les permissions
 * @param permissions - Liste des permissions (AND logic)
 */
const checkAllPermissions = (permissions) => {
    return async (req, res, next) => {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({ message: 'Non authentifié' });
            }
            // Vérifier si l'utilisateur a toutes les permissions
            for (const permission of permissions) {
                const hasPermission = await userHasPermission(userId, permission);
                if (!hasPermission) {
                    await logAccessAttempt(userId, permissions.join(','), 'denied', req);
                    return res.status(403).json({
                        message: 'Accès refusé',
                        missing_permission: permission
                    });
                }
            }
            await logAccessAttempt(userId, permissions.join(','), 'success', req);
            next();
        }
        catch (error) {
            console.error('Permission check error:', error);
            res.status(500).json({ message: 'Erreur de vérification des permissions' });
        }
    };
};
exports.checkAllPermissions = checkAllPermissions;
/**
 * Middleware pour vérifier le rôle de l'utilisateur
 * @param allowedRoles - Liste des codes de rôles autorisés
 */
const checkRole = (allowedRoles) => {
    return async (req, res, next) => {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({ message: 'Non authentifié' });
            }
            const userRoles = await getUserRoles(userId);
            const hasRole = userRoles.some(role => allowedRoles.includes(role.code));
            if (!hasRole) {
                return res.status(403).json({
                    message: 'Rôle insuffisant',
                    required_roles: allowedRoles
                });
            }
            next();
        }
        catch (error) {
            console.error('Role check error:', error);
            res.status(500).json({ message: 'Erreur de vérification du rôle' });
        }
    };
};
exports.checkRole = checkRole;
/**
 * Vérifier si un utilisateur a une permission spécifique
 */
async function userHasPermission(userId, permissionCode) {
    try {
        const result = await database_1.default.query(`SELECT EXISTS(
        SELECT 1
        FROM user_roles ur
        JOIN role_permissions rp ON ur.role_id = rp.role_id
        JOIN permissions p ON rp.permission_id = p.id
        WHERE ur.user_id = $1
        AND p.code = $2
        AND ur.is_active = true
        AND (ur.expires_at IS NULL OR ur.expires_at > CURRENT_TIMESTAMP)
      ) as has_permission`, [userId, permissionCode]);
        return result.rows[0]?.has_permission || false;
    }
    catch (error) {
        console.error('Error checking permission:', error);
        return false;
    }
}
/**
 * Récupérer les rôles d'un utilisateur
 */
async function getUserRoles(userId) {
    try {
        const result = await database_1.default.query(`SELECT r.*
       FROM user_roles ur
       JOIN roles r ON ur.role_id = r.id
       WHERE ur.user_id = $1
       AND ur.is_active = true
       AND (ur.expires_at IS NULL OR ur.expires_at > CURRENT_TIMESTAMP)`, [userId]);
        return result.rows;
    }
    catch (error) {
        console.error('Error getting user roles:', error);
        return [];
    }
}
/**
 * Logger une tentative d'accès
 */
async function logAccessAttempt(userId, permissionCode, status, req) {
    try {
        await database_1.default.query(`INSERT INTO access_logs (
        user_id, permission_code, action, status,
        ip_address, user_agent
      ) VALUES ($1, $2, $3, $4, $5, $6)`, [
            userId,
            permissionCode,
            req.method,
            status,
            req.ip,
            req.get('user-agent')
        ]);
    }
    catch (error) {
        console.error('Error logging access:', error);
    }
}
/**
 * Récupérer toutes les permissions d'un utilisateur
 */
async function getUserPermissions(userId) {
    try {
        const result = await database_1.default.query(`SELECT DISTINCT p.code
       FROM user_roles ur
       JOIN role_permissions rp ON ur.role_id = rp.role_id
       JOIN permissions p ON rp.permission_id = p.id
       WHERE ur.user_id = $1
       AND ur.is_active = true
       AND (ur.expires_at IS NULL OR ur.expires_at > CURRENT_TIMESTAMP)
       ORDER BY p.code`, [userId]);
        return result.rows.map(row => row.code);
    }
    catch (error) {
        console.error('Error getting user permissions:', error);
        return [];
    }
}
