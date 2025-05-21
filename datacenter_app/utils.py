from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.pdfgen import canvas
from io import BytesIO
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle

def generate_equipment_pdf(equipments):
    buffer = BytesIO()
    
    # Create a document with a page size of letter
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    
    # Setup the table data (headers and rows)
    data = [
        ["ID", "Equipment Type", "Service Tag", "License Type", "Serial Number", "License Expiry Date"]
    ]
    
    for equipment in equipments:
        data.append([
            str(equipment.id),
            equipment.equipment_type,
            equipment.service_tag,
            equipment.license_type,
            equipment.serial_number,
            str(equipment.license_expired_date)
        ])
    
    # Create the table with data
    table = Table(data)
    
    # Add styling for the table
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.grey),  # Header row background
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 12),
        ("BACKGROUND", (0, 1), (-1, -1), colors.whitesmoke),
        ("GRID", (0, 0), (-1, -1), 1, colors.black),
        ("TOPPADDING", (0, 1), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 1), (-1, -1), 10),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
    ]))
    
    # Build the document (add the table to the PDF)
    doc.build([table])
    
    # Save and return the buffer with the PDF data
    buffer.seek(0)
    return buffer