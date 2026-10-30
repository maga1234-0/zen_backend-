"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.changePassword = exports.updateProfilePicture = exports.deleteUser = exports.updateUser = exports.createUser = exports.getAllUsers = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const database_1 = __importDefault(require("../config/database"));
const getAllUsers = async (req, res) => {
    try {
        const result = await database_1.default.query('SELECT id, email, first_name, last_name, phone, role, is_active, profile_picture, created_at FROM users ORDER BY created_at DESC');
        res.json(result.rows);
    }
    catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getAllUsers = getAllUsers;
const createUser = async (req, res) => {
    try {
        const { email, password, firstName, lastName, phone, role } = req.body;
        // Check if user already exists
        const existingUser = await database_1.default.query('SELECT id FROM users WHERE email = $1', [email]);
        if (existingUser.rows.length > 0) {
            return res.status(400).json({ message: 'User with this email already exists' });
        }
        // Hash password
        const passwordHash = await bcryptjs_1.default.hash(password, 10);
        // Create user
        const result = await database_1.default.query(`INSERT INTO users (email, password_hash, first_name, last_name, phone, role) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING id, email, first_name, last_name, phone, role, is_active, created_at`, [email, passwordHash, firstName, lastName, phone, role]);
        console.log('✅ User created:', result.rows[0].email);
        res.status(201).json(result.rows[0]);
    }
    catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.createUser = createUser;
const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { firstName, lastName, phone, role, isActive } = req.body;
        const result = await database_1.default.query(`UPDATE users 
       SET first_name = $1, last_name = $2, phone = $3, role = $4, is_active = $5, updated_at = CURRENT_TIMESTAMP
       WHERE id = $6
       RETURNING id, email, first_name, last_name, phone, role, is_active`, [firstName, lastName, phone, role, isActive, id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(result.rows[0]);
    }
    catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.updateUser = updateUser;
const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        // Check if user has any associated bookings (created_by)
        const bookingsCheck = await database_1.default.query('SELECT COUNT(*) as booking_count FROM bookings WHERE created_by = $1', [id]);
        const bookingCount = parseInt(bookingsCheck.rows[0].booking_count);
        if (bookingCount > 0) {
            return res.status(400).json({
                message: `Cannot delete user with ${bookingCount} associated booking(s). Please reassign or delete the bookings first.`
            });
        }
        // Check if user has any associated maintenance reports
        const maintenanceCheck = await database_1.default.query('SELECT COUNT(*) as maintenance_count FROM rooms WHERE maintenance_reported_by = $1', [id]);
        const maintenanceCount = parseInt(maintenanceCheck.rows[0].maintenance_count);
        if (maintenanceCount > 0) {
            return res.status(400).json({
                message: `Cannot delete user with ${maintenanceCount} associated maintenance report(s). Please reassign or update the maintenance reports first.`
            });
        }
        // Check if user has any audit logs
        const auditLogsCheck = await database_1.default.query('SELECT COUNT(*) as audit_logs_count FROM audit_logs WHERE user_id = $1', [id]);
        const auditLogsCount = parseInt(auditLogsCheck.rows[0].audit_logs_count);
        if (auditLogsCount > 0) {
            return res.status(400).json({
                message: `Cannot delete user with ${auditLogsCount} associated audit log(s). Please delete the audit logs first.`
            });
        }
        const result = await database_1.default.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json({ message: 'User deleted successfully' });
    }
    catch (error) {
        console.error('Delete user error:', error);
        // Check for foreign key constraint violation
        if (error.code === '23503') { // PostgreSQL foreign key violation
            return res.status(400).json({
                message: 'Cannot delete user with associated records. Please check and update associated bookings, maintenance reports, or audit logs first.'
            });
        }
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
exports.deleteUser = deleteUser;
const updateProfilePicture = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { profilePicture } = req.body;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        if (!profilePicture) {
            return res.status(400).json({ message: 'Profile picture is required' });
        }
        // Validate base64 image format
        if (!profilePicture.startsWith('data:image/')) {
            return res.status(400).json({ message: 'Invalid image format' });
        }
        // Update profile picture
        const result = await database_1.default.query('UPDATE users SET profile_picture = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, profile_picture', [profilePicture, userId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }
        console.log('✅ Profile picture updated for user:', userId);
        res.json({
            message: 'Profile picture updated successfully',
            profile_picture: result.rows[0].profile_picture
        });
    }
    catch (error) {
        console.error('Update profile picture error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.updateProfilePicture = updateProfilePicture;
const changePassword = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { currentPassword, newPassword } = req.body;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: 'Current password and new password are required' });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ message: 'New password must be at least 6 characters long' });
        }
        // Get current password hash
        const userResult = await database_1.default.query('SELECT password_hash FROM users WHERE id = $1', [userId]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }
        // Verify current password
        const isValidPassword = await bcryptjs_1.default.compare(currentPassword, userResult.rows[0].password_hash);
        if (!isValidPassword) {
            return res.status(400).json({ message: 'Current password is incorrect' });
        }
        // Hash new password
        const newPasswordHash = await bcryptjs_1.default.hash(newPassword, 10);
        // Update password
        await database_1.default.query('UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [newPasswordHash, userId]);
        console.log('✅ Password changed for user:', userId);
        res.json({ message: 'Password changed successfully' });
    }
    catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.changePassword = changePassword;
