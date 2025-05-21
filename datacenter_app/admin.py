from django.contrib import admin
from .models import DataCenter,Equipment
from django_celery_beat.models import PeriodicTask, IntervalSchedule



# Register DataCenter model
admin.site.register(DataCenter)
admin.site.register(Equipment)