import openpyxl
from openpyxl import Workbook

wb = Workbook()
ws = wb.active
ws.title = "Equipments"

# Correct headers as expected by the import feature
ws.append([
    "equipment_type", "service_tag", "license_type", "serial_number", "license_expired_date"
])

# Equipment types for variety
eq_types = [
    'Router','Switch','Firewall','Server','UPS',
    'Storage','Access Point','Gateway','Modem','Load Balancer'
]

# 15 expiring in 3 days (2025-04-25)
for i in range(1, 16):
    ws.append([
        eq_types[i % len(eq_types)],
        f"ST-EXP3-{i:02d}",
        f"Type{i % 3 + 1}",
        f"SN-EXP3-{i:02d}",
        "2025-04-25"
    ])


# 15 expiring in 30 days (2025-05-22)
for i in range(16, 31):
    ws.append([
        eq_types[i % len(eq_types)],
        f"ST-EXP30-{i:02d}",
        f"Type{i % 3 + 1}",
        f"SN-EXP30-{i:02d}",
        "2025-05-22"
    ])

wb.save("equipment_import_test.xlsx")
print("Excel test file created: equipment_import_test.xlsx with correct headers.")
