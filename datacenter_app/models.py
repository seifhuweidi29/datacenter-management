from django.db import models

class DataCenter(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField()

    def __str__(self):
        return self.name

class Equipment(models.Model):
    equipment_type = models.CharField(max_length=50)  # CharField without choices
    service_tag = models.CharField(max_length=100, unique=True)
    license_type = models.CharField(max_length=100)
    serial_number = models.CharField(max_length=100, unique=True)
    license_expired_date = models.DateField()
    
    # ForeignKey to DataCenter (many equipments can belong to one datacenter)
    datacenter = models.ForeignKey(DataCenter, related_name='equipments', on_delete=models.CASCADE)

    def __str__(self):
        return f'{self.equipment_type} - {self.service_tag}'