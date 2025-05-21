from django.core.management.base import BaseCommand
from datacenter_app.models import DataCenter, Equipment
from datetime import timedelta, datetime

class Command(BaseCommand):
    help = 'Restore default datacenters and equipment'

    def handle(self, *args, **options):
        # Create default datacenters
        datacenter1, _ = DataCenter.objects.get_or_create(name="Main Datacenter")
        datacenter2, _ = DataCenter.objects.get_or_create(name="Secondary Datacenter")

        # Create sample equipment for Main Datacenter
        Equipment.objects.create(
            equipment_type="Server",
            service_tag="SRV-001",
            license_type="Standard License",
            serial_number="SN-001",
            license_expired_date=(datetime.now() + timedelta(days=365)).strftime('%Y-%m-%d'),
            datacenter=datacenter1
        )

        Equipment.objects.create(
            equipment_type="Firewall",
            service_tag="FW-001",
            license_type="Premium License",
            serial_number="SN-002",
            license_expired_date=(datetime.now() + timedelta(days=180)).strftime('%Y-%m-%d'),
            datacenter=datacenter1
        )

        # Create sample equipment for Secondary Datacenter
        Equipment.objects.create(
            equipment_type="Router",
            service_tag="ROUTER-001",
            license_type="Enterprise License",
            serial_number="SN-003",
            license_expired_date=(datetime.now() + timedelta(days=730)).strftime('%Y-%m-%d'),
            datacenter=datacenter2
        )

        Equipment.objects.create(
            equipment_type="Switch",
            service_tag="SWITCH-001",
            license_type="Basic License",
            serial_number="SN-004",
            license_expired_date=(datetime.now() + timedelta(days=90)).strftime('%Y-%m-%d'),
            datacenter=datacenter2
        )

        self.stdout.write(self.style.SUCCESS('Successfully restored default data'))
