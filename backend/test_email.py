import sys

from email_utils import send_email

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python test_email.py your_email@example.com")
        sys.exit(1)

    to_address = sys.argv[1]

    success, error = send_email(
        to_address=to_address,
        subject="IT Renewal Tracker - test email",
        html_body="<p>If you're reading this, SMTP sending works. 🎉</p>",
    )

    if success:
        print(f"Sent! Check the inbox for {to_address}.")
    else:
        print(f"Failed to send: {error}")