from django.core.management.base import BaseCommand
from datacenter_app.models import DataCenter, Equipment

class Command(BaseCommand):
    help = 'Create two dummy licenses for dashboard testing.'

    def handle(self, *args, **options):
        # Only remove test equipment with specific prefixes
        Equipment.objects.filter(
            Q(service_tag__startswith='TEST-') | 
            Q(service_tag__startswith='DUMMY-')
        ).delete()

        datacenter, _ = DataCenter.objects.get_or_create(name="Test Datacenter")
        # Add equipment expiring on April 24, 2025
        Equipment.objects.create(
            equipment_type="Router",
            service_tag="ROUTER-APR24",
            license_type="Routing License",
            serial_number="SN-APR24",
            license_expired_date="2025-04-24",
            datacenter=datacenter
        )
        # Add equipment expiring on May 21, 2025
        Equipment.objects.create(
            equipment_type="Firewall",
            service_tag="FIREWALL-MAY21",
            license_type="Firewall License",
            serial_number="SN-MAY21",
            license_expired_date="2025-05-21",
            datacenter=datacenter
        )
        self.stdout.write(self.style.SUCCESS('Dummy licenses for 2025-04-24 and 2025-05-21 created.'))
