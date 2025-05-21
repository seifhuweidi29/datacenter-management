from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from rest_framework.permissions import AllowAny
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .models import *
from .serializers import *
import openpyxl
from openpyxl.utils import get_column_letter
from django.http import HttpResponse
from .utils import generate_equipment_pdf
from django.core.mail import EmailMessage
from django.conf import settings
import binascii
from openpyxl import load_workbook

# Signup View
class SignupView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get('username')
        email = request.data.get('email')
        password = request.data.get('password')

        if User.objects.filter(username=username).exists():
            return Response({"error": "Username already exists"}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.create_user(username=username, email=email, password=password)
        return Response({"message": "User created successfully!"}, status=status.HTTP_201_CREATED)

# Login View
class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')

        user = authenticate(username=username, password=password)

        if user is not None:
            refresh = RefreshToken.for_user(user)
            return Response({
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            })

        return Response({"error": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED)

# Logout View (optional - token-based logout)
class LogoutView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        # No token management needed, simply return a success message
        return Response({"message": "Logged out successfully!"}, status=status.HTTP_200_OK)


class DataCenterListView(APIView):
    def get(self, request):
        data_centers = DataCenter.objects.all()
        serializer = DataCenterSerializer(data_centers, many=True)
        return Response(serializer.data)

# Fetch a specific DataCenter by ID
class DataCenterDetailView(APIView):
    def get(self, request, pk):
        try:
            data_center = DataCenter.objects.get(pk=pk)
            serializer = DataCenterSerializer(data_center)
            return Response(serializer.data)
        except DataCenter.DoesNotExist:
            return Response({"error": "DataCenter not found"}, status=status.HTTP_404_NOT_FOUND)
        
class EquipmentFetchView(APIView):
    def get(self, request, datacenter_id):
        # Get query parameters for search
        service_tag = request.GET.get('service_tag', None)
        license_type = request.GET.get('license_type', None)

        try:
            # Get the DataCenter by ID
            datacenter = DataCenter.objects.get(pk=datacenter_id)

            # Filter equipments by the DataCenter and optional search terms
            equipments = Equipment.objects.filter(datacenter=datacenter)

            # Apply search filters if provided
            if service_tag:
                equipments = equipments.filter(service_tag__iexact=service_tag)
            if license_type:
                equipments = equipments.filter(license_type__iexact=license_type)

            # Serialize the equipment data
            serializer = EquipmentSerializer(equipments, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)

        except DataCenter.DoesNotExist:
            return Response({"error": "DataCenter not found"}, status=status.HTTP_404_NOT_FOUND)

class EquipmentAddToDataCenterView(APIView):
    def post(self, request, datacenter_id):
        try:
            # Get the DataCenter by ID
            datacenter = DataCenter.objects.get(pk=datacenter_id)

            # Add the datacenter to the serializer context
            serializer = AddEquipmentSerializer(data=request.data, context={'datacenter': datacenter})
            
            if serializer.is_valid():
                # Save the equipment instance
                equipment = serializer.save()
                return Response(AddEquipmentSerializer(equipment).data, status=status.HTTP_201_CREATED)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        except DataCenter.DoesNotExist:
            return Response({"error": "DataCenter not found"}, status=status.HTTP_404_NOT_FOUND)
        

class EquipmentModifyView(APIView):
    def patch(self, request, datacenter_id, equipment_id):
        try:
            # Check if the DataCenter exists
            datacenter = DataCenter.objects.get(pk=datacenter_id)

            # Retrieve the Equipment instance by its ID
            equipment = Equipment.objects.get(pk=equipment_id, datacenter=datacenter)

            # Use the ModifyEquipmentSerializer to validate and update the data
            serializer = ModifyEquipmentSerializer(equipment, data=request.data, partial=True)
            
            if serializer.is_valid():
                # Save the updated equipment instance
                serializer.save()
                return Response(serializer.data, status=status.HTTP_200_OK)

            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        except DataCenter.DoesNotExist:
            return Response({"error": "DataCenter not found"}, status=status.HTTP_404_NOT_FOUND)
        except Equipment.DoesNotExist:
            return Response({"error": "Equipment not found in this DataCenter"}, status=status.HTTP_404_NOT_FOUND)
        

class EquipmentDeleteView(APIView):
    def delete(self, request, datacenter_id, equipment_id):
        try:
            # Check if the DataCenter exists
            datacenter = DataCenter.objects.get(pk=datacenter_id)

            # Retrieve the Equipment instance by its ID and check if it belongs to the specified DataCenter
            equipment = Equipment.objects.get(pk=equipment_id, datacenter=datacenter)

            # Delete the equipment
            equipment.delete()

            # Return success response
            return Response({"message": "Equipment deleted successfully."}, status=status.HTTP_204_NO_CONTENT)

        except DataCenter.DoesNotExist:
            return Response({"error": "DataCenter not found"}, status=status.HTTP_404_NOT_FOUND)
        except Equipment.DoesNotExist:
            return Response({"error": "Equipment not found in this DataCenter"}, status=status.HTTP_404_NOT_FOUND)
        

class EquipmentLicenseTypeAutocompleteView(APIView):
    def get(self, request, datacenter_id):
        try:
            # Get the DataCenter by ID
            datacenter = DataCenter.objects.get(pk=datacenter_id)

            # Get all distinct license types for the equipments in the given DataCenter
            license_types = Equipment.objects.filter(datacenter=datacenter).values_list('license_type', flat=True).distinct()

            # Return the license types as a list
            return Response(list(license_types), status=status.HTTP_200_OK)

        except DataCenter.DoesNotExist:
            return Response({"error": "DataCenter not found"}, status=status.HTTP_404_NOT_FOUND)
        
class EquipmentServiceTagAutocompleteView(APIView):
    def get(self, request, datacenter_id):
        try:
            # Get the DataCenter by ID
            datacenter = DataCenter.objects.get(pk=datacenter_id)

            # Get all distinct service tags for the equipments in the given DataCenter
            service_tags = Equipment.objects.filter(datacenter=datacenter).values_list('service_tag', flat=True).distinct()

            # Return the service tags as a list
            return Response(list(service_tags), status=status.HTTP_200_OK)

        except DataCenter.DoesNotExist:
            return Response({"error": "DataCenter not found"}, status=status.HTTP_404_NOT_FOUND)
        
class EquipmentExportExcelView(APIView):
    def get(self, request, datacenter_id):
        # Get query parameters for filtering
        service_tag = request.GET.get('service_tag', None)
        license_type = request.GET.get('license_type', None)

        try:
            # Get the DataCenter by ID
            datacenter = DataCenter.objects.get(pk=datacenter_id)

            # Get all equipments for the given DataCenter
            equipments = Equipment.objects.filter(datacenter=datacenter)

            # Apply filters if provided
            if service_tag:
                equipments = equipments.filter(service_tag__icontains=service_tag)
            if license_type:
                equipments = equipments.filter(license_type__icontains=license_type)

            # Create a new Excel workbook and worksheet
            wb = openpyxl.Workbook()
            ws = wb.active
            ws.title = "Equipments"

            # Add headers to the worksheet
            headers = ["ID", "Equipment Type", "Service Tag", "License Type", "Serial Number", "License Expiry Date"]
            for col_num, header in enumerate(headers, 1):
                col_letter = get_column_letter(col_num)
                ws[f"{col_letter}1"] = header

            # Add equipment data to the worksheet
            for row_num, equipment in enumerate(equipments, 2):
                ws[f"A{row_num}"] = equipment.id
                ws[f"B{row_num}"] = equipment.equipment_type
                ws[f"C{row_num}"] = equipment.service_tag
                ws[f"D{row_num}"] = equipment.license_type
                ws[f"E{row_num}"] = equipment.serial_number
                ws[f"F{row_num}"] = equipment.license_expired_date

            # Create the HttpResponse for file download
            response = HttpResponse(
                content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            )
            response['Content-Disposition'] = f'attachment; filename="equipments_{datacenter_id}.xlsx"'

            # Save the workbook to the HttpResponse
            wb.save(response)
            return response

        except DataCenter.DoesNotExist:
            return Response({"error": "DataCenter not found"}, status=404)
        

class EquipmentExportPDFView(APIView):
    def get(self, request, datacenter_id):
        # Get query parameters for filtering
        service_tag = request.GET.get('service_tag', None)
        license_type = request.GET.get('license_type', None)

        try:
            # Get the DataCenter by ID
            datacenter = DataCenter.objects.get(pk=datacenter_id)

            # Get all equipments for the given DataCenter
            equipments = Equipment.objects.filter(datacenter=datacenter)

            # Apply filters if provided
            if service_tag:
                equipments = equipments.filter(service_tag__icontains=service_tag)
            if license_type:
                equipments = equipments.filter(license_type__icontains=license_type)

            # Generate the PDF file
            pdf_buffer = generate_equipment_pdf(equipments)

            # Create the HTTP Response for file download
            response = HttpResponse(pdf_buffer, content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="equipments_{datacenter_id}.pdf"'
            return response

        except DataCenter.DoesNotExist:
            return Response({"error": "DataCenter not found"}, status=404)
        except Exception as e:
            return Response({"error": str(e)}, status=500)

class EquipmentImportExcelView(APIView):
    def post(self, request, datacenter_id):
        try:
            datacenter = DataCenter.objects.get(pk=datacenter_id)
            excel_file = request.FILES.get('file')
            if not excel_file:
                return Response({"error": "No file uploaded."}, status=400)

            # Check file extension
            if not excel_file.name.lower().endswith(('.xlsx', '.xls')):
                return Response({"error": "Please upload a valid Excel file (.xlsx or .xls)."}, status=400)

            try:
                print(f"[DEBUG] Loading workbook from file: {excel_file.name}")
                wb = load_workbook(excel_file, data_only=True)
                print(f"[DEBUG] Workbook loaded successfully. Active sheet: {wb.active.title}")
                ws = wb.active

                # Get headers from first row
                headers = []
                for cell in ws[1]:
                    value = cell.value
                    print(f"[DEBUG] Header cell {cell.coordinate} value: {value}")
                    if value is None:
                        value = ''
                    headers.append(str(value).strip())
                
                expected_headers = [
                    'equipment_type', 'service_tag', 'license_type', 'serial_number', 'license_expired_date'
                ]

                # Validate headers
                print(f"[DEBUG] Expected headers: {expected_headers}")
                print(f"[DEBUG] Received headers: {headers}")
                
                if len(headers) != len(expected_headers):
                    return Response({
                        "error": "Invalid file format. The first row must contain exactly 5 headers:",
                        "expected_headers": expected_headers,
                        "received_headers": headers
                    }, status=400)

                # Check if headers match in order
                for i, header in enumerate(headers):
                    if header.lower() != expected_headers[i].lower():
                        return Response({
                            "error": "Invalid file format. Headers do not match expected order:",
                            "expected_headers": expected_headers,
                            "received_headers": headers
                        }, status=400)

            except Exception as e:
                import traceback
                print(f"[DEBUG] Exception in Excel import: {str(e)}")
                print(f"[DEBUG] Full traceback:")
                traceback.print_exc()
                return Response({
                    "error": f"Failed to read Excel file: {str(e)}",
                    "details": "Please ensure the file is a valid Excel (.xlsx) file with the correct headers",
                    "debug": {
                        "file_name": excel_file.name,
                        "file_size": excel_file.size,
                        "content_type": excel_file.content_type
                    }
                }, status=400)

            new_equipments = []
            error_messages = []
            
            # Process each row starting from row 2
            for row in ws.iter_rows(min_row=2):
                try:
                    # Get values from each cell
                    values = [cell.value if cell.value else '' for cell in row]
                    
                    # Validate required fields
                    if not all([values[0], values[1], values[2], values[3], values[4]]):
                        error_messages.append(f"Row {row[0].row}: Missing required fields")
                        continue

                    # Validate date format
                    try:
                        license_expired_date = values[4].date() if hasattr(values[4], 'date') else values[4]
                    except (AttributeError, TypeError):
                        error_messages.append(f"Row {row[0].row}: Invalid date format for license_expired_date")
                        continue

                    # Check if equipment with this serial number already exists
                    if Equipment.objects.filter(serial_number=str(values[3])).exists():
                        error_messages.append(f"Row {row[0].row}: Equipment with serial number '{values[3]}' already exists")
                        continue

                    # Create equipment instance
                    equipment = Equipment(
                        equipment_type=str(values[0]),
                        service_tag=str(values[1]),
                        license_type=str(values[2]),
                        serial_number=str(values[3]),
                        license_expired_date=license_expired_date,
                        datacenter=datacenter
                    )
                    new_equipments.append(equipment)

                except Exception as e:
                    error_messages.append(f"Row {row[0].row}: {str(e)}")

            # Bulk create only valid equipments
            if new_equipments:
                Equipment.objects.bulk_create(new_equipments)

            response_data = {
                "message": f"{len(new_equipments)} equipments imported successfully!",
                "total_rows_processed": len(new_equipments) + len(error_messages),
                "errors": error_messages
            }

            # Return success with any errors
            return Response(response_data, status=201 if new_equipments else 400)

        except DataCenter.DoesNotExist:
            return Response({"error": "DataCenter not found"}, status=404)
        except Exception as e:
            return Response({"error": f"An error occurred: {str(e)}"}, status=500)


class EquipmentSendPDFByEmailView(APIView):
    def post(self, request, datacenter_id):
        import binascii
        # Use email from frontend if provided, else fallback
        recipient = request.data.get('email', 'test@example.com')
        try:
            datacenter = DataCenter.objects.get(pk=datacenter_id)
            equipments = Equipment.objects.filter(datacenter=datacenter)
            if not equipments.exists():
                return Response({'error': 'No equipment found for this datacenter.'}, status=404)
            pdf_buffer = generate_equipment_pdf(equipments)
            pdf_bytes = pdf_buffer.getvalue()
            print(f'[DEBUG] Generated PDF size: {len(pdf_bytes)} bytes')
            print(f'[DEBUG] PDF header: {binascii.hexlify(pdf_bytes[:16])}')
            if not pdf_bytes or len(pdf_bytes) < 100:
                print('[DEBUG] PDF is empty or too small!')
                raise Exception('Generated PDF is empty or too small!')
            msg = EmailMessage(
                subject=f"Equipment Information for {datacenter.name}",
                body=f"Please find attached the equipment information for datacenter: {datacenter.name}.",
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[recipient],
            )
            msg.attach(f"equipments_{datacenter.name}.pdf", pdf_bytes, 'application/pdf')
            msg.send(fail_silently=False)
            print(f'[DEBUG] Sent real PDF to {recipient}')
            return Response({'message': f'PDF sent successfully to {recipient}!'}, status=200)
        except DataCenter.DoesNotExist:
            return Response({'error': 'Datacenter not found.'}, status=404)
        except Exception as e:
            import traceback
            print('[DEBUG] Exception in PDF email sending:')
            traceback.print_exc()
            return Response({'error': str(e)}, status=500)