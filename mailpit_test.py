import smtplib
from email.message import EmailMessage

msg = EmailMessage()
msg.set_content("Mailpit direct SMTP test")
msg["Subject"] = "Direct Mailpit Test"
msg["From"] = "test@example.com"
msg["To"] = "test@example.com"

with smtplib.SMTP("127.0.0.1", 1025) as s:
    s.send_message(msg)
