from frappe import _

def get_data():
    return {
        "fieldname": "payment_receipt",
        "internal_and_external_links": {
			"Sales Invoice": ["billing_references", "sales_invoice"],
            "Sales Billing": ["billing_references", "sales_billing"],
            "Payment Entry": ["payment_references", "payment_entry"],
		},
        "transactions": [
            {"label": _("Reference"), "items": ["Sales Invoice","Sales Billing"]},  
            {"label": _("Payment"), "items": ["Payment Entry"]},  
        ],
    }
