from odoo import http
from odoo.http import request
from datetime import datetime, timedelta, date
import pytz
import calendar
import logging
from dateutil.relativedelta import relativedelta

_logger = logging.getLogger(__name__)

MYANMAR_TZ = pytz.timezone('Asia/Yangon')


class AttendanceDashboardController(http.Controller):

    def _now_myanmar(self):
        """Return current datetime in Myanmar timezone"""
        return datetime.now(pytz.utc).astimezone(MYANMAR_TZ)

    def _get_26th_to_25th_period(self):
        """Return start_date and end_date from 26th of previous month to 25th of current month."""
        now = self._now_myanmar()

        if now.day >= 26:
            # Start date = 26th of current month
            start_date = now.replace(day=26, hour=0, minute=0, second=0, microsecond=0)

            # End date = 25th of next month
            if now.month == 12:
                end_date = now.replace(year=now.year + 1, month=1, day=25,
                                    hour=23, minute=59, second=59)
            else:
                end_date = now.replace(month=now.month + 1, day=25,
                                    hour=23, minute=59, second=59)

        else:
            # Start date = 26th of previous month
            if now.month == 1:
                start_date = now.replace(year=now.year - 1, month=12, day=26,
                                        hour=0, minute=0, second=0, microsecond=0)
            else:
                start_date = now.replace(month=now.month - 1, day=26,
                                        hour=0, minute=0, second=0, microsecond=0)

            # End date = 25th of current month
            end_date = now.replace(day=25, hour=23, minute=59, second=59)

        return start_date, end_date


    # --- Dashboard Route ---
    @http.route('/attendance/dashboard', type='http', auth='public', website=True)
    def attendance_dashboard(self, **kwargs):
        # --- Check session first ---
        employee_id = request.session.get('employee_number')

        # --- Check token from header (for APK) ---
        if not employee_id and 'X-Employee-Token' in request.httprequest.headers:
            token = request.httprequest.headers.get('X-Employee-Token')
            login_record = request.env['employee.login'].sudo().search([('login_token', '=', token)], limit=1)
            if login_record:
                employee_id = login_record.employee_number.id
                request.session['employee_number'] = employee_id

        # --- If no valid login, redirect to login page ---
        if not employee_id:
            return request.redirect('/employee/register')

        employee = request.env['hr.employee'].sudo().browse(employee_id)

        # --- 25th-to-25th period ---
        start_date, end_date = self._get_26th_to_25th_period()

        # --- Attendance records ---
        attendances = request.env['hr.attendance'].sudo().search([
            ('employee_id', '=', employee.id),
            ('check_in', '>=', start_date),
            ('check_in', '<=', end_date)
        ])

        # --- Calculate stats ---
        stats = self._calculate_stats(employee, attendances, start_date, end_date)

        # --- Leave records ---
        leaves = request.env['hr.leave'].sudo().search([
            ('employee_id', '=', employee.id),
            ('request_date_from', '<=', end_date),
            ('request_date_to', '>=', start_date),
            ('state', 'in', ['confirm', 'validate', 'validate1'])
        ])

        # Sum total leave days instead of just record count
        stats['leaveCount'] = sum(leave.number_of_days for leave in leaves)

        for leave in leaves:
            _logger.info(
                "Leave Found: %s | From: %s | To: %s | Days: %s",
                leave.holiday_status_id.display_name,  # leave type name
                leave.request_date_from,
                leave.request_date_to,
                leave.number_of_days
            )


        return request.render('AGB_HR.main_dashboard', {
            'employee': employee,
            'stats': stats,
            'employee_initials': self._get_initials(employee.name),
            'current_period': f"{start_date.strftime('%B %d, %Y')} - {end_date.strftime('%B %d, %Y')}",
            'company_info': {
                'name': 'AGB Communication',
                'country': 'Myanmar',
                'phone': '+959-765492075',
                'email': 'hr@agbcommunication.com'
            }
        })

    
    def _get_initials(self, name):
        if not name:
            return ""
        parts = [part[0].upper() for part in name.split() if part]
        return "".join(parts[-3:])

    # --- Calendar Route ---
    @http.route('/attendance/calendar', type='http', auth='public', website=True)
    def attendance_calendar(self, year=None, month=None, **kwargs):
        employee = self._get_employee()
        if not employee:
            return request.redirect('/employee/register')

        today = self._now_myanmar()
        year = int(year) if year else today.year
        month = int(month) if month else today.month

        calendar_data = self._get_calendar_data(employee, year, month)

        return request.render('AGB_HR.attendance_calendar', {
            'employee': employee,
            'calendar_data': calendar_data,
            'year': year,
            'month': month,
            'month_name': calendar.month_name[month],
            'prev_month': self._get_prev_month(year, month),
            'next_month': self._get_next_month(year, month),
        })

    # --- Helper Methods ---
    def _get_employee(self):
        employee_id = request.session.get('employee_number')
        if not employee_id:
            return None
        employee = request.env['hr.employee'].sudo().browse(employee_id)
        if not employee.exists():
            request.session.pop('employee_number', None)
            return None
        return employee

    def _calculate_stats(self, employee, attendances, start_date, end_date):
        """Calculate attendance statistics for the given employee and date range."""
        calendar_data = {}

        # Iterate over all months in the range
        current = start_date.replace(day=1)
        while current <= end_date:
            month_data = self._get_calendar_data(employee, current.year, current.month)
            # Keep only days within the range
            for day, data in month_data.items():
                if start_date.date() <= data['date'] <= end_date.date():
                    calendar_data[data['date']] = data
            current += relativedelta(months=1)

        # Total present based on attendance_fraction
        present_count = sum(day['attendance_fraction'] for day in calendar_data.values())

        # Calculate absent count using absent_fraction from _get_absent_days
        absent_days = self._get_absent_days(employee)
        absent_count = sum(
            day.get('absent_fraction', 0)
            for day in absent_days
            if start_date.date() <= day.get('date', date.min) <= end_date.date()
        )
        
        # Add invalid half leaves to absent count
        absent_count += sum(
            day.get('number_of_days', 0)
            for day in calendar_data.values()
            if day.get('is_invalid_half_leave')
        )

        # Late count
        late_count = sum(1 for a in attendances if getattr(a, 'display_late_minutes', 0) > 0)

        # Total days in the period
        total_days = (end_date.date() - start_date.date()).days + 1

        # Round for clean display
        present_count = round(present_count, 1)
        absent_count = round(absent_count, 1)

        return {
            'attendanceCount': present_count,
            'absentCount': absent_count,
            'lateCount': late_count,
            'total_days': total_days,
        }

    def _get_calendar_data(self, employee, year, month):
        """Enhanced calendar data with proper half-day leave + public holiday detection"""
        calendar_data = {}
        _, num_days = calendar.monthrange(year, month)
        today_date = self._now_myanmar().date()

        # Prepare shift names safely
        shift_name = ', '.join(employee.resource_calendar_ids.mapped('name')) if employee.resource_calendar_ids else 'Standard Shift (9:00 AM - 6:00 PM)'

        # --- Fetch leaves overlapping this month ---
        month_start = datetime(year, month, 1, 0, 0, 0)
        month_end = datetime(year, month, num_days, 23, 59, 59)

        leaves = request.env['hr.leave'].sudo().search([
            ('employee_id', '=', employee.id),
            ('request_date_from', '<=', month_end),
            ('request_date_to', '>=', month_start),
            ('state', 'in', ['confirm', 'validate', 'validate1'])
        ])

        # --- Fetch public holidays (resource_id=False) overlapping this month ---
        public_holidays = request.env['resource.calendar.leaves'].sudo().search([
            ('resource_id', '=', False),
            ('date_from', '<=', month_end),
            ('date_to', '>=', month_start)
        ])

        for day in range(1, num_days + 1):
            current_date = date(year, month, day)
            weekday = current_date.weekday()

            # --- Attendance ---
            day_att = request.env['hr.attendance'].sudo().search([
                ('employee_id', '=', employee.id),
                '|',
                '&', ('check_in', '>=', datetime(year, month, day)), ('check_in', '<=', datetime(year, month, day, 23, 59, 59)),
                '&', ('check_out', '>=', datetime(year, month, day)), ('check_out', '<=', datetime(year, month, day, 23, 59, 59))
            ], limit=1)

            check_in = day_att.check_in.astimezone(MYANMAR_TZ) if day_att and day_att.check_in else None
            check_out = day_att.check_out.astimezone(MYANMAR_TZ) if day_att and day_att.check_out else None
            working_hours = (check_out - check_in).total_seconds() / 3600 if check_in and check_out else 0

            if check_in and check_out:
                attendance_fraction = 0.5 if working_hours < 5 else 1.0
            elif check_in or check_out:
                attendance_fraction = 0.5
            else:
                attendance_fraction = 0.0

            # --- Check for leave on this day ---
            day_leaves = leaves.filtered(lambda l: l.request_date_from <= current_date <= l.request_date_to)
            has_leave = bool(day_leaves)

            # --- Check for public holiday ---
            day_holidays = public_holidays.filtered(
                lambda h: h.date_from.date() <= current_date <= h.date_to.date()
            )
            is_public_holiday = bool(day_holidays)

            # --- Half-day leave validation ---
            is_invalid_half_leave = False
            if has_leave and day_leaves:
                leave = day_leaves[0]
                leave_duration = leave.number_of_days
                half_day_type = leave.request_date_from_period if leave.request_unit_half else None
                
                # Check if it's a half-day leave (0.5, 1.5, 2.5, etc.)
                if leave_duration % 1 == 0.5:
                    # Validate half-day leave with attendance
                    if half_day_type == 'am':  # Morning leave
                        # Afternoon attendance must be present (check_out exists)
                        if not check_out or working_hours < 2:
                            is_invalid_half_leave = True
                    elif half_day_type == 'pm':  # Afternoon leave
                        # Morning attendance must be present (check_in exists)
                        if not check_in or working_hours < 2:
                            is_invalid_half_leave = True

            # Determine if it's partial leave (leave with attendance)
            is_partial_leave = has_leave and attendance_fraction > 0 and not is_invalid_half_leave

            # --- Enhanced Status determination ---
            if is_public_holiday:
                status = 'public_holiday'
            elif is_invalid_half_leave:
                status = 'invalid_half_leave'   # Half-day leave without corresponding attendance
            elif has_leave and not is_partial_leave:
                status = 'leave'               # Full leave
            elif is_partial_leave:
                status = 'partial_leave'       # Partial leave (leave with attendance)
            elif weekday >= 5 and attendance_fraction > 0:
                # Weekend work
                if attendance_fraction == 1.0:
                    status = 'weekend_present'
                else:
                    status = 'weekend_partial'
            elif weekday >= 5:
                status = 'weekend'             # Regular weekend
            elif attendance_fraction == 1.0:
                status = 'present'             # Full attendance
            elif attendance_fraction == 0.5:
                # Check if it's partial absent or partial present
                if current_date <= today_date and not has_leave:
                    status = 'partial_absent'  # Missing check-in or check-out
                else:
                    status = 'partial'         # Partial attendance
            elif attendance_fraction == 0.0 and current_date <= today_date and weekday < 5:
                status = 'full_absent'         # Full absent
            else:
                status = 'absent'              # Default absent

            # Override for future dates
            if current_date > today_date and not has_leave:
                status = 'future'

            # Legacy status mapping for backward compatibility
            if status == 'partial_leave':
                is_half_leave = True
            elif status in ['weekend_present', 'weekend_partial']:
                # Weekend work cases
                if has_leave:
                    if attendance_fraction > 0:
                        status = 'weekend_half_leave'
                    else:
                        status = 'weekend_leave'
            else:
                is_half_leave = False

            # Determine clickability
            is_clickable = True
            if status in ['full_absent', 'public_holiday'] or (current_date > today_date and not has_leave):
                is_clickable = False

            # --- Late calculation ---
            late_minutes, is_late, severity = 0, False, None
            if day_att and getattr(day_att, 'display_late_minutes', "00:00") != "00:00":
                display_late = day_att.display_late_minutes
                try:
                    if isinstance(display_late, float):
                        hours = int(display_late)
                        minutes = int((display_late - hours) * 60)
                    else:
                        hh, mm = display_late.split(":")
                        hours, minutes = int(hh), int(mm)
                    late_minutes = hours * 60 + minutes
                    if late_minutes > 0:
                        is_late = True
                        severity = 'low' if late_minutes <= 5 else 'medium' if late_minutes <= 15 else 'high'
                except:
                    pass

            # --- Base calendar info ---
            calendar_data[day] = {
                'date': current_date,
                'day': day,
                'formatted_date': current_date.strftime('%Y-%m-%d'),
                'check_in_time': check_in.strftime('%H:%M') if check_in else None,
                'check_out_time': check_out.strftime('%H:%M') if check_out else None,
                'working_hours': round(working_hours,2) if working_hours else 0,
                'is_weekend': weekday >= 5,
                'is_today': current_date == today_date,
                'is_future': current_date > today_date,
                'is_late': is_late,
                'late_minutes': late_minutes,
                'severity': severity,
                'has_check_in': bool(check_in),
                'has_check_out': bool(check_out),
                'attendance_fraction': attendance_fraction,
                'status': status,
                'shift_name': shift_name,
                'leave': has_leave,
                'is_half_leave': is_half_leave,
                'is_partial_leave': is_partial_leave,
                'is_public_holiday': is_public_holiday,
                'has_attendance': bool(day_att),
                'is_clickable': is_clickable,
            }

            # --- Add leave info if exists ---
            if day_leaves:
                leave = day_leaves[0]
                half_day = leave.request_unit_half
                calendar_data[day].update({
                    'leave_name': leave.holiday_status_id.name,
                    'leave_state': leave.state,
                    'reason': leave.name or '',
                    'first_approver': leave.first_approver_id.name if leave.first_approver_id else '',
                    'second_approver': ', '.join(leave.second_approver_ids.mapped('name')) if leave.second_approver_ids else '',
                    'from_date': leave.request_date_from,
                    'to_date': leave.request_date_to,
                    'number_of_days': leave.number_of_days,
                    'half_day_type': leave.request_date_from_period if half_day else None,
                    'is_invalid_half_leave': is_invalid_half_leave,
                })
            

            # --- Add holiday info if exists ---
            if day_holidays:
                holiday = day_holidays[0]
                calendar_data[day].update({
                    'holiday_name': holiday.name,
                    'holiday_from': holiday.date_from,
                    'holiday_to': holiday.date_to,
                })

        return calendar_data


    def _get_prev_month(self, year, month):
        if month == 1:
            return {'year': year - 1, 'month': 12}
        return {'year': year, 'month': month - 1}

    def _get_next_month(self, year, month):
        if month == 12:
            return {'year': year + 1, 'month': 1}
        return {'year': year, 'month': month + 1}
    
    def _get_public_holidays(self, start_date, end_date):
        """Fetch all public holidays (resource_id is False) within the date range."""
        return request.env['resource.calendar.leaves'].sudo().search([
            ('resource_id', '=', False),   # Global holidays
            ('date_from', '<=', end_date),
            ('date_to', '>=', start_date)
        ])

    
    
    def _get_absent_days(self, employee):
        start_date, end_date = self._get_26th_to_25th_period()
        today = self._now_myanmar().date()

        attendances = request.env['hr.attendance'].sudo().search([
            ('employee_id', '=', employee.id),
            '|', '&', ('check_in', '>=', start_date), ('check_in', '<=', end_date),
                '&', ('check_out', '>=', start_date), ('check_out', '<=', end_date)
        ])

        # 🔑 Fetch all valid leaves in range
        leaves = request.env['hr.leave'].sudo().search([
            ('employee_id', '=', employee.id),
            ('request_date_from', '<=', end_date),
            ('request_date_to', '>=', start_date),
            ('state', 'in', ['confirm', 'validate', 'validate1'])
        ])

        # 🔑 Fetch public holidays in range
        public_holidays = request.env['resource.calendar.leaves'].sudo().search([
            ('resource_id', '=', False),   # Global holiday (not tied to one employee)
            ('date_from', '<=', end_date),
            ('date_to', '>=', start_date)
        ])

        absent_days = []
        current_date = start_date.date()

        while current_date <= today:
            # ✅ Skip if this day is a public holiday
            day_holidays = public_holidays.filtered(
                lambda h: h.date_from.date() <= current_date <= h.date_to.date()
            )
            if day_holidays:
                current_date += timedelta(days=1)
                continue

            # ✅ Skip if this day is covered by leave
            day_leaves = leaves.filtered(
                lambda l: l.request_date_from <= current_date <= l.request_date_to
            )
            if day_leaves:
                current_date += timedelta(days=1)
                continue

            # Find attendance for this day
            day_att = attendances.filtered(lambda a: 
                (a.check_in and a.check_in.date() == current_date) or
                (not a.check_in and a.check_out and a.check_out.date() == current_date)
            )

            if not day_att and current_date.weekday() < 5:
                # Full absent
                absent_days.append({
                    'date': current_date,
                    'formatted_date': current_date.strftime('%A, %B %d, %Y'),
                    'iso_date': current_date.isoformat(),
                    'status': 'full_absent',
                    'absence_type': 'Full Day Absent',
                    'attendance_fraction': 0,
                    'absent_fraction': 1.0
                })
            else:
                att = day_att[0] if day_att else None
                if att:
                    check_in = att.check_in.astimezone(MYANMAR_TZ) if att.check_in else None
                    check_out = att.check_out.astimezone(MYANMAR_TZ) if att.check_out else None
                    working_hours = (check_out - check_in).total_seconds() / 3600 if check_in and check_out else 0

                    # Skip marking today as absent if checked in but not checked out yet
                    if current_date == today and check_in and not check_out:
                        current_date += timedelta(days=1)
                        continue

                    if check_in and check_out and working_hours >= 5:
                        pass  # Fully present
                    else:
                        if check_in and not check_out:
                            absence_type = 'Evening Absent'
                        elif not check_in and check_out:
                            absence_type = 'Morning Absent'
                        elif working_hours < 5:
                            absence_type = 'Half Day Absent (Morning or Evening Absent)'
                        else:
                            absence_type = 'Half Day Absent'

                        absent_days.append({
                            'date': current_date,
                            'formatted_date': current_date.strftime('%A, %B %d, %Y'),
                            'iso_date': current_date.isoformat(),
                            'status': 'half_absent',
                            'absence_type': absence_type,
                            'check_in_time': check_in.strftime('%H:%M') if check_in else None,
                            'check_out_time': check_out.strftime('%H:%M') if check_out else None,
                            'attendance_fraction': 0.5,
                            'absent_fraction': 0.5
                        })

            current_date += timedelta(days=1)

        return absent_days


    def _get_late_days(self, employee):
        start_date, end_date = self._get_26th_to_25th_period()

        attendances = request.env['hr.attendance'].sudo().search([
            ('employee_id', '=', employee.id),
            ('check_in', '>=', start_date),
            ('check_in', '<=', end_date)
        ])

        late_days = []
        total_late_minutes = 0

        for att in attendances:
            display_late = getattr(att, "display_late_minutes", "00:00")
            if display_late != "00:00":
                check_in_local = att.check_in.astimezone(MYANMAR_TZ) if att.check_in else None
                if isinstance(display_late, float):
                    hours = int(display_late)
                    minutes = int((display_late - hours) * 60)
                else:
                    hh, mm = display_late.split(":")
                    hours, minutes = int(hh), int(mm)

                late_minutes = hours * 60 + minutes
                if late_minutes == 0:
                    continue

                total_late_minutes += late_minutes
                if late_minutes <= 5:
                    severity = 'low'
                elif late_minutes <= 15:
                    severity = 'medium'
                else:
                    severity = 'high'

                late_days.append({
                    'date': check_in_local.date() if check_in_local else None,
                    'iso_date': check_in_local.strftime('%Y-%m-%d') if check_in_local else "",
                    'formatted_date': check_in_local.strftime('%A, %B %d, %Y') if check_in_local else "",
                    'check_in_time': check_in_local.strftime('%H:%M') if check_in_local else None,
                    'late_minutes': late_minutes,
                    'severity': severity,
                })

        avg_lateness = total_late_minutes / len(late_days) if late_days else 0
        return late_days, total_late_minutes, avg_lateness

    # --- Other routes (absent, late, logout) remain the same ---
    @http.route('/attendance/absent', type='http', auth='public', website=True)
    def absent_details(self, **kwargs):
        employee = self._get_employee()
        if not employee:
            return request.redirect('/employee/register')

        absent_days = self._get_absent_days(employee)
        return request.render('AGB_HR.absent_details', {
            'employee': employee,
            'absent_days': absent_days,
            'total_absent': len(absent_days),
            'current_period': f"{self._get_26th_to_25th_period()[0].strftime('%B %d, %Y')} - {self._now_myanmar().strftime('%B %d, %Y')}"
        })

    @http.route('/attendance/late', type='http', auth='public', website=True)
    def late_details(self, **kwargs):
        employee = self._get_employee()
        if not employee:
            return request.redirect('/employee/register')

        late_days, total_late_minutes, avg_lateness = self._get_late_days(employee)

        return request.render('AGB_HR.late_details', {
            'employee': employee,
            'late_days': late_days,
            'total_late_days': len(late_days),
            'total_late_minutes': total_late_minutes,
            'avg_lateness': avg_lateness,
            'current_period': f"{self._get_26th_to_25th_period()[0].strftime('%B %d, %Y')} - {self._now_myanmar().strftime('%B %d, %Y')}"
        })

    @http.route('/attendance/logout', type='http', auth='public', website=True)
    def attendance_logout(self, **kwargs):
        request.session.pop('employee_number', None)
        return request.redirect('/employee/register')