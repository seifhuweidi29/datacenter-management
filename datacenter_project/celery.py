from __future__ import absolute_import, unicode_literals
import os
from celery import Celery
from celery.schedules import crontab
import environ
from pathlib import Path

# Load environment variables from .env file at project root
root = Path(__file__).resolve().parent.parent
env = environ.Env()
env.read_env(str(root / '.env'))

# Set the default Django settings module for the 'celery' program.
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'datacenter_project.settings')

app = Celery('datacenter_project')

# Using a string here means the worker doesn't have to serialize
# the configuration object to child processes.
app.config_from_object('django.conf:settings', namespace='CELERY')

# Load task modules from all registered Django app configs.
app.autodiscover_tasks()

# Celery Beat schedule for periodic tasks
app.conf.beat_schedule = {
    'send-license-expiry-notifications': {
        'task': 'datacenter_app.tasks.send_license_expiry_notifications',
        'schedule': crontab()  # Runs daily at 8am
    },
}
