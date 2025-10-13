from odoo import models, fields, api
from passlib.context import CryptContext
from datetime import datetime, timedelta
import uuid

pwd_context = CryptContext(schemes=["pbkdf2_sha512"], deprecated="auto")

class EmployeeLogin(models.Model):
    _name = 'employee.login'
    _description = 'Employee Login'
    
    employee_number = fields.Many2one('hr.employee', required=True)
    password = fields.Char(required=True)
    login_token = fields.Char(string='Login Token', readonly=True)

    # New fields for reset flow
    reset_token = fields.Char(string='Password Reset Token', copy=False, index=True)
    reset_expiration = fields.Datetime(string='Reset Token Expiration', copy=False)

    # -----------------------------
    # Password hashing
    # -----------------------------
    def _hash_password(self, raw_password):
        return pwd_context.hash(raw_password)

    @api.model
    def create(self, vals):
        if vals.get('password'):
            vals['password'] = pwd_context.hash(vals['password'])
        if not vals.get('login_token'):
            vals['login_token'] = str(uuid.uuid4())
        return super(EmployeeLogin, self).create(vals)

    def write(self, vals):
        if vals.get('password'):
            vals['password'] = pwd_context.hash(vals['password'])
        return super(EmployeeLogin, self).write(vals)

    def check_password(self, raw_password):
        """Compare the raw password with the stored hash."""
        if not self.password:
            return False
        try:
            return pwd_context.verify(raw_password, self.password)
        except Exception:
            return False

    # -----------------------------
    # Reset token management
    # -----------------------------
    def generate_reset_token(self, hours_valid=1):
        """Generate a one-time reset token (UUID) valid for N hours."""
        token = str(uuid.uuid4())
        expiry = datetime.utcnow() + timedelta(hours=hours_valid)
        self.sudo().write({
            'reset_token': token,
            'reset_expiration': fields.Datetime.to_string(expiry),
        })
        return token

    def clear_reset_token(self):
        """Invalidate existing reset token immediately."""
        self.sudo().write({'reset_token': False, 'reset_expiration': False})

    def validate_reset_token(self, token):
        """Return True if token is valid and not expired."""
        if not token:
            return False
        rec = self.sudo().search([('reset_token', '=', token)], limit=1)
        if not rec or not rec.reset_expiration:
            return False
        exp_dt = fields.Datetime.from_string(rec.reset_expiration)
        return exp_dt >= datetime.utcnow()
