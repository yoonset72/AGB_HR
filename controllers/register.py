from odoo import http
from odoo.http import request
import logging
import uuid
import json
import time

_logger = logging.getLogger(__name__)

MAX_ATTEMPTS = 5
BLOCK_TIME = 300  # 5 minutes


class EmployeePortal(http.Controller):

    @http.route('/employee/register', type='http', auth='public', website=True, methods=['GET', 'POST'], csrf=False)
    def employee_register(self, **kwargs):
        _logger.info("Rendering employee register: %s", kwargs)

        # Track login attempts
        attempts = request.session.get('login_attempts', 0)
        last_attempt = request.session.get('last_attempt', 0)
        now = time.time()

        if attempts >= MAX_ATTEMPTS and (now - last_attempt) < BLOCK_TIME:
            return request.render('AGB_HR.register_template', {
                'error': 'Too many failed attempts. Please try again later.',
                'employee_number': kwargs.get('employee_number', ''),
                'forgot': False,
            })

        # Already logged in → redirect
        if request.session.get('employee_number'):
            return request.redirect('/attendance/dashboard')

        if request.httprequest.method == 'POST':
            emp_id = kwargs.get('employee_number')
            password = kwargs.get('password')
            new_password = kwargs.get('new_password')
            forgot = kwargs.get('forgot')

            employee = request.env['hr.employee'].sudo().search(
                [('employee_number', '=', emp_id)], limit=1)

            if not employee:
                return request.render('AGB_HR.register_template', {
                    'error': 'Employee ID not found.',
                    'employee_number': emp_id,
                    'forgot': False,
                })

            login_rec = request.env['employee.login'].sudo().search(
                [('employee_number', '=', employee.id)], limit=1)

            if not login_rec:
                login_rec = request.env['employee.login'].sudo().create({
                    'employee_number': employee.id,
                    'password': password,
                })

            # Forgot password flow
            if forgot:
                if not new_password:
                    return request.render('AGB_HR.register_template', {
                        'error': 'Please enter a new password.',
                        'employee_number': emp_id,
                        'forgot': True
                    })
                login_rec.sudo().write({'password': new_password})
                return request.render('AGB_HR.register_template', {
                    'success': 'Password updated successfully. Please log in again.',
                    'employee_number': emp_id,
                    'forgot': False
                })

            if login_rec.check_password(password):
                request.session['employee_number'] = employee.id
                request.session['login_attempts'] = 0
                token = str(uuid.uuid4())
                login_rec.sudo().write({'login_token': token})

                _logger.info("Employee %s (%s) logged in successfully.", employee.name, emp_id)

                request.session['login_message'] = f"Welcome {employee.name}! You have logged in successfully."

                return request.redirect('/attendance/dashboard')


            # Wrong password
            request.session['login_attempts'] = attempts + 1
            request.session['last_attempt'] = now
            return request.render('AGB_HR.register_template', {
                'error': 'Wrong password.',
                'employee_number': emp_id,
                'forgot': False
            })

        return request.render('AGB_HR.register_template', {
            'employee_number': kwargs.get('employee_number', ''),
            'forgot': kwargs.get('forgot', '').lower() in ['1', 'true', 'yes'],
        })