from rest_framework import serializers
from .models import *

class DataCenterSerializer(serializers.ModelSerializer):
    class Meta:
        model = DataCenter
        fields = ['id', 'name', 'description']


class EquipmentSerializer(serializers.ModelSerializer):
    # If you want to include datacenter details in the serialized output (optional)
    datacenter = serializers.StringRelatedField()  # You can also use `datacenter.name` if you prefer specific fields

    class Meta:
        model = Equipment
        fields = ['id', 'equipment_type', 'service_tag', 'license_type', 'serial_number', 'license_expired_date', 'datacenter']

class AddEquipmentSerializer(serializers.ModelSerializer):
    # We exclude the 'datacenter' field from being input, since it's set in the view
    class Meta:
        model = Equipment
        fields = ['equipment_type', 'service_tag', 'license_type', 'serial_number', 'license_expired_date']
        
    def create(self, validated_data):
        # Explicitly get the datacenter from the context (which we pass in the view)
        datacenter = self.context.get('datacenter')
        
        # Create a new Equipment instance and associate it with the datacenter
        equipment = Equipment.objects.create(datacenter=datacenter, **validated_data)
        return equipment
    
class ModifyEquipmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Equipment
        fields = ['equipment_type', 'service_tag', 'license_type', 'serial_number', 'license_expired_date']