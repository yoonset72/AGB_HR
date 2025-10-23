from odoo import fields, models


class HrLeave(models.Model):
    _inherit = 'hr.leave'

    reason = fields.Char(string='Reason for Leave')