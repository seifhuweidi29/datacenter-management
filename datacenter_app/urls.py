from django.urls import path
from .views import *

# Add these imports for JWT auth
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    # JWT AUTH ROUTES
    path('token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('logout/', LogoutView.as_view(), name='logout'),

    # Protected API Routes
    path('datacenters/', DataCenterListView.as_view(), name='datacenter-list'),
    path('datacenters/<int:pk>/', DataCenterDetailView.as_view(), name='datacenter-detail'),

    path('datacenters/<int:datacenter_id>/equipments/', EquipmentFetchView.as_view(), name='fetch_equipments'),
    path('datacenters/<int:datacenter_id>/equipments/add/', EquipmentAddToDataCenterView.as_view(), name='add-equipment-to-datacenter'),
    path('datacenters/<int:datacenter_id>/equipments/<int:equipment_id>/modify/', EquipmentModifyView.as_view(), name='modify_equipment'),
    path('datacenters/<int:datacenter_id>/equipments/<int:equipment_id>/delete/', EquipmentDeleteView.as_view(), name='delete_equipment'),
    path('datacenters/<int:datacenter_id>/equipments/license-types/', EquipmentLicenseTypeAutocompleteView.as_view(), name='license_type_autocomplete'),
    path('datacenters/<int:datacenter_id>/equipments/service-tags/', EquipmentServiceTagAutocompleteView.as_view(), name='service_tag_autocomplete'),
    path('datacenters/<int:datacenter_id>/equipments/export-excel/', EquipmentExportExcelView.as_view(), name='export_equipments'),
    path('datacenters/<int:datacenter_id>/equipments/export-pdf/', EquipmentExportPDFView.as_view(), name='export_equipments_pdf'),
    path('datacenters/<int:datacenter_id>/equipments/import-excel/', EquipmentImportExcelView.as_view(), name='import_equipments_excel'),
    path('datacenters/<int:datacenter_id>/equipments/send-pdf/', EquipmentSendPDFByEmailView.as_view(), name='send_equipments_pdf_email'),
]
