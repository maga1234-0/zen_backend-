import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { checkPermission, checkRole } from '../middleware/rbac';
import {
  // Rôles
  getRoles,
  getRoleById,
  createRole,
  updateRole,
  // Permissions
  getPermissions,
  getPermissionsByModule,
  // Permissions de rôle
  assignPermissionsToRole,
  getRolePermissions,
  // Rôles utilisateurs
  assignRoleToUser,
  removeRoleFromUser,
  getUserRoles,
  getUserPermissionsEndpoint,
  checkUserPermission,
  // Logs
  getAccessLogs
} from '../controllers/rbacController';

const router = Router();

// Toutes les routes nécessitent une authentification
router.use(authenticateToken);

// ============================================
// ROUTES - RÔLES
// ============================================

// Récupérer tous les rôles
router.get('/roles', checkPermission('user.read'), getRoles);

// Récupérer un rôle par ID
router.get('/roles/:id', checkPermission('user.read'), getRoleById);

// Créer un nouveau rôle
router.post('/roles', checkPermission('user.role.manage'), createRole);

// Mettre à jour un rôle
router.put('/roles/:id', checkPermission('user.role.manage'), updateRole);

// ============================================
// ROUTES - PERMISSIONS
// ============================================

// Récupérer toutes les permissions
router.get('/permissions', checkPermission('user.read'), getPermissions);

// Récupérer les permissions par module
router.get('/permissions/by-module', checkPermission('user.read'), getPermissionsByModule);

// ============================================
// ROUTES - PERMISSIONS DE RÔLE
// ============================================

// Récupérer les permissions d'un rôle
router.get('/roles/:roleId/permissions', checkPermission('user.read'), getRolePermissions);

// Assigner des permissions à un rôle
router.post('/roles/:roleId/permissions', checkPermission('user.role.manage'), assignPermissionsToRole);

// ============================================
// ROUTES - RÔLES UTILISATEURS
// ============================================

// Récupérer les rôles d'un utilisateur
router.get('/users/:userId/roles', checkPermission('user.read'), getUserRoles);

// Assigner un rôle à un utilisateur
router.post('/users/roles', checkPermission('user.role.manage'), assignRoleToUser);

// Retirer un rôle à un utilisateur
router.delete('/users/:userId/roles/:roleId', checkPermission('user.role.manage'), removeRoleFromUser);

// Récupérer les permissions de l'utilisateur connecté
router.get('/me/permissions', getUserPermissionsEndpoint);

// Vérifier si l'utilisateur a une permission
router.get('/me/permissions/:permission', checkUserPermission);

// ============================================
// ROUTES - LOGS D'ACCÈS
// ============================================

// Récupérer les logs d'accès (admin uniquement)
router.get('/access-logs', checkRole(['super_admin', 'hotel_manager']), getAccessLogs);

export default router;
