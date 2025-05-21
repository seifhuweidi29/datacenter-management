from celery import shared_task
from django.core.mail import send_mail
from django.utils import timezone
from datetime import timedelta
from django.contrib.auth.models import User
from .models import Equipment
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

@shared_task
def send_license_expiry_notifications():
    from django.core.mail import send_mail
    import logging
    logger = logging.getLogger(__name__)
    from django.utils import timezone
    from .models import Equipment
    from django.conf import settings
    today = timezone.now().date()
    notifications = [
        (30, "Upcoming License Expirations (30 days notice)", "The following device licenses will expire in 30 days:\n"),
        (3, "Upcoming License Expirations (3 days notice)", "The following device licenses will expire in 3 days:\n"),
    ]
    # FOR DEBUG/LOCAL: Always send to test@example.com
    logger.info(f"EMAIL_HOST={getattr(settings, 'EMAIL_HOST', None)} EMAIL_PORT={getattr(settings, 'EMAIL_PORT', None)} EMAIL_USE_TLS={getattr(settings, 'EMAIL_USE_TLS', None)} EMAIL_USE_SSL={getattr(settings, 'EMAIL_USE_SSL', None)} DEFAULT_FROM_EMAIL={getattr(settings, 'DEFAULT_FROM_EMAIL', None)}")
    recipients = ["test@example.com"]
    logger.info(f"About to send license expiry notifications to {recipients}")
    for days, subject, intro in notifications:
        target_date = today + timezone.timedelta(days=days)
        equipments = Equipment.objects.filter(license_expired_date=target_date)
        if equipments.exists():
            # Professional, well-typed email content
            message = f"""
Dear Team,

This is an automated notification regarding equipment license expirations in your datacenter.

The following device license(s) will expire in {days} day(s):

| Type            | Service Tag     | License        | Serial Number   | Expiry Date   |
|-----------------|----------------|---------------|----------------|--------------|
"""
            for eq in equipments:
                message += (
                    f"| {eq.equipment_type:<15} | {eq.service_tag:<14} | {eq.license_type:<13} | {eq.serial_number:<14} | {eq.license_expired_date} |")
                message += "\n"
            message += """

Please take the necessary steps to renew these licenses to avoid any service interruptions.

Best regards,
Cloud Device Management System
"""
            try:
                logger.info(f"Calling send_mail with subject: [TEST] {equipments.count()} Device License(s) Expiring in {days} Days, from: test@example.com, to: {recipients}")
                send_mail(
                    f"[ACTION REQUIRED] {equipments.count()} Device License(s) Expiring in {days} Day(s)",
                    message,
                    "test@example.com",
                    recipients,
                )
                logger.info(f"[TEST] License expiry notification sent for {equipments.count()} devices to {recipients} [{days} days].")
            except Exception as e:
                logger.error(f"[TEST] Failed to send expiry notifications for {days} days: {e}")

@shared_task
def send_mailpit_direct_smtp():
    import smtplib
    from email.message import EmailMessage
    import logging
    logger = logging.getLogger(__name__)
    msg = EmailMessage()
    msg.set_content("Mailpit direct SMTP test from Celery task")
    msg["Subject"] = "Celery Direct Mailpit Test"
    msg["From"] = "test@example.com"
    msg["To"] = "test@example.com"
    try:
        with smtplib.SMTP("127.0.0.1", 1025) as s:
            s.send_message(msg)
        logger.info("Direct SMTP test email sent from Celery task!")
    except Exception as e:
        logger.error(f"Direct SMTP test from Celery failed: {e}")
